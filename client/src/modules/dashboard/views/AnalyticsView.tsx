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
export function AnalyticsView({ selectedClinic }: { selectedClinic?: any }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const clinicId = selectedClinic?.id || "0";

  useEffect(() => {
    if (clinicId && clinicId !== "0") {
      clinicsApi.getAnalytics(clinicId).then(res => {
        setData(res.data);
      }).catch(() => {}).finally(() => setLoading(false));
    }
  }, [clinicId]);

  const summary = data?.summary || {
    total_revenue: 0,
    avg_per_visit: 0,
    total_appointments: 0,
    no_show_rate: 0,
  };

  const monthlyTrends = data?.monthly_trends || [];
  const visitDist = data?.visit_distribution || [];

  return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue",     value: `$${(summary.total_revenue || 0).toLocaleString()}`, sub: "Actual collections" },
          { label: "Avg. Per Visit",    value: `$${summary.avg_per_visit || 0}`,                  sub: "Per completed visit" },
          { label: "Total Appointments",value: (summary.total_appointments || 0).toString(),       sub: `${summary.completed_appointments || 0} completed` },
          { label: "No-Show Rate",      value: `${summary.no_show_rate || 0}%`,                   sub: "Missed appointments" },
        ].map(k => (
          <Card key={k.label} className="p-5">
            <p className="text-xs font-medium text-slate-500 mb-1">{k.label}</p>
            <p className="text-2xl font-bold text-slate-900 mb-1">{k.value}</p>
            <p className="text-xs font-medium text-slate-400">{k.sub}</p>
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-6">Monthly Revenue Breakdown</h3>
        {monthlyTrends.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">No monthly revenue trends recorded yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyTrends} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(val: number) => [`$${val.toLocaleString()}`, "Revenue"]} contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
              <Bar dataKey="revenue" fill="#2563EB" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Appointment Volume</h3>
          {monthlyTrends.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No volume recorded</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyTrends} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                <Area type="monotone" dataKey="appointments" stroke="#14B8A6" strokeWidth={2} fill="#14B8A6" fillOpacity={0.08} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-5">Visit Distribution</h3>
          {visitDist.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No visit types recorded</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={visitDist} cx="50%" cy="50%" innerRadius={44} outerRadius={68} dataKey="value" paddingAngle={3}>
                    {visitDist.map((_, i) => <Cell key={`analytics-dist-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-5 space-y-2.5">
                {visitDist.map((d: any, i: number) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} /><span className="text-slate-600">{d.name}</span></div>
                    <span className="font-semibold text-slate-900">{d.value}% ({d.count})</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
