const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { validateDoctorClinicMembership } = require('../middleware/rbac');

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

      if (!diagnosis || !diagnosis.trim()) {
        return res.status(400).json({ message: 'Diagnosis is required.' });
      }

      const prescription = await Prescription.create({
        patient_id,
        clinic_id: clinicId,
        doctor_id: req.user.id,
        appointment_id: appointment_id || null,
        diagnosis: diagnosis.trim(),
        notes: notes || null,
      });

      if (items && Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const medName = (item.medication_name || item.medicine_name || '').trim();
          if (medName) {
            await Prescription.addItem({
              ...item,
              medication_name: medName,
              prescription_id: prescription.id,
            });
          }
        }
      }

      const fullPrescription = await Prescription.getFullPrescription(prescription.id);

      await AuditLog.log({
        user_id: req.user.id,
        action: 'PRESCRIPTION_CREATED',
        entity_type: 'prescription',
        entity_id: prescription.id,
        details: { clinic_id: clinicId, patient_id, diagnosis: fullPrescription.diagnosis, items_count: fullPrescription.items?.length || 0 },
        ip_address: req.ip,
      });

      if (patient.user_id) {
        await Notification.create({
          user_id: patient.user_id,
          title: 'Digital Prescription Issued',
          message: `Dr. ${req.user.first_name} ${req.user.last_name} has issued a digital prescription for ${fullPrescription.diagnosis}.`,
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

      const item = await Prescription.addItem({ ...req.body, prescription_id: req.params.id });

      await AuditLog.log({
        user_id: req.user.id,
        action: 'PRESCRIPTION_UPDATED',
        entity_type: 'prescription',
        entity_id: req.params.id,
        details: { clinic_id: clinicId, action: 'add_item', medication_name: item.medication_name },
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

      await Prescription.removeItem(req.params.itemId);

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
