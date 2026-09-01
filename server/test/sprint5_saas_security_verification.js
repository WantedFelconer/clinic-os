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

async function runTests() {
  console.log('\n===============================================================');
  console.log(' ClinicOS — Sprint 5 SaaS Administration & Security Test Runner ');
  console.log('===============================================================\n');

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

    // 1. SETUP TEST USERS
    console.log('--- 1. Setting Up Test Accounts (Admin, Doctors, Patient) ---');
    const doc1Email = `doc1_s5_${ts}@test.com`;
    const doc2Email = `doc2_s5_${ts}@test.com`;
    const patEmail = `pat_s5_${ts}@test.com`;
    const password = 'password123';

    // Register Doctor 1
    const regDoc1 = await request('/auth/register', {
      method: 'POST',
      body: { email: doc1Email, password, role: 'doctor', first_name: 'DrAlpha', last_name: 'Sprint5' },
    });
    const doc1Otp = regDoc1.data?.dev_otp || '123456';
    await request('/auth/verify-otp', { method: 'POST', body: { email: doc1Email, otp: doc1Otp } });
    const loginDoc1 = await request('/auth/login', { method: 'POST', body: { email: doc1Email, password } });
    const doc1Token = loginDoc1.data?.token;
    const doc1Id = loginDoc1.data?.user?.id;
    const doc1Headers = { Authorization: `Bearer ${doc1Token}` };
    assert(doc1Token, 'Doctor 1 registered, verified, and authenticated');

    // Register Doctor 2
    const regDoc2 = await request('/auth/register', {
      method: 'POST',
      body: { email: doc2Email, password, role: 'doctor', first_name: 'DrBeta', last_name: 'Sprint5' },
    });
    const doc2Otp = regDoc2.data?.dev_otp || '123456';
    await request('/auth/verify-otp', { method: 'POST', body: { email: doc2Email, otp: doc2Otp } });
    const loginDoc2 = await request('/auth/login', { method: 'POST', body: { email: doc2Email, password } });
    const doc2Token = loginDoc2.data?.token;
    const doc2Id = loginDoc2.data?.user?.id;
    const doc2Headers = { Authorization: `Bearer ${doc2Token}` };
    assert(doc2Token, 'Doctor 2 registered, verified, and authenticated');

    // Register Patient
    const regPat = await request('/auth/register', {
      method: 'POST',
      body: { email: patEmail, password, role: 'patient', first_name: 'PatAlpha', last_name: 'Sprint5' },
    });
    const patOtp = regPat.data?.dev_otp || '123456';
    await request('/auth/verify-otp', { method: 'POST', body: { email: patEmail, otp: patOtp } });
    const loginPat = await request('/auth/login', { method: 'POST', body: { email: patEmail, password } });
    const patToken = loginPat.data?.token;
    const patId = loginPat.data?.user?.id;
    const patHeaders = { Authorization: `Bearer ${patToken}` };
    assert(patToken, 'Patient registered, verified, and authenticated');

    // Login as Admin
    const loginAdmin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@clinic-os.com', password: 'password123' },
    });
    const adminToken = loginAdmin.data?.token;
    const adminId = loginAdmin.data?.user?.id;
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    assert(adminToken && adminId, 'Administrator authenticated successfully');

    // Create Clinic for Doctor 1
    const clinicRes1 = await request('/clinics', {
      method: 'POST',
      headers: doc1Headers,
      body: {
        name: `Alpha Care Clinic ${ts}`,
        specialization: 'Family Medicine',
        address: '100 Medical Blvd',
        city: 'Metropolis',
        consultation_fee: 75,
      },
    });
    const clinicId1 = clinicRes1.data?.clinic?.id || clinicRes1.data?.id;
    assert(clinicId1, 'Doctor 1 clinic created successfully');

    // Create Clinic for Doctor 2
    const clinicRes2 = await request('/clinics', {
      method: 'POST',
      headers: doc2Headers,
      body: {
        name: `Beta Specialty Clinic ${ts}`,
        specialization: 'Cardiology',
        address: '200 Heart Way',
        city: 'Gotham',
        consultation_fee: 150,
      },
    });
    const clinicId2 = clinicRes2.data?.clinic?.id || clinicRes2.data?.id;
    assert(clinicId2, 'Doctor 2 clinic created successfully');

    // 2. ADMIN DASHBOARD & REAL DATA METRICS
    console.log('\n--- 2. SaaS Admin Dashboard & Real Metrics Verification ---');
    const dashRes = await request('/admin/dashboard', { headers: adminHeaders });
    assert(dashRes.status === 200, 'Admin dashboard returns HTTP 200');
    assert(dashRes.data?.stats?.total_users >= 3, 'Stats accurately count registered users');
    assert(dashRes.data?.stats?.total_clinics >= 2, 'Stats accurately count registered clinics');
    assert(Array.isArray(dashRes.data?.recent_signups), 'Dashboard returns recent signups');
    assert(typeof dashRes.data?.stats?.mrr === 'number', 'Real subscription MRR is computed numerically');

    // 3. USER MANAGEMENT & SELF-DEACTIVATION PROTECTION
    console.log('\n--- 3. User Management & Admin Self-Deactivation Protection ---');
    // Admin attempts to deactivate own account
    const selfDeact = await request(`/admin/users/${adminId}/status`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { is_active: false },
    });
    assert(selfDeact.status === 400, 'Security: Admin cannot deactivate own account (HTTP 400 rejected)');

    // Admin deactivates regular patient
    const deactPat = await request(`/admin/users/${patId}/status`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { is_active: false },
    });
    assert(deactPat.status === 200, 'Admin successfully deactivates patient account');

    // Deactivated patient tries to login
    const deactLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: patEmail, password },
    });
    assert(deactLogin.status === 401, 'Deactivated patient account rejected from login (HTTP 401)');

    // Admin reactivates patient
    const reactPat = await request(`/admin/users/${patId}/status`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { is_active: true },
    });
    assert(reactPat.status === 200, 'Admin reactivates patient account');

    const reactLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: patEmail, password },
    });
    assert(reactLogin.status === 200, 'Reactivated patient account logs in successfully');

    // 4. SUBSCRIPTION PLANS CRUD & LIMIT ENFORCEMENT
    console.log('\n--- 4. Subscription Plans Management & Resource Limits Enforcement ---');
    // Admin creates custom plan with strict limit (max_patients = 2)
    const newPlanRes = await request('/admin/plans', {
      method: 'POST',
      headers: adminHeaders,
      body: {
        name: `Micro Clinic Plan ${ts}`,
        description: 'Starter clinic tier with max 2 patients',
        price: 29.0,
        billing_cycle: 'monthly',
        max_doctors: 1,
        max_patients: 2,
        max_staff: 1,
        features: ['Basic EMR', 'Digital Rx'],
      },
    });
    assert(newPlanRes.status === 201, 'Admin creates new subscription plan with max_patients = 2');
    const microPlanId = newPlanRes.data?.plan?.id;

    // Doctor 1 subscribes Clinic 1 to Micro Clinic Plan
    const subRes1 = await request(`/clinics/${clinicId1}/subscriptions/subscribe`, {
      method: 'POST',
      headers: doc1Headers,
      body: { plan_id: microPlanId, billing_cycle: 'monthly' },
    });
    assert(subRes1.status === 201, 'Doctor subscribes Clinic 1 to Micro Clinic Plan');

    // Check limits endpoint
    const limRes1 = await request(`/clinics/${clinicId1}/subscriptions/limits`, {
      headers: doc1Headers,
    });
    assert(limRes1.status === 200, 'Doctor retrieves real-time plan limits');
    assert(limRes1.data?.limits?.patients?.max === 2, 'Plan limits accurately report max 2 patients');

    // Create Patient 1 in Clinic 1
    const p1 = await request(`/clinics/${clinicId1}/patients`, {
      method: 'POST',
      headers: doc1Headers,
      body: { first_name: 'PatientOne', last_name: 'Test', phone: '5550001', email: `p1_${ts}@test.com` },
    });
    assert(p1.status === 201, 'Patient 1 created successfully (1 / 2 limit)');

    // Create Patient 2 in Clinic 1
    const p2 = await request(`/clinics/${clinicId1}/patients`, {
      method: 'POST',
      headers: doc1Headers,
      body: { first_name: 'PatientTwo', last_name: 'Test', phone: '5550002', email: `p2_${ts}@test.com` },
    });
    assert(p2.status === 201, 'Patient 2 created successfully (2 / 2 limit)');

    // Attempt to create Patient 3 (Limit exceeded!)
    const p3 = await request(`/clinics/${clinicId1}/patients`, {
      method: 'POST',
      headers: doc1Headers,
      body: { first_name: 'PatientThree', last_name: 'Test', phone: '5550003', email: `p3_${ts}@test.com` },
    });
    assert(
      p3.status === 403,
      'Backend blocks Patient 3 creation with HTTP 403 Forbidden due to plan limits'
    );

    // Doctor 1 upgrades to Pro plan
    const allPlansRes = await request('/subscriptions/plans', { headers: doc1Headers });
    const proPlan = allPlansRes.data?.plans?.find((p) => p.name === 'Pro' || p.name === 'Professional' || p.price > 50) || allPlansRes.data?.plans?.[0];
    if (proPlan) {
      const upg = await request(`/clinics/${clinicId1}/subscriptions/subscribe`, {
        method: 'POST',
        headers: doc1Headers,
        body: { plan_id: proPlan.id, billing_cycle: 'monthly' },
      });
      // Now creating Patient 3 should succeed
      const p3Retry = await request(`/clinics/${clinicId1}/patients`, {
        method: 'POST',
        headers: doc1Headers,
        body: { first_name: 'PatientThree', last_name: 'Test', phone: '5550003', email: `p3_${ts}@test.com` },
      });
      assert(p3Retry.status === 201, 'After plan upgrade, Patient 3 created successfully', `status=${p3Retry.status}, body=${JSON.stringify(p3Retry.data)}, upgStatus=${upg.status}, upgBody=${JSON.stringify(upg.data)}`);
    }

    // 5. RBAC & IDOR SECURITY TESTS
    console.log('\n--- 5. RBAC Enforcement & IDOR Attack Resistance ---');
    // Patient attempts admin endpoint
    const patAdminAttack = await request('/admin/dashboard', { headers: patHeaders });
    assert(patAdminAttack.status === 403, 'RBAC: Patient cannot access /api/admin/dashboard (HTTP 403)');

    // Doctor attempts admin user modification
    const docAdminAttack = await request(`/admin/users/${patId}/status`, {
      method: 'PUT',
      headers: doc1Headers,
      body: { is_active: false },
    });
    assert(docAdminAttack.status === 403, 'RBAC: Doctor cannot access admin user status endpoint (HTTP 403)');

    // Doctor 2 attempts to subscribe/cancel Doctor 1's clinic
    const crossDoctorCancel = await request(`/clinics/${clinicId1}/subscriptions/cancel`, {
      method: 'POST',
      headers: doc2Headers,
      body: {},
    });
    assert(
      crossDoctorCancel.status === 403,
      'Multi-tenant IDOR: Doctor 2 cannot cancel Doctor 1 clinic subscription (HTTP 403)'
    );

    // 6. REVIEW MODERATION WORKFLOW
    console.log('\n--- 6. Review Moderation Queue & Public Approval Filtering ---');
    // Patient submits review for Clinic 1
    const subRevRes = await request(`/clinics/${clinicId1}/reviews`, {
      method: 'POST',
      headers: patHeaders,
      body: {
        rating: 5,
        comment: 'Outstanding healthcare provider with excellent bedside manner!',
      },
    });
    assert(subRevRes.status === 201, 'Patient submits review for moderation');
    const reviewId = subRevRes.data?.review?.id;

    // Public reviews for Clinic 1 should NOT include the unapproved review
    const publicReviewsBefore = await request(`/clinics/${clinicId1}/reviews`);
    const isPublicBefore = (publicReviewsBefore.data?.reviews || []).some((r) => r.id === reviewId);
    assert(!isPublicBefore, 'Unapproved review is hidden from public clinic profile');

    // Admin checks pending reviews
    const pendingRevRes = await request('/admin/reviews/pending', { headers: adminHeaders });
    const inQueue = (pendingRevRes.data?.reviews || []).some((r) => r.id === reviewId);
    assert(inQueue, 'Admin moderation queue contains pending review');

    // Admin approves review
    const approveRes = await request(`/admin/reviews/${reviewId}/approve`, {
      method: 'PUT',
      headers: adminHeaders,
    });
    assert(approveRes.status === 200, 'Admin approves review successfully');

    // Public reviews now displays approved review
    const publicReviewsAfter = await request(`/clinics/${clinicId1}/reviews`);
    const isPublicAfter = (publicReviewsAfter.data?.reviews || []).some((r) => r.id === reviewId);
    assert(isPublicAfter, 'Approved review is now visible on public clinic profile');

    // 7. CLINIC SUSPENSION & STATUS CONTROL
    console.log('\n--- 7. Clinic Suspension & Status Management ---');
    const suspClinicRes = await request(`/admin/clinics/${clinicId2}/status`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { is_active: false },
    });
    assert(suspClinicRes.status === 200, 'Admin suspends Clinic 2');

    const checkSuspended = await request('/admin/clinics?status=suspended', {
      headers: adminHeaders,
    });
    const foundSuspended = (checkSuspended.data?.clinics || []).some((c) => c.id === clinicId2);
    assert(foundSuspended, 'Suspended clinic filter lists Clinic 2');

    // Reactivate Clinic 2
    const reactClinicRes = await request(`/admin/clinics/${clinicId2}/status`, {
      method: 'PUT',
      headers: adminHeaders,
      body: { is_active: true },
    });
    assert(reactClinicRes.status === 200, 'Admin reactivates Clinic 2');

    // 8. AUDIT LOGGING INSPECTION
    console.log('\n--- 8. Security & Administration Audit Logs Inspection ---');
    const logsRes = await request('/admin/audit-logs', { headers: adminHeaders });
    assert(logsRes.status === 200, 'Admin retrieves platform audit logs (HTTP 200)');
    assert(Array.isArray(logsRes.data?.logs) && logsRes.data?.logs.length > 0, 'Audit logs contain recorded events');
    const actions = (logsRes.data?.logs || []).map((l) => l.action);
    assert(
      actions.includes('ACTIVATE_USER') || actions.includes('DEACTIVATE_USER'),
      'Audit log recorded user activation/deactivation events'
    );
    assert(
      actions.includes('APPROVE_REVIEW') || actions.includes('CREATE_SUBSCRIPTION_PLAN'),
      'Audit log recorded review moderation & plan management events'
    );

    // Summary
    console.log('\n===============================================================');
    console.log(` SPRINT 5 SAAS & SECURITY VERIFICATION SUMMARY:`);
    console.log(` Passed: ${passed}`);
    console.log(` Failed: ${failed}`);
    console.log('===============================================================\n');

    if (failed > 0) process.exit(1);
    else process.exit(0);
  } catch (err) {
    console.error('Fatal Test Error:', err);
    process.exit(1);
  } finally {
    if (serverProcess) {
      serverProcess.kill();
    }
  }
}

runTests();
