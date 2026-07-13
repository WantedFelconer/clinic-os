const db = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const Package = {
  async create({ clinic_id, name, description, sessions_count, price }) {
    const id = generateUUID();
    await db.execute(
      `INSERT INTO consultation_packages (id, clinic_id, name, description, sessions_count, price)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, clinic_id ?? null, name ?? null, description ?? null, sessions_count ?? null, price ?? null]
    );
    return this.findById(id);
  },

  async findByClinic(clinicId) {
    const [rows] = await db.execute(
      'SELECT * FROM consultation_packages WHERE clinic_id = ? AND is_active = true ORDER BY price',
      [clinicId]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM consultation_packages WHERE id = ?', [id]);
    return rows[0];
  },

  async update(id, fields) {
    const allowedFields = ['name', 'description', 'sessions_count', 'price', 'is_active'];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value ?? null);
      }
    }

    if (updates.length === 0) return null;
    updates.push('updated_at = NOW()');
    values.push(id);

    await db.execute(
      `UPDATE consultation_packages SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return this.findById(id);
  },

  async remove(id) {
    await db.execute('DELETE FROM consultation_packages WHERE id = ?', [id]);
  },
};

module.exports = Package;
