const { body } = require('express-validator');
const validate = require('./validate');

const prescriptionValidator = {
  create: validate([
    body('patient_id')
      .trim()
      .notEmpty()
      .withMessage('Patient selection is required'),
    body('diagnosis')
      .trim()
      .notEmpty()
      .withMessage('Diagnosis is required'),
    body('notes')
      .optional()
      .trim(),
    body('items')
      .isArray({ min: 1, max: 50 })
      .withMessage('At least one and at most 50 prescription items are required'),
    body('items.*.medication_name')
      .trim()
      .notEmpty()
      .withMessage('Medication name is required')
      .isLength({ max: 255 }),
    body('items.*.dosage')
      .trim()
      .notEmpty()
      .withMessage('Dosage is required')
      .isLength({ max: 100 }),
    body('items.*.frequency')
      .trim()
      .notEmpty()
      .withMessage('Frequency is required')
      .isLength({ max: 100 }),
    body('appointment_id').optional({ checkFalsy: true }).matches(/^[A-Za-z0-9-]{1,36}$/),
  ]),

  addItem: validate([
    body('medication_name')
      .trim()
      .notEmpty()
      .withMessage('Medication name is required'),
    body('dosage')
      .trim()
      .notEmpty()
      .withMessage('Dosage is required'),
    body('frequency')
      .trim()
      .notEmpty()
      .withMessage('Frequency is required'),
    body('duration')
      .optional()
      .trim(),
    body('route')
      .optional()
      .trim(),
    body('instructions')
      .optional()
      .trim(),
  ]),
};

module.exports = prescriptionValidator;
