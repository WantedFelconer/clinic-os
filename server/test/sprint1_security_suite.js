process.env.NODE_ENV = 'test';
const http = require('http');
const assert = require('assert');
const app = require('../src/index');
const db = require('../src/config/database');

const TEST_PORT = 5098;
let server;

function makeRequest(path, { method = 'GET', headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: TEST_PORT,
        path: `/api${path}`,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let responseBody = '';
        res.on('data', (chunk) => (responseBody += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = responseBody ? JSON.parse(responseBody) : {};
          } catch {
            data = { raw: responseBody };
          }
          resolve({ status: res.statusCode, headers: res.headers, data });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function getNextOperatingDate(targetDayOfWeek = 2) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() !== targetDayOfWeek) {
    d.setDate(d.getDate() + 1);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const testResults = [];

function recordTest(name, passed, details = '') {
  testResults.push({ name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${icon}: ${name}${details ? ` [${details}]` : ''}`);
}

async function runSprint1SecuritySuite() {
  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log('  ANTIGRAVITY SPRINT 1 — DATABASE, SECURITY & AUTHORIZATION HARDENING');
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`[Sprint 1 Security Server] Listening on http://127.0.0.1:${TEST_PORT}\n`);
      resolve();
    });
  });

  try {
    // Clean any previous test appointments
    try {
      await db.execute('DELETE FROM appointments WHERE id NOT LIKE "a-seed-%"');
    } catch (e) {}

    // =========================================================================
    // 1. PURE MYSQL ENGINE VERIFICATION
    // =========================================================================
    console.log('--- 1. PURE MYSQL ENGINE & SCHEMA INTEGRITY ---');
    const [dbVersion] = await db.query('SELECT VERSION() as version, DATABASE() as db_name');
    recordTest(
      'Database connection is pure MySQL',
      !!dbVersion[0]?.version && dbVersion[0]?.db_name === 'clinic_os',
      `MySQL Version: ${dbVersion[0]?.version}, DB: ${dbVersion[0]?.db_name}`
    );

    const [tableList] = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()`
    );
    const tables = tableList.map((t) => t.TABLE_NAME || t.table_name);
    const requiredTables = ['users', 'doctor_profiles', 'clinics', 'clinic_staff', 'clinic_schedules', 'clinic_services', 'consultation_packages', 'patients', 'appointments', 'medical_records', 'prescriptions', 'prescription_items', 'medical_reports', 'payments', 'reviews', 'subscription_plans', 'clinic_subscriptions', 'notifications', 'messages', 'audit_logs'];
    const allTablesPresent = requiredTables.every((tbl) => tables.includes(tbl));
    recordTest('All 20 authoritative MySQL tables exist in database', allTablesPresent, `Found ${tables.length} tables`);

    // =========================================================================
    // 2. AUTHENTICATION, CRYPTOGRAPHIC OTP & USER ENUMERATION PROTECTION
    // =========================================================================
    console.log('\n--- 2. AUTHENTICATION, CRYPTOGRAPHIC OTP & ENUMERATION HARDENING ---');
    const testPatientEmail = `test.patient.${Date.now()}@example.com`;
    const regRes = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        email: testPatientEmail,
        password: 'password123',
        role: 'patient',
        first_name: 'Test',
        last_name: 'Patient',
      },
    });
    const devOtp = regRes.data?.dev_otp;
    recordTest(
      'Registration generates 6-digit numeric cryptographic OTP',
      regRes.status === 201 && /^\d{6}$/.test(devOtp),
      `OTP: ${devOtp}`
    );

    // Verify OTP with invalid code
    const invalidOtpRes = await makeRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email: testPatientEmail, otp: '000000' },
    });
    recordTest('Invalid OTP verification rejected (400)', invalidOtpRes.status === 400);

    // Verify OTP with valid code
    const validOtpRes = await makeRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email: testPatientEmail, otp: devOtp },
    });
    recordTest('Valid OTP verification succeeds (200)', validOtpRes.status === 200);

    // User enumeration protection on password reset
    const resetNonExistent = await makeRequest('/auth/forgot-password', {
      method: 'POST',
      body: { email: 'nonexistent.user.12345@unknown-domain.com' },
    });
    recordTest(
      'Password reset does not enumerate non-existent emails (Generic 200 response)',
      resetNonExistent.status === 200 && resetNonExistent.data.message.includes('If an account exists')
    );

    // Login with seeded credentials
    const adminLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'admin@clinic-os.com', password: 'password123' },
    });
    const adminToken = adminLogin.data?.token;
    recordTest('Platform Admin login successful', adminLogin.status === 200 && !!adminToken);

    const docLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'dr.rahman@clinic-os.com', password: 'password123' },
    });
    const doctorToken = docLogin.data?.token;
    const doctorId = docLogin.data?.user?.id;
    recordTest('Clinic Doctor login successful', docLogin.status === 200 && !!doctorToken);

    const patLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'patient@example.com', password: 'password123' },
    });
    const patientToken = patLogin.data?.token;
    const patientUserId = patLogin.data?.user?.id;
    recordTest('Patient login successful', patLogin.status === 200 && !!patientToken);

    // Login failure audit logging check
    const failedLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'dr.rahman@clinic-os.com', password: 'wrongpassword' },
    });
    recordTest('Invalid password login rejected (401)', failedLogin.status === 401);

    const [loginAudit] = await db.query(
      `SELECT action FROM audit_logs WHERE action IN ('LOGIN', 'LOGIN_FAILED') ORDER BY created_at DESC LIMIT 2`
    );
    recordTest('Login and Login Failure events recorded in audit_logs', loginAudit.length >= 1);

    // =========================================================================
    // 3. BACKEND VALIDATION LAYER (express-validator)
    // =========================================================================
    console.log('\n--- 3. BACKEND VALIDATION LAYER ENFORCEMENT ---');
    const invalidEmailReg = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        email: 'invalid-email-format',
        password: '123', // too short
        role: 'invalid_role',
        first_name: '',
      },
    });
    recordTest(
      'Validator blocks malformed email, weak password, and invalid role (400)',
      invalidEmailReg.status === 400 && Array.isArray(invalidEmailReg.data.errors)
    );

    // Get doctor clinic
    const clinicsRes = await makeRequest('/clinics', {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const clinicId = clinicsRes.data?.clinics?.[0]?.id;
    assert(clinicId, 'Primary clinic must exist for test');

    const invalidApptDate = await makeRequest(`/clinics/${clinicId}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: {
        appointment_date: 'invalid-date',
        start_time: '25:99',
      },
    });
    recordTest('Validator blocks malformed appointment date & time (400)', invalidApptDate.status === 400);

    const invalidPaymentAmount = await makeRequest(`/clinics/${clinicId}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        patient_id: 'p-patient-001',
        amount: -500, // negative amount
      },
    });
    recordTest('Validator blocks negative payment amounts (400)', invalidPaymentAmount.status === 400);

    const invalidReviewRating = await makeRequest(`/clinics/${clinicId}/reviews`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: {
        rating: 10, // outside 1-5
      },
    });
    recordTest('Validator blocks review ratings outside 1-5 (400)', invalidReviewRating.status === 400);

    // =========================================================================
    // 4. MULTI-LAYERED AUTHORIZATION & IDOR FIXES
    // =========================================================================
    console.log('\n--- 4. MULTI-LAYERED RESOURCE AUTHORIZATION & ANTI-IDOR ---');

    // 4.1. Patient Identity Resolution (Never trust req.body.patient_id for patients)
    const validWeekdayStr = getNextOperatingDate(2); // Next Tuesday

    const apptWithSpoofedPatient = await makeRequest(`/clinics/${clinicId}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: {
        patient_id: 'spoofed-victim-patient-id-999', // should be ignored in favor of authenticated patient
        doctor_id: doctorId,
        appointment_date: validWeekdayStr,
        start_time: '11:00',
        type: 'in-person',
      },
    });
    const bookedAppt = apptWithSpoofedPatient.data?.appointment;
    recordTest(
      'Patient booking securely resolves patient identity from JWT (Anti-IDOR)',
      apptWithSpoofedPatient.status === 201 && bookedAppt?.patient_user_id === patientUserId,
      `Patient User ID: ${bookedAppt?.patient_user_id}`
    );

    // 4.2. Cross-Patient Medical Record Confidentiality & IDOR Protection
    const [allMedicalRecords] = await db.query(`SELECT id FROM medical_records WHERE clinic_id = ? LIMIT 1`, [clinicId]);
    const sampleEmrId = allMedicalRecords[0]?.id;

    // Create a 2nd patient
    const p2Email = `patient2.${Date.now()}@example.com`;
    const patient2Login = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        email: p2Email,
        password: 'password123',
        role: 'patient',
        first_name: 'Patient',
        last_name: 'Two',
      },
    });
    const patient2Otp = patient2Login.data?.dev_otp;
    await makeRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email: p2Email, otp: patient2Otp },
    });
    const p2Auth = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: p2Email, password: 'password123' },
    });
    const patient2Token = p2Auth.data?.token;

    if (sampleEmrId && patient2Token) {
      const p2EmrAccess = await makeRequest(`/clinics/${clinicId}/medical-records/${sampleEmrId}`, {
        headers: { Authorization: `Bearer ${patient2Token}` },
      });
      recordTest(
        'Patient B is forbidden from reading Patient A medical record (Anti-IDOR 403)',
        p2EmrAccess.status === 403
      );
    }

    // 4.3. Platform Admin Separation from Direct Clinical EMR Dumps
    const adminEmrDump = await makeRequest(`/clinics/${clinicId}/medical-records`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordTest(
      'Platform Admin without clinic staff role blocked from unrestricted clinical EMR access (403)',
      adminEmrDump.status === 403
    );

    // 4.4. Clinic Ownership Enforcement on Configuration & Staffing
    const nonOwnerStaffAdd = await makeRequest(`/clinics/${clinicId}/staff`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: { email: 'assistant@clinic-os.com', role: 'assistant' },
    });
    recordTest(
      'Non-owner / non-admin cannot manage clinic staff (403 Forbidden)',
      nonOwnerStaffAdd.status === 403
    );

    // =========================================================================
    // 5. APPOINTMENT CONCURRENCY & TRANSACTIONAL DOUBLE-BOOKING PREVENTION
    // =========================================================================
    console.log('\n--- 5. CONCURRENCY & DOUBLE BOOKING PREVENTION (SELECT FOR UPDATE) ---');
    const raceDateStr = getNextOperatingDate(3); // Next Wednesday
    const raceTime = '11:00';

    // Send 2 concurrent booking requests for the exact same slot and doctor
    const [bookingReq1, bookingReq2] = await Promise.all([
      makeRequest(`/clinics/${clinicId}/appointments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patientToken}` },
        body: {
          doctor_id: doctorId,
          appointment_date: raceDateStr,
          start_time: raceTime,
          type: 'in-person',
        },
      }),
      makeRequest(`/clinics/${clinicId}/appointments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patientToken}` },
        body: {
          doctor_id: doctorId,
          appointment_date: raceDateStr,
          start_time: raceTime,
          type: 'in-person',
        },
      }),
    ]);

    const statuses = [bookingReq1.status, bookingReq2.status].sort();
    const isDoubleBookingPrevented = statuses[0] === 201 && statuses[1] === 409;
    recordTest(
      'Concurrent duplicate slot bookings handled atomically (1 Created 201, 1 Conflict 409)',
      isDoubleBookingPrevented,
      `Results: Statuses [${bookingReq1.status}, ${bookingReq2.status}]`
    );

    // =========================================================================
    // 6. PAYMENT STATE MACHINE INTEGRITY
    // =========================================================================
    console.log('\n--- 6. PAYMENT STATE MACHINE & FINANCIAL TRANSITIONS ---');
    const [patients] = await db.query('SELECT id FROM patients WHERE clinic_id = ? LIMIT 1', [clinicId]);
    const activePatientId = patients[0]?.id;

    const newInvoice = await makeRequest(`/clinics/${clinicId}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        patient_id: activePatientId,
        amount: 750,
        payment_method: 'card',
        payment_status: 'pending',
      },
    });
    const invoiceId = newInvoice.data?.payment?.id;
    recordTest('Generated invoice in pending status (201)', newInvoice.status === 201 && !!invoiceId);

    if (invoiceId) {
      // 1. Transition pending -> completed
      const markCompleted = await makeRequest(`/clinics/${clinicId}/payments/${invoiceId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${doctorToken}` },
        body: { status: 'completed', transaction_id: 'TXN-AUTO-999' },
      });
      recordTest('Valid transition: pending -> completed (200)', markCompleted.status === 200);

      // 2. Illegal transition: completed -> pending (reversion blocked)
      const illegalReversion = await makeRequest(`/clinics/${clinicId}/payments/${invoiceId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${doctorToken}` },
        body: { status: 'pending' },
      });
      recordTest('Illegal reversion: completed -> pending rejected (400)', illegalReversion.status === 400);

      // 3. Valid transition: completed -> refunded
      const markRefunded = await makeRequest(`/clinics/${clinicId}/payments/${invoiceId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${doctorToken}` },
        body: { status: 'refunded' },
      });
      recordTest('Valid transition: completed -> refunded (200)', markRefunded.status === 200);

      // 4. Illegal transition: refunded -> completed (terminal state blocked)
      const terminalReopen = await makeRequest(`/clinics/${clinicId}/payments/${invoiceId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${doctorToken}` },
        body: { status: 'completed' },
      });
      recordTest('Transition from terminal refunded status rejected (400)', terminalReopen.status === 400);
    }

    // =========================================================================
    // 7. AUDIT LOGGING COMPLETENESS
    // =========================================================================
    console.log('\n--- 7. AUDIT LOGGING VERIFICATION ---');
    const adminAuditLogs = await makeRequest('/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const logs = adminAuditLogs.data?.logs || [];
    const loggedActions = logs.map((l) => l.action);
    const hasCoreActions = ['APPOINTMENT_BOOKED', 'PAYMENT_CREATED', 'PAYMENT_STATUS_CHANGED'].some((a) =>
      loggedActions.includes(a)
    );
    recordTest(
      'Audit log captures critical business domain mutations',
      adminAuditLogs.status === 200 && logs.length > 0 && hasCoreActions,
      `Total Logged Actions in Audit Trail: ${logs.length}`
    );

  } catch (error) {
    console.error('\n❌ Uncaught error during Sprint 1 Security Suite:', error);
    recordTest('Sprint 1 Security Suite completed cleanly', false, error.message);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  // Summary
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('\n═══════════════════════════════════════════════════════════════════════════');
  console.log(`  SPRINT 1 HARDENING SUITE: ${passed}/${total} TESTS PASSED (${failed} failed)`);
  console.log('═══════════════════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    throw new Error(`${failed} tests failed in Sprint 1 Hardening Suite`);
  }
}

if (require.main === module) {
  runSprint1SecuritySuite()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runSprint1SecuritySuite };
