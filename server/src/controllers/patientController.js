const Patient = require('../models/Patient');

const patientController = {
  async create(req, res, next) {
    try {
      const existing = await Patient.findByUserId(req.body.user_id, req.params.clinicId);
      if (existing) {
        return res.status(400).json({ message: 'Patient already exists in this clinic' });
      }
      const patient = await Patient.create({ ...req.body, clinic_id: req.params.clinicId });
      res.status(201).json({ patient });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const patient = await Patient.findById(req.params.id);
      if (!patient) return res.status(404).json({ message: 'Patient not found' });
      res.json({ patient });
    } catch (error) {
      next(error);
    }
  },

  async getByClinic(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';
      const result = await Patient.findByClinic(req.params.clinicId, page, limit, search);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const patient = await Patient.update(req.params.id, req.body);
      if (!patient) return res.status(404).json({ message: 'Patient not found' });
      res.json({ patient });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = patientController;
