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
export function SendMessageModal({
  open, onClose, receiverId, receiverName, senderId, senderName, onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  receiverId?: string;
  receiverName?: string;
  senderId?: string;
  senderName?: string;
  onSuccess: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [recipients, setRecipients] = useState<any[]>([]);
  const [selectedReceiverId, setSelectedReceiverId] = useState(receiverId || "");

  useEffect(() => {
    if (!open) return;
    setSelectedReceiverId(receiverId || "");
    messagesApi.getRecipients()
      .then(response => setRecipients(response.data?.recipients || []))
      .catch(err => setError(err.response?.data?.message || "Unable to load authorized message recipients."));
  }, [open, receiverId]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    if (!selectedReceiverId) {
      setError("Please select a recipient before sending a message.");
      setSubmitting(false);
      return;
    }
    try {
      await messagesApi.sendMessage({
        sender_id: senderId,
        receiver_id: selectedReceiverId,
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="message-sender" className="block text-xs font-semibold text-slate-600 mb-1.5">From</label>
              <select id="message-sender" value={senderId || ""} disabled className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-slate-50 text-slate-700">
                <option value={senderId || ""}>{senderName || "Authenticated account"} ({getStoredUser()?.role || "user"})</option>
              </select>
            </div>
            <div>
              <label htmlFor="message-recipient" className="block text-xs font-semibold text-slate-600 mb-1.5">To</label>
              <select id="message-recipient" value={selectedReceiverId} onChange={event => setSelectedReceiverId(event.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-slate-700" required>
                <option value="">Select recipient</option>
                {receiverId && !recipients.some(recipient => recipient.id === receiverId) && <option value={receiverId}>{receiverName || "Selected recipient"}</option>}
                {recipients.map(recipient => <option key={recipient.id} value={recipient.id}>{recipient.role === "doctor" ? "Dr. " : ""}{recipient.first_name} {recipient.last_name} — {recipient.role}</option>)}
              </select>
            </div>
          </div>
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
              disabled={submitting || !selectedReceiverId || !message.trim()}
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
