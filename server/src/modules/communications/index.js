/**
 * Public contract for the communications bounded context.
 * Cross-domain consumers must import this file rather than module internals.
 */
module.exports = {
  Notification: require('./models/Notification'),
};

