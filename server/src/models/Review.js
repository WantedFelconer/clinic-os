const db = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const Review = {
  async create({ clinic_id, patient_id, doctor_id, rating, comment }) {
    const id = generateUUID();
    await db.execute(
      `INSERT INTO reviews (id, clinic_id, patient_id, doctor_id, rating, comment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, clinic_id ?? null, patient_id ?? null, doctor_id ?? null, rating ?? null, comment ?? null]
    );
    const [rows] = await db.execute('SELECT * FROM reviews WHERE id = ?', [id]);
    return rows[0];
  },

  async findByClinic(clinicId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT r.*, p.first_name as patient_first_name, p.last_name as patient_last_name
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
      `SELECT r.*, p.first_name as patient_first_name, p.last_name as patient_last_name
       FROM reviews r JOIN patients p ON r.patient_id = p.id
       WHERE r.doctor_id = ? AND r.is_approved = true
       ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [doctorId, limit, offset]
    );
    return { reviews: rows, page, limit };
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
      `SELECT r.*, p.first_name as patient_first_name, p.last_name as patient_last_name, c.name as clinic_name
       FROM reviews r JOIN patients p ON r.patient_id = p.id JOIN clinics c ON r.clinic_id = c.id
       WHERE r.is_approved = false ORDER BY r.created_at ASC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return { reviews: rows, page, limit };
  },

  async remove(id) {
    await db.execute('DELETE FROM reviews WHERE id = ?', [id]);
  },
};

module.exports = Review;
