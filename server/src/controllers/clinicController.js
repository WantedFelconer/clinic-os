const Clinic = require('../models/Clinic');
const Service = require('../models/Service');
const Package = require('../models/Package');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');

const clinicController = {
  async create(req, res, next) {
    try {
      const clinic = await Clinic.create({ ...req.body, owner_id: req.user.id });
      await Clinic.addStaff(clinic.id, req.user.id, 'doctor');

      await AuditLog.log({
        user_id: req.user.id,
        action: 'CLINIC_CREATED',
        entity_type: 'clinic',
        entity_id: clinic.id,
        details: { name: clinic.name, city: clinic.city },
        ip_address: req.ip,
      });

      res.status(201).json({ message: 'Clinic created', clinic });
    } catch (error) {
      next(error);
    }
  },

  async getMyClinics(req, res, next) {
    try {
      const clinics = await Clinic.findByOwner(req.user.id);
      res.json({ clinics });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const clinic = await Clinic.findById(req.params.id);
      if (!clinic) return res.status(404).json({ message: 'Clinic not found' });
      const staff = await Clinic.getStaff(req.params.id);
      const schedules = await Clinic.getSchedules(req.params.id);
      res.json({ clinic, staff, schedules });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const clinic = await Clinic.update(req.params.id, req.body);
      if (!clinic) return res.status(404).json({ message: 'Clinic not found' });

      await AuditLog.log({
        user_id: req.user.id,
        action: 'CLINIC_UPDATED',
        entity_type: 'clinic',
        entity_id: req.params.id,
        details: req.body,
        ip_address: req.ip,
      });

      res.json({ message: 'Clinic updated', clinic });
    } catch (error) {
      next(error);
    }
  },

  async search(req, res, next) {
    try {
      const { query, city, specialization, page, limit } = req.query;
      const result = await Clinic.search({ query, city, specialization, page: parseInt(page, 10) || 1, limit: parseInt(limit, 10) || 20 });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getAvailableSlots(req, res, next) {
    try {
      const { date, service_id } = req.query;
      const result = await Clinic.getAvailableSlots(req.params.clinicId, date, service_id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getSchedules(req, res, next) {
    try {
      const schedules = await Clinic.getSchedules(req.params.clinicId);
      res.json({ schedules });
    } catch (error) {
      next(error);
    }
  },

  async updateSchedules(req, res, next) {
    try {
      const scheduleList = Array.isArray(req.body) ? req.body : (req.body.schedules || []);
      const schedules = await Clinic.updateSchedules(req.params.clinicId, scheduleList);

      await AuditLog.log({
        user_id: req.user.id,
        action: 'CLINIC_SCHEDULES_UPDATED',
        entity_type: 'clinic',
        entity_id: req.params.clinicId,
        details: { count: scheduleList.length },
        ip_address: req.ip,
      });

      res.json({ message: 'Schedules updated', schedules });
    } catch (error) {
      next(error);
    }
  },

  async getStaff(req, res, next) {
    try {
      const staff = await Clinic.getStaff(req.params.clinicId);
      res.json({ staff });
    } catch (error) {
      next(error);
    }
  },

  async addStaff(req, res, next) {
    try {
      const { email, role, first_name, last_name, password } = req.body;
      const cleanEmail = (email || '').trim().toLowerCase();

      if (!['doctor', 'assistant'].includes(role)) {
        return res.status(400).json({ message: 'Staff role must be doctor or assistant.' });
      }

      let user = await User.findByEmail(cleanEmail);

      // If user does not exist yet and initial password is provided, provision assistant/staff user account
      if (!user) {
        if (!password || password.length < 6) {
          return res.status(400).json({
            message: 'User does not exist. Please provide a password (minimum 6 characters) to create a new staff account.',
          });
        }

        user = await User.create({
          email: cleanEmail,
          password: password || 'password123',
          role,
          first_name: (first_name || 'Staff').trim(),
          last_name: (last_name || 'Member').trim(),
          is_verified: true,
        });
      } else {
        if (user.role !== role) {
          return res.status(400).json({
            message: `User account role is '${user.role}', which does not match requested staff role '${role}'.`,
          });
        }
      }

      const Subscription = require('../models/Subscription');
      const limits = await Subscription.checkClinicLimits(req.params.clinicId);
      if (role === 'doctor' && !limits.doctors.allowed) {
        return res.status(403).json({
          message: `Plan limit reached: Your current plan (${limits.plan_name}) allows a maximum of ${limits.doctors.max} doctors. Please upgrade your subscription to add more doctors.`,
          limits,
        });
      }
      if (role === 'assistant' && !limits.staff.allowed) {
        return res.status(403).json({
          message: `Plan limit reached: Your current plan (${limits.plan_name}) allows a maximum of ${limits.staff.max} staff members. Please upgrade your subscription to add more staff.`,
          limits,
        });
      }

      const result = await Clinic.addStaff(req.params.clinicId, user.id, role);

      await AuditLog.log({
        user_id: req.user.id,
        action: 'STAFF_ADDED',
        entity_type: 'clinic_staff',
        entity_id: result.id,
        details: { clinic_id: req.params.clinicId, staff_user_id: user.id, role },
        ip_address: req.ip,
      });

      const clinicInfo = await Clinic.findById(req.params.clinicId);
      await Notification.create({
        user_id: user.id,
        title: 'Added to Clinic Staff',
        message: `You have been added as a ${role} to ${clinicInfo?.name || 'a clinic'}.`,
        type: 'info',
        reference_type: 'clinic',
        reference_id: req.params.clinicId,
      }).catch(err => console.warn('[Notification Warning]:', err.message));

      res.status(201).json({ message: 'Staff added successfully', staff: result });
    } catch (error) {
      next(error);
    }
  },

  async removeStaff(req, res, next) {
    try {
      await Clinic.removeStaff(req.params.clinicId, req.params.userId);

      await AuditLog.log({
        user_id: req.user.id,
        action: 'STAFF_REMOVED',
        entity_type: 'clinic_staff',
        entity_id: req.params.userId,
        details: { clinic_id: req.params.clinicId, staff_user_id: req.params.userId },
        ip_address: req.ip,
      });

      res.json({ message: 'Staff removed successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Services
  async createService(req, res, next) {
    try {
      const service = await Service.create({ ...req.body, clinic_id: req.params.clinicId });
      res.status(201).json({ service });
    } catch (error) {
      next(error);
    }
  },

  async getServices(req, res, next) {
    try {
      const services = await Service.findByClinic(req.params.clinicId);
      res.json({ services });
    } catch (error) {
      next(error);
    }
  },

  async updateService(req, res, next) {
    try {
      const existing = await Service.findById(req.params.serviceId);
      if (!existing || existing.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Service not found in this clinic' });
      }
      const service = await Service.update(req.params.serviceId, req.body);
      if (!service) return res.status(404).json({ message: 'Service not found' });
      res.json({ service });
    } catch (error) {
      next(error);
    }
  },

  async deleteService(req, res, next) {
    try {
      const existing = await Service.findById(req.params.serviceId);
      if (!existing || existing.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Service not found in this clinic' });
      }
      await Service.remove(req.params.serviceId);
      res.json({ message: 'Service deleted' });
    } catch (error) {
      next(error);
    }
  },

  // Packages
  async createPackage(req, res, next) {
    try {
      const pkg = await Package.create({ ...req.body, clinic_id: req.params.clinicId });
      res.status(201).json({ package: pkg });
    } catch (error) {
      next(error);
    }
  },

  async getPackages(req, res, next) {
    try {
      const packages = await Package.findByClinic(req.params.clinicId);
      res.json({ packages });
    } catch (error) {
      next(error);
    }
  },

  async updatePackage(req, res, next) {
    try {
      const existing = await Package.findById(req.params.packageId);
      if (!existing || existing.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Package not found in this clinic' });
      }
      const pkg = await Package.update(req.params.packageId, req.body);
      if (!pkg) return res.status(404).json({ message: 'Package not found' });
      res.json({ package: pkg });
    } catch (error) {
      next(error);
    }
  },

  async deletePackage(req, res, next) {
    try {
      const existing = await Package.findById(req.params.packageId);
      if (!existing || existing.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Package not found in this clinic' });
      }
      await Package.remove(req.params.packageId);
      res.json({ message: 'Package deleted' });
    } catch (error) {
      next(error);
    }
  },

  // Dashboard
  async getDashboard(req, res, next) {
    try {
      const clinicId = req.params.clinicId;
      const db = require('../config/database');

      const [apptCounts] = await db.execute(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN status IN ('scheduled', 'confirmed') THEN 1 ELSE 0 END) as upcoming,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
         FROM appointments WHERE clinic_id = ?`,
        [clinicId]
      );

      const [patientCount] = await db.execute(
        'SELECT COUNT(*) as total FROM patients WHERE clinic_id = ?', [clinicId]
      );

      const [revenue] = await db.execute(
        "SELECT IFNULL(SUM(total_amount), 0) as total FROM payments WHERE clinic_id = ? AND payment_status = 'completed'",
        [clinicId]
      );

      const [pkgCount] = await db.execute(
        'SELECT COUNT(*) as total FROM consultation_packages WHERE clinic_id = ? AND is_active = true',
        [clinicId]
      );

      const [todayAppts] = await db.execute(
        `SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name, p.phone as patient_phone,
                cs.name as service_name, cs.duration_minutes as service_duration
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         LEFT JOIN clinic_services cs ON a.service_id = cs.id
         WHERE a.clinic_id = ? AND a.appointment_date = CURRENT_DATE
         ORDER BY a.start_time ASC`,
        [clinicId]
      );

      const [typeRows] = await db.execute(
        `SELECT type, COUNT(*) as count FROM appointments WHERE clinic_id = ? GROUP BY type`,
        [clinicId]
      );
      const totalVisits = typeRows.reduce((s, r) => s + (parseInt(r.count, 10) || 0), 0);
      const visitTypes = typeRows.map(r => ({
        name: r.type ? (r.type.charAt(0).toUpperCase() + r.type.slice(1).replace('-', ' ')) : 'In-Person',
        value: totalVisits > 0 ? Math.round(((parseInt(r.count, 10) || 0) / totalVisits) * 100) : 0,
        count: parseInt(r.count, 10) || 0
      }));

      const [monthlyRevRows] = await db.execute(
        `SELECT DATE_FORMAT(payment_date, '%Y-%m') as month, SUM(total_amount) as revenue, COUNT(*) as count
         FROM payments
         WHERE clinic_id = ? AND payment_status = 'completed' AND payment_date IS NOT NULL
         GROUP BY month
         ORDER BY month ASC
         LIMIT 6`,
        [clinicId]
      );

      res.json({
        stats: {
          total_appointments: parseInt(apptCounts[0]?.total, 10) || 0,
          upcoming_appointments: parseInt(apptCounts[0]?.upcoming, 10) || 0,
          completed_appointments: parseInt(apptCounts[0]?.completed, 10) || 0,
          total_patients: parseInt(patientCount[0]?.total, 10) || 0,
          total_revenue: parseFloat(revenue[0]?.total) || 0,
          packages_count: parseInt(pkgCount[0]?.total, 10) || 0,
        },
        today_appointments: todayAppts,
        visit_types: visitTypes,
        monthly_revenue: monthlyRevRows,
      });
    } catch (error) {
      next(error);
    }
  },

  // Analytics
  async getAnalytics(req, res, next) {
    try {
      const clinicId = req.params.clinicId;
      const db = require('../config/database');

      const [revenueResult] = await db.execute(
        `SELECT IFNULL(SUM(total_amount), 0) as total_revenue,
                COUNT(*) as paid_invoices,
                IFNULL(AVG(total_amount), 0) as avg_revenue
         FROM payments WHERE clinic_id = ? AND payment_status = 'completed'`,
        [clinicId]
      );

      const [apptResult] = await db.execute(
        `SELECT COUNT(*) as total_appointments,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
         FROM appointments WHERE clinic_id = ?`,
        [clinicId]
      );

      const [patientResult] = await db.execute(
        'SELECT COUNT(*) as total_patients FROM patients WHERE clinic_id = ?',
        [clinicId]
      );

      const [monthlyApptRows] = await db.execute(
        `SELECT DATE_FORMAT(appointment_date, '%Y-%m') as month, COUNT(*) as count
         FROM appointments WHERE clinic_id = ?
         GROUP BY month ORDER BY month ASC LIMIT 12`,
        [clinicId]
      );

      const [monthlyPayRows] = await db.execute(
        `SELECT DATE_FORMAT(payment_date, '%Y-%m') as month, SUM(total_amount) as revenue
         FROM payments WHERE clinic_id = ? AND payment_status = 'completed' AND payment_date IS NOT NULL
         GROUP BY month ORDER BY month ASC LIMIT 12`,
        [clinicId]
      );

      const monthMap = {};
      monthlyApptRows.forEach(r => {
        if (r.month) monthMap[r.month] = { month: r.month, appointments: parseInt(r.count, 10) || 0, revenue: 0 };
      });
      monthlyPayRows.forEach(r => {
        if (r.month) {
          if (!monthMap[r.month]) monthMap[r.month] = { month: r.month, appointments: 0, revenue: parseFloat(r.revenue) || 0 };
          else monthMap[r.month].revenue = parseFloat(r.revenue) || 0;
        }
      });

      const monthlyTrends = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));

      const [typeRows] = await db.execute(
        `SELECT type, COUNT(*) as count FROM appointments WHERE clinic_id = ? GROUP BY type`,
        [clinicId]
      );
      const totalVisits = typeRows.reduce((s, r) => s + (parseInt(r.count, 10) || 0), 0);
      const visitDistribution = typeRows.map(r => ({
        name: r.type ? (r.type.charAt(0).toUpperCase() + r.type.slice(1).replace('-', ' ')) : 'In-Person',
        value: totalVisits > 0 ? Math.round(((parseInt(r.count, 10) || 0) / totalVisits) * 100) : 0,
        count: parseInt(r.count, 10) || 0
      }));

      const totalAppts = parseInt(apptResult[0]?.total_appointments, 10) || 0;
      const completedAppts = parseInt(apptResult[0]?.completed, 10) || 0;
      const noShowAppts = parseInt(apptResult[0]?.no_show, 10) || 0;
      const totalRev = parseFloat(revenueResult[0]?.total_revenue) || 0;

      res.json({
        summary: {
          total_revenue: totalRev,
          avg_per_visit: completedAppts > 0 ? Math.round(totalRev / completedAppts) : (totalRev > 0 ? totalRev : 0),
          total_appointments: totalAppts,
          completed_appointments: completedAppts,
          no_show_appointments: noShowAppts,
          no_show_rate: totalAppts > 0 ? Math.round((noShowAppts / totalAppts) * 100) : 0,
          total_patients: parseInt(patientResult[0]?.total_patients, 10) || 0,
        },
        monthly_trends: monthlyTrends,
        visit_distribution: visitDistribution,
      });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = clinicController;
