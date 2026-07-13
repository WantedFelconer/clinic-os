const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    const hashedPassword = await bcrypt.hash('password123', 10);

    const adminId = uuidv4();
    const doctorId = uuidv4();
    const patientUserId = uuidv4();
    const assistantId = uuidv4();
    const clinicId = uuidv4();
    const patientId = uuidv4();

    // Admin user
    await connection.execute(
      `INSERT IGNORE INTO users (id, email, password, role, first_name, last_name, is_verified)
       VALUES (?, ?, ?, 'admin', 'Platform', 'Admin', true)`,
      [adminId, 'admin@clinic-os.com', hashedPassword]
    );

    // Doctor user
    await connection.execute(
      `INSERT IGNORE INTO users (id, email, password, role, first_name, last_name, phone, is_verified)
       VALUES (?, ?, ?, 'doctor', 'Dr. Abdul', 'Rahman', '+8801712345678', true)`,
      [doctorId, 'dr.rahman@clinic-os.com', hashedPassword]
    );

    // Patient user
    await connection.execute(
      `INSERT IGNORE INTO users (id, email, password, role, first_name, last_name, phone, is_verified)
       VALUES (?, ?, ?, 'patient', 'Fatima', 'Begum', '+8801712345679', true)`,
      [patientUserId, 'patient@example.com', hashedPassword]
    );

    // Assistant user
    await connection.execute(
      `INSERT IGNORE INTO users (id, email, password, role, first_name, last_name, phone, is_verified)
       VALUES (?, ?, ?, 'assistant', 'Kamal', 'Hossain', '+8801712345680', true)`,
      [assistantId, 'assistant@clinic-os.com', hashedPassword]
    );

    // Create clinic
    await connection.execute(
      `INSERT IGNORE INTO clinics (id, owner_id, name, slug, description, phone, email, city, state, country)
       VALUES (?, ?, 'Rahman Medical Center', 'rahman-medical-center', 'A modern multi-specialty clinic in Dhaka',
               '+8801712345678', 'info@rahmanmedical.com', 'Dhaka', 'Dhaka', 'Bangladesh')`,
      [clinicId, doctorId]
    );

    // Add staff
    await connection.execute(
      `INSERT IGNORE INTO clinic_staff (id, clinic_id, user_id, role) VALUES (?, ?, ?, 'doctor')`,
      [uuidv4(), clinicId, doctorId]
    );
    await connection.execute(
      `INSERT IGNORE INTO clinic_staff (id, clinic_id, user_id, role) VALUES (?, ?, ?, 'assistant')`,
      [uuidv4(), clinicId, assistantId]
    );

    // Clinic schedules
    const days = [
      { day: 0, start: '09:00', end: '14:00', avail: false },
      { day: 1, start: '09:00', end: '17:00', avail: true },
      { day: 2, start: '09:00', end: '17:00', avail: true },
      { day: 3, start: '09:00', end: '17:00', avail: true },
      { day: 4, start: '09:00', end: '17:00', avail: true },
      { day: 5, start: '09:00', end: '14:00', avail: true },
      { day: 6, start: '09:00', end: '14:00', avail: false },
    ];
    for (const d of days) {
      await connection.execute(
        `INSERT IGNORE INTO clinic_schedules (id, clinic_id, day_of_week, start_time, end_time, is_available)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), clinicId, d.day, d.start, d.end, d.avail]
      );
    }

    // Services
    const services = [
      { name: 'General Checkup', desc: 'Comprehensive health checkup', dur: 30, price: 500 },
      { name: 'Cardiology Consultation', desc: 'Heart and cardiovascular consultation', dur: 45, price: 1000 },
      { name: 'Pediatric Consultation', desc: 'Child health consultation', dur: 30, price: 600 },
    ];
    for (const s of services) {
      await connection.execute(
        `INSERT INTO clinic_services (id, clinic_id, name, description, duration_minutes, price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuidv4(), clinicId, s.name, s.desc, s.dur, s.price]
      );
    }

    // Consultation packages
    await connection.execute(
      `INSERT INTO consultation_packages (id, clinic_id, name, description, sessions_count, price)
       VALUES (?, ?, 'Basic Care', '3 general checkup sessions', 3, 1200)`,
      [uuidv4(), clinicId]
    );
    await connection.execute(
      `INSERT INTO consultation_packages (id, clinic_id, name, description, sessions_count, price)
       VALUES (?, ?, 'Premium Care', '5 sessions including specialist consultation', 5, 4000)`,
      [uuidv4(), clinicId]
    );

    // Create patient record
    await connection.execute(
      `INSERT INTO patients (id, user_id, clinic_id, first_name, last_name, phone, email, gender)
       VALUES (?, ?, ?, 'Fatima', 'Begum', '+8801712345679', 'patient@example.com', 'female')`,
      [patientId, patientUserId, clinicId]
    );

    // Past appointment
    const pastApptId = uuidv4();
    await connection.execute(
      `INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, appointment_date, start_time, end_time, status)
       VALUES (?, ?, ?, ?, DATE_SUB(CURDATE(), INTERVAL 7 DAY), '10:00', '10:30', 'completed')`,
      [pastApptId, clinicId, patientId, doctorId]
    );

    // Upcoming appointment
    const upcomingApptId = uuidv4();
    await connection.execute(
      `INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, appointment_date, start_time, end_time, status)
       VALUES (?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '11:00', '11:30', 'scheduled')`,
      [upcomingApptId, clinicId, patientId, doctorId]
    );

    // Medical record
    const emrId = uuidv4();
    await connection.execute(
      `INSERT INTO medical_records (id, patient_id, clinic_id, doctor_id, diagnosis, symptoms, treatment_plan, notes)
       VALUES (?, ?, ?, ?, 'Seasonal allergies', 'Sneezing, runny nose, itchy eyes',
               'Antihistamine course for 2 weeks, avoid allergens', 'Patient responded well to initial treatment')`,
      [emrId, patientId, clinicId, doctorId]
    );

    // Prescription
    const rxId = uuidv4();
    await connection.execute(
      `INSERT INTO prescriptions (id, patient_id, clinic_id, doctor_id, diagnosis, notes)
       VALUES (?, ?, ?, ?, 'Seasonal allergic rhinitis', 'Take medications as prescribed. Follow up in 2 weeks.')`,
      [rxId, patientId, clinicId, doctorId]
    );

    await connection.execute(
      `INSERT INTO prescription_items (id, prescription_id, medication_name, dosage, frequency, duration, instructions)
       VALUES (?, ?, 'Cetirizine', '10mg', 'Once daily', '14 days', 'Take at bedtime')`,
      [uuidv4(), rxId]
    );
    await connection.execute(
      `INSERT INTO prescription_items (id, prescription_id, medication_name, dosage, frequency, duration, instructions)
       VALUES (?, ?, 'Saline Nasal Spray', '2 sprays each nostril', 'Twice daily', '14 days', 'Use before meals')`,
      [uuidv4(), rxId]
    );

    // Payment
    const paymentId = uuidv4();
    await connection.execute(
      `INSERT INTO payments (id, clinic_id, patient_id, appointment_id, invoice_number, amount, total_amount, payment_method, payment_status, payment_date)
       VALUES (?, ?, ?, ?, 'INV-2024-001', 500, 500, 'mobile_banking', 'completed', NOW())`,
      [paymentId, clinicId, patientId, upcomingApptId]
    );

    // Review
    const reviewId = uuidv4();
    await connection.execute(
      `INSERT INTO reviews (id, clinic_id, patient_id, doctor_id, rating, comment, is_approved)
       VALUES (?, ?, ?, ?, 5, 'Excellent clinic with very professional doctors. Highly recommended!', true)`,
      [reviewId, clinicId, patientId, doctorId]
    );

    // Subscription plans
    const freePlanId = uuidv4();
    const starterPlanId = uuidv4();
    const proPlanId = uuidv4();

    await connection.execute(
      `INSERT INTO subscription_plans (id, name, description, price, billing_cycle, max_doctors, max_staff, features)
       VALUES (?, 'Free', 'Basic plan for solo practitioners', 0, 'monthly', 1, 0, ?)`,
      [freePlanId, JSON.stringify(['Up to 50 patients', 'Basic appointments', 'Manual billing'])]
    );
    await connection.execute(
      `INSERT INTO subscription_plans (id, name, description, price, billing_cycle, max_doctors, max_staff, features)
       VALUES (?, 'Starter', 'For growing clinics', 29.99, 'monthly', 2, 2, ?)`,
      [starterPlanId, JSON.stringify(['Up to 200 patients', 'Appointment management', 'EMR system', 'Digital prescriptions', 'Email notifications'])]
    );
    await connection.execute(
      `INSERT INTO subscription_plans (id, name, description, price, billing_cycle, max_doctors, max_staff, features)
       VALUES (?, 'Professional', 'For established clinics', 79.99, 'monthly', 5, 10, ?)`,
      [proPlanId, JSON.stringify(['Unlimited patients', 'Advanced analytics', 'Priority support', 'All features included', 'Custom branding', 'API access'])]
    );

    // Subscribe clinic to Free plan
    await connection.execute(
      `INSERT INTO clinic_subscriptions (id, clinic_id, plan_id, status, start_date, end_date)
       VALUES (?, ?, ?, 'active', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 30 DAY))`,
      [uuidv4(), clinicId, freePlanId]
    );

    console.log('Seed data inserted successfully.');
    console.log('Login credentials (all use password: password123):');
    console.log('  Admin:      admin@clinic-os.com');
    console.log('  Doctor:     dr.rahman@clinic-os.com');
    console.log('  Patient:    patient@example.com');
    console.log('  Assistant:  assistant@clinic-os.com');
  } catch (error) {
    console.error('Seed failed:', error.message);
  } finally {
    await connection.end();
  }
}

seed();
