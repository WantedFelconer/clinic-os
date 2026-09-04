/**
 * Public contract for the admin bounded context.
 * Cross-domain consumers must import this file rather than module internals.
 */
module.exports = {
  AuditLog: require('./models/AuditLog'),
};

