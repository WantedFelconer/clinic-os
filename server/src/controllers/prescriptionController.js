const Prescription = require('../models/Prescription');

const prescriptionController = {
  async create(req, res, next) {
    try {
      const { patient_id, appointment_id, diagnosis, notes, items } = req.body;
      const prescription = await Prescription.create({
        patient_id,
        clinic_id: req.params.clinicId,
        doctor_id: req.user.id,
        appointment_id,
        diagnosis,
        notes,
      });

      if (items && items.length > 0) {
        for (const item of items) {
          await Prescription.addItem({ ...item, prescription_id: prescription.id });
        }
      }

      const fullPrescription = await Prescription.getFullPrescription(prescription.id);
      res.status(201).json({ prescription: fullPrescription });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const prescription = await Prescription.getFullPrescription(req.params.id);
      if (!prescription) return res.status(404).json({ message: 'Prescription not found' });
      res.json({ prescription });
    } catch (error) {
      next(error);
    }
  },

  async getByPatient(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const result = await Prescription.findByPatient(req.params.patientId, page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getByClinic(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const result = await Prescription.findByClinic(req.params.clinicId, page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async addItem(req, res, next) {
    try {
      const item = await Prescription.addItem({ ...req.body, prescription_id: req.params.id });
      res.status(201).json({ item });
    } catch (error) {
      next(error);
    }
  },

  async removeItem(req, res, next) {
    try {
      await Prescription.removeItem(req.params.itemId);
      res.json({ message: 'Item removed' });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = prescriptionController;
