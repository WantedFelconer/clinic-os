const db = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const DoctorProfile = {
  async create({ user_id, qualifications, specialization, experience_years, consultation_fee, bio }) {
    const id = generateUUID();
    await db.execute(
      `INSERT INTO doctor_profiles (id, user_id, qualifications, specialization, experience_years, consultation_fee, bio)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        user_id,
        qualifications || null,
        specialization || null,
        experience_years ? parseInt(experience_years, 10) : 0,
        consultation_fee ? parseFloat(consultation_fee) : 0.0,
        bio || null,
      ]
    );
    return this.findByUserId(user_id);
  },

  async findByUserId(userId) {
    const [rows] = await db.execute(
      `SELECT dp.*, u.first_name, u.last_name, u.email, u.phone, u.avatar_url, u.is_active
       FROM users u
       LEFT JOIN doctor_profiles dp ON u.id = dp.user_id
       WHERE u.id = ? AND u.role = 'doctor'`,
      [userId]
    );
    return rows[0] || null;
  },

  async update(userId, fields) {
    const existing = await this.findByUserId(userId);
    if (!existing) return null;

    if (!existing.id) {
      // If doctor profile row doesn't exist yet, create it
      return this.create({
        user_id: userId,
        qualifications: fields.qualifications,
        specialization: fields.specialization,
        experience_years: fields.experience_years,
        consultation_fee: fields.consultation_fee,
        bio: fields.bio,
      });
    }

    const allowedFields = ['qualifications', 'specialization', 'experience_years', 'consultation_fee', 'bio'];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        if (key === 'experience_years') {
          values.push(value !== null && value !== undefined ? parseInt(value, 10) : 0);
        } else if (key === 'consultation_fee') {
          values.push(value !== null && value !== undefined ? parseFloat(value) : 0.0);
        } else {
          values.push(value ?? null);
        }
      }
    }

    if (updates.length === 0) return this.findByUserId(userId);
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    await db.execute(
      `UPDATE doctor_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
      values
    );

    return this.findByUserId(userId);
  },

  async search({ query, specialty, city, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    let sql = `
      SELECT u.id as doctor_id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url,
             dp.qualifications, dp.specialization, dp.experience_years, dp.consultation_fee, dp.bio,
             (SELECT IFNULL(AVG(r.rating), 0) FROM reviews r WHERE r.doctor_id = u.id AND r.is_approved = true) as avg_rating,
             (SELECT COUNT(*) FROM reviews r WHERE r.doctor_id = u.id AND r.is_approved = true) as reviews_count,
             (
               SELECT GROUP_CONCAT(DISTINCT c.name)
               FROM clinics c
               LEFT JOIN clinic_staff cs ON c.id = cs.clinic_id
               WHERE (c.owner_id = u.id OR cs.user_id = u.id) AND c.is_active = 1
             ) as clinics_list
      FROM users u
      LEFT JOIN doctor_profiles dp ON u.id = dp.user_id
      WHERE u.role = 'doctor' AND (u.is_active = 1 OR u.is_active = true)
    `;

    let countSql = `
      SELECT COUNT(DISTINCT u.id) as count
      FROM users u
      LEFT JOIN doctor_profiles dp ON u.id = dp.user_id
      WHERE u.role = 'doctor' AND (u.is_active = 1 OR u.is_active = true)
    `;

    const params = [];
    const countParams = [];

    if (query) {
      const qClause = ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR dp.specialization LIKE ? OR dp.qualifications LIKE ?)`;
      sql += qClause;
      countSql += qClause;
      const term = `%${query}%`;
      params.push(term, term, term, term);
      countParams.push(term, term, term, term);
    }

    if (specialty && specialty !== 'All') {
      const sClause = ` AND dp.specialization LIKE ?`;
      sql += sClause;
      countSql += sClause;
      const term = `%${specialty}%`;
      params.push(term);
      countParams.push(term);
    }

    if (city && city !== 'All') {
      const cClause = ` AND EXISTS (
        SELECT 1 FROM clinics c
        LEFT JOIN clinic_staff cs ON c.id = cs.clinic_id
        WHERE (c.owner_id = u.id OR cs.user_id = u.id) AND c.city LIKE ? AND c.is_active = 1
      )`;
      sql += cClause;
      countSql += cClause;
      const term = `%${city}%`;
      params.push(term);
      countParams.push(term);
    }

    sql += ` ORDER BY avg_rating DESC, u.first_name ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await db.execute(sql, params);
    const [countRows] = await db.execute(countSql, countParams);

    return {
      doctors: rows.map(r => ({
        ...r,
        avg_rating: parseFloat(r.avg_rating) || 0,
        reviews_count: parseInt(r.reviews_count, 10) || 0,
        experience_years: parseInt(r.experience_years, 10) || 0,
        consultation_fee: parseFloat(r.consultation_fee) || 0,
      })),
      total: parseInt(countRows[0]?.count || 0, 10),
      page,
      limit,
    };
  },

  async getDoctorDetails(doctorId) {
    const profile = await this.findByUserId(doctorId);
    if (!profile) return null;

    // Get clinics doctor works at (owned or staff)
    const [clinics] = await db.execute(
      `SELECT DISTINCT c.id, c.name, c.slug, c.address, c.city, c.state, c.phone, c.email, c.logo_url
       FROM clinics c
       LEFT JOIN clinic_staff cs ON c.id = cs.clinic_id
       WHERE (c.owner_id = ? OR cs.user_id = ?) AND c.is_active = 1`,
      [doctorId, doctorId]
    );

    // Get ratings
    const [ratings] = await db.execute(
      `SELECT IFNULL(AVG(rating), 0) as avg_rating, COUNT(*) as reviews_count
       FROM reviews WHERE doctor_id = ? AND is_approved = true`,
      [doctorId]
    );

    return {
      ...profile,
      avg_rating: parseFloat(ratings[0]?.avg_rating || 0),
      reviews_count: parseInt(ratings[0]?.reviews_count || 0, 10),
      clinics,
    };
  },
};

module.exports = DoctorProfile;
