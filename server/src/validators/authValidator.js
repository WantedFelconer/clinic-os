const { body } = require('express-validator');
const validate = require('./validate');

const authValidator = {
  register: validate([
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email address is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long'),
    body('role')
      .isIn(['patient', 'doctor'])
      .withMessage('Public registration is permitted for patient and doctor roles. Staff and assistants must be onboarded through clinic invitation.'),
    body('first_name')
      .trim()
      .notEmpty()
      .withMessage('First name is required')
      .isLength({ max: 100 })
      .withMessage('First name cannot exceed 100 characters'),
    body('last_name')
      .trim()
      .notEmpty()
      .withMessage('Last name is required')
      .isLength({ max: 100 })
      .withMessage('Last name cannot exceed 100 characters'),
    body('phone')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 20 })
      .withMessage('Phone number cannot exceed 20 characters'),
  ]),

  login: validate([
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email address is required')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ]),

  verifyOTP: validate([
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email address is required')
      .normalizeEmail(),
    body('otp')
      .trim()
      .isLength({ min: 6, max: 6 })
      .withMessage('Verification code must be exactly 6 digits')
      .isNumeric()
      .withMessage('Verification code must contain digits only'),
  ]),

  resendOTP: validate([
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email address is required')
      .normalizeEmail(),
  ]),

  forgotPassword: validate([
    body('email')
      .trim()
      .isEmail()
      .withMessage('Valid email address is required')
      .normalizeEmail(),
  ]),

  resetPassword: validate([
    body('token')
      .trim()
      .notEmpty()
      .withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long'),
  ]),

  updateProfile: validate([
    body('first_name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('First name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('First name cannot exceed 100 characters'),
    body('last_name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Last name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Last name cannot exceed 100 characters'),
    body('phone')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 20 })
      .withMessage('Phone cannot exceed 20 characters'),
    body('gender')
      .optional({ checkFalsy: true })
      .isIn(['male', 'female', 'other'])
      .withMessage('Gender must be male, female, or other'),
    body('date_of_birth')
      .optional({ checkFalsy: true })
      .isISO8601()
      .withMessage('Date of birth must be a valid ISO8601 date (YYYY-MM-DD)'),
    body('role')
      .not()
      .exists()
      .withMessage('Role cannot be modified through profile update'),
    body('is_verified')
      .not()
      .exists()
      .withMessage('Verification status cannot be modified through profile update'),
    body('is_active')
      .not()
      .exists()
      .withMessage('Account status cannot be modified through profile update'),
  ]),
};

module.exports = authValidator;
