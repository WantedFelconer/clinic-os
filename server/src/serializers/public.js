function publicClinic(clinic) {
  if (!clinic) return null;
  const fields = [
    'id', 'name', 'slug', 'description', 'address', 'city', 'state', 'country', 'timezone',
    'postal_code', 'latitude', 'longitude', 'phone', 'email', 'website',
    'logo_url', 'banner_url', 'specializations', 'primary_doctor_id', 'doctor_first_name',
    'doctor_last_name', 'avg_rating', 'reviews_count',
  ];
  return Object.fromEntries(fields.filter((key) => clinic[key] !== undefined).map((key) => [key, clinic[key]]));
}

function publicDoctor(doctor) {
  if (!doctor) return null;
  const fields = [
    'doctor_id', 'user_id', 'first_name', 'last_name', 'avatar_url', 'qualifications',
    'specialization', 'experience_years', 'consultation_fee', 'bio', 'avg_rating',
    'reviews_count', 'clinics_list', 'clinics', 'available_clinic_ids',
  ];
  return Object.fromEntries(fields.filter((key) => doctor[key] !== undefined).map((key) => [key, doctor[key]]));
}

module.exports = { publicClinic, publicDoctor };
