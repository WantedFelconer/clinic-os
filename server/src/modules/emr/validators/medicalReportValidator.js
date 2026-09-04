const { body } = require('express-validator');
const validate = require('../../../core/validators/validate');

const medicalReportValidator = {
  create: validate([
    body('patient_id')
      .trim()
      .notEmpty()
      .withMessage('Patient ID is required'),
    body('title').trim().notEmpty().withMessage('Report title is required').isLength({ max: 255 }),
    body('report_type')
      .trim()
      .notEmpty()
      .withMessage('Report type is required')
      .isLength({ max: 100 })
      .withMessage('Report type cannot exceed 100 characters'),
    body('file_url')
      .trim()
      .notEmpty()
      .withMessage('File reference is required')
      .custom((value) => /^(https:\/\/|simulated:\/\/)[^\s]{1,2020}$/i.test(value))
      .withMessage('File reference must use HTTPS or simulated://'),
    body('file_name').trim().notEmpty().withMessage('File name is required').isLength({ max: 255 }),
    body('description')
      .optional()
      .trim().isLength({ max: 2000 }),
    body('report_date')
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^\d{4}-\d{2}-\d{2}$/)
      .withMessage('Report date must be in YYYY-MM-DD format'),
  ]),
};

module.exports = medicalReportValidator;
