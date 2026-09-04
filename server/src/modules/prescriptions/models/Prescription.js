const db = require('../../../core/config/database');
const { generateUUID } = require('../../../core/utils/helpers');

const Prescription = {
  async create({ patient_id, clinic_id, doctor_id, appointment_id, diagnosis, notes }) {
    const id = generateUUID();
    await db.execute(
      `INSERT INTO prescriptions (id, patient_id, clinic_id, doctor_id, appointment_id, diagnosis, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, patient_id ?? null, clinic_id ?? null, doctor_id ?? null, appointment_id ?? null, diagnosis ?? null, notes ?? null]
    );
    return this.findById(id);
  },

  async createWithItems({ patient_id, clinic_id, doctor_id, appointment_id, diagnosis, notes, items }) {
    const prescriptionId = generateUUID();
    await db.transaction(async (connection) => {
      await connection.execute(
        `INSERT INTO prescriptions (id, patient_id, clinic_id, doctor_id, appointment_id, diagnosis, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [prescriptionId, patient_id, clinic_id, doctor_id, appointment_id || null, diagnosis, notes || null]
      );
      for (const item of items) {
        await connection.execute(
          `INSERT INTO prescription_items (id, prescription_id, medication_name, dosage, frequency, duration, route, instructions)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateUUID(), prescriptionId, item.medication_name.trim(), item.dosage.trim(), item.frequency.trim(), item.duration?.trim() || null, item.route?.trim() || 'Oral', item.instructions?.trim() || null]
        );
      }
    });
    return this.getFullPrescription(prescriptionId);
  },

  async updateWithItems(id, { diagnosis, notes, items }) {
    await db.transaction(async (connection) => {
      await connection.execute(
        'UPDATE prescriptions SET diagnosis = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [diagnosis, notes || null, id]
      );
      await connection.execute('DELETE FROM prescription_items WHERE prescription_id = ?', [id]);
      for (const item of items) {
        await connection.execute(
          `INSERT INTO prescription_items (id, prescription_id, medication_name, dosage, frequency, duration, route, instructions)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateUUID(), id, item.medication_name.trim(), item.dosage.trim(), item.frequency.trim(), item.duration?.trim() || null, item.route?.trim() || 'Oral', item.instructions?.trim() || null]
        );
      }
    });
    return this.getFullPrescription(id);
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT p.*, pt.first_name as patient_first_name, pt.last_name as patient_last_name,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              dp.qualifications as doctor_qualifications,
              c.name as clinic_name, c.phone as clinic_phone, c.email as clinic_email, c.address as clinic_address
       FROM prescriptions p
       JOIN patients pt ON p.patient_id = pt.id
       LEFT JOIN users u ON p.doctor_id = u.id
       LEFT JOIN doctor_profiles dp ON dp.user_id = p.doctor_id
       LEFT JOIN clinics c ON p.clinic_id = c.id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0];
  },

  async findByPatient(patientId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT p.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name, c.name as clinic_name
       FROM prescriptions p
       LEFT JOIN users u ON p.doctor_id = u.id
       LEFT JOIN clinics c ON p.clinic_id = c.id
       WHERE p.patient_id = ?
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [patientId, limit, offset]
    );
    const [countRows] = await db.execute('SELECT COUNT(*) as count FROM prescriptions WHERE patient_id = ?', [patientId]);
    return { prescriptions: rows, total: parseInt(countRows[0].count, 10), page, limit };
  },

  async findByUserId(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT p.*, pt.first_name as patient_first_name, pt.last_name as patient_last_name,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name, c.name as clinic_name
       FROM prescriptions p
       JOIN patients pt ON p.patient_id = pt.id
       LEFT JOIN users u ON p.doctor_id = u.id
       LEFT JOIN clinics c ON p.clinic_id = c.id
       WHERE pt.user_id = ?
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    const [countRows] = await db.execute(
      `SELECT COUNT(*) as count
       FROM prescriptions p
       JOIN patients pt ON p.patient_id = pt.id
       WHERE pt.user_id = ?`,
      [userId]
    );
    return { prescriptions: rows, total: parseInt(countRows[0]?.count || 0, 10), page, limit };
  },

  async findByClinic(clinicId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT p.*, pt.first_name as patient_first_name, pt.last_name as patient_last_name, pt.phone as patient_phone,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              c.name as clinic_name,
              (SELECT COUNT(*) FROM prescription_items pi WHERE pi.prescription_id = p.id) as items_count
       FROM prescriptions p
       JOIN patients pt ON p.patient_id = pt.id
       LEFT JOIN users u ON p.doctor_id = u.id
       LEFT JOIN clinics c ON p.clinic_id = c.id
       WHERE p.clinic_id = ?
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [clinicId, limit, offset]
    );
    const [countRows] = await db.execute('SELECT COUNT(*) as count FROM prescriptions WHERE clinic_id = ?', [clinicId]);
    return { prescriptions: rows, total: parseInt(countRows[0]?.count, 10) || 0, page, limit };
  },

  async addItem({ prescription_id, medication_name, dosage, frequency, duration, route, instructions }) {
    const id = generateUUID();
    await db.execute(
      `INSERT INTO prescription_items (id, prescription_id, medication_name, dosage, frequency, duration, route, instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, prescription_id ?? null, medication_name ?? null, dosage, frequency, duration || null, route || 'Oral', instructions ?? null]
    );
    const [rows] = await db.execute('SELECT * FROM prescription_items WHERE id = ?', [id]);
    return rows[0];
  },

  async getItems(prescriptionId) {
    const [rows] = await db.execute(
      'SELECT * FROM prescription_items WHERE prescription_id = ? ORDER BY created_at',
      [prescriptionId]
    );
    return rows;
  },

  async removeItem(itemId, prescriptionId) {
    const [result] = await db.execute('DELETE FROM prescription_items WHERE id = ? AND prescription_id = ?', [itemId, prescriptionId]);
    return result.affectedRows > 0;
  },

  async getFullPrescription(id) {
    const prescription = await this.findById(id);
    if (!prescription) return null;
    const items = await this.getItems(id);
    return { ...prescription, items };
  },
};

module.exports = Prescription;
