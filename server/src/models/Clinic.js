const db = require('../config/database');
const { generateSlug, generateUUID } = require('../utils/helpers');

const Clinic = {
  async create({ owner_id, name, description, phone, email, address, city, state, country, logo_url, banner_url }) {
    const slug = generateSlug(name);
    const id = generateUUID();
    await db.execute(
      `INSERT INTO clinics (id, owner_id, name, slug, description, phone, email, address, city, state, country, logo_url, banner_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, owner_id ?? null, name ?? null, slug, description ?? null, phone ?? null, email ?? null, address ?? null, city ?? null, state ?? null, country ?? null, logo_url ?? null, banner_url ?? null]
    );
    return this.findById(id);
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT c.*, u.first_name as owner_first_name, u.last_name as owner_last_name, u.email as owner_email
       FROM clinics c JOIN users u ON c.owner_id = u.id WHERE c.id = ?`,
      [id]
    );
    return rows[0];
  },

  async findByOwner(ownerId) {
    const [rows] = await db.execute(
      'SELECT * FROM clinics WHERE owner_id = ? ORDER BY created_at DESC',
      [ownerId]
    );
    return rows;
  },

  async findBySlug(slug) {
    const [rows] = await db.execute(
      `SELECT c.*, u.first_name as owner_first_name, u.last_name as owner_last_name
       FROM clinics c JOIN users u ON c.owner_id = u.id WHERE c.slug = ?`,
      [slug]
    );
    return rows[0];
  },

  async update(id, fields) {
    const allowedFields = ['name', 'description', 'phone', 'email', 'address', 'city', 'state', 'country', 'postal_code', 'latitude', 'longitude', 'website', 'logo_url', 'banner_url', 'is_active'];
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
      `UPDATE clinics SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return this.findById(id);
  },

  async search({ query, city, specialization, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    let sql = `SELECT c.*, u.first_name as doctor_first_name, u.last_name as doctor_last_name,
                      (SELECT IFNULL(AVG(rating), 0) FROM reviews r WHERE r.clinic_id = c.id AND r.is_approved = true) as avg_rating,
                      (SELECT COUNT(*) FROM reviews r WHERE r.clinic_id = c.id AND r.is_approved = true) as reviews_count
               FROM clinics c JOIN users u ON c.owner_id = u.id WHERE c.is_active = true`;
    let countSql = 'SELECT COUNT(*) as count FROM clinics c JOIN users u ON c.owner_id = u.id WHERE c.is_active = true';
    const params = [];
    const countParams = [];

    if (query) {
      sql += ' AND (c.name LIKE ? OR c.description LIKE ? OR c.city LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      countSql += ' AND (c.name LIKE ? OR c.description LIKE ? OR c.city LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
      const like = `%${query}%`;
      params.push(like, like, like, like, like);
      countParams.push(like, like, like, like, like);
    }

    if (city && city !== 'All') {
      sql += ' AND c.city LIKE ?';
      countSql += ' AND c.city LIKE ?';
      const like = `%${city}%`;
      params.push(like);
      countParams.push(like);
    }

    if (specialization && specialization !== 'All') {
      sql += ' AND (c.description LIKE ? OR c.name LIKE ?)';
      countSql += ' AND (c.description LIKE ? OR c.name LIKE ?)';
      const like = `%${specialization}%`;
      params.push(like, like);
      countParams.push(like, like);
    }

    sql += ' ORDER BY c.name ASC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.execute(sql, params);
    const [countRows] = await db.execute(countSql, countParams);

    return { clinics: rows, total: parseInt(countRows[0].count, 10), page, limit };
  },

  async getAvailableSlots(clinicId, dateStr, serviceId) {
    if (!dateStr) return { available: false, message: 'Date is required.', slots: [] };

    // 1. Determine day of week
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    const dayOfWeek = dateObj.getDay();

    // 2. Fetch clinic schedule for dayOfWeek
    const [schedules] = await db.execute(
      'SELECT * FROM clinic_schedules WHERE clinic_id = ? AND day_of_week = ?',
      [clinicId, dayOfWeek]
    );

    let schedule = schedules[0];
    if (!schedule) {
      if (dayOfWeek === 0) {
        return { available: false, message: 'Clinic is closed on Sundays.', slots: [] };
      }
      schedule = { day_of_week: dayOfWeek, start_time: '09:00:00', end_time: '17:00:00', is_available: 1 };
    }

    if (!schedule.is_available) {
      return { available: false, message: 'Clinic is closed on this day.', slots: [] };
    }

    // 3. Service duration
    let durationMinutes = 30;
    if (serviceId) {
      const [serviceRows] = await db.execute(
        'SELECT duration_minutes FROM clinic_services WHERE id = ?',
        [serviceId]
      );
      if (serviceRows[0]?.duration_minutes) {
        durationMinutes = parseInt(serviceRows[0].duration_minutes, 10);
      }
    }

    // 4. Fetch existing active appointments for date
    const [appts] = await db.execute(
      `SELECT start_time, end_time FROM appointments 
       WHERE clinic_id = ? AND appointment_date = ? AND status NOT IN ('cancelled', 'rejected')`,
      [clinicId, dateStr]
    );

    // 5. Generate slots
    const startParts = schedule.start_time.split(':').map(Number);
    const endParts = schedule.end_time.split(':').map(Number);
    const startMins = startParts[0] * 60 + (startParts[1] || 0);
    const endMins = endParts[0] * 60 + (endParts[1] || 0);

    const slots = [];
    for (let cur = startMins; cur + durationMinutes <= endMins; cur += durationMinutes) {
      const slotStartH = String(Math.floor(cur / 60)).padStart(2, '0');
      const slotStartM = String(cur % 60).padStart(2, '0');
      const slotEndH = String(Math.floor((cur + durationMinutes) / 60)).padStart(2, '0');
      const slotEndM = String((cur + durationMinutes) % 60).padStart(2, '0');

      const startTimeStr = `${slotStartH}:${slotStartM}:00`;
      const endTimeStr = `${slotEndH}:${slotEndM}:00`;

      // Check conflict
      const isBooked = appts.some(a => {
        const aStart = a.start_time.substring(0, 8);
        const aEnd = a.end_time.substring(0, 8);
        return aStart < endTimeStr && aEnd > startTimeStr;
      });

      slots.push({
        start_time: `${slotStartH}:${slotStartM}`,
        end_time: `${slotEndH}:${slotEndM}`,
        available: !isBooked,
      });
    }

    return {
      available: true,
      operating_hours: { start_time: schedule.start_time, end_time: schedule.end_time },
      duration_minutes: durationMinutes,
      slots,
    };
  },

  async getStaff(clinicId) {
    const [rows] = await db.execute(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.avatar_url, cs.role, cs.is_active
       FROM clinic_staff cs JOIN users u ON cs.user_id = u.id WHERE cs.clinic_id = ?`,
      [clinicId]
    );
    return rows;
  },

  async getSchedules(clinicId) {
    const [rows] = await db.execute(
      'SELECT * FROM clinic_schedules WHERE clinic_id = ? ORDER BY day_of_week',
      [clinicId]
    );
    return rows;
  },

  async updateSchedules(clinicId, schedules) {
    await db.execute('DELETE FROM clinic_schedules WHERE clinic_id = ?', [clinicId]);
    for (const s of schedules) {
      const scheduleId = generateUUID();
      await db.execute(
        'INSERT INTO clinic_schedules (id, clinic_id, day_of_week, start_time, end_time, is_available) VALUES (?, ?, ?, ?, ?, ?)',
        [scheduleId, clinicId, s.day_of_week, s.start_time, s.end_time, s.is_available ? 1 : 0]
      );
    }
    return this.getSchedules(clinicId);
  },

  async addStaff(clinicId, userId, role) {
    const id = generateUUID();
    await db.execute(
      'INSERT INTO clinic_staff (id, clinic_id, user_id, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role), is_active = true',
      [id, clinicId, userId, role]
    );
    const [rows] = await db.execute(
      'SELECT * FROM clinic_staff WHERE clinic_id = ? AND user_id = ?',
      [clinicId, userId]
    );
    return rows[0];
  },

  async removeStaff(clinicId, userId) {
    await db.execute(
      'UPDATE clinic_staff SET is_active = false WHERE clinic_id = ? AND user_id = ?',
      [clinicId, userId]
    );
  },
};

module.exports = Clinic;
