# ClinicOS Principal Engineering Remediation Report

Date: 2026-09-04

## 1. Executive summary

This follow-up pass inspected and repaired the existing React/Vite, Express, and MySQL implementation without replacing its architecture. The listed multi-clinic, patient creation, date validation, appointment/calendar, patient booking, messaging, patient-profile, admin-authentication, and prescription/PDF defects are fixed in source across UI, API, authorization, validation, business logic, and persistence.

The production client build passes. All 16 focused automated security and behavior tests pass. Database integration and manual browser workflows were not run because the repository does not provide a dedicated migrated test database; the test runner intentionally refuses to use an ambiguously named database. The migration must be applied and the integration suites must pass against isolated infrastructure before production release.

## 2. Root-cause analysis and remediation

| Original defect | Root cause | Complete fix | Principal files | Regression evidence |
|---|---|---|---|---|
| Doctor could not manage all associated clinics | Clinic lookup only treated ownership as association; active staff memberships were omitted | Accessible clinic query now combines ownership and active clinic_staff membership, selector lists every association, active selection is user-scoped and persisted, invalid/stale selection falls back safely, and clinic-specific views remount/refetch | server/src/models/Clinic.js; server/src/controllers/clinicController.js; client/src/app/App.tsx | Tenant middleware test covers owned, staff, unauthorized, and inactive clinics |
| “Valid Clinic ID is required” while adding patients | A static onboarding screen claimed clinic creation without persisting one, and patient actions could open without an active clinic | Removed the unreachable fake onboarding workflow, always load real clinics after login, disable clinic-dependent actions when none is selected, surface clinic-load errors, and create patients only through a verified active clinic context | client/src/app/App.tsx; client/src/app/components/ActionModals.tsx; server/src/routes/patientRoutes.js; server/src/controllers/patientController.js | Build plus clinic-context tests |
| Future DOB accepted | Date validators checked shape rather than calendar validity/future boundaries; UI had no maximum | Shared strict date-only validation rejects impossible and future dates; doctor and patient forms enforce the local current-date maximum and show errors | server/src/utils/dateTime.js; server/src/validators/commonValidator.js; server/src/validators/authValidator.js; client/src/app/App.tsx; client/src/app/components/ActionModals.tsx | Leap-day, impossible-date, and future-date unit cases |
| Past/same-day elapsed appointment accepted | Date-only checks and server-local time comparisons ignored the clinic timezone | Clinics persist an IANA timezone; booking, availability, cancellation, and rescheduling compare date/time against the clinic-local clock; elapsed slots are excluded | server/src/utils/dateTime.js; server/src/utils/appointments.js; server/src/controllers/appointmentController.js; server/src/models/Clinic.js; server/src/validators/clinicValidator.js | Past date, exact-current-time, future-minute, and timezone-boundary tests |
| Calendar UI was inconsistent | Appointment management was only a filter list and had no authoritative date navigation | Added a responsive seven-day calendar strip with previous/next week, Today, all-dates, selected-day state, API date filtering, and booking handoff | client/src/app/App.tsx; server/src/validators/appointmentValidator.js | Production build and server query validation |
| Patient booking lacked reliable doctor/slot selection | Patient flow tried to enumerate the protected patient registry, hid the doctor choice, and allowed non-authoritative time input | Patient booking is self-booking, staff booking has an explicit patient selector, all flows use an explicit doctor selector, and time choices come only from the live availability API | client/src/app/components/ActionModals.tsx; server/src/controllers/appointmentController.js; server/src/controllers/clinicController.js | Build plus appointment clock tests |
| Message sender/recipient was ambiguous or invalid | UI used an invalid literal fallback and read doctor identifiers not returned by the profile API | From identity is the authenticated account and cannot be changed; backend rejects sender manipulation; a new relationship-scoped recipients API populates the To selector | server/src/controllers/messageController.js; server/src/routes/messageRoutes.js; client/src/app/api/messages.ts; client/src/app/components/ActionModals.tsx | Sender-impersonation unit test |
| Patient profile fields did not reliably persist | Clinic patient rows require a clinic, so profile-only patient accounts had nowhere to store DOB, gender, address, blood group, allergies, conditions, or emergency contact | Added account-level patient_profiles persistence, merged reads before and after clinic enrollment, and synchronized existing clinic patient rows | server/db/schema.sql; server/src/controllers/authController.js; server/src/controllers/appointmentController.js; client/src/app/App.tsx | Schema/source verification and build; DB execution pending isolated database |
| Admin showed “Invalid token” or empty/fake screens | Landing demo navigation opened protected UI without authentication; rejected API calls were swallowed | Removed unauthenticated admin/demo entry paths, enforce exact admin role dispatch, retain central token handling, connect views to real admin APIs, and distinguish loading, empty, error, and pagination states | client/src/app/App.tsx; client/src/app/api/client.ts; server/src/routes/adminRoutes.js | Auth/security suite and production build |
| Prescription workflow was incomplete | Creation was not atomic, appointment relation was not validated, UI did not edit, and document expectations were mixed with storage | Prescription header/items create and edit are transactional; appointment, patient, clinic, doctor, and author relationships are verified; patients can view/download; PDFs are generated on demand from database data and streamed without object storage | server/src/models/Prescription.js; server/src/controllers/prescriptionController.js; server/src/routes/prescriptionRoutes.js; server/src/utils/pdf.js; client/src/app/components/ActionModals.tsx; client/src/app/App.tsx | PDF structure/content test and production build |

## 3. Multi-clinic architecture

The authenticated user’s accessible clinics are loaded once at the app root and are the authoritative choices for the ClinicOS selector. The selected ID is stored under a per-user key. Only a currently returned active clinic can be restored or selected. Logout and session expiry clear clinic state. Dashboard content is keyed by clinic ID, so switching clinics discards clinic-local component state and each feature refetches.

Every protected clinic API still passes through clinicAccess. It loads the target clinic, rejects malformed, missing, nonexistent, or inactive IDs, then verifies owner, active staff membership, or the narrowly allowed patient operation. A manually supplied Clinic C ID therefore cannot bypass authorization.

## 4. Admin panel repair

The invalid-token symptom came from UI shortcuts that entered AdminPanel without a session. Those shortcuts were removed, the login tabs now require role-consistent accounts, and root routing only mounts the admin panel for an authenticated admin. Overview, clinics, users, subscriptions, reviews, and audit logs use the real server APIs. Failed requests clear stale data and display an actionable error; loading and empty states are distinct; clinic and user tables paginate from returned totals.

## 5. Prescription and PDF architecture

prescriptions stores clinic, patient, prescribing doctor, optional appointment, diagnosis, notes, and timestamps. prescription_items stores the medication rows. Creation and editing run in database transactions, so a partial medication list cannot be committed. Editing is restricted to the original prescribing doctor; patient and appointment relationships are immutable/validated.

The authorized PDF endpoint loads the current prescription, patient, clinic, doctor, and item data from MySQL, constructs the PDF in memory, and streams application/pdf with a download disposition. No generated file is written to repository, server disk, or external storage. Payment receipts use the same database-to-live-PDF pattern.

## 6. Additional defects discovered

- Removed the fake, non-persisting onboarding wizard and static notification badges from the reachable product.
- Removed fabricated chart fallback data and a fabricated clinic-name fallback.
- Corrected public clinic serialization to include the non-sensitive timezone needed by clinic settings.
- Bound a prescription created from an appointment to that appointment.
- Prevented doctors from modifying another doctor’s prescription items.
- Removed diagnosis and secure-message body previews from notifications to reduce PHI exposure.
- Removed patient names from patient-creation audit details.
- Replaced fixed city choices with a real free-text location filter.
- Added explicit clinic-load, patient-portal, discovery, dashboard, appointment, prescription, and admin error states.

## 7. UX/UI improvements

- Consistent selector, cards, buttons, disabled states, responsive overflow, calendar controls, loading copy, empty copy, and inline error feedback.
- Explicit Patient, Doctor, From, and To identities in clinical workflows.
- Local-date handling avoids UTC date shifts in booking and availability fields.
- Prescription medication rows start blank; no clinical sample values can be accidentally submitted.
- Stale clinic data is cleared through component remount and API refetch after switching.

## 8. Security fixes

- Server-side tenant checks remain authoritative for every clinic-scoped operation.
- Active clinic and active staff status are enforced.
- Patients cannot enumerate clinic patient registries; self-enrollment happens server-side during booking.
- Sender ID is derived from authentication and supplied impersonation is rejected.
- Recipient discovery reveals only users with an existing clinical relationship.
- Prescription edits require the original prescribing doctor and use transactional writes.
- Appointment and DOB rules are enforced server-side, independent of browser controls.
- PHI content is excluded from notifications and audit details.
- Existing JWT, HTTPS/HSTS, strict CORS, verified database TLS, public DTO, password-reset digest, EMR IDOR, and audit-sanitization remediations remain in place.

## 9. Actual test results

Command: npm test

- Focused automated tests: 16 passed, 0 failed.
- Covered JWT fail-closed configuration, CORS, HTTPS/proxy/HSTS, recursive audit PHI scrubbing, public serializers, appointment modification rules, feature normalization, PDF structure/content, DOB and timezone-aware appointment clocks, owned/staff/cross-tenant/inactive clinic access, and sender impersonation.
- Database integration suites: skipped by the runner because RUN_INTEGRATION_TESTS was not enabled with a clearly isolated TEST_DB_NAME.

## 10. Build, lint, and type results

- Production Vite build: passed; 2,286 modules transformed.
- Output warning: the main JavaScript chunk is approximately 944 kB uncompressed (243 kB gzip), above Vite’s advisory 500 kB threshold.
- Server JavaScript syntax validation: passed.
- Frontend lint command: no lint script/configuration exists.
- Frontend standalone type-check command: no typecheck script or tsconfig exists. The Vite production transform passed, but this is not a substitute for strict TypeScript checking.
- Database migration: not executed because no dedicated test database was available.

## 11. SRS traceability

The full FR-1 through FR-43 matrix is maintained in SRS_TRACEABILITY.md. Functional statuses remain PASS/PARTIAL/FUTURE based on implemented source; database-dependent items explicitly retain their verification limitation.

## 12. Remaining limitations and release gates

- Apply server/db/migrate.js to a backup-tested staging database before deploying these schema changes.
- Run all database integration suites and the listed doctor, patient, and admin browser workflows against isolated, representative data.
- Configure deployment secrets and rotate any credentials previously present in the removed server/.env.
- Add a real frontend lint/strict type-check toolchain and make both required in CI.
- Split the large client bundle and decompose App.tsx/ActionModals.tsx for maintainability.
- Inactivity and OTP attempt tracking remain process-local; multi-instance deployments need a shared TTL store.
- Video consultation remains a documented future feature.
- Browser tokens remain in localStorage under the existing architecture; an HttpOnly-cookie migration would further reduce XSS token risk.
- Performance, backup/restore, availability, and disaster-recovery targets require deployment-level validation and are not claimed here.
