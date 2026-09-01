process.env.NODE_ENV = 'test';
const http = require('http');
const assert = require('assert');
const app = require('../src/index');

const TEST_PORT = 5094;
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
  console.log(`  ${icon}: ${name}${details ? ` (${details})` : ''}`);
}

async function runSuite() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ClinicOS Sprint 4 End-to-End Full QA & Security Suite');
  console.log('═══════════════════════════════════════════════════════════\n');

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`[Sprint 4 E2E Server] Listening on http://127.0.0.1:${TEST_PORT}`);
      resolve();
    });
  });

  try {
    let doctorToken = '';
    let doctorId = '';
    let doctorClinicId = '';
    let doctorServiceId = '';
    let doctorPackageId = '';
    let doctorPatientId = '';
    let doctorApptId = '';
    let doctorEmrId = '';
    let doctorPrescriptionId = '';
    let doctorInvoiceId = '';

    let patientToken = '';
    let patientUserId = '';

    let assistantToken = '';
    let assistantUserId = '';

    let adminToken = '';
    let adminUserId = '';

    let foreignPatientToken = '';
    let foreignPatientUserId = '';

    const timestamp = Date.now();

    // ==========================================
    // 1. COMPLETE DOCTOR WORKFLOW LIFECYCLE
    // ==========================================
    console.log('\n--- 1. DOCTOR WORKFLOW LIFECYCLE ---');

    // Register Doctor
    const docEmail = `doctor.s4.${timestamp}@clinicos.io`;
    const docReg = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        email: docEmail,
        password: 'password123',
        role: 'doctor',
        first_name: 'Dr. Sarah',
        last_name: 'Al-Mansoor',
      },
    });
    const docOtp = docReg.data?.dev_otp;
    await makeRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email: docEmail, otp: docOtp },
    });
    const docLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: docEmail, password: 'password123' },
    });
    doctorToken = docLogin.data?.token;
    doctorId = docLogin.data?.user?.id;
    recordTest('Doctor registers, verifies OTP, and logs in (§32)', docLogin.status === 200 && !!doctorToken);

    // Create & Setup Clinic
    const createClinic = await makeRequest('/clinics', {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        name: `Al-Mansoor Cardiology Center ${timestamp}`,
        tagline: 'Excellence in Cardiovascular Medicine',
        city: 'Dubai',
        address: 'Healthcare City, Bldg 42',
        phone: '+971-4-5550199',
      },
    });
    doctorClinicId = createClinic.data?.clinic?.id;
    recordTest('Doctor provisions new digital clinic (§32)', createClinic.status === 201 && !!doctorClinicId);

    // Create Service & Package
    const createService = await makeRequest(`/clinics/${doctorClinicId}/services`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        name: 'Executive Cardiac Consultation',
        description: 'Comprehensive assessment including ECG',
        duration_minutes: 45,
        price: 850,
      },
    });
    doctorServiceId = createService.data?.service?.id;
    recordTest('Doctor creates clinic consultation service ($850) (§32)', createService.status === 201 && !!doctorServiceId);

    const createPkg = await makeRequest(`/clinics/${doctorClinicId}/packages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        name: 'Comprehensive Heart Wellness Package',
        description: '3 sessions including lipid panel and ECG follow-up',
        sessions_count: 3,
        price: 2100,
      },
    });
    doctorPackageId = createPkg.data?.package?.id;
    recordTest('Doctor creates bundled service package ($2100) (§32)', createPkg.status === 201 && !!doctorPackageId);

    // Register Patient in Clinic
    const patEmail = `patient.s4.${timestamp}@example.com`;
    const regPatient = await makeRequest(`/clinics/${doctorClinicId}/patients`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        first_name: 'Tariq',
        last_name: 'Mahmoud',
        email: patEmail,
        phone: '+971-50-1234567',
        gender: 'male',
        date_of_birth: '1985-06-15',
        blood_group: 'O+',
        allergies: 'Penicillin',
      },
    });
    doctorPatientId = regPatient.data?.patient?.id;
    recordTest('Doctor registers clinical patient record (§32)', regPatient.status === 201 && !!doctorPatientId);

    // Provision Assistant in Clinic
    const asstEmail = `assistant.s4.${timestamp}@clinicos.io`;
    const addAsst = await makeRequest(`/clinics/${doctorClinicId}/staff`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        email: asstEmail,
        role: 'assistant',
        first_name: 'Layla',
        last_name: 'Hassan',
        password: 'password123',
      },
    });
    assistantUserId = addAsst.data?.staff?.user_id;
    recordTest('Doctor provisions Clinic Assistant account (§32)', addAsst.status === 201 && !!assistantUserId);

    // ==========================================
    // 2. COMPLETE PATIENT WORKFLOW LIFECYCLE
    // ==========================================
    console.log('\n--- 2. PATIENT WORKFLOW LIFECYCLE ---');

    // Register Patient Portal Account
    const patReg = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        email: patEmail,
        password: 'password123',
        role: 'patient',
        first_name: 'Tariq',
        last_name: 'Mahmoud',
        phone: '+971-50-1234567',
      },
    });
    const patOtp = patReg.data?.dev_otp;
    await makeRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email: patEmail, otp: patOtp },
    });
    const patLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: patEmail, password: 'password123' },
    });
    patientToken = patLogin.data?.token;
    patientUserId = patLogin.data?.user?.id;
    recordTest('Patient registers and logs into Patient Portal (§32)', patLogin.status === 200 && !!patientToken);

    // Discover Doctor / Clinic
    const discoverDocs = await makeRequest(`/doctors/search?specialty=Cardiology`);
    recordTest('Patient discovers registered practicing doctors (§32)', discoverDocs.status === 200 && Array.isArray(discoverDocs.data?.doctors));

    // Book Appointment (Tuesday at 14:00)
    const bookingDate = getNextOperatingDate(2);
    const bookAppt = await makeRequest(`/clinics/${doctorClinicId}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: {
        doctor_id: doctorId,
        service_id: doctorServiceId,
        appointment_date: bookingDate,
        start_time: '14:00',
        type: 'in-person',
        notes: 'Annual cardiac screening',
      },
    });
    doctorApptId = bookAppt.data?.appointment?.id;
    doctorPatientId = bookAppt.data?.appointment?.patient_id || doctorPatientId;
    recordTest('Patient books consultation appointment (§32)', bookAppt.status === 201 && !!doctorApptId);

    // Appointment Progressions: scheduled -> confirmed -> in_progress -> completed
    await makeRequest(`/clinics/${doctorClinicId}/appointments/${doctorApptId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: { status: 'confirmed' },
    });
    await makeRequest(`/clinics/${doctorClinicId}/appointments/${doctorApptId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: { status: 'in_progress' },
    });
    const apptCompleted = await makeRequest(`/clinics/${doctorClinicId}/appointments/${doctorApptId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: { status: 'completed' },
    });
    recordTest('Appointment lifecycle transitions cleanly to completed (§32)', apptCompleted.status === 200 && apptCompleted.data?.appointment?.status === 'completed');

    // Doctor creates EMR
    const createEmr = await makeRequest(`/clinics/${doctorClinicId}/medical-records`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        patient_id: doctorPatientId,
        appointment_id: doctorApptId,
        diagnosis: 'Mild Sinus Bradycardia (Asymptomatic)',
        symptoms: 'Routine checkup, athletic patient',
        treatment_plan: 'Continue cardiovascular conditioning. Follow up in 12 months.',
        is_confidential: false,
      },
    });
    doctorEmrId = createEmr.data?.record?.id;
    recordTest('Doctor generates clinical EMR for consultation (§32)', createEmr.status === 201 && !!doctorEmrId);

    // Doctor creates Prescription with items
    const createRx = await makeRequest(`/clinics/${doctorClinicId}/prescriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        patient_id: doctorPatientId,
        appointment_id: doctorApptId,
        diagnosis: 'Cardiovascular Support Supplementation',
        notes: 'Take with morning meal',
        items: [
          { medication_name: 'Coenzyme Q10 (Ubiquinol)', dosage: '100mg', frequency: 'Once daily', duration: '90 days', instructions: 'Oral' },
          { medication_name: 'Omega-3 EPA/DHA', dosage: '1000mg', frequency: 'Twice daily', duration: '90 days', instructions: 'With food' },
        ],
      },
    });
    doctorPrescriptionId = createRx.data?.prescription?.id;
    recordTest('Doctor generates multi-item digital prescription (§32)', createRx.status === 201 && !!doctorPrescriptionId);

    // Doctor generates official invoice ($850 base - $50 discount + $25 tax = $825)
    const createInv = await makeRequest(`/clinics/${doctorClinicId}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        patient_id: doctorPatientId,
        appointment_id: doctorApptId,
        service_id: doctorServiceId,
        discount: 50,
        tax: 25,
        payment_method: 'card',
        payment_status: 'pending',
      },
    });
    doctorInvoiceId = createInv.data?.payment?.id;
    const invTotal = parseFloat(createInv.data?.payment?.total_amount);
    recordTest('Doctor generates server-authoritative invoice ($825) (§32)', createInv.status === 201 && invTotal === 825, `Total: $${invTotal}`);

    // Patient views own records in portal
    const patEmrView = await makeRequest(`/clinics/${doctorClinicId}/medical-records/${doctorEmrId}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    recordTest('Patient retrieves own consultation EMR (§32)', patEmrView.status === 200 && patEmrView.data?.record?.id === doctorEmrId);

    // Patient settles invoice via simulated payment
    const patPay = await makeRequest(`/clinics/${doctorClinicId}/payments/${doctorInvoiceId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: { status: 'completed' },
    });
    recordTest('Patient settles invoice via simulated payment gateway (§32)', patPay.status === 200 && patPay.data?.payment?.payment_status === 'completed');

    // Patient leaves review for completed appointment
    const leaveReview = await makeRequest(`/clinics/${doctorClinicId}/reviews`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: {
        appointment_id: doctorApptId,
        rating: 5,
        comment: 'Outstanding cardiac assessment and very thorough consultation.',
      },
    });
    recordTest('Patient submits review for completed consultation (§32)', leaveReview.status === 201 && !!leaveReview.data?.review?.id);

    // Patient sends direct message to Doctor
    const sendMsg = await makeRequest('/messages', {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}` },
      body: {
        clinic_id: doctorClinicId,
        receiver_id: doctorId,
        content: 'Thank you Dr. Sarah for the thorough consultation and report.',
      },
    });
    recordTest('Patient sends direct in-app message to Doctor (§32)', sendMsg.status === 201 && !!sendMsg.data?.message?.id);

    // Patient views notifications
    const patNotifs = await makeRequest('/notifications', {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    recordTest('Patient receives in-app notifications (§32)', patNotifs.status === 200 && Array.isArray(patNotifs.data?.notifications));

    // ==========================================
    // 3. ASSISTANT ROLE & RBAC RESTRICTIONS
    // ==========================================
    console.log('\n--- 3. ASSISTANT ROLE & RBAC BOUNDARIES ---');

    const asstLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: asstEmail, password: 'password123' },
    });
    assistantToken = asstLogin.data?.token;
    recordTest('Assistant logs into assigned clinic workspace (§32)', asstLogin.status === 200 && !!assistantToken);

    // Assistant CAN view clinic patients
    const asstViewPatients = await makeRequest(`/clinics/${doctorClinicId}/patients`, {
      headers: { Authorization: `Bearer ${assistantToken}` },
    });
    recordTest('Assistant CAN view clinic patients (§32)', asstViewPatients.status === 200 && Array.isArray(asstViewPatients.data?.patients));

    // Assistant CANNOT create clinical EMR (RBAC 403)
    const asstEmrAttempt = await makeRequest(`/clinics/${doctorClinicId}/medical-records`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${assistantToken}` },
      body: {
        patient_id: doctorPatientId,
        diagnosis: 'Unauthorized assistant diagnosis',
      },
    });
    recordTest('Assistant CANNOT create EMR records (RBAC 403) (§32)', asstEmrAttempt.status === 403);

    // Assistant CANNOT create Prescriptions (RBAC 403)
    const asstRxAttempt = await makeRequest(`/clinics/${doctorClinicId}/prescriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${assistantToken}` },
      body: {
        patient_id: doctorPatientId,
        diagnosis: 'Unauthorized prescription attempt',
      },
    });
    recordTest('Assistant CANNOT create Prescriptions (RBAC 403) (§32)', asstRxAttempt.status === 403);

    // Assistant CANNOT manage clinic staff (RBAC 403)
    const asstStaffAttempt = await makeRequest(`/clinics/${doctorClinicId}/staff`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${assistantToken}` },
      body: { email: 'unauthorized@staff.com' },
    });
    recordTest('Assistant CANNOT manage clinic staff (RBAC 403) (§32)', asstStaffAttempt.status === 403);

    // ==========================================
    // 4. PLATFORM ADMINISTRATOR LIFECYCLE
    // ==========================================
    console.log('\n--- 4. PLATFORM ADMINISTRATOR WORKFLOW ---');

    const adminLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'admin@clinic-os.com', password: 'password123' },
    });
    adminToken = adminLogin.data?.token;
    adminUserId = adminLogin.data?.user?.id;
    recordTest('Platform Administrator login successful (§32)', adminLogin.status === 200 && !!adminToken);

    // Admin accesses dashboard stats & MRR
    const adminDash = await makeRequest('/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordTest('Admin views platform macro metrics and MRR (§32)', adminDash.status === 200 && typeof adminDash.data?.stats?.total_users === 'number');

    // Admin reviews pending reviews and approves review
    const pendingReviews = await makeRequest('/admin/reviews/pending', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const reviewToApprove = pendingReviews.data?.reviews?.[0]?.id;
    if (reviewToApprove) {
      const approveReview = await makeRequest(`/admin/reviews/${reviewToApprove}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      recordTest('Admin approves pending patient review (§32)', approveReview.status === 200);
    } else {
      recordTest('Admin pending review queue accessible (§32)', pendingReviews.status === 200);
    }

    // Admin manages subscription plans
    const adminPlan = await makeRequest('/admin/plans', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: `Academic Medical Tier ${timestamp}`,
        description: 'University research practice',
        price: 29.99,
        billing_cycle: 'monthly',
        max_doctors: 3,
        max_patients: 300,
        max_staff: 6,
        features: { analytics: true, advanced_emr: true },
      },
    });
    const createdPlanId = adminPlan.data?.plan?.id;
    recordTest('Admin creates structured subscription tier (§32)', adminPlan.status === 201 && !!createdPlanId);

    // Admin views audit log stream
    const adminAudit = await makeRequest('/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordTest('Admin accesses comprehensive audit log stream (§32)', adminAudit.status === 200 && Array.isArray(adminAudit.data?.logs));

    // ==========================================
    // 5. CROSS-TENANT & ANTI-IDOR SECURITY MATRIX (§33)
    // ==========================================
    console.log('\n--- 5. CROSS-TENANT & ANTI-IDOR SECURITY MATRIX ---');

    // Register Foreign Patient
    const forEmail = `foreign.patient.${timestamp}@example.com`;
    const forReg = await makeRequest('/auth/register', {
      method: 'POST',
      body: { email: forEmail, password: 'password123', role: 'patient', first_name: 'Foreign', last_name: 'Patient' },
    });
    const forOtp = forReg.data?.dev_otp;
    await makeRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email: forEmail, otp: forOtp },
    });
    const forLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: forEmail, password: 'password123' },
    });
    foreignPatientToken = forLogin.data?.token;
    foreignPatientUserId = forLogin.data?.user?.id;
    recordTest('Foreign Patient login successful (§33)', forLogin.status === 200 && !!foreignPatientToken);

    // a) Foreign Patient CANNOT access Patient A's EMR (Anti-IDOR 403)
    const idorEmr = await makeRequest(`/clinics/${doctorClinicId}/medical-records/${doctorEmrId}`, {
      headers: { Authorization: `Bearer ${foreignPatientToken}` },
    });
    recordTest('IDOR: Foreign Patient blocked from viewing Patient A EMR (403) (§33)', idorEmr.status === 403);

    // b) Foreign Patient CANNOT access Patient A's Invoice (Anti-IDOR 403)
    const idorInvoice = await makeRequest(`/clinics/${doctorClinicId}/payments/${doctorInvoiceId}`, {
      headers: { Authorization: `Bearer ${foreignPatientToken}` },
    });
    recordTest('IDOR: Foreign Patient blocked from viewing Patient A Invoice (403) (§33)', idorInvoice.status === 403);

    // c) Foreign Patient CANNOT access Patient A's Medical History (Anti-IDOR 403)
    const idorHistory = await makeRequest(`/clinics/${doctorClinicId}/patients/${doctorPatientId}/history`, {
      headers: { Authorization: `Bearer ${foreignPatientToken}` },
    });
    recordTest('IDOR: Foreign Patient blocked from viewing Patient A History (403) (§33)', idorHistory.status === 403);

    // d) Patient CANNOT access Doctor Financial Analytics (403)
    const patientAnalytics = await makeRequest(`/clinics/${doctorClinicId}/analytics`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    recordTest('RBAC: Patient blocked from Clinic Revenue Analytics (403) (§33)', patientAnalytics.status === 403);

    // e) Patient CANNOT access Platform Admin Endpoints (403)
    const patientAdmin = await makeRequest('/admin/dashboard', {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    recordTest('RBAC: Patient blocked from Admin Dashboard (403) (§33)', patientAdmin.status === 403);

    // f) Doctor CANNOT access Platform Admin Endpoints (403)
    const docAdmin = await makeRequest('/admin/users', {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    recordTest('RBAC: Doctor blocked from Admin User Management (403) (§33)', docAdmin.status === 403);

    // g) Unauthenticated request to protected route blocked (401)
    const unauthReq = await makeRequest(`/clinics/${doctorClinicId}/patients`);
    recordTest('Security: Unauthenticated access blocked (401) (§33)', unauthReq.status === 401);

  } catch (err) {
    console.error('\n❌ Unhandled error during Sprint 4 E2E test suite:', err.stack || err);
    recordTest('Sprint 4 E2E suite completed without fatal error', false, err.message);
  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  // Summary
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failedTests = testResults.filter((r) => !r.passed);
  const failed = failedTests.length;

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(f => console.log(`   - ${f.name} ${f.details ? `(${f.details})` : ''}`));
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  SPRINT 4 E2E SUITE: ${passed}/${total} TESTS PASSED (${failed} failed)`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    throw new Error(`${failed} tests failed in Sprint 4 E2E Suite`);
  }
}

if (require.main === module) {
  runSuite()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runSuite };
