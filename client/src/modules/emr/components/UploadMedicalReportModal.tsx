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
export function UploadMedicalReportModal({ open, onClose, clinicId, patientId, onSuccess }: { open: boolean; onClose: () => void; clinicId: string; patientId: string; onSuccess?: () => void }) {
  const [form, setForm] = useState({ title: '', report_type: 'Lab Result', file_name: '', file_url: '', description: '', report_date: localDate() });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  if (!open) return null;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await medicalReportsApi.create(clinicId, { ...form, patient_id: patientId });
      onSuccess?.(); onClose();
    } catch (err: any) { setError(err.response?.data?.message || 'Unable to save medical report'); }
    finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}><form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4"><div className="flex justify-between"><div><h2 className="font-bold text-slate-900">Upload Medical Report</h2><p className="text-xs text-slate-500">Store document metadata and a simulated or HTTPS reference.</p></div><button type="button" onClick={onClose}><X size={18}/></button></div>{error && <p className="text-xs text-rose-700 bg-rose-50 p-2 rounded">{error}</p>}<input required placeholder="Report title" value={form.title} onChange={e => setForm({...form,title:e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm"/><div className="grid grid-cols-2 gap-3"><select value={form.report_type} onChange={e => setForm({...form,report_type:e.target.value})} className="border rounded-xl px-3 py-2 text-sm"><option>Lab Result</option><option>Imaging</option><option>Pathology</option><option>Other</option></select><input type="date" value={form.report_date} onChange={e => setForm({...form,report_date:e.target.value})} className="border rounded-xl px-3 py-2 text-sm"/></div><input required placeholder="File name (e.g. cbc-results.pdf)" value={form.file_name} onChange={e => setForm({...form,file_name:e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm"/><input required placeholder="https://... or simulated://reports/..." value={form.file_url} onChange={e => setForm({...form,file_url:e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm"/><textarea placeholder="Description" value={form.description} onChange={e => setForm({...form,description:e.target.value})} className="w-full border rounded-xl px-3 py-2 text-sm"/><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">{saving?'Saving...':'Save Report'}</button></div></form></div>;
}
