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
      .optional()
      .isArray()
      .withMessage('Prescription items must be an array'),
    body('items.*.medication_name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Medication name cannot be empty when items are provided'),
    body('items.*.dosage')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Dosage cannot be empty'),
    body('items.*.frequency')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Frequency cannot be empty'),
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
