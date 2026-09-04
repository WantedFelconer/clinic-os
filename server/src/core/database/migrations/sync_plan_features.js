const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../.env') });
const db = require('../database');

const requiredFeatures = {
  'plan-starter': ['Secure Messaging'],
  'plan-pro': ['Service Packages', 'Secure Messaging'],
  'plan-enterprise': ['Service Packages', 'Secure Messaging'],
};

function parseFeatures(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.keys(value).filter((key) => value[key]);
  try { return JSON.parse(value || '[]'); } catch { return value ? [String(value)] : []; }
}

async function syncPlanFeatures() {
  for (const [id, additions] of Object.entries(requiredFeatures)) {
    const [rows] = await db.execute('SELECT features FROM subscription_plans WHERE id = ?', [id]);
    if (!rows[0]) continue;
    const features = parseFeatures(rows[0].features);
    const normalized = new Set(features.map((feature) => String(feature).toLowerCase()));
    for (const feature of additions) if (!normalized.has(feature.toLowerCase())) features.push(feature);
    await db.execute('UPDATE subscription_plans SET features = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [JSON.stringify(features), id]);
  }
  const [verifiedRows] = await db.execute("SELECT id, features FROM subscription_plans WHERE id IN ('plan-starter', 'plan-pro', 'plan-enterprise')");
  for (const [id, additions] of Object.entries(requiredFeatures)) {
    const row = verifiedRows.find((plan) => plan.id === id);
    const features = row ? parseFeatures(row.features).map((feature) => String(feature).toLowerCase()) : [];
    if (!row || additions.some((feature) => !features.includes(feature.toLowerCase()))) throw new Error(`Feature synchronization verification failed for ${id}.`);
  }
}

if (require.main === module) {
  syncPlanFeatures().then(() => { console.log('Subscription plan features synchronized.'); return db.pool.end(); })
    .catch(async (error) => { console.error(error); await db.pool.end(); process.exitCode = 1; });
}

module.exports = syncPlanFeatures;
