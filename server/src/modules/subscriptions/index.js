/**
 * Public contract for the subscriptions bounded context.
 * Cross-domain consumers must import this file rather than module internals.
 */
module.exports = {
  Subscription: require('./models/Subscription'),
};

