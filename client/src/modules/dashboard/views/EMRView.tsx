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
export function EMRView({ selectedClinic }: { selectedClinic?: any }) {
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [showEmrModal, setShowEmrModal] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (selectedClinic?.id) {
      setLoading(true);
      try {
        const res = await medicalRecordsApi.getByClinic(selectedClinic.id);
        setRecords(res.data?.records || []);
      } catch (requestError) { setRecords([]); alert(getApiErrorMessage(requestError, "Unable to load medical records.")); } finally {
        setLoading(false);
      }
    }
  }, [selectedClinic]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const filtered = records.filter(r =>
    (r.patient_first_name ? `${r.patient_first_name} ${r.patient_last_name}` : '').toLowerCase().includes(search.toLowerCase()) ||
    (r.diagnosis || '').toLowerCase().includes(search.toLowerCase())
  );

  if (selected !== null) {
    const record = selected;
    return (
      <div className="p-8 space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ChevronRight size={13} className="rotate-180" /> Back to Records
        </button>
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{record.patient_first_name} {record.patient_last_name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Recorded on {new Date(record.created_at).toLocaleDateString()}</p>
            </div>
            {record.is_confidential && <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-semibold">Confidential</span>}
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Primary Diagnosis</h4>
              <p className="text-base font-bold text-slate-900">{record.diagnosis}</p>
            </div>
            {record.symptoms && (
              <div className="p-4 border border-gray-100 rounded-xl">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Symptoms / Subjective</h4>
                <p className="text-xs text-slate-700 leading-relaxed">{record.symptoms}</p>
              </div>
            )}
            {record.treatment_plan && (
              <div className="p-4 border border-gray-100 rounded-xl">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Treatment Plan / Assessment</h4>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{record.treatment_plan}</p>
              </div>
            )}
            {record.follow_up_date && (
              <div className="p-3 bg-blue-50/50 rounded-xl text-xs text-blue-800 font-semibold">
                Scheduled Follow-up: {record.follow_up_date}
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search records by diagnosis, patient..."
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 bg-white"
          />
        </div>
        <Btn variant="primary" onClick={() => setShowEmrModal(true)}><Plus size={14} /> New EMR Record</Btn>
      </div>
      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              {["Patient", "Diagnosis", "Date", "Follow-up", ""].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-400 px-6 py-4 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-slate-400">No clinical records found</td>
              </tr>
            ) : (
              filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-900">{r.patient_first_name} {r.patient_last_name}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-700">{r.diagnosis}</td>
                  <td className="px-6 py-4 text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-xs text-slate-500">{r.follow_up_date || "None"}</td>
                  <td className="px-4 py-4 text-right">
                    <button onClick={() => setSelected(r)} className="px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg">
                      View SOAP →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
      <CreateEMRModal
        open={showEmrModal}
        onClose={() => setShowEmrModal(false)}
        clinicId={selectedClinic?.id || "0"}
        onSuccess={fetchRecords}
      />
    </div>
  );
}
