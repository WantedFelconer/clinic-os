const db = require('../src/config/database');
const Subscription = require('../src/models/Subscription');

async function testAnalytics() {
  const clinicId = 'c-clinic-001';
  
  const [revenueResult] = await db.execute(
    `SELECT IFNULL(SUM(total_amount), 0) as total_revenue,
            COUNT(*) as paid_invoices,
            IFNULL(AVG(total_amount), 0) as avg_revenue
     FROM payments WHERE clinic_id = ? AND payment_status = 'completed'`,
    [clinicId]
  );

  const [apptResult] = await db.execute(
    `SELECT COUNT(*) as total_appointments,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
     FROM appointments WHERE clinic_id = ?`,
    [clinicId]
  );

  const [patientResult] = await db.execute(
    'SELECT COUNT(*) as total_patients FROM patients WHERE clinic_id = ?',
    [clinicId]
  );

  const [monthlyApptRows] = await db.execute(
    `SELECT DATE_FORMAT(appointment_date, '%Y-%m') as month, COUNT(*) as count
     FROM appointments WHERE clinic_id = ?
     GROUP BY month ORDER BY month ASC LIMIT 12`,
    [clinicId]
  );

  const [monthlyPayRows] = await db.execute(
    `SELECT DATE_FORMAT(payment_date, '%Y-%m') as month, SUM(total_amount) as revenue
     FROM payments WHERE clinic_id = ? AND payment_status = 'completed' AND payment_date IS NOT NULL
     GROUP BY month ORDER BY month ASC LIMIT 12`,
    [clinicId]
  );

  console.log('====================================================');
  console.log('CLINIC c-clinic-001 (Rahman Medical Center) ANALYTICS:');
  console.log('====================================================');
  console.log('Total Revenue ($):          ', parseFloat(revenueResult[0].total_revenue).toFixed(2));
  console.log('Paid Invoices:              ', revenueResult[0].paid_invoices);
  console.log('Avg Revenue per Payment ($):', parseFloat(revenueResult[0].avg_revenue).toFixed(2));
  console.log('Total Appointments:         ', apptResult[0].total_appointments);
  console.log('Completed Appointments:     ', apptResult[0].completed);
  console.log('No-show Appointments:       ', apptResult[0].no_show);
  console.log('Cancelled Appointments:     ', apptResult[0].cancelled);
  console.log('Total Patients in Clinic:   ', patientResult[0].total_patients);
  console.log('\nMonthly Appointment Trend:');
  console.table(monthlyApptRows);
  console.log('\nMonthly Revenue Trend:');
  console.table(monthlyPayRows);

  console.log('\n====================================================');
  console.log('PLATFORM ADMIN ANALYTICS:');
  console.log('====================================================');
  const subAnalytics = await Subscription.getSubscriptionAnalytics();
  console.log('Monthly Recurring Revenue (MRR): $', subAnalytics.mrr);
  console.log('Active Clinic Subscriptions:      ', subAnalytics.active_subscriptions);
  console.log('Total Subscriptions:              ', subAnalytics.total_subscriptions);
  console.log('\nSubscription Plan Distribution:');
  console.table(subAnalytics.plan_distribution);

  process.exit(0);
}

testAnalytics().catch(err => {
  console.error(err);
  process.exit(1);
});
