# ClinicOS Engineering Remediation Codex: Role-Aware Appointment Booking & Session Isolation

**Document Version:** 1.0.0  
**Target Subsystems:** Patient Portal, Doctor Dashboard, Clinic Appointment Management, Client Auth State, RBAC Middleware  
**Date:** 2026-09-04  

---

## 1. Executive Summary

This Codex outlines the root-cause analysis, system architecture impact, and complete technical remediation for two interconnected bugs observed in ClinicOS:

1. **Patient Appointment Booking Logic & Privacy Bug**:
   - In the Patient Portal, the appointment booking modal renders a "Select Patient" dropdown (`-- Choose Patient --`) allowing patients to see and select other clinic patients, while omitting an explicit "Select Doctor" dropdown.
   - When a patient has no pre-associated clinic (`clinic_id` is `"0"` or empty), the modal aborts with `"Please select a clinic before booking an appointment"`, offering no clinic selector and leaving the doctor field empty.

2. **Cross-Role Session Contamination & Disappearing Patients Bug**:
   - Single-browser testing across Doctor and Patient portals shares identical `localStorage` keys (`clinic_os_token`, `clinic_os_user`).
   - Logging into the Patient Portal silently overwrites the Doctor's JWT in `localStorage`.
   - The Doctor Dashboard continues dispatching requests with the Patient's bearer token, triggering `403 Forbidden: Insufficient permissions for this action` across Clinic, Service, Package, and Invoice creation.
   - In `PatientsView`, receiving a `403 Forbidden` triggers `setPatients([])` in the catch block, causing previously added patients to vanish from the UI.

---

## 2. Root Cause Analysis (RCA)

### 2.1 Issue 1: Patient Appointment Booking Modal (`BookAppointmentModal`)

```
+-----------------------------------------------------------------------------------+
| Original Design Flaw: Monolithic Component Shared Across Incompatible Contexts     |
|                                                                                   |
|  AppointmentsView (Staff/Doctor)  \                                               |
|  PatientDetail (Doctor)            ---> BookAppointmentModal (Implicit Role Guess) |
|  PatientPortal (Patient)          /                                               |
+-----------------------------------------------------------------------------------+
```

#### Defect Mechanics:
- **Implicit Role Detection**: `BookAppointmentModal` in `client/src/app/components/ActionModals.tsx` previously evaluated role via `getStoredUser()?.role === "patient"`. If `getStoredUser()` returned stale cache, a non-patient object, or was evaluated during an ambiguous auth transition, it defaulted to the staff/receptionist workflow.
- **Receptionist Perspective Inversion**:
  - Staff workflows require choosing which *patient* needs scheduling (`patientsApi.getByClinic(clinicId)` -> `<select id="booking-patient">`).
  - Patient workflows require choosing which *doctor* they wish to consult (`<select id="booking-doctor">`) while patient identity is strictly immutable (the logged-in user).
- **Missing Clinic Fallback**: When patients open the modal from the global "Overview" or "Appointments" tab, `patientProfile?.clinic_id` defaults to `"0"` for newly registered patients. The modal checked `if (clinicId && clinicId !== "0")` and displayed an error without providing a clinic picker.

---

### 2.2 Issue 2: Cross-Role Session Contamination & State Eviction

```
[Tab 1: Doctor Dashboard] (Mounted) ── Reads token on demand ──+
                                                               |
[Shared localStorage]                                          |--> Bearer <Patient_JWT> sent to:
  clinic_os_token = <Patient_JWT>   <── Overwritten by Tab 2   |    - POST /api/clinics (403)
  clinic_os_user  = {"role":"patient"}                         |    - POST /api/clinics/:id/services (403)
                                                               |    - GET  /api/clinics/:id/patients (403)
[Tab 2: Patient Portal] (Logged In)                            |         │
                                                                         ▼
                                                       PatientsView: catch (err) { setPatients([]); }
                                                       ==> Table completely wipes out!
```

#### Defect Mechanics:
- **Shared Storage Collisions**: Both roles write to `clinic_os_token` and `clinic_os_user`. In development/testing, logging into the patient portal overwrites the doctor's token.
- **Dynamic Axios Token Interceptor**: In `client/src/app/api/client.ts`, Axios reads `localStorage.getItem('clinic_os_token')` on every request. It does not check whether the stored token matches the active UI context.
- **Strict Server-Side RBAC**: The backend `authorize('doctor')` middleware in `server/src/middleware/rbac.js` rejects non-doctor tokens with `403 Forbidden: Insufficient permissions for this action.`
- **Destructive UI Catch Blocks**: In `client/src/app/App.tsx`, `fetchPatients` handled errors by setting `setPatients([])`. Receiving a `403 Forbidden` error caused the table to wipe all in-memory records, simulating a data-loss event.

---

## 3. Implementation Plan & Target Files

| Target File | Component / Method | Remediation Summary |
|---|---|---|
| `client/src/app/components/ActionModals.tsx` | `BookAppointmentModal` | Add explicit `isPatient` prop, add clinic selection fallback, hide patient selector for patients, ensure explicit doctor dropdown with specialties, dynamic slot synchronization. |
| `client/src/app/App.tsx` | `PatientPortal` | Pass `isPatient={true}` and `clinicsList={clinics}` to `BookAppointmentModal`. |
| `client/src/app/App.tsx` | `PatientsView` | Prevent destructive state wiping (`setPatients([])`) on 403 authorization errors. |
| `client/src/app/App.tsx` | Root `App` | Add `window.addEventListener('storage', ...)` to detect cross-tab role switches and prevent stale token requests. |
| `client/src/app/api/client.ts` | Axios Interceptors | Add role-mismatch detection and dispatch custom auth events. |
| `server/src/controllers/appointmentController.js` | `create` | Enforce backend anti-IDOR patient resolution (`req.user.id`) and mandatory `doctor_id`. |

---

## 4. Complete Code Changes

### 4.1 Frontend: `client/src/app/components/ActionModals.tsx`

Refactor `BookAppointmentModal` to accept explicit props and support dynamic clinic/doctor selection:

```tsx
// ── 1. Book Appointment Modal ──────────────────────────────────────────────────
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
  clinicsList?: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}) {
  const storedUser = getStoredUser();
  // Explicit prop overrides local storage inspection
  const isPatient = isPatientProp ?? (storedUser?.role === "patient");
  const patientDisplayName = [storedUser?.first_name, storedUser?.last_name].filter(Boolean).join(" ");

  const [selectedClinicId, setSelectedClinicId] = useState<string>(
    clinicId && clinicId !== "0" ? clinicId : ""
  );
  const [availableClinics, setAvailableClinics] = useState<any[]>(clinicsList || []);

  const [form, setForm] = useState({
    patient_id: patientId || "",
    doctor_id: doctorId || "",
    service_id: "",
    appointment_date: appointmentDate || localDate(1),
    start_time: "",
    end_time: "",
    type: "in-person",
    notes: "",
  });

  const [services, setServices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Sync clinic ID when props change
  useEffect(() => {
    if (clinicId && clinicId !== "0") {
      setSelectedClinicId(clinicId);
    }
  }, [clinicId, open]);

  // Load fallback clinics if none passed and none selected
  useEffect(() => {
    if (open && (!selectedClinicId || selectedClinicId === "0") && (!availableClinics || availableClinics.length === 0)) {
      clinicsApi.search({ limit: 50 })
        .then((res) => {
          const list = res?.data?.clinics || [];
          setAvailableClinics(list);
          if (list.length === 1) {
            setSelectedClinicId(list[0].id);
          }
        })
        .catch(() => {});
    }
  }, [open, selectedClinicId, availableClinics]);

  // Load doctors, services, and (for staff only) patients for selected clinic
  useEffect(() => {
    if (!open || !selectedClinicId || selectedClinicId === "0") {
      setDoctors([]);
      setServices([]);
      setPatients([]);
      return;
    }

    setLoadingOptions(true);
    setError("");

    Promise.all([
      clinicsApi.getServices(selectedClinicId),
      clinicsApi.getById(selectedClinicId),
      isPatient ? Promise.resolve(null) : patientsApi.getByClinic(selectedClinicId, { limit: 100 }),
    ])
      .then(([serviceRes, clinicRes, patientRes]) => {
        const availableDoctors = clinicRes?.data?.staff || [];
        setServices(serviceRes?.data?.services || []);
        setDoctors(availableDoctors);
        if (!isPatient) {
          setPatients(patientRes?.data?.patients || []);
        }

        setForm((f) => ({
          ...f,
          patient_id: isPatient ? (patientId || "") : (patientId || f.patient_id),
          doctor_id: doctorId || (availableDoctors.length === 1 ? (availableDoctors[0].doctor_id || availableDoctors[0].id) : ""),
          start_time: "",
          end_time: "",
        }));
      })
      .catch(() => setError("Unable to load doctors and services for this clinic."))
      .finally(() => setLoadingOptions(false));
  }, [open, selectedClinicId, doctorId, patientId, isPatient]);

  // Availability slots resolution
  useEffect(() => {
    if (!open || !selectedClinicId || selectedClinicId === "0" || !form.doctor_id || !form.appointment_date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setSlots([]);
    clinicsApi.getAvailableSlots(selectedClinicId, {
      date: form.appointment_date,
      doctor_id: form.doctor_id,
      service_id: form.service_id || undefined,
    })
      .then((res) => setSlots((res.data?.slots || []).filter((slot: any) => slot.available)))
      .catch((err) => setError(err.response?.data?.message || "Unable to load available times."))
      .finally(() => setLoadingSlots(false));
  }, [open, selectedClinicId, form.doctor_id, form.appointment_date, form.service_id]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinicId || selectedClinicId === "0") {
      setError("Please choose a clinic first.");
      return;
    }
    if (!isPatient && !form.patient_id) {
      setError("Please select a patient.");
      return;
    }
    if (!form.doctor_id) {
      setError("Please select a doctor.");
      return;
    }
    if (!form.appointment_date || !form.start_time || !form.end_time) {
      setError("Please select a date and time slot.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await appointmentsApi.create(selectedClinicId, form);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to book appointment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-semibold">
              <Calendar size={16} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Book New Appointment</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2">
              <AlertCircle size={14} className="flex-shrink-0" /> {error}
            </div>
          )}

          {/* 1. Clinic Selection (Displayed if clinicId is not locked by props) */}
          {(!clinicId || clinicId === "0") && (
            <div>
              <label htmlFor="booking-clinic" className="block text-xs font-semibold text-slate-600 mb-1.5">Clinic *</label>
              <select
                id="booking-clinic"
                value={selectedClinicId}
                onChange={(e) => {
                  setSelectedClinicId(e.target.value);
                  setForm((f) => ({ ...f, doctor_id: "", start_time: "", end_time: "" }));
                }}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                required
              >
                <option value="">-- Choose Clinic --</option>
                {availableClinics.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.city ? `(${c.city})` : ""}</option>
                ))}
              </select>
            </div>
          )}

          {/* 2. Patient Identity (Role-Isolated) */}
          {isPatient ? (
            <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
              <p className="text-xs font-semibold text-teal-800 flex items-center gap-1.5">
                <User size={13} /> Patient
              </p>
              <p className="text-sm font-bold text-slate-900">
                Booking for yourself {patientDisplayName ? `(${patientDisplayName})` : ""}
              </p>
            </div>
          ) : (
            <div>
              <label htmlFor="booking-patient" className="block text-xs font-semibold text-slate-600 mb-1.5">Patient *</label>
              <select
                id="booking-patient"
                value={form.patient_id}
                onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              >
                <option value="">-- Choose Patient --</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} ({p.phone || p.email || "No contact"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Doctor Selection */}
          <div>
            <label htmlFor="booking-doctor" className="block text-xs font-semibold text-slate-600 mb-1.5">Doctor *</label>
            <select
              id="booking-doctor"
              value={form.doctor_id}
              disabled={loadingOptions || !selectedClinicId || selectedClinicId === "0"}
              onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value, start_time: "", end_time: "" }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white disabled:bg-slate-50"
              required
            >
              <option value="">
                {loadingOptions
                  ? "Loading doctors..."
                  : !selectedClinicId || selectedClinicId === "0"
                  ? "-- Select a clinic first --"
                  : doctors.length === 0
                  ? "No doctors currently available at this clinic"
                  : "-- Select Doctor --"}
              </option>
              {doctors.map((doctor: any) => {
                const id = doctor.doctor_id || doctor.user_id || doctor.id;
                return (
                  <option key={id} value={id}>
                    Dr. {doctor.first_name} {doctor.last_name} — {doctor.specialization || "General Medicine"}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 4. Medical Service */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Consultation Service</label>
            <select
              value={form.service_id}
              onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value, start_time: "", end_time: "" }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
            >
              <option value="">General Consultation (30 mins)</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — ${s.price} ({s.duration_minutes} min)</option>
              ))}
            </select>
          </div>

          {/* 5. Date & Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date *</label>
              <input
                type="date"
                min={localDate()}
                value={form.appointment_date}
                onChange={(e) => setForm((f) => ({ ...f, appointment_date: e.target.value, start_time: "", end_time: "" }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                required
              />
            </div>
            <div className="flex items-end">
              <div className="w-full rounded-xl border border-gray-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
                {form.start_time ? `${form.start_time} – ${form.end_time}` : "Pick a time slot"}
              </div>
            </div>
          </div>

          <fieldset>
            <legend className="block text-xs font-semibold text-slate-600 mb-2">Available Slots *</legend>
            {loadingSlots ? (
              <p className="text-xs text-slate-500 py-3">Loading availability...</p>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((slot: any) => (
                  <button
                    type="button"
                    key={slot.start_time}
                    onClick={() => setForm((f) => ({ ...f, start_time: slot.start_time, end_time: slot.end_time }))}
                    className={`min-h-10 rounded-xl border text-xs font-semibold transition-all ${
                      form.start_time === slot.start_time
                        ? "bg-teal-600 border-teal-600 text-white shadow-sm"
                        : "bg-white border-gray-200 text-slate-700 hover:border-teal-300"
                    }`}
                  >
                    {slot.start_time}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 rounded-xl bg-slate-50 p-3">
                {!form.doctor_id ? "Select a doctor to view open times." : "No available times for this doctor on this date."}
              </p>
            )}
          </fieldset>

          {/* 6. Mode & Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Consultation Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "in-person", label: "In-Person" },
                { id: "video", label: "Video Call" },
                { id: "phone", label: "Phone Call" },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setForm((f) => ({ ...f, type: m.id }))}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                    form.type === m.id
                      ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                      : "bg-white text-slate-600 border-gray-200 hover:bg-slate-50"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reason for Visit / Symptoms</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Describe symptoms or primary health complaint..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedClinicId || !form.doctor_id || !form.start_time}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {submitting ? "Booking..." : "Confirm Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

### 4.2 Frontend: `client/src/app/App.tsx`

#### A. Wire Explicit Role & Clinic Props in `PatientPortal`
Update the modal declaration at the bottom of `PatientPortal` (around lines 4646–4656):

```tsx
      {/* Modals */}
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

#### B. Protect `PatientsView` Against Destructive State Clearing on 403
In `PatientsView` (around line 1884):

```tsx
  const fetchPatients = useCallback(async () => {
    if (selectedClinic?.id) {
      setLoading(true);
      setError("");
      try {
        const res = await patientsApi.getByClinic(selectedClinic.id, { search, limit: 100 });
        setPatients(res.data?.patients || []);
      } catch (requestError: any) {
        // If 403 authorization error occurs, do NOT wipe the patients list
        if (requestError?.response?.status === 403) {
          setError("Authorization error: You do not have permission to view patients for this clinic. Please verify you are logged in as a Doctor.");
        } else {
          setPatients([]);
          setError(getApiErrorMessage(requestError, "Unable to load patients."));
        }
      } finally {
        setLoading(false);
      }
    } else {
      setPatients([]);
      setLoading(false);
    }
  }, [selectedClinic, search]);
```

#### C. Cross-Tab Storage Event Synchronization
In root `App` component (around line 6010):

```tsx
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "clinic_os_user" || e.key === "clinic_os_token") {
        const updatedUser = getStoredUser();
        if (updatedUser?.role !== user?.role) {
          // Detect role change across tabs; reload to realign context
          window.location.reload();
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user?.role]);
```

---

### 4.3 Backend: `server/src/controllers/appointmentController.js`

Ensure authoritative patient identity and validate doctor affiliation:

```javascript
      // 1. Doctor verification
      let doctorId = req.body.doctor_id;
      if (!doctorId) {
        return res.status(400).json({ message: 'Doctor selection is required.' });
      }

      const isDoctorMember = await validateDoctorClinicMembership(doctorId, clinicId);
      if (!isDoctorMember) {
        return res.status(400).json({ message: 'The selected doctor does not practice at this clinic.' });
      }

      // 2. Patient Identity Resolution (Never trust req.body.patient_id from patients)
      let patientId;
      if (req.user && req.user.role === 'patient') {
        let patient = await Patient.findByUserId(req.user.id, clinicId);
        if (!patient) {
          const [profileRows] = await db.execute('SELECT * FROM patient_profiles WHERE user_id = ?', [req.user.id]);
          const profile = profileRows[0] || {};
          patient = await Patient.create({
            ...profile,
            user_id: req.user.id,
            clinic_id: clinicId,
            first_name: req.user.first_name,
            last_name: req.user.last_name,
            email: req.user.email,
            phone: req.user.phone,
          });
        }
        patientId = patient.id;
      } else {
        // Staff/Doctor booking for a patient
        patientId = req.body.patient_id;
        if (!patientId) {
          return res.status(400).json({ message: 'Patient selection is required.' });
        }
        const patient = await Patient.findById(patientId);
        if (!patient || patient.clinic_id !== clinicId) {
          return res.status(400).json({ message: 'Selected patient does not belong to this clinic.' });
        }
      }
```

---

## 5. Verification Matrix & Quality Gates

| Test ID | Scenario | Expected Behavior |
|---|---|---|
| **V-01** | Patient opens "Book Appointment" from Overview when `patientProfile.clinic_id` is `"0"` | A Clinic dropdown appears. Selecting a clinic populates available doctors and services. |
| **V-02** | Patient views the Booking Modal | "Select Patient" dropdown is absent. "Booking for yourself (Name)" banner is displayed. |
| **V-03** | Patient selects Doctor and Date | Available time slots fetch dynamically for the selected provider. |
| **V-04** | Patient confirms booking | Appointment created with `patient_id` resolved from JWT session (`req.user.id`). Client-supplied `patient_id` tampering ignored. |
| **V-05** | Doctor opens "New Appointment" from `AppointmentsView` | "Patient *" dropdown is present and populated with clinic patients. "Doctor *" dropdown is available. |
| **V-06** | Cross-tab session switch (Doctor in Tab 1, Patient logs in Tab 2) | Tab 1 detects storage change and syncs state, avoiding firing requests with mismatched tokens or wiping table records. |
| **V-07** | Doctor creates Clinic, Service, Package, Invoice | All actions succeed without `403 Insufficient permissions`. |
