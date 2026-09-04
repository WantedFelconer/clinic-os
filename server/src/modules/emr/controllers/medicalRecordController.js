const MedicalRecord = require('../models/MedicalRecord');
const { Patient } = require('../../patients');
const { AuditLog } = require('../../admin');
const { validateDoctorClinicMembership } = require('../../../core/middleware/rbac');

const medicalRecordController = {
  async create(req, res, next) {
    try {
      const clinicId = req.params.clinicId;

      // Verify doctor belongs to clinic
      const isDocValid = await validateDoctorClinicMembership(req.user.id, clinicId);
      if (!isDocValid) {
        return res.status(403).json({ message: 'Forbidden: You are not authorized as a practicing doctor in this clinic.' });
      }

      const patient = await Patient.findById(req.body.patient_id);
      if (!patient || patient.clinic_id !== clinicId) {
        return res.status(400).json({ message: 'Selected patient does not belong to this clinic.' });
      }

      const record = await MedicalRecord.create({
        ...req.body,
        clinic_id: clinicId,
        doctor_id: req.user.id,
        is_confidential: Boolean(req.body.is_confidential),
      });

      await AuditLog.log({
        user_id: req.user.id,
        action: 'EMR_CREATED',
        entity_type: 'medical_record',
        entity_id: record.id,
        details: { clinic_id: clinicId, patient_id: patient.id, record_id: record.id, doctor_id: req.user.id },
        ip_address: req.ip,
      });

      res.status(201).json({ message: 'Medical record created successfully', record });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const record = await MedicalRecord.findById(req.params.id);
      if (!record || record.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Medical record not found in this clinic.' });
      }

      // If requester is a patient, enforce ownership and confidential restriction
      if (req.user.role === 'patient') {
        const patient = await Patient.findById(record.patient_id);
        if (!patient || patient.user_id !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: You cannot access another patient medical record.' });
        }
        if (record.is_confidential) {
          return res.status(403).json({ message: 'Forbidden: This medical record is marked confidential by the consulting physician.' });
        }
      }

      // If requester is admin without clinic staff membership, restrict clinical data access
      if (req.user.role === 'admin' && !req.clinicRole) {
        return res.status(403).json({ message: 'Forbidden: Platform administrators cannot access confidential patient medical records directly.' });
      }

      res.json({ record });
    } catch (error) {
      next(error);
    }
  },

  async getByPatient(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const patient = await Patient.findById(req.params.patientId);
      if (!patient || patient.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Patient not found in this clinic.' });
      }

      // If patient role, ensure they are requesting their own records and omit confidential ones
      let includeConfidential = true;
      if (req.user.role === 'patient') {
        if (patient.user_id !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: You cannot access another patient medical records.' });
        }
        includeConfidential = false;
      }

      if (req.user.role === 'admin' && !req.clinicRole) {
        return res.status(403).json({ message: 'Forbidden: Platform administrators cannot access confidential patient medical records directly.' });
      }

      const result = await MedicalRecord.findByPatient(req.params.patientId, page, 20, includeConfidential);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getByClinic(req, res, next) {
    try {
      // Patients and standalone platform admins cannot query the full clinic medical records registry
      if (req.user.role === 'patient') {
        return res.status(403).json({ message: 'Forbidden: Patients cannot view the clinic-wide medical records registry.' });
      }

      if (req.user.role === 'admin' && !req.clinicRole) {
        return res.status(403).json({ message: 'Forbidden: Platform administrators cannot access confidential clinic medical records directly.' });
      }

      const page = parseInt(req.query.page, 10) || 1;
      const result = await MedicalRecord.findByClinic(req.params.clinicId, page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const clinicId = req.params.clinicId;
      const isDocValid = await validateDoctorClinicMembership(req.user.id, clinicId);
      if (!isDocValid) {
        return res.status(403).json({ message: 'Forbidden: You are not authorized as a practicing doctor in this clinic.' });
      }

      const existing = await MedicalRecord.findById(req.params.id);
      if (!existing || existing.clinic_id !== clinicId) {
        return res.status(404).json({ message: 'Medical record not found in this clinic.' });
      }

      const record = await MedicalRecord.update(req.params.id, req.body);

      await AuditLog.log({
        user_id: req.user.id,
        action: 'EMR_UPDATED',
        entity_type: 'medical_record',
        entity_id: req.params.id,
        details: { clinic_id: clinicId, patient_id: existing.patient_id, record_id: req.params.id, doctor_id: req.user.id },
        ip_address: req.ip,
      });

      res.json({ message: 'Medical record updated successfully', record });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = medicalRecordController;
