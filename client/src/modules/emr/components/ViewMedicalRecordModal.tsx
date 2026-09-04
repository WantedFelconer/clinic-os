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
