const db = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const MedicalReport = {
  async create({ patient_id, clinic_id, doctor_id, uploaded_by, title, report_type, file_name, file_url, description, report_date }) {
    const id = generateUUID();
    const dateStr = report_date || new Date().toISOString().split('T')[0];
    await db.execute(
      `INSERT INTO medical_reports (id, patient_id, clinic_id, doctor_id, uploaded_by, title, report_type, file_name, file_url, description, report_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, patient_id, clinic_id, doctor_id || null, uploaded_by, title, report_type, file_name, file_url, description || null, dateStr]
    );
    return this.findById(id);
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT mr.*, 
              p.first_name as patient_first_name, p.last_name as patient_last_name, p.user_id as patient_user_id,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              c.name as clinic_name
       FROM medical_reports mr
       JOIN patients p ON mr.patient_id = p.id
       LEFT JOIN users u ON mr.doctor_id = u.id
       LEFT JOIN clinics c ON mr.clinic_id = c.id
       WHERE mr.id = ?`,
      [id]
    );
    return rows[0];
  },

  async findByPatient(patientId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT mr.*, 
              u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              c.name as clinic_name
       FROM medical_reports mr
       LEFT JOIN users u ON mr.doctor_id = u.id
       LEFT JOIN clinics c ON mr.clinic_id = c.id
       WHERE mr.patient_id = ?
       ORDER BY mr.report_date DESC, mr.created_at DESC LIMIT ? OFFSET ?`,
      [patientId, limit, offset]
    );
    const [countRows] = await db.execute('SELECT COUNT(*) as count FROM medical_reports WHERE patient_id = ?', [patientId]);
    return { reports: rows, total: parseInt(countRows[0]?.count || 0, 10), page, limit };
  },

  async findByClinic(clinicId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT mr.*, 
              p.first_name as patient_first_name, p.last_name as patient_last_name,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name
       FROM medical_reports mr
       JOIN patients p ON mr.patient_id = p.id
       LEFT JOIN users u ON mr.doctor_id = u.id
       WHERE mr.clinic_id = ?
       ORDER BY mr.report_date DESC, mr.created_at DESC LIMIT ? OFFSET ?`,
      [clinicId, limit, offset]
    );
    const [countRows] = await db.execute('SELECT COUNT(*) as count FROM medical_reports WHERE clinic_id = ?', [clinicId]);
    return { reports: rows, total: parseInt(countRows[0]?.count || 0, 10), page, limit };
  },

  async findByUserId(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT mr.*, c.name as clinic_name, u.first_name as doctor_first_name, u.last_name as doctor_last_name
       FROM medical_reports mr JOIN patients p ON p.id = mr.patient_id
       JOIN clinics c ON c.id = mr.clinic_id LEFT JOIN users u ON u.id = mr.doctor_id
       WHERE p.user_id = ? ORDER BY mr.report_date DESC, mr.created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    const [count] = await db.execute('SELECT COUNT(*) as count FROM medical_reports mr JOIN patients p ON p.id = mr.patient_id WHERE p.user_id = ?', [userId]);
    return { reports: rows, total: Number(count[0]?.count || 0), page, limit };
  },

  async delete(id) {
    await db.execute('DELETE FROM medical_reports WHERE id = ?', [id]);
    return true;
  },
};

module.exports = MedicalReport;
