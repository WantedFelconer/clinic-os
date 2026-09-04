const SENSITIVE_KEYS = new Set([
  'allergies', 'cancellation_reason', 'chronic_conditions', 'clinical_notes', 'description', 'diagnosis', 'medical_history',
  'medication_name', 'medications', 'notes', 'password', 'reset_password_token',
  'symptoms', 'treatment', 'treatment_plan', 'verification_otp',
]);

function sanitizeAuditDetails(value) {
  if (Array.isArray(value)) return value.map(sanitizeAuditDetails);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !SENSITIVE_KEYS.has(key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()))
      .map(([key, child]) => [key, sanitizeAuditDetails(child)])
  );
}

module.exports = { sanitizeAuditDetails, SENSITIVE_KEYS };
