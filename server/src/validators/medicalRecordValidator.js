const { body } = require('express-validator');
const validate = require('./validate');

const medicalRecordValidator = {
  create: validate([
    body('patient_id')
      .trim()
      .notEmpty()
      .withMessage('Patient ID is required'),
    body('diagnosis')
      .trim()
      .notEmpty()
      .withMessage('Diagnosis is required'),
    body('symptoms')
      .optional()
      .trim(),
    body('treatment_plan')
      .optional()
      .trim(),
    body('notes')
      .optional()
      .trim(),
    body('follow_up_date')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Follow-up date must be in YYYY-MM-DD format'),
    body('is_confidential')
      .optional()
      .isBoolean()
      .withMessage('is_confidential must be a boolean'),
  ]),

  update: validate([
    body('diagnosis')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Diagnosis cannot be empty'),
    body('follow_up_date')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Follow-up date must be in YYYY-MM-DD format'),
    body('is_confidential')
      .optional()
      .isBoolean()
      .withMessage('is_confidential must be a boolean'),
  ]),
};

module.exports = medicalRecordValidator;
