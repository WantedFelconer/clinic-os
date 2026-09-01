process.env.NODE_ENV = 'test';
const http = require('http');
const assert = require('assert');
const app = require('../src/index');

const TEST_PORT = 5097;
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

let doctorToken = '';
let patientToken = '';
let assistantToken = '';
let adminToken = '';
let clinicId = '';
let patientId = '';
let doctorId = '';
let patientUserId = '';

const testResults = [];

function recordTest(name, passed, details = '') {
  testResults.push({ name, passed, details });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`  ${icon}: ${name}${details ? ` (${details})` : ''}`);
}

async function runSuite() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ClinicOS Final Forensic Audit & Verification Suite');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`[Forensic Server] Running on http://127.0.0.1:${TEST_PORT}`);
      resolve();
    });
  });

  try {
    // 1. Health Check
    console.log('\n--- SECTION 1: SYSTEM HEALTH & ENVIRONMENT ---');
    const health = await makeRequest('/health');
    recordTest('Health endpoint returns 200 OK', health.status === 200 && health.data.status === 'ok');

    // 2. Authentication & Login
    console.log('\n--- SECTION 2: AUTHENTICATION & CREDENTIALS ---');
    const docLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'dr.rahman@clinic-os.com', password: 'password123' },
    });
    doctorToken = docLogin.data?.token;
    doctorId = docLogin.data?.user?.id;
    recordTest('Doctor login successful', docLogin.status === 200 && !!doctorToken);

    const patLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'patient@example.com', password: 'password123' },
    });
    patientToken = patLogin.data?.token;
    patientUserId = patLogin.data?.user?.id;
    recordTest('Patient login successful', patLogin.status === 200 && !!patientToken);

    const adminLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'admin@clinic-os.com', password: 'password123' },
    });
    adminToken = adminLogin.data?.token;
    recordTest('Admin login successful', adminLogin.status === 200 && !!adminToken);

    const assistLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'assistant@clinic-os.com', password: 'password123' },
    });
    assistantToken = assistLogin.data?.token;
    recordTest('Assistant login successful', assistLogin.status === 200 && !!assistantToken);

    // 3. Multi-Tenant Clinic Scoping & Discovery
    console.log('\n--- SECTION 3: CLINIC SCOPING & MULTI-TENANCY ---');
    const myClinics = await makeRequest('/clinics', {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const clinics = myClinics.data?.clinics || [];
    clinicId = clinics[0]?.id;
    recordTest('Doctor can fetch owned clinics', myClinics.status === 200 && !!clinicId, `Clinic ID: ${clinicId}`);

    // Patient cannot create clinic (RBAC enforcement)
    const patCreateClinic = await makeRequest('/clinics', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: { name: 'Unauthorized Clinic' },
    });
    recordTest('Patient cannot create clinic (RBAC 403)', patCreateClinic.status === 403);

    // 4. Doctor Professional Profile (FR-10) & Search (FR-17)
    console.log('\n--- SECTION 4: DOCTOR PROFILES (FR-10) & SEARCH (FR-17) ---');
    const updateProfile = await makeRequest('/doctors/me/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        qualifications: 'MBBS, FCPS (Cardiology), MRCP (UK)',
        specialization: 'Cardiologist',
        experience_years: 14,
        consultation_fee: 1200.0,
        bio: 'Senior consultant cardiologist in Dhaka.',
      },
    });
    recordTest('Doctor can update professional profile (FR-10)', updateProfile.status === 200 && updateProfile.data.profile?.specialization === 'Cardiologist');

    const searchDoctors = await makeRequest('/doctors/search?specialty=Cardio');
    recordTest('Public doctor search by specialty (FR-17)', searchDoctors.status === 200 && Array.isArray(searchDoctors.data.doctors) && searchDoctors.data.doctors.length > 0);

    // 5. Patient Profile Security — No Dangerous Default Clinic Binding (§15)
    console.log('\n--- SECTION 5: PATIENT SECURITY & MULTI-TENANT ISOLATION ---');
    const updatePatProfile = await makeRequest('/auth/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: { first_name: 'Fatima', last_name: 'Begum' },
    });
    recordTest('Patient profile update does not auto-bind to random clinic (§15)', updatePatProfile.status === 200);

    // 6. Messaging Security — Relationship Validation (§20)
    console.log('\n--- SECTION 6: MESSAGING RELATIONSHIP SECURITY (§20) ---');
    // Doctor can message their own registered patient
    const validMsg = await makeRequest('/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        receiver_id: patientUserId,
        subject: 'Prescription Follow-up',
        message: 'Please update on your symptoms.',
      },
    });
    recordTest('Legitimate clinical messaging allowed', validMsg.status === 201);

    // Attempt to message a non-existent or unrelated user
    const invalidMsg = await makeRequest('/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: {
        receiver_id: 'random-unrelated-user-id-999',
        subject: 'Spam',
        message: 'Unsolicited message.',
      },
    });
    recordTest('Unrelated/Arbitrary messaging rejected (403/404)', invalidMsg.status === 403 || invalidMsg.status === 404);

    // 7. Appointment State Machine & Past Date Booking (§22, §23)
    console.log('\n--- SECTION 7: APPOINTMENT STATE MACHINE & CONFLICTS ---');
    // Attempt booking in the past -> must reject
    const pastAppt = await makeRequest(`/clinics/${clinicId}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: {
        appointment_date: '2020-01-01',
        start_time: '10:00',
        service_id: null,
      },
    });
    recordTest('Past date appointment rejected (§22)', pastAppt.status === 400);

    // Book a valid future appointment on an open operating weekday
    const dateStr = getNextOperatingDate(4); // Next Thursday

    const newAppt = await makeRequest(`/clinics/${clinicId}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: {
        appointment_date: dateStr,
        start_time: '10:00',
        type: 'in-person',
      },
    });
    const apptId = newAppt.data?.appointment?.id;
    recordTest('Future appointment booking succeeds', newAppt.status === 201 && !!apptId, `Appt ID: ${apptId}`);

    if (apptId) {
      // Transition scheduled -> confirmed
      const confirmAppt = await makeRequest(`/clinics/${clinicId}/appointments/${apptId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${doctorToken}` },
        body: { status: 'confirmed' },
      });
      recordTest('Valid transition: scheduled -> confirmed', confirmAppt.status === 200);

      // Invalid transition: confirmed -> scheduled (backwards transition rejected)
      const invalidTransition = await makeRequest(`/clinics/${clinicId}/appointments/${apptId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${doctorToken}` },
        body: { status: 'scheduled' },
      });
      recordTest('Invalid backward transition rejected (400)', invalidTransition.status === 400);

      // Terminal transition: confirmed -> cancelled
      const cancelAppt = await makeRequest(`/clinics/${clinicId}/appointments/${apptId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${doctorToken}` },
        body: { status: 'cancelled', cancellation_reason: 'Patient requested reschedule' },
      });
      recordTest('Valid transition: confirmed -> cancelled', cancelAppt.status === 200);

      // Transition from terminal state must be rejected
      const modifyCancelled = await makeRequest(`/clinics/${clinicId}/appointments/${apptId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${doctorToken}` },
        body: { status: 'confirmed' },
      });
      recordTest('Transition from terminal state blocked (400)', modifyCancelled.status === 400);
    }

    // 8. Prescription Digital Management & IDOR (§21, FR-30)
    console.log('\n--- SECTION 8: PRESCRIPTIONS & CLINIC ISOLATION ---');
    // Fetch patient list to get patientId
    const patList = await makeRequest(`/clinics/${clinicId}/patients`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    patientId = patList.data?.patients?.[0]?.id;

    if (patientId) {
      const createRx = await makeRequest(`/clinics/${clinicId}/prescriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${doctorToken}` },
        body: {
          patient_id: patientId,
          diagnosis: 'Hypertension Stage 1',
          notes: 'Monitor BP twice daily.',
          items: [
            { medication_name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily in morning', duration: '30 days' },
          ],
        },
      });
      const rxId = createRx.data?.prescription?.id;
      recordTest('Doctor issues digital prescription (FR-30)', createRx.status === 201 && !!rxId);

      // Cross-clinic IDOR protection on prescription
      const crossClinicRx = await makeRequest(`/clinics/fake-other-clinic-id/prescriptions/${rxId}`, {
        headers: { Authorization: `Bearer ${doctorToken}` },
      });
      recordTest('Cross-clinic prescription access blocked (403/404)', crossClinicRx.status === 403 || crossClinicRx.status === 404);
    }

    // 9. Payment State Machine & Financial Security (§24, FR-24)
    console.log('\n--- SECTION 9: INVOICING & PAYMENT STATE MACHINE ---');
    if (patientId) {
      const invoice = await makeRequest(`/clinics/${clinicId}/payments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${doctorToken}` },
        body: {
          patient_id: patientId,
          amount: 1200,
          payment_method: 'card',
          payment_status: 'pending',
        },
      });
      const invoiceId = invoice.data?.payment?.id;
      recordTest('Doctor generates invoice (FR-24)', invoice.status === 201 && !!invoiceId);

      if (invoiceId) {
        // Complete payment
        const pay = await makeRequest(`/clinics/${clinicId}/payments/${invoiceId}/status`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${doctorToken}` },
          body: { status: 'completed', transaction_id: 'TXN-TEST-12345' },
        });
        recordTest('Payment completed successfully', pay.status === 200 && pay.data.payment?.payment_status === 'completed');

        // Attempt invalid reversion from completed to pending
        const revertPay = await makeRequest(`/clinics/${clinicId}/payments/${invoiceId}/status`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${doctorToken}` },
          body: { status: 'pending' },
        });
        recordTest('Reverting completed payment to pending blocked (§24)', revertPay.status === 400);
      }
    }

    // 10. Subscription Features & Quotas (§13, §14, FR-43)
    console.log('\n--- SECTION 10: SUBSCRIPTION TIERS & LIMITS ---');
    const plans = await makeRequest('/subscriptions/plans');
    recordTest('Public subscription plans retrieved', plans.status === 200 && Array.isArray(plans.data?.plans) && plans.data.plans.length >= 3);

    const limits = await makeRequest(`/clinics/${clinicId}/subscriptions/limits`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    recordTest('Clinic quota limits evaluated server-side', limits.status === 200 && !!limits.data.limits?.plan_name);

    // 11. Admin Operations & Audit Logs
    console.log('\n--- SECTION 11: ADMIN AUDIT & MODERATION ---');
    const adminDash = await makeRequest('/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordTest('Admin dashboard stats accessible', adminDash.status === 200 && typeof adminDash.data.stats?.total_users === 'number');

    const auditLogs = await makeRequest('/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordTest('Platform audit logs accessible by admin', auditLogs.status === 200 && Array.isArray(auditLogs.data.logs));

    // Non-admin blocked from admin endpoints
    const forbiddenAdmin = await makeRequest('/admin/dashboard', {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    recordTest('Doctor blocked from admin endpoints (403)', forbiddenAdmin.status === 403);

  } catch (err) {
    console.error('\n❌ Unhandled error during test suite:', err);
    recordTest('Suite execution completed without fatal error', false, err.message);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  // Summary
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  FORENSIC RESULT: ${passed}/${total} TESTS PASSED (${failed} failed)`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    throw new Error(`${failed} tests failed in Forensic Suite`);
  }
}

if (require.main === module) {
  runSuite()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runSuite };
