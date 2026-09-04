const db = require('../config/database');
const { generateSlug, generateUUID } = require('../utils/helpers');
const { isValidDateOnly, localClock } = require('../utils/dateTime');

const Clinic = {
  async create({ owner_id, name, description, phone, email, address, city, state, country, timezone, logo_url, banner_url }) {
    const slug = generateSlug(name);
    const id = generateUUID();
    await db.execute(
      `INSERT INTO clinics (id, owner_id, name, slug, description, phone, email, address, city, state, country, timezone, logo_url, banner_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, owner_id ?? null, name ?? null, slug, description ?? null, phone ?? null, email ?? null, address ?? null, city ?? null, state ?? null, country ?? null, timezone || 'UTC', logo_url ?? null, banner_url ?? null]
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

  async findAccessibleByUser(userId) {
    const [rows] = await db.execute(
      `SELECT DISTINCT c.*, CASE WHEN c.owner_id = ? THEN 'owner' ELSE cs.role END AS access_role
       FROM clinics c
       LEFT JOIN clinic_staff cs ON cs.clinic_id = c.id AND cs.user_id = ? AND cs.is_active = 1
       WHERE c.owner_id = ? OR cs.id IS NOT NULL
       ORDER BY c.is_active DESC, c.name ASC`,
      [userId, userId, userId]
    );
    return rows;
  },

  async findByOwner(ownerId) {
    return this.findAccessibleByUser(ownerId);
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
    const allowedFields = ['name', 'description', 'phone', 'email', 'address', 'city', 'state', 'country', 'timezone', 'postal_code', 'latitude', 'longitude', 'website', 'logo_url', 'banner_url', 'is_active'];
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
    let sql = `SELECT c.id, c.name, c.slug, c.description, c.address, c.city, c.state, c.country,
                      c.postal_code, c.latitude, c.longitude, c.phone, c.email, c.website,
                      c.logo_url, c.banner_url, c.owner_id as primary_doctor_id, u.first_name as doctor_first_name, u.last_name as doctor_last_name,
                      (SELECT GROUP_CONCAT(DISTINCT dp.specialization SEPARATOR ', ')
                       FROM doctor_profiles dp
                       LEFT JOIN clinic_staff cs2 ON cs2.user_id = dp.user_id AND cs2.clinic_id = c.id AND cs2.is_active = 1
                       WHERE dp.specialization IS NOT NULL AND (dp.user_id = c.owner_id OR cs2.id IS NOT NULL)) as specializations,
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
      const specializationClause = ` AND (
        EXISTS (SELECT 1 FROM doctor_profiles dp
                LEFT JOIN clinic_staff cs2 ON cs2.user_id = dp.user_id AND cs2.clinic_id = c.id AND cs2.is_active = 1
                WHERE (dp.user_id = c.owner_id OR cs2.id IS NOT NULL) AND dp.specialization LIKE ?)
        OR EXISTS (SELECT 1 FROM clinic_services svc WHERE svc.clinic_id = c.id AND svc.is_active = 1 AND svc.name LIKE ?)
      )`;
      sql += specializationClause;
      countSql += specializationClause;
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

  async getAvailableSlots(clinicId, dateStr, serviceId, doctorId, requireConfiguredSchedule = false, timeZone = 'UTC') {
    if (!dateStr) return { available: false, message: 'Date is required.', slots: [] };
    if (!isValidDateOnly(dateStr)) return { available: false, message: 'Date must be a real date in YYYY-MM-DD format.', slots: [] };
    const currentClock = localClock(new Date(), timeZone);
    if (dateStr < currentClock.date) return { available: false, message: 'Past appointment dates are unavailable.', slots: [] };

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
      if (requireConfiguredSchedule) return { available: false, message: 'No operating schedule is configured for this date.', slots: [] };
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
        'SELECT duration_minutes FROM clinic_services WHERE id = ? AND clinic_id = ? AND is_active = 1',
        [serviceId, clinicId]
      );
      if (serviceRows[0]?.duration_minutes) {
        durationMinutes = parseInt(serviceRows[0].duration_minutes, 10);
      }
    }

    // 4. Fetch existing active appointments for date
    let appointmentSql = `SELECT start_time, end_time FROM appointments
       WHERE clinic_id = ? AND appointment_date = ? AND status NOT IN ('cancelled', 'no_show')`;
    const appointmentParams = [clinicId, dateStr];
    if (doctorId) {
      appointmentSql += ' AND doctor_id = ?';
      appointmentParams.push(doctorId);
    }
    const [appts] = await db.execute(appointmentSql, appointmentParams);

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

      const currentMinutes = Number(currentClock.time.slice(0, 2)) * 60 + Number(currentClock.time.slice(3, 5));
      const isPastToday = dateStr === currentClock.date && cur <= currentMinutes;
      slots.push({
        start_time: `${slotStartH}:${slotStartM}`,
        end_time: `${slotEndH}:${slotEndM}`,
        available: !isBooked && !isPastToday,
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

  async getPublicDoctors(clinicId) {
    const [rows] = await db.execute(
      `SELECT u.id as doctor_id, u.first_name, u.last_name, u.avatar_url,
              dp.qualifications, dp.specialization, dp.experience_years, dp.consultation_fee, dp.bio
       FROM clinic_staff cs
       JOIN users u ON cs.user_id = u.id
       LEFT JOIN doctor_profiles dp ON dp.user_id = u.id
       WHERE cs.clinic_id = ? AND cs.role = 'doctor' AND cs.is_active = 1 AND u.is_active = 1`,
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
    await db.transaction(async (connection) => {
      await connection.execute('DELETE FROM clinic_schedules WHERE clinic_id = ?', [clinicId]);
      for (const s of schedules) {
        await connection.execute(
          'INSERT INTO clinic_schedules (id, clinic_id, day_of_week, start_time, end_time, is_available) VALUES (?, ?, ?, ?, ?, ?)',
          [generateUUID(), clinicId, s.day_of_week, s.start_time, s.end_time, s.is_available ? 1 : 0]
        );
      }
    });
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
