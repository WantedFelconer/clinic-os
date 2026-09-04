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
