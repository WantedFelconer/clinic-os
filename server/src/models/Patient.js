const db = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const sanitizeField = (val) => (val !== undefined && val !== null && String(val).trim() !== '' ? String(val).trim() : null);

const Patient = {
  async create({ user_id, clinic_id, first_name, last_name, date_of_birth, gender, phone, email, address, blood_group, allergies, chronic_conditions, emergency_contact_name, emergency_contact_phone }) {
    const id = generateUUID();
    await db.execute(
      `INSERT INTO patients (id, user_id, clinic_id, first_name, last_name, date_of_birth, gender, phone, email, address, blood_group, allergies, chronic_conditions, emergency_contact_name, emergency_contact_phone)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user_id ?? null,
        clinic_id ?? null,
        first_name ?? null,
        last_name ?? null,
        sanitizeField(date_of_birth),
        sanitizeField(gender),
        sanitizeField(phone),
        sanitizeField(email),
        sanitizeField(address),
        sanitizeField(blood_group),
        sanitizeField(allergies),
        sanitizeField(chronic_conditions),
        sanitizeField(emergency_contact_name),
        sanitizeField(emergency_contact_phone)
      ]
    );
    return this.findById(id);
  },

  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM patients WHERE id = ?', [id]);
    return rows[0];
  },

  async findByUserId(userId, clinicId) {
    const [rows] = await db.execute(
      'SELECT * FROM patients WHERE user_id = ? AND clinic_id = ?',
      [userId, clinicId]
    );
    return rows[0];
  },

  async findByClinic(clinicId, page = 1, limit = 20, search = '') {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM patients WHERE clinic_id = ?';
    const params = [clinicId];

    if (search) {
      query += ' AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.execute(query, params);

    let countSql = 'SELECT COUNT(*) as count FROM patients WHERE clinic_id = ?';
    const countParams = [clinicId];
    if (search) {
      countSql += ' AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR email LIKE ?)';
      const like = `%${search}%`;
      countParams.push(like, like, like, like);
    }
    const [countRows] = await db.execute(countSql, countParams);

    return { patients: rows, total: parseInt(countRows[0].count, 10), page, limit };
  },

  async update(id, fields) {
    const allowedFields = ['first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'email', 'address', 'blood_group', 'allergies', 'chronic_conditions', 'emergency_contact_name', 'emergency_contact_phone', 'is_active'];
    const nullableFields = new Set(['date_of_birth', 'gender', 'phone', 'email', 'address', 'blood_group', 'allergies', 'chronic_conditions', 'emergency_contact_name', 'emergency_contact_phone']);
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(nullableFields.has(key) ? sanitizeField(value) : (value ?? null));
      }
    }

    if (updates.length === 0) return null;
    updates.push('updated_at = NOW()');
    values.push(id);

    await db.execute(
      `UPDATE patients SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return this.findById(id);
  },
};

module.exports = Patient;
