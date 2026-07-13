const User = require('../models/User');
const Review = require('../models/Review');
const Subscription = require('../models/Subscription');
const db = require('../config/database');

const adminController = {
  async getDashboard(req, res, next) {
    try {
      const [userCounts] = await db.execute(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN role = 'doctor' THEN 1 ELSE 0 END) as doctors,
                SUM(CASE WHEN role = 'patient' THEN 1 ELSE 0 END) as patients,
                SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistants
         FROM users WHERE is_active = true`
      );

      const [clinicCount] = await db.execute('SELECT COUNT(*) as total FROM clinics WHERE is_active = true');
      const [apptCount] = await db.execute('SELECT COUNT(*) as total FROM appointments');
      const [revenue] = await db.execute(
        "SELECT IFNULL(SUM(total_amount), 0) as total FROM payments WHERE payment_status = 'completed'"
      );

      res.json({
        stats: {
          total_users: userCounts[0].total,
          total_doctors: userCounts[0].doctors,
          total_patients: userCounts[0].patients,
          total_assistants: userCounts[0].assistants,
          total_clinics: clinicCount[0].total,
          total_appointments: apptCount[0].total,
          total_revenue: revenue[0].total,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  async getUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const search = req.query.search || '';
      const result = await User.getAll(page, 20, search);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async updateUserStatus(req, res, next) {
    try {
      const user = await User.update(req.params.id, { is_active: req.body.is_active });
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json({ message: 'User status updated', user });
    } catch (error) {
      next(error);
    }
  },

  async getClinics(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 20;
      const offset = (page - 1) * limit;

      const [clinics] = await db.execute(
        `SELECT c.*, u.first_name as owner_first_name, u.last_name as owner_last_name, u.email as owner_email,
                (SELECT COUNT(*) FROM patients WHERE clinic_id = c.id) as patient_count,
                (SELECT COUNT(*) FROM appointments WHERE clinic_id = c.id) as appointment_count
         FROM clinics c JOIN users u ON c.owner_id = u.id
         ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      const [countRows] = await db.execute('SELECT COUNT(*) as count FROM clinics');
      res.json({ clinics, total: countRows[0].count, page, limit });
    } catch (error) {
      next(error);
    }
  },

  async getPendingReviews(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const result = await Review.getPending(page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async approveReview(req, res, next) {
    try {
      const review = await Review.approve(req.params.id);
      if (!review) return res.status(404).json({ message: 'Review not found' });
      res.json({ review });
    } catch (error) {
      next(error);
    }
  },

  async getSubscriptions(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const result = await Subscription.getAllByAdmin(page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = adminController;
