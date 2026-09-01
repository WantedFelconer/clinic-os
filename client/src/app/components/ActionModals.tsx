import { useState, useEffect } from "react";
import {
  X, Check, Plus, Trash2, Star, CreditCard, Send, Calendar,
  FileText, Pill, Package, Building2, User, Clock, AlertCircle,
  Printer, DollarSign, UserPlus, Phone, Mail, MapPin, Edit,
  Shield, CheckCircle2, RefreshCw
} from "lucide-react";
import {
  appointmentsApi, medicalRecordsApi, prescriptionsApi,
  clinicsApi, paymentsApi, patientsApi, reviewsApi, messagesApi,
} from "../api";

// ── 1. Book Appointment Modal ──────────────────────────────────────────────────
export function BookAppointmentModal({
  open, onClose, clinicId, patientId, doctorId, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  patientId?: string;
  doctorId?: string;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    patient_id: patientId || "",
    doctor_id: doctorId || "",
    service_id: "",
    appointment_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    start_time: "10:00",
    end_time: "10:30",
    type: "in-person",
    notes: "",
  });
  const [services, setServices] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (patientId) {
      setForm(f => ({ ...f, patient_id: patientId }));
    }
  }, [patientId]);

  useEffect(() => {
    if (open && clinicId && clinicId !== "0") {
      clinicsApi.getServices(clinicId).then(res => setServices(res.data.services || [])).catch(() => {});
      patientsApi.getByClinic(clinicId, { limit: 100 }).then(res => setPatients(res.data.patients || [])).catch(() => {});
      clinicsApi.getStaff(clinicId).then(res => {
        const staff = res.data.staff || [];
        const doc = staff.find((s: any) => s.role === "doctor" && s.is_active);
        if (doc && !form.doctor_id) setForm(f => ({ ...f, doctor_id: doc.id || doc.user_id }));
      }).catch(() => {});
    }
  }, [open, clinicId]);

  if (!open) return null;

  const handleServiceChange = (serviceId: string) => {
    const s = services.find((srv: any) => srv.id === serviceId);
    let endTime = form.end_time;
    if (s && form.start_time) {
      const [h, m] = form.start_time.split(':').map(Number);
      const dur = parseInt(s.duration_minutes, 10) || 30;
      const totalMins = h * 60 + m + dur;
      const endH = Math.floor(totalMins / 60);
      const endM = totalMins % 60;
      endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    }
    setForm(f => ({ ...f, service_id: serviceId, end_time: endTime }));
  };

  const handleStartTimeChange = (startTime: string) => {
    const s = services.find((srv: any) => srv.id === form.service_id);
    const dur = s ? parseInt(s.duration_minutes, 10) || 30 : 30;
    const [h, m] = startTime.split(':').map(Number);
    const totalMins = h * 60 + m + dur;
    const endH = Math.floor(totalMins / 60);
    const endM = totalMins % 60;
    const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    setForm(f => ({ ...f, start_time: startTime, end_time: endTime }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_id) {
      setError("Please select a patient");
      return;
    }
    if (!form.appointment_date || !form.start_time) {
      setError("Please fill in appointment date and start time");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const activeClinicId = clinicId || "0";
      await appointmentsApi.create(activeClinicId, form);
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-semibold">
              <Calendar size={16} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Book New Appointment</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2"><AlertCircle size={14} className="flex-shrink-0" /> {error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Patient *</label>
            <select
              value={form.patient_id}
              onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="">-- Choose Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.phone || p.email || 'No contact'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Medical Service</label>
            <select
              value={form.service_id}
              onChange={e => handleServiceChange(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">General Consultation (30 mins)</option>
              {services.map(s => (
                <option key={s.id} value={s.id}>{s.name} — ${s.price} ({s.duration_minutes} min)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date *</label>
              <input
                type="date"
                value={form.appointment_date}
                onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Start Time *</label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => handleStartTimeChange(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Consultation Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "in-person", label: "In-Person" },
                { id: "video", label: "Video Call" },
                { id: "phone", label: "Phone Call" },
              ].map(t => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setForm(f => ({ ...f, type: t.id }))}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all border ${
                    form.type === t.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "bg-white text-slate-600 border-gray-200 hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes / Chief Complaint</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Describe symptoms, reason for consultation, or special instructions..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2"
            >
              {submitting ? "Checking Availability..." : "Confirm Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 2. Reschedule Appointment Modal ───────────────────────────────────────────
export function RescheduleModal({
  open, onClose, appointment, clinicId, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  appointment: any;
  clinicId: string;
  onSuccess: () => void;
}) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (appointment) {
      setDate(appointment.appointment_date || "");
      setStartTime(appointment.start_time?.substring(0, 5) || "10:00");
      setNotes(appointment.notes || "");
    }
  }, [appointment]);

  if (!open || !appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !startTime) {
      setError("Please select both a date and time");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await appointmentsApi.reschedule(clinicId, appointment.id, {
        appointment_date: date,
        start_time: startTime,
        notes,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reschedule appointment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Reschedule Appointment</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium flex items-center gap-2"><AlertCircle size={14} className="flex-shrink-0" /> {error}</div>}

          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
            <p><span className="font-semibold text-slate-700">Patient:</span> {appointment.patient_first_name || appointment.patient} {appointment.patient_last_name || ''}</p>
            <p><span className="font-semibold text-slate-700">Current Slot:</span> {appointment.appointment_date} at {appointment.start_time?.substring(0, 5) || appointment.time}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">New Date *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">New Time *</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Reason for Rescheduling</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Reason for reschedule..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {submitting ? "Rescheduling..." : "Save Reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 3. Cancel Appointment Modal ───────────────────────────────────────────────
export function CancelAppointmentModal({
  open, onClose, appointment, clinicId, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  appointment: any;
  clinicId: string;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("Patient requested cancellation");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open || !appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please specify a cancellation reason");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await appointmentsApi.updateStatus(clinicId, appointment.id, "cancelled", reason.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to cancel appointment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-slate-900 text-red-600 flex items-center gap-2">
            <AlertCircle size={18} /> Cancel Appointment
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">{error}</div>}

          <p className="text-sm text-slate-600">
            Are you sure you want to cancel the appointment for <span className="font-semibold text-slate-900">{appointment.patient_first_name || appointment.patient} {appointment.patient_last_name || ''}</span>?
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cancellation Reason *</label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Patient emergency, Doctor schedule change..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Keep Appointment
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {submitting ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 4. Create EMR Modal ────────────────────────────────────────────────────────
export function CreateEMRModal({
  open, onClose, clinicId, patientId, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  patientId?: string;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    patient_id: patientId || "",
    diagnosis: "",
    symptoms: "",
    treatment_plan: "",
    notes: "",
    follow_up_date: "",
    is_confidential: false,
  });
  const [patients, setPatients] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (patientId) setForm(f => ({ ...f, patient_id: patientId }));
  }, [patientId]);

  useEffect(() => {
    if (open && clinicId && clinicId !== "0") {
      patientsApi.getByClinic(clinicId, { limit: 100 }).then(res => setPatients(res.data.patients || [])).catch(() => {});
    }
  }, [open, clinicId]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_id) {
      setError("Please select a patient");
      return;
    }
    if (!form.diagnosis.trim()) {
      setError("Diagnosis is required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await medicalRecordsApi.create(clinicId, form);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save EMR record");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-semibold">
              <FileText size={16} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">New Clinical Record (EMR)</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Patient *</label>
            <select
              value={form.patient_id}
              onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="">-- Choose Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.phone || p.email || 'No contact'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Primary Diagnosis *</label>
            <input
              value={form.diagnosis}
              onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))}
              placeholder="e.g. Essential Hypertension, Acute Bronchitis"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Symptoms / Subjective Notes</label>
            <textarea
              rows={2}
              value={form.symptoms}
              onChange={e => setForm(f => ({ ...f, symptoms: e.target.value }))}
              placeholder="Patient reports headaches, fever, fatigue..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Treatment Plan / Assessment</label>
            <textarea
              rows={3}
              value={form.treatment_plan}
              onChange={e => setForm(f => ({ ...f, treatment_plan: e.target.value }))}
              placeholder="Medication regimen, lifestyle recommendations, lab tests ordered..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Follow-up Date</label>
              <input
                type="date"
                value={form.follow_up_date}
                onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="confidential"
                checked={form.is_confidential}
                onChange={e => setForm(f => ({ ...f, is_confidential: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="confidential" className="text-xs text-slate-600 font-medium">Confidential Record</label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2"
            >
              {submitting ? "Saving..." : "Save EMR Record"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 5. Create Prescription Modal ───────────────────────────────────────────────
export function CreatePrescriptionModal({
  open, onClose, clinicId, patientId, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  patientId?: string;
  onSuccess: () => void;
}) {
  const [selectedPatientId, setSelectedPatientId] = useState(patientId || "");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([
    { medication_name: "Cetirizine 10mg", dosage: "1 tablet", frequency: "Once daily (1-0-0)", duration: "7 days", route: "oral", instructions: "Take at bedtime" },
  ]);
  const [patients, setPatients] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (patientId) setSelectedPatientId(patientId);
  }, [patientId]);

  useEffect(() => {
    if (open && clinicId && clinicId !== "0") {
      patientsApi.getByClinic(clinicId, { limit: 100 }).then(res => setPatients(res.data.patients || [])).catch(() => {});
    }
  }, [open, clinicId]);

  if (!open) return null;

  const handleAddItem = () => {
    setItems([...items, { medication_name: "", dosage: "1 tablet", frequency: "Twice daily (1-0-1)", duration: "7 days", route: "oral", instructions: "Take after meals" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const next = [...items];
    (next[index] as any)[field] = value;
    setItems(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      setError("Please select a patient");
      return;
    }
    if (!diagnosis.trim()) {
      setError("Diagnosis is required");
      return;
    }
    const validItems = items.filter(i => i.medication_name.trim());
    if (validItems.length === 0) {
      setError("At least one medication is required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await prescriptionsApi.create(clinicId, {
        patient_id: selectedPatientId,
        diagnosis: diagnosis.trim(),
        notes: notes || null,
        items: validItems,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create prescription");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold">
              <Pill size={16} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Create Digital Prescription</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Patient *</label>
            <select
              value={selectedPatientId}
              onChange={e => setSelectedPatientId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="">-- Choose Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.phone || p.email || 'No contact'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Diagnosis *</label>
            <input
              value={diagnosis}
              onChange={e => setDiagnosis(e.target.value)}
              placeholder="e.g. Seasonal Allergic Rhinitis, Type 2 Diabetes"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600">Medications List *</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus size={13} /> Add Medicine
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 border border-gray-200 rounded-xl space-y-2 relative group">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      placeholder="Medication Name (e.g. Amoxicillin 500mg)"
                      value={item.medication_name}
                      onChange={e => handleItemChange(idx, "medication_name", e.target.value)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      required
                    />
                    <input
                      placeholder="Dosage (e.g. 1 tablet, 5ml)"
                      value={item.dosage}
                      onChange={e => handleItemChange(idx, "dosage", e.target.value)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      placeholder="Frequency (e.g. 1-0-1)"
                      value={item.frequency}
                      onChange={e => handleItemChange(idx, "frequency", e.target.value)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      placeholder="Duration (e.g. 7 days)"
                      value={item.duration}
                      onChange={e => handleItemChange(idx, "duration", e.target.value)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      placeholder="Instructions (e.g. After meals)"
                      value={item.instructions}
                      onChange={e => handleItemChange(idx, "instructions", e.target.value)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Doctor Advice / Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Drink plenty of fluids, avoid allergens, follow up in 2 weeks..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2"
            >
              {submitting ? "Issuing..." : "Issue Prescription"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 6. View Prescription Modal ────────────────────────────────────────────────
export function ViewPrescriptionModal({
  open, onClose, prescription,
}: {
  open: boolean;
  onClose: () => void;
  prescription: any;
}) {
  if (!open || !prescription) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Pill size={18} className="text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">Digital Prescription</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-white flex items-center gap-1.5 text-slate-700">
              <Printer size={13} /> Print Rx
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
          </div>
        </div>

        <div className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-gray-100 pb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">{prescription.clinic_name || "Rahman Medical Center"}</h3>
              <p className="text-xs text-slate-500">Doctor: Dr. {prescription.doctor_first_name} {prescription.doctor_last_name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono font-bold text-slate-900">Rx Date: {new Date(prescription.created_at || Date.now()).toLocaleDateString()}</p>
              <p className="text-xs text-slate-500">Rx ID: {prescription.id?.substring(0, 8)}</p>
            </div>
          </div>

          {/* Patient Info */}
          <div className="p-4 bg-slate-50 rounded-xl flex justify-between items-center text-xs text-slate-700">
            <div>
              <span className="font-semibold text-slate-500 uppercase tracking-wide">Patient: </span>
              <span className="font-bold text-slate-900">{prescription.patient_first_name} {prescription.patient_last_name}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-500 uppercase tracking-wide">Diagnosis: </span>
              <span className="font-bold text-indigo-700">{prescription.diagnosis}</span>
            </div>
          </div>

          {/* Medications Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Prescribed Medications</h4>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-gray-100 text-slate-500 font-semibold">
                  <tr>
                    <th className="p-3">Medicine</th>
                    <th className="p-3">Dosage</th>
                    <th className="p-3">Frequency</th>
                    <th className="p-3">Duration</th>
                    <th className="p-3">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-slate-700">
                  {(prescription.items || []).length > 0 ? (
                    prescription.items.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900">{item.medication_name}</td>
                        <td className="p-3">{item.dosage || "1 dose"}</td>
                        <td className="p-3">{item.frequency || "Once daily"}</td>
                        <td className="p-3">{item.duration || "7 days"}</td>
                        <td className="p-3 text-slate-500">{item.instructions || "As directed"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">No medication items listed</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Advice / Notes */}
          {prescription.notes && (
            <div className="p-4 bg-amber-50/40 border border-amber-100 rounded-xl">
              <h5 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Doctor Advice</h5>
              <p className="text-xs text-amber-900 leading-relaxed">{prescription.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 7. Add Patient Modal ───────────────────────────────────────────────────────
export function AddPatientModal({
  open, onClose, clinicId, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    date_of_birth: "",
    gender: "male",
    blood_group: "O+",
    allergies: "",
    chronic_conditions: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First and last names are required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await patientsApi.create(clinicId, form);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to register patient");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Register New Patient</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">{error}</div>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">First Name *</label>
              <input
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                placeholder="Sarah"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Last Name *</label>
              <input
                value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                placeholder="Johnson"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number</label>
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+1 (555) 000-0000"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="patient@example.com"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date of Birth</label>
              <input
                type="date"
                value={form.date_of_birth}
                onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Gender</label>
              <select
                value={form.gender}
                onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Blood Group</label>
              <select
                value={form.blood_group}
                onChange={e => setForm(f => ({ ...f, blood_group: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {["O+","O-","A+","A-","B+","B-","AB+","AB-"].map(bg => <option key={bg} value={bg}>{bg}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Known Allergies</label>
              <input
                value={form.allergies}
                onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))}
                placeholder="e.g. Penicillin, Peanuts"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Chronic Conditions</label>
              <input
                value={form.chronic_conditions}
                onChange={e => setForm(f => ({ ...f, chronic_conditions: e.target.value }))}
                placeholder="e.g. Hypertension, Asthma"
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {submitting ? "Registering..." : "Add Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 8. Create Invoice Modal ────────────────────────────────────────────────────
export function CreateInvoiceModal({
  open, onClose, clinicId, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    patient_id: "",
    amount: 500,
    discount: 0,
    tax: 0,
    payment_method: "cash",
    payment_status: "completed",
    notes: "",
  });
  const [patients, setPatients] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && clinicId && clinicId !== "0") {
      patientsApi.getByClinic(clinicId, { limit: 100 }).then(res => setPatients(res.data.patients || [])).catch(() => {});
    }
  }, [open, clinicId]);

  if (!open) return null;

  const total = Math.max(0, parseFloat(form.amount.toString()) - parseFloat(form.discount.toString() || "0") + parseFloat(form.tax.toString() || "0"));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_id) {
      setError("Please select a patient");
      return;
    }
    if (!form.amount || form.amount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await paymentsApi.create(clinicId, form);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-green-600" />
            <h2 className="text-lg font-bold text-slate-900">Generate Invoice</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Patient *</label>
            <select
              value={form.patient_id}
              onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="">-- Choose Patient --</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Amount ($) *</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Discount ($)</label>
              <input
                type="number"
                value={form.discount}
                onChange={e => setForm(f => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tax ($)</label>
              <input
                type="number"
                value={form.tax}
                onChange={e => setForm(f => ({ ...f, tax: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 rounded-xl flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Total Billed:</span>
            <span className="text-lg font-bold text-blue-700">${total}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Method</label>
              <select
                value={form.payment_method}
                onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile_banking">Mobile Banking (bKash/Nagad)</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Payment Status</label>
              <select
                value={form.payment_status}
                onChange={e => setForm(f => ({ ...f, payment_status: e.target.value }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
              >
                <option value="completed">Paid (Completed)</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {submitting ? "Generating..." : "Create Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 9. Create Service Modal ─────────────────────────────────────────────────────
export function CreateServiceModal({
  open, onClose, clinicId, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    duration_minutes: 30,
    price: 500,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Service name is required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await clinicsApi.createService(clinicId, form);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create service");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-slate-900">Add Clinic Service</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Service Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Cardiology Consultation"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Duration (mins)</label>
              <input
                type="number"
                value={form.duration_minutes}
                onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 30 }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fee / Price ($)</label>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of consultation service..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2"
            >
              {submitting ? "Adding..." : "Add Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 10. Edit Service Modal ─────────────────────────────────────────────────────
export function EditServiceModal({
  open, onClose, service, clinicId, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  service: any;
  clinicId: string;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    duration_minutes: 30,
    price: 500,
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (service) {
      setForm({
        name: service.name || "",
        description: service.description || "",
        duration_minutes: parseInt(service.duration_minutes || service.duration?.replace(" min", ""), 10) || 30,
        price: parseFloat(service.price || service.fee) || 0,
        is_active: Boolean(service.is_active !== undefined ? service.is_active : service.active),
      });
    }
  }, [service]);

  if (!open || !service) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await clinicsApi.updateService(clinicId, service.id, form);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update service");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-slate-900">Edit Service</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Service Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Duration (mins)</label>
              <input
                type="number"
                value={form.duration_minutes}
                onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || 30 }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fee / Price ($)</label>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="service_active"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <label htmlFor="service_active" className="text-xs text-slate-700 font-medium">Service is active & available for booking</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {submitting ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 11. Create Package Modal ───────────────────────────────────────────────────
export function CreatePackageModal({
  open, onClose, clinicId, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    sessions_count: 3,
    price: 1200,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Package name is required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await clinicsApi.createPackage(clinicId, form);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create package");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-slate-900">Create Care Package</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Package Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Hypertension Care Bundle"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Sessions Count</label>
              <input
                type="number"
                value={form.sessions_count}
                onChange={e => setForm(f => ({ ...f, sessions_count: parseInt(e.target.value) || 1 }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Package Price ($)</label>
              <input
                type="number"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Includes 3 consultations, priority bookings, and diet planning..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {submitting ? "Creating..." : "Save Package"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 12. Add Staff Modal ────────────────────────────────────────────────────────
export function AddStaffModal({
  open, onClose, clinicId, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("assistant");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Staff user email is required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await clinicsApi.addStaff(clinicId, email.trim(), role);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add staff member. User must be registered in the system.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-slate-900">Add Staff Member</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">User Email *</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. assistant@clinic-os.com"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">The user must have an existing ClinicOS account.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Clinic Role *</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="assistant">Clinic Assistant</option>
              <option value="doctor">Associate Doctor</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {submitting ? "Adding..." : "Add to Clinic"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 13. Pay Invoice Modal ──────────────────────────────────────────────────────
export function PayInvoiceModal({
  open, onClose, invoice, clinicId, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  invoice: any;
  clinicId?: string;
  onSuccess: () => void;
}) {
  const [method, setMethod] = useState("card");
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  if (!open || !invoice) return null;

  const handlePay = async () => {
    setSubmitting(true);
    setError("");
    try {
      const activeClinicId = clinicId || invoice.clinic_id || "0";
      await paymentsApi.updateStatus(activeClinicId, invoice.id, "completed", "TXN-" + Math.floor(100000 + Math.random() * 900000));
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to record payment on server");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Simulated Payment Settlement</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">{error}</div>}
          {success ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                <Check size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Simulated Payment Recorded!</h3>
              <p className="text-xs text-slate-500">Invoice {invoice.invoice_number || invoice.id} successfully settled.</p>
            </div>
          ) : (
            <>
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-700 font-medium">
                💳 <strong>Simulated Sandbox:</strong> Payments are processed in simulation mode for university evaluation. No real currency will be charged.
              </div>

              <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Invoice Number</p>
                  <p className="text-sm font-mono font-bold text-slate-900">{invoice.invoice_number || invoice.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-slate-400">Amount Due</p>
                  <p className="text-xl font-extrabold text-blue-600">${invoice.total_amount || invoice.amount}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "cash", label: "Cash" },
                    { id: "card", label: "Credit Card" },
                    { id: "mobile_banking", label: "Mobile Banking" },
                    { id: "online", label: "Online Gateway" },
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                        method === m.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-600 border-gray-200 hover:bg-slate-50"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={submitting}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2"
                >
                  {submitting ? "Saving..." : `Record $${invoice.total_amount || invoice.amount} Paid`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 14. Submit Review Modal ────────────────────────────────────────────────────
export function SubmitReviewModal({
  open, onClose, clinicId, appointmentId, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  appointmentId?: string;
  onSuccess: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointmentId) {
      setError("Please select a completed appointment to review.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await reviewsApi.create(clinicId, { rating, comment, appointment_id: appointmentId });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-slate-900">Leave Doctor Review</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Rating</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    size={24}
                    className={star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}
                  />
                </button>
              ))}
              <span className="text-sm font-bold text-slate-700 ml-2">{rating} / 5</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Feedback / Comments</label>
            <textarea
              rows={4}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Share your consultation experience..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-50 rounded-xl transition-colors"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 15. Send Message Modal ─────────────────────────────────────────────────────
export function SendMessageModal({
  open, onClose, receiverId, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  receiverId?: string;
  onSuccess: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await messagesApi.sendMessage({
        receiver_id: receiverId || "doctor",
        subject,
        message,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Send size={18} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Send Direct Message</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Subject</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Query regarding prescription medication"
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Message *</label>
            <textarea
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



// ── 17. View Medical Record Modal ──────────────────────────────────────────────
export function ViewMedicalRecordModal({
  open, onClose, record,
}: {
  open: boolean;
  onClose: () => void;
  record: any;
}) {
  if (!open || !record) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <FileText size={16} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Medical Record Details</h2>
              <p className="text-xs text-slate-400">{record.created_at ? new Date(record.created_at).toLocaleDateString() : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <p className="font-semibold text-slate-700">Doctor: Dr. {record.doctor_first_name} {record.doctor_last_name || ''}</p>
            <p className="text-slate-500">Clinic: {record.clinic_name || 'Clinic'}</p>
          </div>

          <div>
            <p className="font-semibold text-slate-500 uppercase tracking-wider mb-1">Diagnosis</p>
            <p className="text-sm font-bold text-slate-900 bg-blue-50/50 p-2.5 rounded-xl border border-blue-100/50">{record.diagnosis || 'General'}</p>
          </div>

          {record.symptoms && (
            <div>
              <p className="font-semibold text-slate-500 uppercase tracking-wider mb-1">Symptoms / Chief Complaints</p>
              <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl">{record.symptoms}</p>
            </div>
          )}

          {record.treatment_plan && (
            <div>
              <p className="font-semibold text-slate-500 uppercase tracking-wider mb-1">Treatment Plan</p>
              <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl whitespace-pre-wrap">{record.treatment_plan}</p>
            </div>
          )}

          {record.notes && (
            <div>
              <p className="font-semibold text-slate-500 uppercase tracking-wider mb-1">Clinical Notes</p>
              <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl whitespace-pre-wrap">{record.notes}</p>
            </div>
          )}

          {record.follow_up_date && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 font-semibold">
              Follow-up Scheduled: {new Date(record.follow_up_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
