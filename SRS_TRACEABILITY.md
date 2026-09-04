# ClinicOS SRS Traceability — Verified 2026-09-04

**PASS** means the frontend/API/authorization/validation/business logic/persistence workflow is present in source. **PARTIAL** means a material layer or verification step remains. **FUTURE** is explicitly deferred. Database-backed workflows still require execution against a dedicated migrated test database before release.

| FR | Requirement | Status | Evidence / limitation |
|---|---|---|---|
| FR-1 | Patient/doctor registration | PASS | Auth form, validator, controller, persistence |
| FR-2 | Unique email | PASS | Unique constraint and duplicate handling |
| FR-3 | Password hashing | PASS | bcrypt create/update |
| FR-4 | Verify email before login | PASS | Hashed expiring OTP and login gate |
| FR-5 | Login | PASS | JWT login and role response |
| FR-6 | Password recovery | PASS | Expiring, digest-stored reset token and email workflow |
| FR-7 | RBAC | PASS | Role, tenant and ownership checks |
| FR-8 | Role dashboards | PASS | React role dispatch |
| FR-9 | Multiple clinics | PASS | Owned/active-staff query, persisted safe default, selector/refetch, backend tenant enforcement |
| FR-10 | Doctor profile | PASS | Qualifications, specialty, experience, fee CRUD |
| FR-11 | Operating schedules | PASS | UI/API, validation, transactional persistence |
| FR-12 | Clinic services | PASS | Authorized CRUD |
| FR-13 | Consultation packages | PASS | Plan-gated authorized CRUD |
| FR-14 | Clinic branding | PASS | Validated metadata, authorization, persistence, preview/replace/remove |
| FR-15 | Patient profile | PASS | Account-level patient_profiles plus clinic-row synchronization for demographics and emergency data |
| FR-16 | Clinic search | PASS | Name, location and derived specialization with pagination |
| FR-17 | Doctor specialty/availability | PASS | Date filter uses schedules/bookings; UI books selected doctor |
| FR-18 | Consultation/treatment history | PASS | History APIs and portal |
| FR-19 | Secure personal medical data | PASS | Ownership and confidential filtering |
| FR-20 | Book appointments | PASS | Self-booking, explicit doctor choice, live slots, clinic-local time checks and conflict transaction |
| FR-21 | Reschedule/cancel before start | PASS | Reusable start-time/clinic/state guard and conflict validation |
| FR-22 | Doctor schedule management | PASS | Date-filtered seven-day calendar, clinic appointment views and state transitions |
| FR-23 | Confirm/cancel/remind notifications | PARTIAL | Deduplicated workflow exists; DB/email integration not executed here |
| FR-24 | Appointment history | PASS | Persistent paginated history |
| FR-25 | Create/update EMR | PASS | Doctor membership and tenant/patient checks |
| FR-26 | EMR clinical fields | PASS | Diagnosis, symptoms, treatment, notes, follow-up |
| FR-27 | Authorized EMR access | PASS | Doctor/owning-patient; admin/assistant clinical reads blocked |
| FR-28 | Complete medical history | PASS | Appointments, EMR, prescriptions, reports, payments |
| FR-29 | Digital prescriptions | PASS | Transactional create/edit of prescription/items; author, appointment, patient and tenant checks |
| FR-30 | View/download prescription | PASS | Portal viewer and authorized live database-to-PDF response |
| FR-31 | Prescription history | PASS | Persistent patient/clinic history with item retrieval |
| FR-32 | Online payment | PASS (SIMULATED) | Explicit simulated transition; gateway excluded |
| FR-33 | Invoice/payment/receipt | PASS | Pending invoice, completed simulated payment, receipt PDF |
| FR-34 | Revenue/payment history | PASS | Plan-gated ledger/revenue query |
| FR-35 | Email notifications | PARTIAL | Brevo code exists; credentials and live delivery unverified |
| FR-36 | Secure messages | PASS | Authenticated sender enforcement, relationship-scoped recipient discovery and relationship checks |
| FR-37 | Video consultations | FUTURE | Explicit future enhancement |
| FR-38 | Rate doctor and clinic | PASS | Completed-owned appointment, 1–5, duplicate guard; feeds both aggregates |
| FR-39 | Doctor reviews/ratings | PASS | Average, total, distribution, recent anonymized text, dashboard |
| FR-40 | Subscribe to plans | PASS | Owner-authorized simulated subscription |
| FR-41 | Renewal/expiration | PASS | Expiration enforcement and billing-cycle renewal |
| FR-42 | Admin plan management | PASS | Admin create/update/deactivate |
| FR-43 | Premium restrictions | PARTIAL | Central backend gates cover major routes including messaging; a unified frontend/advanced-EMR boundary remains incomplete |

## Non-functional notes

- 16 focused tests pass for HTTPS, JWT, CORS, public DTOs, audit sanitization, tenant context, sender identity, prescription edit ownership, date/time logic and PDF generation/content.
- Session inactivity and OTP throttling remain single-instance state.
- Response-time/load targets were not measured; no three-second or concurrency claim is made.
- 99.9% availability and backups require deployment monitoring, redundancy and managed backups.
- The UI is responsive, but modularity and URL routing remain partial because the React application is still large and page-state based.
