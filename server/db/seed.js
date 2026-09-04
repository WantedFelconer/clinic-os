/**
 * ClinicOS Comprehensive Database Seeder
 * Populates realistic multi-role users, clinics, schedules, services, packages,
 * time-series appointments, financial transactions/invoices, EMR records,
 * digital prescriptions, lab reports, patient reviews, messages, notifications,
 * subscriptions, and audit logs.
 */

const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../src/config/database');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function formatDateTime(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function subMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

async function seed() {
  console.log('[ClinicOS Seeder] Starting database population...');
  const hashedPassword = await bcrypt.hash('password123', 10);
  const now = new Date();

  // Helper for batch or safe inserts
  const query = (sql, params) => db.execute(sql, params);

  try {
    // =========================================================================
    // 1. SUBSCRIPTION PLANS
    // =========================================================================
    console.log('-> Seeding Subscription Plans...');
    const plans = [
      {
        id: 'plan-starter',
        name: 'Starter',
        description: 'For solo doctors and boutique private practices starting digital transformation.',
        price: 29.00,
        billing_cycle: 'monthly',
        max_doctors: 1,
        max_patients: 150,
        max_staff: 2,
        features: JSON.stringify(['Basic Scheduling', 'EMR Notes', 'Digital Prescriptions', 'Patient Portal', 'Email Notifications']),
      },
      {
        id: 'plan-pro',
        name: 'Pro',
        description: 'For growing clinics with multi-disciplinary doctors, advanced billing, and analytics.',
        price: 79.00,
        billing_cycle: 'monthly',
        max_doctors: 5,
        max_patients: 1500,
        max_staff: 10,
        features: JSON.stringify(['Advanced EMR', 'Digital Prescriptions', 'Unlimited Consultations', 'Staff Management', 'Financial Analytics', 'Revenue Reports', 'Priority Support', 'SMS & Email Alerts', 'Patient Portal']),
      },
      {
        id: 'plan-enterprise',
        name: 'Enterprise',
        description: 'For large multi-specialty hospitals, healthcare networks, and diagnostics centers.',
        price: 199.00,
        billing_cycle: 'monthly',
        max_doctors: 25,
        max_patients: 10000,
        max_staff: 50,
        features: JSON.stringify(['Advanced EMR', 'Digital Prescriptions', 'Unlimited Consultations', 'Staff Management', 'Financial Analytics', 'Revenue Reports', 'Custom Domain & Branding', 'Dedicated Account Manager', 'HIPAA/GDPR Compliance Tools', 'API Access', '24/7 SLA Support']),
      },
    ];

    for (const p of plans) {
      await query(
        `INSERT INTO subscription_plans (id, name, description, price, billing_cycle, max_doctors, max_patients, max_staff, features, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), price = VALUES(price), features = VALUES(features), is_active = 1`,
        [p.id, p.name, p.description, p.price, p.billing_cycle, p.max_doctors, p.max_patients, p.max_staff, p.features]
      );
    }

    // =========================================================================
    // 2. USERS (Admins, Doctors, Assistants, Patients)
    // =========================================================================
    console.log('-> Seeding Multi-Role Users...');

    const users = [
      // Admins
      { id: 'u-admin-001', email: 'admin@clinic-os.com', role: 'admin', first_name: 'Platform', last_name: 'Admin', phone: '+8801700000001' },
      { id: 'u-admin-002', email: 'superadmin@clinic-os.com', role: 'admin', first_name: 'Sarah', last_name: 'Vance', phone: '+8801700000002' },

      // Doctors
      { id: 'u-doctor-001', email: 'dr.rahman@clinic-os.com', role: 'doctor', first_name: 'Dr. Abdul', last_name: 'Rahman', phone: '+8801712345678' },
      { id: 'u-doctor-002', email: 'dr.sarah@clinic-os.com', role: 'doctor', first_name: 'Dr. Sarah', last_name: 'Jenkins', phone: '+8801712345681' },
      { id: 'u-doctor-003', email: 'dr.chen@clinic-os.com', role: 'doctor', first_name: 'Dr. Michael', last_name: 'Chen', phone: '+8801712345682' },
      { id: 'u-doctor-004', email: 'dr.ayesha@clinic-os.com', role: 'doctor', first_name: 'Dr. Ayesha', last_name: 'Siddiqua', phone: '+8801712345683' },
      { id: 'u-doctor-005', email: 'dr.marcus@clinic-os.com', role: 'doctor', first_name: 'Dr. Marcus', last_name: 'Brody', phone: '+8801712345684' },
      { id: 'u-doctor-006', email: 'dr.elena@clinic-os.com', role: 'doctor', first_name: 'Dr. Elena', last_name: 'Rostova', phone: '+8801712345685' },
      { id: 'u-doctor-007', email: 'dr.tanvir@clinic-os.com', role: 'doctor', first_name: 'Dr. Tanvir', last_name: 'Ahmed', phone: '+8801712345686' },
      { id: 'u-doctor-008', email: 'dr.priya@clinic-os.com', role: 'doctor', first_name: 'Dr. Priya', last_name: 'Sharma', phone: '+8801712345687' },

      // Assistants
      { id: 'u-assistant-001', email: 'assistant@clinic-os.com', role: 'assistant', first_name: 'Kamal', last_name: 'Hossain', phone: '+8801712345680' },
      { id: 'u-assistant-002', email: 'nusrat.assistant@clinic-os.com', role: 'assistant', first_name: 'Nusrat', last_name: 'Jahan', phone: '+8801712345688' },
      { id: 'u-assistant-003', email: 'david.assistant@clinic-os.com', role: 'assistant', first_name: 'David', last_name: 'Miller', phone: '+8801712345689' },
      { id: 'u-assistant-004', email: 'maya.assistant@clinic-os.com', role: 'assistant', first_name: 'Maya', last_name: 'Lin', phone: '+8801712345690' },

      // Patients (with login accounts)
      { id: 'u-patient-001', email: 'patient@example.com', role: 'patient', first_name: 'Fatima', last_name: 'Begum', phone: '+8801712345679' },
      { id: 'u-patient-002', email: 'tariqul@example.com', role: 'patient', first_name: 'Tariqul', last_name: 'Islam', phone: '+8801711223344' },
      { id: 'u-patient-003', email: 'emily.watson@example.com', role: 'patient', first_name: 'Emily', last_name: 'Watson', phone: '+8801722334455' },
      { id: 'u-patient-004', email: 'rahim.chowdhury@example.com', role: 'patient', first_name: 'Rahim', last_name: 'Chowdhury', phone: '+8801733445566' },
      { id: 'u-patient-005', email: 'sophia.zhang@example.com', role: 'patient', first_name: 'Sophia', last_name: 'Zhang', phone: '+8801744556677' },
      { id: 'u-patient-006', email: 'james.wilson@example.com', role: 'patient', first_name: 'James', last_name: 'Wilson', phone: '+8801755667788' },
      { id: 'u-patient-007', email: 'nusrat.p@example.com', role: 'patient', first_name: 'Nusrat', last_name: 'Parveen', phone: '+8801766778899' },
      { id: 'u-patient-008', email: 'ahmed.m@example.com', role: 'patient', first_name: 'Ahmed', last_name: 'Al-Mansoor', phone: '+8801777889900' },
      { id: 'u-patient-009', email: 'olivia.t@example.com', role: 'patient', first_name: 'Olivia', last_name: 'Taylor', phone: '+8801788990011' },
      { id: 'u-patient-010', email: 'lucas.g@example.com', role: 'patient', first_name: 'Lucas', last_name: 'Garcia', phone: '+8801799001122' },
    ];

    for (const u of users) {
      await query(
        `INSERT INTO users (id, email, password, role, first_name, last_name, phone, is_verified, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
         ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), password = VALUES(password), is_active = 1, is_verified = 1`,
        [u.id, u.email, hashedPassword, u.role, u.first_name, u.last_name, u.phone]
      );
    }

    // =========================================================================
    // 3. DOCTOR PROFILES
    // =========================================================================
    console.log('-> Seeding Doctor Profiles...');
    const doctorProfiles = [
      {
        user_id: 'u-doctor-001',
        qualifications: 'MBBS, FCPS (Cardiology), MRCP (UK), FACC',
        specialization: 'Cardiologist',
        experience_years: 14,
        consultation_fee: 1000.00,
        bio: 'Senior Consultant Cardiologist specializing in preventive cardiac care, non-invasive diagnostics, hypertension, and coronary artery disease management.',
      },
      {
        user_id: 'u-doctor-002',
        qualifications: 'MBBS, MD (Pediatrics), DCH (London)',
        specialization: 'Pediatrician',
        experience_years: 9,
        consultation_fee: 700.00,
        bio: 'Dedicated child healthcare specialist focusing on neonatal care, childhood nutrition, developmental milestones, and pediatric respiratory health.',
      },
      {
        user_id: 'u-doctor-003',
        qualifications: 'MBBS, DDV, FCPS (Dermatology)',
        specialization: 'Dermatologist',
        experience_years: 11,
        consultation_fee: 900.00,
        bio: 'Expert dermatologist & laser specialist specializing in acne treatments, psoriasis, eczema, skin rejuvenation, and aesthetic dermatology.',
      },
      {
        user_id: 'u-doctor-004',
        qualifications: 'MBBS, MS (Obstetrics & Gynecology), FICOG',
        specialization: 'Gynecologist & Obstetrician',
        experience_years: 12,
        consultation_fee: 850.00,
        bio: 'Compassionate women healthcare consultant with deep expertise in antenatal care, high-risk pregnancy, PCOS, and reproductive wellness.',
      },
      {
        user_id: 'u-doctor-005',
        qualifications: 'MBBS, MS (Ortho), MCh Ortho (UK)',
        specialization: 'Orthopedic Surgeon',
        experience_years: 16,
        consultation_fee: 1200.00,
        bio: 'Specialist in sports injuries, arthroscopic surgery, joint replacement, spine disorders, and modern musculoskeletal rehabilitation.',
      },
      {
        user_id: 'u-doctor-006',
        qualifications: 'MBBS, MD (Neurology), PhD',
        specialization: 'Neurologist',
        experience_years: 10,
        consultation_fee: 1100.00,
        bio: 'Clinical neurologist specializing in migraines, epilepsy, neuropathy, stroke recovery, and neuro-cognitive assessments.',
      },
      {
        user_id: 'u-doctor-007',
        qualifications: 'MBBS, FCPS (Medicine), CCD (BIRDEM)',
        specialization: 'General Physician & Diabetologist',
        experience_years: 15,
        consultation_fee: 650.00,
        bio: 'Senior internal medicine physician focusing on diabetes reversal protocols, chronic lifestyle diseases, and preventive adult care.',
      },
      {
        user_id: 'u-doctor-008',
        qualifications: 'MBBS, MD (Cardiology), FESC',
        specialization: 'Preventive Cardiologist',
        experience_years: 8,
        consultation_fee: 950.00,
        bio: 'Preventive cardiology consultant dedicated to heart failure rehabilitation, lipidology, and cardiovascular risk reduction.',
      },
    ];

    for (const dp of doctorProfiles) {
      const [existing] = await query('SELECT id FROM doctor_profiles WHERE user_id = ?', [dp.user_id]);
      const profileId = existing[0]?.id || uuidv4();
      await query(
        `INSERT INTO doctor_profiles (id, user_id, qualifications, specialization, experience_years, consultation_fee, bio)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE qualifications = VALUES(qualifications), specialization = VALUES(specialization), experience_years = VALUES(experience_years), consultation_fee = VALUES(consultation_fee), bio = VALUES(bio)`,
        [profileId, dp.user_id, dp.qualifications, dp.specialization, dp.experience_years, dp.consultation_fee, dp.bio]
      );
    }

    // =========================================================================
    // 4. CLINICS & CLINIC SUBSCRIPTIONS
    // =========================================================================
    console.log('-> Seeding Clinics & Subscriptions...');
    const clinics = [
      {
        id: 'c-clinic-001',
        owner_id: 'u-doctor-001',
        name: 'Rahman Medical Center',
        slug: 'rahman-medical-center',
        description: 'A premier multi-specialty outpatient medical center equipped with state-of-the-art diagnostic and consultation suites.',
        address: 'House 42, Road 11, Block D, Banani',
        city: 'Dhaka',
        state: 'Dhaka',
        country: 'Bangladesh',
        postal_code: '1213',
        phone: '+8801712345678',
        email: 'info@rahmanmedical.com',
        website: 'https://rahmanmedical.com',
        plan_id: 'plan-pro',
        is_active: 1,
      },
      {
        id: 'c-clinic-002',
        owner_id: 'u-doctor-007',
        name: 'Metro Health & Diabetes Care',
        slug: 'metro-health-clinic',
        description: 'Comprehensive internal medicine, diabetes management, and preventive metabolic health clinic.',
        address: 'Level 4, Navana Tower, Gulshan-1',
        city: 'Dhaka',
        state: 'Dhaka',
        country: 'Bangladesh',
        postal_code: '1212',
        phone: '+8801712345686',
        email: 'care@metrohealth.com',
        website: 'https://metrohealth.com',
        plan_id: 'plan-enterprise',
        is_active: 1,
      },
      {
        id: 'c-clinic-003',
        owner_id: 'u-doctor-003',
        name: 'DermaCare Skin & Laser Studio',
        slug: 'dermacare-studio',
        description: 'Advanced clinical dermatology, acne clinic, laser aesthetics, and modern skincare.',
        address: 'Suite 3B, Concord Royal Court, Dhanmondi 27',
        city: 'Dhaka',
        state: 'Dhaka',
        country: 'Bangladesh',
        postal_code: '1209',
        phone: '+8801712345682',
        email: 'hello@dermacare.com',
        website: 'https://dermacare.com',
        plan_id: 'plan-pro',
        is_active: 1,
      },
      {
        id: 'c-clinic-004',
        owner_id: 'u-doctor-002',
        name: 'KidsFirst Pediatrics Center',
        slug: 'kidsfirst-pediatrics',
        description: 'Child-friendly pediatric clinic offering routine checkups, immunization, and developmental support.',
        address: 'Plot 18, Road 4, Sector 3, Uttara',
        city: 'Dhaka',
        state: 'Dhaka',
        country: 'Bangladesh',
        postal_code: '1230',
        phone: '+8801712345681',
        email: 'contact@kidsfirst.com',
        website: 'https://kidsfirst.com',
        plan_id: 'plan-starter',
        is_active: 1,
      },
      {
        id: 'c-clinic-005',
        owner_id: 'u-doctor-004',
        name: 'CarePoint Women Healthcare',
        slug: 'carepoint-clinic',
        description: 'Dedicated maternal and gynecological healthcare center empowering women across all life stages.',
        address: 'Green Road Medical Hub, Panthapath',
        city: 'Dhaka',
        state: 'Dhaka',
        country: 'Bangladesh',
        postal_code: '1205',
        phone: '+8801712345683',
        email: 'info@carepoint.com',
        website: 'https://carepoint.com',
        plan_id: 'plan-pro',
        is_active: 1,
      },
      {
        id: 'c-clinic-006',
        owner_id: 'u-doctor-005',
        name: 'OrthoPlus Sports Medicine',
        slug: 'orthoplus-sports',
        description: 'Musculoskeletal pain management, joint rehabilitation, and orthopedic sports recovery.',
        address: 'Mirpur DOHS Shopping Complex, Level 2',
        city: 'Dhaka',
        state: 'Dhaka',
        country: 'Bangladesh',
        postal_code: '1216',
        phone: '+8801712345684',
        email: 'appointments@orthoplus.com',
        website: 'https://orthoplus.com',
        plan_id: 'plan-enterprise',
        is_active: 0, // Inactive / pending verification for admin testing!
      },
    ];

    for (const c of clinics) {
      await query(
        `INSERT INTO clinics (id, owner_id, name, slug, description, address, city, state, country, postal_code, phone, email, website, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), phone = VALUES(phone), email = VALUES(email), is_active = VALUES(is_active)`,
        [c.id, c.owner_id, c.name, c.slug, c.description, c.address, c.city, c.state, c.country, c.postal_code, c.phone, c.email, c.website, c.is_active]
      );

      // Clinic Subscription
      const subId = `sub-${c.id}`;
      await query(
        `INSERT INTO clinic_subscriptions (id, clinic_id, plan_id, status, start_date, end_date, auto_renew)
         VALUES (?, ?, ?, 'active', DATE_SUB(CURRENT_DATE, INTERVAL 6 MONTH), DATE_ADD(CURRENT_DATE, INTERVAL 6 MONTH), 1)
         ON DUPLICATE KEY UPDATE plan_id = VALUES(plan_id), status = 'active'`,
        [subId, c.id, c.plan_id]
      );
    }

    // =========================================================================
    // 5. CLINIC STAFF
    // =========================================================================
    console.log('-> Seeding Clinic Staff Associations...');
    const staffAssignments = [
      // Rahman Medical Center (Multi-doctor clinic)
      { clinic_id: 'c-clinic-001', user_id: 'u-doctor-001', role: 'doctor' },
      { clinic_id: 'c-clinic-001', user_id: 'u-doctor-002', role: 'doctor' },
      { clinic_id: 'c-clinic-001', user_id: 'u-doctor-008', role: 'doctor' },
      { clinic_id: 'c-clinic-001', user_id: 'u-assistant-001', role: 'assistant' },
      { clinic_id: 'c-clinic-001', user_id: 'u-assistant-002', role: 'assistant' },

      // Metro Health
      { clinic_id: 'c-clinic-002', user_id: 'u-doctor-007', role: 'doctor' },
      { clinic_id: 'c-clinic-002', user_id: 'u-assistant-003', role: 'assistant' },

      // DermaCare Studio
      { clinic_id: 'c-clinic-003', user_id: 'u-doctor-003', role: 'doctor' },
      { clinic_id: 'c-clinic-003', user_id: 'u-assistant-004', role: 'assistant' },

      // KidsFirst
      { clinic_id: 'c-clinic-004', user_id: 'u-doctor-002', role: 'doctor' },
      { clinic_id: 'c-clinic-004', user_id: 'u-assistant-002', role: 'assistant' },

      // CarePoint
      { clinic_id: 'c-clinic-005', user_id: 'u-doctor-004', role: 'doctor' },
      { clinic_id: 'c-clinic-005', user_id: 'u-assistant-001', role: 'assistant' },
    ];

    for (const sa of staffAssignments) {
      const [existing] = await query('SELECT id FROM clinic_staff WHERE clinic_id = ? AND user_id = ?', [sa.clinic_id, sa.user_id]);
      const staffId = existing[0]?.id || uuidv4();
      await query(
        `INSERT INTO clinic_staff (id, clinic_id, user_id, role, is_active)
         VALUES (?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE role = VALUES(role), is_active = 1`,
        [staffId, sa.clinic_id, sa.user_id, sa.role]
      );
    }

    // =========================================================================
    // 6. CLINIC SCHEDULES
    // =========================================================================
    console.log('-> Seeding Clinic Schedules...');
    const scheduleDays = [
      { day: 0, start: '09:00:00', end: '17:00:00', avail: 1 }, // Sunday
      { day: 1, start: '09:00:00', end: '18:00:00', avail: 1 }, // Monday
      { day: 2, start: '09:00:00', end: '18:00:00', avail: 1 }, // Tuesday
      { day: 3, start: '09:00:00', end: '18:00:00', avail: 1 }, // Wednesday
      { day: 4, start: '09:00:00', end: '18:00:00', avail: 1 }, // Thursday
      { day: 5, start: '10:00:00', end: '15:00:00', avail: 1 }, // Friday
      { day: 6, start: '09:00:00', end: '14:00:00', avail: 1 }, // Saturday
    ];

    for (const c of clinics) {
      for (const sd of scheduleDays) {
        const [existing] = await query('SELECT id FROM clinic_schedules WHERE clinic_id = ? AND day_of_week = ?', [c.id, sd.day]);
        const schedId = existing[0]?.id || uuidv4();
        await query(
          `INSERT INTO clinic_schedules (id, clinic_id, day_of_week, start_time, end_time, is_available)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE start_time = VALUES(start_time), end_time = VALUES(end_time), is_available = VALUES(is_available)`,
          [schedId, c.id, sd.day, sd.start, sd.end, sd.avail]
        );
      }
    }

    // =========================================================================
    // 7. CLINIC SERVICES & PACKAGES
    // =========================================================================
    console.log('-> Seeding Clinic Services & Consultation Packages...');
    const clinicServicesData = [
      // Rahman Medical
      { clinic_id: 'c-clinic-001', name: 'General Health Checkup', desc: 'Comprehensive baseline physical exam and routine vitals screening.', dur: 30, price: 500 },
      { clinic_id: 'c-clinic-001', name: 'Cardiology Consultation', desc: 'Specialist cardiac evaluation, BP analysis, and preventative review.', dur: 45, price: 1000 },
      { clinic_id: 'c-clinic-001', name: '12-Lead ECG & Interpretation', desc: 'Standard diagnostic resting electrocardiogram with instant review.', dur: 20, price: 400 },
      { clinic_id: 'c-clinic-001', name: 'Echocardiography (Echo)', desc: '2D Doppler transthoracic echocardiogram to assess cardiac function.', dur: 45, price: 2500 },
      { clinic_id: 'c-clinic-001', name: 'Pediatric Consultation', desc: 'Child health evaluation, growth charting, and developmental screening.', dur: 30, price: 700 },

      // Metro Health
      { clinic_id: 'c-clinic-002', name: 'Diabetes Comprehensive Review', desc: 'Blood sugar assessment, HbA1c review, and personalized diet plan.', dur: 40, price: 800 },
      { clinic_id: 'c-clinic-002', name: 'Hypertension & Lipid Panel Review', desc: 'Cardio-metabolic risk assessment and therapy optimization.', dur: 30, price: 650 },
      { clinic_id: 'c-clinic-002', name: 'Metabolic Health Assessment', desc: 'Complete organ function and metabolic panel consultation.', dur: 45, price: 1200 },

      // DermaCare Studio
      { clinic_id: 'c-clinic-003', name: 'Dermatology Consultation', desc: 'Specialist assessment for acne, eczema, hair loss, and skin rashes.', dur: 30, price: 900 },
      { clinic_id: 'c-clinic-003', name: 'Acne Clarifying Treatment', desc: 'Medical extraction, salicylic peel, and topical therapy plan.', dur: 45, price: 1800 },
      { clinic_id: 'c-clinic-003', name: 'Medical Chemical Peel', desc: 'Dermatological peel for hyperpigmentation and skin rejuvenation.', dur: 40, price: 2200 },

      // KidsFirst
      { clinic_id: 'c-clinic-004', name: 'Well-Child Milestone Exam', desc: 'Growth monitoring, motor skills review, and vaccination advisory.', dur: 30, price: 600 },
      { clinic_id: 'c-clinic-004', name: 'Pediatric Allergy Assessment', desc: 'Assessment for childhood asthma, food allergies, and atopic eczema.', dur: 40, price: 750 },

      // CarePoint
      { clinic_id: 'c-clinic-005', name: 'Antenatal Prenatal Checkup', desc: 'First, second, or third trimester pregnancy health monitoring.', dur: 40, price: 850 },
      { clinic_id: 'c-clinic-005', name: 'Gynecological Ultrasound Review', desc: 'Pelvic health review, PCOS screening, and hormonal consult.', dur: 35, price: 1100 },
    ];

    const serviceIdMap = {};
    for (const s of clinicServicesData) {
      const [existing] = await query('SELECT id FROM clinic_services WHERE clinic_id = ? AND name = ?', [s.clinic_id, s.name]);
      let sid = existing[0]?.id;
      if (!sid) {
        sid = uuidv4();
        await query(
          `INSERT INTO clinic_services (id, clinic_id, name, description, duration_minutes, price, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [sid, s.clinic_id, s.name, s.desc, s.dur, s.price]
        );
      } else {
        await query(
          `UPDATE clinic_services SET description = ?, duration_minutes = ?, price = ?, is_active = 1 WHERE id = ?`,
          [s.desc, s.dur, s.price, sid]
        );
      }
      serviceIdMap[`${s.clinic_id}_${s.name}`] = sid;
    }

    const packagesData = [
      { clinic_id: 'c-clinic-001', name: 'Cardiac Wellness Plan', desc: 'Includes 4 specialist sessions + 2 ECG scans over 6 months.', count: 4, price: 3800 },
      { clinic_id: 'c-clinic-001', name: 'Family Health Bundle', desc: '6 general checkup sessions for any family member.', count: 6, price: 2500 },
      { clinic_id: 'c-clinic-002', name: 'Diabetes Control 360', desc: 'Monthly consultation + quarterly HbA1c review for 6 months.', count: 6, price: 4200 },
      { clinic_id: 'c-clinic-003', name: 'Clear Skin Acne Care', desc: '4 medical peel sessions + 3 dermatologist checkups.', count: 7, price: 8500 },
      { clinic_id: 'c-clinic-005', name: 'Maternity Care Journey', desc: '9 antenatal visits across all trimesters with round-the-clock advisory.', count: 9, price: 7000 },
    ];

    for (const pkg of packagesData) {
      const [existing] = await query('SELECT id FROM consultation_packages WHERE clinic_id = ? AND name = ?', [pkg.clinic_id, pkg.name]);
      if (existing.length === 0) {
        await query(
          `INSERT INTO consultation_packages (id, clinic_id, name, description, sessions_count, price, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [uuidv4(), pkg.clinic_id, pkg.name, pkg.desc, pkg.count, pkg.price]
        );
      }
    }

    // =========================================================================
    // 8. PATIENTS (Linked to user accounts + standalone clinic patients)
    // =========================================================================
    console.log('-> Seeding Patients...');

    const patientRecords = [
      { id: 'p-patient-001', user_id: 'u-patient-001', clinic_id: 'c-clinic-001', first_name: 'Fatima', last_name: 'Begum', dob: '1988-04-12', gender: 'female', phone: '+8801712345679', email: 'patient@example.com', blood_group: 'B+', allergies: 'Penicillin', chronic_conditions: 'Hypertension', address: 'House 14, Road 5, Dhanmondi, Dhaka', emergency_name: 'Tareq Begum', emergency_phone: '+8801712999888' },
      { id: 'p-patient-002', user_id: 'u-patient-002', clinic_id: 'c-clinic-001', first_name: 'Tariqul', last_name: 'Islam', dob: '1976-11-23', gender: 'male', phone: '+8801711223344', email: 'tariqul@example.com', blood_group: 'O+', allergies: 'None', chronic_conditions: 'Type 2 Diabetes, Mild Hyperlipidemia', address: 'Apartment 4A, Green Garden, Mirpur, Dhaka', emergency_name: 'Nasima Islam', emergency_phone: '+8801711223399' },
      { id: 'p-patient-003', user_id: 'u-patient-003', clinic_id: 'c-clinic-001', first_name: 'Emily', last_name: 'Watson', dob: '1995-08-19', gender: 'female', phone: '+8801722334455', email: 'emily.watson@example.com', blood_group: 'A+', allergies: 'Sulfa drugs, Dust mites', chronic_conditions: 'Allergic Rhinitis, Mild Asthma', address: 'Road 84, House 12, Gulshan-2, Dhaka', emergency_name: 'Mark Watson', emergency_phone: '+8801722334400' },
      { id: 'p-patient-004', user_id: 'u-patient-004', clinic_id: 'c-clinic-001', first_name: 'Rahim', last_name: 'Chowdhury', dob: '1965-02-14', gender: 'male', phone: '+8801733445566', email: 'rahim.chowdhury@example.com', blood_group: 'AB+', allergies: 'Aspirin', chronic_conditions: 'Coronary Artery Disease, Hypertension', address: 'Sector 7, Road 18, Uttara, Dhaka', emergency_name: 'Salma Chowdhury', emergency_phone: '+8801733445500' },
      { id: 'p-patient-005', user_id: 'u-patient-005', clinic_id: 'c-clinic-003', first_name: 'Sophia', last_name: 'Zhang', dob: '2001-06-30', gender: 'female', phone: '+8801744556677', email: 'sophia.zhang@example.com', blood_group: 'O-', allergies: 'None', chronic_conditions: 'Hormonal Acne Vulgaris', address: 'Banani DOHS, Road 4, Dhaka', emergency_name: 'Li Zhang', emergency_phone: '+8801744556600' },
      { id: 'p-patient-006', user_id: 'u-patient-006', clinic_id: 'c-clinic-002', first_name: 'James', last_name: 'Wilson', dob: '1982-09-05', gender: 'male', phone: '+8801755667788', email: 'james.wilson@example.com', blood_group: 'A-', allergies: 'Peanuts', chronic_conditions: 'Prediabetes, Elevated Triglycerides', address: 'Baridhara Diplomatic Zone, Road 2, Dhaka', emergency_name: 'Claire Wilson', emergency_phone: '+8801755667700' },
      { id: 'p-patient-007', user_id: 'u-patient-007', clinic_id: 'c-clinic-005', first_name: 'Nusrat', last_name: 'Parveen', dob: '1992-12-08', gender: 'female', phone: '+8801766778899', email: 'nusrat.p@example.com', blood_group: 'B+', allergies: 'Iodine', chronic_conditions: 'PCOS (Polycystic Ovary Syndrome)', address: 'Shantinagar Plaza, Dhaka', emergency_name: 'Kamrul Hassan', emergency_phone: '+8801766778800' },
      { id: 'p-patient-008', user_id: 'u-patient-008', clinic_id: 'c-clinic-001', first_name: 'Ahmed', last_name: 'Al-Mansoor', dob: '1970-03-25', gender: 'male', phone: '+8801777889900', email: 'ahmed.m@example.com', blood_group: 'O+', allergies: 'None', chronic_conditions: 'Essential Hypertension', address: 'Bashundhara R/A, Block C, Dhaka', emergency_name: 'Laila Mansoor', emergency_phone: '+8801777889911' },
      { id: 'p-patient-009', user_id: 'u-patient-009', clinic_id: 'c-clinic-004', first_name: 'Olivia', last_name: 'Taylor', dob: '2018-05-14', gender: 'female', phone: '+8801788990011', email: 'olivia.t@example.com', blood_group: 'A+', allergies: 'Dairy (Mild lactose sensitivity)', chronic_conditions: 'Recurrent Tonsillitis', address: 'Mohakhali DOHS, Dhaka', emergency_name: 'Sarah Taylor', emergency_phone: '+8801788990000' },
      { id: 'p-patient-010', user_id: 'u-patient-010', clinic_id: 'c-clinic-001', first_name: 'Lucas', last_name: 'Garcia', dob: '1990-07-22', gender: 'male', phone: '+8801799001122', email: 'lucas.g@example.com', blood_group: 'B-', allergies: 'None', chronic_conditions: 'Migraine with Aura', address: 'Lalmatia Block B, Dhaka', emergency_name: 'Maria Garcia', emergency_phone: '+8801799001100' },
    ];

    // Additional synthetic patients across clinics for rich data volume
    const additionalNames = [
      ['Tanveer', 'Hasan', 'male', '1984-03-15', 'A+'],
      ['Mehnaz', 'Kabir', 'female', '1993-07-28', 'B+'],
      ['Ashfaq', 'Uddin', 'male', '1968-10-12', 'O+'],
      ['Zubaida', 'Khanam', 'female', '1974-05-09', 'AB+'],
      ['Arif', 'Mahmud', 'male', '1989-12-01', 'O-'],
      ['Samira', 'Jahan', 'female', '1996-01-19', 'A-'],
      ['Rashedul', 'Hoque', 'male', '1981-06-25', 'B-'],
      ['Farhana', 'Sultana', 'female', '1991-09-14', 'O+'],
      ['Sikandar', 'Hayat', 'male', '1959-04-03', 'A+'],
      ['Nadia', 'Islam', 'female', '1987-11-20', 'B+'],
      ['Kazi', 'Anowar', 'male', '1978-08-16', 'AB-'],
      ['Tasnim', 'Ferdous', 'female', '1999-02-11', 'O+'],
      ['Mahbub', 'Alam', 'male', '1983-05-30', 'A+'],
      ['Rehana', 'Akhter', 'female', '1967-12-05', 'B+'],
      ['Mustafa', 'Kamal', 'male', '1994-10-08', 'O+'],
      ['Shahana', 'Nasrin', 'female', '1986-04-17', 'A-'],
      ['Zahid', 'Hussain', 'male', '1972-01-22', 'B+'],
      ['Roxana', 'Yasmin', 'female', '1998-08-04', 'AB+'],
      ['Imran', 'Nazir', 'male', '1980-07-13', 'O+'],
      ['Bilkis', 'Banu', 'female', '1963-09-29', 'A+'],
      ['Kabir', 'Chowdhury', 'male', '1975-02-18', 'B-'],
      ['Lamia', 'Sharmin', 'female', '1997-06-07', 'O+'],
      ['Saifullah', 'Miah', 'male', '1988-11-15', 'A+'],
      ['Dilruba', 'Shirin', 'female', '1982-03-27', 'B+'],
      ['Monirul', 'Haque', 'male', '1969-08-31', 'O-'],
    ];

    let pIdx = 11;
    for (const [fn, ln, g, dob, bg] of additionalNames) {
      const pid = `p-patient-${String(pIdx).padStart(3, '0')}`;
      const clinicId = pIdx % 3 === 0 ? 'c-clinic-002' : (pIdx % 3 === 1 ? 'c-clinic-001' : 'c-clinic-003');
      patientRecords.push({
        id: pid,
        user_id: null,
        clinic_id: clinicId,
        first_name: fn,
        last_name: ln,
        dob,
        gender: g,
        phone: `+880171000${String(pIdx).padStart(4, '0')}`,
        email: `${fn.toLowerCase()}.${ln.toLowerCase()}@samplemail.com`,
        blood_group: bg,
        allergies: pIdx % 4 === 0 ? 'Penicillin' : (pIdx % 5 === 0 ? 'Dust Allergy' : 'None'),
        chronic_conditions: pIdx % 3 === 0 ? 'Hypertension' : (pIdx % 4 === 0 ? 'Type 2 Diabetes' : 'None reported'),
        address: `House ${pIdx * 3}, Road ${pIdx % 10 + 1}, Dhaka`,
        emergency_name: `${ln} Family`,
        emergency_phone: `+880172000${String(pIdx).padStart(4, '0')}`,
      });
      pIdx++;
    }

    for (const pr of patientRecords) {
      await query(
        `INSERT INTO patients (id, user_id, clinic_id, first_name, last_name, date_of_birth, gender, phone, email, address, blood_group, allergies, chronic_conditions, emergency_contact_name, emergency_contact_phone, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE first_name = VALUES(first_name), last_name = VALUES(last_name), phone = VALUES(phone), email = VALUES(email), blood_group = VALUES(blood_group), allergies = VALUES(allergies), chronic_conditions = VALUES(chronic_conditions), is_active = 1`,
        [pr.id, pr.user_id, pr.clinic_id, pr.first_name, pr.last_name, pr.dob, pr.gender, pr.phone, pr.email, pr.address, pr.blood_group, pr.allergies, pr.chronic_conditions, pr.emergency_name, pr.emergency_phone]
      );
    }

    // =========================================================================
    // 9. TIME-SERIES APPOINTMENTS, EMR, PRESCRIPTIONS, INVOICES & PAYMENTS
    // =========================================================================
    console.log('-> Seeding 6-Month Time-Series Clinical & Financial Data...');

    // Generate rich dataset across past 6 months to create realistic trends
    const clinicalScenarios = [
      {
        serviceName: 'Cardiology Consultation',
        price: 1000,
        type: 'in-person',
        diagnosis: 'Stage 1 Essential Hypertension & Borderline Hyperlipidemia',
        symptoms: 'Mild bilateral temporal headaches, occasional palpitations after exertion, resting BP 142/92 mmHg.',
        treatment_plan: 'Initiate Telmisartan 40mg once daily in morning. Low sodium dietary DASH approach, 30 min daily brisk walk, repeat lipid panel in 8 weeks.',
        meds: [
          { name: 'Telmisartan', dosage: '40mg', freq: 'Once daily (Morning)', dur: '30 days', route: 'oral', instr: 'Take with or without food' },
          { name: 'Atorvastatin', dosage: '10mg', freq: 'Once daily at bedtime', dur: '30 days', route: 'oral', instr: 'Take at night' },
        ],
      },
      {
        serviceName: '12-Lead ECG & Interpretation',
        price: 400,
        type: 'in-person',
        diagnosis: 'Normal Sinus Rhythm with occasional benign premature ventricular complexes (PVCs)',
        symptoms: 'Reports feeling missed heartbeats during stressful working hours. No syncope, dizziness, or chest tightness.',
        treatment_plan: 'Reassurance provided. Minimize caffeine and energy drink intake. Follow-up ECG only if symptoms escalate.',
        meds: [
          { name: 'Magnesium Orotate', dosage: '500mg', freq: 'Once daily with meals', dur: '14 days', route: 'oral', instr: 'Supplements cardiac cellular stability' },
        ],
      },
      {
        serviceName: 'General Health Checkup',
        price: 500,
        type: 'in-person',
        diagnosis: 'Seasonal Allergic Rhinitis & Upper Respiratory Viral Symptoms',
        symptoms: 'Clear rhinorrhea, nasal congestion, sneezing episodes for 4 days. Afebrile, chest clear on auscultation.',
        treatment_plan: 'Antihistamine course, saline nasal lavage, steam inhalation twice daily. Adequate hydration.',
        meds: [
          { name: 'Fexofenadine HCl', dosage: '120mg', freq: 'Once daily', dur: '10 days', route: 'oral', instr: 'Take before breakfast' },
          { name: 'Fluticasone Furoate Nasal Spray', dosage: '27.5 mcg/spray', freq: '2 sprays each nostril daily', dur: '14 days', route: 'nasal', instr: 'Prime bottle before first use' },
          { name: 'Normal Saline Nasal Drops', dosage: '0.9%', freq: '3 drops in each nostril 3 times daily', dur: '7 days', route: 'nasal', instr: 'Use before nasal spray' },
        ],
      },
      {
        serviceName: 'Cardiology Consultation',
        price: 1000,
        type: 'video',
        diagnosis: 'Stable Angina Pectoris follow-up & Post-Stent Evaluation',
        symptoms: 'Patient reports good exercise tolerance on flat surfaces. No angina episodes over the last month. BP 124/78 mmHg.',
        treatment_plan: 'Continue dual antiplatelet regimen and statin therapy. Encourage cardiac rehabilitation maintenance.',
        meds: [
          { name: 'Clopidogrel + Aspirin', dosage: '75mg/75mg', freq: 'Once daily after lunch', dur: '60 days', route: 'oral', instr: 'Do not stop without cardiologist consent' },
          { name: 'Rosuvastatin', dosage: '20mg', freq: 'Once daily at bedtime', dur: '60 days', route: 'oral', instr: 'Strict compliance required' },
          { name: 'Bisoprolol Fumarate', dosage: '2.5mg', freq: 'Once daily (Morning)', dur: '60 days', route: 'oral', instr: 'Monitors resting pulse rate' },
        ],
      },
      {
        serviceName: 'Pediatric Consultation',
        price: 700,
        type: 'in-person',
        diagnosis: 'Acute Viral Bronchiolitis with Mild Wheezing',
        symptoms: 'Irritable cough, low grade fever (99.8F), tachypnea, scattered expiratory wheeze heard over bilateral lower lung zones.',
        treatment_plan: 'Salbutamol nebulization every 6 hours as needed, paracetamol drops for pyrexia, frequent small feeds, monitor respiratory rate.',
        meds: [
          { name: 'Paracetamol Pediatric Syrup', dosage: '120mg/5ml (5ml)', freq: 'Every 6-8 hours PRN for fever > 100F', dur: '5 days', route: 'oral', instr: 'Do not exceed 4 doses in 24 hours' },
          { name: 'Levosalbutamol Respules', dosage: '0.63mg/2.5ml', freq: 'Nebulize every 8 hours', dur: '3 days', route: 'inhalation', instr: 'Dilute with normal saline' },
        ],
      },
      {
        serviceName: 'Echocardiography (Echo)',
        price: 2500,
        type: 'in-person',
        diagnosis: 'Mild Concentric Left Ventricular Hypertrophy (LVH), Preserved LVEF 62%',
        symptoms: 'Hypertension evaluation. Normal chamber sizes, no significant regional wall motion abnormality, grade 1 diastolic dysfunction.',
        treatment_plan: 'Optimize antihypertensive pharmacotherapy. Target SBP < 130 mmHg. Repeat 2D Echo in 12 months.',
        meds: [
          { name: 'Amlodipine + Olmesartan', dosage: '5mg/20mg', freq: 'Once daily in morning', dur: '30 days', route: 'oral', instr: 'Monitor for peripheral pedal edema' },
        ],
      },
    ];

    // Build timeline dates from 6 months ago up to today and 3 weeks into future
    const doctorList = ['u-doctor-001', 'u-doctor-002', 'u-doctor-008'];
    const clinicId = 'c-clinic-001';

    let apptCount = 0;
    let paymentCount = 0;
    let emrCount = 0;
    let rxCount = 0;

    // Clean legacy / test appointments cleanly with cascading foreign keys
    try {
      await query('DELETE FROM reviews WHERE appointment_id IS NOT NULL AND appointment_id NOT LIKE "a-seed-%"');
      await query('DELETE FROM payments WHERE appointment_id IS NOT NULL AND appointment_id NOT LIKE "a-seed-%"');
      await query('DELETE FROM prescription_items WHERE prescription_id IN (SELECT id FROM prescriptions WHERE appointment_id IS NOT NULL AND appointment_id NOT LIKE "a-seed-%")');
      await query('DELETE FROM prescriptions WHERE appointment_id IS NOT NULL AND appointment_id NOT LIKE "a-seed-%"');
      await query('DELETE FROM medical_records WHERE appointment_id IS NOT NULL AND appointment_id NOT LIKE "a-seed-%"');
      await query('DELETE FROM appointments WHERE id NOT LIKE "a-seed-%"');
    } catch (e) {
      console.log('Legacy cleanup note:', e.message);
    }

    // Past 180 days in intervals to generate realistic multi-month distribution
    for (let dayOffset = -180; dayOffset <= 21; dayOffset += 2) {
      const apptDate = addDays(now, dayOffset);
      const dateStr = formatDate(apptDate);
      const isPast = dayOffset < 0;
      const isToday = dayOffset === 0;
      const isFuture = dayOffset > 0;

      // 1 to 3 appointments per day in this slot
      const slotsPerDay = (Math.abs(dayOffset) % 3) + 1;

      for (let slot = 0; slot < slotsPerDay; slot++) {
        apptCount++;
        const apptId = `a-seed-${String(apptCount).padStart(4, '0')}`;
        const patientObj = patientRecords[apptCount % patientRecords.length];
        const doctorId = doctorList[apptCount % doctorList.length];
        const scenario = clinicalScenarios[apptCount % clinicalScenarios.length];

        const startHour = (dayOffset >= 0) ? (14 + slot) : (9 + (slot * 2));
        const startTime = `${String(startHour).padStart(2, '0')}:00:00`;
        const endTime = `${String(startHour).padStart(2, '0')}:45:00`;

        let status = 'completed';
        if (isFuture) {
          status = slot % 3 === 0 ? 'confirmed' : 'scheduled';
        } else if (isToday) {
          status = slot === 0 ? 'completed' : (slot === 1 ? 'in_progress' : 'confirmed');
        } else {
          // Past appointment distribution: 85% completed, 10% cancelled, 5% no_show
          if (apptCount % 17 === 0) status = 'no_show';
          else if (apptCount % 11 === 0) status = 'cancelled';
          else status = 'completed';
        }

        const serviceId = serviceIdMap[`${clinicId}_${scenario.serviceName}`] || null;

        // Insert Appointment
        await query(
          `INSERT INTO appointments (id, clinic_id, patient_id, doctor_id, service_id, appointment_date, start_time, end_time, status, type, notes, cancellation_reason)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE status = VALUES(status), start_time = VALUES(start_time), end_time = VALUES(end_time)`,
          [
            apptId,
            clinicId,
            patientObj.id,
            doctorId,
            serviceId,
            dateStr,
            startTime,
            endTime,
            status,
            scenario.type,
            `Consultation for ${scenario.serviceName}. Patient ref: ${patientObj.first_name} ${patientObj.last_name}`,
            status === 'cancelled' ? 'Patient requested rescheduling due to unavoidable business travel.' : null,
          ]
        );

        // Financial Invoice & Payment
        if (status === 'completed' || status === 'confirmed' || status === 'in_progress' || (isFuture && slot === 0)) {
          paymentCount++;
          const payId = `pay-seed-${String(paymentCount).padStart(4, '0')}`;
          const invNum = `INV-2026-${String(paymentCount).padStart(4, '0')}`;
          const payMethod = ['mobile_banking', 'card', 'cash', 'online'][paymentCount % 4];
          const payStatus = status === 'completed' ? 'completed' : (isFuture ? 'pending' : (paymentCount % 15 === 0 ? 'pending' : 'completed'));

          const discount = paymentCount % 5 === 0 ? 50.00 : 0.00;
          const tax = Math.round((scenario.price - discount) * 0.05 * 100) / 100;
          const total = scenario.price - discount + tax;

          const payDate = payStatus === 'completed' ? formatDateTime(addDays(apptDate, 0)) : null;

          await query(
            `INSERT INTO payments (id, clinic_id, patient_id, appointment_id, invoice_number, amount, discount, tax, total_amount, payment_method, payment_status, payment_date, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE payment_status = VALUES(payment_status), total_amount = VALUES(total_amount)`,
            [
              payId,
              clinicId,
              patientObj.id,
              apptId,
              invNum,
              scenario.price,
              discount,
              tax,
              total,
              payMethod,
              payStatus,
              payDate,
              `Medical invoice for ${scenario.serviceName} - Paid via ${payMethod.replace('_', ' ')}`,
            ]
          );
        }

        // Clinical EMR & Prescription records for completed appointments
        if (status === 'completed') {
          emrCount++;
          const emrId = `mr-seed-${String(emrCount).padStart(4, '0')}`;
          const followUp = formatDate(addDays(apptDate, 28));

          await query(
            `INSERT INTO medical_records (id, patient_id, clinic_id, doctor_id, appointment_id, diagnosis, symptoms, treatment_plan, notes, follow_up_date, is_confidential)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE diagnosis = VALUES(diagnosis), treatment_plan = VALUES(treatment_plan)`,
            [
              emrId,
              patientObj.id,
              clinicId,
              doctorId,
              apptId,
              scenario.diagnosis,
              scenario.symptoms,
              scenario.treatment_plan,
              `Clinical notes verified by Dr. Abdul Rahman. Patient instructed on warning signs.`,
              followUp,
              emrCount % 7 === 0 ? 1 : 0,
            ]
          );

          rxCount++;
          const rxId = `rx-seed-${String(rxCount).padStart(4, '0')}`;
          await query(
            `INSERT INTO prescriptions (id, patient_id, clinic_id, doctor_id, appointment_id, diagnosis, notes, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE diagnosis = VALUES(diagnosis), notes = VALUES(notes)`,
            [
              rxId,
              patientObj.id,
              clinicId,
              doctorId,
              apptId,
              scenario.diagnosis,
              'Take medications strictly with water as prescribed. Report any adverse reactions immediately.',
            ]
          );

          // Add medication items
          let itemIdx = 0;
          for (const m of scenario.meds) {
            itemIdx++;
            const itemId = `rxi-${rxId}-${itemIdx}`;
            await query(
              `INSERT INTO prescription_items (id, prescription_id, medication_name, dosage, frequency, duration, route, instructions, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
               ON DUPLICATE KEY UPDATE dosage = VALUES(dosage), frequency = VALUES(frequency)`,
              [itemId, rxId, m.name, m.dosage, m.freq, m.dur, m.route, m.instr]
            );
          }
        }
      }
    }

    console.log(`  -> Inserted ${apptCount} appointments across 6-month historical timeline`);
    console.log(`  -> Inserted ${paymentCount} financial transactions & invoices`);
    console.log(`  -> Inserted ${emrCount} electronic medical records (EMR)`);
    console.log(`  -> Inserted ${rxCount} digital prescriptions with prescription items`);

    // =========================================================================
    // 10. MEDICAL REPORTS / LAB RESULTS
    // =========================================================================
    console.log('-> Seeding Diagnostic & Lab Reports...');
    const reports = [
      { type: 'Complete Blood Count (CBC)', desc: 'Hb 13.8 g/dL, WBC 6,400/uL, Platelets 260,000/uL. Normal cellular indices.', patientId: 'p-patient-001', docId: 'u-doctor-001' },
      { type: 'Lipid Profile Panel', desc: 'Total Cholesterol 210 mg/dL, LDL 135 mg/dL, HDL 48 mg/dL, Triglycerides 160 mg/dL.', patientId: 'p-patient-002', docId: 'u-doctor-001' },
      { type: 'HbA1c & Fasting Glucose', desc: 'HbA1c 6.8%, Fasting Blood Sugar 118 mg/dL. Good glycemic control with current therapy.', patientId: 'p-patient-002', docId: 'u-doctor-007' },
      { type: '12-Lead Resting ECG Report', desc: 'Normal sinus rhythm, PR interval 150ms, QRS 88ms, no ischemic ST-T wave abnormalities.', patientId: 'p-patient-004', docId: 'u-doctor-001' },
      { type: '2D Transthoracic Echocardiogram', desc: 'Concentric LVH, LVEF 62%, Normal valve morphology, Grade 1 diastolic dysfunction.', patientId: 'p-patient-004', docId: 'u-doctor-001' },
      { type: 'Serum Electrolytes & Creatinine', desc: 'Sodium 140 mEq/L, Potassium 4.2 mEq/L, Serum Creatinine 0.9 mg/dL. Normal renal clearance.', patientId: 'p-patient-001', docId: 'u-doctor-001' },
      { type: 'Liver Function Test (LFT)', desc: 'ALT (SGPT) 28 U/L, AST (SGOT) 24 U/L, Total Bilirubin 0.8 mg/dL. Normal hepatic parameters.', patientId: 'p-patient-006', docId: 'u-doctor-007' },
      { type: 'Thyroid Panel (TSH, FT4)', desc: 'TSH 2.15 uIU/mL, Free T4 1.28 ng/dL. Normal euthyroid endocrine status.', patientId: 'p-patient-007', docId: 'u-doctor-004' },
      { type: 'Dermatopathology Biopsy', desc: 'Epidermal hyperkeratosis consistent with mild chronic eczema. No malignancy noted.', patientId: 'p-patient-005', docId: 'u-doctor-003' },
      { type: 'Chest X-Ray (PA View)', desc: 'Lungs are clear bilaterally. Cardiothoracic ratio within normal physiological limits.', patientId: 'p-patient-003', docId: 'u-doctor-001' },
    ];

    let rptIdx = 0;
    for (const r of reports) {
      rptIdx++;
      const rptId = `rep-seed-${String(rptIdx).padStart(3, '0')}`;
      const rptDate = formatDate(subMonths(now, rptIdx % 4));
      await query(
        `INSERT INTO medical_reports (id, patient_id, clinic_id, doctor_id, uploaded_by, title, report_type, file_name, file_url, description, report_date)
         VALUES (?, ?, 'c-clinic-001', ?, ?, ?, ?, 'sample-report.pdf', 'https://storage.googleapis.com/clinic-os-public/reports/sample-report.pdf', ?, ?)
         ON DUPLICATE KEY UPDATE description = VALUES(description)`,
        [rptId, r.patientId, r.docId, r.docId, r.type, r.type, r.desc, rptDate]
      );
    }

    // =========================================================================
    // 11. REVIEWS & RATINGS
    // =========================================================================
    console.log('-> Seeding Patient Reviews & Doctor Ratings...');
    const reviews = [
      { patientId: 'p-patient-001', docId: 'u-doctor-001', rating: 5, comment: 'Dr. Abdul Rahman is an outstanding cardiologist. He listened patiently, explained my ECG thoroughly, and my blood pressure is now perfectly controlled.', approved: 1 },
      { patientId: 'p-patient-002', docId: 'u-doctor-001', rating: 5, comment: 'Very professional clinic environment. Kamal at the front desk was very helpful and the appointment was right on schedule without waiting.', approved: 1 },
      { patientId: 'p-patient-003', docId: 'u-doctor-001', rating: 4, comment: 'Great consultation and modern facilities. The digital prescription in the patient portal made buying medicine seamless.', approved: 1 },
      { patientId: 'p-patient-004', docId: 'u-doctor-001', rating: 5, comment: 'Dr. Rahman detected my cardiac condition early and guided me through lifestyle and medical recovery. Truly grateful for his expertise!', approved: 1 },
      { patientId: 'p-patient-005', docId: 'u-doctor-003', rating: 5, comment: 'Dr. Michael Chen transformed my skin condition. The acne clarifying plan worked wonders in just 4 weeks.', approved: 1 },
      { patientId: 'p-patient-006', docId: 'u-doctor-007', rating: 5, comment: 'Metro Health clinic is spotless and Dr. Tanvir Ahmed is the most knowledgeable diabetologist in town.', approved: 1 },
      { patientId: 'p-patient-007', docId: 'u-doctor-004', rating: 5, comment: 'Dr. Ayesha made my prenatal journey stress-free and pleasant. Warm, empathetic, and extremely experienced.', approved: 1 },
      { patientId: 'p-patient-008', docId: 'u-doctor-001', rating: 4, comment: 'Excellent doctor and accurate diagnostic tests. Would appreciate extended evening slot options on weekends.', approved: 1 },
      { patientId: 'p-patient-009', docId: 'u-doctor-002', rating: 5, comment: 'Dr. Sarah was so gentle with our toddler during her checkup. Best pediatrician we have visited!', approved: 1 },
      { patientId: 'p-patient-010', docId: 'u-doctor-001', rating: 3, comment: 'Good doctor, but parking near the clinic was congested during morning rush hour.', approved: 0 }, // Pending approval for admin moderation
    ];

    let revIdx = 0;
    for (const rv of reviews) {
      revIdx++;
      const revId = `rev-seed-${String(revIdx).padStart(3, '0')}`;
      await query(
        `INSERT INTO reviews (id, clinic_id, patient_id, doctor_id, rating, comment, is_approved)
         VALUES (?, 'c-clinic-001', ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), is_approved = VALUES(is_approved)`,
        [revId, rv.patientId, rv.docId, rv.rating, rv.comment, rv.approved]
      );
    }

    // =========================================================================
    // 12. MESSAGES & MULTI-USER COMMUNICATIONS
    // =========================================================================
    console.log('-> Seeding Direct Messages...');
    const messageThreads = [
      { senderId: 'u-patient-001', receiverId: 'u-doctor-001', subject: 'BP Reading Update', msg: 'Good morning Dr. Rahman, my morning BP was 122/80 mmHg today. Feeling much better with the new prescription.' },
      { senderId: 'u-doctor-001', receiverId: 'u-patient-001', subject: 'Re: BP Reading Update', msg: 'Excellent news Fatima. Please keep maintaining the low salt diet and log your vitals twice a week.' },
      { senderId: 'u-assistant-001', receiverId: 'u-doctor-001', subject: 'Tomorrow Schedule Roster', msg: 'Dr. Rahman, we have 8 scheduled in-person consults and 2 video appointments confirmed for tomorrow morning.' },
      { senderId: 'u-doctor-001', receiverId: 'u-assistant-001', subject: 'Re: Tomorrow Schedule Roster', msg: 'Thanks Kamal, please ensure the ECG machine paper rolls are restocked before 9:00 AM.' },
      { senderId: 'u-patient-002', receiverId: 'u-doctor-001', subject: 'Lab Test Uploaded', msg: 'Hello Doctor, I have uploaded my latest fasting blood sugar and HbA1c reports to my patient portal.' },
      { senderId: 'u-doctor-001', receiverId: 'u-patient-002', subject: 'Re: Lab Test Uploaded', msg: 'Reviewed your HbA1c (6.8%). Very good improvement Tariqul! Continue current dosage.' },
      { senderId: 'u-patient-003', receiverId: 'u-assistant-001', subject: 'Invoice Receipt Inquiry', msg: 'Hi Kamal, could you confirm if my online payment for yesterday consultation went through?' },
      { senderId: 'u-assistant-001', receiverId: 'u-patient-003', subject: 'Re: Invoice Receipt Inquiry', msg: 'Yes Emily, your invoice INV-2026-0003 is fully paid. You can download the PDF from your Billing tab.' },
    ];

    let msgIdx = 0;
    for (const m of messageThreads) {
      msgIdx++;
      const msgId = `msg-seed-${String(msgIdx).padStart(3, '0')}`;
      await query(
        `INSERT INTO messages (id, sender_id, receiver_id, subject, message, is_read)
         VALUES (?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE message = VALUES(message), is_read = 1`,
        [msgId, m.senderId, m.receiverId, m.subject, m.msg]
      );
    }

    // =========================================================================
    // 13. NOTIFICATIONS
    // =========================================================================
    console.log('-> Seeding Notifications...');
    const notifs = [
      { userId: 'u-doctor-001', title: 'New Appointment Booked', msg: 'Tariqul Islam has booked a Cardiology Consultation for next Monday at 10:00 AM.', type: 'info', read: 0 },
      { userId: 'u-doctor-001', title: 'Payment Received', msg: 'Invoice INV-2026-0012 of $1,000.00 was successfully paid via bKash.', type: 'success', read: 0 },
      { userId: 'u-doctor-001', title: 'Lab Report Ready', msg: 'Complete Blood Count (CBC) for Fatima Begum is now available in the EMR.', type: 'info', read: 1 },
      { userId: 'u-assistant-001', title: 'Appointment Rescheduled', msg: 'Rahim Chowdhury rescheduled his appointment to Thursday at 11:30 AM.', type: 'warning', read: 0 },
      { userId: 'u-patient-001', title: 'Prescription Issued', msg: 'Dr. Abdul Rahman has issued your digital prescription. View details in your portal.', type: 'success', read: 0 },
      { userId: 'u-patient-001', title: 'Upcoming Appointment Reminder', msg: 'You have a scheduled consultation tomorrow at 10:00 AM at Rahman Medical Center.', type: 'info', read: 1 },
      { userId: 'u-admin-001', title: 'New Clinic Registered', msg: 'OrthoPlus Sports Medicine has registered and submitted credentials for verification.', type: 'warning', read: 0 },
      { userId: 'u-admin-001', title: 'Monthly Revenue Milestone', msg: 'Platform Monthly Recurring Revenue (MRR) crossed $645.00 this month!', type: 'success', read: 1 },
    ];

    let nIdx = 0;
    for (const n of notifs) {
      nIdx++;
      const nId = `notif-seed-${String(nIdx).padStart(3, '0')}`;
      await query(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE title = VALUES(title), message = VALUES(message)`,
        [nId, n.userId, n.title, n.msg, n.type, n.read]
      );
    }

    // =========================================================================
    // 14. AUDIT LOGS
    // =========================================================================
    console.log('-> Seeding Audit Logs...');
    const auditLogs = [
      { userId: 'u-doctor-001', action: 'DOCTOR_LOGIN', entity: 'User', id: 'u-doctor-001', ip: '103.205.71.12', details: { role: 'doctor', browser: 'Chrome 128' } },
      { userId: 'u-doctor-001', action: 'APPOINTMENT_CREATE', entity: 'Appointment', id: 'a-seed-0001', ip: '103.205.71.12', details: { patient: 'Fatima Begum', type: 'in-person' } },
      { userId: 'u-doctor-001', action: 'PRESCRIPTION_CREATE', entity: 'Prescription', id: 'rx-seed-0001', ip: '103.205.71.12', details: { items: 2, patient_id: 'p-patient-001' } },
      { userId: 'u-assistant-001', action: 'PAYMENT_RECEIVE', entity: 'Payment', id: 'pay-seed-0001', ip: '103.205.71.14', details: { amount: 1000, method: 'mobile_banking' } },
      { userId: 'u-admin-001', action: 'ADMIN_PLAN_UPDATE', entity: 'SubscriptionPlan', id: 'plan-pro', ip: '192.168.1.1', details: { price: 79, active: true } },
      { userId: 'u-patient-001', action: 'PATIENT_PORTAL_LOGIN', entity: 'User', id: 'u-patient-001', ip: '202.4.96.3', details: { browser: 'Safari Mobile' } },
      { userId: 'u-doctor-001', action: 'EMR_RECORD_UPDATE', entity: 'MedicalRecord', id: 'mr-seed-0001', ip: '103.205.71.12', details: { confidentiality: false } },
    ];

    let aIdx = 0;
    for (const al of auditLogs) {
      aIdx++;
      const alId = `al-seed-${String(aIdx).padStart(3, '0')}`;
      await query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE action = VALUES(action)`,
        [alId, al.userId, al.action, al.entity, al.id, JSON.stringify(al.details), al.ip]
      );
    }

    console.log('\n========================================================================');
    console.log('🎉 ClinicOS Comprehensive Mock Data Population Complete!');
    console.log('========================================================================');
    console.log('\nReady-to-use User Personas (All use password: password123):');
    console.log('------------------------------------------------------------------------');
    console.log('1. SUPER / PLATFORM ADMIN:');
    console.log('   - admin@clinic-os.com        (Platform Super Admin, Full Control)');
    console.log('   - superadmin@clinic-os.com   (Platform Operations Admin)');
    console.log('\n2. DOCTORS / SPECIALISTS:');
    console.log('   - dr.rahman@clinic-os.com    (Cardiologist, Owner of Rahman Medical Center)');
    console.log('   - dr.sarah@clinic-os.com     (Pediatrician, KidsFirst & Rahman Medical)');
    console.log('   - dr.chen@clinic-os.com      (Dermatologist, Owner of DermaCare Studio)');
    console.log('   - dr.ayesha@clinic-os.com    (Gynecologist, CarePoint Women Health)');
    console.log('   - dr.tanvir@clinic-os.com    (Diabetologist, Metro Health Clinic)');
    console.log('   - dr.marcus@clinic-os.com    (Orthopedic Surgeon, OrthoPlus)');
    console.log('   - dr.elena@clinic-os.com     (Neurologist & Psychiatrist)');
    console.log('   - dr.priya@clinic-os.com     (Preventive Cardiologist)');
    console.log('\n3. CLINIC ASSISTANTS & STAFF:');
    console.log('   - assistant@clinic-os.com        (Senior Coordinator, Rahman Medical)');
    console.log('   - nusrat.assistant@clinic-os.com (Reception & Billing Specialist)');
    console.log('   - david.assistant@clinic-os.com  (Clinical Lab Coordinator)');
    console.log('   - maya.assistant@clinic-os.com   (Patient Concierge)');
    console.log('\n4. PATIENT PORTAL USERS:');
    console.log('   - patient@example.com        (Fatima Begum - Hypertension Patient)');
    console.log('   - tariqul@example.com        (Tariqul Islam - Diabetes Patient)');
    console.log('   - emily.watson@example.com   (Emily Watson - Asthma & Rhinitis Patient)');
    console.log('   - rahim.chowdhury@example.com(Rahim Chowdhury - Cardiac Care Patient)');
    console.log('   - sophia.zhang@example.com   (Sophia Zhang - Dermatology Patient)');
    console.log('   - james.wilson@example.com   (James Wilson - Metabolic Health)');
    console.log('------------------------------------------------------------------------\n');

  } catch (error) {
    console.error('[ClinicOS Seeder Error]:', error.message || error);
    throw error;
  }
}

if (require.main === module) {
  seed().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { seed };
