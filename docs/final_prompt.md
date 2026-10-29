# Codex Task Prompt: Architectural Migration to Domain-Driven Modular Monolith (Nested MVC)

> **Document Type:** Autonomous Agent Execution Prompt / Architectural Refactoring Blueprint  
> **Target System:** ClinicOS Full-Stack Multi-Tenant Healthcare SaaS  
> **Target Agent:** OpenAI Codex / Claude 3.7 Sonnet / Lead Autonomous AI Coding Agent  
> **Execution Strategy:** Phase-by-Phase, Incremental, Zero-Downtime, Zero-Regression Verification  

---

## 1. Role & Operational Persona

You are acting as a **Principal Software Architect & Lead Modernization Engineer** specializing in Domain-Driven Design (DDD), Modular Monoliths, Express.js enterprise architecture, and React/TypeScript design systems.

Your objective is to refactor the **ClinicOS** codebase from a traditional global technical layered MVC into a **Domain-Driven Modular Monolith** while **strictly preserving the Model-View-Controller (MVC) pattern inside each module**. 

### Critical Non-Negotiables:
1. **Zero Functional Drift:** The behavior, user experience, features, HTTP contracts, query logic, database schema, and public REST APIs (`/api/*`) MUST NOT change.
2. **Zero Route or Import Breakage:** Every single route, parameter (`mergeParams`), header, and response shape must stay 100% backward-compatible.
3. **Continuous Verification:** You must execute automated verification checks at every single step and module boundary. No code may be committed without passing verification gates.
4. **Dead Code Elimination & High Findability:** Once modularization is complete, perform a repository-wide dead code sweep (orphaned files, unused functions, stale mocks), optimize imports, and document all modules so external developers can navigate and contribute with zero prior tribal knowledge.

---

## 2. Project Context & Current Architecture Audit

### 2.1 Technology Stack
- **Backend:** Node.js (v18+), Express.js (v4.21), MySQL 8.0 with `mysql2/promise` (connection pooling and manual transactions), Express-Validator (v7.2), JWT (`jsonwebtoken`), bcryptjs, Helmet, CORS, Morgan, Nodemon.
- **Frontend:** React 18.3, TypeScript, Vite 6.3, Tailwind CSS v4, Radix UI Primitives, Lucide Icons, Recharts, jsPDF + html2canvas.
- **Deployment & Test Infrastructure:**
  - Vercel Serverless Function entry: `api/index.js` -> `server/src/index.js`.
  - Node built-in test runner: `node test/runAllTests.js` and `node --test test/security_remediation.test.js`.
  - Client build pipeline: `npm run build` (`vite build`).

### 2.2 Current Monolithic Defects & Pain Points
1. **Global Layered Backend (`server/src/`):**
   - Flat technical folders: `controllers/` (13 files), `models/` (15 files), `routes/` (15 files), `validators/` (13 files), `serializers/` (2 files), `services/` (1 file).
   - **Tangled Cross-Domain Couplings:** For example, `appointmentController.js` directly requires `Appointment`, `Notification`, `Service`, `Clinic`, `Patient`, and `AuditLog` models. There are no encapsulation boundaries, no domain contracts, and no public interfaces.
2. **Monolithic Frontend (`client/src/app/`):**
   - `App.tsx` has grown to **6,091 lines**, bundling all 14 sidebar sections, the public landing page, authentication views, the entire Patient Portal (1,300+ lines), and the Admin Panel (1,000+ lines) in a single file.
   - `ActionModals.tsx` has grown to **2,200+ lines**, containing 16 disparate modal components ranging from patient booking to invoice payment and EMR creation.
   - Finding where a feature's code lives requires searching across massive files rather than locating a cohesive module folder.

---

## 3. Target Architecture: Modular Monolith with Nested MVC

Each business domain becomes an isolated, self-contained mini-application located in `server/src/modules/<domain>/` (and mirrored in `client/src/modules/<domain>/`).

### 3.1 Backend Directory Architecture (Before vs. After)

```
BEFORE (Global Layered MVC)               AFTER (Modular Monolith with Nested MVC)
server/src/                               server/src/
├── config/                               ├── core/                     # Shared Infrastructure Only
│   ├── database.js                       │   ├── config/               # DB, security, features
│   └── security.js                       │   ├── database/             # Connection pool & tx helpers
├── controllers/                          │   ├── events/               # Domain Event Bus (EventEmitter)
│   ├── appointmentController.js          │   ├── middleware/           # Global auth, rbac, errors
│   ├── authController.js                 │   └── utils/                # Pure cross-cutting utils
│   └── prescriptionController.js         ├── modules/
├── models/                               │   ├── appointments/         # Self-contained Appointment Domain
│   ├── Appointment.js                    │   │   ├── controllers/      # appointmentController.js
│   ├── Clinic.js                         │   │   ├── models/           # Appointment.js (Data Access)
│   └── Prescription.js                   │   │   ├── routes/           # appointmentRoutes.js
├── routes/                               │   │   ├── validators/       # appointmentValidator.js
│   ├── appointmentRoutes.js              │   │   ├── services/         # reminderService, conflictService
│   └── prescriptionRoutes.js             │   │   ├── views/            # DTOs & response serializers
├── validators/                           │   │   ├── index.js          # Public API Contract (Only external entry)
│   ├── appointmentValidator.js           │   │   └── README.md         # Domain documentation
│   └── ...                               │   ├── auth/                 # Identity & Auth Domain
├── services/                             │   ├── billing/              # Invoices & Payments Domain
│   └── appointmentReminderService.js     │   ├── clinics/              # Clinic & Staff Management Domain
├── serializers/                          │   ├── emr/                  # Medical Records & Reports Domain
│   └── public.js                         │   ├── patients/             # Patient Demographics Domain
└── utils/                                │   ├── prescriptions/        # Rx & Prescription PDF Domain
    └── pdf.js                            │   ├── reviews/              # Ratings & Feedback Domain
                                          │   ├── subscriptions/        # SaaS Plans & Limits Domain
                                          │   ├── communications/       # Messages & Notifications Domain
                                          │   └── admin/                # Platform Governance & Audit
                                          ├── index.js                  # Main server entry & module loader
                                          └── shims/                    # Backward-compatibility re-exports
```

### 3.2 Frontend Directory Architecture (Before vs. After)

```
BEFORE (Monolithic App.tsx & ActionModals) AFTER (Domain Feature Modules)
client/src/app/                           client/src/
├── App.tsx (6,091 lines!)                ├── core/ or shared/
├── components/                           │   ├── api/client.ts         # Axios instance & auth interceptor
│   ├── ActionModals.tsx (2,200 lines!)   │   ├── components/ui/        # 48 Radix/shadcn UI primitives
│   ├── PrescriptionDocument.tsx          │   ├── design-system/        # Badge, Btn, Card, SectionLabel
│   └── ui/                               │   ├── types/                # Global shared types (User, Role)
├── api/ (15 flat files)                  │   └── utils/                # Date formatting, storage helpers
└── types/index.ts                        ├── modules/
                                          │   ├── landing/              # Hero, Features, Pricing, Nav, Footer
                                          │   ├── auth/                 # AuthPage, ResetPasswordPage
                                          │   ├── dashboard/            # Shell, Sidebar, TopBar, CommandPalette
                                          │   ├── appointments/         # CalendarView, Book/Reschedule Modals, API
                                          │   ├── patients/             # PatientsView, Detail, AddPatientModal, API
                                          │   ├── emr/                  # EMRView, CreateEMRModal, UploadModal, API
                                          │   ├── prescriptions/        # RxView, Create/View Modals, RxDoc, API
                                          │   ├── billing/              # BillingView, Invoice/Pay Modals, API
                                          │   ├── clinics/              # ClinicMgmtView, ServicesView, PackagesView
                                          │   ├── reviews/              # DoctorReviewsView, SubmitReviewModal, API
                                          │   ├── analytics/            # AnalyticsView charts & metrics
                                          │   ├── notifications/        # NotificationsView
                                          │   ├── settings/             # SettingsView
                                          │   ├── patient-portal/       # Patient-facing modular tabs
                                          │   └── admin/                # AdminPanel modular tabs
                                          └── App.tsx                   # Lean root orchestrator (< 150 lines)
```

---

## 4. The 5 Core Architectural Laws (Strictly Enforced)

When generating code or moving components, you MUST enforce these rules without exception:

### Law 1: Bounded Contexts & Strict Module Encapsulation
- No file inside `modules/ModuleA` may directly import or require internal files from `modules/ModuleB/models/`, `modules/ModuleB/controllers/`, or `modules/ModuleB/services/`.
- **Forbidden:**
  ```javascript
  // Inside server/src/modules/appointments/controllers/appointmentController.js
  const Patient = require('../../patients/models/Patient'); // VIOLATION!
  ```
- **Allowed:**
  ```javascript
  // Inside server/src/modules/appointments/controllers/appointmentController.js
  const { patientsApi } = require('../../patients'); // ALLOWED: Access via public contract
  ```

### Law 2: Decoupled Inter-Module Communication
Modules must communicate through two explicit mechanisms:
1. **Synchronous Queries / Commands:** Through each module's `index.js` (the Public API Contract). The contract exposes only explicitly exported service methods or DTO queries.
2. **Asynchronous Side Effects & Notifications:** Through an in-memory **Domain Event Bus** (`core/events/eventBus.js`). For example, when an appointment is booked:
   - `appointments` module emits `eventBus.emit('appointment.created', { appointment, clinic, patientId })`.
   - `communications` module subscribes to `appointment.created` to queue email/SMS notifications.
   - `admin` module subscribes to `appointment.created` to write an audit log entry.
   - The appointments controller is completely decoupled from email and audit implementation details.

### Law 3: Database & Table Ownership
Each module conceptually owns its schema tables:
- `auth`: `users`, `doctor_profiles`
- `clinics`: `clinics`, `clinic_staff`, `clinic_schedules`, `clinic_services`, `consultation_packages`
- `patients`: `patients`, `patient_profiles`
- `appointments`: `appointments`
- `emr`: `medical_records`, `medical_reports`
- `prescriptions`: `prescriptions`, `prescription_items`
- `billing`: `payments`
- `reviews`: `reviews`
- `subscriptions`: `subscription_plans`, `clinic_subscriptions`
- `communications`: `notifications`, `messages`
- `admin`: `audit_logs`

*Note on relational joins:* Where database joins are required for high-performance read views (e.g. joining `appointments` with `patients` and `users`), these must be contained in the owning module's Model as dedicated read-queries, without exposing write mutations across tables.

### Law 4: Zero Route Breakage & Backward-Compatibility Facade Shims
Existing integration tests (e.g. `server/test/security_remediation.test.js`), external scripts, or legacy imports may expect paths like `server/src/controllers/prescriptionController.js` or `server/src/models/Prescription.js`.
- You MUST maintain lightweight **Facade Shims** at legacy paths that re-export from the new module location:
  ```javascript
  // server/src/controllers/prescriptionController.js
  module.exports = require('../modules/prescriptions/controllers/prescriptionController');
  ```
  ```javascript
  // server/src/models/Prescription.js
  module.exports = require('../modules/prescriptions/models/Prescription');
  ```
- This guarantees 100% backward compatibility for all existing tests and external runners.

### Law 5: Continuous Zero-Regression Verification
Never proceed to the next module until the following commands pass cleanly:
```bash
# 1. Run all unit and security regression tests
npm test

# 2. Verify JavaScript syntax of all migrated files
node -c server/src/modules/<module-name>/**/*.js

# 3. Verify client production build transforms cleanly
npm run build
```

---

## 5. Domain Inventory & Responsibilities

| Module Name | Tables Owned | Controllers | Models | Validators | Routes & Endpoints |
|---|---|---|---|---|---|
| **`auth`** | `users`, `doctor_profiles` | `authController.js` | `User.js`, `DoctorProfile.js` | `authValidator.js` | `/api/auth/*` |
| **`clinics`** | `clinics`, `clinic_staff`, `clinic_schedules`, `clinic_services`, `consultation_packages` | `clinicController.js`, `doctorController.js` | `Clinic.js`, `Service.js`, `Package.js` | `clinicValidator.js`, `doctorValidator.js` | `/api/clinics/*`, `/api/doctors/*` |
| **`patients`** | `patients`, `patient_profiles` | `patientController.js` | `Patient.js` | `commonValidator.js` (patient schemas) | `/api/clinics/:clinicId/patients/*` |
| **`appointments`** | `appointments` | `appointmentController.js` | `Appointment.js` | `appointmentValidator.js` | `/api/clinics/:clinicId/appointments/*` |
| **`emr`** | `medical_records`, `medical_reports` | `medicalRecordController.js`, `medicalReportController.js` | `MedicalRecord.js`, `MedicalReport.js` | `medicalRecordValidator.js`, `medicalReportValidator.js` | `/api/clinics/:clinicId/medical-records/*`, `/api/clinics/:clinicId/medical-reports/*` |
| **`prescriptions`** | `prescriptions`, `prescription_items` | `prescriptionController.js` | `Prescription.js` | `prescriptionValidator.js` | `/api/clinics/:clinicId/prescriptions/*` |
| **`billing`** | `payments` | `paymentController.js` | `Payment.js` | `paymentValidator.js` | `/api/clinics/:clinicId/payments/*` |
| **`reviews`** | `reviews` | `reviewController.js` | `Review.js` | `reviewValidator.js` | `/api/clinics/:clinicId/reviews/*` |
| **`subscriptions`**| `subscription_plans`, `clinic_subscriptions` | `subscriptionController.js` | `Subscription.js` | Feature limit rules | `/api/clinics/:clinicId/subscriptions/*`, `/api/subscriptions/*` |
| **`communications`**| `notifications`, `messages` | `messageController.js`, `notificationController.js` | `Notification.js`, `Message.js` | Message validators | `/api/messages/*`, `/api/notifications/*` |
| **`admin`** | `audit_logs` | `adminController.js` | `AuditLog.js` | Admin role validator | `/api/admin/*`, `/api/internal/*` |

---

## 6. Step-by-Step Implementation Blueprint

Follow this phased plan in order. Execute verification after every phase.

### Phase 0: Baseline Verification & Safety Harness
1. Run `npm test` from the workspace root. Confirm that all 16 security and workflow tests pass.
2. Run `npm run build` in `client/`. Confirm that Vite transforms all modules and builds to `client/dist/`.
3. Verify that `api/index.js` correctly exposes the Express app for Vercel serverless.

### Phase 1: Core Foundation & Infrastructure Setup
1. Create `server/src/core/`:
   - `server/src/core/database/database.js` (moved/re-exported from `config/database.js`).
   - `server/src/core/events/eventBus.js` (singleton EventEmitter for domain events).
   - `server/src/core/middleware/` (`auth.js`, `rbac.js`, `errorHandler.js`, `subscription.js`).
   - `server/src/core/utils/` (`dateTime.js`, `helpers.js`, `audit.js`, `email.js`).
2. Keep shims in `server/src/config/`, `server/src/middleware/`, and `server/src/utils/` pointing to `core/` to prevent breaking existing test imports.
3. Verify: Run `npm test`.

### Phase 2: Pilot Module Migration (`prescriptions`)
*Choose `prescriptions` as the pilot module because it has high domain cohesion and tests in `security_remediation.test.js`.*
1. Create `server/src/modules/prescriptions/`:
   - `controllers/prescriptionController.js`
   - `models/Prescription.js`
   - `routes/prescriptionRoutes.js`
   - `validators/prescriptionValidator.js`
   - `views/pdfRenderer.js` (PDF creation logic from `utils/pdf.js`)
   - `index.js` (Public API Contract exporting `createPrescription`, `getPrescriptionById`, etc.)
   - `README.md` (Module documentation)
2. Create legacy shims:
   - `server/src/controllers/prescriptionController.js` -> re-exports from module.
   - `server/src/models/Prescription.js` -> re-exports from module.
   - `server/src/routes/prescriptionRoutes.js` -> re-exports from module.
3. Verify: Run `npm test`. Confirm tests 12 and 16 pass without regressions.

### Phase 3: Foundation Domains (`auth`, `clinics`, `patients`)
1. **Migrate `auth` Module:**
   - Move `User.js`, `DoctorProfile.js` to `server/src/modules/auth/models/`.
   - Move `authController.js`, `authRoutes.js`, `authValidator.js` into module.
   - Create `server/src/modules/auth/index.js` exposing `authService`, `getUserById`, `verifyDoctorMembership`.
2. **Migrate `clinics` Module:**
   - Move `Clinic.js`, `Service.js`, `Package.js` to `server/src/modules/clinics/models/`.
   - Move `clinicController.js`, `doctorController.js`, `clinicRoutes.js`, `doctorRoutes.js`, `clinicValidator.js`, `doctorValidator.js`.
   - Create `server/src/modules/clinics/index.js` exposing `clinicsApi`, `getClinicById`, `verifyStaffAccess`.
3. **Migrate `patients` Module:**
   - Move `Patient.js` to `server/src/modules/patients/models/`.
   - Move `patientController.js`, `patientRoutes.js` into module.
   - Create `server/src/modules/patients/index.js` exposing `getPatientById`, `findPatientByUserId`.
4. Add legacy facade shims for all moved controllers, models, and routes.
5. Verify: Run `npm test`.

### Phase 4: Core Healthcare & Financial Domains (`appointments`, `emr`, `billing`, `reviews`, `subscriptions`, `communications`, `admin`)
1. **Migrate `appointments` Module:**
   - Move `Appointment.js`, `appointmentController.js`, `appointmentRoutes.js`, `appointmentValidator.js`, and `appointmentReminderService.js`.
   - Decouple cross-module imports: replace direct `Patient` or `Clinic` calls with `patientsModule.getPatientById(...)` and `clinicsModule.getClinicById(...)`.
   - Use `eventBus.emit('appointment.booked', payload)` instead of directly calling `sendAppointmentBookingNotification`.
2. **Migrate `emr` Module:**
   - Move `MedicalRecord.js`, `MedicalReport.js`, controllers, routes, and validators.
3. **Migrate `billing` Module:**
   - Move `Payment.js`, `paymentController.js`, `paymentRoutes.js`, `paymentValidator.js`.
4. **Migrate `reviews` Module:**
   - Move `Review.js`, `reviewController.js`, `reviewRoutes.js`, `reviewValidator.js`.
5. **Migrate `subscriptions` Module:**
   - Move `Subscription.js`, `subscriptionController.js`, `subscriptionRoutes.js`.
6. **Migrate `communications` Module:**
   - Move `Notification.js`, `messageController.js`, `messageRoutes.js`, `notificationRoutes.js`.
   - Register event listeners on `eventBus` for `appointment.*`, `payment.*`, `prescription.*`.
7. **Migrate `admin` Module:**
   - Move `AuditLog.js`, `adminController.js`, `adminRoutes.js`, `internalRoutes.js`.
8. Add legacy shims for all moved models/controllers.
9. Verify: Run `npm test`. All 16 tests MUST pass.

### Phase 5: Clean Modular Router Aggregation
1. Create `server/src/modules/index.js` to serve as the master module registry and router aggregator:
   ```javascript
   const express = require('express');
   const router = express.Router();
   
   // Mount each domain module cleanly
   router.use('/auth', require('./auth/routes/authRoutes'));
   router.use('/clinics', require('./clinics/routes/clinicRoutes'));
   router.use('/clinics/:clinicId/patients', require('./patients/routes/patientRoutes'));
   router.use('/clinics/:clinicId/appointments', require('./appointments/routes/appointmentRoutes'));
   router.use('/clinics/:clinicId/medical-records', require('./emr/routes/medicalRecordRoutes'));
   router.use('/clinics/:clinicId/medical-reports', require('./emr/routes/medicalReportRoutes'));
   router.use('/clinics/:clinicId/prescriptions', require('./prescriptions/routes/prescriptionRoutes'));
   router.use('/clinics/:clinicId/payments', require('./billing/routes/paymentRoutes'));
   router.use('/clinics/:clinicId/reviews', require('./reviews/routes/reviewRoutes'));
   router.use('/clinics/:clinicId/subscriptions', require('./subscriptions/routes/subscriptionRoutes'));
   router.use('/subscriptions', require('./subscriptions/routes/subscriptionRoutes'));
   router.use('/admin', require('./admin/routes/adminRoutes'));
   router.use('/messages', require('./communications/routes/messageRoutes'));
   router.use('/notifications', require('./communications/routes/notificationRoutes'));
   router.use('/doctors', require('./clinics/routes/doctorRoutes'));
   router.use('/internal', require('./admin/routes/internalRoutes'));
   
   module.exports = router;
   ```
2. Update `server/src/index.js` to mount the modular router:
   ```javascript
   app.use('/api', require('./modules'));
   ```
3. Verify: Run `npm test` and test health endpoint `GET /api/health`.

### Phase 6: Frontend Modular Monolith Refactoring
Transform `client/src/app/App.tsx` (6,091 lines) and `client/src/app/components/ActionModals.tsx` (2,200 lines) into cohesive feature modules:
1. **Create Shared Core (`client/src/shared/` or `client/src/core/`):**
   - Move Design Tokens & UI Primitives: `Badge`, `Btn`, `Card`, `SectionLabel`, `Toggle` into `client/src/shared/design-system/`.
   - Centralize API client and auth token storage in `client/src/shared/api/client.ts`.
   - Move `PrescriptionDocument.tsx` and `prescriptionPdf.ts` into `client/src/modules/prescriptions/`.
2. **Decompose `ActionModals.tsx` into Owning Feature Modules:**
   - `BookAppointmentModal`, `RescheduleModal`, `CancelAppointmentModal` -> `client/src/modules/appointments/components/`.
   - `AddPatientModal` -> `client/src/modules/patients/components/`.
   - `CreateEMRModal`, `ViewMedicalRecordModal`, `UploadMedicalReportModal` -> `client/src/modules/emr/components/`.
   - `CreatePrescriptionModal`, `ViewPrescriptionModal` -> `client/src/modules/prescriptions/components/`.
   - `CreateInvoiceModal`, `PayInvoiceModal` -> `client/src/modules/billing/components/`.
   - `CreateServiceModal`, `EditServiceModal`, `CreatePackageModal`, `AddStaffModal` -> `client/src/modules/clinics/components/`.
   - `SubmitReviewModal` -> `client/src/modules/reviews/components/`.
   - `SendMessageModal` -> `client/src/modules/communications/components/`.
3. **Decompose Views from `App.tsx` into Feature Modules:**
   - `LandingPage`, `Hero`, `Features`, `Pricing`, etc. -> `client/src/modules/landing/`.
   - `AuthPage`, `ResetPasswordPage` -> `client/src/modules/auth/`.
   - `Sidebar`, `TopBar`, `CommandPalette`, `DashboardLayout` -> `client/src/modules/dashboard/`.
   - `AppointmentsView` -> `client/src/modules/appointments/`.
   - `PatientsView`, `PatientDetail` -> `client/src/modules/patients/`.
   - `EMRView` -> `client/src/modules/emr/`.
   - `PrescriptionsView` -> `client/src/modules/prescriptions/`.
   - `BillingView` -> `client/src/modules/billing/`.
   - `ClinicMgmtView`, `ServicesView`, `PackagesView` -> `client/src/modules/clinics/`.
   - `DoctorReviewsView` -> `client/src/modules/reviews/`.
   - `AnalyticsView` -> `client/src/modules/analytics/`.
   - `NotificationsView` -> `client/src/modules/notifications/`.
   - `SettingsView` -> `client/src/modules/settings/`.
   - `PatientPortal` -> `client/src/modules/patient-portal/`.
   - `AdminPanel` -> `client/src/modules/admin/`.
4. **Refactor Root `client/src/app/App.tsx`:**
   - Reduces from 6,091 lines to **under 150 lines**, acting strictly as a high-level state orchestrator and router between `LandingPage`, `AuthPage`, `DashboardLayout`, `PatientPortal`, and `AdminPanel`.
5. Verify: Run `npm run build` in `client/`. Ensure zero build errors or TypeScript issues.

### Phase 7: Dead Code Elimination, Codebase Polish & Future-Proofing
1. **Dead Code Sweep:**
   - Scan for unused variables, commented-out dead code blocks, orphaned CSS classes, and unimported components.
   - Delete abandoned scratch files or unused duplicate helper methods.
   - Verify no orphaned exports remain.
2. **Codebase Readability & Self-Documentation:**
   - Add JSDoc/TSDoc comments above all exported public contract functions, describing:
     - `@description`: What the function accomplishes.
     - `@param`: Expected inputs and types.
     - `@returns`: Output structure and error conditions.
   - Create a concise `README.md` inside every `server/src/modules/<module-name>/` explaining:
     - Bounded context responsibility.
     - Owned database tables.
     - Public API methods exposed in `index.js`.
     - Events published and listened to.
3. **External Developer Onboarding Quality Check:**
   - A new developer joining the company should be able to open any module folder (e.g. `modules/billing`) and find everything related to billing (models, routes, controllers, validators, UI components, types) without searching globally.

---

## 7. Concrete Code Templates & Patterns

### 7.1 In-Memory Domain Event Bus (`server/src/core/events/eventBus.js`)
```javascript
const EventEmitter = require('events');

class DomainEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50); // Scale for multiple domain subscribers
  }

  publish(eventName, payload) {
    try {
      this.emit(eventName, {
        ...payload,
        occurredAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[EventBus] Error publishing ${eventName}:`, err);
    }
  }
}

const eventBus = new DomainEventBus();
module.exports = eventBus;
```

### 7.2 Module Public API Contract Example (`server/src/modules/patients/index.js`)
```javascript
/**
 * Patients Module - Public Interface Contract
 * External modules must interact with patient data exclusively through this contract.
 */
const Patient = require('./models/Patient');

const patientsPublicApi = {
  /**
   * Fetch a patient record by ID
   * @param {string} id - UUID of patient
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    return Patient.findById(id);
  },

  /**
   * Find patient by clinic and associated user ID
   * @param {string} clinicId
   * @param {string} userId
   * @returns {Promise<Object|null>}
   */
  async findByClinicAndUser(clinicId, userId) {
    return Patient.findByClinicAndUser(clinicId, userId);
  },

  /**
   * Verify whether a patient belongs to a specific clinic
   * @param {string} patientId
   * @param {string} clinicId
   * @returns {Promise<boolean>}
   */
  async verifyPatientClinicAffiliation(patientId, clinicId) {
    const patient = await Patient.findById(patientId);
    return Boolean(patient && String(patient.clinic_id) === String(clinicId));
  },
};

module.exports = patientsPublicApi;
```

### 7.3 Inter-Module Decoupling Example (`server/src/modules/appointments/controllers/appointmentController.js`)
```javascript
// BEFORE (Tightly coupled):
// const Patient = require('../../models/Patient');
// const Notification = require('../../models/Notification');
// const { sendAppointmentBookingNotification } = require('../../utils/email');

// AFTER (Modular Monolith):
const Appointment = require('../models/Appointment');
const patientsModule = require('../../patients');
const clinicsModule = require('../../clinics');
const eventBus = require('../../../core/events/eventBus');

// In create appointment handler:
const patient = await patientsModule.getById(patient_id);
if (!patient) {
  return res.status(404).json({ message: 'Patient not found' });
}

// Persist appointment...
const newAppointment = await Appointment.createTransactional({ ... });

// Publish domain event asynchronously (decoupled from email/notification dispatch)
eventBus.publish('appointment.booked', {
  appointment: newAppointment,
  patient,
  clinicId: clinic_id,
  doctorId: doctor_id,
});

return res.status(201).json({ data: newAppointment });
```

### 7.4 Backward-Compatibility Facade Shim Example (`server/src/models/Prescription.js`)
```javascript
/**
 * Backward-Compatibility Facade Shim
 * Preserves require paths for legacy test suites and external tooling.
 */
module.exports = require('../modules/prescriptions/models/Prescription');
```

---

## 8. Final Verification & Quality Acceptance Checklist

Before considering the task complete, Codex must verify all items:

- [ ] **Automated Tests:** `npm test` runs all 16 security and workflow suites with 0 failures.
- [ ] **Client Build:** `npm run build` compiles clean production bundles with 0 TypeScript/Vite errors.
- [ ] **HTTP Route Compatibility:** Every API endpoint in `server/src/index.js` remains accessible at identical URLs.
- [ ] **Vercel Serverless Function:** `api/index.js` cleanly imports and mounts `server/src/index.js`.
- [ ] **Directory Discoverability:** Every business domain has a dedicated folder under `server/src/modules/` containing its nested MVC components and `README.md`.
- [ ] **Frontend Decoupling:** `client/src/app/App.tsx` is under 200 lines; all views and modals live in their respective feature module folders.
- [ ] **No Dead Code:** Unused imports, orphaned files, duplicate helper functions, and dead commented blocks are deleted.
- [ ] **Documentation:** Every module has clear JSDoc / TSDoc annotations on public interfaces and a clear `README.md` for external developers.
