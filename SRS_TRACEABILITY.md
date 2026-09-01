# ClinicOS — Software Requirements Specification (SRS) Traceability Matrix

This document maps functional and non-functional requirements to their implementing source files, database tables, API routes, and automated test suites.

---

## 1. Authentication & User Management (FR-1 to FR-7)

| Req ID | Requirement Description | Implementation Files | API Endpoints | Automated Test Reference | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **FR-1** | User Registration & Role Selection | `authController.js`, `User.js` | `POST /api/auth/register` | `sprint1_security_suite.js: #1-3` | **PASS** |
| **FR-2** | OTP Verification & Expiration | `authController.js`, `User.js` | `POST /api/auth/verify-otp` | `sprint1_security_suite.js: #4` | **PASS** |
| **FR-3** | JWT Authentication & Login | `authController.js`, `auth.js` | `POST /api/auth/login` | `sprint1_security_suite.js: #6-7` | **PASS** |
| **FR-4** | Brute Force Attempt Locking | `authController.js` | `POST /api/auth/verify-otp` | `sprint1_security_suite.js: #5` | **PASS** |
| **FR-5** | Password Reset via Secure OTP | `authController.js` | `POST /api/auth/forgot-password` | `sprint1_security_suite.js: #8` | **PASS** |
| **FR-6** | User Profile Update | `authController.js` | `PUT /api/auth/profile` | `sprint2_workflow_suite.js: #1` | **PASS** |
| **FR-7** | Role-Based Access Control (RBAC) | `middleware/auth.js` | All protected routes | `sprint1_security_suite.js: #9-11` | **PASS** |

---

## 2. Clinic Management & Multi-Tenancy (FR-8 to FR-14)

| Req ID | Requirement Description | Implementation Files | API Endpoints | Automated Test Reference | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **FR-8** | Clinic Provisioning & Ownership | `clinicController.js`, `Clinic.js` | `POST /api/clinics` | `sprint1_security_suite.js: #12` | **PASS** |
| **FR-9** | Multi-Tenant Data Isolation | `middleware/clinicAccess.js` | `/api/clinics/:clinicId/*` | `sprint1_security_suite.js: #14-16` | **PASS** |
| **FR-10** | Clinic Profile Configuration | `clinicController.js` | `PUT /api/clinics/:clinicId` | `sprint2_workflow_suite.js: #2` | **PASS** |
| **FR-11** | Service Catalog Management | `clinicController.js`, `Service.js` | `POST /api/clinics/:clinicId/services` | `sprint2_workflow_suite.js: #3` | **PASS** |
| **FR-12** | Bundled Service Packages | `clinicController.js`, `Package.js` | `POST /api/clinics/:clinicId/packages` | `sprint2_workflow_suite.js: #4` | **PASS** |
| **FR-13** | Staff/Assistant Provisioning | `clinicController.js`, `Clinic.js` | `POST /api/clinics/:clinicId/staff` | `sprint2_workflow_suite.js: #5` | **PASS** |
| **FR-14** | Assistant Permission Boundary | `middleware/auth.js` | `/api/clinics/:clinicId/emr` | `sprint4_e2e_regression_suite.js: #3` | **PASS** |

---

## 3. Patient CRM & Appointments (FR-15 to FR-21)

| Req ID | Requirement Description | Implementation Files | API Endpoints | Automated Test Reference | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **FR-15** | Walk-in Patient Registration | `patientController.js`, `Patient.js` | `POST /api/clinics/:clinicId/patients` | `sprint2_workflow_suite.js: #6-8` | **PASS** |
| **FR-16** | Doctor/Clinic Directory Discovery | `doctorController.js`, `Doctor.js` | `GET /api/doctors/search` | `sprint2_workflow_suite.js: #9-11` | **PASS** |
| **FR-17** | Conflict-Free Slot Booking | `appointmentController.js` | `POST /api/clinics/:clinicId/appointments` | `final_forensic_suite.js: #1-4` | **PASS** |
| **FR-18** | Appointment Double-Booking Guard | `appointmentController.js` | `POST /api/clinics/:clinicId/appointments` | `final_forensic_suite.js: #3` | **PASS** |
| **FR-19** | Appointment State Machine | `appointmentController.js` | `PUT .../appointments/:id/status` | `sprint2_workflow_suite.js: #12-14` | **PASS** |
| **FR-20** | Patient Cancellation Rules | `appointmentController.js` | `PUT .../appointments/:id/cancel` | `sprint2_workflow_suite.js: #15` | **PASS** |
| **FR-21** | Patient Portal Consultation History | `appointmentController.js` | `GET .../appointments/my` | `sprint2_workflow_suite.js: #16` | **PASS** |

---

## 4. EMR, Prescriptions & Reviews (FR-22 to FR-28)

| Req ID | Requirement Description | Implementation Files | API Endpoints | Automated Test Reference | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **FR-22** | Structured SOAP EMR Creation | `medicalRecordController.js` | `POST .../medical-records` | `sprint2_workflow_suite.js: #17-19` | **PASS** |
| **FR-23** | Doctor-Only EMR Authorization | `middleware/auth.js` | `POST .../medical-records` | `sprint2_workflow_suite.js: #20` | **PASS** |
| **FR-24** | Multi-Item Digital Prescriptions | `prescriptionController.js` | `POST .../prescriptions` | `sprint2_workflow_suite.js: #21-23` | **PASS** |
| **FR-25** | Anti-IDOR EMR Access Control | `medicalRecordController.js` | `GET .../medical-records/:id` | `sprint4_e2e_regression_suite.js: #5a` | **PASS** |
| **FR-26** | Verified Appointment Review Gate | `reviewController.js`, `Review.js` | `POST .../reviews` | `sprint2_workflow_suite.js: #26-28` | **PASS** |
| **FR-27** | Duplicate Review Prevention | `reviewController.js` | `POST .../reviews` | `sprint2_workflow_suite.js: #29` | **PASS** |
| **FR-28** | Admin Review Moderation Queue | `adminController.js` | `PUT /api/admin/reviews/:id/approve` | `sprint3_financial_admin_suite.js: #26-27` | **PASS** |

---

## 5. Billing, Subscriptions & Admin (FR-29 to FR-36)

| Req ID | Requirement Description | Implementation Files | API Endpoints | Automated Test Reference | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **FR-29** | Server-Authoritative Invoice Math | `paymentController.js`, `Payment.js` | `POST .../payments` | `sprint3_financial_admin_suite.js: #1-4` | **PASS** |
| **FR-30** | Duplicate Invoice Prevention | `paymentController.js` | `POST .../payments` | `sprint3_financial_admin_suite.js: #5` | **PASS** |
| **FR-31** | Simulated Payment Gateway Sandbox | `paymentController.js` | `PUT .../payments/:id/status` | `sprint3_financial_admin_suite.js: #6-9` | **PASS** |
| **FR-32** | Pure MySQL Analytics Engine | `clinicController.js` | `GET .../analytics` | `sprint3_financial_admin_suite.js: #14-16` | **PASS** |
| **FR-33** | Subscription Tier Limits (Staff/Doctor)| `models/Subscription.js` | `POST .../staff` | `sprint3_financial_admin_suite.js: #10-13` | **PASS** |
| **FR-34** | Platform Admin User Lifecycle | `adminController.js` | `PUT /api/admin/users/:id/status` | `sprint3_financial_admin_suite.js: #17-21` | **PASS** |
| **FR-35** | Admin Self-Deactivation Guard | `adminController.js` | `PUT /api/admin/users/:id/status` | `sprint3_financial_admin_suite.js: #19` | **PASS** |
| **FR-36** | System Audit Log Telemetry | `models/AuditLog.js` | `GET /api/admin/audit-logs` | `sprint3_financial_admin_suite.js: #30-32` | **PASS** |
