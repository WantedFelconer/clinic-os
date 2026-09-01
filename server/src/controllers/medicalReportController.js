const MedicalReport = require('../models/MedicalReport');
const Patient = require('../models/Patient');
const AuditLog = require('../models/AuditLog');

const medicalReportController = {
  async create(req, res, next) {
    try {
      const clinicId = req.params.clinicId;
      const { report_type, file_url, description, report_date } = req.body;

      if (!report_type || !file_url) {
        return res.status(400).json({ message: 'Report type and file URL are required.' });
      }

      // Resolve patient identity
      let patientId = req.body.patient_id;
      if (req.user && req.user.role === 'patient') {
        const patient = await Patient.findByUserId(req.user.id, clinicId);
        if (!patient) {
          return res.status(403).json({ message: 'Patient profile not found in this clinic.' });
        }
        patientId = patient.id;
      }

      if (!patientId) {
        return res.status(400).json({ message: 'Patient selection is required.' });
      }

      const patient = await Patient.findById(patientId);
      if (!patient || patient.clinic_id !== clinicId) {
        return res.status(404).json({ message: 'Selected patient not found in this clinic.' });
      }

      const doctorId = req.user?.role === 'doctor' ? req.user.id : null;
      const report = await MedicalReport.create({
        patient_id: patientId,
        clinic_id: clinicId,
        doctor_id: doctorId,
        report_type,
        file_url,
        description: description || null,
        report_date: report_date || null,
      });

      await AuditLog.log({
        user_id: req.user.id,
        action: 'MEDICAL_REPORT_UPLOADED',
        entity_type: 'medical_report',
        entity_id: report.id,
        details: { clinic_id: clinicId, patient_id: patientId, report_type },
        ip_address: req.ip,
      });

      res.status(201).json({ message: 'Medical report uploaded successfully', report });
    } catch (error) {
      next(error);
    }
  },

  async getByPatient(req, res, next) {
    try {
      const clinicId = req.params.clinicId;
      const patient = await Patient.findById(req.params.patientId);
      if (!patient || patient.clinic_id !== clinicId) {
        return res.status(404).json({ message: 'Patient not found in this clinic.' });
      }

      if (req.user && req.user.role === 'patient') {
        if (patient.user_id !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: You cannot access another patient reports.' });
        }
      }

      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;
      const result = await MedicalReport.findByPatient(req.params.patientId, page, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getByClinic(req, res, next) {
    try {
      if (req.user && req.user.role === 'patient') {
        return res.status(403).json({ message: 'Forbidden: Patients cannot view clinic-wide medical reports registry.' });
      }

      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 50;
      const result = await MedicalReport.findByClinic(req.params.clinicId, page, limit);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const report = await MedicalReport.findById(req.params.id);
      if (!report || report.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Medical report not found in this clinic.' });
      }

      if (req.user && req.user.role === 'patient') {
        if (report.patient_user_id !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: You cannot access another patient report.' });
        }
      }

      res.json({ report });
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const report = await MedicalReport.findById(req.params.id);
      if (!report || report.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Medical report not found in this clinic.' });
      }

      if (req.user && req.user.role === 'patient') {
        if (report.patient_user_id !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: You cannot delete another patient report.' });
        }
      }

      await MedicalReport.delete(req.params.id);

      await AuditLog.log({
        user_id: req.user.id,
        action: 'MEDICAL_REPORT_DELETED',
        entity_type: 'medical_report',
        entity_id: req.params.id,
        details: { clinic_id: req.params.clinicId, report_id: req.params.id },
        ip_address: req.ip,
      });

      res.json({ message: 'Medical report deleted successfully' });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = medicalReportController;
