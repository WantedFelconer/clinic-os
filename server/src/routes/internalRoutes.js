const router = require('express').Router();
const crypto = require('crypto');
const { runAppointmentReminders } = require('../services/appointmentReminderService');

const runScheduledReminders = async (req, res, next) => {
  try {
    const expected = Buffer.from(process.env.CRON_SECRET || '');
    const supplied = Buffer.from(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
    if (!expected.length || expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
      return res.status(401).json({ message: 'Unauthorized scheduler request.' });
    }
    res.json(await runAppointmentReminders());
  } catch (error) { next(error); }
};

// Vercel Cron sends GET; POST remains available to other authenticated schedulers.
router.route('/appointment-reminders').get(runScheduledReminders).post(runScheduledReminders);

module.exports = router;
