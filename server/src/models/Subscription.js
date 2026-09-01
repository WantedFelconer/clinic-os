const db = require('../config/database');
const { generateUUID } = require('../utils/helpers');

function normalizeFeatures(features) {
  if (!features) return {};
  if (typeof features === 'string') {
    try {
      features = JSON.parse(features);
    } catch {
      features = [features];
    }
  }
  if (Array.isArray(features)) {
    const obj = {};
    for (const f of features) {
      if (typeof f === 'string') {
        const key = f.toLowerCase().replace(/[\s-]+/g, '_');
        obj[key] = true;
        if (key.includes('analytic')) obj.analytics = true;
        if (key.includes('emr') || key.includes('medical_record')) obj.advanced_emr = true;
        if (key.includes('staff') || key.includes('assistant')) obj.staff_management = true;
        if (key.includes('report') || key.includes('financial') || key.includes('revenue')) obj.financial_reports = true;
        if (key.includes('prescription')) obj.digital_prescriptions = true;
      }
    }
    return obj;
  }
  if (typeof features === 'object') {
    return features;
  }
  return {};
}

function parsePlan(plan) {
  if (!plan) return null;
  const rawFeatures = plan.features;
  const structuredFeatures = normalizeFeatures(rawFeatures);

  let featureList = [];
  if (Array.isArray(rawFeatures)) {
    featureList = rawFeatures;
  } else if (typeof rawFeatures === 'string') {
    try {
      const parsed = JSON.parse(rawFeatures);
      featureList = Array.isArray(parsed) ? parsed : Object.keys(parsed).filter(k => parsed[k]);
    } catch {
      featureList = rawFeatures ? [rawFeatures] : [];
    }
  } else if (typeof rawFeatures === 'object' && rawFeatures !== null) {
    featureList = Object.keys(rawFeatures).filter(k => rawFeatures[k]);
  }

  return {
    ...plan,
    price: parseFloat(plan.price) || 0,
    max_doctors: plan.max_doctors !== null && plan.max_doctors !== undefined ? parseInt(plan.max_doctors, 10) : null,
    max_patients: plan.max_patients !== null && plan.max_patients !== undefined ? parseInt(plan.max_patients, 10) : null,
    max_staff: plan.max_staff !== null && plan.max_staff !== undefined ? parseInt(plan.max_staff, 10) : null,
    features: featureList,
    structured_features: structuredFeatures,
  };
}

const Subscription = {
  // Plans
  async createPlan({ name, description, price, billing_cycle, max_doctors, max_patients, max_staff, features, is_active = true }) {
    const id = generateUUID();
    const safeFeatures = Array.isArray(features) || typeof features === 'object'
      ? JSON.stringify(features)
      : (features ? JSON.stringify([features]) : '[]');

    await db.execute(
      `INSERT INTO subscription_plans (id, name, description, price, billing_cycle, max_doctors, max_patients, max_staff, features, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        name ?? null,
        description ?? null,
        price !== undefined ? parseFloat(price) : 0,
        billing_cycle ?? 'monthly',
        max_doctors !== undefined && max_doctors !== null ? parseInt(max_doctors, 10) : 1,
        max_patients !== undefined && max_patients !== null ? parseInt(max_patients, 10) : 100,
        max_staff !== undefined && max_staff !== null ? parseInt(max_staff, 10) : 2,
        safeFeatures,
        is_active ? 1 : 0,
      ]
    );
    return this.getPlanById(id);
  },

  async getPlans(activeOnly = true) {
    let query = 'SELECT * FROM subscription_plans';
    if (activeOnly) query += ' WHERE is_active = 1 OR is_active = true';
    query += ' ORDER BY price ASC';
    const [rows] = await db.execute(query);
    return rows.map(parsePlan);
  },

  async getPlanById(id) {
    const [rows] = await db.execute('SELECT * FROM subscription_plans WHERE id = ?', [id]);
    return parsePlan(rows[0]);
  },

  async updatePlan(id, fields) {
    const allowedFields = ['name', 'description', 'price', 'billing_cycle', 'max_doctors', 'max_patients', 'max_staff', 'features', 'is_active'];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        if (key === 'features') {
          values.push(Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : (value ? JSON.stringify([value]) : '[]'));
        } else if (key === 'is_active') {
          values.push(value ? 1 : 0);
        } else if (key === 'price') {
          values.push(parseFloat(value) || 0);
        } else if (['max_doctors', 'max_patients', 'max_staff'].includes(key)) {
          values.push(value !== null && value !== undefined ? parseInt(value, 10) : null);
        } else {
          values.push(value ?? null);
        }
      }
    }

    if (updates.length === 0) return this.getPlanById(id);
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.execute(
      `UPDATE subscription_plans SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return this.getPlanById(id);
  },

  async deletePlan(id) {
    // Non-destructive soft deactivation
    await db.execute('UPDATE subscription_plans SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    return true;
  },

  // Clinic subscriptions (Simulated)
  async subscribe(clinicId, planId, billingCycle = 'monthly') {
    const plan = await this.getPlanById(planId);
    if (!plan) throw new Error('Subscription plan not found.');

    let days = 30;
    if (billingCycle === 'quarterly') days = 90;
    else if (billingCycle === 'yearly') days = 365;

    // Deactivate previous active subscriptions for this clinic
    await db.execute(
      `UPDATE clinic_subscriptions SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE clinic_id = ? AND status = 'active'`,
      [clinicId]
    );

    const id = generateUUID();
    const startDate = new Date();
    const endDate = new Date(Date.now() + days * 86400000);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    await db.execute(
      `INSERT INTO clinic_subscriptions (id, clinic_id, plan_id, status, start_date, end_date, auto_renew)
       VALUES (?, ?, ?, 'active', ?, ?, 1)`,
      [id, clinicId, planId, startDateStr, endDateStr]
    );
    return this.getClinicSubscription(clinicId);
  },

  async getClinicSubscription(clinicId) {
    // Automatically expire active subscriptions that have passed their end_date
    await db.execute(
      `UPDATE clinic_subscriptions SET status = 'expired', updated_at = CURRENT_TIMESTAMP
       WHERE clinic_id = ? AND status = 'active' AND end_date < CURRENT_DATE`,
      [clinicId]
    );

    const [rows] = await db.execute(
      `SELECT cs.*, sp.name as plan_name, sp.price, sp.features, sp.billing_cycle, sp.max_doctors, sp.max_patients, sp.max_staff
       FROM clinic_subscriptions cs
       JOIN subscription_plans sp ON cs.plan_id = sp.id
       WHERE cs.clinic_id = ? AND cs.status = 'active' AND cs.end_date >= CURRENT_DATE
       ORDER BY cs.created_at DESC LIMIT 1`,
      [clinicId]
    );

    if (!rows[0]) {
      // Default Starter Free tier fallback
      const defaultFeatures = ['Basic Scheduling', 'EMR Notes', 'Digital Prescriptions'];
      return {
        clinic_id: clinicId,
        status: 'active',
        plan_name: 'Starter (Free Tier)',
        price: 0,
        max_doctors: 1,
        max_patients: 100,
        max_staff: 2,
        features: defaultFeatures,
        structured_features: normalizeFeatures(defaultFeatures),
        is_default: true,
      };
    }

    const sub = rows[0];
    const structured = normalizeFeatures(sub.features);
    let featureList = [];
    if (typeof sub.features === 'string') {
      try { featureList = JSON.parse(sub.features); } catch { featureList = []; }
    } else if (Array.isArray(sub.features)) {
      featureList = sub.features;
    }

    return {
      ...sub,
      price: parseFloat(sub.price) || 0,
      features: Array.isArray(featureList) ? featureList : Object.keys(structured),
      structured_features: structured,
    };
  },

  async cancelClinicSubscription(clinicId) {
    const [active] = await db.execute(
      "SELECT id FROM clinic_subscriptions WHERE clinic_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
      [clinicId]
    );
    if (!active[0]) return null;
    const subId = active[0].id;
    await db.execute(
      `UPDATE clinic_subscriptions SET status = 'cancelled', auto_renew = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [subId]
    );
    const [rows] = await db.execute('SELECT * FROM clinic_subscriptions WHERE id = ?', [subId]);
    return rows[0];
  },

  async checkClinicLimits(clinicId) {
    const sub = await this.getClinicSubscription(clinicId);
    const [patientCount] = await db.execute('SELECT COUNT(*) as count FROM patients WHERE clinic_id = ?', [clinicId]);
    const [staffCount] = await db.execute('SELECT COUNT(*) as count FROM clinic_staff WHERE clinic_id = ?', [clinicId]);
    const [doctorCount] = await db.execute("SELECT COUNT(*) as count FROM clinic_staff WHERE clinic_id = ? AND role = 'doctor'", [clinicId]);

    const currPatients = parseInt(patientCount[0]?.count || 0, 10);
    const currStaff = parseInt(staffCount[0]?.count || 0, 10);
    const currDoctors = parseInt(doctorCount[0]?.count || 0, 10) + 1; // +1 for owner doctor

    const maxPatients = sub.max_patients !== null && sub.max_patients !== undefined ? parseInt(sub.max_patients, 10) : null;
    const maxStaff = sub.max_staff !== null && sub.max_staff !== undefined ? parseInt(sub.max_staff, 10) : null;
    const maxDoctors = sub.max_doctors !== null && sub.max_doctors !== undefined ? parseInt(sub.max_doctors, 10) : null;

    const patientsAllowed = maxPatients === null || currPatients < maxPatients;
    const staffAllowed = maxStaff === null || currStaff < maxStaff;
    const doctorsAllowed = maxDoctors === null || currDoctors <= maxDoctors;

    return {
      plan_name: sub.plan_name,
      patients: { current: currPatients, max: maxPatients, allowed: patientsAllowed },
      staff: { current: currStaff, max: maxStaff, allowed: staffAllowed },
      doctors: { current: currDoctors, max: maxDoctors, allowed: doctorsAllowed },
    };
  },

  async hasFeature(clinicId, featureName) {
    const sub = await this.getClinicSubscription(clinicId);
    if (!sub) return false;
    const cleanKey = featureName.toLowerCase().replace(/[\s-]+/g, '_');
    const structured = sub.structured_features || normalizeFeatures(sub.features);

    if (structured[cleanKey]) return true;
    if (cleanKey === 'analytics' && (structured.analytics || structured.revenue_analytics || structured.advanced_analytics)) return true;
    if (cleanKey === 'advanced_emr' && (structured.advanced_emr || structured.emr_notes)) return true;
    if (cleanKey === 'staff_management' && structured.staff_management) return true;
    if (cleanKey === 'financial_reports' && (structured.financial_reports || structured.analytics)) return true;

    // Backward compatibility with raw string matching
    if (Array.isArray(sub.features)) {
      return sub.features.some(f =>
        typeof f === 'string' && (f.toLowerCase().includes(featureName.toLowerCase()) || f.toLowerCase().includes('unlimited'))
      );
    }

    return false;
  },

  async getAllByAdmin(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT cs.*, c.name as clinic_name, sp.name as plan_name, sp.price as plan_price, sp.billing_cycle as plan_billing_cycle
       FROM clinic_subscriptions cs
       JOIN clinics c ON cs.clinic_id = c.id
       JOIN subscription_plans sp ON cs.plan_id = sp.id
       ORDER BY cs.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [countRows] = await db.execute('SELECT COUNT(*) as count FROM clinic_subscriptions');
    return {
      subscriptions: rows.map(r => ({ ...r, plan_price: parseFloat(r.plan_price) || 0 })),
      total: parseInt(countRows[0]?.count || 0, 10),
      page,
      limit,
    };
  },

  async getSubscriptionAnalytics() {
    const [activeSubs] = await db.execute(
      `SELECT cs.*, sp.name as plan_name, sp.price, sp.billing_cycle
       FROM clinic_subscriptions cs
       JOIN subscription_plans sp ON cs.plan_id = sp.id
       WHERE cs.status = 'active'`
    );

    let mrr = 0;
    const planCounts = {};

    for (const sub of activeSubs) {
      const price = parseFloat(sub.price) || 0;
      const cycle = sub.billing_cycle || 'monthly';
      if (cycle === 'monthly') mrr += price;
      else if (cycle === 'quarterly') mrr += price / 3;
      else if (cycle === 'yearly') mrr += price / 12;
      else mrr += price;

      planCounts[sub.plan_name] = (planCounts[sub.plan_name] || 0) + 1;
    }

    const [totalCount] = await db.execute('SELECT COUNT(*) as count FROM clinic_subscriptions');
    const [plans] = await db.execute('SELECT * FROM subscription_plans WHERE is_active = 1');

    return {
      mrr: Math.round(mrr * 100) / 100,
      active_subscriptions: activeSubs.length,
      total_subscriptions: parseInt(totalCount[0]?.count || 0, 10),
      plan_distribution: Object.entries(planCounts).map(([name, count]) => ({ name, count })),
      available_plans: plans.map(parsePlan),
    };
  },

  async renewSubscription(clinicId) {
    const [expired] = await db.execute(
      `SELECT cs.*, sp.billing_cycle FROM clinic_subscriptions cs
       JOIN subscription_plans sp ON cs.plan_id = sp.id
       WHERE cs.clinic_id = ? AND cs.status = 'expired' AND cs.auto_renew = 1
       ORDER BY cs.end_date DESC LIMIT 1`,
      [clinicId]
    );
    if (!expired[0]) return null;

    return this.subscribe(clinicId, expired[0].plan_id, expired[0].billing_cycle || 'monthly');
  },
};

module.exports = Subscription;
