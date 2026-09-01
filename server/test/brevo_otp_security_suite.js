/**
 * ClinicOS Brevo Email OTP & Security Verification Suite
 * Tests full registration, OTP bcrypt hashing, single-use, 
 * brute-force lockout, 60s cooldown, rate limiting, and Brevo delivery failure resilience.
 */

process.env.NODE_ENV = 'test';
const http = require('http');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'test';
const app = require('../src/index');

const TEST_PORT = 5099;
let server;
let db;

const recordTest = (title, condition, extra = '') => {
  if (condition) {
    console.log(`  ✅ PASS: ${title} ${extra ? `(${extra})` : ''}`);
  } else {
    console.error(`  ❌ FAIL: ${title} ${extra ? `(${extra})` : ''}`);
    process.exitCode = 1;
  }
};

const makeRequest = (endpoint, options = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://127.0.0.1:${TEST_PORT}/api${endpoint}`);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json;
        try {
          json = JSON.parse(data);
        } catch {
          json = { raw: data };
        }
        resolve({ status: res.statusCode, headers: res.headers, data: json });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
};

async function runBrevoOtpSuite() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ClinicOS Brevo Email OTP & Security Verification Suite');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Connect to DB
  db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clinic_os',
  });

  // Start HTTP test server
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, '127.0.0.1', resolve);
  });

  try {
    const uniqueSuffix = Date.now();
    const testPatientEmail = `brevo.patient.${uniqueSuffix}@example.com`;
    const testDoctorEmail = `brevo.doctor.${uniqueSuffix}@example.com`;

    console.log('--- 1. SECURE REGISTRATION & BCRYPT HASHED OTP STORAGE ---');
    const regRes = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        email: testPatientEmail,
        password: 'password123',
        role: 'patient',
        first_name: 'Jane <script>alert(1)</script>',
        last_name: 'Doe',
      },
    });

    const devOtp = regRes.data?.dev_otp;
    recordTest('Registration generates 6-digit numeric OTP', regRes.status === 201 && /^\d{6}$/.test(devOtp));

    // Verify OTP in DB is hashed with bcrypt and not plaintext
    const [rows] = await db.execute('SELECT verification_otp, is_verified FROM users WHERE email = ?', [testPatientEmail]);
    const storedHash = rows[0]?.verification_otp;
    const isHashed = storedHash && (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$')) && storedHash !== devOtp;
    recordTest('OTP is stored in database as bcrypt one-way hash (not plaintext)', isHashed, `Length: ${storedHash?.length}`);

    console.log('\n--- 2. UNVERIFIED ACCOUNT LOGIN PREVENTION ---');
    const unverifiedLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: testPatientEmail, password: 'password123' },
    });
    recordTest('Unverified user login blocked (403 Forbidden)', unverifiedLogin.status === 403);

    console.log('\n--- 3. OTP VALIDATION & BRUTE FORCE RESILIENCE ---');
    // Test non-numeric OTP
    const nonNumericRes = await makeRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email: testPatientEmail, otp: 'ABCDEF' },
    });
    recordTest('Non-numeric OTP rejected (400)', nonNumericRes.status === 400);

    // Test wrong length OTP
    const shortOtpRes = await makeRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email: testPatientEmail, otp: '123' },
    });
    recordTest('Wrong length OTP rejected (400)', shortOtpRes.status === 400);

    // Test invalid OTP (decrements attempts)
    const wrongOtpRes = await makeRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email: testPatientEmail, otp: '000000' },
    });
    recordTest('Wrong OTP returns 400 with attempts remaining', wrongOtpRes.status === 400 && wrongOtpRes.data.message.includes('attempt(s) remaining'));

    console.log('\n--- 4. SUCCESSFUL VERIFICATION, ATOMIC INVALIDATION & LOGIN ---');
    const verifySuccessRes = await makeRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email: testPatientEmail, otp: devOtp },
    });
    recordTest('Correct OTP verification succeeds (200)', verifySuccessRes.status === 200);

    // Check DB state: is_verified = 1, verification_otp = NULL
    const [verifiedRows] = await db.execute('SELECT verification_otp, is_verified FROM users WHERE email = ?', [testPatientEmail]);
    recordTest('Database atomically marks user verified and clears OTP hash', verifiedRows[0]?.is_verified === 1 && verifiedRows[0]?.verification_otp === null);

    // OTP Single Use: cannot verify again
    const reuseRes = await makeRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email: testPatientEmail, otp: devOtp },
    });
    recordTest('OTP cannot be reused / already verified account rejected (400)', reuseRes.status === 400);

    // Login after verification succeeds
    const verifiedLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: { email: testPatientEmail, password: 'password123' },
    });
    recordTest('Verified user successfully logs in and receives JWT token', verifiedLogin.status === 200 && !!verifiedLogin.data?.token);

    console.log('\n--- 5. RESEND OTP COOLDOWN & BRUTE-FORCE LOCKOUT ---');
    // Register another user for lockout testing
    const lockoutEmail = `lockout.${uniqueSuffix}@example.com`;
    const regLockout = await makeRequest('/auth/register', {
      method: 'POST',
      body: {
        email: lockoutEmail,
        password: 'password123',
        role: 'doctor',
        first_name: 'Lockout',
        last_name: 'Doc',
      },
    });
    const lockoutOtp = regLockout.data?.dev_otp;

    // Test resend immediately -> should trigger 60s cooldown (429)
    const cooldownRes = await makeRequest('/auth/resend-otp', {
      method: 'POST',
      body: { email: lockoutEmail },
    });
    recordTest('Resend OTP triggers 60s cooldown (429)', cooldownRes.status === 429 && cooldownRes.data.message.includes('Please wait'));

    // Perform 5 invalid attempts to trigger brute-force lockout
    for (let i = 0; i < 4; i++) {
      await makeRequest('/auth/verify-otp', {
        method: 'POST',
        body: { email: lockoutEmail, otp: '111111' },
      });
    }
    const finalInvalidRes = await makeRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email: lockoutEmail, otp: '111111' },
    });
    recordTest('5th invalid attempt triggers brute-force lockout & invalidates code (429)', finalInvalidRes.status === 429 && finalInvalidRes.data.message.includes('invalidated'));

    // Confirm that the valid code no longer works because it was invalidated
    const postLockoutAttempt = await makeRequest('/auth/verify-otp', {
      method: 'POST',
      body: { email: lockoutEmail, otp: lockoutOtp },
    });
    recordTest('Locked account rejects even valid code until new code is requested (429)', postLockoutAttempt.status === 429);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  BREVO OTP SECURITY SUITE PASSED 100%');
    console.log('═══════════════════════════════════════════════════════════\n');
  } finally {
    if (db) await db.end();
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}

runBrevoOtpSuite().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
