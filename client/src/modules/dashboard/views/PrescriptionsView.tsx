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
export function PrescriptionsView({ selectedClinic }: { selectedClinic?: any }) {
  const [showRxModal, setShowRxModal] = useState(false);
  const [viewRx, setViewRx] = useState<any>(null);
  const [editRx, setEditRx] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPrescriptions = useCallback(async () => {
    if (selectedClinic?.id) {
      setLoading(true);
      setError("");
      try {
        const res = await prescriptionsApi.getByClinic(selectedClinic.id);
        setPrescriptions(res.data?.prescriptions || []);
      } catch (requestError) { setPrescriptions([]); setError(getApiErrorMessage(requestError, "Unable to load prescriptions.")); } finally {
        setLoading(false);
      }
    }
  }, [selectedClinic]);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  const handleOpenRx = async (rx: any) => {
    try {
      const res = await prescriptionsApi.getById(selectedClinic.id, rx.id);
      setViewRx(res.data?.prescription || rx);
    } catch {
      setViewRx(rx);
    }
  };

  const handleEditRx = async (rx: any) => {
    setError("");
    try {
      const res = await prescriptionsApi.getById(selectedClinic.id, rx.id);
      setEditRx(res.data?.prescription || rx);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load this prescription for editing."));
    }
  };

  const filtered = prescriptions.filter(rx =>
    (rx.patient_first_name ? `${rx.patient_first_name} ${rx.patient_last_name}` : '').toLowerCase().includes(search.toLowerCase()) ||
    (rx.diagnosis || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search prescriptions..."
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 bg-white"
          />
        </div>
        <Btn variant="primary" disabled={!selectedClinic?.id} onClick={() => { setEditRx(null); setShowRxModal(true); }}><Plus size={14} /> New Prescription</Btn>
      </div>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      <Card>
        <div className="divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">No prescriptions issued yet</div>
          ) : (
            filtered.map(rx => {
              const initials = `${rx.patient_first_name?.[0] || 'P'}${rx.patient_last_name?.[0] || 'T'}`.toUpperCase();
              return (
                <div key={rx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm flex items-center justify-center flex-shrink-0">{initials}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{rx.patient_first_name} {rx.patient_last_name}</span>
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-[11px] font-semibold">Active Rx</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{rx.diagnosis} · {rx.items_count || 0} medications · {new Date(rx.created_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleEditRx(rx)}
                    className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Edit size={13} /> Edit
                  </button>
                  <button
                    onClick={() => handleOpenRx(rx)}
                    className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Eye size={13} /> View & Print Rx
                  </button>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <CreatePrescriptionModal
        open={showRxModal || !!editRx}
        onClose={() => { setShowRxModal(false); setEditRx(null); }}
        clinicId={selectedClinic?.id || "0"}
        prescription={editRx}
        onSuccess={fetchPrescriptions}
      />

      <ViewPrescriptionModal
        open={!!viewRx}
        onClose={() => setViewRx(null)}
        prescription={viewRx}
      />
    </div>
  );
}
