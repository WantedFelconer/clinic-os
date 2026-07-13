const db = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const Appointment = {
  async create({ clinic_id, patient_id, doctor_id, service_id, appointment_date, start_time, end_time, type, notes }) {
    const id = generateUUID();
    await db.execute(
      `INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, service_id, appointment_date, start_time, end_time, type, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clinic_id ?? null, patient_id ?? null, doctor_id ?? null, service_id ?? null, appointment_date ?? null, start_time ?? null, end_time ?? null, type ?? null, notes ?? null]
    );
    return this.findById(id);
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name, p.phone as patient_phone,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              cs.name as service_name, cs.price as service_price
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users u ON a.doctor_id = u.id
       LEFT JOIN clinic_services cs ON a.service_id = cs.id
       WHERE a.id = ?`,
      [id]
    );
    return rows[0];
  },

  async findByClinic(clinicId, { status, date, doctorId, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    let query = `SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name, p.phone as patient_phone,
                        u.first_name as doctor_first_name, u.last_name as doctor_last_name,
                        cs.name as service_name
                 FROM appointments a
                 JOIN patients p ON a.patient_id = p.id
                 JOIN users u ON a.doctor_id = u.id
                 LEFT JOIN clinic_services cs ON a.service_id = cs.id
                 WHERE a.clinic_id = ?`;
    const params = [clinicId];

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    if (date) {
      query += ' AND a.appointment_date = ?';
      params.push(date);
    }
    if (doctorId) {
      query += ' AND a.doctor_id = ?';
      params.push(doctorId);
    }

    query += ' ORDER BY a.appointment_date DESC, a.start_time ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.execute(query, params);

    let countQuery = 'SELECT COUNT(*) as count FROM appointments WHERE clinic_id = ?';
    const countParams = [clinicId];
    if (status) { countQuery += ' AND status = ?'; countParams.push(status); }
    if (date) { countQuery += ' AND appointment_date = ?'; countParams.push(date); }
    if (doctorId) { countQuery += ' AND doctor_id = ?'; countParams.push(doctorId); }
    const [countRows] = await db.execute(countQuery, countParams);

    return { appointments: rows, total: parseInt(countRows[0].count, 10), page, limit };
  },

  async findByPatient(patientId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT a.*, c.name as clinic_name, u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              cs.name as service_name
       FROM appointments a
       JOIN clinics c ON a.clinic_id = c.id
       JOIN users u ON a.doctor_id = u.id
       LEFT JOIN clinic_services cs ON a.service_id = cs.id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC, a.start_time ASC
       LIMIT ? OFFSET ?`,
      [patientId, limit, offset]
    );
    const [countRows] = await db.execute('SELECT COUNT(*) as count FROM appointments WHERE patient_id = ?', [patientId]);
    return { appointments: rows, total: parseInt(countRows[0].count, 10), page, limit };
  },

  async findByDoctor(doctorId, date, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    let query = `SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name, p.phone as patient_phone
                 FROM appointments a JOIN patients p ON a.patient_id = p.id
                 WHERE a.doctor_id = ?`;
    const params = [doctorId];

    if (date) {
      query += ' AND a.appointment_date = ? ORDER BY a.start_time ASC LIMIT ? OFFSET ?';
      params.push(date, limit, offset);
    } else {
      query += ' ORDER BY a.appointment_date DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
    }

    const [rows] = await db.execute(query, params);
    return { appointments: rows, page, limit };
  },

  async updateStatus(id, status, cancellationReason) {
    await db.execute(
      `UPDATE appointments SET status = ?, cancellation_reason = ?, updated_at = NOW() WHERE id = ?`,
      [status, cancellationReason ?? null, id]
    );
    return this.findById(id);
  },

  async update(id, fields) {
    const allowedFields = ['appointment_date', 'start_time', 'end_time', 'service_id', 'type', 'notes'];
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
      `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return this.findById(id);
  },

  async getUpcoming(clinicId, limit = 10) {
    const [rows] = await db.execute(
      `SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN users u ON a.doctor_id = u.id
       WHERE a.clinic_id = ? AND a.appointment_date >= CURRENT_DATE AND a.status IN ('scheduled', 'confirmed')
       ORDER BY a.appointment_date ASC, a.start_time ASC LIMIT ?`,
      [clinicId, limit]
    );
    return rows;
  },
};

module.exports = Appointment;
