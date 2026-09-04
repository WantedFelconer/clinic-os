const db = require('../../../core/config/database');
const { generateUUID } = require('../../../core/utils/helpers');

const Notification = {
  async create({ user_id, title, message, type, reference_type, reference_id }) {
    const id = generateUUID();
    await db.execute(
      `INSERT INTO notifications (id, user_id, title, message, type, reference_type, reference_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, user_id ?? null, title ?? null, message ?? null, type ?? null, reference_type ?? null, reference_id ?? null]
    );
    const [rows] = await db.execute('SELECT * FROM notifications WHERE id = ?', [id]);
    return rows[0];
  },

  async findByUser(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const [rows] = await db.execute(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );
    const [countRows] = await db.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?',
      [userId]
    );
    const [unreadRows] = await db.execute(
      'SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND is_read = false',
      [userId]
    );
    return {
      notifications: rows,
      total: parseInt(countRows[0].count, 10),
      unread: parseInt(unreadRows[0].unread, 10),
      page,
      limit,
    };
  },

  async markAsRead(id, userId) {
    await db.execute(
      'UPDATE notifications SET is_read = true WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    const [rows] = await db.execute(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return rows[0];
  },

  async markAllAsRead(userId) {
    await db.execute('UPDATE notifications SET is_read = true WHERE user_id = ? AND is_read = false', [userId]);
  },
};

module.exports = Notification;
