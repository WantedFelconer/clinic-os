const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const db = require('../config/database');

const appointmentController = {
  async create(req, res, next) {
    try {
      const appointment = await Appointment.create({ ...req.body, clinic_id: req.params.clinicId });

      await Notification.create({
        user_id: req.body.doctor_id,
        title: 'New Appointment',
        message: `New appointment scheduled`,
        type: 'info',
        reference_type: 'appointment',
        reference_id: appointment.id,
      });

      res.status(201).json({ appointment });
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const appointment = await Appointment.findById(req.params.id);
      if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
      res.json({ appointment });
    } catch (error) {
      next(error);
    }
  },

  async getByClinic(req, res, next) {
    try {
      const { status, date, doctorId, page, limit } = req.query;
      const result = await Appointment.findByClinic(req.params.clinicId, {
        status,
        date,
        doctorId,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getMyAppointments(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const [patients] = await db.execute('SELECT id FROM patients WHERE user_id = ?', [req.user.id]);
      if (patients.length === 0) return res.json({ appointments: [], total: 0, page, limit: 20 });
      const result = await Appointment.findByPatient(patients[0].id, page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async updateStatus(req, res, next) {
    try {
      const { status, cancellation_reason } = req.body;
      const appointment = await Appointment.updateStatus(req.params.id, status, cancellation_reason);
      if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
      res.json({ appointment });
    } catch (error) {
      next(error);
    }
  },

  async reschedule(req, res, next) {
    try {
      const appointment = await Appointment.update(req.params.id, {
        appointment_date: req.body.appointment_date,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        notes: req.body.notes,
      });
      if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

      await Appointment.updateStatus(req.params.id, 'scheduled', null);

      res.json({ message: 'Appointment rescheduled', appointment });
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
