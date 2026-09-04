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
const NAV_GROUPS = [
  {
    label: "Practice",
    items: [
      { id: "overview",      label: "Overview",      Icon: LayoutDashboard, badge: null },
      { id: "appointments",  label: "Appointments",  Icon: Calendar,        badge: null },
      { id: "patients",      label: "Patients",      Icon: Users,           badge: null },
      { id: "emr",           label: "Medical Records",Icon: ClipboardList,  badge: null },
    ],
  },
  {
    label: "Clinical",
    items: [
      { id: "prescriptions", label: "Prescriptions", Icon: Pill,            badge: null },
      { id: "billing",       label: "Billing",       Icon: Receipt,         badge: null },
    ],
  },
  {
    label: "Management",
    items: [
      { id: "clinic",        label: "My Clinic",     Icon: Building2,       badge: null },
      { id: "services",      label: "Services",      Icon: Layers,          badge: null },
      { id: "packages",      label: "Packages",      Icon: Package,         badge: null },
    ],
  },
  {
    label: "Insights",
    items: [
      { id: "analytics",     label: "Analytics",     Icon: BarChart3,       badge: null },
      { id: "reviews",       label: "Reviews",       Icon: Star,            badge: null },
      { id: "notifications", label: "Notifications", Icon: Bell,            badge: null },
      { id: "settings",      label: "Settings",      Icon: Settings,        badge: null },
    ],
  },
];

function Sidebar({ section, setSection, onLogout, user, clinics, selectedClinic, onSwitchClinic, onOpenCreateClinic }: { section: string; setSection: (s: string) => void; onLogout: () => void; user?: any; clinics?: any[]; selectedClinic?: any; onSwitchClinic?: (c: any) => void; onOpenCreateClinic?: () => void; }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [clinicOpen, setClinicOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const clinicRef = useRef<HTMLDivElement>(null);
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "User";
  const initials = ((user?.first_name?.[0] || "") + (user?.last_name?.[0] || "")).toUpperCase() || "?";
  const clinicName = selectedClinic?.name || "Select Clinic";
  const clinicInitials = selectedClinic?.name ? selectedClinic.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase() : "?";

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (clinicRef.current && !clinicRef.current.contains(e.target as Node)) setClinicOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const profileMenuItems = [
    { Icon: User, label: "View Profile", action: () => { setSection("settings"); setProfileOpen(false); } },
    { Icon: Building2, label: "Clinic Settings", action: () => { setSection("clinic"); setProfileOpen(false); } },
    { Icon: CreditCard, label: "Subscription & Billing", action: () => { setSection("billing"); setProfileOpen(false); } },
    { Icon: Keyboard, label: "Keyboard Shortcuts", action: () => setProfileOpen(false) },
  ];

  return (
    <aside className="w-60 bg-white border-r border-gray-100 flex flex-col h-screen flex-shrink-0">
      <div className="px-6 py-5 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Stethoscope size={15} className="text-white" /></div>
          <span className="font-bold text-slate-900">Clinic<span className="text-blue-600">OS</span></span>
        </div>
      </div>

      <div className="px-3 py-2 border-b border-gray-50 relative" ref={clinicRef}>
        {clinics && clinics.length > 0 ? (
          <>
            <button type="button" aria-haspopup="menu" aria-expanded={clinicOpen} onClick={() => setClinicOpen(v => !v)} className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors ${clinicOpen ? "bg-blue-50" : "hover:bg-slate-50"}`}>
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-semibold text-[11px] flex items-center justify-center flex-shrink-0">{clinicInitials}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 truncate">{clinicName}</p>
                <p className="text-[10px] text-slate-400 truncate">{clinics.length} clinic{clinics.length > 1 ? "s" : ""}</p>
              </div>
              <ChevronDown size={12} className={`text-slate-400 flex-shrink-0 transition-transform ${clinicOpen ? "rotate-180" : ""}`} />
            </button>
            {clinicOpen && (
              <div role="menu" className="absolute left-3 right-3 top-full mt-0.5 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
                <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Clinics</p>
                {clinics.map(c => (
                  <button role="menuitem" key={c.id} disabled={!c.is_active} onClick={() => { onSwitchClinic?.(c); setClinicOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${c.id === selectedClinic?.id ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}>
                    <div className="w-5 h-5 rounded bg-slate-100 text-slate-500 font-semibold text-[9px] flex items-center justify-center flex-shrink-0">
                      {c.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <span className="flex-1 min-w-0"><span className="block truncate">{c.name}</span><span className="block text-[10px] font-normal text-slate-400 truncate">{c.city || "Location not set"}{!c.is_active ? " · Suspended" : ""}</span></span>
                    {c.id === selectedClinic?.id && <Check size={11} className="text-blue-600 flex-shrink-0" />}
                  </button>
                ))}
                <button role="menuitem" type="button" onClick={() => { setSection("clinic"); setClinicOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 border-t border-gray-100 text-xs font-semibold text-blue-700 hover:bg-blue-50"><Settings size={12} /> Manage Clinics</button>
              </div>
            )}
          </>
        ) : (
          <button onClick={() => onOpenCreateClinic?.()} className="flex items-center gap-3 p-2 rounded-xl w-full hover:bg-slate-50 transition-colors text-left">
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center flex-shrink-0"><Plus size={14} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700">Create Clinic</p>
              <p className="text-[10px] text-slate-400">Set up your digital clinic</p>
            </div>
          </button>
        )}
      </div>

      <div className="px-3 py-3 border-b border-gray-50 relative" ref={profileRef}>
        <div onClick={() => setProfileOpen(v => !v)} className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${profileOpen ? "bg-slate-100" : "hover:bg-slate-50"}`}>
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-semibold text-sm flex items-center justify-center">{initials}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{fullName}</p>
            <p className="text-xs text-slate-400 truncate capitalize">{user?.role || "User"}</p>
          </div>
          <ChevronDown size={13} className={`text-slate-300 flex-shrink-0 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
        </div>
        {profileOpen && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-50/30 border-b border-gray-50">
              <p className="text-xs font-semibold text-slate-900">{fullName}</p>
              <p className="text-xs text-slate-400 mt-0.5">{user?.email || ""}</p>
              <span className="inline-flex items-center gap-1 mt-1.5 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium"><BadgeCheck size={10} /> Pro Plan</span>
            </div>
            <div className="py-1.5">
              {profileMenuItems.map(({ Icon, label, action }) => (
                <button key={label} onClick={action} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                  <Icon size={14} className="text-slate-400" />{label}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-50 py-1.5">
              <button onClick={() => { setProfileOpen(false); onLogout(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                <LogOut size={14} className="text-red-400" /> Log Out
              </button>
            </div>
          </div>
        )}
      </div>
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <SectionLabel>{group.label}</SectionLabel>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = section === item.id;
                return (
                  <button key={item.id} onClick={() => setSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                    <item.Icon size={15} className={active ? "text-blue-600" : "text-slate-400"} />
                    {item.label}
                    {item.badge && <span className="ml-auto bg-blue-100 text-blue-700 text-xs font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-gray-50 space-y-0.5">
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors">
          <LogOut size={15} className="text-slate-400" /> Log Out
        </button>
      </div>
    </aside>
  );
}

function TopBar({ section, setSection, cmdOpen, setCmdOpen, user }: { section: string; setSection: (s: string) => void; cmdOpen: boolean; setCmdOpen: (v: boolean) => void; user?: any }) {
  const allItems = NAV_GROUPS.flatMap(g => g.items);
  const current = allItems.find(i => i.id === section);
  const title = current?.label ?? "Dashboard";
  const group = NAV_GROUPS.find(g => g.items.some(i => i.id === section))?.label ?? "ClinicOS";

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifs.filter(n => !n.is_read && !n.read).length;

  const fetchNotifs = useCallback(async () => {
    if (document.hidden) return;
    try {
      const res = await authApi.getNotifications(1);
      if (res.data?.notifications) {
        setNotifs(res.data.notifications);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 60000);
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchNotifs();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifs]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    try {
      await authApi.markAllNotificationsRead();
      setNotifs(n => n.map(x => ({ ...x, is_read: 1, read: true })));
    } catch {
      alert("Unable to mark notifications as read.");
    }
  };

  const handleReadSingle = async (n: any) => {
    try {
      await authApi.markNotificationRead(n.id);
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: 1, read: true } : x));
    } catch { alert("Unable to mark this notification as read."); }
  };

  const initials = `${user?.first_name?.[0] || 'D'}${user?.last_name?.[0] || 'R'}`.toUpperCase();

  return (
    <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-20 flex-shrink-0">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
          <span>ClinicOS</span><ChevronRight size={10} /><span>{group}</span><ChevronRight size={10} /><span className="text-slate-500">{title}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Global Search */}
        <button onClick={() => setCmdOpen(true)} className="relative flex items-center gap-2 w-52 pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm text-slate-400 bg-slate-50 hover:bg-white hover:border-blue-300 transition-all cursor-pointer">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          Search...
          <span className="ml-auto flex items-center gap-0.5 text-xs bg-gray-100 text-slate-400 rounded px-1.5 py-0.5 font-mono">⌘K</span>
        </button>
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => { setNotifOpen(v => !v); fetchNotifs(); }} className={`relative w-9 h-9 rounded-xl border flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors ${notifOpen ? "bg-slate-50 border-blue-200" : "border-gray-200"}`}>
            <Bell size={15} />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">{unreadCount}</span>}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
                  {unreadCount > 0 && <p className="text-xs text-slate-400 mt-0.5">{unreadCount} unread</p>}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-700 font-medium">Mark all read</button>}
                  <button onClick={() => setNotifOpen(false)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400"><X size={13} /></button>
                </div>
              </div>
              <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
                {notifs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">No notifications yet</div>
                ) : (
                  notifs.map(n => {
                    const isRead = Boolean(n.is_read || n.read);
                    return (
                      <div key={n.id} onClick={() => handleReadSingle(n)}
                        className={`flex gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${!isRead ? "bg-blue-50/40" : ""}`}>
                        <div className="mt-0.5 flex-shrink-0"><NotifIcon type={n.type || n.reference_type} /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium truncate ${isRead ? "text-slate-700" : "text-slate-900 font-semibold"}`}>{n.title}</p>
                            {!isRead && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message || n.desc}</p>
                          <p className="text-xs text-slate-400 mt-1">{new Date(n.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="border-t border-gray-50 px-5 py-3">
                <button onClick={() => { setSection("notifications"); setNotifOpen(false); }} className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1.5">
                  View all notifications <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-semibold text-sm flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors">
          {initials}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Views ────────────────────────────────────────────────────────────

import { OverviewView } from './views/OverviewView';
import { AppointmentsView } from './views/AppointmentsView';
import { PatientDetail } from './views/PatientDetail';
import { PatientsView } from './views/PatientsView';
import { EMRView } from './views/EMRView';
import { PrescriptionsView } from './views/PrescriptionsView';
import { BillingView } from './views/BillingView';
import { ClinicMgmtView } from './views/ClinicMgmtView';
import { ServicesView } from './views/ServicesView';
import { PackagesView } from './views/PackagesView';
import { DoctorReviewsView } from './views/DoctorReviewsView';
import { AnalyticsView } from './views/AnalyticsView';
import { NotificationsView } from './views/NotificationsView';
import { SettingsView } from './views/SettingsView';

function CommandPalette({ open, onClose, setSection }: { open: boolean; onClose: () => void; setSection: (s: string) => void }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const allItems = NAV_GROUPS.flatMap(g => g.items.map(i => ({ ...i, group: g.label })));

  useEffect(() => {
    if (open) { setQuery(""); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const filtered = query.trim() === ""
    ? allItems
    : allItems.filter(i => i.label.toLowerCase().includes(query.toLowerCase()));

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <Command size={16} className="text-slate-400" />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, actions..." className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent" />
          <kbd className="text-xs bg-gray-100 text-slate-400 rounded px-1.5 py-0.5 font-mono">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-slate-400">No results found</div>
          )}
          {filtered.map(item => (
            <button key={item.id} onClick={() => { setSection(item.id); onClose(); }}
              className="w-full flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors text-left">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <item.Icon size={14} className="text-slate-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-400">{item.group}</p>
              </div>
              <ChevronRight size={13} className="text-slate-300" />
            </button>
          ))}
        </div>
        <div className="border-t border-gray-50 px-5 py-3 flex items-center gap-4 text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><kbd className="bg-gray-100 rounded px-1.5 py-0.5 font-mono">↵</kbd> Select</span>
          <span className="flex items-center gap-1.5"><kbd className="bg-gray-100 rounded px-1.5 py-0.5 font-mono">↑↓</kbd> Navigate</span>
          <span className="flex items-center gap-1.5"><kbd className="bg-gray-100 rounded px-1.5 py-0.5 font-mono">ESC</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout({ section, setSection, onLogout, user, clinics, selectedClinic, onSwitchClinic, onCreateClinic }: { section: string; setSection: (s: string) => void; onLogout: () => void; user?: any; clinics?: any[]; selectedClinic?: any; onSwitchClinic?: (c: any) => void; onCreateClinic?: (data: any) => Promise<any>; }) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [showCreateClinic, setShowCreateClinic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", state: "", country: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", description: "" });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      await onCreateClinic?.(form);
      setShowCreateClinic(false);
      setForm({ name: "", phone: "", email: "", address: "", city: "", state: "", country: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", description: "" });
    } catch (error) { setCreateError(getApiErrorMessage(error, "Unable to create this clinic.")); }
    setCreating(false);
  };

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(v => !v); }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const renderView = () => {
    switch (section) {
      case "appointments":  return <AppointmentsView selectedClinic={selectedClinic} />;
      case "patients":      return <PatientsView selectedClinic={selectedClinic} />;
      case "emr":           return <EMRView selectedClinic={selectedClinic} />;
      case "prescriptions": return <PrescriptionsView selectedClinic={selectedClinic} />;
      case "billing":       return <BillingView selectedClinic={selectedClinic} />;
      case "clinic":        return <ClinicMgmtView selectedClinic={selectedClinic} />;
      case "services":      return <ServicesView selectedClinic={selectedClinic} />;
      case "packages":      return <PackagesView selectedClinic={selectedClinic} />;
      case "analytics":     return <AnalyticsView selectedClinic={selectedClinic} />;
      case "reviews":       return <DoctorReviewsView />;
      case "notifications": return <NotificationsView selectedClinic={selectedClinic} />;
      case "settings":      return <SettingsView selectedClinic={selectedClinic} />;
      default:              return <OverviewView setSection={setSection} selectedClinic={selectedClinic} />;
    }
  };
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar section={section} setSection={setSection} onLogout={onLogout} user={user} clinics={clinics} selectedClinic={selectedClinic} onSwitchClinic={onSwitchClinic} onOpenCreateClinic={() => setShowCreateClinic(true)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar section={section} setSection={setSection} cmdOpen={cmdOpen} setCmdOpen={setCmdOpen} user={user} />
        <main key={selectedClinic?.id || "no-active-clinic"} className="flex-1 overflow-y-auto">{renderView()}</main>
      </div>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} setSection={setSection} />

      {showCreateClinic && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => setShowCreateClinic(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-slate-900">Create New Clinic</h2>
              <button onClick={() => setShowCreateClinic(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {createError && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">{createError}</div>}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Clinic Name <span className="text-red-400">*</span></label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Smith Family Clinic" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 123-4567" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="info@clinic.com" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Address</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">City</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="City" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">State</label>
                  <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="State" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Country</label>
                  <input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Country" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Clinic Timezone</label>
                <input value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} placeholder="Asia/Dhaka" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-[11px] text-slate-400 mt-1">Use an IANA timezone such as Asia/Dhaka or America/New_York.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Brief description of your clinic..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowCreateClinic(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleCreate} disabled={creating || !form.name.trim()} className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center gap-2">
                {creating ? <><span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Creating...</> : "Create Clinic"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Patient Portal ─────────────────────────────────────────────────────────────
