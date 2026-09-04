const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

function isValidDateOnly(value) {
  if (!DATE_PATTERN.test(String(value || ''))) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function isValidTimeZone(timeZone) {
  try { new Intl.DateTimeFormat('en-US', { timeZone }).format(); return true; } catch { return false; }
}

function localClock(now = new Date(), timeZone = 'UTC') {
  const safeZone = isValidTimeZone(timeZone) ? timeZone : 'UTC';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { date: `${value.year}-${value.month}-${value.day}`, time: `${value.hour}:${value.minute}` };
}

function validateDateOfBirth(value, now = new Date(), timeZone = 'UTC') {
  if (!isValidDateOnly(value)) return { valid: false, error: 'Date of birth must be a real date in YYYY-MM-DD format.' };
  if (value > localClock(now, timeZone).date) return { valid: false, error: 'Date of birth cannot be in the future.' };
  return { valid: true };
}

function validateAppointmentClock(date, startTime, endTime, timeZone = 'UTC', now = new Date()) {
  if (!isValidDateOnly(date)) return { valid: false, error: 'Appointment date must be a real date in YYYY-MM-DD format.' };
  if (!TIME_PATTERN.test(String(startTime || ''))) return { valid: false, error: 'Appointment start time must use HH:MM format.' };
  if (!TIME_PATTERN.test(String(endTime || ''))) return { valid: false, error: 'Appointment end time must use HH:MM format.' };
  const start = startTime.slice(0, 5);
  const end = endTime.slice(0, 5);
  if (start >= end) return { valid: false, error: 'Appointment end time must be after start time.' };
  const clock = localClock(now, timeZone);
  if (date < clock.date || (date === clock.date && start <= clock.time)) return { valid: false, error: 'Cannot book an appointment in the past.' };
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
  if (durationMinutes < 5 || durationMinutes > 480) return { valid: false, error: 'Appointment duration must be between 5 and 480 minutes.' };
  return { valid: true, startTime: start, endTime: end, durationMinutes };
}

module.exports = { isValidDateOnly, isValidTimeZone, localClock, validateDateOfBirth, validateAppointmentClock };
