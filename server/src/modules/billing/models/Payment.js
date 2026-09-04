const db = require('../../../core/config/database');
const { generateUUID, generateInvoiceNumber } = require('../../../core/utils/helpers');

const Payment = {
  async create({ clinic_id, patient_id, appointment_id, amount, discount = 0, tax = 0, total_amount, payment_method = 'cash', payment_status = 'pending', notes, transaction_id }) {
    const id = generateUUID();
    const invoice_number = generateInvoiceNumber();
    
    // Server calculation fallback
    const finalAmount = total_amount !== undefined ? parseFloat(total_amount) : Math.max(0, parseFloat(amount) - parseFloat(discount || 0) + parseFloat(tax || 0));

    await db.execute(
      `INSERT INTO payments (id, clinic_id, patient_id, appointment_id, invoice_number, amount, discount, tax, total_amount, payment_method, payment_status, transaction_id, payment_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END, ?)`,
      [
        id,
        clinic_id ?? null,
        patient_id ?? null,
        appointment_id ?? null,
        invoice_number,
        amount !== undefined && amount !== null ? parseFloat(amount) : finalAmount,
        parseFloat(discount || 0),
        parseFloat(tax || 0),
        finalAmount,
        payment_method ?? 'cash',
        payment_status,
        transaction_id ?? null,
        payment_status,
        notes ?? null,
      ]
    );
    return this.findById(id);
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT pay.*, p.first_name as patient_first_name, p.last_name as patient_last_name, p.phone as patient_phone,
              cs.name as service_name
       FROM payments pay
       JOIN patients p ON pay.patient_id = p.id
       LEFT JOIN appointments a ON pay.appointment_id = a.id
       LEFT JOIN clinic_services cs ON a.service_id = cs.id
       WHERE pay.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async findByAppointment(appointmentId) {
    if (!appointmentId) return null;
    const [rows] = await db.execute(
      `SELECT * FROM payments WHERE appointment_id = ? AND payment_status != 'failed' AND payment_status != 'refunded' LIMIT 1`,
      [appointmentId]
    );
    return rows[0] || null;
  },

  async findByClinic(clinicId, page = 1, limit = 20, status = null) {
    const offset = (page - 1) * limit;
    let query = `SELECT pay.*, p.first_name as patient_first_name, p.last_name as patient_last_name, p.phone as patient_phone,
                        cs.name as service_name
                 FROM payments pay
                 JOIN patients p ON pay.patient_id = p.id
                 LEFT JOIN appointments a ON pay.appointment_id = a.id
                 LEFT JOIN clinic_services cs ON a.service_id = cs.id
                 WHERE pay.clinic_id = ?`;
    const params = [clinicId];

    if (status && status !== 'all' && status !== 'All') {
      query += ' AND pay.payment_status = ?';
      params.push(status.toLowerCase());
    }

    query += ' ORDER BY pay.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.execute(query, params);

    let countSql = 'SELECT COUNT(*) as count FROM payments WHERE clinic_id = ?';
    const countParams = [clinicId];
    if (status && status !== 'all' && status !== 'All') {
      countSql += ' AND payment_status = ?';
      countParams.push(status.toLowerCase());
    }
    const [countRows] = await db.execute(countSql, countParams);

    // Summary calculations with safe defaults
    const [summaryRows] = await db.execute(
      `SELECT IFNULL(SUM(CASE WHEN payment_status = 'completed' THEN total_amount ELSE 0 END), 0) as total_collected,
              IFNULL(SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END), 0) as pending_amount,
              IFNULL(SUM(CASE WHEN payment_status = 'failed' THEN total_amount ELSE 0 END), 0) as overdue_amount,
              COUNT(*) as total_invoices
       FROM payments WHERE clinic_id = ?`,
      [clinicId]
    );

    return {
      payments: rows,
      total: parseInt(countRows[0]?.count, 10) || 0,
      summary: {
        total_collected: parseFloat(summaryRows[0]?.total_collected) || 0,
        pending_amount: parseFloat(summaryRows[0]?.pending_amount) || 0,
        overdue_amount: parseFloat(summaryRows[0]?.overdue_amount) || 0,
        total_invoices: parseInt(summaryRows[0]?.total_invoices, 10) || 0,
      },
      page,
      limit,
    };
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
    const [countRows] = await db.execute(
      'SELECT COUNT(*) as count FROM payments WHERE patient_id = ?',
      [patientId]
    );
    return { payments: rows, total: parseInt(countRows[0]?.count || 0, 10), page, limit };
  },

  async findByUserId(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      `SELECT pay.*, c.name as clinic_name, cs.name as service_name
       FROM payments pay
       JOIN clinics c ON pay.clinic_id = c.id
       JOIN patients pt ON pay.patient_id = pt.id
       LEFT JOIN appointments a ON pay.appointment_id = a.id
       LEFT JOIN clinic_services cs ON a.service_id = cs.id
       WHERE pt.user_id = ?
       ORDER BY pay.created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    const [countRows] = await db.execute(
      'SELECT COUNT(*) as count FROM payments pay JOIN patients pt ON pay.patient_id = pt.id WHERE pt.user_id = ?',
      [userId]
    );
    return { payments: rows, total: parseInt(countRows[0]?.count || 0, 10), page, limit };
  },

  async updateStatus(id, expectedStatus, status, transactionId, receiptNumber = null) {
    const [result] = await db.execute(
      `UPDATE payments SET payment_status = ?, transaction_id = IFNULL(?, transaction_id),
       payment_date = CASE WHEN ? = 'completed' THEN NOW() ELSE payment_date END,
       receipt_number = CASE WHEN ? = 'completed' THEN ? ELSE receipt_number END,
       receipt_generated_at = CASE WHEN ? = 'completed' THEN NOW() ELSE receipt_generated_at END,
       updated_at = NOW() WHERE id = ? AND payment_status = ?`,
      [status, transactionId ?? null, status, status, receiptNumber, status, id, expectedStatus]
    );
    if (!result.affectedRows) return null;
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
    return {
      total_revenue: parseFloat(rows[0]?.total_revenue) || 0,
      total_transactions: parseInt(rows[0]?.total_transactions, 10) || 0,
    };
  },
};

module.exports = Payment;
