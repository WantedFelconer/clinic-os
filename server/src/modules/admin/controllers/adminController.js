const { User } = require('../../auth');
const { Review } = require('../../reviews');
const { Subscription } = require('../../subscriptions');
const AuditLog = require('../models/AuditLog');
const db = require('../../../core/config/database');
const bcrypt = require('bcryptjs');
const { generateUUID, generateSlug } = require('../../../core/utils/helpers');

const adminController = {
  async getDashboard(req, res, next) {
    try {
      const [userCounts] = await db.execute(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN role = 'doctor' THEN 1 ELSE 0 END) as doctors,
                SUM(CASE WHEN role = 'patient' THEN 1 ELSE 0 END) as patients,
                SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistants
         FROM users WHERE is_active = 1 OR is_active = true`
      );

      const [allUserTotal] = await db.execute('SELECT COUNT(*) as total FROM users');
      const [clinicCount] = await db.execute('SELECT COUNT(*) as total FROM clinics');
      const [activeClinicCount] = await db.execute('SELECT COUNT(*) as total FROM clinics WHERE is_active = 1 OR is_active = true');
      const [apptCount] = await db.execute("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed FROM appointments");
      const [revenue] = await db.execute(
        "SELECT IFNULL(SUM(total_amount), 0) as total FROM payments WHERE payment_status = 'completed'"
      );

      // Subscription Analytics & MRR
      const subAnalytics = await Subscription.getSubscriptionAnalytics();

      // Recent Signups (latest 5 users)
      const [recentUsers] = await db.execute(
        `SELECT id, first_name, last_name, email, role, is_active, created_at
         FROM users ORDER BY created_at DESC LIMIT 5`
      );

      // Pending / Inactive clinics for verification monitoring
      const [pendingClinics] = await db.execute(
        `SELECT c.id, c.name, c.city, c.is_active, c.created_at,
                u.first_name as owner_first_name, u.last_name as owner_last_name, u.email as owner_email
         FROM clinics c
         JOIN users u ON c.owner_id = u.id
         WHERE c.is_active = 0 OR c.is_active = false
         ORDER BY c.created_at DESC LIMIT 5`
      );

      // Monthly Revenue & Appointment Trends (last 6 months) — Pure MySQL
      const [monthlyRevRows] = await db.execute(
        `SELECT DATE_FORMAT(payment_date, '%Y-%m') as month, SUM(total_amount) as revenue
         FROM payments WHERE payment_status = 'completed' AND payment_date IS NOT NULL
         GROUP BY month ORDER BY month DESC LIMIT 6`
      );

      const [monthlyApptRows] = await db.execute(
        `SELECT DATE_FORMAT(appointment_date, '%Y-%m') as month, COUNT(*) as count
         FROM appointments GROUP BY month ORDER BY month DESC LIMIT 6`
      );

      const monthMap = {};
      monthlyRevRows.forEach(r => {
        if (r.month) monthMap[r.month] = { month: r.month, revenue: parseFloat(r.revenue) || 0, appointments: 0 };
      });
      monthlyApptRows.forEach(r => {
        if (r.month) {
          if (!monthMap[r.month]) monthMap[r.month] = { month: r.month, revenue: 0, appointments: parseInt(r.count, 10) || 0 };
          else monthMap[r.month].appointments = parseInt(r.count, 10) || 0;
        }
      });

      const monthlyTrends = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

      res.json({
        stats: {
          total_users: parseInt(allUserTotal[0]?.total || 0, 10),
          totalUsers: parseInt(allUserTotal[0]?.total || 0, 10),
          active_users: parseInt(userCounts[0]?.total || 0, 10),
          total_doctors: parseInt(userCounts[0]?.doctors || 0, 10),
          totalDoctors: parseInt(userCounts[0]?.doctors || 0, 10),
          total_patients: parseInt(userCounts[0]?.patients || 0, 10),
          totalPatients: parseInt(userCounts[0]?.patients || 0, 10),
          total_assistants: parseInt(userCounts[0]?.assistants || 0, 10),
          total_clinics: parseInt(clinicCount[0]?.total || 0, 10),
          totalClinics: parseInt(clinicCount[0]?.total || 0, 10),
          active_clinics: parseInt(activeClinicCount[0]?.total || 0, 10),
          total_appointments: parseInt(apptCount[0]?.total || 0, 10),
          totalAppointments: parseInt(apptCount[0]?.total || 0, 10),
          completed_appointments: parseInt(apptCount[0]?.completed || 0, 10),
          total_revenue: parseFloat(revenue[0]?.total || 0),
          totalRevenue: parseFloat(revenue[0]?.total || 0),
          mrr: subAnalytics.mrr || 0,
          active_subscriptions: subAnalytics.active_subscriptions || 0,
          total_subscriptions: subAnalytics.total_subscriptions || 0,
        },
        plan_distribution: subAnalytics.plan_distribution || [],
        recent_signups: recentUsers || [],
        pending_clinics: pendingClinics || [],
        monthly_trends: monthlyTrends,
      });
    } catch (error) {
      next(error);
    }
  },

  async getUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const role = req.query.role || '';

      let query = `SELECT id, email, role, first_name, last_name, phone, is_verified, is_active, created_at FROM users WHERE 1=1`;
      const params = [];

      if (search) {
        query += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (role && role !== 'all') {
        query += ' AND role = ?';
        params.push(role);
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await db.execute(query, params);

      let countSql = 'SELECT COUNT(*) as count FROM users WHERE 1=1';
      const countParams = [];
      if (search) {
        countSql += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (role && role !== 'all') {
        countSql += ' AND role = ?';
        countParams.push(role);
      }

      const [countRows] = await db.execute(countSql, countParams);
      res.json({ users: rows, total: parseInt(countRows[0]?.count || 0, 10), page, limit });
    } catch (error) {
      next(error);
    }
  },

  async createUser(req, res, next) {
    try {
      const { email, password, first_name, last_name, role, phone, clinic_id } = req.body;
      if (await User.findByEmail(email)) return res.status(409).json({ message: 'A user with this email already exists.' });
      const id = generateUUID();
      await db.transaction(async (connection) => {
        const passwordHash = await bcrypt.hash(password, 10);
        await connection.execute(
          'INSERT INTO users (id, email, password, role, first_name, last_name, phone, is_verified, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, email, passwordHash, role, first_name, last_name, phone || null, req.body.is_verified ? 1 : 0, req.body.is_active === false ? 0 : 1]
        );
        if (role === 'doctor') await connection.execute('INSERT INTO doctor_profiles (id, user_id) VALUES (?, ?)', [generateUUID(), id]);
        if (role === 'patient' && clinic_id) {
          const [clinics] = await connection.execute('SELECT id FROM clinics WHERE id = ?', [clinic_id]);
          if (!clinics[0]) throw Object.assign(new Error('Selected clinic does not exist.'), { status: 400 });
          await connection.execute(
            'INSERT INTO patients (id, user_id, clinic_id, first_name, last_name, phone, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [generateUUID(), id, clinic_id, first_name, last_name, phone || null, email]
          );
        }
      });
      const created = await User.findById(id);
      await AuditLog.log({ user_id: req.user.id, action: 'ADMIN_CREATE_USER', entity_type: 'user', entity_id: id, details: { email, role }, ip_address: req.ip });
      res.status(201).json({ message: 'User created successfully', user: created });
    } catch (error) { next(error); }
  },

  async updateUser(req, res, next) {
    try {
      const target = await User.findById(req.params.id);
      if (!target) return res.status(404).json({ message: 'User not found' });
      if (req.user.id === target.id && ((req.body.role && req.body.role !== 'admin') || req.body.is_active === false)) {
        return res.status(400).json({ message: 'Security protection: You cannot demote or deactivate your own administrator account.' });
      }
      if (target.role === 'admin' && ((req.body.role && req.body.role !== 'admin') || req.body.is_active === false)) {
        const [counts] = await db.execute("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1 AND id <> ?", [target.id]);
        if (Number(counts[0]?.count || 0) < 1) return res.status(400).json({ message: 'Security protection: Cannot remove the only active platform administrator.' });
      }
      if (req.body.email && req.body.email !== target.email) {
        const existing = await User.findByEmail(req.body.email);
        if (existing && existing.id !== target.id) return res.status(409).json({ message: 'A user with this email already exists.' });
      }
      const fields = ['first_name', 'last_name', 'email', 'phone', 'role', 'is_verified', 'is_active'];
      const updates = fields.filter((field) => req.body[field] !== undefined);
      await db.transaction(async (connection) => {
        if (updates.length) {
          await connection.execute(`UPDATE users SET ${updates.map((field) => `${field} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...updates.map((field) => req.body[field]), target.id]);
        }
        if (req.body.password) await connection.execute('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [await bcrypt.hash(req.body.password, 10), target.id]);
        if (req.body.role === 'doctor' && target.role !== 'doctor') await connection.execute('INSERT IGNORE INTO doctor_profiles (id, user_id) VALUES (?, ?)', [generateUUID(), target.id]);
      });
      const updated = await User.findById(target.id);
      await AuditLog.log({ user_id: req.user.id, action: 'ADMIN_UPDATE_USER', entity_type: 'user', entity_id: target.id, details: updates.reduce((out, key) => ({ ...out, [key]: req.body[key] }), {}), ip_address: req.ip });
      res.json({ message: 'User updated successfully', user: updated });
    } catch (error) { next(error); }
  },

  async deleteUser(req, res, next) {
    try {
      const target = await User.findById(req.params.id);
      if (!target) return res.status(404).json({ message: 'User not found' });
      if (req.user.id === target.id) return res.status(400).json({ message: 'Security protection: You cannot delete your own administrator account.' });
      if (target.role === 'admin' && target.is_active) {
        const [counts] = await db.execute("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND is_active = 1 AND id <> ?", [target.id]);
        if (Number(counts[0]?.count || 0) < 1) return res.status(400).json({ message: 'Security protection: Cannot delete the only active platform administrator.' });
      }
      const deletedEmail = `${target.email.slice(0, 180)}.deleted.${Date.now()}`;
      await db.transaction(async (connection) => {
        await connection.execute('UPDATE clinic_staff SET is_active = 0 WHERE user_id = ?', [target.id]);
        await connection.execute('UPDATE patients SET is_active = 0 WHERE user_id = ?', [target.id]);
        await connection.execute('UPDATE users SET email = ?, is_active = 0, refresh_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [deletedEmail, target.id]);
      });
      await AuditLog.log({ user_id: req.user.id, action: 'ADMIN_DELETE_USER', entity_type: 'user', entity_id: target.id, details: { original_email: target.email, soft_deleted: true }, ip_address: req.ip });
      res.json({ message: 'User deleted successfully' });
    } catch (error) { next(error); }
  },

  async updateUserStatus(req, res, next) {
    try {
      const targetUserId = req.params.id;
      const { is_active } = req.body;

      // Protection: Admin cannot deactivate their own account
      if (req.user.id === targetUserId && (is_active === false || is_active === 0)) {
        return res.status(400).json({ message: 'Security protection: You cannot deactivate your own administrator account.' });
      }

      // Protection: Cannot deactivate the only active platform admin
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) return res.status(404).json({ message: 'User not found' });

      if (targetUser.role === 'admin' && (is_active === false || is_active === 0)) {
        const [adminCount] = await db.execute("SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1");
        if (parseInt(adminCount[0]?.count || 0, 10) <= 1) {
          return res.status(400).json({ message: 'Security protection: Cannot deactivate the only active platform administrator.' });
        }
      }

      const user = await User.update(targetUserId, { is_active });

      await AuditLog.log({
        user_id: req.user.id,
        action: is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
        entity_type: 'user',
        entity_id: targetUserId,
        details: { is_active, target_email: user.email, target_role: user.role },
        ip_address: req.ip,
      });

      res.json({ message: 'User status updated successfully', user });
    } catch (error) {
      next(error);
    }
  },

  async getClinics(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const offset = (page - 1) * limit;
      const search = req.query.search || '';
      const status = req.query.status || 'all';

      let query = `
        SELECT c.*, u.first_name as owner_first_name, u.last_name as owner_last_name, u.email as owner_email,
               (SELECT COUNT(*) FROM patients WHERE clinic_id = c.id) as patient_count,
               (SELECT COUNT(*) FROM appointments WHERE clinic_id = c.id) as appointment_count,
               (SELECT sp.name FROM clinic_subscriptions cs JOIN subscription_plans sp ON cs.plan_id = sp.id WHERE cs.clinic_id = c.id AND cs.status = 'active' ORDER BY cs.created_at DESC LIMIT 1) as plan_name
        FROM clinics c
        JOIN users u ON c.owner_id = u.id
        WHERE 1=1
      `;
      const params = [];

      if (search) {
        query += ' AND (c.name LIKE ? OR c.city LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      if (status === 'active') {
        query += ' AND (c.is_active = 1 OR c.is_active = true)';
      } else if (status === 'suspended' || status === 'inactive') {
        query += ' AND (c.is_active = 0 OR c.is_active = false)';
      }

      query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [clinics] = await db.execute(query, params);

      let countSql = 'SELECT COUNT(*) as count FROM clinics c JOIN users u ON c.owner_id = u.id WHERE 1=1';
      const countParams = [];
      if (search) {
        countSql += ' AND (c.name LIKE ? OR c.city LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
        countParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (status === 'active') {
        countSql += ' AND (c.is_active = 1 OR c.is_active = true)';
      } else if (status === 'suspended' || status === 'inactive') {
        countSql += ' AND (c.is_active = 0 OR c.is_active = false)';
      }

      const [countRows] = await db.execute(countSql, countParams);
      res.json({ clinics, total: parseInt(countRows[0]?.count || 0, 10), page, limit });
    } catch (error) {
      next(error);
    }
  },

  async createClinic(req, res, next) {
    try {
      const { owner_id, name, address, city, phone, email, timezone = 'UTC' } = req.body;
      const owner = await User.findById(owner_id);
      if (!owner || !['doctor', 'admin'].includes(owner.role)) return res.status(400).json({ message: 'Clinic owner must be a valid doctor or administrator.' });
      const id = generateUUID();
      await db.transaction(async (connection) => {
        await connection.execute('INSERT INTO clinics (id, owner_id, name, slug, address, city, phone, email, timezone, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)', [id, owner_id, name, generateSlug(name), address || null, city || null, phone || null, email || null, timezone]);
        await connection.execute('INSERT INTO clinic_staff (id, clinic_id, user_id, role, is_active) VALUES (?, ?, ?, ?, 1)', [generateUUID(), id, owner_id, 'doctor']);
        const [plans] = await connection.execute("SELECT id FROM subscription_plans WHERE id = 'plan-starter' OR name = 'Starter' ORDER BY id = 'plan-starter' DESC LIMIT 1");
        if (plans[0]) await connection.execute("INSERT INTO clinic_subscriptions (id, clinic_id, plan_id, status, start_date, end_date, auto_renew) VALUES (?, ?, ?, 'active', CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), 1)", [generateUUID(), id, plans[0].id]);
      });
      const [rows] = await db.execute('SELECT * FROM clinics WHERE id = ?', [id]);
      await AuditLog.log({ user_id: req.user.id, action: 'ADMIN_CREATE_CLINIC', entity_type: 'clinic', entity_id: id, details: { name, owner_id }, ip_address: req.ip });
      res.status(201).json({ message: 'Clinic created successfully', clinic: rows[0] });
    } catch (error) { next(error); }
  },

  async updateClinic(req, res, next) {
    try {
      const [existing] = await db.execute('SELECT * FROM clinics WHERE id = ?', [req.params.id]);
      if (!existing[0]) return res.status(404).json({ message: 'Clinic not found' });
      if (req.body.owner_id) {
        const owner = await User.findById(req.body.owner_id);
        if (!owner || !['doctor', 'admin'].includes(owner.role)) return res.status(400).json({ message: 'Clinic owner must be a valid doctor or administrator.' });
      }
      const fields = ['name', 'address', 'city', 'phone', 'email', 'timezone', 'is_active', 'owner_id'].filter((field) => req.body[field] !== undefined);
      if (fields.length) await db.execute(`UPDATE clinics SET ${fields.map((field) => `${field} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...fields.map((field) => req.body[field]), req.params.id]);
      const [rows] = await db.execute('SELECT * FROM clinics WHERE id = ?', [req.params.id]);
      await AuditLog.log({ user_id: req.user.id, action: 'ADMIN_UPDATE_CLINIC', entity_type: 'clinic', entity_id: req.params.id, details: req.body, ip_address: req.ip });
      res.json({ message: 'Clinic updated successfully', clinic: rows[0] });
    } catch (error) { next(error); }
  },

  async deleteClinic(req, res, next) {
    try {
      const [existing] = await db.execute('SELECT id, name FROM clinics WHERE id = ?', [req.params.id]);
      if (!existing[0]) return res.status(404).json({ message: 'Clinic not found' });
      await db.transaction(async (connection) => {
        await connection.execute('UPDATE clinics SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
        await connection.execute('UPDATE clinic_staff SET is_active = 0 WHERE clinic_id = ?', [req.params.id]);
        await connection.execute("UPDATE clinic_subscriptions SET status = 'cancelled', auto_renew = 0, updated_at = CURRENT_TIMESTAMP WHERE clinic_id = ? AND status = 'active'", [req.params.id]);
      });
      await AuditLog.log({ user_id: req.user.id, action: 'ADMIN_DELETE_CLINIC', entity_type: 'clinic', entity_id: req.params.id, details: { name: existing[0].name, soft_deleted: true }, ip_address: req.ip });
      res.json({ message: 'Clinic deleted successfully' });
    } catch (error) { next(error); }
  },

  async updateClinicStatus(req, res, next) {
    try {
      const clinicId = req.params.id;
      const { is_active } = req.body;

      const [existing] = await db.execute('SELECT * FROM clinics WHERE id = ?', [clinicId]);
      if (!existing[0]) return res.status(404).json({ message: 'Clinic not found' });

      await db.execute('UPDATE clinics SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [is_active ? 1 : 0, clinicId]);
      const [updated] = await db.execute('SELECT * FROM clinics WHERE id = ?', [clinicId]);

      await AuditLog.log({
        user_id: req.user.id,
        action: is_active ? 'CLINIC_ACTIVATED' : 'CLINIC_SUSPENDED',
        entity_type: 'clinic',
        entity_id: clinicId,
        details: { clinic_name: existing[0].name, is_active },
        ip_address: req.ip,
      });

      res.json({ message: 'Clinic status updated successfully', clinic: updated[0] });
    } catch (error) {
      next(error);
    }
  },

  async getPendingReviews(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const result = await Review.getPending(page, 20);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async approveReview(req, res, next) {
    try {
      const review = await Review.approve(req.params.id);
      if (!review) return res.status(404).json({ message: 'Review not found' });

      await AuditLog.log({
        user_id: req.user.id,
        action: 'APPROVE_REVIEW',
        entity_type: 'review',
        entity_id: req.params.id,
        details: { rating: review.rating, clinic_id: review.clinic_id },
        ip_address: req.ip,
      });

      res.json({ message: 'Review approved successfully', review });
    } catch (error) {
      next(error);
    }
  },

  async rejectReview(req, res, next) {
    try {
      await Review.remove(req.params.id);

      await AuditLog.log({
        user_id: req.user.id,
        action: 'REJECT_REVIEW',
        entity_type: 'review',
        entity_id: req.params.id,
        details: { removed: true },
        ip_address: req.ip,
      });

      res.json({ message: 'Review rejected and removed successfully' });
    } catch (error) {
      next(error);
    }
  },

  async getPlans(req, res, next) {
    try {
      const plans = await Subscription.getPlans(false);
      res.json({ plans });
    } catch (error) {
      next(error);
    }
  },

  async createPlan(req, res, next) {
    try {
      const { name, price, billing_cycle } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ message: 'Plan name is required.' });
      }
      if (price === undefined || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
        return res.status(400).json({ message: 'Plan price must be a valid number greater than or equal to 0.' });
      }
      if (billing_cycle && !['monthly', 'quarterly', 'yearly'].includes(billing_cycle)) {
        return res.status(400).json({ message: 'Billing cycle must be monthly, quarterly, or yearly.' });
      }

      const plan = await Subscription.createPlan(req.body);
      await AuditLog.log({
        user_id: req.user.id,
        action: 'CREATE_SUBSCRIPTION_PLAN',
        entity_type: 'subscription_plan',
        entity_id: plan.id,
        details: { name: plan.name, price: plan.price },
        ip_address: req.ip,
      });
      res.status(201).json({ message: 'Subscription plan created', plan });
    } catch (error) {
      next(error);
    }
  },

  async updatePlan(req, res, next) {
    try {
      const plan = await Subscription.updatePlan(req.params.id, req.body);
      if (!plan) return res.status(404).json({ message: 'Subscription plan not found' });
      await AuditLog.log({
        user_id: req.user.id,
        action: 'UPDATE_SUBSCRIPTION_PLAN',
        entity_type: 'subscription_plan',
        entity_id: req.params.id,
        details: req.body,
        ip_address: req.ip,
      });
      res.json({ message: 'Subscription plan updated', plan });
    } catch (error) {
      next(error);
    }
  },

  async deletePlan(req, res, next) {
    try {
      await Subscription.deletePlan(req.params.id);
      await AuditLog.log({
        user_id: req.user.id,
        action: 'DEACTIVATE_SUBSCRIPTION_PLAN',
        entity_type: 'subscription_plan',
        entity_id: req.params.id,
        ip_address: req.ip,
      });
      res.json({ message: 'Subscription plan deactivated' });
    } catch (error) {
      next(error);
    }
  },

  async getSubscriptions(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const result = await Subscription.getAllByAdmin(page, 20);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async assignSubscription(req, res, next) {
    try {
      const { clinic_id, plan_id, billing_cycle = 'monthly', duration_days, status = 'active' } = req.body;
      const [[clinicRows], [planRows]] = await Promise.all([
        db.execute('SELECT id FROM clinics WHERE id = ?', [clinic_id]),
        db.execute('SELECT id FROM subscription_plans WHERE id = ?', [plan_id]),
      ]);
      if (!clinicRows[0]) return res.status(404).json({ message: 'Clinic not found' });
      if (!planRows[0]) return res.status(404).json({ message: 'Subscription plan not found' });
      const days = Number(duration_days) || (billing_cycle === 'yearly' ? 365 : billing_cycle === 'quarterly' ? 90 : 30);
      const id = generateUUID();
      await db.transaction(async (connection) => {
        await connection.execute("UPDATE clinic_subscriptions SET status = 'cancelled', auto_renew = 0, updated_at = CURRENT_TIMESTAMP WHERE clinic_id = ? AND status = 'active'", [clinic_id]);
        await connection.execute('INSERT INTO clinic_subscriptions (id, clinic_id, plan_id, status, start_date, end_date, auto_renew) VALUES (?, ?, ?, ?, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL ? DAY), ?)', [id, clinic_id, plan_id, status, days, req.body.auto_renew === false ? 0 : 1]);
      });
      const [rows] = await db.execute('SELECT * FROM clinic_subscriptions WHERE id = ?', [id]);
      await AuditLog.log({ user_id: req.user.id, action: 'ADMIN_ASSIGN_SUBSCRIPTION', entity_type: 'clinic_subscription', entity_id: id, details: { clinic_id, plan_id, billing_cycle, days, status }, ip_address: req.ip });
      res.status(201).json({ message: 'Subscription assigned successfully', subscription: rows[0] });
    } catch (error) { next(error); }
  },

  async updateSubscription(req, res, next) {
    try {
      const [existing] = await db.execute('SELECT * FROM clinic_subscriptions WHERE id = ?', [req.params.id]);
      if (!existing[0]) return res.status(404).json({ message: 'Subscription not found' });
      const fields = ['start_date', 'end_date', 'status', 'auto_renew'].filter((field) => req.body[field] !== undefined);
      if (fields.length) await db.execute(`UPDATE clinic_subscriptions SET ${fields.map((field) => `${field} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...fields.map((field) => req.body[field]), req.params.id]);
      const [rows] = await db.execute('SELECT * FROM clinic_subscriptions WHERE id = ?', [req.params.id]);
      await AuditLog.log({ user_id: req.user.id, action: 'ADMIN_UPDATE_SUBSCRIPTION', entity_type: 'clinic_subscription', entity_id: req.params.id, details: req.body, ip_address: req.ip });
      res.json({ message: 'Subscription updated successfully', subscription: rows[0] });
    } catch (error) { next(error); }
  },

  async cancelClinicSubscription(req, res, next) {
    try {
      const [result] = await db.execute("UPDATE clinic_subscriptions SET status = 'cancelled', auto_renew = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
      if (!result.affectedRows) return res.status(404).json({ message: 'Subscription not found' });
      await AuditLog.log({ user_id: req.user.id, action: 'ADMIN_CANCEL_SUBSCRIPTION', entity_type: 'clinic_subscription', entity_id: req.params.id, ip_address: req.ip });
      res.json({ message: 'Subscription cancelled successfully' });
    } catch (error) { next(error); }
  },

  async getAuditLogs(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const action = req.query.action || '';
      const result = await AuditLog.getAll(page, 50, action);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = adminController;
