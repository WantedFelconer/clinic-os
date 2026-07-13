const db = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const Service = {
  async create({ clinic_id, name, description, duration_minutes, price }) {
    const id = generateUUID();
    await db.execute(
      `INSERT INTO clinic_services (id, clinic_id, name, description, duration_minutes, price)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, clinic_id ?? null, name ?? null, description ?? null, duration_minutes ?? null, price ?? null]
    );
    return this.findById(id);
  },

  async findByClinic(clinicId) {
    const [rows] = await db.execute(
      'SELECT * FROM clinic_services WHERE clinic_id = ? AND is_active = true ORDER BY name',
      [clinicId]
    );
    return rows;
  },

  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM clinic_services WHERE id = ?', [id]);
    return rows[0];
  },

  async update(id, fields) {
    const allowedFields = ['name', 'description', 'duration_minutes', 'price', 'is_active'];
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
      `UPDATE clinic_services SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return this.findById(id);
  },

  async remove(id) {
    await db.execute('DELETE FROM clinic_services WHERE id = ?', [id]);
  },
};

module.exports = Service;
