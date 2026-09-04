const { body } = require('express-validator');
const validate = require('../../../core/validators/validate');

const reviewValidator = {
  create: validate([
    body('appointment_id')
      .trim()
      .notEmpty()
      .withMessage('Appointment ID is required to submit a verified review'),
    body('rating')
      .isInt({ min: 1, max: 5 })
      .withMessage('Rating must be an integer between 1 and 5'),
    body('comment')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Review comment cannot exceed 2000 characters'),
  ]),
};

module.exports = reviewValidator;
