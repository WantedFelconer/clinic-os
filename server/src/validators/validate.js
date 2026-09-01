const { validationResult } = require('express-validator');

/**
 * Middleware factory that takes an array of express-validator checks
 * and executes them in sequence, returning a 400 Bad Request on error.
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    for (const validation of validations) {
      const result = await validation.run(req);
    }

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

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
};

module.exports = validate;
