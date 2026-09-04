/**
 * Public contract for the patients bounded context.
 * Cross-domain consumers must import this file rather than module internals.
 */
module.exports = {
  Patient: require('./models/Patient'),
};

