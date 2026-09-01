const { body } = require('express-validator');
const validate = require('./validate');

const medicalReportValidator = {
  create: validate([
    body('patient_id')
      .trim()
      .notEmpty()
      .withMessage('Patient ID is required'),
    body('report_type')
      .trim()
      .notEmpty()
      .withMessage('Report type is required')
      .isLength({ max: 100 })
      .withMessage('Report type cannot exceed 100 characters'),
    body('file_url')
      .trim()
      .notEmpty()
      .withMessage('File URL is required'),
    body('description')
      .optional()
      .trim(),
    body('report_date')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Report date must be in YYYY-MM-DD format'),
  ]),
};

module.exports = medicalReportValidator;
