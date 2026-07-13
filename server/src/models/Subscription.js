const db = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const Subscription = {
  // Plans
  async createPlan({ name, description, price, billing_cycle, max_doctors, max_patients, max_staff, features }) {
    const id = generateUUID();
    await db.execute(
      `INSERT INTO subscription_plans (id, name, description, price, billing_cycle, max_doctors, max_patients, max_staff, features)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name ?? null, description ?? null, price ?? null, billing_cycle ?? null, max_doctors ?? null, max_patients ?? null, max_staff ?? null, JSON.stringify(features)]
    );
    return this.getPlanById(id);
  },

  async getPlans(activeOnly = true) {
    let query = 'SELECT * FROM subscription_plans';
    if (activeOnly) query += ' WHERE is_active = true';
    query += ' ORDER BY price ASC';
    const [rows] = await db.execute(query);
    return rows;
  },

  async getPlanById(id) {
    const [rows] = await db.execute('SELECT * FROM subscription_plans WHERE id = ?', [id]);
    return rows[0];
  },

  async updatePlan(id, fields) {
    const allowedFields = ['name', 'description', 'price', 'billing_cycle', 'max_doctors', 'max_patients', 'max_staff', 'features', 'is_active'];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(key === 'features' ? JSON.stringify(value) : (value ?? null));
      }
    }

    if (updates.length === 0) return null;
    updates.push('updated_at = NOW()');
    values.push(id);

    await db.execute(
      `UPDATE subscription_plans SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return this.getPlanById(id);
  },

  // Clinic subscriptions
  async subscribe(clinicId, planId, billingCycle) {
    const plan = await this.getPlanById(planId);
    if (!plan) throw new Error('Plan not found');

    let days;
    if (billingCycle === 'monthly') days = 30;
    else if (billingCycle === 'quarterly') days = 90;
    else days = 365;

    const id = generateUUID();
    await db.execute(
      `INSERT INTO clinic_subscriptions (id, clinic_id, plan_id, status, start_date, end_date)
       VALUES (?, ?, ?, 'active', CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL ? DAY))`,
      [id, clinicId, planId, days]
    );
    const [rows] = await db.execute('SELECT * FROM clinic_subscriptions WHERE id = ?', [id]);
    return rows[0];
  },

  async getClinicSubscription(clinicId) {
    const [rows] = await db.execute(
      `SELECT cs.*, sp.name as plan_name, sp.price, sp.features, sp.billing_cycle, sp.max_doctors, sp.max_patients, sp.max_staff
       FROM clinic_subscriptions cs JOIN subscription_plans sp ON cs.plan_id = sp.id
       WHERE cs.clinic_id = ? AND cs.status = 'active'
       ORDER BY cs.created_at DESC LIMIT 1`,
      [clinicId]
    );
    return rows[0];
  },

  async cancelClinicSubscription(clinicId) {
    const [active] = await db.execute(
      'SELECT id FROM clinic_subscriptions WHERE clinic_id = ? AND status = \'active\' ORDER BY created_at DESC LIMIT 1',
      [clinicId]
    );
    if (!active[0]) return null;
    const subId = active[0].id;
    await db.execute(
      `UPDATE clinic_subscriptions SET status = 'cancelled', auto_renew = false, updated_at = NOW() WHERE id = ?`,
      [subId]
    );
    const [rows] = await db.execute('SELECT * FROM clinic_subscriptions WHERE id = ?', [subId]);
    return rows[0];
  },

  async getAllByAdmin(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT cs.*, c.name as clinic_name, sp.name as plan_name
       FROM clinic_subscriptions cs
       JOIN clinics c ON cs.clinic_id = c.id
       JOIN subscription_plans sp ON cs.plan_id = sp.id
       ORDER BY cs.created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [countRows] = await db.execute('SELECT COUNT(*) as count FROM clinic_subscriptions');
    return { subscriptions: rows, total: parseInt(countRows[0].count, 10), page, limit };
  },
};

module.exports = Subscription;
