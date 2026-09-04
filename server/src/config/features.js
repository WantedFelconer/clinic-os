const FEATURE_DEFINITIONS = Object.freeze({
  staff_management: ['staff_management', 'staff management', 'team access'],
  analytics: ['analytics', 'advanced analytics', 'financial analytics'],
  advanced_emr: ['advanced_emr', 'advanced emr'],
  financial_reports: ['financial_reports', 'financial reports', 'revenue reports'],
  digital_prescriptions: ['digital_prescriptions', 'digital prescriptions'],
  packages: ['packages', 'service packages', 'consultation packages'],
  messaging: ['messaging', 'secure messaging'],
  custom_branding: ['custom_branding', 'custom branding', 'custom domain & branding'],
});

function canonicalFeature(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  for (const [canonical, aliases] of Object.entries(FEATURE_DEFINITIONS)) {
    if (aliases.some((alias) => alias.replace(/[\s-]+/g, '_') === normalized)) return canonical;
  }
  return normalized;
}

function normalizeFeatureSet(features) {
  if (!features) return {};
  let value = features;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { value = [value]; }
  }
  if (!Array.isArray(value) && typeof value === 'object') {
    value = Object.entries(value).filter(([, enabled]) => Boolean(enabled)).map(([name]) => name);
  }
  return Object.fromEntries((Array.isArray(value) ? value : []).map((feature) => [canonicalFeature(feature), true]));
}

module.exports = { FEATURE_DEFINITIONS, canonicalFeature, normalizeFeatureSet };
