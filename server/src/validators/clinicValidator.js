const { body } = require('express-validator');
const validate = require('./validate');

const clinicValidator = {
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
