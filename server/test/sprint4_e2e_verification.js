import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5098;
let serverProcess;

function startServer() {
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

    serverProcess.stderr.on('data', () => {});

    setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 2000);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    if (serverProcess) {
      serverProcess.kill();
      setTimeout(resolve, 500);
    } else {
      resolve();
    }
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

function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function runSprint4Verification() {
  console.log('\n===============================================================');
  console.log('🧪 CLINICOS SPRINT 4 END-TO-END HEALTHCARE ECOSYSTEM TEST');
  console.log('===============================================================');

  await startServer();

  try {
    const uniqueSuffix = Date.now();
    const patientEmail = `patient_s4_${uniqueSuffix}@example.com`;
    const otherPatientEmail = `other_patient_s4_${uniqueSuffix}@example.com`;
    let patientToken = '';
    let otherPatientToken = '';
    let doctorToken = '';
    let clinicId = '';
    let doctorId = '';
    let patientUserId = '';
    let appointmentId = '';
    let invoiceId = '';

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 1: PATIENT REGISTRATION & OTP VERIFICATION
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 1 & 2: Patient Registration, OTP & Authentication ---');
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: {
        first_name: 'John',
        last_name: 'Doe',
        email: patientEmail,
        password: 'password123',
        role: 'patient',
        phone: '+15551234567',
      },
    });
    assert(regRes.status === 201, 'Patient registered successfully');
    const patientOtp = regRes.data?.dev_otp || '123456';

    // OTP verification
    const otpRes = await request('/auth/verify-otp', {
      method: 'POST',
      body: { email: patientEmail, otp: patientOtp },
    });
    assert(otpRes.status === 200, 'Patient OTP verified');

    // Patient Login
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: patientEmail, password: 'password123' },
    });
    assert(loginRes.status === 200 && loginRes.data.token, 'Patient logged in and token issued');
    patientToken = loginRes.data.token;
    patientUserId = loginRes.data.user.id;
    const patientHeaders = { Authorization: `Bearer ${patientToken}` };

    // Register & Login other patient for isolation checks
    const otherRegRes = await request('/auth/register', {
      method: 'POST',
      body: { first_name: 'Alice', last_name: 'Smith', email: otherPatientEmail, password: 'password123', role: 'patient' },
    });
    const otherOtp = otherRegRes.data?.dev_otp || '123456';
    await request('/auth/verify-otp', { method: 'POST', body: { email: otherPatientEmail, otp: otherOtp } });
    const otherLoginRes = await request('/auth/login', { method: 'POST', body: { email: otherPatientEmail, password: 'password123' } });
    otherPatientToken = otherLoginRes.data.token;
    const otherPatientHeaders = { Authorization: `Bearer ${otherPatientToken}` };

    // Doctor login (seed doctor)
    const docLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'dr.rahman@clinic-os.com', password: 'password123' },
    });
    assert(docLoginRes.status === 200 && docLoginRes.data.token, 'Doctor authenticated');
    doctorToken = docLoginRes.data.token;
    doctorId = docLoginRes.data.user.id;
    const doctorHeaders = { Authorization: `Bearer ${doctorToken}` };

    // Get doctor clinic
    const clinicsRes = await request('/clinics', { headers: doctorHeaders });
    assert(clinicsRes.status === 200 && clinicsRes.data.clinics?.length > 0, 'Doctor clinic found');
    clinicId = clinicsRes.data.clinics[0].id;

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 3: PATIENT PROFILE & MANAGEMENT
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 3: Patient Profile Management ---');
    const profRes = await request('/auth/patient-profile', { headers: patientHeaders });
    assert(profRes.status === 200 && profRes.data.patient, 'Patient profile retrieved with fallback or record');

    const updateProfRes = await request('/auth/profile', {
      method: 'PUT',
      headers: patientHeaders,
      body: {
        first_name: 'Johnathan',
        last_name: 'Doe',
        phone: '+15559876543',
        blood_group: 'O+',
        gender: 'male',
        allergies: 'Penicillin, Dust',
        chronic_conditions: 'Mild Asthma',
        emergency_contact_name: 'Jane Doe',
        emergency_contact_phone: '+15551112222',
      },
    });
    assert(updateProfRes.status === 200, 'Patient personal demographics updated');

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 4: CLINIC & DOCTOR DISCOVERY
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 4: Clinic & Doctor Discovery Engine ---');
    const searchRes = await request('/clinics/search?query=Rahman&city=All&specialization=All');
    assert(searchRes.status === 200 && searchRes.data.clinics?.length > 0, 'Clinic discovery returns search results');
    const searchedClinic = searchRes.data.clinics.find((c) => c.id === clinicId);
    assert(searchedClinic && searchedClinic.doctor_first_name, 'Clinic card contains doctor details and metadata');

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 5: REAL-TIME AVAILABLE SLOTS ENGINE
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 5: Real-Time Available Slots Calculation ---');
    const offsetDays = 300 + Math.floor(Math.random() * 5000);
    const targetDate = new Date(Date.now() + offsetDays * 86400000);
    while (targetDate.getDay() === 0 || targetDate.getDay() === 6 || targetDate.getDay() === 5) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    const bookingDateStr = formatDate(targetDate);

    const slotsRes = await request(`/clinics/${clinicId}/available-slots?date=${bookingDateStr}`);
    assert(slotsRes.status === 200 && slotsRes.data.available === true, 'Available slots engine returns open operating hours');
    assert(slotsRes.data.slots && slotsRes.data.slots.length > 0, `Generated ${slotsRes.data.slots?.length || 0} candidate time slots`);

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 6: APPOINTMENT BOOKING BY PATIENT
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 6 & 7: Appointment Booking by Patient & Doctor Confirmation ---');
    const bookRes = await request(`/clinics/${clinicId}/appointments`, {
      method: 'POST',
      headers: patientHeaders,
      body: {
        doctor_id: doctorId,
        appointment_date: bookingDateStr,
        start_time: '11:00',
        end_time: '11:30',
        type: 'in-person',
        notes: 'Routine cardiovascular checkup and prescription renewal.',
      },
    });
    assert(bookRes.status === 201 && bookRes.data.appointment, 'Patient booked appointment successfully');
    appointmentId = bookRes.data.appointment.id;

    // Doctor checks appointments
    const docApptRes = await request(`/clinics/${clinicId}/appointments`, { headers: doctorHeaders });
    const foundInDoc = docApptRes.data.appointments?.find((a) => a.id === appointmentId);
    assert(Boolean(foundInDoc), 'Appointment appears on Doctor Workspace');

    // Doctor confirms appointment
    const confirmRes = await request(`/clinics/${clinicId}/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      headers: doctorHeaders,
      body: { status: 'confirmed' },
    });
    assert(confirmRes.status === 200 && confirmRes.data.appointment.status === 'confirmed', 'Doctor confirmed appointment');

    // Patient verifies status
    const myApptsRes = await request('/auth/appointments', { headers: patientHeaders });
    const patientAppt = myApptsRes.data.appointments?.find((a) => a.id === appointmentId);
    assert(patientAppt && patientAppt.status === 'confirmed', 'Patient dashboard reflects confirmed appointment status');

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 8: EMR RECORD CREATION & PATIENT CONFIDENTIALITY
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 8: EMR Record Creation & Confidentiality Filtering ---');
    const patientRecordInClinic = patientAppt.patient_id;

    // Doctor creates standard record
    const emrStandardRes = await request(`/clinics/${clinicId}/medical-records`, {
      method: 'POST',
      headers: doctorHeaders,
      body: {
        patient_id: patientRecordInClinic,
        appointment_id: appointmentId,
        diagnosis: 'Stage 1 Essential Hypertension',
        symptoms: 'Mild morning headache and elevated systolic BP (142/90 mmHg)',
        treatment_plan: 'Initiate Amlodipine 5mg OD, low-sodium dietary modification, follow up in 4 weeks.',
        notes: 'Patient advised on regular aerobic exercise and BP diary.',
        is_confidential: false,
      },
    });
    assert(emrStandardRes.status === 201, 'Doctor created standard clinical EMR');

    // Doctor creates confidential note
    const emrConfidentialRes = await request(`/clinics/${clinicId}/medical-records`, {
      method: 'POST',
      headers: doctorHeaders,
      body: {
        patient_id: patientRecordInClinic,
        appointment_id: appointmentId,
        diagnosis: 'Internal Clinical Risk Assessment',
        notes: 'Confidential Doctor Note: Family history of early-onset coronary artery disease; monitor closely.',
        is_confidential: true,
      },
    });
    assert(emrConfidentialRes.status === 201, 'Doctor created confidential internal note');

    // Patient queries their medical records
    const patientRecordsRes = await request('/auth/medical-records', { headers: patientHeaders });
    assert(patientRecordsRes.status === 200, 'Patient retrieved medical records');
    const standardFound = patientRecordsRes.data.records?.some((r) => r.diagnosis.includes('Essential Hypertension'));
    const confidentialFound = patientRecordsRes.data.records?.some((r) => r.diagnosis.includes('Internal Clinical Risk'));
    assert(standardFound, 'Patient can view standard clinical SOAP record');
    assert(!confidentialFound, 'Confidential doctor notes are strictly filtered and isolated from patient');

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 9: DIGITAL PRESCRIPTION ISSUANCE & PATIENT RX PORTAL
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 9: Multi-Item Digital Prescription Issuance ---');
    const rxRes = await request(`/clinics/${clinicId}/prescriptions`, {
      method: 'POST',
      headers: doctorHeaders,
      body: {
        patient_id: patientRecordInClinic,
        appointment_id: appointmentId,
        diagnosis: 'Essential Hypertension & Dyslipidemia',
        notes: 'Take medications with a full glass of water after breakfast.',
        items: [
          { medication_name: 'Amlodipine 5mg', dosage: '1 tablet', frequency: 'Once daily (morning)', duration: '30 days', route: 'Oral', instructions: 'After breakfast' },
          { medication_name: 'Atorvastatin 20mg', dosage: '1 tablet', frequency: 'Once daily (bedtime)', duration: '30 days', route: 'Oral', instructions: 'At bedtime' },
          { medication_name: 'Omega-3 Fish Oil 1000mg', dosage: '1 capsule', frequency: 'Twice daily', duration: '60 days', route: 'Oral', instructions: 'With meals' },
        ],
      },
    });
    assert(rxRes.status === 201 && rxRes.data.prescription.items?.length === 3, 'Doctor created digital prescription with 3 medication items');

    // Patient views prescription
    const myRxRes = await request('/auth/prescriptions', { headers: patientHeaders });
    assert(myRxRes.status === 200 && myRxRes.data.prescriptions?.length > 0, 'Patient portal retrieved digital prescriptions');
    const latestRx = myRxRes.data.prescriptions[0];
    assert(latestRx.items && latestRx.items.length === 3, 'Prescription items correctly linked with dosage, frequency, and instructions');

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 10: INVOICING & SIMULATED PAYMENT SETTLEMENT
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 10: Invoicing & Simulated Payment Checkout ---');
    const invRes = await request(`/clinics/${clinicId}/payments`, {
      method: 'POST',
      headers: doctorHeaders,
      body: {
        patient_id: patientRecordInClinic,
        appointment_id: appointmentId,
        amount: 85.00,
        discount: 10.00,
        tax: 5.00,
        payment_method: 'card',
        notes: 'Consultation & Comprehensive Rx Plan',
      },
    });
    assert(invRes.status === 201 && invRes.data.payment, 'Doctor generated invoice for patient');
    invoiceId = invRes.data.payment.id;
    assert(invRes.data.payment.total_amount === 80, 'Total amount calculated accurately ($85 - $10 + $5 = $80)');

    // Patient views pending invoices
    const myPaymentsRes = await request('/auth/payments', { headers: patientHeaders });
    const foundInvoice = myPaymentsRes.data.payments?.find((p) => p.id === invoiceId);
    assert(foundInvoice && foundInvoice.payment_status === 'pending', 'Patient sees pending invoice in portal');

    // Patient completes simulated payment
    const payRes = await request(`/clinics/${clinicId}/payments/${invoiceId}`, {
      method: 'PUT',
      headers: patientHeaders,
      body: {
        status: 'completed',
        transaction_id: `TXN-BKASH-${Date.now()}`,
        payment_method: 'mobile_banking',
      },
    });
    assert(payRes.status === 200 && payRes.data.payment.payment_status === 'completed', 'Patient completed simulated mobile banking checkout');

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 11: CONSULTATION COMPLETION & REVIEWS
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 11: Completed Consultation & Patient Review ---');
    // Doctor completes appointment
    await request(`/clinics/${clinicId}/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      headers: doctorHeaders,
      body: { status: 'completed' },
    });

    // Patient leaves review
    const reviewRes = await request(`/clinics/${clinicId}/reviews`, {
      method: 'POST',
      headers: patientHeaders,
      body: {
        rating: 5,
        comment: 'Exceptional care, clear diagnosis, and prompt prescription. Highly recommend Dr. Rahman!',
      },
    });
    assert(reviewRes.status === 201, 'Patient submitted 5-star consultation review');

    // Duplicate review constraint check
    const dupReviewRes = await request(`/clinics/${clinicId}/reviews`, {
      method: 'POST',
      headers: patientHeaders,
      body: { rating: 4, comment: 'Duplicate review' },
    });
    assert(dupReviewRes.status === 400, 'Duplicate review rejected with HTTP 400 (Unique constraint respected)');

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 12: DOCTOR ↔ PATIENT DIRECT MESSAGING
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 12: Doctor ↔ Patient Direct Messaging ---');
    // Patient sends message to Doctor
    const sendMsgRes = await request('/messages', {
      method: 'POST',
      headers: patientHeaders,
      body: {
        receiver_id: doctorId,
        subject: 'Prescription Dosage Question',
        message: 'Hello Dr. Rahman, should I take the Atorvastatin before or after my evening meal?',
      },
    });
    assert(sendMsgRes.status === 201, 'Patient sent message to Doctor');
    const msgId = sendMsgRes.data.message.id;

    // Doctor checks inbox
    const docInboxRes = await request('/messages/my', { headers: doctorHeaders });
    const receivedMsg = docInboxRes.data.messages?.find((m) => m.id === msgId);
    assert(Boolean(receivedMsg), 'Doctor received message in inbox');

    // Doctor marks read and replies
    await request(`/messages/${msgId}/read`, { method: 'PUT', headers: doctorHeaders });
    const replyRes = await request('/messages', {
      method: 'POST',
      headers: doctorHeaders,
      body: {
        receiver_id: patientUserId,
        subject: 'Re: Prescription Dosage Question',
        message: 'Hi John, please take Atorvastatin at bedtime with water, independent of food timing.',
      },
    });
    assert(replyRes.status === 201, 'Doctor replied to patient message');

    // Patient checks messages
    const patientInboxRes = await request('/messages/my', { headers: patientHeaders });
    const patientReply = patientInboxRes.data.messages?.find((m) => m.id === replyRes.data.message.id);
    assert(Boolean(patientReply), 'Patient received Doctor reply in inbox');

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 13: NOTIFICATIONS SYSTEM
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 13: Persistent Notifications ---');
    const patientNotifsRes = await request('/auth/notifications', { headers: patientHeaders });
    assert(patientNotifsRes.status === 200 && patientNotifsRes.data.notifications?.length > 0, 'Notifications created and persisted for patient events');

    const markAllReadRes = await request('/auth/notifications/read-all', { method: 'PUT', headers: patientHeaders });
    assert(markAllReadRes.status === 200, 'Patient notifications marked as read');

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 14: ADVERSARIAL MULTI-TENANT ISOLATION TESTS
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- Step 14: Security & Cross-Patient Isolation Attacks ---');
    // Other patient attempts to access first patient's prescription
    const hackRxRes = await request(`/clinics/${clinicId}/prescriptions/${latestRx.id}`, { headers: otherPatientHeaders });
    assert(hackRxRes.status === 403, 'Unauthorized patient blocked from accessing other patient prescription (HTTP 403)');

    // Other patient attempts to modify first patient's invoice
    const hackPayRes = await request(`/clinics/${clinicId}/payments/${invoiceId}`, {
      method: 'PUT',
      headers: otherPatientHeaders,
      body: { status: 'refunded' },
    });
    assert(hackPayRes.status === 403, 'Unauthorized patient blocked from modifying other patient invoice (HTTP 403)');

    console.log('\n===============================================================');
    console.log(`🏁 SPRINT 4 TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');
  } catch (err) {
    console.error('Fatal error during verification run:', err);
  } finally {
    await stopServer();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runSprint4Verification();
