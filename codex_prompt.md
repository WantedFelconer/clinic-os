# Codex Task Prompt: Fix Patient Appointment Booking & Cross-Role Session Contamination

> **Instructions for Codex**:  
> You are acting as a Senior Full-Stack Engineer. Your objective is to fix two critical interrelated defects in ClinicOS without replacing its core architecture or breaking existing workflows. Follow the technical requirements, code specifications, and verification checklist below.

---

## 1. Context & Problem Description

ClinicOS is a multi-tenant healthcare SaaS web application built using **React 18 + TypeScript + Vite + Tailwind CSS** on the frontend and **Node.js + Express + MySQL** on the backend.

### Defect 1: Patient Appointment Booking Component Inversion & Missing Doctor Selector
- **Symptom**: In the Patient Portal (`PatientPortal` in `client/src/app/App.tsx`), clicking "Book Appointment" launches `BookAppointmentModal` (`client/src/app/components/ActionModals.tsx`). In the patient portal, the modal renders a **"Select Patient *" dropdown (`-- Choose Patient --`)**, allowing patients to view and select other clinic patients, while **omitting an explicit "Select Doctor" dropdown** (or rendering it empty).
- **Cause**: `BookAppointmentModal` was originally implemented exclusively for receptionists/doctors to schedule walk-in patients. It was reused in the patient portal while relying on a fragile runtime check (`getStoredUser()?.role === "patient"`). If `getStoredUser()` is stale, missing, or evaluates to another role, it renders the receptionist view. Furthermore, when a patient has no pre-associated clinic (`clinic_id` is `"0"` or empty), the modal aborts with `"Please select a clinic before booking an appointment"`, providing no clinic picker.

### Defect 2: Cross-Role Session Contamination & Disappearing Patients
- **Symptom**: In single-browser multi-tab or sequential testing (Doctor tab open, Patient logs in on another tab), previously added patients in the Doctor Dashboard suddenly disappear from `PatientsView`, and subsequent doctor operations (create clinic, service, package, invoice) fail with:
  ```json
  { "message": "Forbidden: Insufficient permissions for this action." }
  ```
- **Cause**: Both portals share `localStorage` keys (`clinic_os_token`, `clinic_os_user`). When logging into the Patient Portal, the patient's token overwrites the doctor's token. The Doctor Dashboard tab, still open, sends the patient token via Axios on subsequent requests. `authorize('doctor')` in `server/src/middleware/rbac.js` rejects the request with HTTP 403. In `PatientsView`, the catch block executes `setPatients([])` on error, wiping the displayed table.

---

## 2. Target Files
- `client/src/app/components/ActionModals.tsx` (Component: `BookAppointmentModal`)
- `client/src/app/App.tsx` (Components: `PatientPortal`, `PatientsView`, root `App`)
- `server/src/controllers/appointmentController.js` (`create` method)

---

## 3. Implementation Specifications

### Task 1: Refactor `BookAppointmentModal` (`client/src/app/components/ActionModals.tsx`)

1. **Update Props Interface**:
   Add explicit props for role disambiguation and clinic selection:
   ```typescript
   export function BookAppointmentModal({
     open,
     onClose,
     clinicId,
     patientId,
     doctorId,
     appointmentDate,
     isPatient: isPatientProp,
     clinicsList,
     onSuccess,
   }: {
     open: boolean;
     onClose: () => void;
     clinicId?: string;
     patientId?: string;
     doctorId?: string;
     appointmentDate?: string;
     isPatient?: boolean;
     clinicsList?: Array<{ id: string; name: string; city?: string }>;
     onSuccess: () => void;
   })
   ```

2. **Unambiguous Role & State Resolution**:
   ```typescript
   const storedUser = getStoredUser();
   // Explicit prop takes precedence over localStorage inspection
   const isPatient = isPatientProp ?? (storedUser?.role === "patient");
   const patientDisplayName = [storedUser?.first_name, storedUser?.last_name].filter(Boolean).join(" ");

   const [selectedClinicId, setSelectedClinicId] = useState<string>(
     clinicId && clinicId !== "0" ? clinicId : ""
   );
   const [availableClinics, setAvailableClinics] = useState<any[]>(clinicsList || []);
   ```

3. **Synchronize Clinic ID and Dynamic Clinic Search**:
   - Update `selectedClinicId` when `clinicId` prop changes and is not `"0"`.
   - If `selectedClinicId` is empty or `"0"`, load clinics using `clinicsApi.search({ limit: 50 })` so the user can choose a clinic.

4. **Doctor & Options Data Loading**:
   - Query `clinicsApi.getServices(selectedClinicId)` and `clinicsApi.getById(selectedClinicId)` when `selectedClinicId` is valid.
   - If `isPatient === true`:
     - **DO NOT** call `patientsApi.getByClinic(selectedClinicId)`. This prevents unauthorized requests and PHI leaks.
     - Auto-fill `form.patient_id` with `patientId || ""`.
   - If `isPatient === false`:
     - Fetch `patientsApi.getByClinic(selectedClinicId, { limit: 100 })` for receptionist/doctor patient selection.
   - Populate `doctors` state from `clinicRes?.data?.staff || []`.

5. **Modal JSX Elements**:
   - **Clinic Selector**: Render a `<select id="booking-clinic">` dropdown ONLY if `!clinicId || clinicId === "0"`.
   - **Patient Identity**:
     - When `isPatient === true`: Render a read-only self-booking banner:
       ```tsx
       <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
         <p className="text-xs font-semibold text-teal-800 flex items-center gap-1.5">
           <User size={13} /> Patient
         </p>
         <p className="text-sm font-bold text-slate-900">
           Booking for yourself {patientDisplayName ? `(${patientDisplayName})` : ""}
         </p>
       </div>
       ```
     - When `isPatient === false`: Render the `<select id="booking-patient">` dropdown with clinic patients.
   - **Doctor Selector**: Render a mandatory `<select id="booking-doctor">` for ALL users:
     - Map options to `Dr. {doctor.first_name} {doctor.last_name} — {doctor.specialization || "General Medicine"}`.
     - Value must be `doctor.doctor_id || doctor.user_id || doctor.id`.
     - Disable if `!selectedClinicId || selectedClinicId === "0"`.
   - **Slot Availability**:
     - Slot querying effect must require `selectedClinicId`, `form.doctor_id`, and `form.appointment_date`.
     - Invalidate and clear `start_time` and `end_time` whenever doctor, clinic, or date changes.

---

### Task 2: Update Invocation & Session Safety in `client/src/app/App.tsx`

1. **Wire `BookAppointmentModal` in `PatientPortal`**:
   Find the modal rendering at the bottom of `PatientPortal` and pass:
   ```tsx
   <BookAppointmentModal
     open={showBookModal}
     onClose={() => {
       setShowBookModal(false);
       setBookingDoctorId("");
     }}
     clinicId={bookingClinicId && bookingClinicId !== "0" ? bookingClinicId : (patientProfile?.clinic_id || "")}
     doctorId={bookingDoctorId}
     appointmentDate={discoveryDate}
     patientId={patientProfile?.id}
     isPatient={true}
     clinicsList={clinics}
     onSuccess={() => {
       loadAllData();
     }}
   />
   ```

2. **Protect `PatientsView` Against Destructive State Wiping**:
   In `PatientsView` (`fetchPatients` callback):
   ```typescript
   try {
     const res = await patientsApi.getByClinic(selectedClinic.id, { search, limit: 100 });
     setPatients(res.data?.patients || []);
   } catch (requestError: any) {
     if (requestError?.response?.status === 403) {
       setError("Authorization error: You do not have permission to view patients for this clinic. Please verify you are logged in as a Doctor.");
       // DO NOT call setPatients([]) here; preserve existing data to prevent vanishing records
     } else {
       setPatients([]);
       setError(getApiErrorMessage(requestError, "Unable to load patients."));
     }
   } finally {
     setLoading(false);
   }
   ```

3. **Cross-Tab Session Synchronization**:
   In the root `App` component, attach a `storage` listener to detect when `clinic_os_user` or `clinic_os_token` changes in another tab:
   ```typescript
   useEffect(() => {
     const handleStorageChange = (e: StorageEvent) => {
       if (e.key === "clinic_os_user" || e.key === "clinic_os_token") {
         const updatedUser = getStoredUser();
         if (updatedUser?.role !== user?.role) {
           window.location.reload();
         }
       }
     };
     window.addEventListener("storage", handleStorageChange);
     return () => window.removeEventListener("storage", handleStorageChange);
   }, [user?.role]);
   ```

---

### Task 3: Backend Anti-IDOR Enforcement (`server/src/controllers/appointmentController.js`)

In the `create` method of `appointmentController.js`:
1. **Mandatory Doctor Validation**:
   - Check `if (!req.body.doctor_id)` and return `400 Bad Request` if missing.
   - Verify the doctor belongs to the clinic via `validateDoctorClinicMembership(doctorId, clinicId)`.
2. **Authoritative Patient Resolution**:
   - If `req.user.role === 'patient'`:
     - Strictly ignore `req.body.patient_id`.
     - Find or auto-provision the patient record in the clinic scoped to `req.user.id`:
       ```javascript
       let patient = await Patient.findByUserId(req.user.id, clinicId);
       if (!patient) {
         patient = await Patient.create({
           user_id: req.user.id,
           clinic_id: clinicId,
           first_name: req.user.first_name,
           last_name: req.user.last_name,
           email: req.user.email,
           phone: req.user.phone,
         });
       }
       patientId = patient.id;
       ```
   - If staff/doctor:
     - Validate that `req.body.patient_id` is supplied and belongs to `clinicId`.

---

## 4. Verification & Acceptance Checklist

Before considering the task complete, verify:
- [ ] **Patient Dashboard Booking**:
  - Open Patient Portal -> Book Appointment.
  - Verify that the "Select Patient" dropdown is **NOT** present.
  - Verify that the "Booking for yourself" banner is shown.
  - Verify that the "Doctor *" dropdown is present and populated with active clinic doctors and their specializations.
  - Verify that selecting a doctor and date updates open times dynamically.
- [ ] **Unassigned Clinic Fallback**:
  - For a new patient with no previous clinic, verify that a Clinic dropdown appears, allowing clinic selection.
- [ ] **Doctor Dashboard Booking**:
  - Open Doctor Dashboard -> Appointments -> Book Appointment.
  - Verify that both the "Select Patient *" dropdown and "Doctor *" dropdown appear and work properly.
- [ ] **Multi-Tab / Multi-Role Isolation**:
  - Open Doctor Dashboard in Tab 1. Log in as Patient in Tab 2.
  - Return to Tab 1. Verify that the session synchronization detects the role change without throwing unhandled exceptions or wiping out the patient table.
- [ ] **Build & Quality Gates**:
  - Run `npm run build` in the `client` directory to verify zero TypeScript/JSX errors.
