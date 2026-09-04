/** Focused doctor-dashboard view. */
/** Domain module extracted from the ClinicOS application coordinator. */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  authApi, patientApi, setAuthToken, getStoredUser, getStoredToken, isAuthenticated,
  clinicsApi, appointmentsApi, patientsApi, medicalRecordsApi,
  prescriptionsApi, paymentsApi, reviewsApi, subscriptionsApi, adminApi, messagesApi, doctorsApi, getApiErrorMessage,
} from "../../../app/api";
import {
  BookAppointmentModal, RescheduleModal, CancelAppointmentModal,
  CreateEMRModal, CreatePrescriptionModal, ViewPrescriptionModal, ViewMedicalRecordModal,
  CreateServiceModal, EditServiceModal, CreatePackageModal,
  AddPatientModal, CreateInvoiceModal, PayInvoiceModal, SubmitReviewModal,
  SendMessageModal, AddStaffModal, UploadMedicalReportModal,
} from "../../modals";
import { PrescriptionDocument } from "../../prescriptions/components/PrescriptionDocument";
import { generatePrescriptionPdf } from "../../prescriptions/prescriptionPdf";
import {
  LayoutDashboard, Calendar, Users, FileText, Pill, BarChart3,
  Settings, Bell, Search, Plus, Star, CheckCircle, Clock,
  TrendingUp, ArrowRight, Menu, X, Stethoscope, LogOut,
  ChevronRight, ChevronLeft, Filter, Eye, Edit, Trash2,
  Download, Phone, Mail, Package, CreditCard, Lock, Upload,
  ChevronDown, Check, Globe, Video, DollarSign, Sparkles,
  Shield, Building2, AlertCircle, MapPin, MessageSquare,
  Receipt, ClipboardList, Layers, HelpCircle, BookOpen,
  Award, Briefcase, Send, UserPlus, FileCheck, ChevronUp,
  Activity, Heart, Clipboard, MoreHorizontal, RefreshCw,
  UserCheck, PieChart as PieChartIcon, Inbox, BadgeCheck,
  Ban, TrendingDown, ExternalLink, Zap, Command, User,
  Keyboard,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Badge, Btn, Card, SectionLabel, Toggle, ApptBadge, PatientBadge, InvoiceBadge, ClinicStatusBadge, PlanBadge, NotifIcon, CHART_COLORS, ADMIN_PLAN_FEATURES, localDateString, shiftDate } from "../../shared/components/DesignSystem";
import { ClinicSubscriptionTab } from "../../clinics/views/ClinicSubscriptionTab";
export function BillingView({ selectedClinic }: { selectedClinic?: any }) {
  const [filter, setFilter] = useState("all");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total_collected: 0, pending_amount: 0, overdue_amount: 0, total_invoices: 0 });
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedPayInvoice, setSelectedPayInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    if (selectedClinic?.id) {
      setLoading(true);
      try {
        const res = await paymentsApi.getByClinic(selectedClinic.id, { status: filter === "all" ? undefined : filter });
        setInvoices(res.data?.payments || []);
        if (res.data?.summary) {
          setSummary(res.data.summary);
        }
      } catch (requestError) { setInvoices([]); alert(getApiErrorMessage(requestError, "Unable to load billing data.")); } finally {
        setLoading(false);
      }
    }
  }, [selectedClinic, filter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Collected",    value: `$${(summary.total_collected || 0).toLocaleString()}`, Icon: DollarSign,  bg: "bg-green-50 text-green-600",  sub: "Received revenue" },
          { label: "Pending Invoices",   value: `$${(summary.pending_amount || 0).toLocaleString()}`,   Icon: Clock,        bg: "bg-amber-50 text-amber-600",  sub: "Awaiting settlement" },
          { label: "Failed / Overdue",   value: `$${(summary.overdue_amount || 0).toLocaleString()}`,   Icon: AlertCircle,  bg: "bg-red-50 text-red-600",      sub: "Requires follow-up" },
          { label: "Total Invoices",     value: (summary.total_invoices || invoices.length).toString(),  Icon: Receipt,      bg: "bg-blue-50 text-blue-600",    sub: "Generated records" },
        ].map(s => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}><s.Icon size={15} /></div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-0.5">{s.value}</div>
            <p className="text-xs text-slate-400">{s.sub}</p>
          </Card>
        ))}
      </div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {[
            { id: "all", label: "All" },
            { id: "completed", label: "Paid" },
            { id: "pending", label: "Pending" },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.id ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-200 text-slate-600 hover:bg-slate-50"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <Btn variant="primary" onClick={() => setShowInvoiceModal(true)}><Plus size={14} /> Generate Invoice</Btn>
      </div>
      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              {["Invoice #", "Patient", "Service / Desc", "Date", "Amount", "Status", ""].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-400 px-6 py-4 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-slate-400">No invoices generated yet</td>
              </tr>
            ) : (
              invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-xs font-mono font-bold text-blue-600">{inv.invoice_number}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{inv.patient_first_name} {inv.patient_last_name}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{inv.service_name || inv.notes || "Medical Service"}</td>
                  <td className="px-6 py-4 text-xs text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">${inv.total_amount}</td>
                  <td className="px-6 py-4">
                    <InvoiceBadge status={inv.payment_status === "completed" ? "Paid" : "Pending"} />
                  </td>
                  <td className="px-4 py-4 text-right">
                    {inv.payment_status !== "completed" && (
                      <button
                        onClick={() => setSelectedPayInvoice(inv)}
                        className="px-3 py-1.5 text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-1 ml-auto"
                      >
                        <CreditCard size={12} /> Record Pay
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <CreateInvoiceModal
        open={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        clinicId={selectedClinic?.id || "0"}
        onSuccess={fetchPayments}
      />

      <PayInvoiceModal
        open={!!selectedPayInvoice}
        onClose={() => setSelectedPayInvoice(null)}
        invoice={selectedPayInvoice}
        clinicId={selectedClinic?.id || "0"}
        onSuccess={fetchPayments}
      />
    </div>
  );
}
