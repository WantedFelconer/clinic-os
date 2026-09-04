const { isValidDateOnly, localClock } = require('./dateTime');

function normalizeDateString(dateVal) {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const str = String(dateVal).trim();
  if (str.includes('T')) return str.split('T')[0];
  return str.slice(0, 10);
}

function normalizeTimeString(timeVal) {
  if (!timeVal) return '';
  const str = String(timeVal).trim();
  const parts = str.split(':');
  if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  return str.slice(0, 5);
}

function appointmentStart(appointment) {
  const date = normalizeDateString(appointment.appointment_date);
  const time = normalizeTimeString(appointment.start_time);
  if (!isValidDateOnly(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  return { date, time };
}

function ensureAppointmentModificationAllowed(appointment, now = new Date()) {
  if (!appointment) return { allowed: false, status: 404, message: 'Appointment not found.' };
  if (!appointment.clinic_is_active) return { allowed: false, status: 409, message: 'This clinic is inactive.' };
  if (['completed', 'cancelled', 'no_show'].includes(appointment.status)) {
    return { allowed: false, status: 409, message: `Cannot modify an appointment with status '${appointment.status}'.` };
  }
  const startsAt = appointmentStart(appointment);
  if (!startsAt) return { allowed: false, status: 400, message: 'Appointment start time is invalid.' };
  const clock = localClock(now, appointment.clinic_timezone || appointment.timezone || 'UTC');
  if (startsAt.date < clock.date || (startsAt.date === clock.date && startsAt.time <= clock.time)) {
    return { allowed: false, status: 409, message: 'Appointments cannot be cancelled or rescheduled once the consultation time has started.' };
  }
  return { allowed: true, startsAt };
}

module.exports = { appointmentStart, normalizeDateString, normalizeTimeString, ensureAppointmentModificationAllowed };
