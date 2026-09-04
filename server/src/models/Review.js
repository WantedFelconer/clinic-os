const db = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const Review = {
  async create({ clinic_id, patient_id, doctor_id, appointment_id, rating, comment }) {
    const id = generateUUID();
    await db.execute(
      `INSERT INTO reviews (id, clinic_id, patient_id, doctor_id, appointment_id, rating, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, clinic_id ?? null, patient_id ?? null, doctor_id ?? null, appointment_id ?? null, rating ?? null, comment ?? null]
    );
    const [rows] = await db.execute('SELECT * FROM reviews WHERE id = ?', [id]);
    return rows[0];
  },

  async findByAppointment(appointmentId) {
    if (!appointmentId) return null;
    const [rows] = await db.execute('SELECT * FROM reviews WHERE appointment_id = ?', [appointmentId]);
    return rows[0];
  },

  async findByClinic(clinicId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT r.id, r.rating, r.comment, r.created_at, r.doctor_id,
              CONCAT(p.first_name, ' ', LEFT(p.last_name, 1), '.') as reviewer_name
       FROM reviews r JOIN patients p ON r.patient_id = p.id
       WHERE r.clinic_id = ? AND r.is_approved = true
       ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [clinicId, limit, offset]
    );
    const [agg] = await db.execute(
      'SELECT COUNT(*) as count, IFNULL(AVG(rating), 0) as avg_rating FROM reviews WHERE clinic_id = ? AND is_approved = true',
      [clinicId]
    );
    return { reviews: rows, ...agg[0], page, limit };
  },

  async findByDoctor(doctorId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              CONCAT(p.first_name, ' ', LEFT(p.last_name, 1), '.') as reviewer_name
       FROM reviews r JOIN patients p ON r.patient_id = p.id
       WHERE r.doctor_id = ? AND r.is_approved = true
       ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [doctorId, limit, offset]
    );
    const [summary] = await db.execute(
      `SELECT COUNT(*) as total, IFNULL(AVG(rating), 0) as average,
              SUM(rating = 1) as rating_1, SUM(rating = 2) as rating_2,
              SUM(rating = 3) as rating_3, SUM(rating = 4) as rating_4, SUM(rating = 5) as rating_5
       FROM reviews WHERE doctor_id = ? AND is_approved = 1`,
      [doctorId]
    );
    return {
      reviews: rows,
      summary: {
        total: Number(summary[0]?.total || 0), average: Number(summary[0]?.average || 0),
        distribution: [1, 2, 3, 4, 5].reduce((result, rating) => ({ ...result, [rating]: Number(summary[0]?.[`rating_${rating}`] || 0) }), {}),
      },
      page, limit,
    };
  },

  async approve(id) {
    await db.execute(
      'UPDATE reviews SET is_approved = true, updated_at = NOW() WHERE id = ?',
      [id]
    );
    const [rows] = await db.execute('SELECT * FROM reviews WHERE id = ?', [id]);
    return rows[0];
  },

  async getPending(page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT r.*, p.first_name as patient_first_name, p.last_name as patient_last_name, c.name as clinic_name,
              d.first_name as doctor_first_name, d.last_name as doctor_last_name
       FROM reviews r
       JOIN patients p ON r.patient_id = p.id
       JOIN clinics c ON r.clinic_id = c.id
       LEFT JOIN users d ON r.doctor_id = d.id
       WHERE r.is_approved = 0 OR r.is_approved IS FALSE
       ORDER BY r.created_at ASC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [countRows] = await db.execute(
      'SELECT COUNT(*) as count FROM reviews WHERE is_approved = 0 OR is_approved IS FALSE'
    );
    return { reviews: rows, total: parseInt(countRows[0]?.count || 0, 10), page, limit };
  },

  async remove(id) {
    await db.execute('DELETE FROM reviews WHERE id = ?', [id]);
  },
};

module.exports = Review;
