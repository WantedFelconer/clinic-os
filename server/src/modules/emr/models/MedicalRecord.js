const db = require('../../../core/config/database');
const { generateUUID } = require('../../../core/utils/helpers');

const MedicalRecord = {
  async create({ patient_id, clinic_id, doctor_id, appointment_id, diagnosis, symptoms, treatment_plan, notes, follow_up_date, is_confidential }) {
    const id = generateUUID();
    await db.execute(
      `INSERT INTO medical_records (id, patient_id, clinic_id, doctor_id, appointment_id, diagnosis, symptoms, treatment_plan, notes, follow_up_date, is_confidential)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, patient_id ?? null, clinic_id ?? null, doctor_id ?? null, appointment_id ?? null, diagnosis ?? null, symptoms ?? null, treatment_plan ?? null, notes ?? null, follow_up_date ?? null, is_confidential ? 1 : 0]
    );
    return this.findById(id);
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT mr.*, p.first_name as patient_first_name, p.last_name as patient_last_name,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name
       FROM medical_records mr
       JOIN patients p ON mr.patient_id = p.id
       JOIN users u ON mr.doctor_id = u.id
       WHERE mr.id = ?`,
      [id]
    );
    return rows[0];
  },

  async findByPatient(patientId, page = 1, limit = 20, includeConfidential = true) {
    const offset = (page - 1) * limit;
    let query = `SELECT mr.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name
                 FROM medical_records mr JOIN users u ON mr.doctor_id = u.id
                 WHERE mr.patient_id = ?`;
    const params = [patientId];

    if (!includeConfidential) {
      query += ' AND (mr.is_confidential = 0 OR mr.is_confidential IS NULL)';
    }

    query += ' ORDER BY mr.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.execute(query, params);

    let countSql = 'SELECT COUNT(*) as count FROM medical_records WHERE patient_id = ?';
    const countParams = [patientId];
    if (!includeConfidential) {
      countSql += ' AND (is_confidential = 0 OR is_confidential IS NULL)';
    }
    const [countRows] = await db.execute(countSql, countParams);
    return { records: rows, total: parseInt(countRows[0].count, 10), page, limit };
  },

  async findByUserId(userId, page = 1, limit = 20, includeConfidential = false) {
    const offset = (page - 1) * limit;
    let query = `SELECT mr.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name, c.name as clinic_name
                 FROM medical_records mr
                 JOIN patients p ON mr.patient_id = p.id
                 JOIN users u ON mr.doctor_id = u.id
                 JOIN clinics c ON mr.clinic_id = c.id
                 WHERE p.user_id = ?`;
    const params = [userId];

    if (!includeConfidential) {
      query += ' AND (mr.is_confidential = 0 OR mr.is_confidential IS NULL)';
    }

    query += ' ORDER BY mr.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.execute(query, params);

    let countSql = `SELECT COUNT(*) as count
                    FROM medical_records mr
                    JOIN patients p ON mr.patient_id = p.id
                    WHERE p.user_id = ?`;
    const countParams = [userId];
    if (!includeConfidential) {
      countSql += ' AND (mr.is_confidential = 0 OR mr.is_confidential IS NULL)';
    }
    const [countRows] = await db.execute(countSql, countParams);
    return { records: rows, total: parseInt(countRows[0]?.count || 0, 10), page, limit };
  },

  async findByClinic(clinicId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT mr.*, p.first_name as patient_first_name, p.last_name as patient_last_name,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name
       FROM medical_records mr
       JOIN patients p ON mr.patient_id = p.id
       JOIN users u ON mr.doctor_id = u.id
       WHERE mr.clinic_id = ?
       ORDER BY mr.created_at DESC LIMIT ? OFFSET ?`,
      [clinicId, limit, offset]
    );
    const [countRows] = await db.execute('SELECT COUNT(*) as count FROM medical_records WHERE clinic_id = ?', [clinicId]);
    return { records: rows, total: parseInt(countRows[0].count, 10), page, limit };
  },

  async update(id, fields) {
    const allowedFields = ['diagnosis', 'symptoms', 'treatment_plan', 'notes', 'follow_up_date', 'is_confidential'];
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
      `UPDATE medical_records SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return this.findById(id);
  },
};

module.exports = MedicalRecord;
