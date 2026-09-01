process.env.NODE_ENV = 'test';
const http = require('http');
const assert = require('assert');
const app = require('../src/index');

const TEST_PORT = 5096;
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
  console.log('  ClinicOS Sprint 2 Healthcare Workflow & Hardening Suite');
  console.log('═══════════════════════════════════════════════════════════\n');

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`[Sprint 2 Server] Listening on http://127.0.0.1:${TEST_PORT}`);
      resolve();
    });
  });

  try {
    let doctorToken = '';
    let doctorId = '';
    let clinicAId = '';
    let patientAToken = '';
    let patientAUserId = '';
    let patientAPatientId = '';
    let patientBToken = '';
    let patientBUserId = '';
    let assistantToken = '';
    let assistantUserId = '';
    let serviceAId = '';

    // ==========================================
    // 1. USER & PROFILE MANAGEMENT HARDENING
    // ==========================================
    console.log('\n--- 1. USER & PROFILE MANAGEMENT HARDENING ---');

    // Public registration should reject arbitrary 'assistant' self-declaration
    const publicAssistantReg = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        email: 'public.assistant@test.com',
        password: 'password123',
        role: 'assistant',
        first_name: 'Self',
        last_name: 'Assistant',
      },
    });
    recordTest('Public self-registration of assistant role blocked (§3, §16)', publicAssistantReg.status === 400);

    // Login default Doctor
    const docLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'dr.rahman@clinic-os.com', password: 'password123' },
    });
    doctorToken = docLogin.data?.token;
    doctorId = docLogin.data?.user?.id;
    recordTest('Doctor login successful', docLogin.status === 200 && !!doctorToken);

    // Login default Patient
    const patLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'patient@example.com', password: 'password123' },
    });
    patientAToken = patLogin.data?.token;
    patientAUserId = patLogin.data?.user?.id;
    recordTest('Patient A login successful', patLogin.status === 200 && !!patientAToken);

    // Register Patient B
    const patBReg = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        email: 'patient.b.sprint2@test.com',
        password: 'password123',
        role: 'patient',
        first_name: 'Karim',
        last_name: 'Uddin',
      },
    });
    const patBOtp = patBReg.data?.dev_otp;
    await makeRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email: 'patient.b.sprint2@test.com', otp: patBOtp },
    });
    const patBLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'patient.b.sprint2@test.com', password: 'password123' },
    });
    patientBToken = patBLogin.data?.token;
    patientBUserId = patBLogin.data?.user?.id;
    recordTest('Patient B registered and logged in', patBLogin.status === 200 && !!patientBToken);

    // Profile update privilege escalation prevention
    const roleEscalate = await makeRequest('/auth/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${patientAToken}` },
      body: { role: 'doctor', is_verified: true, first_name: 'Hacked' },
    });
    recordTest('Patient profile update cannot escalate role (400)', roleEscalate.status === 400);

    // Valid Doctor Profile update
    const docProfileUpdate = await makeRequest('/doctors/me/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        qualifications: 'MBBS, FCPS (Internal Medicine)',
        specialization: 'Internal Medicine',
        experience_years: 12,
        consultation_fee: 1000,
        bio: 'Experienced internist consultant.',
      },
    });
    recordTest('Doctor profile updated successfully', docProfileUpdate.status === 200 && docProfileUpdate.data.profile?.experience_years === 12);

    // ==========================================
    // 2. CLINIC & STAFF MANAGEMENT & PERMISSION MATRIX
    // ==========================================
    console.log('\n--- 2. CLINIC & STAFF MANAGEMENT & PERMISSIONS ---');

    // Fetch Doctor's clinic
    const docClinics = await makeRequest('/clinics', {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    clinicAId = docClinics.data?.clinics?.[0]?.id;
    recordTest('Clinic A retrieved for Doctor', !!clinicAId, `Clinic A: ${clinicAId}`);

    // Create a Service in Clinic A
    const srvA = await makeRequest(`/clinics/${clinicAId}/services`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        name: 'Sprint 2 General Consultation',
        description: '30 minute standard consultation',
        duration_minutes: 30,
        price: 1000,
      },
    });
    serviceAId = srvA.data?.service?.id;
    recordTest('Doctor creates Service in Clinic A', srvA.status === 201 && !!serviceAId);

    // Clinic Owner adds/onboards Assistant directly
    const addAssist = await makeRequest(`/clinics/${clinicAId}/staff`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        email: 'clinic.assistant.sprint2@test.com',
        role: 'assistant',
        first_name: 'Anika',
        last_name: 'Tabassum',
        password: 'password123',
      },
    });
    recordTest('Clinic owner provisions new Assistant account (§16)', addAssist.status === 201);

    // Assistant logs in
    const assistLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'clinic.assistant.sprint2@test.com', password: 'password123' },
    });
    assistantToken = assistLogin.data?.token;
    assistantUserId = assistLogin.data?.user?.id;
    recordTest('Newly provisioned Assistant login successful', assistLogin.status === 200 && !!assistantToken);

    // Assistant Permissions:
    // a) Assistant CAN register a patient in Clinic A
    const assistRegPat = await makeRequest(`/clinics/${clinicAId}/patients`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${assistantToken}` },
      body: {
        first_name: 'WalkIn',
        last_name: 'Patient',
        phone: '01700000001',
        email: 'walkin@test.com',
        gender: 'female',
      },
    });
    recordTest('Assistant CAN register clinic patient (§17)', assistRegPat.status === 201);

    // b) Assistant CANNOT create EMR medical record (403 Forbidden)
    const assistCreateEMR = await makeRequest(`/clinics/${clinicAId}/medical-records`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${assistantToken}` },
      body: {
        patient_id: assistRegPat.data?.patient?.id,
        diagnosis: 'Unauthorized Assistant EMR',
      },
    });
    recordTest('Assistant CANNOT create EMR record (RBAC 403) (§17)', assistCreateEMR.status === 403);

    // c) Assistant CANNOT create Prescription (403 Forbidden)
    const assistCreateRx = await makeRequest(`/clinics/${clinicAId}/prescriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${assistantToken}` },
      body: {
        patient_id: assistRegPat.data?.patient?.id,
        diagnosis: 'Unauthorized Assistant Rx',
      },
    });
    recordTest('Assistant CANNOT create Prescription (RBAC 403) (§17)', assistCreateRx.status === 403);

    // d) Assistant CANNOT manage clinic staff (403 Forbidden)
    const assistAddStaff = await makeRequest(`/clinics/${clinicAId}/staff`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${assistantToken}` },
      body: { email: 'fake@test.com', role: 'assistant' },
    });
    recordTest('Assistant CANNOT manage clinic staff (RBAC 403) (§17)', assistAddStaff.status === 403);

    // ==========================================
    // 3. PATIENT ISOLATION & ANTI-IDOR TESTING (§23)
    // ==========================================
    console.log('\n--- 3. PATIENT ISOLATION & ANTI-IDOR DEFENSE ---');

    // Get Patient A's record in Clinic A
    const patARec = await makeRequest(`/clinics/${clinicAId}/patients`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const patAObj = patARec.data?.patients?.find(p => p.user_id === patientAUserId);
    patientAPatientId = patAObj ? patAObj.id : patARec.data?.patients?.[0]?.id;

    // Doctor creates EMR for Patient A
    const createEMR = await makeRequest(`/clinics/${clinicAId}/medical-records`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        patient_id: patientAPatientId,
        diagnosis: 'Seasonal Rhinitis',
        symptoms: 'Sneezing, nasal congestion',
        treatment: 'Antihistamine daily',
        is_confidential: false,
      },
    });
    const emrId = createEMR.data?.record?.id;
    recordTest('Doctor creates EMR for Patient A', createEMR.status === 201 && !!emrId);

    // Doctor updates EMR and preserves audit snapshot (§12)
    const updateEMR = await makeRequest(`/clinics/${clinicAId}/medical-records/${emrId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        diagnosis: 'Seasonal Allergic Rhinitis (Updated)',
        treatment: 'Antihistamine + Saline nasal spray',
      },
    });
    recordTest('Doctor updates EMR with audit snapshot (§12)', updateEMR.status === 200);

    // Patient A CAN view their own EMR
    const patAViewEMR = await makeRequest(`/clinics/${clinicAId}/medical-records/${emrId}`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    recordTest('Patient A can view own non-confidential EMR', patAViewEMR.status === 200);

    // Patient B CANNOT view Patient A's EMR (Anti-IDOR 403)
    const patBViewEMR = await makeRequest(`/clinics/${clinicAId}/medical-records/${emrId}`, {
      headers: { Authorization: `Bearer ${patientBToken}` },
    });
    recordTest('Patient B CANNOT view Patient A EMR (Anti-IDOR 403) (§23)', patBViewEMR.status === 403);

    // Patient B CANNOT view Patient A's medical history (Anti-IDOR 403)
    const patBViewHistory = await makeRequest(`/clinics/${clinicAId}/patients/${patientAPatientId}/history`, {
      headers: { Authorization: `Bearer ${patientBToken}` },
    });
    recordTest('Patient B CANNOT view Patient A history (Anti-IDOR 403) (§23)', patBViewHistory.status === 403);

    // ==========================================
    // 4. APPOINTMENT STATE MACHINE & REVIEWS
    // ==========================================
    console.log('\n--- 4. APPOINTMENT STATE MACHINE & REVIEWS ---');

    const apptDate = getNextOperatingDate(2); // Next Tuesday (Open)

    // Patient A books an appointment at 14:00
    const bookAppt = await makeRequest(`/clinics/${clinicAId}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientAToken}` },
      body: {
        appointment_date: apptDate,
        start_time: '14:00',
        service_id: serviceAId,
        type: 'in-person',
      },
    });
    const apptId = bookAppt.data?.appointment?.id;
    recordTest('Patient A books appointment with service', bookAppt.status === 201 && !!apptId, `Appt ID: ${apptId}`);

    // Patient B attempts to book conflicting slot for same doctor & time -> CONFLICT 409
    const conflictBook = await makeRequest(`/clinics/${clinicAId}/appointments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${patientBToken}` },
      body: {
        appointment_date: apptDate,
        start_time: '14:00',
        doctor_id: doctorId,
        type: 'in-person',
      },
    });
    recordTest('Conflicting slot booking rejected (409 Conflict) (§8)', conflictBook.status === 409);

    if (apptId) {
      // Patient B CANNOT reschedule Patient A's appointment (Anti-IDOR 403)
      const patBReschedule = await makeRequest(`/clinics/${clinicAId}/appointments/${apptId}/reschedule`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${patientBToken}` },
        body: {
          appointment_date: apptDate,
          start_time: '15:00',
        },
      });
      recordTest('Patient B CANNOT reschedule Patient A appointment (Anti-IDOR 403) (§10)', patBReschedule.status === 403);

      // Patient A attempts review on uncompleted appointment -> REJECTED (400)
      const prematureReview = await makeRequest(`/clinics/${clinicAId}/reviews`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patientAToken}` },
        body: {
          appointment_id: apptId,
          rating: 5,
          comment: 'Premature review before consultation',
        },
      });
      recordTest('Review on uncompleted appointment rejected (400) (§18, §23)', prematureReview.status === 400);

      // Progress appointment: scheduled -> confirmed -> in_progress -> completed
      const confirmAppt = await makeRequest(`/clinics/${clinicAId}/appointments/${apptId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${doctorToken}` },
        body: { status: 'confirmed' },
      });
      recordTest('Transition: scheduled -> confirmed', confirmAppt.status === 200);

      const inProgressAppt = await makeRequest(`/clinics/${clinicAId}/appointments/${apptId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${doctorToken}` },
        body: { status: 'in_progress' },
      });
      recordTest('Transition: confirmed -> in_progress', inProgressAppt.status === 200);

      const completeAppt = await makeRequest(`/clinics/${clinicAId}/appointments/${apptId}/status`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${doctorToken}` },
        body: { status: 'completed' },
      });
      recordTest('Transition: in_progress -> completed', completeAppt.status === 200);

      // Review on completed appointment -> SUCCEEDS (201)
      const validReview = await makeRequest(`/clinics/${clinicAId}/reviews`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patientAToken}` },
        body: {
          appointment_id: apptId,
          rating: 5,
          comment: 'Outstanding consultation and care from Dr. Rahman.',
        },
      });
      recordTest('Review on completed appointment succeeds (§18)', validReview.status === 201);

      // Duplicate review for same appointment -> REJECTED (400)
      const duplicateReview = await makeRequest(`/clinics/${clinicAId}/reviews`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${patientAToken}` },
        body: {
          appointment_id: apptId,
          rating: 4,
          comment: 'Attempted duplicate review',
        },
      });
      recordTest('Duplicate review for same appointment rejected (400) (§18)', duplicateReview.status === 400);
    }

    // ==========================================
    // 5. PATIENT SAFE SEARCH & PAGINATION (§5)
    // ==========================================
    console.log('\n--- 5. PATIENT SAFE SEARCH & DISCOVERY ---');

    const searchPatients = await makeRequest(`/clinics/${clinicAId}/patients?search=WalkIn&limit=10`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    recordTest('Doctor searches patients by name with bounds (§5)', searchPatients.status === 200 && searchPatients.data?.patients?.length > 0);

    const searchDoctors = await makeRequest('/doctors/search?specialty=Internal');
    recordTest('Public doctor discovery filters active doctors (§6)', searchDoctors.status === 200 && searchDoctors.data?.doctors?.length > 0);

  } catch (err) {
    console.error('\n❌ Unhandled error during Sprint 2 test suite:', err);
    recordTest('Sprint 2 suite execution completed without fatal crash', false, err.message);
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
  console.log(`  SPRINT 2 WORKFLOW SUITE: ${passed}/${total} TESTS PASSED (${failed} failed)`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    throw new Error(`${failed} tests failed in Sprint 2 Workflow Suite`);
  }
}

if (require.main === module) {
  runSuite()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runSuite };
