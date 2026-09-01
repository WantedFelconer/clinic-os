import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5099;
let serverProcess;

function startServer() {
  return new Promise((resolve) => {
    serverProcess = spawn('node', ['src/index.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, PORT: PORT.toString(), JWT_SECRET: 'test_jwt_secret_sprint5' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let started = false;
    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('running on port') || msg.includes(PORT.toString()) || msg.includes('Server running')) {
        if (!started) {
          started = true;
          setTimeout(resolve, 500);
        }
      }
    });

    serverProcess.stderr.on('data', () => {});

    setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 2000);
  });
}

function request(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://localhost:${PORT}/api${endpoint}`);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsedData = {};
        try {
          if (data) parsedData = JSON.parse(data);
        } catch {
          parsedData = { raw: data };
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsedData,
        });
      });
    });

    req.on('error', (err) => reject(err));

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runSecurityPass() {
  console.log('\n======================================================================');
  console.log('🔒 SPRINT 5 — AGGRESSIVE SECURITY & PENETRATION VERIFICATION PASS');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  try {
    await startServer();
    const ts = Date.now();

    // ───────────────────────────────────────────────────────────────────────────
    // SETUP ACCOUNTS
    // ───────────────────────────────────────────────────────────────────────────
    console.log('--- Step 0: Initializing Security Test Entities ---');
    const doc1Email = `sec_doc1_${ts}@test.com`;
    const doc2Email = `sec_doc2_${ts}@test.com`;
    const asstEmail = `sec_asst_${ts}@test.com`;
    const pat1Email = `sec_pat1_${ts}@test.com`;
    const pat2Email = `sec_pat2_${ts}@test.com`;
    const password = 'password123';

    // Doctor 1
    const rDoc1 = await request('/auth/register', { method: 'POST', body: { email: doc1Email, password, role: 'doctor', first_name: 'Dr1', last_name: 'Sec' } });
    await request('/auth/verify-otp', { method: 'POST', body: { email: doc1Email, otp: rDoc1.data?.dev_otp || '123456' } });
    const lDoc1 = await request('/auth/login', { method: 'POST', body: { email: doc1Email, password } });
    const doc1Token = lDoc1.data?.token;
    const doc1Id = lDoc1.data?.user?.id;
    const doc1Headers = { Authorization: `Bearer ${doc1Token}` };

    // Doctor 2
    const rDoc2 = await request('/auth/register', { method: 'POST', body: { email: doc2Email, password, role: 'doctor', first_name: 'Dr2', last_name: 'Sec' } });
    await request('/auth/verify-otp', { method: 'POST', body: { email: doc2Email, otp: rDoc2.data?.dev_otp || '123456' } });
    const lDoc2 = await request('/auth/login', { method: 'POST', body: { email: doc2Email, password } });
    const doc2Token = lDoc2.data?.token;
    const doc2Headers = { Authorization: `Bearer ${doc2Token}` };

    // Patient 1
    const rPat1 = await request('/auth/register', { method: 'POST', body: { email: pat1Email, password, role: 'patient', first_name: 'Alice', last_name: 'Patient' } });
    await request('/auth/verify-otp', { method: 'POST', body: { email: pat1Email, otp: rPat1.data?.dev_otp || '123456' } });
    const lPat1 = await request('/auth/login', { method: 'POST', body: { email: pat1Email, password } });
    const pat1Token = lPat1.data?.token;
    const pat1Id = lPat1.data?.user?.id;
    const pat1Headers = { Authorization: `Bearer ${pat1Token}` };

    // Patient 2 (Adversary)
    const rPat2 = await request('/auth/register', { method: 'POST', body: { email: pat2Email, password, role: 'patient', first_name: 'Bob', last_name: 'Adversary' } });
    await request('/auth/verify-otp', { method: 'POST', body: { email: pat2Email, otp: rPat2.data?.dev_otp || '123456' } });
    const lPat2 = await request('/auth/login', { method: 'POST', body: { email: pat2Email, password } });
    const pat2Token = lPat2.data?.token;
    const pat2Id = lPat2.data?.user?.id;
    const pat2Headers = { Authorization: `Bearer ${pat2Token}` };

    // Seed/Login Admin
    const lAdmin = await request('/auth/login', { method: 'POST', body: { email: 'admin@clinic-os.com', password: 'password123' } });
    const adminToken = lAdmin.data?.token;
    const adminId = lAdmin.data?.user?.id;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Create Clinic 1 (Doctor 1)
    const cRes1 = await request('/clinics', {
      method: 'POST',
      headers: doc1Headers,
      body: { name: `Clinic One ${ts}`, specialization: 'General', consultation_fee: 60 },
    });
    const clinicId1 = cRes1.data?.clinic?.id || cRes1.data?.id;

    // Create Clinic 2 (Doctor 2)
    const cRes2 = await request('/clinics', {
      method: 'POST',
      headers: doc2Headers,
      body: { name: `Clinic Two ${ts}`, specialization: 'Dental', consultation_fee: 100 },
    });
    const clinicId2 = cRes2.data?.clinic?.id || cRes2.data?.id;

    // Doctor 1 adds Assistant to Clinic 1
    const rAsst = await request('/auth/register', { method: 'POST', body: { email: asstEmail, password, role: 'assistant', first_name: 'Asst', last_name: 'Clinic1' } });
    await request('/auth/verify-otp', { method: 'POST', body: { email: asstEmail, otp: rAsst.data?.dev_otp || '123456' } });
    await request(`/clinics/${clinicId1}/staff`, { method: 'POST', headers: doc1Headers, body: { email: asstEmail, role: 'assistant' } });
    const lAsst = await request('/auth/login', { method: 'POST', body: { email: asstEmail, password } });
    const asstToken = lAsst.data?.token;
    const asstHeaders = { Authorization: `Bearer ${asstToken}` };

    // Doctor 1 registers Patient 1 in Clinic 1
    const p1Res = await request(`/clinics/${clinicId1}/patients`, {
      method: 'POST',
      headers: doc1Headers,
      body: { user_id: pat1Id, first_name: 'Alice', last_name: 'Patient', email: pat1Email, phone: '5551111' },
    });
    const patientRecord1Id = p1Res.data?.patient?.id;

    // Doctor 1 schedules an appointment for Patient 1 in Clinic 1
    const apptRes1 = await request(`/clinics/${clinicId1}/appointments`, {
      method: 'POST',
      headers: doc1Headers,
      body: { patient_id: patientRecord1Id, appointment_date: '2026-09-10', start_time: '10:00', end_time: '10:30' },
    });
    const appointmentId1 = apptRes1.data?.appointment?.id;

    // Doctor 1 issues Invoice for Patient 1
    const invRes1 = await request(`/clinics/${clinicId1}/payments`, {
      method: 'POST',
      headers: doc1Headers,
      body: { patient_id: patientRecord1Id, appointment_id: appointmentId1, amount: 60 },
    });
    const invoiceId1 = invRes1.data?.payment?.id;

    // Doctor 1 issues Medical Record & Prescription for Patient 1
    const emrRes1 = await request(`/clinics/${clinicId1}/medical-records`, {
      method: 'POST',
      headers: doc1Headers,
      body: { patient_id: patientRecord1Id, chief_complaint: 'Routine Checkup', diagnosis: 'Healthy', is_confidential: false },
    });
    const emrId1 = emrRes1.data?.record?.id;

    const confEmrRes1 = await request(`/clinics/${clinicId1}/medical-records`, {
      method: 'POST',
      headers: doc1Headers,
      body: { patient_id: patientRecord1Id, chief_complaint: 'Private Doctor Note', notes: 'Confidential psychiatric assessment', is_confidential: true },
    });
    const confEmrId1 = confEmrRes1.data?.record?.id;

    const rxRes1 = await request(`/clinics/${clinicId1}/prescriptions`, {
      method: 'POST',
      headers: doc1Headers,
      body: { patient_id: patientRecord1Id, diagnosis: 'Seasonal Allergies', items: [{ medication_name: 'Cetirizine 10mg', dosage: '1 tab daily', duration: '10 days' }] },
    });
    const rxId1 = rxRes1.data?.prescription?.id;

    assert(Boolean(clinicId1 && clinicId2 && patientRecord1Id && appointmentId1 && invoiceId1 && emrId1 && rxId1), 'Test entities created successfully', JSON.stringify({ clinicId1, clinicId2, patientRecord1Id, appointmentId1, invoiceId1, emrId1, rxId1, rxRes1Status: rxRes1.status, rxRes1Data: rxRes1.data }));

    // ───────────────────────────────────────────────────────────────────────────
    // 1. ROLE ESCALATION
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 1. Role Escalation Attack Verification ---');

    // Patient -> Doctor APIs
    const patCreateRx = await request(`/clinics/${clinicId1}/prescriptions`, {
      method: 'POST',
      headers: pat1Headers,
      body: { patient_id: patientRecord1Id, diagnosis: 'Self-Diagnosed', items: [{ medication_name: 'Morphine' }] },
    });
    assert(patCreateRx.status === 403, 'Role Escalation: Patient cannot create prescriptions (HTTP 403)');

    const patCreateEmr = await request(`/clinics/${clinicId1}/medical-records`, {
      method: 'POST',
      headers: pat1Headers,
      body: { patient_id: patientRecord1Id, chief_complaint: 'Hacked EMR' },
    });
    assert(patCreateEmr.status === 403, 'Role Escalation: Patient cannot create medical records (HTTP 403)');

    const patCreateInvoice = await request(`/clinics/${clinicId1}/payments`, {
      method: 'POST',
      headers: pat1Headers,
      body: { patient_id: patientRecord1Id, amount: 500 },
    });
    assert(patCreateInvoice.status === 403, 'Role Escalation: Patient cannot create invoices (HTTP 403)');

    const patModifySchedule = await request(`/clinics/${clinicId1}/schedules`, {
      method: 'PUT',
      headers: pat1Headers,
      body: [{ day_of_week: 1, start_time: '08:00', end_time: '20:00', is_available: true }],
    });
    assert(patModifySchedule.status === 403, 'Role Escalation: Patient cannot modify clinic operating schedules (HTTP 403)');

    // Patient -> Assistant APIs
    const patListAllPatients = await request(`/clinics/${clinicId1}/patients`, { headers: pat1Headers });
    assert(patListAllPatients.status === 403, 'Role Escalation: Patient cannot list clinic patients directory (HTTP 403)');

    // Patient -> Admin APIs
    const patAccessAdminDash = await request('/admin/dashboard', { headers: pat1Headers });
    assert(patAccessAdminDash.status === 403, 'Role Escalation: Patient cannot access Admin Dashboard (HTTP 403)');

    const patAccessAdminUsers = await request('/admin/users', { headers: pat1Headers });
    assert(patAccessAdminUsers.status === 403, 'Role Escalation: Patient cannot access Admin Users API (HTTP 403)');

    // Assistant -> Doctor-Only APIs
    const asstCreateRx = await request(`/clinics/${clinicId1}/prescriptions`, {
      method: 'POST',
      headers: asstHeaders,
      body: { patient_id: patientRecord1Id, diagnosis: 'Assistant Rx' },
    });
    assert(asstCreateRx.status === 403, 'Role Escalation: Assistant cannot issue prescriptions (HTTP 403)');

    const asstCreateEmr = await request(`/clinics/${clinicId1}/medical-records`, {
      method: 'POST',
      headers: asstHeaders,
      body: { patient_id: patientRecord1Id, chief_complaint: 'Assistant EMR' },
    });
    assert(asstCreateEmr.status === 403, 'Role Escalation: Assistant cannot create medical records (HTTP 403)');

    const asstAddStaff = await request(`/clinics/${clinicId1}/staff`, {
      method: 'POST',
      headers: asstHeaders,
      body: { email: 'fake_staff@test.com', role: 'doctor' },
    });
    assert(asstAddStaff.status === 403, 'Role Escalation: Assistant cannot manage clinic staff members (HTTP 403)');

    // Assistant -> Subscription APIs
    const asstCancelSub = await request(`/clinics/${clinicId1}/subscriptions/cancel`, { method: 'POST', headers: asstHeaders, body: {} });
    assert(asstCancelSub.status === 403, 'Role Escalation: Assistant cannot cancel subscriptions (HTTP 403)');

    // Doctor -> Admin APIs
    const docAccessAdminDash = await request('/admin/dashboard', { headers: doc1Headers });
    assert(docAccessAdminDash.status === 403, 'Role Escalation: Doctor cannot access Admin Dashboard (HTTP 403)');

    const docCreatePlan = await request('/admin/plans', { method: 'POST', headers: doc1Headers, body: { name: 'Illegal Plan', price: 0 } });
    assert(docCreatePlan.status === 403, 'Role Escalation: Doctor cannot create subscription plans (HTTP 403)');

    // ───────────────────────────────────────────────────────────────────────────
    // 2. IDOR (INSECURE DIRECT OBJECT REFERENCE) ATTACK TESTING
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. Multi-Tenant IDOR Attack Testing ---');

    // Patient 2 attempts to read Patient 1's appointment
    const idorApptView = await request(`/clinics/${clinicId1}/appointments/${appointmentId1}`, { headers: pat2Headers });
    assert(idorApptView.status === 403, 'IDOR: Patient 2 cannot view Patient 1 appointment details (HTTP 403)');

    // Patient 2 attempts to cancel Patient 1's appointment
    const idorApptCancel = await request(`/clinics/${clinicId1}/appointments/${appointmentId1}/status`, {
      method: 'PUT',
      headers: pat2Headers,
      body: { status: 'cancelled', cancellation_reason: 'Malicious cancellation' },
    });
    assert(idorApptCancel.status === 403, 'IDOR: Patient 2 cannot cancel Patient 1 appointment (HTTP 403)');

    // Patient 2 attempts to reschedule Patient 1's appointment
    const idorApptResched = await request(`/clinics/${clinicId1}/appointments/${appointmentId1}/reschedule`, {
      method: 'PUT',
      headers: pat2Headers,
      body: { appointment_date: '2026-09-15', start_time: '11:00' },
    });
    assert(idorApptResched.status === 403, 'IDOR: Patient 2 cannot reschedule Patient 1 appointment (HTTP 403)');

    // Patient 2 attempts to view Patient 1's EMR
    const idorEmrView = await request(`/clinics/${clinicId1}/medical-records/${emrId1}`, { headers: pat2Headers });
    assert(idorEmrView.status === 403, 'IDOR: Patient 2 cannot view Patient 1 medical record (HTTP 403)');

    // Patient 1 attempts to view confidential doctor note
    const patientConfEmrView = await request(`/clinics/${clinicId1}/medical-records/${confEmrId1}`, { headers: pat1Headers });
    assert(patientConfEmrView.status === 403, 'Security: Confidential clinical notes strictly hidden from patient (HTTP 403)');

    // Patient 2 attempts to view Patient 1's Prescription
    const idorRxView = await request(`/clinics/${clinicId1}/prescriptions/${rxId1}`, { headers: pat2Headers });
    assert(idorRxView.status === 403, 'IDOR: Patient 2 cannot view Patient 1 prescription (HTTP 403)');

    // Patient 2 attempts to view Patient 1's Patient Profile
    const idorPatientView = await request(`/clinics/${clinicId1}/patients/${patientRecord1Id}`, { headers: pat2Headers });
    assert(idorPatientView.status === 403, 'IDOR: Patient 2 cannot view Patient 1 clinical profile (HTTP 403)');

    // Patient 2 attempts to view Patient 1's Medical History
    const idorHistoryView = await request(`/clinics/${clinicId1}/patients/${patientRecord1Id}/history`, { headers: pat2Headers });
    assert(idorHistoryView.status === 403, 'IDOR: Patient 2 cannot view Patient 1 complete clinical history (HTTP 403)');

    // Patient 2 attempts to modify Patient 1's Patient Profile
    const idorPatientUpdate = await request(`/clinics/${clinicId1}/patients/${patientRecord1Id}`, {
      method: 'PUT',
      headers: pat2Headers,
      body: { first_name: 'Hacked' },
    });
    assert(idorPatientUpdate.status === 403, 'IDOR: Patient 2 cannot update Patient 1 profile (HTTP 403)');

    // Cross-Clinic Doctor IDOR: Doctor 2 attempts to cancel Doctor 1's clinic subscription
    const idorCrossSubCancel = await request(`/clinics/${clinicId1}/subscriptions/cancel`, {
      method: 'POST',
      headers: doc2Headers,
      body: {},
    });
    assert(idorCrossSubCancel.status === 403, 'Multi-tenant IDOR: Doctor 2 cannot cancel Doctor 1 subscription (HTTP 403)');

    // Cross-Clinic Doctor IDOR: Doctor 2 attempts to view Doctor 1's revenue
    const idorCrossRevenue = await request(`/clinics/${clinicId1}/payments/revenue`, { headers: doc2Headers });
    assert(idorCrossRevenue.status === 403, 'Multi-tenant IDOR: Doctor 2 cannot view Doctor 1 clinic revenue (HTTP 403)');

    // Cross-Clinic Doctor IDOR: Doctor 2 attempts to modify Doctor 1's services
    const idorCrossCreateService = await request(`/clinics/${clinicId1}/services`, {
      method: 'POST',
      headers: doc2Headers,
      body: { name: 'Illegal Service', price: 999 },
    });
    assert(idorCrossCreateService.status === 403, 'Multi-tenant IDOR: Doctor 2 cannot add service to Doctor 1 clinic (HTTP 403)');

    // ───────────────────────────────────────────────────────────────────────────
    // 3. PLAN LIMIT ENFORCEMENT & INTEGRITY
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 3. Plan Limit Enforcement & Quota Attacks ---');
    // Create strict plan with max_patients = 1
    const strictPlanRes = await request('/admin/plans', {
      method: 'POST',
      headers: adminHeaders,
      body: { name: `Single Patient Plan ${ts}`, price: 10, billing_cycle: 'monthly', max_doctors: 1, max_patients: 1, max_staff: 1 },
    });
    const strictPlanId = strictPlanRes.data?.plan?.id;

    // Doctor 2 subscribes Clinic 2 to Single Patient Plan
    await request(`/clinics/${clinicId2}/subscriptions/subscribe`, {
      method: 'POST',
      headers: doc2Headers,
      body: { plan_id: strictPlanId, billing_cycle: 'monthly' },
    });

    // Doctor 2 creates patient 1 -> Succeeds (1 / 1)
    const d2p1 = await request(`/clinics/${clinicId2}/patients`, {
      method: 'POST',
      headers: doc2Headers,
      body: { first_name: 'D2P1', last_name: 'Test', phone: '5559901', email: `d2p1_${ts}@test.com` },
    });
    assert(d2p1.status === 201, 'Quota Test: Patient 1 registered successfully on 1-patient plan');

    // Doctor 2 attempts to create patient 2 -> Blocked by backend
    const d2p2 = await request(`/clinics/${clinicId2}/patients`, {
      method: 'POST',
      headers: doc2Headers,
      body: { first_name: 'D2P2', last_name: 'Test', phone: '5559902', email: `d2p2_${ts}@test.com` },
    });
    assert(d2p2.status === 403, 'Quota Test: Backend strictly blocks 2nd patient on 1-patient plan (HTTP 403)');
    assert(d2p2.data?.message?.includes('Plan limit reached'), 'Quota Test: Meaningful plan upgrade error message returned');

    // ───────────────────────────────────────────────────────────────────────────
    // 4. ADMIN-ONLY OPERATION INTEGRITY & SELF-PROTECTION
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 4. Administrative Protection & Self-Deactivation Defense ---');
    // Admin cannot deactivate self
    const adminSelfDeact = await request(`/admin/users/${adminId}/status`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { is_active: false },
    });
    assert(adminSelfDeact.status === 400, 'Security: Admin self-deactivation rejected with HTTP 400 Bad Request');

    // Non-admin calling admin endpoints directly
    const nonAdminUserStatus = await request(`/admin/users/${pat1Id}/status`, {
      method: 'PUT',
      headers: pat1Headers,
      body: { is_active: false },
    });
    assert(nonAdminUserStatus.status === 403, 'Security: Non-admin calling PUT /api/admin/users/:id/status rejected (HTTP 403)');

    const nonAdminClinicStatus = await request(`/admin/clinics/${clinicId1}/status`, {
      method: 'PUT',
      headers: doc1Headers,
      body: { is_active: false },
    });
    assert(nonAdminClinicStatus.status === 403, 'Security: Non-admin calling PUT /api/admin/clinics/:id/status rejected (HTTP 403)');

    // ───────────────────────────────────────────────────────────────────────────
    // 5. AUTHENTICATION & JWT ATTACK TESTS
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 5. Authentication & JWT Hardening Tests ---');

    // Missing Token
    const noToken = await request('/auth/me');
    assert(noToken.status === 401, 'Auth: Missing Authorization header returns HTTP 401');

    // Invalid / Garbage Token
    const garbageToken = await request('/auth/me', { headers: { Authorization: 'Bearer thisisnotavalidjwt' } });
    assert(garbageToken.status === 401, 'Auth: Malformed JWT token returns HTTP 401');

    // Tampered / Modified Signature Token
    const forgedToken = jwt.sign({ id: adminId, role: 'admin' }, 'wrong_secret_key');
    const forgedReq = await request('/admin/dashboard', { headers: { Authorization: `Bearer ${forgedToken}` } });
    assert(forgedReq.status === 401, 'Auth: Forged signature JWT returns HTTP 401');

    // Expired Token
    const expiredToken = jwt.sign({ id: pat1Id, role: 'patient' }, 'test_jwt_secret_sprint5', { expiresIn: '-1s' });
    const expiredReq = await request('/auth/me', { headers: { Authorization: `Bearer ${expiredToken}` } });
    assert(expiredReq.status === 401, 'Auth: Expired JWT returns HTTP 401');

    // Disabled / Deactivated Account Token
    // Admin deactivates Patient 2
    await request(`/admin/users/${pat2Id}/status`, { method: 'PUT', headers: adminHeaders, body: { is_active: false } });
    // Patient 2 presents previously valid token
    const deactUserReq = await request('/auth/me', { headers: pat2Headers });
    assert(deactUserReq.status === 403, 'Auth: Deactivated user with existing token blocked on every protected request (HTTP 403)');

    // ───────────────────────────────────────────────────────────────────────────
    // 6. PAYMENT TAMPERING & INVOICE SECURITY
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 6. Payment Tampering & Invoice Integrity Tests ---');

    // Patient 2 attempts to pay Patient 1's invoice
    const idorPayOther = await request(`/clinics/${clinicId1}/payments/${invoiceId1}/status`, {
      method: 'PUT',
      headers: pat2Headers,
      body: { status: 'completed', transaction_id: 'tx_hack' },
    });
    assert(idorPayOther.status === 403, 'Payment Security: Patient 2 cannot pay or mutate Patient 1 invoice (HTTP 403)');

    // Patient 1 attempts to set payment status to 'refunded'
    const illegalStatusChange = await request(`/clinics/${clinicId1}/payments/${invoiceId1}/status`, {
      method: 'PUT',
      headers: pat1Headers,
      body: { status: 'refunded' },
    });
    assert(illegalStatusChange.status === 403, 'Payment Security: Patient cannot mark their own invoice as refunded (HTTP 403)');

    // Patient 1 settles payment legitimately (transitions to completed)
    const legitimatePay = await request(`/clinics/${clinicId1}/payments/${invoiceId1}/status`, {
      method: 'PUT',
      headers: pat1Headers,
      body: { status: 'completed', transaction_id: 'tx_legit_001' },
    });
    assert(legitimatePay.status === 200 && legitimatePay.data?.payment?.payment_status === 'completed', 'Payment Security: Patient successfully completes legitimate invoice settlement');

    // ───────────────────────────────────────────────────────────────────────────
    // 7. REVIEW INTEGRITY & APPOINTMENT VALIDATION
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 7. Review Moderation & Appointment Integrity Tests ---');

    // Invalid star rating (0 stars)
    const revZeroStars = await request(`/clinics/${clinicId1}/reviews`, {
      method: 'POST',
      headers: pat1Headers,
      body: { rating: 0, comment: 'Zero stars test' },
    });
    assert(revZeroStars.status === 400, 'Review Security: 0-star rating rejected (HTTP 400)');

    // Invalid star rating (6 stars)
    const revSixStars = await request(`/clinics/${clinicId1}/reviews`, {
      method: 'POST',
      headers: pat1Headers,
      body: { rating: 6, comment: 'Six stars test' },
    });
    assert(revSixStars.status === 400, 'Review Security: 6-star rating rejected (HTTP 400)');

    // Review for nonexistent appointment
    const revNonExistentAppt = await request(`/clinics/${clinicId1}/reviews`, {
      method: 'POST',
      headers: pat1Headers,
      body: { rating: 5, appointment_id: 'nonexistent-appt-id', comment: 'Fake appointment review' },
    });
    assert(revNonExistentAppt.status === 404, 'Review Security: Review for nonexistent appointment returns HTTP 404');

    // Review for appointment on another patient (Doctor 2 appointment)
    const d2ApptRes = await request(`/clinics/${clinicId2}/appointments`, {
      method: 'POST',
      headers: doc2Headers,
      body: { patient_id: d2p1.data?.patient?.id, appointment_date: '2026-09-12', start_time: '14:00', end_time: '14:30' },
    });
    const d2ApptId = d2ApptRes.data?.appointment?.id;

    const revOtherPatientAppt = await request(`/clinics/${clinicId2}/reviews`, {
      method: 'POST',
      headers: pat1Headers,
      body: { rating: 5, appointment_id: d2ApptId, comment: 'Reviewing other patient appointment' },
    });
    assert(revOtherPatientAppt.status === 403, 'Review Security: Review for another patient appointment rejected (HTTP 403)');

    // Review for incomplete/scheduled appointment (Appointment 1 is scheduled, not completed)
    const revIncompleteAppt = await request(`/clinics/${clinicId1}/reviews`, {
      method: 'POST',
      headers: pat1Headers,
      body: { rating: 5, appointment_id: appointmentId1, comment: 'Review before consultation' },
    });
    assert(revIncompleteAppt.status === 400, 'Review Security: Review for incomplete appointment rejected (HTTP 400)');

    // Complete appointment 1 and submit legitimate review
    await request(`/clinics/${clinicId1}/appointments/${appointmentId1}/status`, {
      method: 'PUT',
      headers: doc1Headers,
      body: { status: 'completed' },
    });

    const revCompletedAppt = await request(`/clinics/${clinicId1}/reviews`, {
      method: 'POST',
      headers: pat1Headers,
      body: { rating: 5, appointment_id: appointmentId1, comment: 'Consultation was thorough and helpful!' },
    });
    assert(revCompletedAppt.status === 201, 'Review Security: Review submitted successfully after consultation completion');

    // ───────────────────────────────────────────────────────────────────────────
    // 8. AUDIT LOGGING INTEGRITY
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 8. Audit Logging & Security Secret Protection ---');
    const auditLogsRes = await request('/admin/audit-logs', { headers: adminHeaders });
    assert(auditLogsRes.status === 200, 'Audit Logging: Admin retrieves audit logs (HTTP 200)');
    const logs = auditLogsRes.data?.logs || [];
    assert(logs.length > 0, 'Audit Logging: Audit logs are populated with events');

    // Verify no passwords, secrets, or JWT tokens are stored in audit log details
    const serializedLogs = JSON.stringify(logs);
    const hasSecretLeak = serializedLogs.includes('password123') || serializedLogs.includes('test_jwt_secret');
    assert(!hasSecretLeak, 'Audit Logging: Audit details do NOT store passwords, secrets, or token signatures');

    // ───────────────────────────────────────────────────────────────────────────
    // SUMMARY
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n======================================================================');
    console.log(` SPRINT 5 SECURITY VERIFICATION PASS SUMMARY:`);
    console.log(` Passed: ${passed}`);
    console.log(` Failed: ${failed}`);
    console.log('======================================================================\n');

    if (failed > 0) process.exit(1);
    else process.exit(0);
  } catch (err) {
    console.error('Fatal Security Test Error:', err);
    process.exit(1);
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

runSecurityPass();
