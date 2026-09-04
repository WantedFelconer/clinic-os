const Review = require('../models/Review');
const { Patient } = require('../../patients');
const { Appointment } = require('../../appointments');
const { AuditLog } = require('../../admin');
const db = require('../../../core/config/database');

const reviewController = {
  async create(req, res, next) {
    try {
      const clinicId = req.params.clinicId;
      const { rating, comment, appointment_id } = req.body;

      if (!appointment_id) {
        return res.status(400).json({ message: 'Appointment ID is required to submit a verified review.' });
      }

      const numRating = parseInt(rating, 10);
      if (isNaN(numRating) || numRating < 1 || numRating > 5) {
        return res.status(400).json({ message: 'Rating must be an integer between 1 and 5 stars.' });
      }

      if (!req.user || req.user.role !== 'patient') {
        return res.status(403).json({ message: 'Only registered patients can submit reviews.' });
      }

      // Patient identity resolution: NEVER trust client-provided patient_id
      let patient = await Patient.findByUserId(req.user.id, clinicId);
      if (!patient) {
        patient = await Patient.create({
          user_id: req.user.id,
          clinic_id: clinicId,
          first_name: req.user.first_name,
          last_name: req.user.last_name,
          email: req.user.email,
          phone: req.user.phone,
        });
      }
      const patientId = patient.id;

      // Verify Appointment
      const appointment = await Appointment.findById(appointment_id);
      if (!appointment || appointment.clinic_id !== clinicId) {
        return res.status(404).json({ message: 'Appointment not found in this clinic.' });
      }

      const isOwner = (appointment.patient_user_id && appointment.patient_user_id === req.user.id) ||
                      (appointment.patient_id === patientId);
      if (!isOwner) {
        return res.status(403).json({ message: 'Forbidden: You cannot submit a review for another patient appointment.' });
      }

      if (appointment.status !== 'completed') {
        return res.status(400).json({
          message: `Reviews can only be submitted for completed consultations. Current status: '${appointment.status}'.`,
        });
      }

      // Check if review already exists for this appointment
      const existingReview = await Review.findByAppointment(appointment_id);
      if (existingReview) {
        return res.status(400).json({ message: 'A review has already been submitted for this consultation.' });
      }

      const doctorId = appointment.doctor_id || null;

      const review = await Review.create({
        clinic_id: clinicId,
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_id,
        rating: numRating,
        comment: comment || null,
      });

      await AuditLog.log({
        user_id: req.user.id,
        action: 'REVIEW_SUBMITTED',
        entity_type: 'review',
        entity_id: review.id,
        details: { clinic_id: clinicId, doctor_id: doctorId, rating: numRating, appointment_id },
        ip_address: req.ip,
      });

      res.status(201).json({ message: 'Review submitted for moderation', review });
    } catch (error) {
      if (error.code === '23505' || error.code === 'ER_DUP_ENTRY' || error.message?.includes('UNIQUE') || error.message?.includes('Duplicate entry')) {
        return res.status(400).json({ message: 'You have already reviewed this consultation.' });
      }
      next(error);
    }
  },

  async getByClinic(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const result = await Review.findByClinic(req.params.clinicId, page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async getPending(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const result = await Review.getPending(page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async approve(req, res, next) {
    try {
      const review = await Review.approve(req.params.id);
      if (!review) return res.status(404).json({ message: 'Review not found.' });

      await AuditLog.log({
        user_id: req.user.id,
        action: 'APPROVE_REVIEW',
        entity_type: 'review',
        entity_id: req.params.id,
        details: { rating: review.rating, clinic_id: review.clinic_id },
        ip_address: req.ip,
      });

      res.json({ message: 'Review approved successfully', review });
    } catch (error) {
      next(error);
    }
  },

  async remove(req, res, next) {
    try {
      await Review.remove(req.params.id);

      await AuditLog.log({
        user_id: req.user.id,
        action: 'REJECT_REVIEW',
        entity_type: 'review',
        entity_id: req.params.id,
        details: { removed: true },
        ip_address: req.ip,
      });

      res.json({ message: 'Review removed' });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = reviewController;
