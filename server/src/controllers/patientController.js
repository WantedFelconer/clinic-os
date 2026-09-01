const Patient = require('../models/Patient');
const MedicalRecord = require('../models/MedicalRecord');
const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const db = require('../config/database');

const patientController = {
  async create(req, res, next) {
    try {
      const clinicId = req.params.clinicId;
      const Subscription = require('../models/Subscription');
      const limits = await Subscription.checkClinicLimits(clinicId);
      if (!limits.patients.allowed) {
        return res.status(403).json({
          message: `Plan limit reached: Your current plan (${limits.plan_name}) allows a maximum of ${limits.patients.max} patients. Please upgrade your subscription to register more patients.`,
          limits,
        });
      }

      // Patient identity enforcement
      let targetUserId = req.body.user_id;
      if (req.user && req.user.role === 'patient') {
        targetUserId = req.user.id;
      }

      if (targetUserId) {
        const existing = await Patient.findByUserId(targetUserId, clinicId);
        if (existing) {
          return res.status(400).json({ message: 'Patient already registered in this clinic.' });
        }
      }

      const patient = await Patient.create({
        ...req.body,
        user_id: targetUserId,
        clinic_id: clinicId,
      });

      await AuditLog.log({
        user_id: req.user.id,
        action: 'PATIENT_CREATED',
        entity_type: 'patient',
        entity_id: patient.id,
        details: { clinic_id: clinicId, first_name: patient.first_name, last_name: patient.last_name },
        ip_address: req.ip,
      });

      res.status(201).json({ message: 'Patient registered successfully', patient });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const patient = await Patient.findById(req.params.id);
      if (!patient || patient.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Patient not found in this clinic.' });
      }

      // Cross-patient IDOR protection
      if (req.user && req.user.role === 'patient') {
        if (patient.user_id !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: You cannot access another patient profile.' });
        }
      }

      res.json({ patient });
    } catch (error) {
      next(error);
    }
  },

  async getHistory(req, res, next) {
    try {
      const patient = await Patient.findById(req.params.id);
      if (!patient || patient.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Patient not found in this clinic.' });
      }

      // Cross-patient IDOR protection
      if (req.user && req.user.role === 'patient') {
        if (patient.user_id !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: You cannot access another patient medical history.' });
        }
      }

      // Fetch EMR records, appointments, prescriptions, and payments
      const includeConfidential = req.user.role !== 'patient';
      const [recordsResult, apptsResult, prescsResult, paymentsResult] = await Promise.all([
        MedicalRecord.findByPatient(patient.id, 1, 50, includeConfidential),
        Appointment.findByPatient(patient.id, 1, 50),
        Prescription.findByPatient(patient.id, 1, 50),
        Payment.findByPatient(patient.id, 1, 50),
      ]);

      const enrichedPrescriptions = await Promise.all(
        (prescsResult.prescriptions || []).map(async (rx) => {
          const items = await Prescription.getItems(rx.id);
          return { ...rx, items };
        })
      );

      res.json({
        patient,
        medical_records: recordsResult.records || [],
        appointments: apptsResult.appointments || [],
        prescriptions: enrichedPrescriptions,
        payments: paymentsResult.payments || [],
      });
    } catch (error) {
      next(error);
    }
  },

  async getByClinic(req, res, next) {
    try {
      if (req.user && req.user.role === 'patient') {
        return res.status(403).json({ message: 'Forbidden: Patients cannot view the clinic patient registry.' });
      }

      const page = parseInt(req.query.page, 10) || 1;
      const rawLimit = parseInt(req.query.limit, 10) || 50;
      const limit = Math.min(Math.max(1, rawLimit), 100);
      const search = (req.query.search || '').trim();
      const result = await Patient.findByClinic(req.params.clinicId, page, limit, search);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const existing = await Patient.findById(req.params.id);
      if (!existing || existing.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Patient not found in this clinic.' });
      }

      if (req.user && req.user.role === 'patient') {
        if (existing.user_id !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: You cannot update another patient record.' });
        }
      }

      // Explicitly protect security fields and foreign keys from overwrite
      const safeUpdates = { ...req.body };
      delete safeUpdates.id;
      delete safeUpdates.patient_id;
      delete safeUpdates.clinic_id;
      delete safeUpdates.user_id;

      const patient = await Patient.update(req.params.id, safeUpdates);

      await AuditLog.log({
        user_id: req.user.id,
        action: 'PATIENT_UPDATED',
        entity_type: 'patient',
        entity_id: req.params.id,
        details: { clinic_id: req.params.clinicId, updates: safeUpdates },
        ip_address: req.ip,
      });

      res.json({ message: 'Patient updated successfully', patient });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = patientController;
