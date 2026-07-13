const db = require('../config/database');
const { generateUUID } = require('../utils/helpers');

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

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT p.*, pt.first_name as patient_first_name, pt.last_name as patient_last_name,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name,
              c.name as clinic_name
       FROM prescriptions p
       JOIN patients pt ON p.patient_id = pt.id
       JOIN users u ON p.doctor_id = u.id
       JOIN clinics c ON p.clinic_id = c.id
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
       JOIN users u ON p.doctor_id = u.id
       JOIN clinics c ON p.clinic_id = c.id
       WHERE p.patient_id = ?
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [patientId, limit, offset]
    );
    const [countRows] = await db.execute('SELECT COUNT(*) as count FROM prescriptions WHERE patient_id = ?', [patientId]);
    return { prescriptions: rows, total: parseInt(countRows[0].count, 10), page, limit };
  },

  async findByClinic(clinicId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT p.*, pt.first_name as patient_first_name, pt.last_name as patient_last_name,
              u.first_name as doctor_first_name, u.last_name as doctor_last_name
       FROM prescriptions p
       JOIN patients pt ON p.patient_id = pt.id
       JOIN users u ON p.doctor_id = u.id
       WHERE p.clinic_id = ?
       ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [clinicId, limit, offset]
    );
    return { prescriptions: rows, page, limit };
  },

  async addItem({ prescription_id, medication_name, dosage, frequency, duration, route, instructions }) {
    const id = generateUUID();
    await db.execute(
      `INSERT INTO prescription_items (id, prescription_id, medication_name, dosage, frequency, duration, route, instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, prescription_id ?? null, medication_name ?? null, dosage ?? null, frequency ?? null, duration ?? null, route ?? null, instructions ?? null]
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

  async removeItem(itemId) {
    await db.execute('DELETE FROM prescription_items WHERE id = ?', [itemId]);
  },

  async getFullPrescription(id) {
    const prescription = await this.findById(id);
    if (!prescription) return null;
    const items = await this.getItems(id);
    return { ...prescription, items };
  },
};

module.exports = Prescription;
