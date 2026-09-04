/**
 * Public contract for the billing bounded context.
 * Cross-domain consumers must import this file rather than module internals.
 */
module.exports = {
  Payment: require('./models/Payment'),
};

