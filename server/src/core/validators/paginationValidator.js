const { query } = require('express-validator');
const validate = require('./validate');

module.exports = validate([
  query('page').optional().isInt({ min: 1 }).withMessage('Page number must be an integer greater than or equal to 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be an integer between 1 and 100').toInt(),
]);
