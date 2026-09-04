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
export function CreatePrescriptionModal({
  open, onClose, clinicId, patientId, appointmentId, prescription, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  clinicId: string;
  patientId?: string;
  appointmentId?: string;
  prescription?: any;
  onSuccess: () => void;
}) {
  const [selectedPatientId, setSelectedPatientId] = useState(patientId || "");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([
    { medication_name: "", dosage: "", frequency: "", duration: "", route: "", instructions: "" },
  ]);
  const [patients, setPatients] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (patientId) setSelectedPatientId(patientId);
  }, [patientId]);

  useEffect(() => {
    if (!open) return;
    if (prescription) {
      setSelectedPatientId(prescription.patient_id || "");
      setDiagnosis(prescription.diagnosis || "");
      setNotes(prescription.notes || "");
      setItems(prescription.items?.length ? prescription.items.map((item: any) => ({
        medication_name: item.medication_name || "", dosage: item.dosage || "", frequency: item.frequency || "",
        duration: item.duration || "", route: item.route || "", instructions: item.instructions || "",
      })) : [{ medication_name: "", dosage: "", frequency: "", duration: "", route: "", instructions: "" }]);
    } else {
      setSelectedPatientId(patientId || "");
      setDiagnosis("");
      setNotes("");
      setItems([{ medication_name: "", dosage: "", frequency: "", duration: "", route: "", instructions: "" }]);
    }
    setError("");
  }, [open, prescription, patientId]);

  useEffect(() => {
    if (open && clinicId && clinicId !== "0") {
      patientsApi.getByClinic(clinicId, { limit: 100 }).then(res => setPatients(res.data.patients || [])).catch(err => setError(err.response?.data?.message || "Unable to load this clinic's patients."));
    }
  }, [open, clinicId]);

  if (!open) return null;

  const handleAddItem = () => {
    setItems([...items, { medication_name: "", dosage: "", frequency: "", duration: "", route: "", instructions: "" }]);
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
    const validItems = items.filter(i => i.medication_name.trim() || i.dosage.trim() || i.frequency.trim());
    if (validItems.length === 0 || validItems.some(i => !i.medication_name.trim() || !i.dosage.trim() || !i.frequency.trim())) {
      setError("Each medication requires a name, dosage, and frequency.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        patient_id: selectedPatientId,
        appointment_id: appointmentId || undefined,
        diagnosis: diagnosis.trim(),
        notes: notes || null,
        items: validItems,
      };
      if (prescription?.id) await prescriptionsApi.update(clinicId, prescription.id, payload);
      else await prescriptionsApi.create(clinicId, payload);
      setDiagnosis("");
      setNotes("");
      setItems([{ medication_name: "", dosage: "", frequency: "", duration: "", route: "", instructions: "" }]);
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
            <h2 className="text-lg font-bold text-slate-900">{prescription ? "Edit Digital Prescription" : "Create Digital Prescription"}</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium">{error}</div>}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Patient *</label>
            <select
              value={selectedPatientId}
              disabled={Boolean(prescription)}
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
