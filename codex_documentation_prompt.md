# Master Codex Execution Prompt: Comprehensive Technical Documentation & Viva Defense Guide (`documentation.md`)

> **Role for Codex**: You are a Principal Software Architect, Senior Full-Stack Engineer, and University Computer Science Defense Examiner.
> **Target Task**: Generate an exhaustive, beginner-friendly, academic-grade `documentation.md` file for the **ClinicOS** project.
> **Project Context**: The project is a multi-tenant Clinic Management SaaS platform. It was rapidly developed ("vibe coded"), and the student engineering team now requires a complete, crystal-clear, end-to-end technical explanation of both the frontend and backend codebases to deeply understand the system, ace their project defense/viva, and prove technical ownership of every line of code.
> **Ground-Truth Source**: Do NOT invent or hallucinate technologies. The system runs on **React 18 + Vite + TypeScript + Tailwind CSS** (Frontend) and **Node.js + Express.js + MySQL 8.0 (using `mysql2/promise` connection pooling)** (Backend). (Note: SQLite and MongoDB were drafted in early planning but completely retired for pure MySQL 8.0 in production).

---

## Instructions for Codex Execution

When executing this prompt to write `documentation.md`, you must structure the output into **6 exhaustive sections** covering all 9 required areas from the prompt specifications:
1. **Section 1: Executive Summary & High-Level System Architecture** (Points 1, 2, 8)
2. **Section 2: Authoritative Database Schema & Relational Data Dictionary** (Point 7)
3. **Section 3: Feature-by-Feature Low-Level Implementation & Codebase Mapping** (Point 3)
4. **Section 4: Group Member Workload Distribution & Individual Feature Defense** (Point 4)
5. **Section 5: Deep-Dive Code Snippets & Algorithmic Mechanics** (Point 9)
6. **Section 6: Viva Defense Masterclass, Trap Questions & High-Scoring Tips** (Points 5, 6)

Ensure that all explanations are **beginner-friendly**, explaining *why* an architectural choice was made, *what* exact files implement it, *how* data flows through HTTP requests to SQL queries, and *how* to answer tough examiner questions with confidence.

---

# SECTION 1: High-Level System Architecture & Technology Blueprint

### 1.1 Project Overview & Problem Statement
- **What is ClinicOS?** A full-stack, multi-tenant healthcare software-as-a-service (SaaS) designed for private outpatient clinics and independent doctors.
- **Problem it Solves**: Traditional hospital management systems (HMS) are bloated, expensive, and designed for multi-ward enterprises. Independent doctors and small clinics still rely on paper files, fragmented WhatsApp messaging, and unorganized physical queues. ClinicOS provides a centralized, lightweight, multi-tenant digital workspace for managing clinics, doctor schedules, appointments, patient demographics, clinical electronic medical records (SOAP notes), structured digital prescriptions, payment invoicing, patient reviews, and secure messaging.
- **Multi-Tenant Architecture**: A single deployed instance serves multiple distinct clinics. Data isolation is strictly enforced via `clinic_id` scoping at both the database level (foreign keys and composite indexes) and the middleware level (`clinicAccess` guard).

### 1.2 Technology Stack Truth Matrix
Explain why each technology was chosen and clarify common misconceptions:
| Tier | Technology | Key Libraries / Modules | Architectural Justification |
| :--- | :--- | :--- | :--- |
| **Frontend** | React 18.3 (Vite 6.3) | TypeScript, Tailwind CSS v4, Lucide Icons, Radix UI Primitives, jsPDF, html2canvas | Single-Page Application (SPA) offering instant reactivity, client-side routing, type safety, and local high-resolution PDF rendering without backend CPU overhead. |
| **Backend** | Node.js (v18+) & Express 4.21 | `cors`, `helmet`, `express-rate-limit`, `express-validator`, `jsonwebtoken`, `bcryptjs`, `crypto` | Asynchronous non-blocking I/O event loop ideal for concurrent REST API requests; lightweight middleware pipeline. |
| **Database** | MySQL 8.0+ / MariaDB | `mysql2/promise` with connection pooling | ACID compliance, strict foreign key referential integrity, relational schema with composite indexes, row-level locking (`FOR UPDATE`) for concurrency defense. |
| **Security** | Defense-in-Depth | JWT, bcrypt (10 rounds), SHA-256 tokens, 30-min Inactivity tracker, Anti-IDOR, Helmet | Robust protection against OWASP Top 10 vulnerabilities (IDOR, SQL Injection, XSS, Broken Authentication). |

### 1.3 End-to-End Request/Response Lifecycle
Diagram and explain the complete lifecycle of a client request:
```text
[ Browser / React Client ]
       │
       ▼  (HTTPS / REST / JSON + Bearer JWT Header)
[ Express HTTP Server (server/src/index.js) ]
       │
       ├──► [ Security Middleware: Helmet, CORS allowlist, RateLimiter ]
       │
       ├──► [ Auth Middleware: authenticate() in auth.js ]
       │      └── Validates JWT signature, checks 30-min inactivity map, loads req.user
       │
       ├──► [ Tenant / RBAC Middleware: clinicAccess() in rbac.js ]
       │      └── Verifies clinic exists/active, enforces ownership or staff membership
       │
       ├──► [ Validation Layer: express-validator in validators/ ]
       │      └── Sanitizes input, checks date formats, positive numbers, returns 400 on error
       │
       ├──► [ Controller Layer: controllers/*Controller.js ]
       │      └── Orchestrates business logic, permissions, and service calls
       │
       ├──► [ Data Access Model: models/*.js ]
       │      └── Executes parameterized SQL queries via mysql2 pool (or db.transaction)
       │
       ▼  (SQL Execution & Result Set)
[ MySQL 8.0 Database ]
```

---

# SECTION 2: Complete Relational Database Schema & Data Dictionary

Document all **16 authoritative tables** in `server/db/schema.sql`. For each table, describe its purpose, primary key, foreign keys, constraints, and how it connects to the system:

1. **`users`**: Platform identity accounts.
   - Fields: `id` (UUID PK), `email` (UNIQUE), `password` (bcrypt hash), `role` (`patient`, `doctor`, `assistant`, `admin`), `first_name`, `last_name`, `phone`, `avatar_url`, `is_verified`, `is_active`, `refresh_token`, `reset_password_token`, `reset_password_expires`, `verification_otp`, `verification_otp_expires`.
2. **`doctor_profiles`**: Extended professional credentials for doctors (`1-to-1` with `users`).
   - Fields: `id`, `user_id` (FK), `qualifications`, `specialization`, `experience_years`, `consultation_fee`, `bio`.
3. **`clinics`**: Tenant workspaces.
   - Fields: `id` (UUID PK), `owner_id` (FK -> users), `name`, `slug` (UNIQUE), `description`, `address`, `city`, `state`, `country`, `timezone`, `phone`, `email`, `website`, `logo_url`, `banner_url`, `is_active`.
4. **`clinic_staff`**: Many-to-Many junction linking doctors and assistants to clinics.
   - Fields: `id`, `clinic_id` (FK), `user_id` (FK), `role` (`doctor`, `assistant`), `is_active`, `UNIQUE(clinic_id, user_id)`.
5. **`clinic_schedules`**: Weekly operating hours per clinic day.
   - Fields: `id`, `clinic_id` (FK), `day_of_week` (0=Sunday to 6=Saturday), `start_time`, `end_time`, `is_available`, `UNIQUE(clinic_id, day_of_week)`.
6. **`clinic_services`**: Consultation services catalog.
   - Fields: `id`, `clinic_id` (FK), `name`, `description`, `duration_minutes`, `price`, `is_active`.
7. **`consultation_packages`**: Discounted bundled multi-session packages.
   - Fields: `id`, `clinic_id` (FK), `name`, `description`, `sessions_count`, `price`, `is_active`.
8. **`patients`**: Clinic-scoped patient enrollment records.
   - Fields: `id` (UUID PK), `user_id` (FK -> users, nullable for walk-in patients), `clinic_id` (FK), `first_name`, `last_name`, `date_of_birth`, `gender`, `phone`, `email`, `address`, `blood_group`, `allergies`, `chronic_conditions`, `emergency_contact_name`, `emergency_contact_phone`, `is_active`.
9. **`patient_profiles`**: Global demographic profile linked to the patient account (`1-to-1` with `users`).
   - Fields: `user_id` (PK / FK), `date_of_birth`, `gender`, `address`, `blood_group`, `allergies`, `chronic_conditions`, `emergency_contact_name`, `emergency_contact_phone`.
10. **`appointments`**: Bookings and clinical visits.
    - Fields: `id` (UUID PK), `clinic_id` (FK), `patient_id` (FK), `doctor_id` (FK), `service_id` (FK), `appointment_date`, `start_time`, `end_time`, `status` (`scheduled`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`), `type` (`in-person`, `video`, `phone`), `notes`, `cancellation_reason`, `reminder_sent_at`.
11. **`medical_records`**: EMR / clinical SOAP notes.
    - Fields: `id`, `patient_id` (FK), `clinic_id` (FK), `doctor_id` (FK), `appointment_id` (FK nullable), `diagnosis`, `symptoms`, `treatment_plan`, `notes`, `follow_up_date`, `is_confidential`.
12. **`prescriptions` & `prescription_items`**: Two-table header-detail relationship for medications.
    - `prescriptions`: `id`, `patient_id` (FK), `clinic_id` (FK), `doctor_id` (FK), `appointment_id` (FK), `diagnosis`, `notes`, `is_active`.
    - `prescription_items`: `id`, `prescription_id` (FK ON DELETE CASCADE), `medication_name`, `dosage`, `frequency`, `duration`, `route`, `instructions`, `is_active`.
13. **`medical_reports`**: Diagnostic lab and imaging reports.
    - Fields: `id`, `patient_id` (FK), `clinic_id` (FK), `doctor_id` (FK), `uploaded_by` (FK), `title`, `report_type`, `file_name`, `file_url`, `description`, `report_date`.
14. **`payments`**: Financial billing ledger and invoices.
    - Fields: `id`, `clinic_id` (FK), `patient_id` (FK), `appointment_id` (FK), `invoice_number` (UNIQUE), `amount`, `discount`, `tax`, `total_amount`, `payment_method` (`cash`, `card`, `online`, `mobile_banking`), `payment_status` (`pending`, `completed`, `failed`, `refunded`), `transaction_id`, `payment_date`, `receipt_number` (UNIQUE), `receipt_generated_at`, `notes`.
15. **`reviews`**: Ratings and feedback for doctors and clinics.
    - Fields: `id`, `clinic_id` (FK), `patient_id` (FK), `doctor_id` (FK), `appointment_id` (FK UNIQUE - prevents multiple reviews per visit), `rating` (1-5), `comment`, `is_approved`.
16. **`subscription_plans` & `clinic_subscriptions`**: SaaS monetization tiers.
    - `subscription_plans`: `id`, `name`, `description`, `price`, `billing_cycle`, `max_doctors`, `max_patients`, `max_staff`, `features` (JSON).
    - `clinic_subscriptions`: `id`, `clinic_id` (FK), `plan_id` (FK), `status` (`active`, `expired`, `cancelled`, `trial`), `start_date`, `end_date`, `auto_renew`, `stripe_subscription_id`.
17. **Cross-Cutting Tables**:
    - **`notifications`**: In-app alerts (`id`, `user_id`, `title`, `message`, `type`, `reference_type`, `reference_id`, `is_read`).
    - **`messages`**: Direct doctor-patient communication (`id`, `sender_id`, `receiver_id`, `subject`, `message`, `is_read`).
    - **`audit_logs`**: System audit trail (`id`, `user_id`, `action`, `entity_type`, `entity_id`, `details` (JSON), `ip_address`).

### 2.1 Entity Relationship Diagram (Mermaid)
Provide a clear Mermaid ER diagram showing the primary keys, foreign keys, and cardinalities between Users, Clinics, Staff, Patients, Appointments, EMR, Prescriptions, Payments, and Reviews.

---

# SECTION 3: Feature-by-Feature Low-Level Implementation & Codebase Mapping

Break down all **12 Core SRS Features** with precise file locations, function names, and request lifecycles:

### Feature 1 & 2: Registration, Cryptographic OTP & Account Verification
- **What it does**: Allows users to register as Patient or Doctor. Generates a secure 6-digit OTP code, stores it with a 15-minute expiration, and blocks login until email verification succeeds.
- **Backend Files**:
  - Route: `server/src/routes/authRoutes.js` (`POST /api/auth/register`, `POST /api/auth/verify-otp`, `POST /api/auth/resend-otp`)
  - Controller: `server/src/controllers/authController.js` (`register`, `verifyOTP`, `resendOTP`)
  - Model: `server/src/models/User.js` (`create`, `findByEmail`, `verifyUser`, `setVerificationOTP`)
  - Validator: `server/src/validators/authValidator.js` (`registerValidator`, `verifyOTPValidator`)
- **Frontend Files**:
  - View: `client/src/modules/auth/AuthPage.tsx` (Sign Up tab, 6-box auto-focus OTP input screen)
  - API: `client/src/app/api/auth.ts` (`authApi.register`, `authApi.verifyOTP`)

### Feature 3: Secure Login, JWT Session Management & Password Recovery
- **What it does**: Authenticates credentials using bcrypt comparison, signs a JWT token with issuer/audience validation, initializes session inactivity tracking (30 minutes), and dispatches users to their role-specific dashboard.
- **Backend Files**:
  - Route: `server/src/routes/authRoutes.js` (`POST /api/auth/login`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`)
  - Controller: `server/src/controllers/authController.js` (`login`, `forgotPassword`, `resetPassword`)
  - Middleware: `server/src/middleware/auth.js` (`authenticate`, `userActivityMap`)
  - Config: `server/src/config/security.js` (`getJwtConfig`)
- **Frontend Files**:
  - View: `client/src/modules/auth/AuthPage.tsx` (Login tab, Forgot Password modal)
  - Interceptor: `client/src/app/api/client.ts` (Attaches `Authorization: Bearer <token>`, handles HTTP 401 `auth:expired` event)

### Feature 4: Patient Appointment Booking & Scheduling Engine
- **What it does**: Enables patients to select services, pick available calendar dates, choose practicing doctors, and reserve slots with clinic-timezone awareness and atomic anti-double-booking mutex locks (`SELECT ... FOR UPDATE`).
- **Backend Files**:
  - Route: `server/src/routes/appointmentRoutes.js` (`POST /`, `GET /available-slots`, `PUT /:id/reschedule`, `PUT /:id/cancel`)
  - Controller: `server/src/controllers/appointmentController.js` (`create`, `getAvailableSlots`, `reschedule`, `cancel`)
  - Model: `server/src/models/Appointment.js` (`createTransactional`, `findDoctorConflicts`)
  - Utils: `server/src/utils/dateTime.js`, `server/src/utils/appointments.js`
- **Frontend Files**:
  - Modals: `client/src/app/components/ActionModals.tsx` (`BookAppointmentModal`, `RescheduleModal`, `CancelAppointmentModal`)
  - Dashboard Integration: `client/src/app/App.tsx` (Calendar 7-day strip, Appointment queue)

### Feature 5: Patient Dashboard & Self-Service Portal
- **What it does**: A dedicated patient-facing workspace displaying upcoming appointments, past medical records, downloadable digital prescriptions, invoice settlements, and demographic profile editing.
- **Frontend Files**:
  - Component: `client/src/modules/patient/PatientPortal.tsx`
  - Integration: `client/src/app/App.tsx` (Rendered when `user.role === 'patient'`)
  - API Modules: `client/src/app/api/appointments.ts`, `emr.ts`, `prescriptions.ts`, `billing.ts`

### Feature 6: Doctor & Assistant Clinic Dashboard
- **What it does**: The central management console for clinic staff. Features 14 tabs: Overview KPIs, Calendar & Appointments Queue, Patient CRM, EMR SOAP notes, Prescriptions, Invoices, Clinic Settings, Staff Invitations, Services, Packages, Analytics, Messages, and Reviews.
- **Frontend Files**:
  - Component: `client/src/app/App.tsx` (Doctor/Staff workspace shell, Sidebar, TopBar with active clinic switcher)
  - Controller: `server/src/controllers/clinicController.js` (`getDashboardStats`, `getClinicStaff`, `updateSettings`)

### Feature 7: Electronic Medical Records (EMR) & SOAP Notes
- **What it does**: Enables doctors to document patient consultations using standard SOAP notes (Subjective, Objective, Assessment, Plan). Implements a confidentiality flag (`is_confidential`) that prevents unauthorized staff or patients from reading sensitive psychiatric or private clinical notes.
- **Backend Files**:
  - Route: `server/src/routes/medicalRecordRoutes.js`
  - Controller: `server/src/controllers/medicalRecordController.js` (`create`, `getByPatient`, `update`)
  - Model: `server/src/models/MedicalRecord.js`
- **Frontend Files**:
  - Modal: `client/src/app/components/ActionModals.tsx` (`CreateMedicalRecordModal`)
  - View: `client/src/modules/patient/PatientPortal.tsx` & `client/src/app/App.tsx`

### Feature 8: Digital Prescription Generator & High-Res PDF Export
- **What it does**: Doctors issue electronic prescriptions with dynamic multi-row medication items (name, dosage, frequency, duration, route, instructions). Creates an atomic database transaction. Patients can view and download clinic-branded, print-ready PDF documents generated client-side using `html2canvas` and `jsPDF`.
- **Backend Files**:
  - Route: `server/src/routes/prescriptionRoutes.js`
  - Controller: `server/src/controllers/prescriptionController.js` (`create`, `getById`, `downloadPdf`)
  - Model: `server/src/models/Prescription.js` (`createWithItems`, `updateWithItems`)
- **Frontend Files**:
  - Document Component: `client/src/app/components/PrescriptionDocument.tsx`
  - PDF Engine: `client/src/app/utils/prescriptionPdf.ts`
  - Modal: `client/src/app/components/ActionModals.tsx` (`CreatePrescriptionModal`, `ViewPrescriptionModal`)

### Feature 9: Billing Invoicing & Simulated Payment Gateway
- **What it does**: Server-authoritative invoicing where service prices come from the database catalog (preventing client price tampering). Supports a finite state machine (`pending` -> `completed` / `failed` -> `refunded`), duplicate settlement defense (idempotency), simulated Card / bKash / Nagad checkout, and PDF receipt downloads.
- **Backend Files**:
  - Route: `server/src/routes/paymentRoutes.js`
  - Controller: `server/src/controllers/paymentController.js` (`create`, `updateStatus`, `downloadReceipt`)
  - Model: `server/src/models/Payment.js`
- **Frontend Files**:
  - Modal: `client/src/app/components/ActionModals.tsx` (`PaymentModal` with simulated checkout flow)
  - API: `client/src/app/api/billing.ts`

### Feature 10: Patient Ratings, Reviews & Moderation
- **What it does**: Patients who have completed an appointment can submit a 1 to 5 star review and comment. Enforces `UNIQUE KEY uk_appointment_review (appointment_id)` to prevent review spam. Platform admins can approve or reject reviews.
- **Backend Files**:
  - Route: `server/src/routes/reviewRoutes.js`
  - Controller: `server/src/controllers/reviewController.js`
  - Model: `server/src/models/Review.js`
- **Frontend Files**:
  - Modal: `client/src/app/components/ActionModals.tsx` (`ReviewModal`)
  - View: `client/src/app/App.tsx` (Doctor review list) & `AdminPanel.tsx` (Moderation)

### Feature 11: Direct Doctor-Patient Messaging & Notifications
- **What it does**: Direct asynchronous communication between verified patients and attending doctors. Enforces relationship-scoped recipient discovery so users cannot message arbitrary stranger accounts. In-app notifications alert users of appointments, prescriptions, and invoices.
- **Backend Files**:
  - Routes: `server/src/routes/messageRoutes.js`, `server/src/routes/notificationRoutes.js`
  - Controllers: `server/src/controllers/messageController.js`, `notificationController.js`
  - Models: `server/src/models/Message.js`, `Notification.js`
- **Frontend Files**:
  - Modal: `client/src/app/components/ActionModals.tsx` (`SendMessageModal`)
  - Views: `client/src/app/App.tsx`, `client/src/modules/patient/PatientPortal.tsx`

### Feature 12: Super-Admin Governance & Platform Telemetry
- **What it does**: Master administrative dashboard restricted to `role === 'admin'`. Provides platform-wide KPIs (Total Clinics, Active Doctors, Total Patients, MRR), clinic activation/suspension toggles, user status management, subscription tier configuration, and audit log search.
- **Backend Files**:
  - Route: `server/src/routes/adminRoutes.js`
  - Controller: `server/src/controllers/adminController.js`
  - Model: `server/src/models/Admin.js`, `AuditLog.js`
- **Frontend Files**:
  - Component: `client/src/modules/admin/AdminPanel.tsx`

---

# SECTION 4: Group Member Workload Distribution & Individual Defense Guides

Provide a balanced 4-member feature ownership matrix based on the team list in the SRS:
- **Member 1: Abdullah Al Noman (Student ID: 23201356)** — Lead / Core Architecture, Security & Authentication
- **Member 2: Partho Probal (Student ID: 24121287)** — Clinic Management, Scheduling & Appointment Engine
- **Member 3: Rifat Abdullah Sarker (Student ID: 23301144)** — Clinical Operations: EMR SOAP Notes, Digital Prescriptions & Reports
- **Member 4: Md. Shafinuzzaman (Student ID: 23201673)** — Financial Billing, Payments, Messaging, Reviews & Super-Admin

For EACH member, document:
1. **Assigned Features & Module Scope**.
2. **Exact Files & Directories Owned** (Backend Controllers, Models, Routes, Validators; Frontend Components and Modals).
3. **Database Tables Owned**.
4. **Key Technical Challenges Solved**.
5. **Personal Viva Elevator Pitch**: A 60-second summary the student can say to the examiner explaining exactly what they built.
6. **Top 5 Tough Technical Questions & Model Answers** specific to their module.

---

# SECTION 5: Deep-Dive Code Snippets & Algorithmic Mechanics

Select the **5 most technically impressive code snippets** in the project and provide a line-by-line explanation of their execution:

1. **Appointment Double-Booking Prevention (`Appointment.createTransactional` in `server/src/models/Appointment.js`)**:
   - Explain `db.transaction()` and the purpose of `FOR UPDATE`.
   - Explain how `start_time < ? AND end_time > ?` detects partial and complete time slot overlaps.
   - Explain how a MySQL row lock prevents concurrent web requests from creating duplicate bookings.

2. **Atomic Multi-Item Prescription Transaction (`Prescription.createWithItems` in `server/src/models/Prescription.js`)**:
   - Explain why two separate tables (`prescriptions` and `prescription_items`) are used instead of a JSON blob or single table.
   - Explain transaction rollbacks: what happens if the 3rd medication item has a database error? (The header and previous items are cleanly rolled back).

3. **Strict Payment State Machine & Concurrency Check (`paymentController.updateStatus` in `server/src/controllers/paymentController.js`)**:
   - Explain the `allowedTransitions` dictionary (`pending` -> `completed`/`failed`, `completed` -> `refunded`, `refunded` -> terminal).
   - Explain idempotency: why paying an already `completed` invoice returns HTTP 400.
   - Explain how optimistic concurrency prevents two simultaneous requests from settling the same invoice.

4. **JWT Authentication, Inactivity Map & Anti-Deactivation Guard (`server/src/middleware/auth.js`)**:
   - Explain `jwt.verify` with strict algorithm and issuer checking.
   - Explain `userActivityMap` (in-memory Map tracking `lastActive` timestamp to enforce the 30-minute inactivity timeout).
   - Explain the database lookup ensuring deactivated users (`is_active = false`) are kicked out immediately even if their JWT has not expired.

5. **Client-Side High-Fidelity Prescription PDF Generation (`client/src/app/utils/prescriptionPdf.ts`)**:
   - Explain why client-side PDF generation via `html2canvas` + `jsPDF` was chosen over server-side libraries (zero server CPU load, identical styling to screen preview).
   - Explain how the off-screen DOM clone is rendered at 2x pixel ratio for print sharpness before being converted into an A4 PDF canvas.

---

# SECTION 6: Viva Defense Masterclass, Trap Questions & High-Scoring Tips

### 6.1 How to Defend a "Vibe Coded" Project Professionally
- Never say *"the AI wrote this and I don't know how it works."*
- Frame AI as an **accelerator**: *"We used modern AI pair-programming tools for rapid prototyping and boilerplate generation, but we authored the system requirements, engineered the relational database schema, established the multi-tenant security architecture, and performed rigorous code audits, bug remediation, and automated testing."*
- Emphasize software engineering fundamentals: MVC architecture, database normalization, relational integrity, REST standards, error handling, and test-driven verification.

### 6.2 The Top 10 University Viva "Trap Questions" and Exact Model Answers
1. *Why did you use MySQL instead of MongoDB when the initial MERN stack was planned?*
   - Model Answer: Healthcare data is inherently relational with strict dependencies (patients belong to clinics, prescriptions belong to appointments and patients). MySQL provides ACID transactions, foreign key cascading integrity, and pessimistic row locking (`FOR UPDATE`) necessary to prevent financial inconsistencies and double-booking, which NoSQL collections cannot guarantee out-of-the-box without complex distributed transactions.
2. *How do you prevent Doctor A from seeing Doctor B's patient data in another clinic? (Tenant Isolation & Anti-IDOR)*
   - Model Answer: Explain the `clinicAccess` middleware in `server/src/middleware/rbac.js`. Every clinic route extracts the `clinicId` and validates against the database whether the authenticated `req.user.id` is the clinic owner or an active staff member in `clinic_staff`. If not, it halts with HTTP 403 Forbidden before the controller ever executes.
3. *Why did you store the OTP as a hash or expiring record in the database instead of in the JWT?*
   - Model Answer: Storing OTPs server-side allows tracking retry counts (preventing brute-force guessing by invalidating after 5 failed attempts) and immediate invalidation upon successful verification.
4. *What happens if the database connection drops while creating a prescription with 5 medicines?*
   - Model Answer: Explain database transaction rollback (`ROLLBACK`). The entire operation is wrapped in `db.transaction()`. If any item fails, MySQL restores the database state, preventing orphaned prescription headers without medication items.
5. *Why is password hashing done with bcrypt instead of MD5 or SHA-256?*
   - Model Answer: MD5 and plain SHA-256 are fast hash functions vulnerable to brute-force and rainbow table attacks. bcrypt is a slow key derivation function with an adjustable work factor (salt rounds = 10) that incorporates cryptographic salting to defeat rainbow tables and resist GPU-accelerated dictionary attacks.
6. *Why is payment processing simulated instead of using real Stripe / SSLCommerz?*
   - Model Answer: We engineered the full financial state machine (`pending`, `completed`, `failed`, `refunded`), deterministic calculation pipeline with server-side catalog pricing, and receipt generation. We encapsulated the payment boundary with simulated transactions to allow complete academic evaluation without requiring commercial merchant credentials.
7. *How does the system handle timezones when booking appointments?*
   - Model Answer: Every clinic has an authoritative `timezone` column (e.g. `Asia/Dhaka`). All appointment validations compare appointment times against the clinic's local clock rather than the server's UTC time.
8. *Why are confidential EMR notes filtered out from the patient portal?*
   - Model Answer: Medical regulations and clinical practice distinguish between patient-facing discharge summaries and sensitive physician working hypotheses or psychiatric notes (`is_confidential = true`).
9. *What is IDOR and how does your project defend against it?*
   - Model Answer: Insecure Direct Object Reference occurs when an attacker manipulates an ID parameter (e.g. `/api/patients/123`) to access unauthorized data. In ClinicOS, patient lookups derive the identity strictly from `req.user.id` in the JWT or verify that the patient record belongs to the active clinic context.
10. *How are race conditions prevented during concurrent appointment bookings?*
    - Model Answer: Explain `SELECT ... FOR UPDATE` within an explicit transaction in `Appointment.js`.

### 6.3 Practical Viva Tips & Strategy
- **Live Demo Protocol**: Keep a doctor, patient, and admin browser window open side-by-side in incognito tabs. Demonstrate the complete loop: Patient books -> Doctor accepts & creates prescription -> Patient views and downloads PDF -> Patient pays simulated invoice -> Super-admin sees revenue telemetry.
- **Code Navigation Mastery**: Memorize the key folders (`server/src/controllers`, `models`, `middleware`, `client/src/modules`). If asked to show a feature, jump directly to the controller and corresponding SQL query.
- **Body Language & Confidence**: Speak clearly, use technical terminology (ACID, Mutex, Idempotency, RBAC, Normalization, Sanitization), and support team members if they get stuck.

---

## Output Quality Standards for Codex
- Format the final document in clean, polished GitHub-flavored Markdown.
- Use explicit markdown tables, code blocks with syntax highlighting, and ASCII/Mermaid flowcharts.
- Ensure the tone is authoritative, clear, academic, and practical.
- Output the full documentation directly into `documentation.md` in the project root.
