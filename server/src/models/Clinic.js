const db = require('../config/database');
const { generateSlug, generateUUID } = require('../utils/helpers');

const Clinic = {
  async create({ owner_id, name, description, phone, email, address, city, state, country, logo_url, banner_url }) {
    const slug = generateSlug(name);
    const id = generateUUID();
    await db.execute(
      `INSERT INTO clinics (id, owner_id, name, slug, description, phone, email, address, city, state, country, logo_url, banner_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, owner_id ?? null, name ?? null, slug, description ?? null, phone ?? null, email ?? null, address ?? null, city ?? null, state ?? null, country ?? null, logo_url ?? null, banner_url ?? null]
    );
    return this.findById(id);
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT c.*, u.first_name as owner_first_name, u.last_name as owner_last_name, u.email as owner_email
       FROM clinics c JOIN users u ON c.owner_id = u.id WHERE c.id = ?`,
      [id]
    );
    return rows[0];
  },

  async findByOwner(ownerId) {
    const [rows] = await db.execute(
      'SELECT * FROM clinics WHERE owner_id = ? ORDER BY created_at DESC',
      [ownerId]
    );
    return rows;
  },

  async findBySlug(slug) {
    const [rows] = await db.execute(
      `SELECT c.*, u.first_name as owner_first_name, u.last_name as owner_last_name
       FROM clinics c JOIN users u ON c.owner_id = u.id WHERE c.slug = ?`,
      [slug]
    );
    return rows[0];
  },

  async update(id, fields) {
    const allowedFields = ['name', 'description', 'phone', 'email', 'address', 'city', 'state', 'country', 'postal_code', 'latitude', 'longitude', 'website', 'logo_url', 'banner_url', 'is_active'];
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
      `UPDATE clinics SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return this.findById(id);
  },

  async search({ query, city, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    let sql = 'SELECT c.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name FROM clinics c JOIN users u ON c.owner_id = u.id WHERE c.is_active = true';
    let countSql = 'SELECT COUNT(*) as count FROM clinics c WHERE c.is_active = true';
    const params = [];
    const countParams = [];

    if (query) {
      sql += ' AND (c.name LIKE ? OR c.description LIKE ? OR c.city LIKE ?)';
      countSql += ' AND (c.name LIKE ? OR c.description LIKE ? OR c.city LIKE ?)';
      const like = `%${query}%`;
      params.push(like, like, like);
      countParams.push(like, like, like);
    }

    if (city) {
      sql += ' AND c.city LIKE ?';
      countSql += ' AND c.city LIKE ?';
      const like = `%${city}%`;
      params.push(like);
      countParams.push(like);
    }

    sql += ' ORDER BY c.name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.execute(sql, params);
    const [countRows] = await db.execute(countSql, countParams);

    return { clinics: rows, total: parseInt(countRows[0].count, 10), page, limit };
  },

  async getStaff(clinicId) {
    const [rows] = await db.execute(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url, cs.role, cs.is_active
       FROM clinic_staff cs JOIN users u ON cs.user_id = u.id WHERE cs.clinic_id = ?`,
      [clinicId]
    );
    return rows;
  },

  async getSchedules(clinicId) {
    const [rows] = await db.execute(
      'SELECT * FROM clinic_schedules WHERE clinic_id = ? ORDER BY day_of_week',
      [clinicId]
    );
    return rows;
  },

  async updateSchedules(clinicId, schedules) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      await connection.execute('DELETE FROM clinic_schedules WHERE clinic_id = ?', [clinicId]);
      for (const s of schedules) {
        await connection.execute(
          'INSERT INTO clinic_schedules (clinic_id, day_of_week, start_time, end_time, is_available) VALUES (?, ?, ?, ?, ?)',
          [clinicId, s.day_of_week, s.start_time, s.end_time, s.is_available]
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    return this.getSchedules(clinicId);
  },

  async addStaff(clinicId, userId, role) {
    const id = generateUUID();
    await db.execute(
      'INSERT INTO clinic_staff (id, clinic_id, user_id, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role), is_active = true',
      [id, clinicId, userId, role]
    );
    const [rows] = await db.execute(
      'SELECT * FROM clinic_staff WHERE clinic_id = ? AND user_id = ?',
      [clinicId, userId]
    );
    return rows[0];
  },

  async removeStaff(clinicId, userId) {
    await db.execute(
      'UPDATE clinic_staff SET is_active = false WHERE clinic_id = ? AND user_id = ?',
      [clinicId, userId]
    );
  },
};

module.exports = Clinic;
