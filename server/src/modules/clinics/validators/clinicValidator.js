const { body, query } = require('express-validator');
const validate = require('../../../core/validators/validate');
const { isValidTimeZone } = require('../../../core/utils/dateTime');

const clinicValidator = {
  search: validate([
    query('query').optional().trim().isLength({ max: 120 }),
    query('city').optional().trim().isLength({ max: 100 }),
    query('location').optional().trim().isLength({ max: 180 }),
    query('specialization').optional().trim().isLength({ max: 120 }),
  ]),
  availableSlots: validate([
    query('date').isISO8601({ strict: true }).withMessage('Date must use YYYY-MM-DD'),
    query('doctor_id').optional().matches(/^[A-Za-z0-9-]{1,36}$/),
    query('service_id').optional().matches(/^[A-Za-z0-9-]{1,36}$/),
  ]),
  create: validate([
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Clinic name is required')
      .isLength({ max: 255 })
      .withMessage('Clinic name cannot exceed 255 characters'),
    body('phone')
      .optional()
      .trim()
      .isLength({ max: 20 })
      .withMessage('Phone cannot exceed 20 characters'),
    body('email')
      .optional({ checkFalsy: true })
      .trim()
      .isEmail()
      .withMessage('Valid clinic email is required')
      .normalizeEmail(),
    body('city')
      .optional()
      .trim()
      .isLength({ max: 100 }),
    body('timezone').optional().custom(isValidTimeZone).withMessage('Timezone must be a valid IANA timezone name'),
  ]),

  update: validate([
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Clinic name cannot be empty')
      .isLength({ max: 255 }),
    body('phone')
      .optional()
      .trim()
      .isLength({ max: 20 }),
    body('email')
      .optional({ checkFalsy: true })
      .trim()
      .isEmail()
      .withMessage('Valid clinic email is required')
      .normalizeEmail(),
    body('timezone').optional().custom(isValidTimeZone).withMessage('Timezone must be a valid IANA timezone name'),
  ]),

  branding: validate([
    body('logo_url')
      .optional({ nullable: true })
      .custom((value) => value === null || (/^(https:\/\/|simulated:\/\/)[^\s]{1,2020}$/i.test(value)))
      .withMessage('Logo reference must be an HTTPS URL, simulated:// reference, or null'),
    body('banner_url')
      .optional({ nullable: true })
      .custom((value) => value === null || (/^(https:\/\/|simulated:\/\/)[^\s]{1,2020}$/i.test(value)))
      .withMessage('Banner reference must be an HTTPS URL, simulated:// reference, or null'),
    body().custom((value) => {
      const keys = Object.keys(value || {});
      return keys.length > 0 && keys.every((key) => ['logo_url', 'banner_url'].includes(key));
    }).withMessage('Only logo_url and banner_url may be changed through branding settings'),
  ]),

  addStaff: validate([
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid staff user email is required')
      .normalizeEmail(),
    body('role')
      .trim()
      .isIn(['doctor', 'assistant'])
      .withMessage('Staff role must be doctor or assistant'),
  ]),

  service: validate([
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Service name is required')
      .isLength({ max: 255 }),
    body('duration_minutes')
      .optional()
      .isInt({ min: 5, max: 480 })
      .withMessage('Duration must be between 5 and 480 minutes'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be greater than or equal to 0'),
  ]),

  package: validate([
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Package name is required')
      .isLength({ max: 255 }),
    body('sessions_count')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Sessions count must be between 1 and 100'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be greater than or equal to 0'),
  ]),
};

module.exports = clinicValidator;
