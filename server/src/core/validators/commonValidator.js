const { body, param, query } = require('express-validator');
const validate = require('./validate');
const { validateDateOfBirth } = require('../utils/dateTime');

const id = (name) => param(name).matches(/^[A-Za-z0-9-]{1,36}$/).withMessage(`${name} is invalid`);

module.exports = {
  id: (name = 'id') => validate([id(name)]),
  message: validate([
    body('receiver_id').matches(/^[A-Za-z0-9-]{1,36}$/),
    body('sender_id').optional().matches(/^[A-Za-z0-9-]{1,36}$/),
    body('subject').optional().trim().isLength({ max: 255 }),
    body('message').optional().trim().isLength({ min: 1, max: 5000 }),
    body('content').optional().trim().isLength({ min: 1, max: 5000 }),
    body().custom(value => Boolean(value.message || value.content)).withMessage('Message content is required'),
  ]),
  patient: validate([
    body('first_name').optional().trim().isLength({ min: 1, max: 100 }),
    body('last_name').optional().trim().isLength({ min: 1, max: 100 }),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
    body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('date_of_birth').optional({ checkFalsy: true }).custom((value) => {
      const result = validateDateOfBirth(value);
      if (!result.valid) throw new Error(result.error);
      return true;
    }),
    body('gender').optional({ checkFalsy: true }).isIn(['male', 'female', 'other']),
    body('blood_group').optional({ checkFalsy: true }).isLength({ max: 5 }),
    body('address').optional({ checkFalsy: true }).isLength({ max: 2000 }),
    body('allergies').optional({ checkFalsy: true }).isLength({ max: 5000 }),
    body('chronic_conditions').optional({ checkFalsy: true }).isLength({ max: 5000 }),
    body('emergency_contact_name').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
    body('emergency_contact_phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  ]),
  patientCreate: validate([
    body('first_name').trim().isLength({ min: 1, max: 100 }).withMessage('Patient first name is required'),
    body('last_name').trim().isLength({ min: 1, max: 100 }).withMessage('Patient last name is required'),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
    body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('date_of_birth').optional({ checkFalsy: true }).custom((value) => {
      const result = validateDateOfBirth(value);
      if (!result.valid) throw new Error(result.error);
      return true;
    }),
    body('gender').optional({ checkFalsy: true }).isIn(['male', 'female', 'other']),
    body('blood_group').optional({ checkFalsy: true }).isLength({ max: 5 }),
    body('address').optional({ checkFalsy: true }).isLength({ max: 2000 }),
    body('allergies').optional({ checkFalsy: true }).isLength({ max: 5000 }),
    body('chronic_conditions').optional({ checkFalsy: true }).isLength({ max: 5000 }),
    body('emergency_contact_name').optional({ checkFalsy: true }).trim().isLength({ max: 255 }),
    body('emergency_contact_phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
    body('user_id').optional({ checkFalsy: true }).matches(/^[A-Za-z0-9-]{1,36}$/),
  ]),
  schedules: validate([
    body('schedules').isArray({ min: 1, max: 7 }),
    body('schedules.*.day_of_week').isInt({ min: 0, max: 6 }),
    body('schedules.*.start_time').matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
    body('schedules.*.end_time').matches(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/),
    body('schedules.*.is_available').isBoolean(),
    body('schedules').custom(items => new Set(items.map(item => item.day_of_week)).size === items.length).withMessage('Schedule days must be unique'),
  ]),
  statusBoolean: validate([body('is_active').isBoolean().toBoolean()]),
  plan: validate([
    body('name').optional().trim().isLength({ min: 1, max: 100 }),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('price').optional().isFloat({ min: 0 }),
    body('billing_cycle').optional().isIn(['monthly', 'quarterly', 'yearly']),
    body('max_doctors').optional({ nullable: true }).isInt({ min: 1, max: 10000 }),
    body('max_patients').optional({ nullable: true }).isInt({ min: 1, max: 10000000 }),
    body('max_staff').optional({ nullable: true }).isInt({ min: 0, max: 100000 }),
    body('features').optional().isArray({ max: 100 }),
    body('features.*').optional().isString().isLength({ min: 1, max: 100 }),
  ]),
};
