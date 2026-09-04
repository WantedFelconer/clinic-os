/**
 * Domain-owned modal implementation extracted from the former application-wide
 * modal bundle. Keeping the workflow beside its domain prevents cross-feature
 * changes from growing a shared god file again.
 */
import { useState, useEffect, useRef } from "react";
import {
  X, Check, Plus, Trash2, Star, CreditCard, Send, Calendar,
  FileText, Pill, Package, Building2, User, Clock, AlertCircle,
  Printer, DollarSign, UserPlus, Phone, Mail, MapPin, Edit,
  Shield, CheckCircle2, RefreshCw, Download
} from "lucide-react";
import {
  appointmentsApi, medicalRecordsApi, prescriptionsApi,
  clinicsApi, paymentsApi, patientsApi, reviewsApi, messagesApi,
  medicalReportsApi, getStoredUser,
} from "../../../app/api";
import { PrescriptionDocument } from "../../prescriptions/components/PrescriptionDocument";
import { generatePrescriptionPdf, printPrescription } from "../../prescriptions/prescriptionPdf";

const localDate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
export function BookAppointmentModal({
  open, onClose, clinicId, patientId, doctorId, appointmentDate,
  isPatient: isPatientProp, clinicsList, onSuccess,
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
}) {
  const storedUser = getStoredUser();
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
    appointment_date: localDate(1),
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

  useEffect(() => {
    if (!open) return;

    const nextClinicId = clinicId && clinicId !== "0" ? clinicId : "";
    setSelectedClinicId(nextClinicId);
    setForm(f => ({
      ...f,
      patient_id: isPatient ? (patientId || "") : (patientId || f.patient_id),
      doctor_id: doctorId || "",
      service_id: "",
      start_time: "",
      end_time: "",
    }));
  }, [open, clinicId, doctorId, patientId, isPatient]);

  useEffect(() => {
    if (clinicsList) setAvailableClinics(clinicsList);
  }, [clinicsList]);

  useEffect(() => {
    if (!open || (selectedClinicId && selectedClinicId !== "0") || availableClinics.length) return;
    clinicsApi.search({ limit: 50 })
      .then(res => setAvailableClinics(res.data?.clinics || []))
      .catch(() => setError("Unable to load clinics. Please try again."));
  }, [open, selectedClinicId, availableClinics.length]);

  useEffect(() => {
    if (patientId) {
      setForm(f => ({ ...f, patient_id: patientId }));
    }
  }, [patientId]);

  useEffect(() => {
    if (appointmentDate) setForm(f => ({ ...f, appointment_date: appointmentDate, start_time: "", end_time: "" }));
  }, [appointmentDate]);

  useEffect(() => {
    if (open && selectedClinicId && selectedClinicId !== "0") {
      setLoadingOptions(true);
      setError("");
      Promise.all([
        clinicsApi.getServices(selectedClinicId),
        clinicsApi.getById(selectedClinicId),
        isPatient ? Promise.resolve(null) : patientsApi.getByClinic(selectedClinicId, { limit: 100 }),
      ]).then(([serviceRes, clinicRes, patientRes]) => {
        const availableDoctors = clinicRes?.data?.staff || [];
        setServices(serviceRes?.data?.services || []);
        setDoctors(availableDoctors);
        setPatients(patientRes?.data?.patients || []);
        setForm(f => ({
          ...f,
          patient_id: isPatient ? (patientId || "") : (patientId || f.patient_id),
          doctor_id: doctorId || f.doctor_id,
          start_time: "",
          end_time: "",
        }));
      }).catch(() => setError("Unable to load doctors and booking options for this clinic."))
        .finally(() => setLoadingOptions(false));
    } else if (open) {
      setServices([]);
      setPatients([]);
      setDoctors([]);
      setSlots([]);
    }
  }, [open, selectedClinicId, doctorId, patientId, isPatient]);

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
    }).then(res => setSlots((res.data?.slots || []).filter((slot: any) => slot.available)))
      .catch(err => setError(err.response?.data?.message || "Unable to load available times."))
      .finally(() => setLoadingSlots(false));
  }, [open, selectedClinicId, form.doctor_id, form.appointment_date, form.service_id]);

  if (!open) return null;

  const handleServiceChange = (serviceId: string) => {
    setForm(f => ({ ...f, service_id: serviceId, start_time: "", end_time: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinicId || selectedClinicId === "0" || selectedClinicId === "undefined") {
      setError("Please select a clinic before booking an appointment.");
      return;
    }
    if (!isPatient && !form.patient_id) {
      setError("Please select a patient");
      return;
    }
    if (!form.doctor_id) {
      setError("Please select a doctor.");
      return;
    }
    if (!form.appointment_date || !form.start_time || !form.end_time) {
      setError("Please select a date and an available time.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await appointmentsApi.create(selectedClinicId, {
        ...form,
        service_id: form.service_id && form.service_id.trim() !== "" ? form.service_id.trim() : undefined,
      });
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

          {(!clinicId || clinicId === "0") && <div>
            <label htmlFor="booking-clinic" className="block text-xs font-semibold text-slate-600 mb-1.5">Clinic *</label>
            <select
              id="booking-clinic"
              value={selectedClinicId}
              onChange={e => {
                setSelectedClinicId(e.target.value);
                setForm(f => ({ ...f, doctor_id: "", service_id: "", start_time: "", end_time: "" }));
              }}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              required
            >
              <option value="">-- Choose Clinic --</option>
              {availableClinics.map(clinic => <option key={clinic.id} value={clinic.id}>{clinic.name}{clinic.city ? ` — ${clinic.city}` : ""}</option>)}
            </select>
          </div>}

          {isPatient ? (
            <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-3">
              <p className="text-xs font-semibold text-teal-800 flex items-center gap-1.5"><User size={14} /> Patient</p>
              <p className="text-sm font-bold text-slate-900">Booking for yourself {patientDisplayName ? `(${patientDisplayName})` : ""}</p>
            </div>
          ) : <div>
            <label htmlFor="booking-patient" className="block text-xs font-semibold text-slate-600 mb-1.5">Patient *</label>
            <select
              id="booking-patient"
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
          </div>}

          <div>
            <label htmlFor="booking-doctor" className="block text-xs font-semibold text-slate-600 mb-1.5">Doctor *</label>
            <select id="booking-doctor" value={form.doctor_id} disabled={!selectedClinicId || selectedClinicId === "0" || loadingOptions}
              onChange={e => setForm(f => ({ ...f, doctor_id: e.target.value, start_time: "", end_time: "" }))}
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50" required>
              <option value="">{loadingOptions ? "Loading doctors..." : "-- Select Doctor --"}</option>
              {doctors.map((doctor: any) => {
                const id = doctor.doctor_id || doctor.user_id || doctor.id;
                const hasDrPrefix = (doctor.first_name || "").trim().toLowerCase().startsWith("dr");
                const prefix = hasDrPrefix ? "" : "Dr. ";
                return <option key={id} value={id}>{prefix}{doctor.first_name} {doctor.last_name} — {doctor.specialization || "General Medicine"}</option>;
              })}
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
                min={localDate()}
                value={form.appointment_date}
                onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value, start_time: "", end_time: "" }))}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex items-end"><div className="w-full rounded-xl border border-gray-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">{form.start_time ? `${form.start_time}–${form.end_time}` : "Choose a slot below"}</div></div>
          </div>

          <fieldset>
            <legend className="block text-xs font-semibold text-slate-600 mb-2">Available times *</legend>
            {loadingSlots ? <p className="text-xs text-slate-500 py-3" role="status">Loading availability...</p> : slots.length ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((slot: any) => <button type="button" key={slot.start_time} onClick={() => setForm(f => ({ ...f, start_time: slot.start_time, end_time: slot.end_time }))}
                  className={`min-h-10 rounded-xl border text-xs font-semibold ${form.start_time === slot.start_time ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-slate-700 hover:border-blue-300"}`}>{slot.start_time}</button>)}
              </div>
            ) : <p className="text-xs text-slate-500 rounded-xl bg-slate-50 p-3">No available slots for this doctor and date.</p>}
          </fieldset>

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
              disabled={submitting || loadingOptions || loadingSlots || !form.start_time || !selectedClinicId || selectedClinicId === "0"}
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
