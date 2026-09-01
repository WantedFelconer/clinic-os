const db = require('../config/database');
const { generateUUID } = require('../utils/helpers');

const AuditLog = {
  async log({ user_id, action, entity_type, entity_id, details, ip_address }) {
    try {
      const id = generateUUID();
      const safeDetails = details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null;
      await db.execute(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, user_id ?? null, action, entity_type ?? null, entity_id ?? null, safeDetails, ip_address ?? null]
      );
      return id;
    } catch (err) {
      console.error('Failed to write audit log:', err.message);
      return null;
    }
  },

  async getAll(page = 1, limit = 50, action = '') {
    const offset = (page - 1) * limit;
    let query = `SELECT al.*, u.first_name, u.last_name, u.email, u.role
                 FROM audit_logs al
                 LEFT JOIN users u ON al.user_id = u.id`;
    const params = [];

    if (action) {
      query += ' WHERE al.action LIKE ?';
      params.push(`%${action}%`);
    }

    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.execute(query, params);

    let countSql = 'SELECT COUNT(*) as count FROM audit_logs';
    const countParams = [];
    if (action) {
      countSql += ' WHERE action LIKE ?';
      countParams.push(`%${action}%`);
    }
    const [countRows] = await db.execute(countSql, countParams);

    return {
      logs: rows.map(r => {
        let parsed = r.details;
        if (typeof parsed === 'string') {
          try { parsed = JSON.parse(parsed); } catch {}
        }
        return { ...r, details: parsed };
      }),
      total: parseInt(countRows[0]?.count || 0, 10),
      page,
      limit,
    };
  },
};

module.exports = AuditLog;
