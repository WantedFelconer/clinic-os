import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5097;
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

async function runPostImplementationPass() {
  console.log('\n======================================================================');
  console.log('🧪 SPRINT 4 — RIGOROUS POST-IMPLEMENTATION VERIFICATION & FIX PASS');
  console.log('======================================================================');

  await startServer();

  try {
    const uniqueSuffix = Date.now();
    const patientEmail = `patient_post_${uniqueSuffix}@example.com`;
    const otherPatientEmail = `adversary_patient_${uniqueSuffix}@example.com`;
    let patientToken = '';
    let otherPatientToken = '';
    let doctorToken = '';
    let clinicId = '';
    let doctorId = '';
    let patientUserId = '';
    let appointmentId = '';
    let invoiceId = '';
    let prescriptionId = '';
    let medicalRecordId = '';

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 1: COMPLETE PATIENT ONBOARDING FLOW
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 1. Patient Registration, OTP Verification & Authentication ---');
    const regRes = await request('/auth/register', {
      method: 'POST',
      body: {
        first_name: 'David',
        last_name: 'Miller',
        email: patientEmail,
        password: 'password123',
        role: 'patient',
        phone: '+15552345678',
      },
    });
    assert(regRes.status === 201, 'Patient registered successfully');
    const patientOtp = regRes.data?.dev_otp || '123456';

    const otpRes = await request('/auth/verify-otp', {
      method: 'POST',
      body: { email: patientEmail, otp: patientOtp },
    });
    assert(otpRes.status === 200, 'Patient OTP verified');

    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: patientEmail, password: 'password123' },
    });
    assert(loginRes.status === 200 && loginRes.data.token, 'Patient logged in and token issued');
    patientToken = loginRes.data.token;
    patientUserId = loginRes.data.user.id;
    const patientHeaders = { Authorization: `Bearer ${patientToken}` };

    // Register second patient for adversarial security testing
    const otherRegRes = await request('/auth/register', {
      method: 'POST',
      body: { first_name: 'Eve', last_name: 'Hacker', email: otherPatientEmail, password: 'password123', role: 'patient' },
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

    const clinicsRes = await request('/clinics', { headers: doctorHeaders });
    assert(clinicsRes.status === 200 && clinicsRes.data.clinics?.length > 0, 'Doctor clinic found');
    clinicId = clinicsRes.data.clinics[0].id;

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 2: PATIENT PROFILE & DASHBOARD METRICS
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. Patient Profile & Clinical Demographics Management ---');
    const updateProfRes = await request('/auth/profile', {
      method: 'PUT',
      headers: patientHeaders,
      body: {
        first_name: 'David',
        last_name: 'Miller',
        phone: '+15552345678',
        date_of_birth: '1988-04-12',
        gender: 'male',
        blood_group: 'B+',
        allergies: 'Aspirin, Shellfish',
        chronic_conditions: 'Type 2 Diabetes',
        emergency_contact_name: 'Sarah Miller',
        emergency_contact_phone: '+15558889999',
        address: '742 Evergreen Terrace, Springfield',
      },
    });
    assert(updateProfRes.status === 200, 'Patient profile and medical demographics updated');

    const profRes = await request('/auth/patient-profile', { headers: patientHeaders });
    assert(profRes.status === 200 && profRes.data.patient.blood_group === 'B+', 'Profile persisted and retrieved with B+ blood group');

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 3: DISCOVERY & REAL-TIME AVAILABLE SLOTS
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 3. Discovery Engine & Real-Time Dynamic Slots ---');
    const searchRes = await request('/clinics/search?query=Rahman&city=All&specialization=All');
    assert(searchRes.status === 200 && searchRes.data.clinics?.length > 0, 'Discovery returns verified clinics');

    // Pick a valid weekday (Monday-Thursday)
    const offsetDays = 200 + Math.floor(Math.random() * 4000);
    const targetDate = new Date(Date.now() + offsetDays * 86400000);
    while (targetDate.getDay() === 0 || targetDate.getDay() === 6 || targetDate.getDay() === 5) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    const bookingDateStr = formatDate(targetDate);

    const slotsRes = await request(`/clinics/${clinicId}/available-slots?date=${bookingDateStr}`);
    assert(slotsRes.status === 200 && slotsRes.data.available === true, 'Available slots calculated from clinic schedules');
    assert(slotsRes.data.slots && slotsRes.data.slots.length > 0, `Generated ${slotsRes.data.slots?.length} candidate time slots`);

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 4: APPOINTMENT LIFECYCLE & CROSS-ROLE VISIBILITY
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 4. Appointment Booking, Cross-Role Visibility & Rescheduling ---');
    const bookRes = await request(`/clinics/${clinicId}/appointments`, {
      method: 'POST',
      headers: patientHeaders,
      body: {
        doctor_id: doctorId,
        appointment_date: bookingDateStr,
        start_time: '10:00',
        end_time: '10:30',
        type: 'in-person',
        notes: 'Follow-up for blood glucose monitoring',
      },
    });
    assert(bookRes.status === 201 && bookRes.data.appointment, 'Patient booked appointment successfully');
    appointmentId = bookRes.data.appointment.id;

    // Doctor sees the appointment
    const docApptRes = await request(`/clinics/${clinicId}/appointments`, { headers: doctorHeaders });
    const foundDocAppt = docApptRes.data.appointments?.find((a) => a.id === appointmentId);
    assert(Boolean(foundDocAppt), 'Doctor sees the newly booked appointment in workspace');

    // Doctor confirms appointment
    const confirmRes = await request(`/clinics/${clinicId}/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      headers: doctorHeaders,
      body: { status: 'confirmed' },
    });
    assert(confirmRes.status === 200 && confirmRes.data.appointment.status === 'confirmed', 'Doctor confirmed appointment');

    // Patient sees confirmed status
    const patientApptsRes = await request('/auth/appointments', { headers: patientHeaders });
    const foundPatientAppt = patientApptsRes.data.appointments?.find((a) => a.id === appointmentId);
    assert(foundPatientAppt && foundPatientAppt.status === 'confirmed', 'Patient portal reflects confirmed status');

    // Patient reschedules appointment to 11:00
    const rescheduleRes = await request(`/clinics/${clinicId}/appointments/${appointmentId}/reschedule`, {
      method: 'PUT',
      headers: patientHeaders,
      body: {
        appointment_date: bookingDateStr,
        start_time: '11:00',
        end_time: '11:30',
      },
    });
    assert(rescheduleRes.status === 200 && rescheduleRes.data.appointment.start_time.startsWith('11:00'), 'Patient rescheduled appointment to 11:00');

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 5: CLINICAL EMR & CONFIDENTIALITY ENFORCEMENT
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 5. Doctor EMR & Confidentiality Isolation ---');
    const patientRecordInClinic = foundPatientAppt.patient_id;

    // Doctor records standard SOAP note
    const emrRes = await request(`/clinics/${clinicId}/medical-records`, {
      method: 'POST',
      headers: doctorHeaders,
      body: {
        patient_id: patientRecordInClinic,
        appointment_id: appointmentId,
        diagnosis: 'Type 2 Diabetes Mellitus with Mild Hyperglycemia',
        symptoms: 'Fasting BG 135 mg/dL, HbA1c 6.8%',
        treatment_plan: 'Continue Metformin 500mg BD, dietary counseling, repeat HbA1c in 3 months.',
        is_confidential: false,
      },
    });
    assert(emrRes.status === 201 && emrRes.data.record, 'Doctor recorded clinical EMR');
    medicalRecordId = emrRes.data.record.id;

    // Doctor records internal confidential note
    const confEMRRes = await request(`/clinics/${clinicId}/medical-records`, {
      method: 'POST',
      headers: doctorHeaders,
      body: {
        patient_id: patientRecordInClinic,
        appointment_id: appointmentId,
        diagnosis: 'Internal Clinical Risk Evaluation',
        notes: 'Confidential Note: High risk of diabetic nephropathy; schedule microalbuminuria screening.',
        is_confidential: true,
      },
    });
    assert(confEMRRes.status === 201, 'Doctor created confidential clinical note');

    // Patient retrieves medical records
    const patientRecordsRes = await request('/auth/medical-records', { headers: patientHeaders });
    assert(patientRecordsRes.status === 200, 'Patient retrieved medical records');
    const standardFound = patientRecordsRes.data.records?.some((r) => r.diagnosis.includes('Type 2 Diabetes'));
    const confidentialFound = patientRecordsRes.data.records?.some((r) => r.diagnosis.includes('Internal Clinical Risk'));
    assert(standardFound, 'Patient can view standard clinical SOAP record');
    assert(!confidentialFound, 'Confidential doctor notes are strictly filtered from patient viewer');

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 6: MULTI-ITEM DIGITAL PRESCRIPTION
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 6. Multi-Item Digital Prescription Issuance & Patient Portal ---');
    const rxRes = await request(`/clinics/${clinicId}/prescriptions`, {
      method: 'POST',
      headers: doctorHeaders,
      body: {
        patient_id: patientRecordInClinic,
        appointment_id: appointmentId,
        diagnosis: 'Type 2 Diabetes Mellitus',
        notes: 'Take medications regularly with meals. Avoid refined sugars.',
        items: [
          { medication_name: 'Metformin 500mg', dosage: '1 tablet', frequency: 'Twice daily', duration: '90 days', route: 'Oral', instructions: 'With breakfast and dinner' },
          { medication_name: 'Glimepiride 1mg', dosage: '1 tablet', frequency: 'Once daily', duration: '30 days', route: 'Oral', instructions: 'Before breakfast' },
          { medication_name: 'Vitamin B-Complex', dosage: '1 capsule', frequency: 'Once daily', duration: '60 days', route: 'Oral', instructions: 'After lunch' },
        ],
      },
    });
    assert(rxRes.status === 201 && rxRes.data.prescription.items?.length === 3, 'Doctor issued 3-item digital prescription');
    prescriptionId = rxRes.data.prescription.id;

    // Patient views prescription with breakdown
    const patientRxRes = await request('/auth/prescriptions', { headers: patientHeaders });
    assert(patientRxRes.status === 200 && patientRxRes.data.prescriptions?.length > 0, 'Patient retrieved digital prescriptions');
    const latestRx = patientRxRes.data.prescriptions[0];
    assert(latestRx.items && latestRx.items.length === 3, 'Prescription table contains all 3 medication items with dosage and duration');

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 7: INVOICING & SIMULATED PAYMENT
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 7. Invoicing & Simulated Multi-Channel Payment Settlement ---');
    const invRes = await request(`/clinics/${clinicId}/payments`, {
      method: 'POST',
      headers: doctorHeaders,
      body: {
        patient_id: patientRecordInClinic,
        appointment_id: appointmentId,
        amount: 100.00,
        discount: 15.00,
        tax: 5.00,
        payment_method: 'card',
        notes: 'Endocrinology Consultation & Digital Prescription',
      },
    });
    assert(invRes.status === 201 && invRes.data.payment, 'Doctor generated patient invoice');
    invoiceId = invRes.data.payment.id;
    assert(invRes.data.payment.total_amount === 90, 'Total amount calculated accurately ($100 - $15 + $5 = $90)');

    // Patient sees pending invoice
    const patientPayRes = await request('/auth/payments', { headers: patientHeaders });
    const pendingInv = patientPayRes.data.payments?.find((p) => p.id === invoiceId);
    assert(pendingInv && pendingInv.payment_status === 'pending', 'Patient sees pending invoice in portal');

    // Patient completes simulated payment
    const payRes = await request(`/clinics/${clinicId}/payments/${invoiceId}`, {
      method: 'PUT',
      headers: patientHeaders,
      body: {
        status: 'completed',
        transaction_id: `TXN-CARD-${Date.now()}`,
        payment_method: 'card',
      },
    });
    assert(payRes.status === 200 && payRes.data.payment.payment_status === 'completed', 'Patient completed simulated card checkout');

    // Both sides reflect completed status
    const docPaymentsRes = await request(`/clinics/${clinicId}/payments`, { headers: doctorHeaders });
    const docFoundPayment = docPaymentsRes.data.payments?.find((p) => p.id === invoiceId);
    assert(docFoundPayment && docFoundPayment.payment_status === 'completed', 'Doctor workspace reflects settled invoice');

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 8: CONSULTATION COMPLETION & REVIEWS
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 8. Consultation Completion & Doctor Reviews ---');
    await request(`/clinics/${clinicId}/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      headers: doctorHeaders,
      body: { status: 'completed' },
    });

    const reviewRes = await request(`/clinics/${clinicId}/reviews`, {
      method: 'POST',
      headers: patientHeaders,
      body: {
        rating: 5,
        comment: 'Dr. Rahman gave very practical diabetic advice and clear prescription guidelines!',
      },
    });
    assert(reviewRes.status === 201, 'Patient submitted 5-star review');

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 9: TWO-WAY MESSAGING & NOTIFICATIONS
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 9. Two-Way Direct Messaging & Persistent Notifications ---');
    const msgRes = await request('/messages', {
      method: 'POST',
      headers: patientHeaders,
      body: {
        receiver_id: doctorId,
        subject: 'Glimepiride timing question',
        message: 'Hello Doctor, if I skip breakfast, should I still take Glimepiride 1mg?',
      },
    });
    assert(msgRes.status === 201, 'Patient sent direct message to Doctor');
    const patientMsgId = msgRes.data.message.id;

    // Doctor checks inbox & replies
    const docInbox = await request('/messages/my', { headers: doctorHeaders });
    const docMsg = docInbox.data.messages?.find((m) => m.id === patientMsgId);
    assert(Boolean(docMsg), 'Doctor received message in inbox');

    const replyRes = await request('/messages', {
      method: 'POST',
      headers: doctorHeaders,
      body: {
        receiver_id: patientUserId,
        subject: 'Re: Glimepiride timing question',
        message: 'No David, never take Glimepiride without meals to avoid hypoglycemia.',
      },
    });
    assert(replyRes.status === 201, 'Doctor replied to patient message');

    const patientInbox = await request('/messages/my', { headers: patientHeaders });
    const replyReceived = patientInbox.data.messages?.some((m) => m.id === replyRes.data.message.id);
    assert(replyReceived, 'Patient received Doctor reply in inbox');

    // Notifications verification
    const notifsRes = await request('/auth/notifications', { headers: patientHeaders });
    assert(notifsRes.status === 200 && notifsRes.data.notifications?.length > 0, 'Patient notifications recorded and retrieved');

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 10: SECURITY & ADVERSARIAL ID MANIPULATION TESTS
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 10. Security & Adversarial Cross-Patient ID Manipulation Tests ---');
    // Adversary patient attempts to access first patient's prescription
    const hackRxRes = await request(`/clinics/${clinicId}/prescriptions/${prescriptionId}`, { headers: otherPatientHeaders });
    assert(hackRxRes.status === 403, 'Adversary blocked from accessing other patient prescription (HTTP 403)');

    // Adversary patient attempts to access first patient's medical record
    const hackEMRRes = await request(`/clinics/${clinicId}/medical-records/${medicalRecordId}`, { headers: otherPatientHeaders });
    assert(hackEMRRes.status === 403, 'Adversary blocked from accessing other patient EMR record (HTTP 403)');

    // Adversary patient attempts to modify first patient's invoice
    const hackPayRes = await request(`/clinics/${clinicId}/payments/${invoiceId}`, {
      method: 'PUT',
      headers: otherPatientHeaders,
      body: { status: 'refunded' },
    });
    assert(hackPayRes.status === 403, 'Adversary blocked from modifying other patient invoice (HTTP 403)');

    // Adversary patient attempts to modify clinic operating schedules
    const hackSchedRes = await request(`/clinics/${clinicId}/schedules`, {
      method: 'PUT',
      headers: otherPatientHeaders,
      body: { schedules: [] },
    });
    assert(hackSchedRes.status === 403, 'Adversary blocked from modifying clinic operating schedules (HTTP 403)');

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 11: ERROR HANDLING & EDGE CASE TESTING
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 11. Error Handling & Edge Case Validation ---');
    // Unavailable Sunday slot booking
    const sundayDate = new Date(Date.now() + 86400000 * 10);
    while (sundayDate.getDay() !== 0) sundayDate.setDate(sundayDate.getDate() + 1);
    const sundayStr = formatDate(sundayDate);

    const sundayBookRes = await request(`/clinics/${clinicId}/appointments`, {
      method: 'POST',
      headers: patientHeaders,
      body: {
        doctor_id: doctorId,
        appointment_date: sundayStr,
        start_time: '10:00',
        end_time: '10:30',
      },
    });
    assert(sundayBookRes.status === 400 && sundayBookRes.data.message.includes('closed'), 'Booking on closed Sunday rejected with HTTP 400');

    // Schedule conflict / double booking
    const conflictBookRes = await request(`/clinics/${clinicId}/appointments`, {
      method: 'POST',
      headers: doctorHeaders,
      body: {
        patient_id: patientRecordInClinic,
        doctor_id: doctorId,
        appointment_date: bookingDateStr,
        start_time: '11:00',
        end_time: '11:30',
      },
    });
    assert(conflictBookRes.status === 409, 'Overlapping appointment booking rejected with HTTP 409 Conflict');

    // Invalid appointment ID status update
    const invalidApptRes = await request(`/clinics/${clinicId}/appointments/00000000-0000-0000-0000-000000000000/status`, {
      method: 'PATCH',
      headers: doctorHeaders,
      body: { status: 'confirmed' },
    });
    assert(invalidApptRes.status === 404, 'Invalid appointment ID update returns HTTP 404 Not Found');

    // Empty message sending validation
    const emptyMsgRes = await request('/messages', {
      method: 'POST',
      headers: patientHeaders,
      body: { receiver_id: doctorId, message: '' },
    });
    assert(emptyMsgRes.status === 400, 'Empty message rejected with HTTP 400');

    // Duplicate review rejection
    const dupReviewRes = await request(`/clinics/${clinicId}/reviews`, {
      method: 'POST',
      headers: patientHeaders,
      body: { rating: 4, comment: 'Second review' },
    });
    assert(dupReviewRes.status === 400, 'Duplicate review rejected with HTTP 400');

    // ───────────────────────────────────────────────────────────────────────────
    // SECTION 12: LOGOUT & RE-LOGIN INTEGRITY
    // ───────────────────────────────────────────────────────────────────────────
    console.log('\n--- 12. Logout & Re-Login Integrity ---');
    const reloginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: patientEmail, password: 'password123' },
    });
    assert(reloginRes.status === 200 && reloginRes.data.user.email === patientEmail, 'Patient logged in again after session');

    const freshPatientHeaders = { Authorization: `Bearer ${reloginRes.data.token}` };
    const freshProfileRes = await request('/auth/patient-profile', { headers: freshPatientHeaders });
    assert(freshProfileRes.status === 200 && freshProfileRes.data.patient.chronic_conditions === 'Type 2 Diabetes', 'Patient profile attributes persisted across sessions');

    console.log('\n======================================================================');
    console.log(`🏁 POST-IMPLEMENTATION PASS COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================');
  } catch (err) {
    console.error('Fatal error during post-implementation pass:', err);
  } finally {
    await stopServer();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runPostImplementationPass();
