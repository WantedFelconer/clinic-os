const { execSync } = require('child_process');
const path = require('path');

const suites = [
  { name: 'Sprint 1 Security Hardening Suite', file: 'test/sprint1_security_suite.js' },
  { name: 'Forensic End-to-End Suite', file: 'test/final_forensic_suite.js' },
  { name: 'Sprint 2 Healthcare Workflow Suite', file: 'test/sprint2_workflow_suite.js' },
  { name: 'Sprint 3 Financial, Billing & Admin Suite', file: 'test/sprint3_financial_admin_suite.js' },
  { name: 'Sprint 4 End-to-End QA & Anti-IDOR Suite', file: 'test/sprint4_e2e_regression_suite.js' },
  { name: 'Brevo Email OTP & Security Verification Suite', file: 'test/brevo_otp_security_suite.js' },
];

async function main() {
  console.log('\n🏥 ═══════════════════════════════════════════════════════');
  console.log('   ClinicOS Automated Verification Test Runner');
  console.log('═══════════════════════════════════════════════════════════');

  execSync('node --test test/security_remediation.test.js', { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });

  if (process.env.RUN_INTEGRATION_TESTS === 'true') {
    const testDbName = process.env.TEST_DB_NAME || '';
    if (!/(test|ci)/i.test(testDbName)) throw new Error('TEST_DB_NAME must clearly identify a dedicated test/CI database.');
    const childEnv = { ...process.env, NODE_ENV: 'test', DB_NAME: testDbName };
    for (const suite of suites) {
      console.log(`\n>>> Executing ${suite.name}...`);
      execSync(`node ${suite.file}`, { cwd: path.resolve(__dirname, '..'), stdio: 'inherit', env: childEnv });
    }
  } else {
    console.log('\nDatabase integration suites skipped safely. Set RUN_INTEGRATION_TESTS=true and TEST_DB_NAME to a dedicated test database to enable them.');
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Automated test command completed successfully.');
  console.log('═══════════════════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('\n❌ Test execution failed with exit code 1:', err.message);
  process.exit(1);
});
