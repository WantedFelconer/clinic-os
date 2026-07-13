const Subscription = require('../models/Subscription');

const subscriptionController = {
  // Plans
  async createPlan(req, res, next) {
    try {
      const plan = await Subscription.createPlan(req.body);
      res.status(201).json({ plan });
    } catch (error) {
      next(error);
    }
  },

  async getPlans(req, res, next) {
    try {
      const plans = await Subscription.getPlans();
      res.json({ plans });
    } catch (error) {
      next(error);
    }
  },

  async updatePlan(req, res, next) {
    try {
      const plan = await Subscription.updatePlan(req.params.id, req.body);
      if (!plan) return res.status(404).json({ message: 'Plan not found' });
      res.json({ plan });
    } catch (error) {
      next(error);
    }
  },

  // Clinic subscriptions
  async subscribe(req, res, next) {
    try {
      const subscription = await Subscription.subscribe(req.params.clinicId, req.body.plan_id, req.body.billing_cycle);
      res.status(201).json({ subscription });
    } catch (error) {
      next(error);
    }
  },

  async getMySubscription(req, res, next) {
    try {
      const subscription = await Subscription.getClinicSubscription(req.params.clinicId);
      if (!subscription) return res.status(404).json({ message: 'No active subscription' });
      res.json({ subscription });
    } catch (error) {
      next(error);
    }
  },

  async cancelSubscription(req, res, next) {
    try {
      const subscription = await Subscription.cancelClinicSubscription(req.params.clinicId);
      if (!subscription) return res.status(404).json({ message: 'No active subscription' });
      res.json({ message: 'Subscription cancelled', subscription });
    } catch (error) {
      next(error);
    }
  },

  async getAllSubscriptions(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const result = await Subscription.getAllByAdmin(page);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = subscriptionController;
