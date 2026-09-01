import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5098;
const API_URL = `http://127.0.0.1:${PORT}/api`;

let serverProcess;

async function startServer() {
  return new Promise((resolve) => {
    serverProcess = spawn('node', ['src/index.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, PORT: PORT.toString() },
      stdio: ['ignore', 'pipe', 'pipe']
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

    serverProcess.stderr.on('data', (data) => {
      // console.error(data.toString());
    });

    setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 3500);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
  });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  return { status: res.status, ok: res.ok, data };
}

function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function runComprehensiveVerification() {
  console.log('===============================================================');
  console.log('🧪 CLINICOS SPRINT 3 COMPREHENSIVE ACCEPTANCE & VERIFICATION');
  console.log('===============================================================\n');

  await startServer();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ───────────────────────────────────────────────────────────────────────────
    // 1. DOCTOR AUTHENTICATION & CLINIC WORKSPACE
    // ───────────────────────────────────────────────────────────────────────────
    console.log('--- Phase 1: Doctor Login & Core Workspace Setup ---');
    const doctorLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'dr.rahman@clinic-os.com', password: 'password123' }
    });
    assert(doctorLogin.status === 200 && doctorLogin.data?.token, 'Doctor 1 authenticated successfully');
    const docToken = doctorLogin.data.token;
    const docAuth = { headers: { Authorization: `Bearer ${docToken}` } };

    const clinicsRes = await request('/clinics', docAuth);
    const clinics = clinicsRes.data?.clinics || [];
    assert(clinics.length > 0, 'Doctor 1 clinic found');
    const clinic1Id = clinics[0].id;
    console.log(`  Clinic 1 ID: ${clinic1Id} (${clinics[0].name})`);

    // ───────────────────────────────────────────────────────────────────────────
    // 2. SERVICES & PACKAGES CRUD
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Phase 2: Medical Services & Consultation Packages CRUD ---');
    const createServiceRes = await request(`/clinics/${clinic1Id}/services`, {
      method: 'POST',
      headers: docAuth.headers,
      body: { name: 'Cardiology Specialist Consult', duration_minutes: 45, price: 120.00, description: 'ECG + Consult' }
    });
    assert(createServiceRes.status === 201 && createServiceRes.data?.service?.id, 'Service created in database');
    const serviceId = createServiceRes.data.service.id;

    const createPkgRes = await request(`/clinics/${clinic1Id}/packages`, {
      method: 'POST',
      headers: docAuth.headers,
      body: { name: 'Cardiac Health 6-Month Plan', sessions_count: 6, price: 599.00, description: 'Comprehensive heart care' }
    });
    assert(createPkgRes.status === 201 && createPkgRes.data?.package?.id, 'Package created in database');
    const packageId = createPkgRes.data.package.id;

    // ───────────────────────────────────────────────────────────────────────────
    // 3. PATIENT REGISTRATION
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Phase 3: Patient Registration ---');
    const regPatientRes = await request(`/clinics/${clinic1Id}/patients`, {
      method: 'POST',
      headers: docAuth.headers,
      body: {
        first_name: 'David',
        last_name: 'Miller',
        email: 'david.miller@example.com',
        phone: '+1 (555) 777-8888',
        gender: 'male',
        blood_group: 'A+',
        allergies: 'Penicillin, Aspirin',
        chronic_conditions: 'Stage 1 Hypertension',
        emergency_contact_name: 'Jane Miller',
        emergency_contact_phone: '+1 (555) 777-9999',
      }
    });
    assert(regPatientRes.status === 201 && regPatientRes.data?.patient?.id, 'Patient registered successfully in clinic');
    const patient1Id = regPatientRes.data.patient.id;

    // ───────────────────────────────────────────────────────────────────────────
    // 4. APPOINTMENT BOOKING, CONFLICT DETECTION & LIFECYCLE
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Phase 4: Appointments, Conflict Rejection & Lifecycle ---');
    const randomDays = 100 + Math.floor(Math.random() * 9000);
    const targetDate = new Date(Date.now() + randomDays * 86400000);
    while (targetDate.getDay() === 0) targetDate.setDate(targetDate.getDate() + 1); // skip Sunday
    const apptDateStr = formatDate(targetDate);

    // Book valid appointment
    const appt1 = await request(`/clinics/${clinic1Id}/appointments`, {
      method: 'POST',
      headers: docAuth.headers,
      body: {
        patient_id: patient1Id,
        service_id: serviceId,
        appointment_date: apptDateStr,
        start_time: '10:00:00',
        end_time: '10:45:00',
        type: 'in-person',
        notes: 'Cardiology initial consult'
      }
    });
    if (appt1.status !== 201) {
      console.log('  [appt1 error]:', appt1.status, appt1.data);
    }
    assert(appt1.status === 201 && appt1.data?.appointment?.id, 'Appointment 1 booked (10:00 - 10:45)');
    const appt1Id = appt1.data?.appointment?.id;

    // Attempt conflicting overlapping appointment (10:30 - 11:00)
    const conflictAppt = await request(`/clinics/${clinic1Id}/appointments`, {
      method: 'POST',
      headers: docAuth.headers,
      body: {
        patient_id: patient1Id,
        appointment_date: apptDateStr,
        start_time: '10:30:00',
        end_time: '11:00:00',
        type: 'in-person',
      }
    });
    assert(conflictAppt.status === 409, 'Overlapping appointment accurately rejected with HTTP 409 Conflict');

    // Attempt booking outside operating hours (01:00 AM)
    const outOfHoursAppt = await request(`/clinics/${clinic1Id}/appointments`, {
      method: 'POST',
      headers: docAuth.headers,
      body: {
        patient_id: patient1Id,
        appointment_date: apptDateStr,
        start_time: '01:00:00',
        end_time: '01:30:00',
        type: 'in-person',
      }
    });
    assert(outOfHoursAppt.status === 400, 'Out-of-hours booking rejected with HTTP 400');

    // Status Transitions: scheduled -> confirmed -> in_progress -> completed
    const confRes = await request(`/clinics/${clinic1Id}/appointments/${appt1Id}/status`, {
      method: 'PATCH',
      headers: docAuth.headers,
      body: { status: 'confirmed' }
    });
    assert(confRes.status === 200, 'Appointment updated to confirmed');

    const inProgRes = await request(`/clinics/${clinic1Id}/appointments/${appt1Id}/status`, {
      method: 'PATCH',
      headers: docAuth.headers,
      body: { status: 'in_progress' }
    });
    assert(inProgRes.status === 200, 'Appointment updated to in_progress');

    const compRes = await request(`/clinics/${clinic1Id}/appointments/${appt1Id}/status`, {
      method: 'PATCH',
      headers: docAuth.headers,
      body: { status: 'completed' }
    });
    assert(compRes.status === 200, 'Appointment updated to completed');

    // ───────────────────────────────────────────────────────────────────────────
    // 5. EMR & CONFIDENTIALITY
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Phase 5: EMR Records & Patient Confidentiality ---');
    // Public non-confidential record
    const emrPublic = await request(`/clinics/${clinic1Id}/medical-records`, {
      method: 'POST',
      headers: docAuth.headers,
      body: {
        patient_id: patient1Id,
        diagnosis: 'Essential Hypertension',
        symptoms: 'Mild dizziness, BP 145/90',
        treatment_plan: 'Dietary adjustments, daily BP log',
        is_confidential: false,
      }
    });
    assert(emrPublic.status === 201 && emrPublic.data?.record?.id, 'Standard EMR record created');

    // Confidential record
    const emrPrivate = await request(`/clinics/${clinic1Id}/medical-records`, {
      method: 'POST',
      headers: docAuth.headers,
      body: {
        patient_id: patient1Id,
        diagnosis: 'Suspected Cardiac Arrhythmia - Confidential Investigation',
        symptoms: 'Occasional palpitations, family history of early CAD',
        treatment_plan: 'Holter monitor test scheduled',
        is_confidential: true,
      }
    });
    assert(emrPrivate.status === 201 && emrPrivate.data?.record?.id, 'Confidential EMR record created');
    const privateRecordId = emrPrivate.data.record.id;

    // Doctor can view both records
    const docRecords = await request(`/clinics/${clinic1Id}/medical-records/patient/${patient1Id}`, docAuth);
    assert(docRecords.data?.records?.length >= 2, 'Doctor can see all EMR records including confidential');

    // Authenticate as Patient
    const patientLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'patient@example.com', password: 'password123' }
    });
    assert(patientLogin.status === 200 && patientLogin.data?.token, 'Patient user authenticated');
    const patientToken = patientLogin.data.token;
    const patientAuth = { headers: { Authorization: `Bearer ${patientToken}` } };

    // Patient fetching medical records of another patient -> Forbidden 403
    const unauthorizedEmr = await request(`/clinics/${clinic1Id}/medical-records/patient/${patient1Id}`, patientAuth);
    assert(unauthorizedEmr.status === 403, 'Unrelated patient denied access to other patient EMR (HTTP 403)');

    // ───────────────────────────────────────────────────────────────────────────
    // 6. DIGITAL PRESCRIPTIONS WITH MULTIPLE MEDICATION ITEMS
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Phase 6: Multi-Item Digital Prescriptions ---');
    const rxRes = await request(`/clinics/${clinic1Id}/prescriptions`, {
      method: 'POST',
      headers: docAuth.headers,
      body: {
        patient_id: patient1Id,
        appointment_id: appt1Id,
        diagnosis: 'Hypertension and Hyperlipidemia',
        notes: 'Take tablets after breakfast and dinner. Low sodium diet.',
        items: [
          { medication_name: 'Amlodipine Besylate', dosage: '5mg', frequency: 'Once daily', duration: '30 days', instructions: 'Take in the morning' },
          { medication_name: 'Atorvastatin Calcium', dosage: '20mg', frequency: 'Once daily', duration: '30 days', instructions: 'Take at night' },
          { medication_name: 'Metoprolol Succinate', dosage: '25mg', frequency: 'Twice daily', duration: '14 days', instructions: 'Take with food' },
        ]
      }
    });
    assert(rxRes.status === 201 && rxRes.data?.prescription?.id, 'Digital prescription with 3 medication rows created');
    const rxId = rxRes.data.prescription.id;

    const rxDetail = await request(`/clinics/${clinic1Id}/prescriptions/${rxId}`, docAuth);
    assert(rxDetail.data?.prescription?.items?.length === 3, 'Prescription items persisted and retrieved cleanly');
    assert(rxDetail.data.prescription.patient_id === patient1Id, 'Prescription correctly linked to patient');

    // ───────────────────────────────────────────────────────────────────────────
    // 7. INVOICE GENERATION, PAYMENT RECORDING & FINANCIAL STATS
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Phase 7: Billing, Invoices & Payment Settlement ---');
    const invoiceRes = await request(`/clinics/${clinic1Id}/payments`, {
      method: 'POST',
      headers: docAuth.headers,
      body: {
        patient_id: patient1Id,
        amount: 250.00,
        discount: 25.00,
        tax: 15.00,
        total_amount: 240.00,
        payment_method: 'card',
        payment_status: 'pending',
        notes: 'Consultation and ECG package'
      }
    });
    assert(invoiceRes.status === 201 && invoiceRes.data?.payment?.invoice_number, 'Invoice generated with formatted invoice number');
    const paymentId = invoiceRes.data.payment.id;

    // Record payment as completed
    const recordPayRes = await request(`/clinics/${clinic1Id}/payments/${paymentId}`, {
      method: 'PUT',
      headers: docAuth.headers,
      body: {
        status: 'completed',
        payment_method: 'card',
        notes: 'Settled via Visa ending in 4242'
      }
    });
    assert(recordPayRes.status === 200, 'Payment recorded as completed on database');

    const paymentListRes = await request(`/clinics/${clinic1Id}/payments`, docAuth);
    assert(paymentListRes.data?.summary?.total_collected >= 240, 'Payment metrics calculated accurately');

    // ───────────────────────────────────────────────────────────────────────────
    // 8. MULTI-TENANT CLINIC ISOLATION (CROSS-CLINIC ACCESS REJECTION)
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Phase 8: Strict Multi-Tenant Clinic Isolation ---');
    // Register a second doctor and create Clinic 2
    const doc2Email = `dr.fatima.${Date.now()}@clinic-os.com`;
    const doc2Register = await request('/auth/register', {
      method: 'POST',
      body: {
        first_name: 'Dr. Fatima',
        last_name: 'Ali',
        email: doc2Email,
        password: 'password123',
        role: 'doctor',
      }
    });
    assert(doc2Register.status === 201, 'Doctor 2 registered');
    const otp = doc2Register.data?.dev_otp;
    const doc2Verify = await request('/auth/verify-otp', {
      method: 'POST',
      body: { email: doc2Email, otp }
    });
    assert(doc2Verify.status === 200, 'Doctor 2 OTP verified successfully');

    const doc2Login = await request('/auth/login', {
      method: 'POST',
      body: { email: doc2Email, password: 'password123' }
    });
    assert(doc2Login.status === 200 && doc2Login.data?.token, 'Doctor 2 logged in and token issued');
    const doc2Token = doc2Login.data.token;
    const doc2Auth = { headers: { Authorization: `Bearer ${doc2Token}` } };

    const clinic2Res = await request('/clinics', {
      method: 'POST',
      headers: doc2Auth.headers,
      body: {
        name: 'Fatima Specialized Heart Center',
        phone: '+1 (555) 999-0000',
        specialization: 'Cardiology',
        address: '456 Medical Parkway'
      }
    });
    if (clinic2Res.status !== 201) {
      console.log('  [clinic2Res error]:', clinic2Res.status, clinic2Res.data);
    }
    assert(clinic2Res.status === 201 && clinic2Res.data?.clinic?.id, 'Clinic 2 created for Doctor 2');
    const clinic2Id = clinic2Res.data?.clinic?.id;

    // Doctor 1 tries to access Clinic 2 patients -> 403 Forbidden
    const unauthPatients = await request(`/clinics/${clinic2Id}/patients`, docAuth);
    assert(unauthPatients.status === 403, 'Doctor 1 denied access to Clinic 2 patients (HTTP 403)');

    // Doctor 1 tries to access Clinic 2 appointments -> 403 Forbidden
    const unauthAppts = await request(`/clinics/${clinic2Id}/appointments`, docAuth);
    assert(unauthAppts.status === 403, 'Doctor 1 denied access to Clinic 2 appointments (HTTP 403)');

    // Doctor 1 tries to access Clinic 2 EMR -> 403 Forbidden
    const unauthEmr = await request(`/clinics/${clinic2Id}/medical-records`, docAuth);
    assert(unauthEmr.status === 403, 'Doctor 1 denied access to Clinic 2 EMR (HTTP 403)');

    // Doctor 1 tries to access Clinic 2 prescriptions -> 403 Forbidden
    const unauthRx = await request(`/clinics/${clinic2Id}/prescriptions`, docAuth);
    assert(unauthRx.status === 403, 'Doctor 1 denied access to Clinic 2 prescriptions (HTTP 403)');

    // Doctor 1 tries to access Clinic 2 payments -> 403 Forbidden
    const unauthPayments = await request(`/clinics/${clinic2Id}/payments`, docAuth);
    assert(unauthPayments.status === 403, 'Doctor 1 denied access to Clinic 2 payments (HTTP 403)');

    // Doctor 1 tries to update Clinic 2 schedules -> 403 Forbidden
    const unauthSchedUpdate = await request(`/clinics/${clinic2Id}/schedules`, {
      method: 'PUT',
      headers: docAuth.headers,
      body: { schedules: [] }
    });
    assert(unauthSchedUpdate.status === 403, 'Doctor 1 denied permission to modify Clinic 2 schedules (HTTP 403)');

    // ───────────────────────────────────────────────────────────────────────────
    // 9. ASSISTANT ROLE & PERMISSION BOUNDARIES
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Phase 9: Assistant Role & Permission Enforcement ---');
    const assistantLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'assistant@clinic-os.com', password: 'password123' }
    });
    assert(assistantLogin.status === 200 && assistantLogin.data?.token, 'Assistant authenticated');
    const assistantToken = assistantLogin.data.token;
    const assistantAuth = { headers: { Authorization: `Bearer ${assistantToken}` } };

    // Assistant CAN view clinic patients
    const asstPatients = await request(`/clinics/${clinic1Id}/patients`, assistantAuth);
    assert(asstPatients.status === 200, 'Assistant can view clinic patients');

    // Assistant CAN view clinic appointments
    const asstAppts = await request(`/clinics/${clinic1Id}/appointments`, assistantAuth);
    assert(asstAppts.status === 200, 'Assistant can view clinic appointments');

    // Assistant CAN view payments
    const asstPayments = await request(`/clinics/${clinic1Id}/payments`, assistantAuth);
    assert(asstPayments.status === 200, 'Assistant can view clinic payments');

    // Assistant CANNOT update clinic profile -> 403
    const asstUpdateClinic = await request(`/clinics/${clinic1Id}`, {
      method: 'PUT',
      headers: assistantAuth.headers,
      body: { name: 'Hacked Clinic Name' }
    });
    assert(asstUpdateClinic.status === 403, 'Assistant denied clinic profile modification (HTTP 403)');

    // Assistant CANNOT modify schedules -> 403
    const asstUpdateSched = await request(`/clinics/${clinic1Id}/schedules`, {
      method: 'PUT',
      headers: assistantAuth.headers,
      body: { schedules: [] }
    });
    assert(asstUpdateSched.status === 403, 'Assistant denied clinic schedule modification (HTTP 403)');

    // Assistant CANNOT manage clinic staff -> 403
    const asstAddStaff = await request(`/clinics/${clinic1Id}/staff`, {
      method: 'POST',
      headers: assistantAuth.headers,
      body: { email: 'test@example.com', role: 'assistant' }
    });
    assert(asstAddStaff.status === 403, 'Assistant denied staff management permission (HTTP 403)');

    // Assistant CANNOT modify subscriptions -> 403
    const asstSub = await request('/subscriptions/subscribe', {
      method: 'POST',
      headers: assistantAuth.headers,
      body: { clinic_id: clinic1Id, plan_id: 'pro' }
    });
    assert(asstSub.status === 403, 'Assistant denied subscription modification (HTTP 403)');

    // ───────────────────────────────────────────────────────────────────────────
    // 10. NOTIFICATIONS & ANALYTICS
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Phase 10: Real-time Analytics & Notifications ---');
    const analyticsRes = await request(`/clinics/${clinic1Id}/analytics`, docAuth);
    assert(analyticsRes.status === 200 && analyticsRes.data?.summary, 'Clinic analytics returns database summary');

    const markAllRead = await request('/auth/notifications/read-all', {
      method: 'PUT',
      headers: docAuth.headers,
    });
    assert(markAllRead.status === 200, 'Notifications mark-all-read endpoint succeeded');

  } catch (err) {
    console.error('💥 Unexpected Verification Exception:', err);
    failed++;
  } finally {
    stopServer();
    console.log('\n===============================================================');
    console.log(`🏁 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================\n');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runComprehensiveVerification();
