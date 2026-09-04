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
