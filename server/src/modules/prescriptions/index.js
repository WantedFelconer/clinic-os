/**
 * Public contract for the prescriptions bounded context.
 * Cross-domain consumers must import this file rather than module internals.
 */
module.exports = {
  Prescription: require('./models/Prescription'),
};

