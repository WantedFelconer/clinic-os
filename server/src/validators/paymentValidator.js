const { body } = require('express-validator');
const validate = require('./validate');

const paymentValidator = {
  create: validate([
    body('patient_id')
      .trim()
      .notEmpty()
      .withMessage('Patient ID is required'),
    body('amount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Base amount must be a positive number greater than 0'),
    body('discount')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Discount must be a number greater than or equal to 0'),
    body('tax')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Tax must be a number greater than or equal to 0'),
    body('payment_method')
      .optional()
      .isIn(['cash', 'card', 'online', 'mobile_banking'])
      .withMessage('Payment method must be cash, card, online, or mobile_banking'),
    body('payment_status')
      .not().exists().withMessage('New invoices always start in pending status'),
  ]),

  updateStatus: validate([
    body('status')
      .trim()
      .notEmpty()
      .withMessage('Payment status is required')
      .isIn(['pending', 'completed', 'failed', 'refunded'])
      .withMessage('Invalid payment status'),
    body('transaction_id')
      .optional()
      .trim(),
  ]),
};

module.exports = paymentValidator;
