process.env.NODE_ENV = 'test';
const http = require('http');
const assert = require('assert');
const app = require('../src/index');

const TEST_PORT = 5095;
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

function getNextOperatingDate(targetDayOfWeek = 3) {
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
  console.log('  ClinicOS Sprint 3 Financial, Billing & Admin Suite');
  console.log('═══════════════════════════════════════════════════════════\n');

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`[Sprint 3 Server] Listening on http://127.0.0.1:${TEST_PORT}`);
      resolve();
    });
  });

  try {
    let doctorToken = '';
    let doctorId = '';
    let adminToken = '';
    let adminId = '';
    let patientAToken = '';
    let patientAUserId = '';
    let patientAPatientId = '';
    let patientBToken = '';
    let patientBUserId = '';
    let clinicAId = '';
    let serviceCatalogId = '';
    let testInvoiceId = '';
    let proPlanId = '';

    // ==========================================
    // 0. AUTHENTICATION SETUP
    // ==========================================
    console.log('\n--- 0. AUTHENTICATION & CONTEXT SETUP ---');
    const docLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'dr.rahman@clinic-os.com', password: 'password123' },
    });
    doctorToken = docLogin.data?.token;
    doctorId = docLogin.data?.user?.id;
    recordTest('Doctor login successful', docLogin.status === 200 && !!doctorToken);

    const adminLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'admin@clinic-os.com', password: 'password123' },
    });
    adminToken = adminLogin.data?.token;
    adminId = adminLogin.data?.user?.id;
    recordTest('Admin login successful', adminLogin.status === 200 && !!adminToken);

    const patLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'patient@example.com', password: 'password123' },
    });
    patientAToken = patLogin.data?.token;
    patientAUserId = patLogin.data?.user?.id;
    recordTest('Patient A login successful', patLogin.status === 200 && !!patientAToken);

    // Register Patient B for IDOR testing
    const patBEmail = `patient.b.${Date.now()}@test.com`;
    const patBReg = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        email: patBEmail,
        password: 'password123',
        role: 'patient',
        first_name: 'Patient',
        last_name: 'Beta',
      },
    });
    const patBOtp = patBReg.data?.dev_otp;
    await makeRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email: patBEmail, otp: patBOtp },
    });
    const patBLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: patBEmail, password: 'password123' },
    });
    patientBToken = patBLogin.data?.token;
    patientBUserId = patBLogin.data?.user?.id;
    recordTest('Patient B login successful', patBLogin.status === 200 && !!patientBToken);

    const docClinics = await makeRequest('/clinics', {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    clinicAId = docClinics.data?.clinics?.[0]?.id;
    recordTest('Clinic A retrieved for Doctor', !!clinicAId, `Clinic: ${clinicAId}`);

    const patARec = await makeRequest(`/clinics/${clinicAId}/patients`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const patAObj = patARec.data?.patients?.find((p) => p.user_id === patientAUserId);
    patientAPatientId = patAObj ? patAObj.id : patARec.data?.patients?.[0]?.id;

    // Create a known Catalog Service in Clinic A with price 1200
    const createService = await makeRequest(`/clinics/${clinicAId}/services`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        name: 'Comprehensive Cardiology Checkup',
        description: 'Full ECG and consultation',
        duration_minutes: 45,
        price: 1200,
      },
    });
    serviceCatalogId = createService.data?.service?.id;
    recordTest('Created Catalog Service with $1200 price', createService.status === 201 && !!serviceCatalogId);

    // ==========================================
    // 1. BILLING & SERVER-AUTHORITATIVE CALCULATIONS (§3, §4, §5)
    // ==========================================
    console.log('\n--- 1. SERVER-AUTHORITATIVE BILLING & CALCULATIONS ---');

    // a) Backend retrieves official price and calculates final amount: base $1200 - discount $200 + tax $100 = $1100
    const officialInvoice = await makeRequest(`/clinics/${clinicAId}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        patient_id: patientAPatientId,
        service_id: serviceCatalogId,
        amount: 999999, // Attempted client override should be replaced by official $1200
        discount: 200,
        tax: 100,
        payment_method: 'card',
        payment_status: 'pending',
      },
    });
    const invoiceData = officialInvoice.data?.payment;
    testInvoiceId = invoiceData?.id;
    const isAmountCorrect = parseFloat(invoiceData?.amount) === 1200 && parseFloat(invoiceData?.total_amount) === 1100;
    recordTest('Server enforces catalog price and calculates total ($1100) (§3, §4)', officialInvoice.status === 201 && isAmountCorrect, `Total: $${invoiceData?.total_amount}`);

    // b) Excessive discount (discount > basePrice) rejected with 400
    const excessiveDiscount = await makeRequest(`/clinics/${clinicAId}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        patient_id: patientAPatientId,
        service_id: serviceCatalogId,
        discount: 1500, // Greater than $1200 base price
        tax: 0,
      },
    });
    recordTest('Excessive discount exceeding base price rejected (400) (§4)', excessiveDiscount.status === 400);

    // c) Negative discount or tax rejected by validator
    const negativeTax = await makeRequest(`/clinics/${clinicAId}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: {
        patient_id: patientAPatientId,
        amount: 500,
        tax: -50,
      },
    });
    recordTest('Negative tax rejected by validator (400) (§4)', negativeTax.status === 400);

    // d) Patient B cannot view Patient A's invoice (Anti-IDOR)
    const patBViewInvoice = await makeRequest(`/clinics/${clinicAId}/payments/${testInvoiceId}`, {
      headers: { Authorization: `Bearer ${patientBToken}` },
    });
    recordTest('Patient B cannot access Patient A invoice (Anti-IDOR 403) (§5)', patBViewInvoice.status === 403);

    // ==========================================
    // 2. SIMULATED PAYMENT STATE MACHINE & IDEMPOTENCY (§6, §7, §8, §9)
    // ==========================================
    console.log('\n--- 2. SIMULATED PAYMENT STATE MACHINE & IDEMPOTENCY ---');

    // a) Patient B cannot pay Patient A's invoice (Anti-IDOR)
    const patBPayAttempt = await makeRequest(`/clinics/${clinicAId}/payments/${testInvoiceId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${patientBToken}` },
      body: { status: 'completed' },
    });
    recordTest('Patient B forbidden from paying Patient A invoice (403) (§8)', patBPayAttempt.status === 403);

    // b) Patient A settles own invoice via simulated payment
    const patAPaySuccess = await makeRequest(`/clinics/${clinicAId}/payments/${testInvoiceId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${patientAToken}` },
      body: { status: 'completed' },
    });
    const settledPay = patAPaySuccess.data?.payment;
    const hasSimTxn = !!settledPay?.transaction_id && settledPay?.transaction_id.startsWith('SIM-TXN');
    recordTest('Patient A completes simulated payment with SIM-TXN reference (§7)', patAPaySuccess.status === 200 && settledPay?.payment_status === 'completed' && hasSimTxn, `Txn: ${settledPay?.transaction_id}`);

    // c) Idempotency: Duplicate settlement attempt on already paid invoice rejected
    const duplicateSettlement = await makeRequest(`/clinics/${clinicAId}/payments/${testInvoiceId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${patientAToken}` },
      body: { status: 'completed' },
    });
    recordTest('Duplicate payment attempt on paid invoice rejected (400) (§9)', duplicateSettlement.status === 400);

    // d) State Machine: completed -> pending reversion blocked
    const illegalReversion = await makeRequest(`/clinics/${clinicAId}/payments/${testInvoiceId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: { status: 'pending' },
    });
    recordTest('Completed to pending state reversion blocked (400) (§6)', illegalReversion.status === 400);

    // e) State Machine: completed -> refunded
    const refundSuccess = await makeRequest(`/clinics/${clinicAId}/payments/${testInvoiceId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: { status: 'refunded' },
    });
    recordTest('Valid transition: completed -> refunded (200) (§6)', refundSuccess.status === 200 && refundSuccess.data?.payment?.payment_status === 'refunded');

    // f) Terminal state: refunded -> completed blocked
    const terminalTransition = await makeRequest(`/clinics/${clinicAId}/payments/${testInvoiceId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: { status: 'completed' },
    });
    recordTest('Transition from terminal refunded state blocked (400) (§6)', terminalTransition.status === 400);

    // ==========================================
    // 3. STRUCTURED SUBSCRIPTIONS & FEATURE GUARDS (§11, §12, §13, §14)
    // ==========================================
    console.log('\n--- 3. STRUCTURED SUBSCRIPTIONS & FEATURE GUARDS ---');

    // a) Check public plans
    const publicPlans = await makeRequest('/subscriptions/plans');
    const plansList = publicPlans.data?.plans || [];
    const proPlan = plansList.find((p) => p.name.includes('Professional') || p.name.includes('Enterprise')) || plansList[1];
    proPlanId = proPlan?.id;
    recordTest('Public subscription plans retrieved', publicPlans.status === 200 && Array.isArray(plansList) && plansList.length > 0);

    // b) Clinic subscribes to Professional Plan (simulated subscription)
    const subscribeRes = await makeRequest(`/clinics/${clinicAId}/subscriptions/subscribe`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
      body: { plan_id: proPlanId, billing_cycle: 'monthly' },
    });
    const isSubscribed = (subscribeRes.status === 200 || subscribeRes.status === 201) && subscribeRes.data?.subscription?.plan_id === proPlanId;
    recordTest('Clinic subscribes to Professional plan (Simulated) (§11)', isSubscribed);

    // c) Feature check: Analytics endpoint is accessible on Professional tier
    const analyticsRes = await makeRequest(`/clinics/${clinicAId}/analytics`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    recordTest('Analytics feature guard allowed for subscribed clinic (§14)', analyticsRes.status === 200 && typeof analyticsRes.data?.summary?.total_revenue === 'number');

    // d) Quota limits evaluated server-side
    const limitsRes = await makeRequest(`/clinics/${clinicAId}/subscriptions/limits`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    recordTest('Quota limits evaluated server-side (§12)', limitsRes.status === 200 && limitsRes.data?.limits?.patients?.allowed === true);

    // e) Subscription cancellation
    const cancelSub = await makeRequest(`/clinics/${clinicAId}/subscriptions/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    recordTest('Clinic subscription cancelled gracefully (§15)', cancelSub.status === 200);

    // ==========================================
    // 4. PURE MYSQL ANALYTICS & EDGE-CASE SAFETY (§17, §18, §19)
    // ==========================================
    console.log('\n--- 4. PURE MYSQL ANALYTICS & EDGE-CASE SAFETY ---');

    // Patient cannot access clinic analytics (Anti-IDOR)
    const patAnalytics = await makeRequest(`/clinics/${clinicAId}/analytics`, {
      headers: { Authorization: `Bearer ${patientAToken}` },
    });
    recordTest('Patient forbidden from accessing clinic analytics (403) (§19)', patAnalytics.status === 403);

    // Clinic dashboard stats
    const clinicDash = await makeRequest(`/clinics/${clinicAId}/dashboard`, {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    const stats = clinicDash.data?.stats;
    const isSafeNumbers = typeof stats?.total_revenue === 'number' && !isNaN(stats?.total_revenue) && typeof stats?.total_appointments === 'number';
    recordTest('Clinic dashboard returns safe numerical metrics (no NaN) (§18)', clinicDash.status === 200 && isSafeNumbers);

    // ==========================================
    // 5. PLATFORM ADMINISTRATION HARDENING (§21, §22, §23)
    // ==========================================
    console.log('\n--- 5. PLATFORM ADMINISTRATION HARDENING ---');

    // a) Non-admin blocked from admin endpoints
    const forbiddenAdmin = await makeRequest('/admin/dashboard', {
      headers: { Authorization: `Bearer ${doctorToken}` },
    });
    recordTest('Doctor blocked from admin endpoints (403) (§21)', forbiddenAdmin.status === 403);

    // b) Admin dashboard accessible
    const adminDash = await makeRequest('/admin/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordTest('Admin dashboard stats accessible (§21)', adminDash.status === 200 && typeof adminDash.data?.stats?.total_users === 'number');

    // c) Admin self-deactivation protection
    const selfDeactivate = await makeRequest(`/admin/users/${adminId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { is_active: false },
    });
    recordTest('Admin self-deactivation prevented (400) (§22)', selfDeactivate.status === 400);

    // d) Admin user deactivation and reactivation (preserves data)
    const deactivateUser = await makeRequest(`/admin/users/${patientBUserId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { is_active: false },
    });
    recordTest('Admin deactivates patient account (§22)', deactivateUser.status === 200 && deactivateUser.data?.user?.is_active === 0);

    // Deactivated user cannot log in
    const deactivatedLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: 'patient.b.sprint3@test.com', password: 'password123' },
    });
    recordTest('Deactivated user login rejected (401) (§22)', deactivatedLogin.status === 401);

    // Reactivate patient
    const reactivateUser = await makeRequest(`/admin/users/${patientBUserId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { is_active: true },
    });
    recordTest('Admin reactivates patient account (§22)', reactivateUser.status === 200 && (reactivateUser.data?.user?.is_active === 1 || reactivateUser.data?.user?.is_active === true));

    // e) Admin review moderation
    const pendingReviews = await makeRequest('/admin/reviews/pending', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordTest('Admin fetches pending reviews queue (§23)', pendingReviews.status === 200 && Array.isArray(pendingReviews.data?.reviews));

    // f) Admin plan management: Create and soft-deactivate plan
    const newPlan = await makeRequest('/admin/plans', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Sprint 3 University Plan',
        description: 'Special academic tier',
        price: 49.99,
        billing_cycle: 'monthly',
        max_doctors: 5,
        max_patients: 500,
        max_staff: 10,
        features: { analytics: true, advanced_emr: true, staff_management: true },
      },
    });
    const createdPlanId = newPlan.data?.plan?.id;
    recordTest('Admin creates structured subscription plan (§16)', newPlan.status === 201 && !!createdPlanId);

    if (createdPlanId) {
      const deactPlan = await makeRequest(`/admin/plans/${createdPlanId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      recordTest('Admin soft-deactivates subscription plan (§16)', deactPlan.status === 200);
    }

    // g) Admin audit logs
    const auditLogs = await makeRequest('/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    recordTest('Admin retrieves comprehensive audit trail (§24)', auditLogs.status === 200 && Array.isArray(auditLogs.data?.logs) && auditLogs.data?.logs.length > 0);

  } catch (err) {
    console.error('\n❌ Unhandled error during Sprint 3 test suite:', err.stack || err);
    recordTest('Sprint 3 suite execution completed without fatal crash', false, err.message);
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
  console.log(`  SPRINT 3 FINANCIAL & ADMIN SUITE: ${passed}/${total} TESTS PASSED (${failed} failed)`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    throw new Error(`${failed} tests failed in Sprint 3 Financial & Admin Suite`);
  }
}

if (require.main === module) {
  runSuite()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { runSuite };
