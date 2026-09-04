# ClinicOS Security Architecture & Hardening Guide

Verified 2026-09-04: the distributable environment file was removed. Rotate the database password, JWT secret, and Brevo key that were configured in that copy. Production now uses strict CORS, verified database TLS, JWT issuer/audience/algorithm checks, HTTPS redirects, trusted-proxy handling, HSTS, public response serializers, and recursive audit-PHI sanitization. See FINAL_AUDIT.md for limitations and test evidence.

## 1. Executive Security Summary

ClinicOS applies layered controls for protected health information, tenant isolation, insecure direct-object references, and appointment concurrency. These source controls do not replace a deployment security review, migrated-database integration testing, monitoring, backups, or incident response.

---

## 2. Authentication & Session Hardening

### 2.1. Cryptographic OTP Generation & Brute-Force Defense
- **Entropy & Randomness**: One-Time Passwords (OTPs) for registration and multi-factor email verification are generated using Node.js `crypto.randomInt(100000, 1000000)`. Pseudo-random generators (`Math.random()`) are strictly forbidden.
- **Expiration**: Verification OTPs have a configurable expiry (`OTP_EXPIRATION_MINUTES`, 10 minutes by default).
- **Attempt Throttling**: The verification endpoint tracks consecutive failed attempts. After 5 failed verification attempts, the active code is invalidated, and the verification endpoint is rate-limited for 15 minutes.
- **Leakage Prevention**: Verification OTPs are never exposed in production API responses or client-facing error messages.

### 2.2. User Enumeration Protection
- **Generic Password Recovery**: The password reset endpoint returns an identical generic response (`"If an account exists for this email, the recovery process has been initiated."`) regardless of whether the submitted email exists in the database.
- **Timing Attack Mitigation**: Input email addresses are consistently normalized (`trim().toLowerCase()`) and evaluated.

### 2.3. JWT Token Security & Production Fail-Safe
- **Production Guard**: If `NODE_ENV === 'production'`, the server verifies that `process.env.JWT_SECRET` is defined and does not match insecure defaults; otherwise, the server refuses to boot and fails fast.
- **Reset Tokens**: Password-reset bearer tokens are stored as SHA-256 digests rather than plaintext.
- **Inactivity Timeout Tracker (NFR-9)**: Active sessions are subject to a 30-minute inactivity sliding window. Inactive sessions are revoked upon subsequent request.
- **Instant Deactivation Enforcement**: Every authenticated request queries database user status (`is_active`). Deactivated accounts are instantly rejected with HTTP 401/403.

---

## 3. Multi-Layered Authorization & Anti-IDOR Architecture

### 3.1. Tenant Isolation Middleware (`clinicAccess`)
All operational clinic routes enforce tenant scoping:
- The middleware verifies that the target clinic exists, is active, and that the requesting user has legitimate association (owner, staff member, or registered patient).
- Access to resources belonging to different clinics is blocked with HTTP 403 Forbidden.

### 3.2. Patient Identity Resolution (Anti-IDOR)
- For users with the `patient` role, patient record resolution is derived strictly on the server from `req.user.id` and `clinicId`.
- Client-supplied `patient_id` fields in request bodies are ignored for patient users, preventing spoofed bookings, reviews, or medical uploads.

### 3.3. Doctor-Clinic Relationship Verification
- Operations requiring clinical privileges (e.g. issuing prescriptions, creating EMR records, scheduling appointments for a doctor) verify that the doctor is an active practitioner in the target clinic via `validateDoctorClinicMembership`.

### 3.4. Administrative Role Separation
- Platform administrators manage platform settings, clinics, subscription plans, and user account statuses.
- Platform administrators are strictly separated from unrestricted clinical EMR records and digital prescriptions unless they hold legitimate clinic staff membership.

### 3.5. Clinic Ownership Boundary (`requireClinicOwner`)
- Modifying clinic settings, changing operating hours, and inviting or removing staff members is restricted to the verified `owner_id` of the clinic or platform administrators.

---

## 4. Concurrency & Double-Booking Defense

### 4.1. Row-Level Transaction Locking (`SELECT ... FOR UPDATE`)
To prevent concurrent double-booking race conditions during high-volume appointment scheduling:
1. An atomic database transaction is opened via `db.transaction()`.
2. Conflicting overlapping time slots for the designated doctor and date are locked using `SELECT id FROM appointments WHERE ... FOR UPDATE`.
3. If an overlapping slot exists, the transaction rolls back and returns HTTP 409 Conflict.
4. If no conflict exists, the appointment is inserted and committed atomically.

### 4.2. Appointment State Machine
Appointment lifecycle statuses follow an enforced forward-only state machine:
- `scheduled` $\rightarrow$ `confirmed`, `cancelled`, `no_show`
- `confirmed` $\rightarrow$ `in_progress`, `cancelled`, `no_show`
- `in_progress` $\rightarrow$ `completed`, `cancelled`
- `completed`, `cancelled`, `no_show` $\rightarrow$ Terminal states (reversions rejected with HTTP 400).

---

## 5. Payment State Machine & Financial Integrity

Payment records enforce strict non-reversible financial transitions:
- `pending` $\rightarrow$ `completed`, `failed`
- `failed` $\rightarrow$ `pending` (retry allowed)
- `completed` $\rightarrow$ `refunded`
- `refunded` $\rightarrow$ Terminal state (reversion to completed/pending rejected with HTTP 400).

---

## 6. Input Validation Layer (`express-validator`)

All incoming client requests pass through modular validation rules before reaching controllers:
- **Authentication**: Email format validation, password length checks, role whitelisting (`patient`, `doctor`, `assistant`).
- **Appointments**: YYYY-MM-DD date format validation, past date rejections, HH:MM time syntax checks, visit type whitelisting.
- **Medical Records & Prescriptions**: Mandatory diagnosis, sanitized medication items.
- **Payments**: Numeric positive amount validation, payment method whitelisting.
- **Reviews**: Integer rating validation between 1 and 5 stars.
- **Pagination**: Positive integer validation for `page` and bounded `limit` (1 to 100).

---

## 7. Audit Logging & Compliance

Sensitive business-domain events and status changes are recorded in the MySQL `audit_logs` table. The audit sanitizer retains identifiers and state transitions while recursively removing clinical content and secrets:
- `LOGIN` & `LOGIN_FAILED`
- `PASSWORD_RESET_REQUESTED` & `PASSWORD_RESET_COMPLETED`
- `USER_ACTIVATED` & `USER_DEACTIVATED`
- `CLINIC_CREATED`, `CLINIC_UPDATED`, `CLINIC_SUSPENDED`, `CLINIC_ACTIVATED`
- `STAFF_ADDED` & `STAFF_REMOVED`
- `PATIENT_CREATED` & `PATIENT_UPDATED`
- `APPOINTMENT_BOOKED`, `APPOINTMENT_STATUS_CHANGED`, `APPOINTMENT_RESCHEDULED`
- `EMR_CREATED` & `EMR_UPDATED`
- `PRESCRIPTION_CREATED` & `PRESCRIPTION_UPDATED`
- `PAYMENT_CREATED` & `PAYMENT_STATUS_CHANGED`
- `SUBSCRIPTION_CREATED` & `SUBSCRIPTION_CANCELLED`
- `APPROVE_REVIEW` & `REJECT_REVIEW`

---

## 8. Vulnerability Reporting

If you discover a security vulnerability within ClinicOS, please report it directly to the repository maintainers or platform administration team. Do not disclose security vulnerabilities in public issue trackers.
