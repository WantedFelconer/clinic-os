const db = require('../config/database');
const { generateUUID, generateInvoiceNumber } = require('../utils/helpers');

const Payment = {
  async create({ clinic_id, patient_id, appointment_id, amount, discount, tax, payment_method, notes }) {
    const id = generateUUID();
    const invoice_number = generateInvoiceNumber();
    const total_amount = parseFloat(amount) - parseFloat(discount || 0) + parseFloat(tax || 0);
    await db.execute(
      `INSERT INTO payments (id, clinic_id, patient_id, appointment_id, invoice_number, amount, discount, tax, total_amount, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clinic_id ?? null, patient_id ?? null, appointment_id ?? null, invoice_number, amount ?? null, discount || 0, tax || 0, total_amount, payment_method ?? null, notes ?? null]
    );
    return this.findById(id);
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT pay.*, p.first_name as patient_first_name, p.last_name as patient_last_name
       FROM payments pay JOIN patients p ON pay.patient_id = p.id WHERE pay.id = ?`,
      [id]
    );
    return rows[0];
  },

  async findByClinic(clinicId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT pay.*, p.first_name as patient_first_name, p.last_name as patient_last_name
       FROM payments pay JOIN patients p ON pay.patient_id = p.id
       WHERE pay.clinic_id = ?
       ORDER BY pay.created_at DESC LIMIT ? OFFSET ?`,
      [clinicId, limit, offset]
    );
    const [countRows] = await db.execute('SELECT COUNT(*) as count FROM payments WHERE clinic_id = ?', [clinicId]);
    return { payments: rows, total: parseInt(countRows[0].count, 10), page, limit };
  },

  async findByPatient(patientId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT pay.*, c.name as clinic_name
       FROM payments pay JOIN clinics c ON pay.clinic_id = c.id
       WHERE pay.patient_id = ?
       ORDER BY pay.created_at DESC LIMIT ? OFFSET ?`,
      [patientId, limit, offset]
    );
    return { payments: rows, page, limit };
  },

  async updateStatus(id, status, transactionId) {
    await db.execute(
      `UPDATE payments SET payment_status = ?, transaction_id = IFNULL(?, transaction_id), payment_date = CASE WHEN ? = 'completed' THEN NOW() ELSE payment_date END, updated_at = NOW() WHERE id = ?`,
      [status, transactionId, status, id]
    );
    return this.findById(id);
  },

  async getRevenue(clinicId, startDate, endDate) {
    const [rows] = await db.execute(
      `SELECT IFNULL(SUM(total_amount), 0) as total_revenue, COUNT(*) as total_transactions
       FROM payments WHERE clinic_id = ? AND payment_status = 'completed'
       AND (? IS NULL OR payment_date >= ?)
       AND (? IS NULL OR payment_date <= ?)`,
      [clinicId, startDate, startDate, endDate, endDate]
    );
    return rows[0];
  },
};

module.exports = Payment;
