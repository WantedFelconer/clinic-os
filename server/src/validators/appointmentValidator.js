const { body, param, query } = require('express-validator');
const validate = require('./validate');
const { isValidDateOnly } = require('../utils/dateTime');

const appointmentValidator = {
  list: validate([
    query('status').optional().isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
    query('date').optional().custom(value => isValidDateOnly(value)).withMessage('Date must be a real date in YYYY-MM-DD format'),
    query('doctorId').optional().matches(/^[A-Za-z0-9-]{1,36}$/).withMessage('Doctor ID is invalid'),
  ]),
  create: validate([
    body('appointment_date')
      .trim()
      .notEmpty()
      .withMessage('Appointment date is required')
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Appointment date must be in YYYY-MM-DD format'),
    body('start_time')
      .trim()
      .notEmpty()
      .withMessage('Start time is required')
      .matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
      .withMessage('Start time must be in HH:MM format'),
    body('end_time')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
      .withMessage('End time must be in HH:MM format'),
    body('type')
      .optional()
      .customSanitizer(val => typeof val === 'string' ? val.replace('_', '-') : val)
      .isIn(['in-person', 'video', 'phone'])
      .withMessage('Type must be in-person, video, or phone'),
    body('doctor_id')
      .trim()
      .notEmpty()
      .withMessage('Doctor selection is required')
      .matches(/^[A-Za-z0-9-]{1,36}$/)
      .withMessage('Doctor ID is invalid'),
    body('patient_id')
      .optional({ checkFalsy: true })
      .trim(),
    body('service_id')
      .optional({ checkFalsy: true })
      .trim(),
  ]),

  updateStatus: validate([
    body('status')
      .trim()
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
      .withMessage('Invalid appointment status'),
    body('cancellation_reason')
      .if(body('status').equals('cancelled'))
      .trim()
      .notEmpty()
      .withMessage('Cancellation reason is required when cancelling an appointment'),
  ]),

  reschedule: validate([
    body('appointment_date')
      .optional()
      .trim()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Appointment date must be in YYYY-MM-DD format'),
    body('start_time')
      .optional()
      .trim()
      .matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/)
      .withMessage('Start time must be in HH:MM format'),
  ]),
};

module.exports = appointmentValidator;
