function operationalPatient(patient) {
  if (!patient) return null;
  const fields = ['id', 'user_id', 'clinic_id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'email', 'address', 'emergency_contact_name', 'emergency_contact_phone', 'is_active', 'created_at', 'updated_at'];
  return Object.fromEntries(fields.filter(key => patient[key] !== undefined).map(key => [key, patient[key]]));
}

module.exports = { operationalPatient };
