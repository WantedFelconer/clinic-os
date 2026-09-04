const Prescription = require('../models/Prescription');
const { Patient } = require('../../patients');
const { Notification } = require('../../communications');
const { AuditLog } = require('../../admin');
const { validateDoctorClinicMembership } = require('../../../core/middleware/rbac');
const { createTextPdf } = require('../../../core/utils/pdf');
const { Appointment } = require('../../appointments');

const prescriptionController = {
  async create(req, res, next) {
    try {
      const clinicId = req.params.clinicId;
      const { patient_id, appointment_id, diagnosis, notes, items } = req.body;

      // Verify doctor belongs to clinic
      const isDocValid = await validateDoctorClinicMembership(req.user.id, clinicId);
      if (!isDocValid) {
        return res.status(403).json({ message: 'Forbidden: You are not authorized as a prescribing doctor in this clinic.' });
      }

      if (!patient_id) {
        return res.status(400).json({ message: 'Patient selection is required.' });
      }

      const patient = await Patient.findById(patient_id);
      if (!patient || patient.clinic_id !== clinicId) {
        return res.status(400).json({ message: 'Selected patient does not exist in this clinic.' });
      }

      if (appointment_id) {
        const appointment = await Appointment.findById(appointment_id);
        if (!appointment || appointment.clinic_id !== clinicId || appointment.patient_id !== patient_id || appointment.doctor_id !== req.user.id) {
          return res.status(400).json({ message: 'Selected appointment does not match this clinic, patient, and doctor.' });
        }
      }

      if (!diagnosis || !diagnosis.trim()) {
        return res.status(400).json({ message: 'Diagnosis is required.' });
      }

      const fullPrescription = await Prescription.createWithItems({
        patient_id,
        clinic_id: clinicId,
        doctor_id: req.user.id,
        appointment_id: appointment_id || null,
        diagnosis: diagnosis.trim(),
        notes: notes || null,
        items,
      });

      await AuditLog.log({
        user_id: req.user.id,
        action: 'PRESCRIPTION_CREATED',
        entity_type: 'prescription',
        entity_id: fullPrescription.id,
        details: { clinic_id: clinicId, patient_id, prescription_id: fullPrescription.id, doctor_id: req.user.id, items_count: fullPrescription.items?.length || 0 },
        ip_address: req.ip,
      });

      if (patient.user_id) {
        await Notification.create({
          user_id: patient.user_id,
          title: 'Digital Prescription Issued',
          message: `Dr. ${req.user.first_name} ${req.user.last_name} has issued a digital prescription. Sign in to ClinicOS to view it securely.`,
          type: 'info',
          reference_type: 'prescription',
          reference_id: fullPrescription.id,
        }).catch((err) => console.warn('[Notification Warning]:', err.message));
      }

      res.status(201).json({ message: 'Prescription created successfully', prescription: fullPrescription });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const prescription = await Prescription.getFullPrescription(req.params.id);
      if (!prescription || prescription.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Prescription not found in this clinic.' });
      }

      if (req.user && req.user.role === 'patient') {
        const patient = await Patient.findById(prescription.patient_id);
        if (!patient || patient.user_id !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: You cannot access another patient prescription.' });
        }
      }

      if (req.user && req.user.role === 'admin' && !req.clinicRole) {
        return res.status(403).json({ message: 'Forbidden: Platform administrators cannot access confidential patient prescriptions directly.' });
      }

      res.json({ prescription });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const clinicId = req.params.clinicId;
      const existing = await Prescription.findById(req.params.id);
      if (!existing || existing.clinic_id !== clinicId) {
        return res.status(404).json({ message: 'Prescription not found in this clinic.' });
      }
      if (existing.doctor_id !== req.user.id || !(await validateDoctorClinicMembership(req.user.id, clinicId))) {
        return res.status(403).json({ message: 'Only the prescribing doctor may edit this prescription.' });
      }
      if (req.body.patient_id !== existing.patient_id) {
        return res.status(400).json({ message: 'The prescription patient cannot be changed.' });
      }
      const prescription = await Prescription.updateWithItems(req.params.id, {
        diagnosis: req.body.diagnosis.trim(),
        notes: req.body.notes || null,
        items: req.body.items,
      });
      await AuditLog.log({
        user_id: req.user.id,
        action: 'PRESCRIPTION_UPDATED',
        entity_type: 'prescription',
        entity_id: req.params.id,
        details: { clinic_id: clinicId, patient_id: existing.patient_id, prescription_id: req.params.id, items_count: prescription.items.length },
        ip_address: req.ip,
      });
      res.json({ message: 'Prescription updated successfully', prescription });
    } catch (error) {
      next(error);
    }
  },

  async downloadPdf(req, res, next) {
    try {
      const prescription = await Prescription.getFullPrescription(req.params.id);
      if (!prescription || prescription.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Prescription not found in this clinic.' });
      }
      if (req.user.role === 'patient') {
        const patient = await Patient.findById(prescription.patient_id);
        if (!patient || patient.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden: You cannot download another patient prescription.' });
      }
      const lines = [
        `Clinic: ${prescription.clinic_name || ''}`,
        `Contact: ${[prescription.clinic_phone, prescription.clinic_email, prescription.clinic_address].filter(Boolean).join(' | ')}`,
        `Doctor: Dr. ${prescription.doctor_first_name || ''} ${prescription.doctor_last_name || ''}`,
        `Qualifications: ${prescription.doctor_qualifications || 'Not provided'}`,
        `Patient: ${prescription.patient_first_name || ''} ${prescription.patient_last_name || ''}`,
        `Prescription date: ${String(prescription.created_at || '').slice(0, 10)}`,
        `Prescription ID: ${prescription.id}`,
        `Diagnosis: ${prescription.diagnosis || ''}`,
        '', 'Medications',
        ...(prescription.items || []).map((item, index) => `${index + 1}. ${item.medication_name} | Dosage: ${item.dosage} | Frequency: ${item.frequency} | Duration: ${item.duration || '-'} | Route: ${item.route || '-'} | Instructions: ${item.instructions || '-'}`),
        '', `Doctor notes: ${prescription.notes || '-'}`,
      ];
      const pdf = createTextPdf(lines, 'ClinicOS Digital Prescription');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="prescription-${prescription.id}.pdf"`);
      res.setHeader('Cache-Control', 'private, no-store');
      res.send(pdf);
    } catch (error) { next(error); }
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
          return res.status(403).json({ message: "Forbidden: You cannot access another patient's prescriptions." });
        }
      }

      if (req.user && req.user.role === 'admin' && !req.clinicRole) {
        return res.status(403).json({ message: 'Forbidden: Platform administrators cannot access confidential patient prescriptions directly.' });
      }

      const page = parseInt(req.query.page, 10) || 1;
      const result = await Prescription.findByPatient(req.params.patientId, page);
      for (const rx of result.prescriptions) {
        rx.items = await Prescription.getItems(rx.id);
      }
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getByClinic(req, res, next) {
    try {
      if (req.user && req.user.role === 'patient') {
        return res.status(403).json({ message: 'Forbidden: Patients cannot view clinic-wide prescription registry.' });
      }

      if (req.user && req.user.role === 'admin' && !req.clinicRole) {
        return res.status(403).json({ message: 'Forbidden: Platform administrators cannot access clinic prescription registry directly.' });
      }

      const page = parseInt(req.query.page, 10) || 1;
      const result = await Prescription.findByClinic(req.params.clinicId, page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async addItem(req, res, next) {
    try {
      const clinicId = req.params.clinicId;
      const isDocValid = await validateDoctorClinicMembership(req.user.id, clinicId);
      if (!isDocValid) {
        return res.status(403).json({ message: 'Forbidden: You are not authorized as a doctor in this clinic.' });
      }

      const existing = await Prescription.findById(req.params.id);
      if (!existing || existing.clinic_id !== clinicId) {
        return res.status(404).json({ message: 'Prescription not found in this clinic.' });
      }
      if (existing.doctor_id !== req.user.id) return res.status(403).json({ message: 'Only the prescribing doctor may edit this prescription.' });

      const item = await Prescription.addItem({ ...req.body, prescription_id: req.params.id });

      await AuditLog.log({
        user_id: req.user.id,
        action: 'PRESCRIPTION_UPDATED',
        entity_type: 'prescription',
        entity_id: req.params.id,
        details: { clinic_id: clinicId, action: 'add_item', item_id: item.id },
        ip_address: req.ip,
      });

      res.status(201).json({ item });
    } catch (error) {
      next(error);
    }
  },

  async removeItem(req, res, next) {
    try {
      const clinicId = req.params.clinicId;
      const isDocValid = await validateDoctorClinicMembership(req.user.id, clinicId);
      if (!isDocValid) {
        return res.status(403).json({ message: 'Forbidden: You are not authorized as a doctor in this clinic.' });
      }

      const existing = await Prescription.findById(req.params.id);
      if (!existing || existing.clinic_id !== clinicId) {
        return res.status(404).json({ message: 'Prescription not found in this clinic.' });
      }
      if (existing.doctor_id !== req.user.id) return res.status(403).json({ message: 'Only the prescribing doctor may edit this prescription.' });

      const removed = await Prescription.removeItem(req.params.itemId, req.params.id);
      if (!removed) return res.status(404).json({ message: 'Prescription item not found.' });

      await AuditLog.log({
        user_id: req.user.id,
        action: 'PRESCRIPTION_UPDATED',
        entity_type: 'prescription',
        entity_id: req.params.id,
        details: { clinic_id: clinicId, action: 'remove_item', item_id: req.params.itemId },
        ip_address: req.ip,
      });

      res.json({ message: 'Item removed from prescription' });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = prescriptionController;
