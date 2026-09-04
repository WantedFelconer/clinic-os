const Subscription = require('../models/Subscription');
const { Clinic } = require('../../clinics');
const { AuditLog } = require('../../admin');

const subscriptionController = {
  // Plans
  async createPlan(req, res, next) {
    try {
      const plan = await Subscription.createPlan(req.body);
      res.status(201).json({ message: 'Plan created successfully', plan });
    } catch (error) {
      next(error);
    }
  },

  async getPlans(req, res, next) {
    try {
      const plans = await Subscription.getPlans(true);
      res.json({ plans });
    } catch (error) {
      next(error);
    }
  },

  async updatePlan(req, res, next) {
    try {
      const plan = await Subscription.updatePlan(req.params.id, req.body);
      if (!plan) return res.status(404).json({ message: 'Plan not found' });
      res.json({ message: 'Plan updated successfully', plan });
    } catch (error) {
      next(error);
    }
  },

  // Clinic subscriptions
  async subscribe(req, res, next) {
    try {
      const clinicId = req.params.clinicId || req.body.clinic_id;
      if (!clinicId || clinicId === '0') {
        return res.status(400).json({ message: 'Valid Clinic ID is required' });
      }
      if (!req.body.plan_id) {
        return res.status(400).json({ message: 'Plan ID is required' });
      }

      // Verify owner or admin
      if (req.user.role !== 'admin') {
        const clinic = await Clinic.findById(clinicId);
        if (!clinic || clinic.owner_id !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: Only the clinic owner can manage clinic subscriptions.' });
        }
      }

      const subscription = await Subscription.subscribe(clinicId, req.body.plan_id, req.body.billing_cycle || 'monthly');

      await AuditLog.log({
        user_id: req.user.id,
        action: 'SUBSCRIPTION_CREATED',
        entity_type: 'clinic_subscription',
        entity_id: subscription.id,
        details: { clinic_id: clinicId, plan_id: req.body.plan_id, plan_name: subscription.plan_name },
        ip_address: req.ip,
      });

      res.status(201).json({ message: 'Subscribed successfully', subscription });
    } catch (error) {
      next(error);
    }
  },

  async getMySubscription(req, res, next) {
    try {
      const clinicId = req.params.clinicId || req.query.clinic_id;
      if (!clinicId || clinicId === '0') {
        return res.status(400).json({ message: 'Valid Clinic ID is required' });
      }
      const subscription = await Subscription.getClinicSubscription(clinicId);
      const latest = subscription?.is_default ? await Subscription.getLatestClinicSubscription(clinicId) : null;
      res.json({ subscription: latest || subscription });
    } catch (error) {
      next(error);
    }
  },

  async getLimits(req, res, next) {
    try {
      const clinicId = req.params.clinicId || req.query.clinic_id;
      if (!clinicId || clinicId === '0') {
        return res.status(400).json({ message: 'Valid Clinic ID is required' });
      }
      const limits = await Subscription.checkClinicLimits(clinicId);
      res.json({ limits });
    } catch (error) {
      next(error);
    }
  },

  async cancelSubscription(req, res, next) {
    try {
      const clinicId = req.params.clinicId || req.body.clinic_id;
      if (!clinicId || clinicId === '0') {
        return res.status(400).json({ message: 'Valid Clinic ID is required' });
      }

      // Verify owner or admin
      if (req.user.role !== 'admin') {
        const clinic = await Clinic.findById(clinicId);
        if (!clinic || clinic.owner_id !== req.user.id) {
          return res.status(403).json({ message: 'Forbidden: Only the clinic owner can cancel clinic subscriptions.' });
        }
      }

      const subscription = await Subscription.cancelClinicSubscription(clinicId);
      if (!subscription) return res.status(404).json({ message: 'No active subscription found' });

      await AuditLog.log({
        user_id: req.user.id,
        action: 'SUBSCRIPTION_CANCELLED',
        entity_type: 'clinic_subscription',
        entity_id: subscription.id,
        details: { clinic_id: clinicId },
        ip_address: req.ip,
      });

      res.json({ message: 'Subscription cancelled successfully', subscription });
    } catch (error) {
      next(error);
    }
  },

  async renewSubscription(req, res, next) {
    try {
      const clinicId = req.params.clinicId;
      const clinic = await Clinic.findById(clinicId);
      if (!clinic || (req.user.role !== 'admin' && clinic.owner_id !== req.user.id)) {
        return res.status(403).json({ message: 'Only the clinic owner can renew this subscription.' });
      }
      const subscription = await Subscription.renewSubscription(clinicId);
      if (!subscription) return res.status(404).json({ message: 'No subscription is available to renew.' });
      await AuditLog.log({ user_id: req.user.id, action: 'SUBSCRIPTION_RENEWED', entity_type: 'clinic_subscription', entity_id: subscription.id, details: { clinic_id: clinicId, end_date: subscription.end_date }, ip_address: req.ip });
      res.json({ message: 'Subscription renewed successfully using simulated billing.', subscription });
    } catch (error) { next(error); }
  },

  async getAllSubscriptions(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const result = await Subscription.getAllByAdmin(page, 20);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = subscriptionController;
