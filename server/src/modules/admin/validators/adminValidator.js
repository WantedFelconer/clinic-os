const { body } = require('express-validator');
const validate = require('../../../core/validators/validate');

const userFields = [
  body('first_name').optional().trim().isLength({ min: 1, max: 100 }),
  body('last_name').optional().trim().isLength({ min: 1, max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  body('role').optional().isIn(['doctor', 'patient', 'assistant', 'admin']),
  body('is_verified').optional().isBoolean().toBoolean(),
  body('is_active').optional().isBoolean().toBoolean(),
  body('password').optional().isLength({ min: 6, max: 128 }),
  body('clinic_id').optional({ checkFalsy: true }).matches(/^[A-Za-z0-9-]{1,36}$/),
];

const clinicFields = [
  body('name').optional().trim().isLength({ min: 1, max: 255 }),
  body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 20 }),
  body('city').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('address').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
  body('timezone').optional({ checkFalsy: true }).trim().isLength({ max: 100 }),
  body('owner_id').optional().matches(/^[A-Za-z0-9-]{1,36}$/),
  body('is_active').optional().isBoolean().toBoolean(),
];

module.exports = {
  createUser: validate([
    body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 6, max: 128 }),
    body('first_name').trim().isLength({ min: 1, max: 100 }), body('last_name').trim().isLength({ min: 1, max: 100 }),
    body('role').isIn(['doctor', 'patient', 'assistant', 'admin']), ...userFields.slice(3),
  ]),
  updateUser: validate(userFields),
  createClinic: validate([body('name').trim().isLength({ min: 1, max: 255 }), body('owner_id').matches(/^[A-Za-z0-9-]{1,36}$/), ...clinicFields.slice(1)]),
  updateClinic: validate(clinicFields),
  assignSubscription: validate([
    body('clinic_id').matches(/^[A-Za-z0-9-]{1,36}$/), body('plan_id').matches(/^[A-Za-z0-9-]{1,36}$/),
    body('billing_cycle').optional().isIn(['monthly', 'quarterly', 'yearly']), body('duration_days').optional().isInt({ min: 1, max: 3650 }).toInt(),
    body('status').optional().isIn(['active', 'cancelled', 'expired']),
  ]),
  updateSubscription: validate([
    body('start_date').optional().isISO8601({ strict: true }), body('end_date').optional().isISO8601({ strict: true }),
    body('status').optional().isIn(['active', 'cancelled', 'expired']), body('auto_renew').optional().isBoolean().toBoolean(),
  ]),
};
