const db = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const Appointment = {
  async create({ clinic_id, patient_id, doctor_id, service_id, appointment_date, start_time, end_time, type, notes }) {
    return this.createTransactional({ clinic_id, patient_id, doctor_id, service_id, appointment_date, start_time, end_time, type, notes });
  },

  async createTransactional({ clinic_id, patient_id, doctor_id, service_id, appointment_date, start_time, end_time, type, notes }) {
    const normalizedServiceId = (service_id && String(service_id).trim() !== '')
      ? String(service_id).trim()
      : null;
    return db.transaction(async (conn) => {
      // Lock conflicting rows for this doctor and date to eliminate race conditions
      if (doctor_id) {
        const [conflicts] = await conn.execute(
          `SELECT id, start_time, end_time FROM appointments
           WHERE clinic_id = ?
             AND doctor_id = ?
             AND appointment_date = ?
             AND status NOT IN ('cancelled', 'no_show')
             AND start_time < ? AND end_time > ?
           FOR UPDATE`,
          [clinic_id, doctor_id, appointment_date, end_time, start_time]
        );

        if (conflicts.length > 0) {
          const err = new Error(`Schedule conflict: An appointment already exists from ${conflicts[0].start_time.substring(0, 5)} to ${conflicts[0].end_time.substring(0, 5)} on ${appointment_date}.`);
          err.isConflict = true;
          throw err;
        }
      }

      const id = generateUUID();
      await conn.execute(
        `INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, service_id, appointment_date, start_time, end_time, type, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, clinic_id ?? null, patient_id ?? null, doctor_id ?? null, normalizedServiceId, appointment_date ?? null, start_time ?? null, end_time ?? null, type ?? null, notes ?? null]
      );

      const [rows] = await conn.execute(
        `SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name, p.phone as patient_phone, p.email as patient_email, p.user_id as patient_user_id,
                u.first_name as doctor_first_name, u.last_name as doctor_last_name,
                cs.name as service_name, cs.price as service_price
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         LEFT JOIN users u ON a.doctor_id = u.id
         LEFT JOIN clinic_services cs ON a.service_id = cs.id
         WHERE a.id = ?`,
        [id]
      );
      return rows[0];
    });
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name, p.phone as patient_phone, p.email as patient_email, p.user_id as patient_user_id,
              c.is_active as clinic_is_active, c.timezone as clinic_timezone,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              cs.name as service_name, cs.price as service_price
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       JOIN clinics c ON a.clinic_id = c.id
       LEFT JOIN users u ON a.doctor_id = u.id
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
                 LEFT JOIN users u ON a.doctor_id = u.id
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
    return { appointments: rows, total: parseInt(countRows[0]?.count, 10) || 0, page, limit };
  },

  async findByUserId(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT a.*, c.name as clinic_name, u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              cs.name as service_name
       FROM appointments a
       JOIN clinics c ON a.clinic_id = c.id
       JOIN users u ON a.doctor_id = u.id
       LEFT JOIN clinic_services cs ON a.service_id = cs.id
       JOIN patients p ON a.patient_id = p.id
       WHERE p.user_id = ?
       ORDER BY a.appointment_date DESC, a.start_time ASC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    const [countRows] = await db.execute(
      `SELECT COUNT(*) as count FROM appointments a JOIN patients p ON a.patient_id = p.id WHERE p.user_id = ?`,
      [userId]
    );
    return { appointments: rows, total: parseInt(countRows[0]?.count, 10) || 0, page, limit };
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
      `UPDATE appointments SET status = ?, cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
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
        const normalizedValue = key === 'service_id' && (!value || String(value).trim() === '')
          ? null
          : (value ?? null);
        values.push(normalizedValue);
      }
    }

    if (updates.length === 0) return null;
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await db.execute(
      `UPDATE appointments SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return this.findById(id);
  },

  async findConflicting({ clinic_id, doctor_id, appointment_date, start_time, end_time, excludeId }) {
    let query = `SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name
                 FROM appointments a
                 JOIN patients p ON a.patient_id = p.id
                 WHERE a.clinic_id = ?
                   AND a.appointment_date = ?
                   AND a.status NOT IN ('cancelled', 'no_show')
                   AND a.start_time < ? AND a.end_time > ?`;
    const params = [clinic_id, appointment_date, end_time, start_time];

    if (doctor_id) {
      query += ' AND a.doctor_id = ?';
      params.push(doctor_id);
    }
    if (excludeId) {
      query += ' AND a.id != ?';
      params.push(excludeId);
    }

    query += ' LIMIT 1';
    const [rows] = await db.execute(query, params);
    return rows[0];
  },

  async findSchedule(clinicId, dayOfWeek) {
    const [rows] = await db.execute(
      'SELECT * FROM clinic_schedules WHERE clinic_id = ? AND day_of_week = ?',
      [clinicId, dayOfWeek]
    );
    if (rows && rows.length > 0) {
      return rows[0];
    }
    // Default clinic fallback: Mon-Sat 09:00-17:00, Sun closed
    return {
      clinic_id: clinicId,
      day_of_week: dayOfWeek,
      start_time: '09:00:00',
      end_time: '17:00:00',
      is_available: dayOfWeek !== 0 ? 1 : 0,
    };
  },

  async getUpcoming(clinicId, limit = 10) {
    const [rows] = await db.execute(
      `SELECT a.*, p.first_name as patient_first_name, p.last_name as patient_last_name,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              cs.name as service_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       LEFT JOIN users u ON a.doctor_id = u.id
       LEFT JOIN clinic_services cs ON a.service_id = cs.id
       WHERE a.clinic_id = ? AND a.appointment_date >= CURRENT_DATE AND a.status IN ('scheduled', 'confirmed')
       ORDER BY a.appointment_date ASC, a.start_time ASC LIMIT ?`,
      [clinicId, limit]
    );
    return rows;
  },
};

module.exports = Appointment;
