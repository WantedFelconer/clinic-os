/**
 * Public contract for the emr bounded context.
 * Cross-domain consumers must import this file rather than module internals.
 */
module.exports = {
  MedicalReport: require('./models/MedicalReport'),
  MedicalRecord: require('./models/MedicalRecord'),
};

