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
                min={localDate()}
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
