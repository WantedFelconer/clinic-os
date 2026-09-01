import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 5099;
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
      console.log('[Server stdout]:', msg.trim());
      if (msg.includes('running on port') || msg.includes(PORT.toString()) || msg.includes('Server running')) {
        if (!started) {
          started = true;
          setTimeout(resolve, 500);
        }
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[Server stderr]:', data.toString().trim());
    });

    setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 4000);
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

async function runTests() {
  console.log('🚀 Starting test server on port', PORT);
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
    // 1. Authenticate as Doctor
    console.log('\n--- Test 1: Authentication ---');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'dr.rahman@clinic-os.com', password: 'password123' }
    });
    assert(loginRes.status === 200 && loginRes.data?.token, 'Doctor login succeeded and returned JWT');
    const doctorToken = loginRes.data?.token;
    const authHeaders = { Authorization: `Bearer ${doctorToken}` };

    // 2. Get Doctor Clinic
    console.log('\n--- Test 2: Clinic Retrieval ---');
    const clinicsRes = await request('/clinics', { headers: authHeaders });
    const clinics = clinicsRes.data?.clinics || clinicsRes.data || [];
    assert(clinics.length > 0, `Doctor has ${clinics.length} clinic(s)`);
    const clinicId = clinics[0].id;
    console.log(`  Using clinic ID: ${clinicId}`);

    // 3. Get Clinic Operating Hours / Schedules
    console.log('\n--- Test 3: Clinic Operating Hours & Schedules ---');
    const schedRes = await request(`/clinics/${clinicId}/schedules`, { headers: authHeaders });
    assert(schedRes.status === 200 && Array.isArray(schedRes.data?.schedules), 'Operating hours fetched successfully');

    function formatDate(d) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // 4. Test Schedule Validation (Out of Operating Hours rejection)
    console.log('\n--- Test 4: Schedule Validation ---');
    const randomOffset = 100 + Math.floor(Math.random() * 9000);
    const nextMonday = new Date(Date.now() + randomOffset * 86400000);
    while (nextMonday.getDay() !== 1) nextMonday.setDate(nextMonday.getDate() + 1);
    const mondayDateStr = formatDate(nextMonday);

    const patientsRes = await request(`/clinics/${clinicId}/patients`, { headers: authHeaders });
    const patients = patientsRes.data?.patients || [];
    assert(patients.length > 0, `Clinic has ${patients.length} patient(s)`);
    const patientId = patients[0].id;

    // Try booking at 02:00 AM (Outside operating hours)
    const invalidAppt = await request(`/clinics/${clinicId}/appointments`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        patient_id: patientId,
        appointment_date: mondayDateStr,
        start_time: '02:00:00',
        end_time: '02:30:00',
        type: 'in-person',
      }
    });
    assert(invalidAppt.status === 400, 'Appointment outside operating hours correctly rejected with HTTP 400');

    // 5. Create Valid Appointment
    console.log('\n--- Test 5: Valid Appointment Creation ---');
    const validAppt = await request(`/clinics/${clinicId}/appointments`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        patient_id: patientId,
        appointment_date: mondayDateStr,
        start_time: '11:00:00',
        end_time: '11:30:00',
        type: 'in-person',
        notes: 'Initial consultation',
      }
    });
    if (validAppt.status !== 201) {
      console.log('  [validAppt error]:', validAppt.status, validAppt.data);
    }
    assert(validAppt.status === 201 && validAppt.data?.appointment?.id, 'Valid appointment created successfully');
    const appointmentId = validAppt.data?.appointment?.id;

    // 6. Test Conflict Prevention (Overlapping slot)
    console.log('\n--- Test 6: Conflict Prevention ---');
    const conflictAppt = await request(`/clinics/${clinicId}/appointments`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        patient_id: patientId,
        appointment_date: mondayDateStr,
        start_time: '11:15:00',
        end_time: '11:45:00',
        type: 'in-person',
      }
    });
    assert(conflictAppt.status === 409, 'Overlapping appointment correctly rejected with HTTP 409 Conflict');

    // 7. Appointment Lifecycle Status Transitions
    console.log('\n--- Test 7: Appointment Status Transitions ---');
    const confirmRes = await request(`/clinics/${clinicId}/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: { status: 'confirmed' }
    });
    assert(confirmRes.status === 200, 'Appointment updated to confirmed');

    const inProgRes = await request(`/clinics/${clinicId}/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: { status: 'in_progress' }
    });
    assert(inProgRes.status === 200, 'Appointment updated to in_progress');

    const completeRes = await request(`/clinics/${clinicId}/appointments/${appointmentId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: { status: 'completed' }
    });
    assert(completeRes.status === 200, 'Appointment updated to completed');

    // 8. Reschedule Test
    console.log('\n--- Test 8: Reschedule Test ---');
    const nextTuesday = new Date(nextMonday.getTime() + 86400000);
    const tuesdayDateStr = formatDate(nextTuesday);

    const newAppt = await request(`/clinics/${clinicId}/appointments`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        patient_id: patientId,
        appointment_date: tuesdayDateStr,
        start_time: '14:00:00',
        end_time: '14:30:00',
        type: 'in-person',
      }
    });
    const newApptId = newAppt.data?.appointment?.id;

    const rescheduleRes = await request(`/clinics/${clinicId}/appointments/${newApptId}/reschedule`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        appointment_date: tuesdayDateStr,
        start_time: '15:00:00',
        end_time: '15:30:00',
      }
    });
    assert(rescheduleRes.status === 200, 'Appointment successfully rescheduled to 15:00');

    // Cancel with reason
    const cancelRes = await request(`/clinics/${clinicId}/appointments/${newApptId}/status`, {
      method: 'PATCH',
      headers: authHeaders,
      body: {
        status: 'cancelled',
        cancellation_reason: 'Patient requested cancellation due to travel'
      }
    });
    assert(cancelRes.status === 200, 'Appointment cancelled with cancellation reason');

    // 9. Patient Full Clinical History
    console.log('\n--- Test 9: Patient Clinical History ---');
    const historyRes = await request(`/clinics/${clinicId}/patients/${patientId}/history`, { headers: authHeaders });
    assert(historyRes.status === 200, 'Patient history endpoint returned HTTP 200');
    assert(historyRes.data?.patient && Array.isArray(historyRes.data?.appointments), 'Patient history contains demographics and appointments');

    // 10. Prescription with Medication Items
    console.log('\n--- Test 10: Digital Prescription Creation ---');
    const rxRes = await request(`/clinics/${clinicId}/prescriptions`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        patient_id: patientId,
        diagnosis: 'Essential Hypertension',
        notes: 'Take medications with meals',
        items: [
          { medicine_name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '30 days', instructions: 'Morning' },
          { medicine_name: 'Atorvastatin', dosage: '10mg', frequency: 'Once daily', duration: '30 days', instructions: 'Night' }
        ]
      }
    });
    assert(rxRes.status === 201 && rxRes.data?.prescription?.id, 'Prescription with 2 items created');
    const rxId = rxRes.data?.prescription?.id;

    const rxDetailRes = await request(`/clinics/${clinicId}/prescriptions/${rxId}`, { headers: authHeaders });
    assert(rxDetailRes.data?.prescription?.items?.length === 2, 'Prescription items retrieved successfully');

    // 11. Payments & Billing
    console.log('\n--- Test 11: Billing & Payments ---');
    const invoiceRes = await request(`/clinics/${clinicId}/payments`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        patient_id: patientId,
        amount: 150.00,
        total_amount: 150.00,
        notes: 'Consultation and lab fee'
      }
    });
    assert(invoiceRes.status === 201 && invoiceRes.data?.payment?.invoice_number, 'Invoice generated with invoice_number');
    const paymentId = invoiceRes.data?.payment?.id;

    // Record payment
    const payRes = await request(`/clinics/${clinicId}/payments/${paymentId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: {
        status: 'completed',
        payment_method: 'card',
        notes: 'Paid via Stripe / Card'
      }
    });
    assert(payRes.status === 200, 'Payment recorded as completed');

    // Summary
    const paymentsList = await request(`/clinics/${clinicId}/payments`, { headers: authHeaders });
    assert(paymentsList.data?.summary && paymentsList.data?.summary.total_collected > 0, 'Payment summary metrics calculated accurately');

    // 12. Analytics Endpoint
    console.log('\n--- Test 12: Clinic Analytics ---');
    const analyticsRes = await request(`/clinics/${clinicId}/analytics`, { headers: authHeaders });
    assert(analyticsRes.status === 200, 'Analytics endpoint returned HTTP 200');
    assert(analyticsRes.data?.summary && Array.isArray(analyticsRes.data?.monthly_trends), 'Analytics returned summary and monthly trends');

    // 13. Notifications Mark All Read
    console.log('\n--- Test 13: Notifications Mark All Read ---');
    const markAllRes = await request('/auth/notifications/read-all', {
      method: 'PUT',
      headers: authHeaders
    });
    assert(markAllRes.status === 200, 'Notifications mark-all-read endpoint returned HTTP 200');

    // 14. Staff Management
    console.log('\n--- Test 14: Staff Management ---');
    const staffRes = await request(`/clinics/${clinicId}/staff`, { headers: authHeaders });
    assert(staffRes.status === 200 && Array.isArray(staffRes.data?.staff), 'Staff list fetched successfully');

  } catch (err) {
    console.error('💥 Unexpected Test Exception:', err);
    failed++;
  } finally {
    stopServer();
    console.log(`\n========================================`);
    console.log(`🏁 TESTS FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
