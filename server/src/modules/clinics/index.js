/**
 * Public contract for the clinics bounded context.
 * Cross-domain consumers must import this file rather than module internals.
 */
module.exports = {
  Service: require('./models/Service'),
  Clinic: require('./models/Clinic'),
  Package: require('./models/Package'),
};

