const Payment = require('../models/Payment');

const paymentController = {
  async create(req, res, next) {
    try {
      const payment = await Payment.create({ ...req.body, clinic_id: req.params.clinicId });
      res.status(201).json({ payment });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const payment = await Payment.findById(req.params.id);
      if (!payment) return res.status(404).json({ message: 'Payment not found' });
      res.json({ payment });
    } catch (error) {
      next(error);
    }
  },

  async getByClinic(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const result = await Payment.findByClinic(req.params.clinicId, page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getMyPayments(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const db = require('../config/database');
      const [patients] = await db.execute(
        'SELECT id FROM patients WHERE user_id = ?', [req.user.id]
      );
      if (patients.length === 0) return res.json({ payments: [], total: 0, page, limit: 20 });

      const result = await Payment.findByPatient(patients[0].id, page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { status, transaction_id } = req.body;
      const payment = await Payment.updateStatus(req.params.id, status, transaction_id);
      if (!payment) return res.status(404).json({ message: 'Payment not found' });
      res.json({ payment });
    } catch (error) {
      next(error);
    }
  },

  async getRevenue(req, res, next) {
    try {
      const { start_date, end_date } = req.query;
      const revenue = await Payment.getRevenue(req.params.clinicId, start_date, end_date);
      res.json({ revenue });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = paymentController;
