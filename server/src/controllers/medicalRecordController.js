const MedicalRecord = require('../models/MedicalRecord');

const medicalRecordController = {
  async create(req, res, next) {
    try {
      const record = await MedicalRecord.create({ ...req.body, clinic_id: req.params.clinicId, doctor_id: req.user.id });
      res.status(201).json({ record });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const record = await MedicalRecord.findById(req.params.id);
      if (!record) return res.status(404).json({ message: 'Medical record not found' });
      res.json({ record });
    } catch (error) {
      next(error);
    }
  },

  async getByPatient(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const result = await MedicalRecord.findByPatient(req.params.patientId, page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getByClinic(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const result = await MedicalRecord.findByClinic(req.params.clinicId, page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const record = await MedicalRecord.update(req.params.id, req.body);
      if (!record) return res.status(404).json({ message: 'Medical record not found' });
      res.json({ record });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = medicalRecordController;
