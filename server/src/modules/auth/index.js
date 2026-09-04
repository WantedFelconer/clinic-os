/**
 * Public contract for the auth bounded context.
 * Cross-domain consumers must import this file rather than module internals.
 */
module.exports = {
  User: require('./models/User'),
  DoctorProfile: require('./models/DoctorProfile'),
};

