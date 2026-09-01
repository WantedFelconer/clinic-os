const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { generateUUID } = require('../utils/helpers');

const User = {
  async create({ email, password, role, first_name, last_name, phone, is_verified = false, verification_otp, verification_otp_expires }) {
    const id = generateUUID();
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute(
      `INSERT INTO users (id, email, password, role, first_name, last_name, phone, is_verified, verification_otp, verification_otp_expires)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, email, hashedPassword, role, first_name, last_name, phone ?? null, is_verified ? 1 : 0, verification_otp ?? null, verification_otp_expires ?? null]
    );
    const [rows] = await db.execute('SELECT id, email, role, first_name, last_name, is_verified, created_at FROM users WHERE id = ?', [id]);
    return rows[0];
  },

  async findByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0];
  },

  async findById(id) {
    const [rows] = await db.execute(
      'SELECT id, email, role, first_name, last_name, phone, avatar_url, is_verified, is_active, created_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  },

  async comparePassword(inputPassword, hashedPassword) {
    return bcrypt.compare(inputPassword, hashedPassword);
  },

  async update(id, fields) {
    const allowedFields = ['first_name', 'last_name', 'phone', 'avatar_url', 'is_verified', 'is_active'];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value ?? null);
      }
    }

    if (updates.length === 0) return null;
    values.push(id);

    await db.execute(`UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    return this.findById(id);
  },

  async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedPassword, id]);
  },

  async findByRole(role, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      'SELECT id, email, role, first_name, last_name, phone, is_verified, is_active, created_at FROM users WHERE role = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [role, limit, offset]
    );
    const [countRows] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = ?', [role]);
    return { users: rows, total: countRows[0].count, page, limit };
  },

  async getAll(page = 1, limit = 20, search = '') {
    const offset = (page - 1) * limit;
    let query = 'SELECT id, email, role, first_name, last_name, phone, is_verified, is_active, created_at FROM users';
    let countQuery = 'SELECT COUNT(*) as count FROM users';
    const params = [];
    const countParams = [];

    if (search) {
      const where = ' WHERE email LIKE ? OR first_name LIKE ? OR last_name LIKE ?';
      query += where;
      countQuery += where;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.execute(query, params);
    const [countRows] = await db.execute(countQuery, countParams.length ? countParams : []);

    return { users: rows, total: countRows[0].count, page, limit };
  },

  async setResetToken(email, token, expires) {
    await db.execute(
      'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE email = ?',
      [token, expires, email]
    );
  },

  async findByResetToken(token) {
    const [rows] = await db.execute(
      'SELECT id, email FROM users WHERE reset_password_token = ? AND reset_password_expires > NOW()',
      [token]
    );
    return rows[0];
  },

  async clearResetToken(id) {
    await db.execute('UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE id = ?', [id]);
  },

  async findByEmailWithOTP(email) {
    const [rows] = await db.execute(
      'SELECT id, email, first_name, role, verification_otp, verification_otp_expires, is_verified FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  },

  async markEmailVerified(email) {
    const [result] = await db.execute(
      `UPDATE users SET is_verified = 1, verification_otp = NULL, verification_otp_expires = NULL
       WHERE email = ?`,
      [email]
    );
    return (result.affectedRows || result.changes || 0) > 0;
  },

  async verifyOTP(email, otp) {
    const user = await this.findByEmailWithOTP(email);
    if (!user || !user.verification_otp) return false;
    const isMatch = await bcrypt.compare(otp, user.verification_otp);
    if (!isMatch) return false;
    return this.markEmailVerified(email);
  },

  async updateOTP(email, otp, expires) {
    await db.execute(
      'UPDATE users SET verification_otp = ?, verification_otp_expires = ? WHERE email = ?',
      [otp, expires, email]
    );
  },
};

module.exports = User;
