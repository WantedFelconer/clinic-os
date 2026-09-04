const { body, query } = require('express-validator');
const validate = require('./validate');

const doctorValidator = {
  search: validate([
    query('query').optional().trim().isLength({ max: 120 }),
    query('search').optional().trim().isLength({ max: 120 }),
    query('specialty').optional().trim().isLength({ max: 120 }),
    query('specialization').optional().trim().isLength({ max: 120 }),
    query('city').optional().trim().isLength({ max: 100 }),
    query('availability_date').optional().isISO8601({ strict: true }).withMessage('Availability date must use YYYY-MM-DD'),
  ]),
  updateProfile: validate([
    body('specialization')
      .optional()
      .trim()
      .isLength({ max: 255 }),
    body('qualifications')
      .optional()
      .trim(),
    body('experience_years')
      .optional()
      .isInt({ min: 0, max: 80 })
      .withMessage('Experience years must be between 0 and 80'),
    body('consultation_fee')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Consultation fee must be greater than or equal to 0'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 5000 }),
  ]),
};

module.exports = doctorValidator;
