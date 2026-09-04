const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const {
  buildCorsOptions, createHttpsMiddleware, getHttpsConfig, getJwtConfig, getTrustProxy, validateHttpsDeployment,
} = require('../src/config/security');
const { sanitizeAuditDetails } = require('../src/utils/audit');
const { publicClinic, publicDoctor } = require('../src/serializers/public');
const { ensureAppointmentModificationAllowed } = require('../src/utils/appointments');
const { createTextPdf } = require('../src/utils/pdf');
const { normalizeFeatureSet } = require('../src/config/features');
const { validateDateOfBirth, validateAppointmentClock, localClock } = require('../src/utils/dateTime');
const db = require('../src/config/database');
const { clinicAccess } = require('../src/middleware/rbac');
const messageController = require('../src/controllers/messageController');
const prescriptionController = require('../src/controllers/prescriptionController');
const Prescription = require('../src/models/Prescription');

function corsDecision(options, origin) {
  return new Promise((resolve) => options.origin(origin, (error, allowed) => resolve({ error, allowed })));
}

async function requestApp({ trusted, secureHeader, healthExempt = false, path = '/private' }) {
  const app = express();
  if (trusted) app.set('trust proxy', 1);
  app.use(createHttpsMiddleware({ enforce: true, healthCheckExempt: healthExempt, httpsPort: 443, hstsMaxAge: 1000 }));
  app.get('*', (req, res) => res.status(200).send('ok'));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    return await new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port: server.address().port, path, headers: secureHeader ? { 'x-forwarded-proto': secureHeader, host: 'clinic.example' } : { host: 'clinic.example' } }, (res) => {
        res.resume(); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers }));
      });
      req.on('error', reject); req.end();
    });
  } finally { await new Promise((resolve) => server.close(resolve)); }
}

test('production JWT configuration fails closed', () => {
  assert.throws(() => getJwtConfig({ NODE_ENV: 'production', FRONTEND_URL: 'https://clinic.example' }), /JWT_SECRET/);
  assert.throws(() => getJwtConfig({ NODE_ENV: 'production', JWT_SECRET: 'dev_secret_key_12345' }), /JWT_SECRET/);
  const config = getJwtConfig({ NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(64) });
  assert.deepEqual(config.algorithms, ['HS256']);
});

test('CORS allows configured origins and rejects unknown origins', async () => {
  const options = buildCorsOptions({ NODE_ENV: 'production', FRONTEND_URL: 'https://clinic.example' });
  assert.equal((await corsDecision(options, 'https://clinic.example')).allowed, true);
  assert.equal((await corsDecision(options, undefined)).allowed, true);
  assert.match((await corsDecision(options, 'https://evil.example')).error.message, /not allowed/);
  assert.equal(options.credentials, true);
});

test('development CORS includes only explicit localhost origins', async () => {
  const options = buildCorsOptions({ NODE_ENV: 'development' });
  assert.equal((await corsDecision(options, 'http://localhost:5173')).allowed, true);
  assert.ok((await corsDecision(options, 'http://localhost:9999')).error);
});

test('HTTPS redirects HTTP and ignores forged forwarded protocol from untrusted clients', async () => {
  assert.equal((await requestApp({ trusted: false })).status, 308);
  assert.equal((await requestApp({ trusted: false, secureHeader: 'https' })).status, 308);
});

test('trusted proxy HTTPS passes without a redirect loop and health exemption is configurable', async () => {
  assert.equal((await requestApp({ trusted: true, secureHeader: 'https' })).status, 200);
  assert.equal((await requestApp({ trusted: false, healthExempt: true, path: '/api/health' })).status, 200);
  assert.equal(getTrustProxy({ TRUST_PROXY: 'true' }), 1);
});

test('development does not redirect by default', () => {
  assert.equal(getHttpsConfig({ NODE_ENV: 'development' }).enforce, false);
  assert.throws(() => validateHttpsDeployment({ NODE_ENV: 'production', JWT_SECRET: 'a'.repeat(64) }), /TRUST_PROXY/);
  assert.equal(validateHttpsDeployment({ NODE_ENV: 'production', TRUST_PROXY: 'true' }).enforce, true);
});

test('production HTTPS responses include HSTS', async () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try {
    const response = await requestApp({ trusted: true, secureHeader: 'https' });
    assert.equal(response.status, 200);
    assert.match(response.headers['strict-transport-security'], /max-age=1000/);
  } finally { process.env.NODE_ENV = previous; }
});

test('audit sanitization recursively removes PHI while retaining identifiers', () => {
  const value = sanitizeAuditDetails({ patientId: 'p1', nested: { diagnosis: 'secret', treatmentPlan: 'secret', recordId: 'r1' }, symptoms: ['secret'] });
  assert.deepEqual(value, { patientId: 'p1', nested: { recordId: 'r1' } });
});

test('public serializers never return staff private contact or owner metadata', () => {
  const clinic = publicClinic({ id: 'c1', name: 'Clinic', owner_id: 'u1', owner_email: 'private@example.com', primary_doctor_id: 'd1' });
  const doctor = publicDoctor({ doctor_id: 'd1', first_name: 'Ada', email: 'private@example.com', phone: '123' });
  assert.equal(clinic.owner_id, undefined); assert.equal(clinic.owner_email, undefined);
  assert.equal(doctor.email, undefined); assert.equal(doctor.phone, undefined);
});

test('appointment modifications reject now, past, inactive, and terminal appointments', () => {
  const future = { appointment_date: '2030-01-02', start_time: '10:00:00', status: 'scheduled', clinic_is_active: 1 };
  assert.equal(ensureAppointmentModificationAllowed(future, new Date('2030-01-01T10:00:00Z')).allowed, true);
  assert.equal(ensureAppointmentModificationAllowed(future, new Date('2030-01-02T10:00:00Z')).allowed, false);
  assert.equal(ensureAppointmentModificationAllowed({ ...future, status: 'completed' }, new Date('2030-01-01')).allowed, false);
  assert.equal(ensureAppointmentModificationAllowed({ ...future, clinic_is_active: 0 }, new Date('2030-01-01')).allowed, false);
});

test('feature normalization is exact and does not grant unrelated features', () => {
  const features = normalizeFeatureSet(['Unlimited Consultations', 'Digital Prescriptions']);
  assert.equal(features.digital_prescriptions, true);
  assert.equal(features.messaging, undefined);
});

test('generated documents are valid PDF payloads', () => {
  const pdf = createTextPdf(['Patient: Test', 'Medication: Example'], 'Prescription');
  assert.equal(pdf.subarray(0, 8).toString(), '%PDF-1.4');
  assert.match(pdf.toString('binary'), /xref/);
  assert.match(pdf.toString('binary'), /Patient: Test/);
  assert.match(pdf.toString('binary'), /Medication: Example/);
});

test('DOB and appointment clocks reject impossible, future, and same-day past values', () => {
  const now = new Date('2030-05-20T10:30:00Z');
  assert.equal(validateDateOfBirth('2030-02-30', now).valid, false);
  assert.equal(validateDateOfBirth('2030-05-21', now).valid, false);
  assert.equal(validateDateOfBirth('2000-02-29', now).valid, true);
  assert.equal(validateAppointmentClock('2030-05-19', '12:00', '12:30', 'UTC', now).valid, false);
  assert.equal(validateAppointmentClock('2030-05-20', '10:30', '11:00', 'UTC', now).valid, false);
  assert.equal(validateAppointmentClock('2030-05-20', '10:31', '11:00', 'UTC', now).valid, true);
  assert.deepEqual(localClock(new Date('2030-05-20T18:30:00Z'), 'Asia/Dhaka'), { date: '2030-05-21', time: '00:30' });
});

test('clinic context permits owner and active staff clinics but denies cross-tenant and inactive access', async () => {
  const originalQuery = db.query;
  const response = () => ({ statusCode: 200, payload: null, status(code) { this.statusCode = code; return this; }, json(value) { this.payload = value; return this; } });
  const invoke = async (clinic, staff = []) => {
    let call = 0;
    db.query = async () => (++call === 1 ? [[clinic], []] : [staff, []]);
    const req = { params: { clinicId: clinic.id }, body: {}, query: {}, user: { id: 'doctor-a', role: 'doctor' }, baseUrl: '/api/clinics/clinic/appointments', method: 'GET' };
    const res = response();
    let passed = false;
    await clinicAccess(req, res, () => { passed = true; });
    return { req, res, passed };
  };
  try {
    const owner = await invoke({ id: 'clinic-a', owner_id: 'doctor-a', is_active: 1, timezone: 'UTC' });
    assert.equal(owner.passed, true);
    const staff = await invoke({ id: 'clinic-b', owner_id: 'doctor-b', is_active: 1, timezone: 'UTC' }, [{ id: 'staff-1', role: 'doctor', is_active: 1 }]);
    assert.equal(staff.passed, true);
    const denied = await invoke({ id: 'clinic-c', owner_id: 'doctor-c', is_active: 1, timezone: 'UTC' });
    assert.equal(denied.res.statusCode, 403);
    const inactive = await invoke({ id: 'clinic-d', owner_id: 'doctor-a', is_active: 0, timezone: 'UTC' });
    assert.equal(inactive.res.statusCode, 403);
  } finally { db.query = originalQuery; }
});

test('message sender identity cannot be supplied as another account', async () => {
  const req = { body: { sender_id: 'attacker', receiver_id: 'doctor-b', message: 'hello' }, user: { id: 'patient-a', role: 'patient' } };
  const res = { statusCode: 200, payload: null, status(code) { this.statusCode = code; return this; }, json(value) { this.payload = value; return this; } };
  await messageController.sendMessage(req, res, (error) => { throw error; });
  assert.equal(res.statusCode, 403);
  assert.match(res.payload.message, /authenticated account/);
});

test('a doctor cannot edit another doctor\'s prescription', async () => {
  const originalFindById = Prescription.findById;
  Prescription.findById = async () => ({ id: 'rx-1', clinic_id: 'clinic-a', patient_id: 'patient-a', doctor_id: 'doctor-b' });
  const req = { params: { id: 'rx-1', clinicId: 'clinic-a' }, body: { patient_id: 'patient-a', diagnosis: 'Updated', items: [] }, user: { id: 'doctor-a', role: 'doctor' } };
  const res = { statusCode: 200, payload: null, status(code) { this.statusCode = code; return this; }, json(value) { this.payload = value; return this; } };
  try {
    await prescriptionController.update(req, res, (error) => { throw error; });
    assert.equal(res.statusCode, 403);
    assert.match(res.payload.message, /prescribing doctor/);
  } finally { Prescription.findById = originalFindById; }
});
