/** Domain module extracted from the ClinicOS application coordinator. */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  authApi, patientApi, setAuthToken, getStoredUser, getStoredToken, isAuthenticated,
  clinicsApi, appointmentsApi, patientsApi, medicalRecordsApi,
  prescriptionsApi, paymentsApi, reviewsApi, subscriptionsApi, adminApi, messagesApi, doctorsApi, getApiErrorMessage,
} from "../../app/api";
import {
  BookAppointmentModal, RescheduleModal, CancelAppointmentModal,
  CreateEMRModal, CreatePrescriptionModal, ViewPrescriptionModal, ViewMedicalRecordModal,
  CreateServiceModal, EditServiceModal, CreatePackageModal,
  AddPatientModal, CreateInvoiceModal, PayInvoiceModal, SubmitReviewModal,
  SendMessageModal, AddStaffModal, UploadMedicalReportModal,
} from "../modals";
import { PrescriptionDocument } from "../prescriptions/components/PrescriptionDocument";
import { generatePrescriptionPdf } from "../prescriptions/prescriptionPdf";
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
import { Badge, Btn, Card, SectionLabel, Toggle, ApptBadge, PatientBadge, InvoiceBadge, ClinicStatusBadge, PlanBadge, NotifIcon, CHART_COLORS, ADMIN_PLAN_FEATURES, localDateString, shiftDate } from "../shared/components/DesignSystem";
const ADMIN_NAV = [
  { id: "a-overview",       label: "Platform Overview",    Icon: LayoutDashboard },
  { id: "a-clinics",        label: "Clinics Management",   Icon: Building2 },
  { id: "a-users",          label: "User Management",      Icon: Users },
  { id: "a-subscriptions",  label: "Subscriptions & Plans",Icon: CreditCard },
  { id: "a-reviews",        label: "Review Moderation",    Icon: Star },
  { id: "a-settings",       label: "Audit Logs & Security",Icon: Shield },
];

export function AdminPanel({ onBack, onLogout, user }: { onBack: () => void; onLogout: () => void; user?: any }) {
  const [section, setSection] = useState("a-overview");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Overview state
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [planDistribution, setPlanDistribution] = useState<any[]>([]);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [pendingClinics, setPendingClinics] = useState<any[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);

  // Clinics state
  const [clinics, setClinics] = useState<any[]>([]);
  const [clinicSearch, setClinicSearch] = useState("");
  const [clinicFilter, setClinicFilter] = useState("all");
  const [clinicPage, setClinicPage] = useState(1);
  const [clinicTotal, setClinicTotal] = useState(0);
  const [editingClinic, setEditingClinic] = useState<any>(null);
  const [showClinicModal, setShowClinicModal] = useState(false);
  const [clinicForm, setClinicForm] = useState<any>({ name: "", owner_id: "", email: "", phone: "", city: "", address: "", timezone: "Asia/Dhaka", is_active: true });

  // Users state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState<any>({ first_name: "", last_name: "", email: "", phone: "", password: "", role: "patient", clinic_id: "", is_verified: true, is_active: true });

  // Subscriptions & Plans state
  const [plans, setPlans] = useState<any[]>([]);
  const [clinicSubs, setClinicSubs] = useState<any[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionForm, setSubscriptionForm] = useState<any>({ clinic_id: "", plan_id: "", billing_cycle: "monthly", duration_days: 30, status: "active" });
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    price: 0,
    billing_cycle: "monthly",
    max_doctors: 1,
    max_patients: 100,
    max_staff: 2,
    features: ["digital_prescriptions"],
    custom_features: "Basic Scheduling, EMR Notes",
  });

  // Reviews state
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState("");

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Administrator";
  const initials = ((user?.first_name?.[0] || "A") + (user?.last_name?.[0] || "D")).toUpperCase();

  const showToast = (message: string, isError = false) => {
    if (isError) {
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(""), 4000);
    } else {
      setMsg(message);
      setTimeout(() => setMsg(""), 3500);
    }
  };

  // Loaders
  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await adminApi.getDashboard();
      if (res?.data) {
        setDashboardStats(res.data.stats);
        setPlanDistribution(res.data.plan_distribution || []);
        setRecentUsers(res.data.recent_signups || []);
        setPendingClinics(res.data.pending_clinics || []);
        setMonthlyTrends(res.data.monthly_trends || []);
      }
    } catch (error) {
      setDashboardStats(null); setPlanDistribution([]); setRecentUsers([]); setPendingClinics([]); setMonthlyTrends([]);
      setErrorMsg(getApiErrorMessage(error, "Failed to load platform overview."));
    }
    setLoading(false);
  }, []);

  const loadClinics = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await adminApi.getClinics({
        page: clinicPage,
        search: clinicSearch || undefined,
        status: clinicFilter,
      });
      if (res?.data) {
        setClinics(res.data.clinics || []);
        setClinicTotal(res.data.total || 0);
      }
    } catch (error) {
      setClinics([]); setClinicTotal(0);
      setErrorMsg(getApiErrorMessage(error, "Failed to load clinics."));
    }
    setLoading(false);
  }, [clinicPage, clinicSearch, clinicFilter]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await adminApi.getUsers({
        page: userPage,
        search: userSearch || undefined,
        role: userRoleFilter,
      });
      if (res?.data) {
        setUsersList(res.data.users || []);
        setUserTotal(res.data.total || 0);
      }
    } catch (error) {
      setUsersList([]); setUserTotal(0);
      setErrorMsg(getApiErrorMessage(error, "Failed to load users."));
    }
    setLoading(false);
  }, [userPage, userSearch, userRoleFilter]);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [plansRes, subsRes] = await Promise.all([
        adminApi.getPlans(),
        adminApi.getSubscriptions(),
      ]);
      if (plansRes?.data?.plans) setPlans(plansRes.data.plans);
      if (subsRes?.data?.subscriptions) setClinicSubs(subsRes.data.subscriptions);
    } catch (error) { setPlans([]); setClinicSubs([]); setErrorMsg(getApiErrorMessage(error, "Failed to load subscriptions.")); }
    setLoading(false);
  }, []);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await adminApi.getPendingReviews();
      if (res?.data?.reviews) setPendingReviews(res.data.reviews);
    } catch (error) { setPendingReviews([]); setErrorMsg(getApiErrorMessage(error, "Failed to load reviews.")); }
    setLoading(false);
  }, []);

  const loadAuditLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await adminApi.getAuditLogs({ action: auditSearch || undefined });
      if (res?.data?.logs) setAuditLogs(res.data.logs);
    } catch (error) { setAuditLogs([]); setErrorMsg(getApiErrorMessage(error, "Failed to load audit logs.")); }
    setLoading(false);
  }, [auditSearch]);

  useEffect(() => {
    if (section === "a-overview") loadDashboard();
    else if (section === "a-clinics") loadClinics();
    else if (section === "a-users") loadUsers();
    else if (section === "a-subscriptions") loadSubscriptions();
    else if (section === "a-reviews") loadReviews();
    else if (section === "a-settings") loadAuditLogs();
  }, [section, loadDashboard, loadClinics, loadUsers, loadSubscriptions, loadReviews, loadAuditLogs]);

  // Actions
  const handleToggleClinicStatus = async (clinicId: string, currentActive: boolean) => {
    const nextStatus = !currentActive;
    if (confirm(`Are you sure you want to ${nextStatus ? "activate" : "suspend"} this clinic?`)) {
      try {
        await adminApi.updateClinicStatus(clinicId, nextStatus);
        showToast(`Clinic ${nextStatus ? "activated" : "suspended"} successfully`);
        loadClinics();
      } catch (err: any) {
        showToast(err.response?.data?.message || "Failed to update clinic status", true);
      }
    }
  };

  const handleToggleUserStatus = async (targetUserId: string, currentActive: boolean) => {
    if (targetUserId === user?.id && currentActive) {
      showToast("Security Protection: You cannot deactivate your own administrator account", true);
      return;
    }
    const nextStatus = !currentActive;
    if (confirm(`Are you sure you want to ${nextStatus ? "activate" : "deactivate"} this account?`)) {
      try {
        await adminApi.updateUserStatus(targetUserId, nextStatus);
        showToast(`User account ${nextStatus ? "activated" : "deactivated"} successfully`);
        loadUsers();
      } catch (err: any) {
        showToast(err.response?.data?.message || "Failed to update user status", true);
      }
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...userForm };
      if (editingUser && !payload.password) delete payload.password;
      if (!payload.clinic_id) delete payload.clinic_id;
      if (editingUser) await adminApi.updateUser(editingUser.id, payload); else await adminApi.createUser(payload);
      showToast(`User ${editingUser ? "updated" : "created"} successfully`); setShowUserModal(false); loadUsers();
    } catch (err: any) { showToast(getApiErrorMessage(err, "Failed to save user."), true); }
  };

  const handleDeleteUser = async (target: any) => {
    if (!confirm(`Delete ${target.first_name} ${target.last_name}? Their account will be securely deactivated.`)) return;
    try { await adminApi.deleteUser(target.id); showToast("User deleted successfully"); loadUsers(); }
    catch (err: any) { showToast(getApiErrorMessage(err, "Failed to delete user."), true); }
  };

  const handleSaveClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClinic) await adminApi.updateClinic(editingClinic.id, clinicForm); else await adminApi.createClinic(clinicForm);
      showToast(`Clinic ${editingClinic ? "updated" : "created"} successfully`); setShowClinicModal(false); loadClinics();
    } catch (err: any) { showToast(getApiErrorMessage(err, "Failed to save clinic."), true); }
  };

  const handleDeleteClinic = async (clinic: any) => {
    if (!confirm(`Delete ${clinic.name}? The clinic and its active subscription will be suspended.`)) return;
    try { await adminApi.deleteClinic(clinic.id); showToast("Clinic deleted successfully"); loadClinics(); }
    catch (err: any) { showToast(getApiErrorMessage(err, "Failed to delete clinic."), true); }
  };

  const openSubscriptionModal = (clinicId: string, subscription?: any) => {
    setSubscriptionForm({ clinic_id: clinicId, plan_id: subscription?.plan_id || plans.find(p => p.is_active)?.id || "", billing_cycle: subscription?.plan_billing_cycle || "monthly", duration_days: 30, status: "active" });
    setShowSubscriptionModal(true);
  };

  const handleAssignSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await adminApi.assignSubscription(subscriptionForm); showToast("Subscription assigned successfully"); setShowSubscriptionModal(false); loadSubscriptions(); loadClinics(); }
    catch (err: any) { showToast(getApiErrorMessage(err, "Failed to assign subscription."), true); }
  };

  const handleApproveReview = async (reviewId: string) => {
    try {
      await adminApi.approveReview(reviewId);
      showToast("Review approved and published publicly");
      loadReviews();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to approve review", true);
    }
  };

  const handleRejectReview = async (reviewId: string) => {
    if (confirm("Reject and permanently remove this review?")) {
      try {
        await adminApi.rejectReview(reviewId);
        showToast("Review rejected and removed from system");
        loadReviews();
      } catch (err: any) {
        showToast(err.response?.data?.message || "Failed to reject review", true);
      }
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const featArray = [...planForm.features, ...String(planForm.custom_features || '').split(',').map(s => s.trim()).filter(Boolean)];
      const payload = {
        ...planForm,
        features: featArray,
        price: parseFloat(planForm.price as any) || 0,
        max_doctors: parseInt(planForm.max_doctors as any, 10) || 1,
        max_patients: parseInt(planForm.max_patients as any, 10) || 100,
        max_staff: parseInt(planForm.max_staff as any, 10) || 2,
      };
      delete (payload as any).custom_features;

      if (editingPlan) {
        await adminApi.updatePlan(editingPlan.id, payload);
        showToast("Subscription plan updated successfully");
      } else {
        await adminApi.createPlan(payload);
        showToast("New subscription plan created");
      }
      setShowPlanModal(false);
      setEditingPlan(null);
      loadSubscriptions();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to save plan", true);
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (confirm("Deactivate this subscription plan? Existing clinic subscriptions will remain intact.")) {
      try {
        await adminApi.deletePlan(planId);
        showToast("Subscription plan deactivated");
        loadSubscriptions();
      } catch (err: any) {
        showToast(err.response?.data?.message || "Failed to deactivate plan", true);
      }
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 flex flex-col h-screen flex-shrink-0">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm">
              <Stethoscope size={18} />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight">Clinic<span className="text-blue-400">OS</span></span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-400">SaaS Platform Admin</span>
            </div>
          </div>
        </div>

        {/* User Badge */}
        <div className="px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{fullName}</p>
              <p className="text-xs text-slate-400 truncate">Platform Administrator</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {ADMIN_NAV.map(item => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-950/40 transition-colors"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0 relative z-20">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{ADMIN_NAV.find(n => n.id === section)?.label ?? "Platform Overview"}</h1>
            <p className="text-xs text-slate-400 mt-0.5">ClinicOS Global SaaS Administration Panel</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
              {initials}
            </div>
          </div>
        </div>

        {/* Feedback Toasts */}
        {msg && (
          <div className="mx-8 mt-4 p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs animate-fadeIn">
            <Check size={14} className="text-teal-600 flex-shrink-0" /> {msg}
          </div>
        )}
        {errorMsg && (
          <div className="mx-8 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs animate-fadeIn">
            <AlertCircle size={14} className="text-rose-600 flex-shrink-0" /> {errorMsg}
          </div>
        )}
        {loading && <div role="status" className="mb-4 px-4 py-3 rounded-xl bg-blue-50 text-blue-700 text-xs font-semibold flex items-center gap-2"><span className="animate-spin w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full" /> Loading current database information...</div>}

        {/* View Content */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* 1. PLATFORM OVERVIEW */}
          {section === "a-overview" && (
            <>
              {/* 4 Primary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Active Clinics",   value: (dashboardStats?.active_clinics ?? 0).toString(), sub: `${dashboardStats?.total_clinics ?? 0} total registered`, Icon: Building2, bg: "bg-blue-50 text-blue-600" },
                  { label: "Doctors & Staff",  value: (dashboardStats?.total_doctors ?? 0).toString(), sub: `${dashboardStats?.total_assistants ?? 0} assistants`, Icon: UserCheck, bg: "bg-teal-50 text-teal-600" },
                  { label: "Total Patients",   value: (dashboardStats?.total_patients ?? 0).toLocaleString(), sub: `${dashboardStats?.total_users ?? 0} platform accounts`, Icon: Users, bg: "bg-green-50 text-green-600" },
                  { label: "Subscription MRR", value: `$${(dashboardStats?.mrr ?? 0).toLocaleString()}`, sub: `${dashboardStats?.active_subscriptions ?? 0} active subscriptions`, Icon: DollarSign, bg: "bg-amber-50 text-amber-600" },
                ].map(s => (
                  <Card key={s.label} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-500">{s.label}</span>
                      <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}><s.Icon size={16} /></div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-0.5">{s.value}</div>
                    <p className="text-[11px] text-slate-400 font-medium">{s.sub}</p>
                  </Card>
                ))}
              </div>

              {/* Charts Grid */}
              <div className="grid lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Platform Monthly Revenue Trends</h3>
                      <p className="text-xs text-slate-400">Total patient consultation collections across all clinics</p>
                    </div>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">Real Database Data</span>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={monthlyTrends.length > 0 ? monthlyTrends : [{ month: "Current", revenue: dashboardStats?.total_revenue || 0 }]} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                      <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="#2563EB" fillOpacity={0.08} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold text-slate-900 text-sm mb-4">Subscription Plan Distribution</h3>
                  {planDistribution.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="count" paddingAngle={4}>
                            {planDistribution.map((_, i) => <Cell key={`pie-${i}`} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-3">
                        {planDistribution.map((d, i) => (
                          <div key={d.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length]} } />
                              <span className="text-slate-600 font-medium">{d.name}</span>
                            </div>
                            <span className="font-bold text-slate-900">{d.count} clinics</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-10 text-xs text-slate-400">No active paid subscriptions recorded yet</div>
                  )}
                </Card>
              </div>

              {/* Signups & Pending Verifications */}
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-bold text-slate-900 text-sm mb-4">Recent User Registrations</h3>
                  <div className="divide-y divide-gray-50">
                    {recentUsers.map(u => (
                      <div key={u.id} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                            {((u.first_name?.[0] || "") + (u.last_name?.[0] || "")).toUpperCase() || "U"}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{u.first_name} {u.last_name}</p>
                            <p className="text-[10px] text-slate-400">{u.email} · {new Date(u.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {u.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold text-slate-900 text-sm mb-4">Clinic Verification & Status</h3>
                  <div className="space-y-3">
                    {pendingClinics.map(c => (
                      <div key={c.id} className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{c.name}</p>
                          <p className="text-[11px] text-slate-500">{c.owner_first_name} {c.owner_last_name} · {c.city || "Location not set"}</p>
                        </div>
                        <button
                          onClick={() => handleToggleClinicStatus(c.id, false)}
                          className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors"
                        >
                          Activate Clinic
                        </button>
                      </div>
                    ))}
                    {pendingClinics.length === 0 && (
                      <div className="text-center py-8 text-xs text-slate-400">
                        <CheckCircle size={24} className="mx-auto text-green-500 mb-2" />
                        All clinics are currently active and verified.
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </>
          )}

          {/* 2. CLINICS MANAGEMENT */}
          {section === "a-clinics" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex gap-2">
                  {["all", "active", "suspended"].map(f => (
                    <button
                      key={f}
                      onClick={() => { setClinicFilter(f); setClinicPage(1); }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                        clinicFilter === f ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                  <button onClick={() => { setEditingClinic(null); setClinicForm({ name: "", owner_id: "", email: "", phone: "", city: "", address: "", timezone: "Asia/Dhaka", is_active: true }); setShowClinicModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"><Plus size={14} /> Add Clinic</button>
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={clinicSearch}
                    onChange={e => setClinicSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loadClinics()}
                    placeholder="Search clinics or doctors..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                </div>
              </div>

              <Card className="overflow-x-auto">
                <table className="w-full min-w-[940px] text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-slate-50/50">
                      {["Clinic Name", "Doctor / Owner", "City", "Patients", "Appointments", "Plan", "Status", "Actions"].map(h => (
                        <th key={h} className="text-xs font-bold text-slate-400 px-5 py-3 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {clinics.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900">{c.name}</td>
                        <td className="px-5 py-3.5 text-slate-600">{c.owner_first_name} {c.owner_last_name}</td>
                        <td className="px-5 py-3.5 text-slate-500">{c.city || "N/A"}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800">{c.patient_count || 0}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800">{c.appointment_count || 0}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-md font-semibold text-[11px] bg-blue-50 text-blue-700 border border-blue-100">
                            {c.plan_name || "Starter"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            c.is_active ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {c.is_active ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5"><div className="flex items-center gap-1">
                          <button onClick={() => { setEditingClinic(c); setClinicForm({ name: c.name || "", owner_id: c.owner_id || "", email: c.email || "", phone: c.phone || "", city: c.city || "", address: c.address || "", timezone: c.timezone || "UTC", is_active: Boolean(c.is_active) }); setShowClinicModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit clinic"><Edit size={14} /></button>
                          <button onClick={() => openSubscriptionModal(c.id)} className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg" title="Assign subscription"><CreditCard size={14} /></button>
                          <button
                            onClick={() => handleToggleClinicStatus(c.id, Boolean(c.is_active))}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                              c.is_active
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                            }`}
                          >
                            {c.is_active ? "Suspend" : "Activate"}
                          </button>
                          <button onClick={() => handleDeleteClinic(c)} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg" title="Delete clinic"><Trash2 size={14} /></button>
                        </div></td>
                      </tr>
                    ))}
                    {clinics.length === 0 && (
                      <tr><td colSpan={8} className="py-8 text-center text-slate-400">{loading ? "Loading clinics..." : "No clinics found."}</td></tr>
                    )}
                  </tbody>
                </table>
              </Card>
              {clinicTotal > 20 && <div className="flex items-center justify-between text-xs text-slate-500"><span>{clinicTotal} clinics</span><div className="flex gap-2"><button disabled={clinicPage <= 1} onClick={() => setClinicPage(page => Math.max(1, page - 1))} className="px-3 py-2 rounded-lg border bg-white disabled:opacity-40">Previous</button><button disabled={clinicPage * 20 >= clinicTotal} onClick={() => setClinicPage(page => page + 1)} className="px-3 py-2 rounded-lg border bg-white disabled:opacity-40">Next</button></div></div>}
            </div>
          )}

          {/* 3. USER MANAGEMENT */}
          {section === "a-users" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex gap-2">
                  {["all", "doctor", "patient", "assistant", "admin"].map(r => (
                    <button
                      key={r}
                      onClick={() => { setUserRoleFilter(r); setUserPage(1); }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                        userRoleFilter === r ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="flex w-full sm:w-auto gap-2">
                  <button onClick={() => { setEditingUser(null); setUserForm({ first_name: "", last_name: "", email: "", phone: "", password: "", role: "patient", clinic_id: "", is_verified: true, is_active: true }); setShowUserModal(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"><UserPlus size={14} /> Add New User</button>
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loadUsers()}
                    placeholder="Search name or email..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                </div>
              </div>

              <Card className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-slate-50/50">
                      {["Full Name", "Email Address", "Role", "Verification", "Account Status", "Joined Date", "Actions"].map(h => (
                        <th key={h} className="text-xs font-bold text-slate-400 px-5 py-3 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {usersList.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900">{u.first_name} {u.last_name}</td>
                        <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px]">{u.email}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase bg-slate-100 text-slate-700">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.is_verified ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {u.is_verified ? "Verified" : "Unverified"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            u.is_active ? 'bg-green-100 text-green-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {u.is_active ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="px-5 py-3.5"><div className="flex items-center gap-1">
                          <button onClick={() => { setEditingUser(u); setUserForm({ first_name: u.first_name, last_name: u.last_name, email: u.email, phone: u.phone || "", password: "", role: u.role, clinic_id: "", is_verified: Boolean(u.is_verified), is_active: Boolean(u.is_active) }); setShowUserModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit user"><Edit size={14} /></button>
                          <button
                            onClick={() => handleToggleUserStatus(u.id, Boolean(u.is_active))}
                            disabled={u.id === user?.id && u.is_active}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                              u.id === user?.id && u.is_active
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : u.is_active
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                            }`}
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button onClick={() => handleDeleteUser(u)} disabled={u.id === user?.id} className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-30" title="Delete user"><Trash2 size={14} /></button>
                        </div></td>
                      </tr>
                    ))}
                    {usersList.length === 0 && (
                      <tr><td colSpan={7} className="py-8 text-center text-slate-400">{loading ? "Loading users..." : "No users found."}</td></tr>
                    )}
                  </tbody>
                </table>
              </Card>
              {userTotal > 20 && <div className="flex items-center justify-between text-xs text-slate-500"><span>{userTotal} users</span><div className="flex gap-2"><button disabled={userPage <= 1} onClick={() => setUserPage(page => Math.max(1, page - 1))} className="px-3 py-2 rounded-lg border bg-white disabled:opacity-40">Previous</button><button disabled={userPage * 20 >= userTotal} onClick={() => setUserPage(page => page + 1)} className="px-3 py-2 rounded-lg border bg-white disabled:opacity-40">Next</button></div></div>}
            </div>
          )}

          {/* 4. SUBSCRIPTIONS & PLANS */}
          {section === "a-subscriptions" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">SaaS Subscription Plans</h3>
                  <p className="text-xs text-slate-400">Configure tiers, pricing, limits, and premium features</p>
                </div>
                <button
                  onClick={() => {
                    setEditingPlan(null);
                    setPlanForm({
                      name: "",
                      description: "",
                      price: 29,
                      billing_cycle: "monthly",
                      max_doctors: 2,
                      max_patients: 500,
                      max_staff: 4,
                      features: ["digital_prescriptions"],
                      custom_features: "Online Booking, EMR Notes, Billing",
                    });
                    setShowPlanModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Plus size={14} /> Create New Plan
                </button>
              </div>

              {/* Plans Grid */}
              <div className="grid md:grid-cols-3 gap-4">
                {plans.map((p: any) => (
                  <Card key={p.id} className="p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-base font-bold text-slate-900">{p.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-2xl font-extrabold text-slate-900 mb-1">${p.price} <span className="text-xs text-slate-400 font-normal">/ {p.billing_cycle}</span></p>
                      <p className="text-xs text-slate-500 mb-4">{p.description}</p>
                      <div className="space-y-1.5 border-t border-gray-100 pt-3 text-xs text-slate-600 mb-4">
                        <div><strong>Max Patients:</strong> {p.max_patients || "Unlimited"}</div>
                        <div><strong>Max Doctors:</strong> {p.max_doctors || 1}</div>
                        <div><strong>Max Staff:</strong> {p.max_staff || 2}</div>
                        <div><strong>Features:</strong> {(p.features || []).join(", ") || "Standard"}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setEditingPlan(p);
                          setPlanForm({
                            name: p.name,
                            description: p.description || "",
                            price: p.price,
                            billing_cycle: p.billing_cycle || "monthly",
                            max_doctors: p.max_doctors || 1,
                            max_patients: p.max_patients || 100,
                            max_staff: p.max_staff || 2,
                            features: (p.features || []).filter((feature: string) => ADMIN_PLAN_FEATURES.some(([key]) => key === feature)),
                            custom_features: (p.features || []).filter((feature: string) => !ADMIN_PLAN_FEATURES.some(([key]) => key === feature)).join(", "),
                          });
                          setShowPlanModal(true);
                        }}
                        className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        Edit Plan
                      </button>
                      <button
                        onClick={() => handleDeletePlan(p.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Deactivate Plan"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Active Clinic Subscriptions Table */}
              <div className="pt-4">
                <h3 className="text-base font-bold text-slate-900 mb-3">Clinic Subscriptions</h3>
                <Card className="overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100 bg-slate-50/50">
                        {["Clinic", "Subscribed Plan", "Plan Price", "Billing Cycle", "Start Date", "End Date", "Status", "Actions"].map(h => (
                          <th key={h} className="text-xs font-bold text-slate-400 px-5 py-3 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs">
                      {clinicSubs.map(cs => (
                        <tr key={cs.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5 font-bold text-slate-900">{cs.clinic_name}</td>
                          <td className="px-5 py-3.5 font-semibold text-blue-600">{cs.plan_name}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-900">${cs.plan_price}</td>
                          <td className="px-5 py-3.5 capitalize text-slate-600">{cs.plan_billing_cycle || 'monthly'}</td>
                          <td className="px-5 py-3.5 text-slate-500">{cs.start_date}</td>
                          <td className="px-5 py-3.5 text-slate-500">{cs.end_date}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                              cs.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {cs.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5"><div className="flex gap-2"><button onClick={() => openSubscriptionModal(cs.clinic_id, cs)} className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold">Change / Extend</button>{cs.status === 'active' && <button onClick={async () => { if (confirm("Cancel this subscription?")) { try { await adminApi.cancelSubscription(cs.id); showToast("Subscription cancelled"); loadSubscriptions(); } catch (err: any) { showToast(getApiErrorMessage(err, "Failed to cancel subscription."), true); } } }} className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold">Cancel</button>}</div></td>
                        </tr>
                      ))}
                      {clinicSubs.length === 0 && (
                        <tr><td colSpan={8} className="py-8 text-center text-slate-400">No clinic subscriptions recorded</td></tr>
                      )}
                    </tbody>
                  </table>
                </Card>
              </div>
            </div>
          )}

          {/* 5. REVIEW MODERATION */}
          {section === "a-reviews" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Review Moderation Queue</h3>
                <p className="text-xs text-slate-400">Approve patient reviews to publish them on public clinic profile pages</p>
              </div>

              <div className="space-y-3">
                {pendingReviews.map(r => (
                  <Card key={r.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 text-sm">{r.patient_first_name} {r.patient_last_name}</span>
                        <span className="text-slate-400 text-xs">reviewed</span>
                        <span className="font-semibold text-blue-600 text-xs">{r.clinic_name}</span>
                        {r.doctor_first_name && (
                          <span className="text-slate-400 text-xs">· Dr. {r.doctor_first_name} {r.doctor_last_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 mb-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} size={14} className={i < r.rating ? "fill-amber-400" : "text-slate-200"} />
                        ))}
                        <span className="text-xs font-bold text-slate-700 ml-1">({r.rating} / 5)</span>
                      </div>
                      <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-gray-100 italic">
                        "{r.comment || "No comment text provided"}"
                      </p>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleApproveReview(r.id)}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Check size={14} /> Approve Review
                      </button>
                      <button
                        onClick={() => handleRejectReview(r.id)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Trash2 size={14} /> Reject & Delete
                      </button>
                    </div>
                  </Card>
                ))}

                {pendingReviews.length === 0 && (
                  <Card className="p-12 text-center">
                    <CheckCircle size={36} className="mx-auto text-teal-500 mb-3" />
                    <h4 className="font-bold text-slate-900 text-sm">Review Queue Clear</h4>
                    <p className="text-xs text-slate-400 mt-1">All patient reviews have been reviewed and approved</p>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* 6. AUDIT LOGS & SECURITY */}
          {section === "a-settings" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Platform Security & Audit Logs</h3>
                  <p className="text-xs text-slate-400">Chronological trail of administrative, authentication, and moderation events</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={auditSearch}
                    onChange={e => setAuditSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && loadAuditLogs()}
                    placeholder="Filter by action (e.g. USER, CLINIC)..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              <Card className="overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-slate-50/50">
                      {["Timestamp", "Admin User", "Action", "Entity Type", "Target ID", "Details", "IP Address"].map(h => (
                        <th key={h} className="text-xs font-bold text-slate-400 px-5 py-3 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-900">{log.first_name ? `${log.first_name} ${log.last_name}` : "System / Admin"}</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 capitalize text-slate-600">{log.entity_type || "General"}</td>
                        <td className="px-5 py-3.5 font-mono text-[10px] text-slate-400 truncate max-w-[120px]">{log.entity_id || "—"}</td>
                        <td className="px-5 py-3.5 text-slate-600 font-mono text-[11px] max-w-[200px] truncate">
                          {log.details ? JSON.stringify(log.details) : "—"}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 font-mono text-[10px]">{log.ip_address || "127.0.0.1"}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={7} className="py-8 text-center text-slate-400">No security audit logs recorded yet</td></tr>
                    )}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </main>
      </div>

      {showUserModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4" onClick={() => setShowUserModal(false)}><div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl" onClick={e => e.stopPropagation()}>
          <div className="px-6 py-4 border-b flex justify-between"><h3 className="font-bold">{editingUser ? "Edit User" : "Add New User"}</h3><button onClick={() => setShowUserModal(false)}><X size={17} /></button></div>
          <form onSubmit={handleSaveUser} className="p-6 grid grid-cols-2 gap-4 text-xs">
            {[['first_name','First name'],['last_name','Last name'],['email','Email'],['phone','Phone']].map(([key,label]) => <label key={key} className="font-bold text-slate-700">{label}<input required={key !== 'phone'} type={key === 'email' ? 'email' : 'text'} value={userForm[key]} onChange={e => setUserForm({...userForm,[key]:e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-xl font-normal" /></label>)}
            <label className="font-bold text-slate-700">Role<select value={userForm.role} onChange={e => setUserForm({...userForm,role:e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-xl bg-white font-normal">{['doctor','patient','assistant','admin'].map(role => <option key={role}>{role}</option>)}</select></label>
            <label className="font-bold text-slate-700">{editingUser ? "New password (optional)" : "Password"}<input required={!editingUser} minLength={6} type="password" value={userForm.password} onChange={e => setUserForm({...userForm,password:e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-xl font-normal" /></label>
            {!editingUser && userForm.role === 'patient' && <label className="col-span-2 font-bold text-slate-700">Clinic (optional)<select value={userForm.clinic_id} onChange={e => setUserForm({...userForm,clinic_id:e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-xl bg-white font-normal"><option value="">No clinic profile yet</option>{clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
            <label className="flex items-center gap-2"><input type="checkbox" checked={userForm.is_verified} onChange={e => setUserForm({...userForm,is_verified:e.target.checked})} /> Verified</label><label className="flex items-center gap-2"><input type="checkbox" checked={userForm.is_active} onChange={e => setUserForm({...userForm,is_active:e.target.checked})} /> Active</label>
            <div className="col-span-2 flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setShowUserModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancel</button><button className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold">{editingUser ? "Save Changes" : "Create User"}</button></div>
          </form>
        </div></div>
      )}

      {showClinicModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4" onClick={() => setShowClinicModal(false)}><div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl" onClick={e => e.stopPropagation()}>
          <div className="px-6 py-4 border-b flex justify-between"><h3 className="font-bold">{editingClinic ? "Edit Clinic" : "Add Clinic"}</h3><button onClick={() => setShowClinicModal(false)}><X size={17} /></button></div>
          <form onSubmit={handleSaveClinic} className="p-6 grid grid-cols-2 gap-4 text-xs">
            {[['name','Clinic name'],['owner_id','Owner user ID'],['email','Email'],['phone','Phone'],['city','City'],['timezone','Timezone']].map(([key,label]) => <label key={key} className="font-bold text-slate-700">{label}<input required={key === 'name' || key === 'owner_id'} type={key === 'email' ? 'email' : 'text'} value={clinicForm[key]} onChange={e => setClinicForm({...clinicForm,[key]:e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-xl font-normal" /></label>)}
            <label className="col-span-2 font-bold text-slate-700">Address<textarea value={clinicForm.address} onChange={e => setClinicForm({...clinicForm,address:e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-xl font-normal" /></label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={clinicForm.is_active} onChange={e => setClinicForm({...clinicForm,is_active:e.target.checked})} /> Active</label>
            <div className="col-span-2 flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setShowClinicModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancel</button><button className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold">{editingClinic ? "Save Changes" : "Create Clinic"}</button></div>
          </form>
        </div></div>
      )}

      {showSubscriptionModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setShowSubscriptionModal(false)}><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
          <div className="px-6 py-4 border-b flex justify-between"><h3 className="font-bold">Assign Subscription</h3><button onClick={() => setShowSubscriptionModal(false)}><X size={17} /></button></div>
          <form onSubmit={handleAssignSubscription} className="p-6 space-y-4 text-xs">
            <label className="block font-bold">Plan<select required value={subscriptionForm.plan_id} onChange={e => setSubscriptionForm({...subscriptionForm,plan_id:e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-xl bg-white font-normal"><option value="">Select a plan</option>{plans.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <div className="grid grid-cols-2 gap-3"><label className="font-bold">Billing cycle<select value={subscriptionForm.billing_cycle} onChange={e => setSubscriptionForm({...subscriptionForm,billing_cycle:e.target.value})} className="mt-1 w-full px-3 py-2 border rounded-xl bg-white font-normal">{['monthly','quarterly','yearly'].map(v => <option key={v}>{v}</option>)}</select></label><label className="font-bold">Duration (days)<input type="number" min={1} value={subscriptionForm.duration_days} onChange={e => setSubscriptionForm({...subscriptionForm,duration_days:Number(e.target.value)})} className="mt-1 w-full px-3 py-2 border rounded-xl font-normal" /></label></div>
            <div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setShowSubscriptionModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">Cancel</button><button className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold">Assign Plan</button></div>
          </form>
        </div></div>
      )}

      {/* Create / Edit Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4" onClick={() => setShowPlanModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">{editingPlan ? "Edit Subscription Plan" : "Create New Subscription Plan"}</h3>
              <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <form onSubmit={handleSavePlan} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Plan Name</label>
                <input
                  required
                  value={planForm.name}
                  onChange={e => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g. Professional Practice"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <input
                  value={planForm.description}
                  onChange={e => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="Brief plan summary"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={planForm.price}
                    onChange={e => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Billing Cycle</label>
                  <select
                    value={planForm.billing_cycle}
                    onChange={e => setPlanForm({ ...planForm, billing_cycle: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Patients</label>
                  <input
                    type="number"
                    value={planForm.max_patients}
                    onChange={e => setPlanForm({ ...planForm, max_patients: parseInt(e.target.value, 10) || 100 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Doctors</label>
                  <input
                    type="number"
                    value={planForm.max_doctors}
                    onChange={e => setPlanForm({ ...planForm, max_doctors: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Max Staff</label>
                  <input
                    type="number"
                    value={planForm.max_staff}
                    onChange={e => setPlanForm({ ...planForm, max_staff: parseInt(e.target.value, 10) || 2 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div><label className="block font-bold text-slate-700 mb-2">Standard features</label><div className="grid grid-cols-2 gap-2 rounded-xl border p-3">{ADMIN_PLAN_FEATURES.map(([key,label]) => <label key={key} className="flex items-center gap-2 text-slate-600"><input type="checkbox" checked={planForm.features.includes(key)} onChange={e => setPlanForm({...planForm,features:e.target.checked ? [...planForm.features,key] : planForm.features.filter((item: string) => item !== key)})} />{label}</label>)}</div></div>
              <div><label className="block font-bold text-slate-700 mb-1">Custom features (optional, comma-separated)</label><textarea rows={2} value={planForm.custom_features} onChange={e => setPlanForm({...planForm,custom_features:e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" /></div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm"
                >
                  {editingPlan ? "Update Plan" : "Create Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────
