import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5098;
let serverProcess;

function startServer() {
  return new Promise((resolve) => {
    serverProcess = spawn('node', ['src/index.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, PORT: PORT.toString(), JWT_SECRET: 'master_sprint6_secret' },
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

async function runMasterIntegrationSuite() {
  console.log('\n======================================================================');
  console.log('🏆 CLINICOS SPRINT 6 — MASTER END-TO-END INTEGRATION & QA SUITE');
  console.log('======================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${details ? ` -> ${details}` : ''}`);
      failed++;
    }
  }

  try {
    await startServer();
    const ts = Date.now();
    const password = 'password123';

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 1: DOCTOR FULL WORKFLOW (Steps 1–23)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('--- 1. DOCTOR WORKFLOW (Full Lifecycle & Clinic Administration) ---');
    const docEmail = `doc_master_${ts}@test.com`;

    // 1. Doctor Registration
    const docReg = await request('/auth/register', {
      method: 'POST',
      body: { email: docEmail, password, role: 'doctor', first_name: 'Imran', last_name: 'Khan', phone: '+8801700000001' },
    });
    assert(docReg.status === 201, '1. Doctor registered successfully');

    // 2. Doctor Email Verification via OTP
    const docVerify = await request('/auth/verify-otp', {
      method: 'POST',
      body: { email: docEmail, otp: docReg.data?.dev_otp || '123456' },
    });
    assert(docVerify.status === 200, '2. Doctor account verified via OTP');

    // 3. Doctor Login
    const docLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: docEmail, password },
    });
    assert(docLogin.status === 200 && docLogin.data?.token, '3. Doctor logged in and token issued');
    const docToken = docLogin.data?.token;
    const docId = docLogin.data?.user?.id;
    const docHeaders = { Authorization: `Bearer ${docToken}` };

    // 4. Create Clinic
    const clinicCreate = await request('/clinics', {
      method: 'POST',
      headers: docHeaders,
      body: {
        name: `Aura Specialty Clinic ${ts}`,
        specialization: 'Cardiology',
        city: 'Dhaka',
        state: 'Dhaka',
        country: 'Bangladesh',
        consultation_fee: 80,
        description: 'Premier cardiovascular care clinic',
      },
    });
    assert(clinicCreate.status === 201, '4. Doctor created digital clinic');
    const clinicId = clinicCreate.data?.clinic?.id || clinicCreate.data?.id;

    // 5. Edit Clinic Details & Branding
    const clinicEdit = await request(`/clinics/${clinicId}`, {
      method: 'PUT',
      headers: docHeaders,
      body: { name: `Aura Heart & Health Center ${ts}`, phone: '+8801700000002', consultation_fee: 100 },
    });
    assert(clinicEdit.status === 200, '5. Doctor updated clinic profile and consultation fee');

    // 6. Configure Operating Hours
    const scheduleUpdate = await request(`/clinics/${clinicId}/schedules`, {
      method: 'PUT',
      headers: docHeaders,
      body: [
        { day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true },
        { day_of_week: 2, start_time: '09:00', end_time: '17:00', is_available: true },
        { day_of_week: 3, start_time: '09:00', end_time: '17:00', is_available: true },
        { day_of_week: 4, start_time: '09:00', end_time: '17:00', is_available: true },
        { day_of_week: 5, start_time: '09:00', end_time: '13:00', is_available: true },
      ],
    });
    assert(scheduleUpdate.status === 200, '6. Doctor configured clinic operating schedules');

    // 7. Configure Medical Services
    const serviceCreate = await request(`/clinics/${clinicId}/services`, {
      method: 'POST',
      headers: docHeaders,
      body: { name: 'Echocardiogram', description: 'Comprehensive ultrasound of the heart', duration_minutes: 45, price: 150 },
    });
    assert(serviceCreate.status === 201, '7. Doctor created medical consultation service');
    const serviceId = serviceCreate.data?.service?.id;

    // 8. Configure Consultation Packages
    const packageCreate = await request(`/clinics/${clinicId}/packages`, {
      method: 'POST',
      headers: docHeaders,
      body: { name: 'Cardiac Wellness Plan', description: '3 follow-up sessions + ECG monitoring', sessions_count: 3, price: 350 },
    });
    assert(packageCreate.status === 201, '8. Doctor created consultation package');

    // 9. Add Staff Member (Assistant)
    const asstEmail = `asst_master_${ts}@test.com`;
    const asstReg = await request('/auth/register', {
      method: 'POST',
      body: { email: asstEmail, password, role: 'assistant', first_name: 'Rashid', last_name: 'Staff', phone: '+8801700000003' },
    });
    await request('/auth/verify-otp', { method: 'POST', body: { email: asstEmail, otp: asstReg.data?.dev_otp || '123456' } });
    const staffAdd = await request(`/clinics/${clinicId}/staff`, {
      method: 'POST',
      headers: docHeaders,
      body: { email: asstEmail, role: 'assistant' },
    });
    assert(staffAdd.status === 201, '9. Doctor added clinic assistant to staff');

    const asstLogin = await request('/auth/login', { method: 'POST', body: { email: asstEmail, password } });
    const asstToken = asstLogin.data?.token;
    const asstHeaders = { Authorization: `Bearer ${asstToken}` };

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 2: PATIENT FULL WORKFLOW (Steps 1–25)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. PATIENT WORKFLOW (Discovery, Booking, Records, Payments) ---');
    const patEmail = `pat_master_${ts}@test.com`;

    // 1. Patient Register
    const patReg = await request('/auth/register', {
      method: 'POST',
      body: { email: patEmail, password, role: 'patient', first_name: 'Tariq', last_name: 'Mahmud', phone: '+8801700000004' },
    });
    assert(patReg.status === 201, '1. Patient registered successfully');

    // 2. Receive OTP & 3. Verify Email
    const patVerify = await request('/auth/verify-otp', {
      method: 'POST',
      body: { email: patEmail, otp: patReg.data?.dev_otp || '123456' },
    });
    assert(patVerify.status === 200, '2-3. Patient verified email with OTP');

    // 4. Patient Login
    const patLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: patEmail, password },
    });
    assert(patLogin.status === 200 && patLogin.data?.token, '4. Patient logged in and JWT issued');
    const patToken = patLogin.data?.token;
    const patId = patLogin.data?.user?.id;
    const patHeaders = { Authorization: `Bearer ${patToken}` };

    // 5. View Patient Dashboard Profile
    const patProfile = await request('/auth/profile', { headers: patHeaders });
    assert(patProfile.status === 200 && patProfile.data?.user?.email === patEmail, '5. Patient accessed profile/dashboard');

    // 6. Search Clinic
    const clinicSearch = await request('/clinics/search?query=Aura');
    assert(clinicSearch.status === 200 && clinicSearch.data?.clinics?.length > 0, '6. Patient discovered clinics via search');

    // 7. Select Clinic & 8. View Services
    const clinicDetails = await request(`/clinics/${clinicId}`);
    const servicesList = await request(`/clinics/${clinicId}/services`);
    assert(clinicDetails.status === 200 && servicesList.data?.services?.length > 0, '7-8. Patient viewed clinic services');

    // 9. Select Valid Slot
    const slotsRes = await request(`/clinics/${clinicId}/available-slots?date=2026-09-08&service_id=${serviceId}`);
    assert(slotsRes.status === 200 && slotsRes.data?.slots?.length > 0, '9. Real-time available slots computed dynamically');
    const targetSlot = slotsRes.data?.slots[0]?.start_time || '10:00';

    // 10. Book Appointment
    const apptBooking = await request(`/clinics/${clinicId}/appointments`, {
      method: 'POST',
      headers: patHeaders,
      body: {
        service_id: serviceId,
        appointment_date: '2026-09-08',
        start_time: targetSlot,
        type: 'in-person',
        notes: 'Cardiology checkup request',
      },
    });
    assert(apptBooking.status === 201, '10. Patient booked appointment successfully');
    const apptId = apptBooking.data?.appointment?.id;
    const patientRecordId = apptBooking.data?.appointment?.patient_id;

    // 11. View Appointment Details
    const apptView = await request(`/clinics/${clinicId}/appointments/${apptId}`, { headers: patHeaders });
    assert(apptView.status === 200 && apptView.data?.appointment?.id === apptId, '11. Patient viewed appointment confirmation');

    // 12. Reschedule Appointment
    const apptResched = await request(`/clinics/${clinicId}/appointments/${apptId}/reschedule`, {
      method: 'PUT',
      headers: patHeaders,
      body: { appointment_date: '2026-09-09', start_time: '11:00' },
    });
    assert(apptResched.status === 200, '12. Patient rescheduled appointment to new valid slot', JSON.stringify({ status: apptResched.status, data: apptResched.data }));

    // Doctor confirms appointment
    const docConfirm = await request(`/clinics/${clinicId}/appointments/${apptId}/status`, {
      method: 'PUT',
      headers: docHeaders,
      body: { status: 'confirmed' },
    });
    assert(docConfirm.status === 200, 'Doctor confirmed patient appointment');

    // Doctor completes consultation and issues EMR, Prescription, Invoice
    const emrCreate = await request(`/clinics/${clinicId}/medical-records`, {
      method: 'POST',
      headers: docHeaders,
      body: {
        patient_id: patientRecordId,
        appointment_id: apptId,
        chief_complaint: 'Chest tightness upon exertion',
        symptoms: 'Mild shortness of breath',
        diagnosis: 'Stage 1 Essential Hypertension',
        treatment: 'Lifestyle modification and medication therapy',
        follow_up_recommendations: 'Review BP chart in 4 weeks',
      },
    });
    assert(emrCreate.status === 201, '14. Doctor created clinical EMR record for patient');

    const rxCreate = await request(`/clinics/${clinicId}/prescriptions`, {
      method: 'POST',
      headers: docHeaders,
      body: {
        patient_id: patientRecordId,
        appointment_id: apptId,
        diagnosis: 'Essential Hypertension',
        notes: 'Take with food each morning',
        items: [
          { medication_name: 'Amlodipine 5mg', dosage: '1 tablet', frequency: 'Once daily (morning)', duration: '30 days' },
          { medication_name: 'Atorvastatin 10mg', dosage: '1 tablet', frequency: 'Once daily (night)', duration: '30 days' },
        ],
      },
    });
    assert(rxCreate.status === 201, '15. Doctor generated multi-item digital prescription');
    const rxId = rxCreate.data?.prescription?.id;

    // Upload Diagnostic Medical Report
    const reportCreate = await request(`/clinics/${clinicId}/medical-reports`, {
      method: 'POST',
      headers: docHeaders,
      body: {
        patient_id: patientRecordId,
        report_type: 'Echocardiogram Report',
        file_url: 'https://storage.clinic-os.local/reports/echo-tariq-2026.pdf',
        description: 'Ejection fraction 62%, normal LV systolic function',
      },
    });
    assert(reportCreate.status === 201, 'Doctor attached diagnostic medical report to patient record');
    const reportId = reportCreate.data?.report?.id;

    // Doctor issues Consultation Invoice
    const invoiceCreate = await request(`/clinics/${clinicId}/payments`, {
      method: 'POST',
      headers: docHeaders,
      body: {
        patient_id: patientRecordId,
        appointment_id: apptId,
        amount: 150,
        discount: 15,
        tax: 5,
        payment_method: 'card',
      },
    });
    assert(invoiceCreate.status === 201, '16. Doctor issued consultation invoice ($150 - $15 + $5 = $140)');
    const invoiceId = invoiceCreate.data?.payment?.id;

    // Patient views medical history
    const patHistory = await request(`/clinics/${clinicId}/patients/${patientRecordId}/history`, { headers: patHeaders });
    assert(patHistory.status === 200 && patHistory.data?.medical_records?.length > 0, '14. Patient retrieved complete medical history');

    // Patient views prescription
    const patRx = await request(`/clinics/${clinicId}/prescriptions/${rxId}`, { headers: patHeaders });
    assert(patRx.status === 200 && patRx.data?.prescription?.items?.length === 2, '15. Patient viewed digital prescription with medications');

    // Patient views medical report
    const patReport = await request(`/clinics/${clinicId}/medical-reports/${reportId}`, { headers: patHeaders });
    assert(patReport.status === 200 && patReport.data?.report?.id === reportId, 'Patient accessed personal diagnostic report');

    // Patient views invoice
    const patInvoice = await request(`/clinics/${clinicId}/payments/${invoiceId}`, { headers: patHeaders });
    assert(patInvoice.status === 200 && patInvoice.data?.payment?.total_amount === 140, '16. Patient viewed pending invoice');

    // 17. Complete Simulated Payment Settlement
    const patPay = await request(`/clinics/${clinicId}/payments/${invoiceId}/status`, {
      method: 'PUT',
      headers: patHeaders,
      body: { status: 'completed', transaction_id: `txn_card_settle_${ts}` },
    });
    assert(patPay.status === 200 && patPay.data?.payment?.payment_status === 'completed', '17-18. Patient settled payment and invoice marked completed');

    // Doctor marks consultation completed
    await request(`/clinics/${clinicId}/appointments/${apptId}/status`, {
      method: 'PUT',
      headers: docHeaders,
      body: { status: 'completed' },
    });

    // 19. Submit Review when eligible
    const patReview = await request(`/clinics/${clinicId}/reviews`, {
      method: 'POST',
      headers: patHeaders,
      body: { rating: 5, appointment_id: apptId, comment: 'Exceptional cardiac consultation and thorough diagnosis!' },
    });
    assert(patReview.status === 201, '19. Patient submitted review for completed consultation');

    // 20. Send Message to Doctor
    const patMsg = await request('/messages', {
      method: 'POST',
      headers: patHeaders,
      body: { receiver_id: docId, subject: 'Medication Query', message: 'Should I take Amlodipine before or after breakfast?' },
    });
    assert(patMsg.status === 201, '20. Patient sent secure direct message to Doctor');

    // 21. Doctor Receives Message and Replies
    const docMsgs = await request('/messages/my', { headers: docHeaders });
    assert(docMsgs.status === 200 && docMsgs.data?.messages?.length > 0, 'Doctor received patient message in inbox');

    const docReply = await request('/messages', {
      method: 'POST',
      headers: docHeaders,
      body: { receiver_id: patId, subject: 'Re: Medication Query', message: 'Take it with or immediately after breakfast with water.' },
    });
    assert(docReply.status === 201, '21. Doctor replied to patient message');

    const patMsgs = await request('/messages/my', { headers: patHeaders });
    assert(patMsgs.status === 200 && patMsgs.data?.messages?.length >= 2, 'Patient received doctor reply in inbox');

    // 22. Update Profile & Demographics
    const profileUpdate = await request('/auth/profile', {
      method: 'PUT',
      headers: patHeaders,
      body: { phone: '+8801799998888', city: 'Dhaka' },
    });
    assert(profileUpdate.status === 200, '22. Patient updated personal profile');

    // 23-25. Re-Login & Verify Persistence
    const patRelogin = await request('/auth/login', { method: 'POST', body: { email: patEmail, password } });
    assert(patRelogin.status === 200 && patRelogin.data?.user?.phone === '+8801799998888', '23-25. Re-login verified persisted profile state');

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 3: ASSISTANT WORKFLOW & SCOPING
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 3. ASSISTANT WORKFLOW & SCOPE BOUNDARIES ---');

    // Assistant views authorized clinic
    const asstClinics = await request('/clinics', { headers: asstHeaders });
    assert(asstClinics.status === 200, 'Assistant accessed authorized clinic directory');

    // Assistant registers walk-in patient
    const walkInPatient = await request(`/clinics/${clinicId}/patients`, {
      method: 'POST',
      headers: asstHeaders,
      body: { first_name: 'WalkIn', last_name: 'Patient', phone: '5557766', email: `walkin_${ts}@test.com` },
    });
    assert(walkInPatient.status === 201, 'Assistant registered walk-in patient');
    const walkInId = walkInPatient.data?.patient?.id;

    // Assistant books appointment
    const asstAppt = await request(`/clinics/${clinicId}/appointments`, {
      method: 'POST',
      headers: asstHeaders,
      body: { patient_id: walkInId, appointment_date: '2026-09-15', start_time: '14:00', end_time: '14:30' },
    });
    assert(asstAppt.status === 201, 'Assistant scheduled appointment for patient');

    // Assistant uploads diagnostic lab report
    const asstReport = await request(`/clinics/${clinicId}/medical-reports`, {
      method: 'POST',
      headers: asstHeaders,
      body: {
        patient_id: walkInId,
        report_type: 'Blood Lipid Panel',
        file_url: 'https://storage.clinic-os.local/reports/lipid-walkin.pdf',
        description: 'Total Cholesterol 195 mg/dL, HDL 48 mg/dL',
      },
    });
    assert(asstReport.status === 201, 'Assistant uploaded medical diagnostic report');

    // Prohibited operations: Assistant cannot modify subscriptions or admin functions
    const asstIllegalSub = await request(`/clinics/${clinicId}/subscriptions/cancel`, {
      method: 'POST',
      headers: asstHeaders,
      body: {},
    });
    assert(asstIllegalSub.status === 403, 'Assistant blocked from subscription management (HTTP 403)');

    const asstIllegalAdmin = await request('/admin/dashboard', { headers: asstHeaders });
    assert(asstIllegalAdmin.status === 403, 'Assistant blocked from platform administration (HTTP 403)');

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 4: PLATFORM ADMIN WORKFLOW
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 4. PLATFORM ADMINISTRATOR WORKFLOW ---');
    const adminLogin = await request('/auth/login', { method: 'POST', body: { email: 'admin@clinic-os.com', password: 'password123' } });
    const adminToken = adminLogin.data?.token;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };

    // Admin Dashboard Live Analytics & MRR
    const adminDash = await request('/admin/dashboard', { headers: adminHeaders });
    assert(adminDash.status === 200 && adminDash.data?.stats?.totalUsers > 0, 'Admin dashboard displays real user and clinic metrics');
    assert(typeof adminDash.data?.stats?.mrr === 'number', 'Admin dashboard computes real calculated subscription MRR');

    // Admin User Management & Status Toggle
    const adminUsers = await request('/admin/users?role=patient', { headers: adminHeaders });
    assert(adminUsers.status === 200 && adminUsers.data?.users?.length > 0, 'Admin listed and filtered platform users');

    // Admin Clinic Management & Status Toggle
    const adminClinics = await request('/admin/clinics', { headers: adminHeaders });
    assert(adminClinics.status === 200 && adminClinics.data?.clinics?.length > 0, 'Admin retrieved active platform clinics');

    // Admin Review Moderation Queue
    const pendingReviews = await request('/admin/reviews/pending', { headers: adminHeaders });
    assert(pendingReviews.status === 200, 'Admin accessed review moderation queue');
    if (pendingReviews.data?.reviews?.length > 0) {
      const revToApprove = pendingReviews.data.reviews[0];
      const approveRes = await request(`/admin/reviews/${revToApprove.id}/approve`, { method: 'PUT', headers: adminHeaders });
      assert(approveRes.status === 200, 'Admin approved pending patient review');
    }

    // Admin Subscription Plans Management (CRUD)
    const newPlanRes = await request('/admin/plans', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: `Enterprise Plus ${ts}`,
        description: 'Multi-center healthcare network plan',
        price: 299,
        billing_cycle: 'monthly',
        max_doctors: 25,
        max_patients: 50000,
        max_staff: 100,
        features: ['Custom Domain', 'Dedicated HIPAA Vault', '24/7 SLA'],
      },
    });
    assert(newPlanRes.status === 201, 'Admin created new subscription plan tier');
    const createdPlanId = newPlanRes.data?.plan?.id;

    const planUpdate = await request(`/admin/plans/${createdPlanId}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { price: 349 },
    });
    assert(planUpdate.status === 200 && planUpdate.data?.plan?.price === 349, 'Admin updated subscription plan pricing');

    // Admin Audit Logs Viewer
    const auditLogs = await request('/admin/audit-logs', { headers: adminHeaders });
    assert(auditLogs.status === 200 && auditLogs.data?.logs?.length > 0, 'Admin inspected chronological platform audit logs');

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 5: HEALTHCARE DATA CONSISTENCY & INTEGRITY
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 5. DATABASE CONSISTENCY & RELATIONAL INTEGRITY ---');

    // Prevent duplicate emails
    const dupEmail = await request('/auth/register', { method: 'POST', body: { email: patEmail, password, role: 'patient' } });
    assert(dupEmail.status === 400, 'Database integrity: Duplicate email registration blocked (HTTP 400)');

    // Prevent overlapping appointment bookings in same room/time
    const conflictAppt = await request(`/clinics/${clinicId}/appointments`, {
      method: 'POST',
      headers: docHeaders,
      body: { patient_id: walkInId, appointment_date: '2026-09-09', start_time: '11:00', end_time: '11:30' },
    });
    assert(conflictAppt.status === 409, 'Scheduling integrity: Overlapping appointment conflict strictly prevented (HTTP 409)');

    // Closed clinic schedule booking rejection
    const closedDayAppt = await request(`/clinics/${clinicId}/appointments`, {
      method: 'POST',
      headers: docHeaders,
      body: { patient_id: walkInId, appointment_date: '2026-09-13', start_time: '10:00' }, // Sunday is closed
    });
    assert(closedDayAppt.status === 400, 'Scheduling integrity: Booking on closed operating days rejected (HTTP 400)');

    // ───────────────────────────────────────────────────────────────────────────
    // SUMMARY
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n======================================================================');
    console.log('🏆 SPRINT 6 MASTER INTEGRATION & QA SUMMARY:');
    console.log(` Passed: ${passed}`);
    console.log(` Failed: ${failed}`);
    console.log('======================================================================\n');

    if (failed > 0) process.exit(1);
    else process.exit(0);
  } catch (err) {
    console.error('Fatal Master Integration Suite Error:', err);
    process.exit(1);
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

runMasterIntegrationSuite();
