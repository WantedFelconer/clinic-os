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
export function OverviewView({ setSection, selectedClinic }: { setSection: (s: string) => void; selectedClinic?: any }) {
  const [stats, setStats] = useState({ total_patients: 0, upcoming_appointments: 0, total_revenue: 0, packages_sold: 0 });
  const [todayAppts, setTodayAppts] = useState<any[]>([]);
  const [revenueTrends, setRevenueTrends] = useState<any[]>([]);
  const [visitDistribution, setVisitDistribution] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = getStoredUser();

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const clinic = selectedClinic;
      if (clinic?.id) {
        const dashRes = await clinicsApi.getDashboard(clinic.id);
        const statsData = dashRes.data?.stats || {};
        setStats({
          total_patients: statsData.total_patients || 0,
          upcoming_appointments: statsData.upcoming_appointments || 0,
          total_revenue: statsData.total_revenue || 0,
          packages_sold: statsData.packages_count || 0,
        });
        if (dashRes.data?.today_appointments) {
          setTodayAppts(dashRes.data.today_appointments.map((a: any) => ({
            id: a.id,
            patient: `${a.patient_first_name || 'Patient'} ${a.patient_last_name || ''}`.trim(),
            time: a.start_time?.substring(0, 5) || "10:00",
            type: a.service_name || a.type || "General Consultation",
            status: a.status === "scheduled" ? "Pending" : a.status === "confirmed" ? "Confirmed" : a.status === "in_progress" ? "In Progress" : a.status === "completed" ? "Completed" : "Cancelled",
            duration: `${a.service_duration || 30} min`,
            initials: `${a.patient_first_name?.[0] || "P"}${a.patient_last_name?.[0] || "T"}`.toUpperCase(),
            color: "bg-blue-100 text-blue-700",
          })));
        }
        if (dashRes.data?.monthly_revenue?.length) {
          setRevenueTrends(dashRes.data.monthly_revenue);
        } else {
          setRevenueTrends([
            { month: "Current", revenue: statsData.total_revenue || 0, appointments: statsData.total_appointments || 0 }
          ]);
        }
        if (dashRes.data?.visit_types?.length) {
          setVisitDistribution(dashRes.data.visit_types);
        } else {
          setVisitDistribution([]);
        }
      } else {
        setStats({ total_patients: 0, upcoming_appointments: 0, total_revenue: 0, packages_sold: 0 });
        setTodayAppts([]);
        setRevenueTrends([]);
        setVisitDistribution([]);
      }
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "Unable to load this clinic dashboard."));
    } finally {
      setLoading(false);
    }
  }, [selectedClinic]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; })();

  return (
    <div className="p-8 space-y-7">
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {!selectedClinic?.id && <div role="status" className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">Create or select an active clinic to begin managing your practice.</div>}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{greeting}, Dr. {user?.first_name || "Doctor"} 👋</h2>
          <p className="text-slate-500 text-sm mt-0.5">{today} · {stats.upcoming_appointments} upcoming appointments</p>
        </div>
        <Btn variant="primary" disabled={!selectedClinic?.id || loading} onClick={() => setSection("appointments")}><Plus size={14} /> New Appointment</Btn>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Patients",       value: stats.total_patients.toString(),     sub: "Registered clinic patients", Icon: Users,      bg: "bg-blue-50 text-blue-600" },
          { label: "Upcoming Appointments",value: stats.upcoming_appointments.toString(), sub: "Scheduled & confirmed",      Icon: Calendar,   bg: "bg-teal-50 text-teal-600" },
          { label: "Total Revenue",        value: `$${(stats.total_revenue || 0).toLocaleString()}`, sub: "Completed collections",  Icon: DollarSign, bg: "bg-green-50 text-green-600" },
          { label: "Active Care Packages", value: (stats.packages_sold || 0).toString(), sub: "Available bundles",        Icon: Package,    bg: "bg-amber-50 text-amber-600" },
        ].map(s => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}><s.Icon size={15} /></div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{s.value}</div>
            <p className="text-xs text-slate-400">{s.sub}</p>
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-900">Revenue Trends</h3>
              <p className="text-xs text-slate-400 mt-0.5">Database collected invoice metrics</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueTrends.length > 0 ? revenueTrends : [{ month: 'Current', revenue: stats.total_revenue }]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(val: number) => [`$${val.toLocaleString()}`, "Revenue"]} contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
              <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="#2563EB" fillOpacity={0.08} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-5">Consultation Types</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={visitDistribution} cx="50%" cy="50%" innerRadius={44} outerRadius={68} dataKey="value" paddingAngle={3}>
                {visitDistribution.map((_, i) => (
                  <Cell key={`overview-visit-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-5 space-y-2.5">
            {visitDistribution.length === 0 && <p className="text-center text-xs text-slate-400">No consultation data yet</p>}
            {visitDistribution.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-slate-600">{d.name}</span>
                </div>
                <span className="font-semibold text-slate-900">{d.value || 0}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-slate-900">Today&apos;s Schedule</h3>
            <p className="text-xs text-slate-400 mt-0.5">{today}</p>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => setSection("appointments")}>View all <ChevronRight size={12} /></Btn>
        </div>
        <div className="space-y-1">
          {todayAppts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No appointments scheduled for today</div>
          ) : (
            todayAppts.map((appt: any) => (
              <div key={appt.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
                <span className="text-xs font-semibold text-slate-400 w-20 flex-shrink-0">{appt.time}</span>
                <div className={`w-8 h-8 rounded-full ${appt.color} font-semibold text-xs flex items-center justify-center flex-shrink-0`}>{appt.initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{appt.patient}</p>
                  <p className="text-xs text-slate-400">{appt.type} · {appt.duration}</p>
                </div>
                <ApptBadge status={appt.status} />
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
