/**
 * Public contract for the appointments bounded context.
 * Cross-domain consumers must import this file rather than module internals.
 */
module.exports = {
  Appointment: require('./models/Appointment'),
};

