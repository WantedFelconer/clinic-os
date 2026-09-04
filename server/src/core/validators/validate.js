const { validationResult } = require('express-validator');

const validate = (validations) => async (req, res, next) => {
  for (const validation of validations) {
    await validation.run(req);
  }

  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const errorDetails = errors.array().map((err) => ({
    field: err.path || err.param,
    message: err.msg,
    value: err.value,
  }));

  return res.status(400).json({
    message: errorDetails[0]?.message || 'Validation failed',
    errors: errorDetails,
  });
};

module.exports = validate;
