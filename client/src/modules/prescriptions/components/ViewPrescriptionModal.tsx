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
export function ViewPrescriptionModal({
  open, onClose, prescription,
}: {
  open: boolean;
  onClose: () => void;
  prescription: any;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const prescriptionRef = useRef<HTMLDivElement>(null);

  if (!open || !prescription) return null;

  const downloadPdf = () => {
    setDownloading(true);
    setDownloadError("");
    try {
      generatePrescriptionPdf(prescription);
    } catch (err: any) {
      setDownloadError("Unable to generate PDF. Please try again or use Print.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <button
              onClick={downloadPdf}
              disabled={downloading}
              className="px-3.5 py-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Download size={13} /> {downloading ? "Generating PDF..." : "Download PDF"}
            </button>
            <Pill size={18} className="text-teal-600 ml-2" />
            <h2 className="text-base font-bold text-slate-900">Digital Prescription</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => printPrescription(prescription)}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-white flex items-center gap-1.5 text-slate-700 transition-colors cursor-pointer"
            >
              <Printer size={13} /> Print Rx
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors ml-1" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {downloadError && (
          <div role="alert" className="mx-6 mt-4 p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-100">
            {downloadError}
          </div>
        )}

        <div className="overflow-y-auto flex-1 p-6 bg-slate-100/50">
          <div className="rounded-xl shadow-xs border border-slate-200/80 overflow-hidden">
            <PrescriptionDocument ref={prescriptionRef} prescription={prescription} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 7. Add Patient Modal ───────────────────────────────────────────────────────
