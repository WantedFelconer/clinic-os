const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const Service = require('../models/Service');
const Clinic = require('../models/Clinic');
const Patient = require('../models/Patient');
const AuditLog = require('../models/AuditLog');
const db = require('../config/database');
const { calculateEndTime } = require('../utils/helpers');
const { validateDoctorClinicMembership } = require('../middleware/rbac');
const { ensureAppointmentModificationAllowed } = require('../utils/appointments');
const { isValidDateOnly, validateAppointmentClock } = require('../utils/dateTime');
const {
  sendAppointmentBookingNotification,
  sendAppointmentStatusNotification,
  sendAppointmentRescheduleNotification,
} = require('../utils/email');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function validateScheduleAndConflict({ clinic_id, doctor_id, service_id, appointment_date, start_time, end_time, excludeId, timezone = 'UTC' }) {
  if (!appointment_date || !start_time) {
    return { error: 'Appointment date and start time are required.' };
  }
  if (!isValidDateOnly(appointment_date)) return { error: 'Appointment date must be a real date in YYYY-MM-DD format.' };

  const [y, m, d] = appointment_date.split('-').map(Number);
  const apptDate = new Date(y, m - 1, d, 12, 0, 0);
  if (isNaN(apptDate.getTime())) {
    return { error: 'Invalid appointment date format (expected YYYY-MM-DD).' };
  }
  const dayOfWeek = apptDate.getDay();

  // Check clinic schedule for that day
  const schedule = await Appointment.findSchedule(clinic_id, dayOfWeek);
  if (!schedule || !Boolean(schedule.is_available)) {
    return { error: `Clinic is closed on ${DAYS[dayOfWeek]}s.` };
  }

  // Calculate end_time if not provided or identical to start_time
  let calculatedEndTime = end_time;
  if (!calculatedEndTime || calculatedEndTime === start_time) {
    let duration = 30;
    if (service_id) {
      const service = await Service.findById(service_id);
      if (service?.duration_minutes) duration = parseInt(service.duration_minutes, 10);
    }
    calculatedEndTime = calculateEndTime(start_time.substring(0, 5), duration);
  }

  // Normalize time strings for HH:MM comparison
  const normStart = start_time.substring(0, 5);
  const normEnd = calculatedEndTime.substring(0, 5);
  const schedStart = schedule.start_time.substring(0, 5);
  const schedEnd = schedule.end_time.substring(0, 5);

  const clockValidation = validateAppointmentClock(appointment_date, normStart, normEnd, timezone);
  if (!clockValidation.valid) return { error: clockValidation.error };

  if (normStart < schedStart || normEnd > schedEnd) {
    return {
      error: `Selected time (${normStart} – ${normEnd}) is outside clinic operating hours on ${DAYS[dayOfWeek]} (${schedStart} – ${schedEnd}).`,
    };
  }

  // Pre-check for conflicts
  const conflict = await Appointment.findConflicting({
    clinic_id,
    doctor_id,
    appointment_date,
    start_time: normStart,
    end_time: normEnd,
    excludeId,
  });

  if (conflict) {
    return {
      isConflict: true,
      error: `Schedule conflict: An appointment already exists from ${conflict.start_time.substring(0, 5)} to ${conflict.end_time.substring(0, 5)} on ${appointment_date}.`,
    };
  }

  return { valid: true, start_time: normStart, end_time: normEnd };
}

const appointmentController = {
  async create(req, res, next) {
    try {
      const clinicId = req.params.clinicId;
      const clinic = req.clinic?.id ? req.clinic : await Clinic.findById(clinicId);
      let doctorId = req.body.doctor_id;

      // 1. Doctor verification
      if (!doctorId) {
        return res.status(400).json({ message: 'Doctor selection is required.' });
      }
      const isDocValid = await validateDoctorClinicMembership(doctorId, clinicId);
      if (!isDocValid) {
        return res.status(400).json({ message: 'Selected doctor is not registered or active in this clinic.' });
      }

      // 2. Service verification
      if (req.body.service_id) {
        const service = await Service.findById(req.body.service_id);
        if (!service || service.clinic_id !== clinicId || !service.is_active) {
          return res.status(400).json({ message: 'Selected service is invalid or not offered by this clinic.' });
        }
      }

      // 3. Patient Identity Resolution (NEVER trust req.body.patient_id from patients)
      let patientId;
      if (req.user && req.user.role === 'patient') {
        let patient = await Patient.findByUserId(req.user.id, clinicId);
        if (!patient) {
          const [profileRows] = await db.execute('SELECT * FROM patient_profiles WHERE user_id = ?', [req.user.id]);
          const profile = profileRows[0] || {};
          patient = await Patient.create({
            ...profile,
            user_id: req.user.id,
            clinic_id: clinicId,
            first_name: req.user.first_name || profile.first_name,
            last_name: req.user.last_name || profile.last_name,
            email: req.user.email || profile.email,
            phone: req.user.phone || profile.phone,
          });
        }
        patientId = patient.id;
      } else {
        // Staff/Doctor booking for a patient
        patientId = req.body.patient_id;
        if (!patientId) {
          return res.status(400).json({ message: 'Patient selection is required.' });
        }
        const patient = await Patient.findById(patientId);
        if (!patient || patient.clinic_id !== clinicId || !patient.is_active) {
          return res.status(400).json({ message: 'Selected patient does not belong to this clinic.' });
        }
      }

      // 4. Schedule and operating hours validation
      const validation = await validateScheduleAndConflict({
        clinic_id: clinicId,
        doctor_id: doctorId,
        service_id: req.body.service_id,
        appointment_date: req.body.appointment_date,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        timezone: clinic?.timezone || 'UTC',
      });

      if (validation.isConflict) {
        return res.status(409).json({ message: validation.error });
      }

      if (validation.error) {
        return res.status(400).json({ message: validation.error });
      }

      let type = (req.body.type || 'in-person').replace('_', '-');
      if (!['in-person', 'video', 'phone'].includes(type)) {
        type = 'in-person';
      }

      // 5. Transaction-safe appointment creation with locking
      const appointment = await Appointment.createTransactional({
        ...req.body,
        patient_id: patientId,
        type,
        clinic_id: clinicId,
        doctor_id: doctorId,
        start_time: validation.start_time,
        end_time: validation.end_time,
      });

      // Audit log
      await AuditLog.log({
        user_id: req.user.id,
        action: 'APPOINTMENT_BOOKED',
        entity_type: 'appointment',
        entity_id: appointment.id,
        details: { clinic_id: clinicId, doctor_id: doctorId, patient_id: patientId, date: appointment.appointment_date, time: appointment.start_time },
        ip_address: req.ip,
      });

      // Notifications
      if (doctorId) {
        await Notification.create({
          user_id: doctorId,
          title: 'New Appointment Scheduled',
          message: `Appointment with ${appointment.patient_first_name} ${appointment.patient_last_name} on ${appointment.appointment_date} at ${appointment.start_time}.`,
          type: 'info',
          reference_type: 'appointment',
          reference_id: appointment.id,
        }).catch(err => console.warn('[Notification Warning]:', err.message));
      }

      if (appointment.patient_user_id) {
        await Notification.create({
          user_id: appointment.patient_user_id,
          title: 'Appointment Booked',
          message: `Your appointment is booked for ${appointment.appointment_date} at ${appointment.start_time}.`,
          type: 'info',
          reference_type: 'appointment',
          reference_id: appointment.id,
        }).catch(err => console.warn('[Notification Warning]:', err.message));
      }

      // Email notification
      const patientEmail = appointment.patient_email || (req.user?.role === 'patient' ? req.user.email : null);
      if (patientEmail) {
        const clinicInfo = await Clinic.findById(clinicId);
        sendAppointmentBookingNotification({
          to: patientEmail,
          patientName: `${appointment.patient_first_name || ''} ${appointment.patient_last_name || ''}`.trim(),
          clinicName: clinicInfo?.name || 'Clinic',
          doctorName: doctorId ? `${appointment.doctor_first_name || ''} ${appointment.doctor_last_name || ''}`.trim() : null,
          date: appointment.appointment_date,
          time: appointment.start_time,
        }).catch((err) => console.warn('[Email Warning] Booking email failed:', err.message));
      }

      res.status(201).json({ message: 'Appointment booked successfully', appointment });
    } catch (error) {
      if (error.isConflict) {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const appointment = await Appointment.findById(req.params.id);
      if (!appointment || appointment.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Appointment not found in this clinic' });
      }

      // Patient cross-access check
      if (req.user && req.user.role === 'patient') {
        if (appointment.patient_user_id !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: You cannot access another patient appointment' });
        }
      }

      res.json({ appointment });
    } catch (error) {
      next(error);
    }
  },

  async getByClinic(req, res, next) {
    try {
      // Patient cannot view entire clinic appointment registry
      if (req.user && req.user.role === 'patient') {
        return res.status(403).json({ message: 'Forbidden: Patients cannot view clinic appointment registry' });
      }

      const { status, date, doctorId, page, limit } = req.query;
      const result = await Appointment.findByClinic(req.params.clinicId, {
        status,
        date,
        doctorId,
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 50,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getMyAppointments(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const result = await Appointment.findByUserId(req.user.id, page, 50);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { status, cancellation_reason } = req.body;
      const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status '${status}'. Must be one of: ${validStatuses.join(', ')}` });
      }

      const existing = await Appointment.findById(req.params.id);
      if (!existing || existing.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Appointment not found in this clinic' });
      }

      // Patient validation: Patients can only cancel their own appointment
      if (req.user && req.user.role === 'patient') {
        if (existing.patient_user_id !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: You cannot modify another patient appointment' });
        }
        if (status !== 'cancelled') {
          return res.status(403).json({ message: 'Patients can only cancel their appointments' });
        }
      }

      if (status === 'cancelled') {
        const modification = ensureAppointmentModificationAllowed(existing);
        if (!modification.allowed) return res.status(modification.status).json({ message: modification.message });
      }

      // Forward-only state machine enforcement
      const allowedTransitions = {
        'scheduled': ['confirmed', 'cancelled', 'no_show'],
        'confirmed': ['in_progress', 'cancelled', 'no_show'],
        'in_progress': ['completed', 'cancelled'],
      };
      const allowed = allowedTransitions[existing.status] || [];
      if (!allowed.includes(status)) {
        return res.status(400).json({
          message: `Invalid transition: cannot change status from '${existing.status}' to '${status}'. Allowed transitions: ${allowed.join(', ')}.`,
        });
      }

      if (status === 'cancelled' && !cancellation_reason) {
        return res.status(400).json({ message: 'Cancellation reason is required when cancelling an appointment.' });
      }

      const appointment = await Appointment.updateStatus(req.params.id, status, cancellation_reason);

      await AuditLog.log({
        user_id: req.user.id,
        action: 'APPOINTMENT_STATUS_CHANGED',
        entity_type: 'appointment',
        entity_id: req.params.id,
        details: { old_status: existing.status, new_status: status, cancellation_reason },
        ip_address: req.ip,
      });

      if (appointment.doctor_id) {
        await Notification.create({
          user_id: appointment.doctor_id,
          title: `Appointment ${status.toUpperCase()}`,
          message: `Appointment for ${appointment.patient_first_name} ${appointment.patient_last_name} was marked as ${status}.`,
          type: status === 'cancelled' ? 'warning' : 'info',
          reference_type: 'appointment',
          reference_id: appointment.id,
        }).catch(err => console.warn('[Notification Warning]:', err.message));
      }

      if (appointment.patient_user_id) {
        await Notification.create({
          user_id: appointment.patient_user_id,
          title: `Appointment ${status.toUpperCase()}`,
          message: `Your appointment on ${appointment.appointment_date} is now ${status}.`,
          type: status === 'cancelled' ? 'warning' : 'info',
          reference_type: 'appointment',
          reference_id: appointment.id,
        }).catch(err => console.warn('[Notification Warning]:', err.message));
      }

      // Email notification on status update
      if (appointment.patient_email) {
        const clinicInfo = await Clinic.findById(req.params.clinicId);
        sendAppointmentStatusNotification({
          to: appointment.patient_email,
          patientName: `${appointment.patient_first_name || ''} ${appointment.patient_last_name || ''}`.trim(),
          clinicName: clinicInfo?.name || 'Clinic',
          status,
          date: appointment.appointment_date,
          reason: cancellation_reason || null,
        }).catch((err) => console.warn('[Email Warning] Status update email failed:', err.message));
      }

      res.json({ message: `Appointment status updated to ${status}`, appointment });
    } catch (error) {
      next(error);
    }
  },

  async reschedule(req, res, next) {
    try {
      const existing = await Appointment.findById(req.params.id);
      if (!existing || existing.clinic_id !== req.params.clinicId) {
        return res.status(404).json({ message: 'Appointment not found in this clinic' });
      }
      // Patient validation: Patients can only reschedule their own appointment
      if (req.user && req.user.role === 'patient') {
        if (existing.patient_user_id !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: You cannot reschedule another patient appointment' });
        }
      }

      const modification = ensureAppointmentModificationAllowed(existing);
      if (!modification.allowed) return res.status(modification.status).json({ message: modification.message });

      const { appointment_date, start_time, end_time, notes } = req.body;
      const targetStartTime = start_time || existing.start_time;
      let targetEndTime = end_time;
      if (!targetEndTime) {
        let duration = 30;
        if (existing.service_id) {
          const service = await Service.findById(existing.service_id);
          if (service?.duration_minutes) duration = parseInt(service.duration_minutes, 10);
        }
        targetEndTime = calculateEndTime(targetStartTime.substring(0, 5), duration);
      }

      const validation = await validateScheduleAndConflict({
        clinic_id: existing.clinic_id,
        doctor_id: existing.doctor_id,
        service_id: existing.service_id,
        appointment_date: appointment_date || existing.appointment_date,
        start_time: targetStartTime,
        end_time: targetEndTime,
        excludeId: existing.id,
        timezone: req.clinic?.timezone || 'UTC',
      });

      if (validation.isConflict) {
        return res.status(409).json({ message: validation.error });
      }

      if (validation.error) {
        return res.status(400).json({ message: validation.error });
      }

      await Appointment.update(req.params.id, {
        appointment_date: appointment_date || existing.appointment_date,
        start_time: validation.start_time,
        end_time: validation.end_time,
        notes: notes !== undefined ? notes : existing.notes,
      });

      await Appointment.updateStatus(req.params.id, 'scheduled', null);
      const updated = await Appointment.findById(req.params.id);

      await AuditLog.log({
        user_id: req.user.id,
        action: 'APPOINTMENT_RESCHEDULED',
        entity_type: 'appointment',
        entity_id: req.params.id,
        details: { old_date: existing.appointment_date, new_date: updated.appointment_date, old_time: existing.start_time, new_time: updated.start_time },
        ip_address: req.ip,
      });

      if (existing.doctor_id) {
        await Notification.create({
          user_id: existing.doctor_id,
          title: 'Appointment Rescheduled',
          message: `Appointment for ${existing.patient_first_name} ${existing.patient_last_name} rescheduled to ${updated.appointment_date} at ${updated.start_time}.`,
          type: 'info',
          reference_type: 'appointment',
          reference_id: updated.id,
        }).catch(err => console.warn('[Notification Warning]:', err.message));
      }

      if (updated.patient_user_id) {
        await Notification.create({
          user_id: updated.patient_user_id,
          title: 'Appointment Rescheduled',
          message: `Your appointment is rescheduled to ${updated.appointment_date} at ${updated.start_time}.`,
          type: 'info',
          reference_type: 'appointment',
          reference_id: updated.id,
        }).catch(err => console.warn('[Notification Warning]:', err.message));
      }

      if (updated.patient_email) {
        const clinicInfo = await Clinic.findById(req.params.clinicId);
        sendAppointmentRescheduleNotification({
          to: updated.patient_email,
          patientName: `${updated.patient_first_name || ''} ${updated.patient_last_name || ''}`.trim(),
          clinicName: clinicInfo?.name || 'Clinic',
          newDate: updated.appointment_date,
          newTime: updated.start_time,
        }).catch((err) => console.warn('[Email Warning] Reschedule email failed:', err.message));
      }

      res.json({ message: 'Appointment rescheduled successfully', appointment: updated });
    } catch (error) {
      next(error);
    }
  },

  async getUpcoming(req, res, next) {
    try {
      const appointments = await Appointment.getUpcoming(req.params.clinicId);
      res.json({ appointments });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = appointmentController;
