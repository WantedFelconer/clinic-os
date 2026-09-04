const db = require('../../../core/config/database');
const { Notification } = require('../../communications');
const { sendAppointmentReminder } = require('../../../core/utils/email');

async function runAppointmentReminders() {
  const reminderHours = Math.max(1, Math.min(168, Number(process.env.APPOINTMENT_REMINDER_HOURS || 24)));
  const [appointments] = await db.execute(
    `SELECT a.id, a.appointment_date, a.start_time, p.user_id as patient_user_id,
            p.first_name, p.last_name, p.email, c.name as clinic_name,
            d.first_name as doctor_first_name, d.last_name as doctor_last_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     JOIN clinics c ON c.id = a.clinic_id
     LEFT JOIN users d ON d.id = a.doctor_id
     WHERE a.reminder_sent_at IS NULL
       AND a.status IN ('scheduled', 'confirmed')
       AND TIMESTAMP(a.appointment_date, a.start_time) > NOW()
       AND TIMESTAMP(a.appointment_date, a.start_time) <= DATE_ADD(NOW(), INTERVAL ? HOUR)
     ORDER BY a.appointment_date, a.start_time LIMIT 100`,
    [reminderHours]
  );

  let sent = 0;
  for (const appointment of appointments) {
    const [claim] = await db.execute(
      'UPDATE appointments SET reminder_sent_at = NOW() WHERE id = ? AND reminder_sent_at IS NULL',
      [appointment.id]
    );
    if (!claim.affectedRows) continue;

    if (appointment.patient_user_id) {
      try { await Notification.create({
        user_id: appointment.patient_user_id,
        title: 'Upcoming Appointment Reminder',
        message: `You have an appointment at ${appointment.clinic_name} on ${appointment.appointment_date} at ${String(appointment.start_time).slice(0, 5)}.`,
        type: 'info', reference_type: 'appointment', reference_id: appointment.id,
      }); } catch (error) {
        await db.execute('UPDATE appointments SET reminder_sent_at = NULL WHERE id = ?', [appointment.id]);
        console.warn('[Reminder Notification Warning]:', error.message);
        continue;
      }
    }
    if (appointment.email) {
      await sendAppointmentReminder({
        to: appointment.email,
        patientName: `${appointment.first_name} ${appointment.last_name}`,
        clinicName: appointment.clinic_name,
        doctorName: appointment.doctor_first_name ? `Dr. ${appointment.doctor_first_name} ${appointment.doctor_last_name || ''}` : '',
        date: appointment.appointment_date,
        time: String(appointment.start_time).slice(0, 5),
      }).catch((error) => console.warn('[Reminder Email Warning]:', error.message));
    }
    sent += 1;
  }
  return { examined: appointments.length, sent };
}

function startAppointmentReminderWorker() {
  const intervalMs = Math.max(60000, Number(process.env.APPOINTMENT_REMINDER_POLL_MS || 900000));
  const timer = setInterval(() => runAppointmentReminders().catch((error) => console.error('Appointment reminder worker failed:', error.message)), intervalMs);
  timer.unref();
  return timer;
}

module.exports = { runAppointmentReminders, startAppointmentReminderWorker };
