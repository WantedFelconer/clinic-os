import { useState, useEffect, useRef, useCallback } from "react";
import {
  authApi, setAuthToken, getStoredUser, getStoredToken, isAuthenticated,
  clinicsApi, appointmentsApi, patientsApi, medicalRecordsApi,
  prescriptionsApi, paymentsApi, reviewsApi, subscriptionsApi, adminApi,
} from "./api";
import {
  LayoutDashboard, Calendar, Users, FileText, Pill, BarChart3,
  Settings, Bell, Search, Plus, Star, CheckCircle, Clock,
  TrendingUp, ArrowRight, Menu, X, Stethoscope, LogOut,
  ChevronRight, Filter, Eye, Edit, Trash2,
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

// ── Mock Data ──────────────────────────────────────────────────────────────────

const revenueData = [
  { month: "Jan", revenue: 12400, appointments: 42 },
  { month: "Feb", revenue: 15200, appointments: 58 },
  { month: "Mar", revenue: 13800, appointments: 51 },
  { month: "Apr", revenue: 18600, appointments: 67 },
  { month: "May", revenue: 21000, appointments: 74 },
  { month: "Jun", revenue: 19400, appointments: 69 },
  { month: "Jul", revenue: 24800, appointments: 89 },
];

const PATIENTS = [
  { id: 1, name: "Sarah Johnson",  age: 34, phone: "+1 (555) 234-5678", lastVisit: "Jul 3, 2026",  status: "Active",   condition: "Hypertension",     initials: "SJ", color: "bg-blue-100 text-blue-700" },
  { id: 2, name: "Michael Chen",   age: 45, phone: "+1 (555) 876-5432", lastVisit: "Jul 1, 2026",  status: "Active",   condition: "Type 2 Diabetes",  initials: "MC", color: "bg-purple-100 text-purple-700" },
  { id: 3, name: "Emma Rodriguez", age: 28, phone: "+1 (555) 345-6789", lastVisit: "Jun 28, 2026", status: "New",      condition: "Anxiety Disorder", initials: "ER", color: "bg-green-100 text-green-700" },
  { id: 4, name: "James Thompson", age: 62, phone: "+1 (555) 456-7890", lastVisit: "Jun 25, 2026", status: "Active",   condition: "Osteoarthritis",   initials: "JT", color: "bg-amber-100 text-amber-700" },
  { id: 5, name: "Aisha Patel",    age: 31, phone: "+1 (555) 567-8901", lastVisit: "Jun 20, 2026", status: "Inactive", condition: "Chronic Migraine", initials: "AP", color: "bg-rose-100 text-rose-700" },
  { id: 6, name: "Robert Kim",     age: 52, phone: "+1 (555) 678-9012", lastVisit: "Jul 5, 2026",  status: "Active",   condition: "Lumbar Disc",      initials: "RK", color: "bg-teal-100 text-teal-700" },
];

const TODAY_APPTS = [
  { id: 1, patient: "Sarah Johnson",  time: "09:00 AM", type: "Follow-up",    status: "Confirmed", duration: "30 min", initials: "SJ", color: "bg-blue-100 text-blue-700" },
  { id: 2, patient: "Michael Chen",   time: "09:45 AM", type: "Check-up",     status: "Confirmed", duration: "45 min", initials: "MC", color: "bg-purple-100 text-purple-700" },
  { id: 3, patient: "Emma Rodriguez", time: "10:30 AM", type: "New Patient",  status: "Pending",   duration: "60 min", initials: "ER", color: "bg-green-100 text-green-700" },
  { id: 4, patient: "James Thompson", time: "11:30 AM", type: "Consultation", status: "Confirmed", duration: "30 min", initials: "JT", color: "bg-amber-100 text-amber-700" },
  { id: 5, patient: "Aisha Patel",    time: "02:00 PM", type: "Follow-up",    status: "Cancelled", duration: "30 min", initials: "AP", color: "bg-rose-100 text-rose-700" },
  { id: 6, patient: "Robert Kim",     time: "03:00 PM", type: "Check-up",     status: "Confirmed", duration: "45 min", initials: "RK", color: "bg-teal-100 text-teal-700" },
];

const PRESCRIPTIONS = [
  { id: 1, patient: "Sarah Johnson",  date: "Jul 3, 2026",  medicines: 3, diagnosis: "Hypertension",    status: "Active",    initials: "SJ", color: "bg-blue-100 text-blue-700" },
  { id: 2, patient: "Michael Chen",   date: "Jul 1, 2026",  medicines: 4, diagnosis: "Diabetes Type 2", status: "Active",    initials: "MC", color: "bg-purple-100 text-purple-700" },
  { id: 3, patient: "Emma Rodriguez", date: "Jun 28, 2026", medicines: 2, diagnosis: "Anxiety Disorder",status: "Completed", initials: "ER", color: "bg-green-100 text-green-700" },
  { id: 4, patient: "James Thompson", date: "Jun 25, 2026", medicines: 5, diagnosis: "Osteoarthritis",  status: "Active",    initials: "JT", color: "bg-amber-100 text-amber-700" },
];

const PIE_DATA = [
  { name: "Consultations", value: 45 },
  { name: "Follow-ups",    value: 30 },
  { name: "Procedures",    value: 15 },
  { name: "New Patients",  value: 10 },
];

const CHART_COLORS = ["#2563EB", "#14B8A6", "#22C55E", "#F59E0B"];

const SERVICES = [
  { id: 1, name: "General Consultation",      duration: "30 min", fee: 75,  category: "Consultation",  active: true,  bookings: 124 },
  { id: 2, name: "Follow-up Visit",           duration: "20 min", fee: 45,  category: "Consultation",  active: true,  bookings: 89 },
  { id: 3, name: "Annual Health Check",       duration: "60 min", fee: 150, category: "Check-up",      active: true,  bookings: 38 },
  { id: 4, name: "Blood Pressure Monitoring", duration: "15 min", fee: 35,  category: "Monitoring",    active: true,  bookings: 67 },
  { id: 5, name: "ECG / EKG Test",            duration: "20 min", fee: 60,  category: "Diagnostics",   active: false, bookings: 14 },
  { id: 6, name: "Diabetes Management",       duration: "45 min", fee: 90,  category: "Chronic Care",  active: true,  bookings: 52 },
];

const PACKAGES = [
  { id: 1, name: "Hypertension Care Pack",  services: 4, duration: "3 months",  price: 299, sold: 12, active: true,  color: "bg-blue-50 border-blue-100" },
  { id: 2, name: "Diabetes Management",     services: 5, duration: "6 months",  price: 499, sold: 8,  active: true,  color: "bg-teal-50 border-teal-100" },
  { id: 3, name: "Annual Wellness Bundle",  services: 6, duration: "12 months", price: 699, sold: 22, active: true,  color: "bg-green-50 border-green-100" },
  { id: 4, name: "Post-Op Recovery Plan",   services: 3, duration: "2 months",  price: 199, sold: 5,  active: false, color: "bg-slate-50 border-slate-100" },
];

const INVOICES = [
  { id: "INV-2026-001", patient: "Sarah Johnson",  date: "Jul 3, 2026",  amount: 75,  status: "Paid",    service: "General Consultation", initials: "SJ", color: "bg-blue-100 text-blue-700" },
  { id: "INV-2026-002", patient: "Michael Chen",   date: "Jul 1, 2026",  amount: 499, status: "Paid",    service: "Diabetes Management Pack", initials: "MC", color: "bg-purple-100 text-purple-700" },
  { id: "INV-2026-003", patient: "Emma Rodriguez", date: "Jun 28, 2026", amount: 75,  status: "Pending", service: "General Consultation", initials: "ER", color: "bg-green-100 text-green-700" },
  { id: "INV-2026-004", patient: "James Thompson", date: "Jun 25, 2026", amount: 150, status: "Paid",    service: "Annual Health Check", initials: "JT", color: "bg-amber-100 text-amber-700" },
  { id: "INV-2026-005", patient: "Robert Kim",     date: "Jul 5, 2026",  amount: 299, status: "Paid",    service: "Hypertension Care Pack", initials: "RK", color: "bg-teal-100 text-teal-700" },
  { id: "INV-2026-006", patient: "Aisha Patel",    date: "Jun 20, 2026", amount: 45,  status: "Overdue", service: "Follow-up Visit", initials: "AP", color: "bg-rose-100 text-rose-700" },
];

const NOTIFICATIONS_DATA = [
  { id: 1, type: "appointment", title: "New Appointment Booked",   desc: "Emma Rodriguez booked a consultation for Jul 10, 2026", time: "2 min ago",  read: false },
  { id: 2, type: "payment",     title: "Payment Received",          desc: "Robert Kim paid $299 for Hypertension Care Pack",       time: "1 hour ago", read: false },
  { id: 3, type: "message",     title: "New Message from Patient",  desc: "Sarah Johnson sent a message about her medication",     time: "3 hrs ago",  read: false },
  { id: 4, type: "appointment", title: "Appointment Reminder",      desc: "Michael Chen follow-up is tomorrow at 09:45 AM",        time: "5 hrs ago",  read: true },
  { id: 5, type: "system",      title: "Prescription Downloaded",   desc: "James Thompson downloaded prescription RX-004",         time: "Yesterday",  read: true },
  { id: 6, type: "review",      title: "New 5-Star Review",         desc: "Aisha Patel left a glowing review for your clinic",     time: "Yesterday",  read: true },
  { id: 7, type: "system",      title: "Monthly Report Ready",      desc: "Your June 2026 performance report is available",        time: "2 days ago", read: true },
];

const EMR_RECORDS = [
  { id: 1, patient: "Sarah Johnson",  date: "Jul 3, 2026",  type: "SOAP Note",     diagnosis: "Essential Hypertension",     status: "Complete", initials: "SJ", color: "bg-blue-100 text-blue-700" },
  { id: 2, patient: "Michael Chen",   date: "Jul 1, 2026",  type: "SOAP Note",     diagnosis: "Type 2 Diabetes Mellitus",   status: "Complete", initials: "MC", color: "bg-purple-100 text-purple-700" },
  { id: 3, patient: "Emma Rodriguez", date: "Jun 28, 2026", type: "Progress Note", diagnosis: "Generalized Anxiety Disorder",status: "Complete", initials: "ER", color: "bg-green-100 text-green-700" },
  { id: 4, patient: "James Thompson", date: "Jun 25, 2026", type: "SOAP Note",     diagnosis: "Lumbar Osteoarthritis",       status: "Draft",    initials: "JT", color: "bg-amber-100 text-amber-700" },
  { id: 5, patient: "Robert Kim",     date: "Jul 5, 2026",  type: "Treatment Plan",diagnosis: "Herniated Lumbar Disc",       status: "Complete", initials: "RK", color: "bg-teal-100 text-teal-700" },
];

const ADMIN_CLINICS = [
  { id: 1, name: "Smith Family Clinic", doctor: "Dr. James Smith",    specialty: "General Practice", patients: 284, plan: "Pro",        status: "Verified", joined: "Jan 2026" },
  { id: 2, name: "Heart Care Center",   doctor: "Dr. Priya Sharma",   specialty: "Cardiology",       patients: 412, plan: "Enterprise", status: "Verified", joined: "Nov 2025" },
  { id: 3, name: "MindWell Clinic",     doctor: "Dr. Sofia Martinez", specialty: "Psychiatry",        patients: 156, plan: "Starter",   status: "Pending",  joined: "Jun 2026" },
  { id: 4, name: "OrthoPlus",           doctor: "Dr. James Okafor",   specialty: "Orthopedics",       patients: 89,  plan: "Pro",       status: "Verified", joined: "Mar 2026" },
  { id: 5, name: "SkinCare Studio",     doctor: "Dr. Yuki Tanaka",    specialty: "Dermatology",       patients: 201, plan: "Pro",       status: "Verified", joined: "Feb 2026" },
];

// ── Design System ──────────────────────────────────────────────────────────────

type BadgeVariant = "default" | "success" | "warning" | "danger" | "teal" | "outline" | "violet" | "amber";

function Badge({ variant = "default", children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-blue-50 text-blue-700 border border-blue-100",
    success: "bg-green-50 text-green-700 border border-green-100",
    warning: "bg-amber-50 text-amber-700 border border-amber-100",
    danger:  "bg-red-50 text-red-700 border border-red-100",
    teal:    "bg-teal-50 text-teal-700 border border-teal-100",
    outline: "bg-transparent text-slate-500 border border-slate-200",
    violet:  "bg-violet-50 text-violet-700 border border-violet-100",
    amber:   "bg-orange-50 text-orange-700 border border-orange-100",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

type BtnVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "white" | "teal";

function Btn({ variant = "primary", size = "md", children, onClick, className = "" }: {
  variant?: BtnVariant; size?: "sm" | "md" | "lg";
  children: React.ReactNode; onClick?: () => void; className?: string;
}) {
  const base = "inline-flex items-center gap-2 font-medium rounded-xl transition-all cursor-pointer";
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  const variants: Record<BtnVariant, string> = {
    primary:   "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    outline:   "border border-slate-200 text-slate-700 hover:bg-slate-50 bg-white",
    ghost:     "text-slate-600 hover:bg-slate-100",
    danger:    "bg-red-600 text-white hover:bg-red-700",
    white:     "bg-white text-blue-600 hover:bg-blue-50 shadow-sm font-semibold",
    teal:      "bg-teal-600 text-white hover:bg-teal-700 shadow-sm",
  };
  return (
    <button onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-3 pt-4 pb-1">{children}</p>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 flex-shrink-0 ${checked ? "bg-blue-600" : "bg-slate-200"}`}>
      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

function ApptBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = { Confirmed: "success", Pending: "warning", Cancelled: "danger", Completed: "teal" };
  return <Badge variant={map[status] ?? "outline"}>{status}</Badge>;
}

function PatientBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = { Active: "success", Inactive: "outline", New: "violet" };
  return <Badge variant={map[status] ?? "outline"}>{status}</Badge>;
}

function InvoiceBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = { Paid: "success", Pending: "warning", Overdue: "danger" };
  return <Badge variant={map[status] ?? "outline"}>{status}</Badge>;
}

function ClinicStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = { Verified: "success", Pending: "warning", Suspended: "danger" };
  return <Badge variant={map[status] ?? "outline"}>{status}</Badge>;
}

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, BadgeVariant> = { Starter: "outline", Pro: "default", Enterprise: "violet" };
  return <Badge variant={map[plan] ?? "outline"}>{plan}</Badge>;
}

function NotifIcon({ type }: { type: string }) {
  const map: Record<string, { Icon: React.FC<{ size?: number; className?: string }>; bg: string; text: string }> = {
    appointment: { Icon: Calendar,     bg: "bg-blue-50",   text: "text-blue-600" },
    payment:     { Icon: DollarSign,   bg: "bg-green-50",  text: "text-green-600" },
    message:     { Icon: MessageSquare,bg: "bg-violet-50", text: "text-violet-600" },
    review:      { Icon: Star,         bg: "bg-amber-50",  text: "text-amber-600" },
    system:      { Icon: Bell,         bg: "bg-slate-100", text: "text-slate-500" },
  };
  const cfg = map[type] ?? map["system"];
  return (
    <div className={`w-9 h-9 rounded-xl ${cfg.bg} ${cfg.text} flex items-center justify-center flex-shrink-0`}>
      <cfg.Icon size={15} />
    </div>
  );
}

// ── Landing Page ───────────────────────────────────────────────────────────────

function LandingNav({ onLogin, onStart }: { onLogin: () => void; onStart: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Stethoscope size={15} className="text-white" />
          </div>
          <span className="font-bold text-slate-900 text-lg">Clinic<span className="text-blue-600">OS</span></span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {["Features", "How It Works", "Pricing", "Blog"].map(l => (
            <a key={l} href="#" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">{l}</a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <Btn variant="ghost" size="sm" onClick={onLogin}>Log in</Btn>
          <Btn variant="primary" size="sm" onClick={onStart}>Get Started <ArrowRight size={13} /></Btn>
        </div>
        <button className="md:hidden p-2 text-slate-600" onClick={() => setOpen(!open)}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-4">
          {["Features", "How It Works", "Pricing", "Blog"].map(l => (
            <a key={l} href="#" className="block text-sm text-slate-600">{l}</a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Btn variant="outline" size="sm" onClick={onLogin}>Log in</Btn>
            <Btn variant="primary" size="sm" onClick={onStart}>Get Started</Btn>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="pt-28 pb-20 bg-gradient-to-b from-blue-50 via-white to-white overflow-hidden relative">
      <div className="absolute top-16 -right-40 w-[500px] h-[500px] bg-blue-100 rounded-full blur-3xl opacity-30 pointer-events-none" />
      <div className="absolute bottom-0 -left-24 w-72 h-72 bg-teal-100 rounded-full blur-3xl opacity-30 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 text-center relative">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-sm text-blue-700 font-medium mb-8">
          <Sparkles size={13} /> Trusted by 2,500+ independent doctors worldwide
        </div>
        <h1 className="text-5xl md:text-[72px] font-extrabold text-slate-900 mb-6 leading-none tracking-tight">
          Run Your Practice<br /><span className="text-blue-600">Like a Pro.</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          ClinicOS gives independent doctors a complete digital workspace — appointments, patients, prescriptions, billing, and analytics. All in one beautiful platform.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Btn variant="primary" size="lg" onClick={onStart}>Start Free Trial <ArrowRight size={16} /></Btn>
          <Btn variant="outline" size="lg" onClick={onStart}><Video size={15} /> Watch Demo</Btn>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-10 mb-20">
          {[{ value: "2,500+", label: "Active Doctors" }, { value: "180K+", label: "Appointments Managed" }, { value: "98%", label: "Satisfaction Rate" }, { value: "45 min", label: "Saved Daily" }].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-bold text-slate-900">{s.value}</div>
              <div className="text-sm text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="relative max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" /><div className="w-3 h-3 rounded-full bg-yellow-400" /><div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 mx-4 bg-slate-700 rounded h-6 flex items-center px-3">
                <span className="text-xs text-slate-400">app.clinicos.io/dashboard</span>
              </div>
            </div>
            <div className="p-5 bg-slate-50 grid grid-cols-5 gap-4">
              <div className="col-span-1 bg-white rounded-xl border border-gray-100 p-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center"><Stethoscope size={10} className="text-white" /></div>
                  <span className="text-xs font-bold text-slate-800">ClinicOS</span>
                </div>
                {[LayoutDashboard, Calendar, Users, Pill, BarChart3].map((Icon, i) => (
                  <div key={i} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg ${i === 0 ? "bg-blue-50 text-blue-600" : "text-slate-300"}`}>
                    <Icon size={10} />
                    <div className={`h-1.5 rounded-full ${i === 0 ? "bg-blue-200 w-14" : "bg-slate-100 w-10"}`} />
                  </div>
                ))}
              </div>
              <div className="col-span-4 space-y-3">
                <div className="grid grid-cols-4 gap-3">
                  {[{ label: "Patients", value: "284", Icon: Users, bg: "bg-blue-50 text-blue-600" }, { label: "Today", value: "6", Icon: Calendar, bg: "bg-teal-50 text-teal-600" }, { label: "Revenue", value: "$24K", Icon: DollarSign, bg: "bg-green-50 text-green-600" }, { label: "Packages", value: "38", Icon: Package, bg: "bg-amber-50 text-amber-600" }].map(c => (
                    <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] text-slate-400">{c.label}</span>
                        <div className={`w-5 h-5 rounded-md ${c.bg} flex items-center justify-center`}><c.Icon size={9} /></div>
                      </div>
                      <div className="text-base font-bold text-slate-800">{c.value}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-3 flex items-end gap-1 h-20">
                  {[28,42,35,58,48,68,62,80,70,88,75,90].map((h, i) => (
                    <div key={i} className={`flex-1 rounded-t ${i === 11 ? "bg-blue-600" : "bg-blue-100"}`} style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="absolute -bottom-3 inset-x-12 h-6 bg-blue-200 blur-xl opacity-40 rounded-full" />
        </div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    { Icon: Calendar,  title: "Smart Scheduling",      desc: "Intelligent booking with automated reminders and conflict detection.",     color: "bg-blue-50 text-blue-600" },
    { Icon: Users,     title: "Patient Management",    desc: "Complete profiles with history, documents, and full treatment timelines.", color: "bg-teal-50 text-teal-600" },
    { Icon: Pill,      title: "Digital Prescriptions", desc: "Create, sign, and share prescriptions digitally. Printable in one click.", color: "bg-green-50 text-green-600" },
    { Icon: BarChart3, title: "Revenue Analytics",     desc: "Track earnings, appointment trends, and clinic performance in real time.",  color: "bg-amber-50 text-amber-600" },
    { Icon: FileText,  title: "Electronic Records",    desc: "SOAP notes, diagnoses, and treatment plans — organized and searchable.",   color: "bg-purple-50 text-purple-600" },
    { Icon: Package,   title: "Service Packages",      desc: "Bundle services with custom pricing and automated follow-up scheduling.",  color: "bg-rose-50 text-rose-600" },
    { Icon: Receipt,   title: "Online Billing",        desc: "Auto-generate invoices and accept payments online with full audit trail.", color: "bg-cyan-50 text-cyan-600" },
    { Icon: Shield,    title: "HIPAA Compliant",       desc: "End-to-end encryption and role-based access keeps patient data safe.",     color: "bg-indigo-50 text-indigo-600" },
    { Icon: Globe,     title: "Clinic Directory",      desc: "Get discovered by patients searching for doctors in your area.",           color: "bg-emerald-50 text-emerald-600" },
  ];
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Features</p>
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Everything your clinic needs</h2>
          <p className="text-slate-500 text-lg max-w-xl mx-auto">One platform to run your practice — no more juggling separate tools.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(f => (
            <Card key={f.title} className="p-6 hover:shadow-md transition-all">
              <div className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center mb-5`}><f.Icon size={22} /></div>
              <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Create Your Clinic",  desc: "Set up your digital clinic in minutes. Add your profile, specialization, services, and availability.", Icon: Building2 },
    { n: "02", title: "Manage Patients",     desc: "Onboard patients, record medical history, schedule appointments, and issue digital prescriptions.",     Icon: Users },
    { n: "03", title: "Grow Your Practice",  desc: "Track analytics, manage revenue, and let patients discover your clinic through the ClinicOS directory.", Icon: TrendingUp },
  ];
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">How It Works</p>
          <h2 className="text-4xl font-bold text-slate-900">Set up in minutes, not months</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((s, idx) => (
            <div key={s.n} className="relative">
              <Card className="p-8">
                <div className="text-7xl font-black text-blue-50 mb-4 leading-none select-none">{s.n}</div>
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center mb-5">
                  <s.Icon size={20} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </Card>
              {idx < 2 && <div className="hidden md:block absolute top-1/2 -right-4 z-10 w-8 h-8 bg-white border border-gray-100 rounded-full shadow flex items-center justify-center"><ChevronRight size={14} className="text-blue-400" /></div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    { quote: "ClinicOS transformed how I run my practice. I save at least 2 hours every day on admin work.", name: "Dr. Priya Sharma",   role: "General Practitioner, Mumbai", initials: "PS", color: "bg-blue-100 text-blue-700",   stars: 5 },
    { quote: "My patients love digital prescriptions and appointment reminders. No more missed visits.",     name: "Dr. James Okafor",  role: "Cardiologist, Lagos",           initials: "JO", color: "bg-teal-100 text-teal-700",   stars: 5 },
    { quote: "The analytics dashboard helped me understand my practice financial health for the first time.", name: "Dr. Sofia Martinez", role: "Dermatologist, Madrid",         initials: "SM", color: "bg-purple-100 text-purple-700", stars: 5 },
  ];
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Testimonials</p>
          <h2 className="text-4xl font-bold text-slate-900">Loved by doctors worldwide</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map(t => (
            <Card key={t.name} className="p-8">
              <div className="flex gap-0.5 mb-6">{Array.from({ length: t.stars }).map((_, i) => <Star key={i} size={13} className="fill-amber-400 text-amber-400" />)}</div>
              <p className="text-sm text-slate-700 leading-relaxed mb-6">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${t.color} font-semibold text-sm flex items-center justify-center`}>{t.initials}</div>
                <div><p className="text-sm font-semibold text-slate-900">{t.name}</p><p className="text-xs text-slate-500">{t.role}</p></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ onStart }: { onStart: () => void }) {
  const plans = [
    { name: "Starter", price: "Free",  period: "",       desc: "Perfect for getting started", highlight: false, cta: "Get Started Free",
      features: ["Up to 50 patients", "Basic scheduling", "Digital prescriptions", "Patient portal", "Email support"] },
    { name: "Pro",     price: "$49",   period: "/month", desc: "For growing practices",        highlight: true,  cta: "Start Free Trial",
      features: ["Unlimited patients", "Advanced analytics", "Service packages", "Custom branding", "Priority support", "Revenue reports", "Directory listing"] },
    { name: "Enterprise", price: "$99",period: "/month", desc: "For multi-clinic operations", highlight: false, cta: "Contact Sales",
      features: ["Everything in Pro", "Multi-clinic management", "Team access", "API access", "Custom integrations", "Dedicated manager", "SLA guarantee"] },
  ];
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Pricing</p>
          <h2 className="text-4xl font-bold text-slate-900 mb-4">Simple, transparent pricing</h2>
          <p className="text-slate-500 text-lg">No hidden fees. Cancel anytime.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-center">
          {plans.map(p => (
            <div key={p.name} className={`rounded-2xl border p-8 flex flex-col ${p.highlight ? "bg-blue-600 border-blue-500 shadow-xl shadow-blue-200 scale-105" : "bg-white border-gray-100 shadow-sm"}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${p.highlight ? "text-blue-200" : "text-slate-400"}`}>{p.name}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className={`text-4xl font-extrabold ${p.highlight ? "text-white" : "text-slate-900"}`}>{p.price}</span>
                {p.period && <span className={`text-sm mb-1.5 ${p.highlight ? "text-blue-200" : "text-slate-400"}`}>{p.period}</span>}
              </div>
              <p className={`text-sm mb-6 ${p.highlight ? "text-blue-200" : "text-slate-500"}`}>{p.desc}</p>
              <ul className="space-y-3 mb-8 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <CheckCircle size={14} className={`mt-0.5 flex-shrink-0 ${p.highlight ? "text-blue-200" : "text-green-500"}`} />
                    <span className={`text-sm ${p.highlight ? "text-blue-100" : "text-slate-600"}`}>{f}</span>
                  </li>
                ))}
              </ul>
              <button onClick={onStart} className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${p.highlight ? "bg-white text-blue-600 hover:bg-blue-50" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const faqs = [
    { q: "Is ClinicOS suitable for any medical specialty?",         a: "Yes. ClinicOS is built for all independent practitioners — GPs, specialists, dentists, physiotherapists, and more. The platform is fully customizable to match your specialty's workflow." },
    { q: "How secure is my patient data?",                          a: "ClinicOS uses end-to-end HTTPS encryption, bcrypt password hashing, and strict role-based access control. Patient data is isolated per clinic and never shared across tenants." },
    { q: "Can I manage multiple clinics from one account?",         a: "Yes, on the Enterprise plan you can manage multiple clinic locations under a single account with separate dashboards, staff, and analytics for each." },
    { q: "Do patients need to download an app?",                    a: "No. Patients access their portal through any web browser — desktop or mobile. No downloads required for either doctors or patients." },
    { q: "What happens to my data if I cancel my subscription?",    a: "Your data remains accessible for 30 days after cancellation. You can export all records in standard formats before the account is deactivated." },
    { q: "Is there a free trial available?",                        a: "Yes. All plans include a 14-day free trial with full access to Pro features. No credit card required to start." },
  ];
  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">FAQ</p>
          <h2 className="text-4xl font-bold text-slate-900">Frequently asked questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((f, i) => (
            <Card key={i} className={`overflow-hidden transition-all ${open === i ? "shadow-md" : ""}`}>
              <button onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left">
                <span className="text-sm font-semibold text-slate-900 pr-4">{f.q}</span>
                {open === i ? <ChevronUp size={16} className="text-blue-600 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
              </button>
              {open === i && <div className="px-5 pb-5 text-sm text-slate-500 leading-relaxed border-t border-gray-50 pt-3">{f.a}</div>}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingCTA({ onStart }: { onStart: () => void }) {
  return (
    <section className="py-24 bg-blue-600">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold text-white mb-4">Ready to modernize your clinic?</h2>
        <p className="text-blue-200 text-lg mb-10">Join 2,500+ doctors who trust ClinicOS to run their practice.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Btn variant="white" size="lg" onClick={onStart}>Start Free — No Credit Card <ArrowRight size={16} /></Btn>
          <button onClick={onStart} className="text-blue-200 hover:text-white text-sm font-medium transition-colors">Schedule a Demo →</button>
        </div>
      </div>
    </section>
  );
}

function LandingFooter({ onLogin }: { onLogin: () => void }) {
  return (
    <footer className="bg-slate-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-8 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Stethoscope size={15} className="text-white" /></div>
              <span className="font-bold text-lg">Clinic<span className="text-blue-400">OS</span></span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">The complete operating system for independent doctors and clinic owners.</p>
            <div className="flex gap-3 mt-5">
              {["Twitter", "LinkedIn", "GitHub"].map(s => (
                <a key={s} href="#" className="text-xs text-slate-500 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg transition-colors">{s}</a>
              ))}
            </div>
          </div>
          {[
            { title: "Product", links: ["Features", "Pricing", "Changelog", "Roadmap"] },
            { title: "Company", links: ["About", "Blog", "Careers", "Press"] },
            { title: "Legal",   links: ["Privacy Policy", "Terms of Service", "HIPAA", "Security"] },
          ].map(col => (
            <div key={col.title}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">{col.title}</p>
              <ul className="space-y-3">
                {col.links.map(l => <li key={l}><a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-sm">© 2026 ClinicOS, Inc. All rights reserved.</p>
          <button onClick={onLogin} className="text-sm text-slate-400 hover:text-white transition-colors">Log in to your account →</button>
        </div>
      </div>
    </footer>
  );
}

function LandingPage({ onLogin, onStart, onPatientPortal, onAdmin }: {
  onLogin: () => void; onStart: () => void; onPatientPortal: () => void; onAdmin: () => void;
}) {
  return (
    <div className="min-h-screen bg-white">
      <LandingNav onLogin={onLogin} onStart={onStart} />
      <Hero onStart={onStart} />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing onStart={onStart} />
      <FAQ />
      <LandingCTA onStart={onStart} />
      <LandingFooter onLogin={onLogin} />
      {/* Dev nav */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-50">
        <button onClick={onPatientPortal} className="bg-teal-600 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg hover:bg-teal-700 transition-colors">Patient Portal Demo</button>
        <button onClick={onAdmin} className="bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg hover:bg-slate-700 transition-colors">Admin Panel Demo</button>
      </div>
    </div>
  );
}

// ── Auth ────────────────────────────────────────────────────────────────────────

function AuthPage({ onSuccess, onBack }: { onSuccess: (token: string, user: any) => void; onBack: () => void }) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [role, setRole] = useState<"doctor" | "patient">("doctor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAuth = async () => {
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        const { data } = await authApi.login({ email, password });
        if (role === "doctor" && !["doctor", "assistant", "admin"].includes(data.user.role)) {
          return setError(`This account is a ${data.user.role}. Switch to the Patient tab.`);
        }
        if (role === "patient" && !["patient", "admin"].includes(data.user.role)) {
          return setError(`This account is a ${data.user.role}. Switch to the Doctor tab.`);
        }
        onSuccess(data.token, data.user);
      } else if (mode === "register") {
        const nameParts = name.trim().split(/\s+/);
        const first_name = nameParts[0] || "";
        const last_name = nameParts.slice(1).join(" ") || "";
        try {
          await authApi.register({ email, password, role, first_name, last_name });
        } catch (registerErr: any) {
          if (registerErr.response?.status !== 409 && registerErr.response?.status !== 400) {
            throw registerErr;
          }
        }
        const { data } = await authApi.login({ email, password });
        onSuccess(data.token, data.user);
      } else {
        const { data } = await authApi.forgotPassword(email);
        setSent(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col w-[480px] bg-blue-600 p-12 text-white flex-shrink-0">
        <div className="flex items-center gap-2 mb-auto">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"><Stethoscope size={15} className="text-white" /></div>
          <span className="font-bold text-lg">ClinicOS</span>
        </div>
        <div className="py-16">
          <h2 className="text-4xl font-extrabold mb-6 leading-tight">Your clinic,<br />fully digital.</h2>
          <p className="text-blue-200 text-lg mb-10">Join thousands of doctors running their practice smarter with ClinicOS.</p>
          <div className="space-y-4">
            {[{ Icon: Calendar, text: "Smart appointment scheduling" }, { Icon: FileText, text: "Digital records & prescriptions" }, { Icon: BarChart3, text: "Real-time revenue analytics" }].map(item => (
              <div key={item.text} className="flex items-center gap-3 text-sm text-blue-100">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0"><item.Icon size={14} /></div>
                {item.text}
              </div>
            ))}
          </div>
        </div>
        <p className="text-blue-300 text-sm">2,500+ doctors trust ClinicOS</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-8 transition-colors">
            <ChevronRight size={13} className="rotate-180" /> Back to home
          </button>

          <Card className="p-8">
            {mode === "forgot" ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-5"><Lock size={20} className="text-blue-600" /></div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Reset password</h1>
                <p className="text-slate-500 text-sm mb-8">Enter your email and we will send you a reset link.</p>
                {sent ? (
                  <div className="text-center py-4">
                    <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-900 mb-1">Check your email</p>
                    <p className="text-sm text-slate-500">Reset link sent to {email || "your email"}</p>
                    <button onClick={() => { setSent(false); setMode("login"); }} className="mt-6 text-sm text-blue-600 font-medium hover:text-blue-700">Back to sign in</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="doctor@clinic.com" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <button onClick={handleAuth} disabled={submitting} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">{submitting ? "Sending..." : "Send Reset Link"}</button>
                    <button onClick={() => setMode("login")} className="w-full text-center text-sm text-slate-500 hover:text-slate-700 transition-colors">Back to sign in</button>
                  </div>
                )}
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
                <p className="text-slate-500 text-sm mb-6">{mode === "login" ? "Sign in to your ClinicOS account" : "Start your 14-day free trial — no card needed"}</p>
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
                  {(["doctor", "patient"] as const).map(r => (
                    <button key={r} onClick={() => setRole(r)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${role === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                      {r === "doctor" ? "Doctor" : "Patient"}
                    </button>
                  ))}
                </div>
                <div className="space-y-4">
                  {mode === "register" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{role === "doctor" ? "Full Name" : "Your Name"}</label>
                      <input value={name} onChange={e => setName(e.target.value)} placeholder={role === "doctor" ? "Dr. Jane Smith" : "Jane Smith"} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={role === "doctor" ? "doctor@clinic.com" : "patient@email.com"} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-600">Password</label>
                      {mode === "login" && <button onClick={() => setMode("forgot")} className="text-xs text-blue-600 hover:text-blue-700">Forgot?</button>}
                    </div>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
  <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
  <p className="text-sm text-red-700">{error}</p>
</div>}
                  <button onClick={handleAuth} disabled={submitting} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {submitting ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
                  </button>
                </div>
                <p className="text-center text-sm text-slate-500 mt-6">
                  {mode === "login"
                    ? <>Don&apos;t have an account? <button onClick={() => setMode("register")} className="text-blue-600 font-medium hover:text-blue-700">Sign up free</button></>
                    : <>Already have an account? <button onClick={() => setMode("login")} className="text-blue-600 font-medium hover:text-blue-700">Sign in</button></>}
                </p>
              </>
            )}
          </Card>
          <p className="text-center text-xs text-slate-400 mt-6">By continuing you agree to our <a href="#" className="underline">Terms</a> and <a href="#" className="underline">Privacy Policy</a></p>
        </div>
      </div>
    </div>
  );
}

// ── Onboarding Wizard ───────────────────────────────────────────────────────────

function OnboardingPage({ onFinish }: { onFinish: () => void }) {
  const [step, setStep] = useState(0);
  const [hours, setHours] = useState<Record<string, boolean>>({ Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false });
  const steps = ["Welcome", "Clinic Details", "Location & Hours", "Services & Fees", "All Done!"];
  const progress = ((step) / (steps.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center"><Stethoscope size={17} className="text-white" /></div>
            <span className="font-bold text-slate-900 text-xl">Clinic<span className="text-blue-600">OS</span></span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${i < step ? "bg-blue-600 text-white" : i === step ? "bg-blue-600 text-white ring-4 ring-blue-100" : "bg-slate-200 text-slate-400"}`}>
                  {i < step ? <Check size={13} /> : i + 1}
                </div>
                {i < steps.length - 1 && <div className={`h-0.5 flex-1 rounded-full transition-all ${i < step ? "bg-blue-600" : "bg-slate-200"}`} />}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">Step {step + 1} of {steps.length} — {steps[step]}</p>
        </div>

        <Card className="p-8">
          {step === 0 && (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Sparkles size={36} className="text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Welcome to ClinicOS!</h2>
              <p className="text-slate-500 leading-relaxed max-w-md mx-auto mb-8">
                You are just a few steps away from launching your digital clinic. We will help you set up everything — it takes less than 5 minutes.
              </p>
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[{ Icon: Building2, label: "Create Clinic" }, { Icon: Users, label: "Manage Patients" }, { Icon: BarChart3, label: "Track Revenue" }].map(item => (
                  <div key={item.label} className="p-4 bg-slate-50 rounded-2xl text-center">
                    <item.Icon size={22} className="text-blue-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                  </div>
                ))}
              </div>
              <Btn variant="primary" size="lg" onClick={() => setStep(1)}>Get Started <ArrowRight size={16} /></Btn>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Clinic Details</h2>
              <p className="text-slate-500 text-sm mb-6">Tell us about your clinic. This will be displayed on your public profile.</p>
              <div className="space-y-4">
                <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Building2 size={24} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 mb-1">Clinic Logo</p>
                    <p className="text-xs text-slate-500 mb-2">Upload a logo to personalize your clinic profile</p>
                    <Btn variant="outline" size="sm"><Upload size={12} /> Upload Logo</Btn>
                  </div>
                </div>
                {[{ label: "Clinic Name", ph: "e.g. Smith Family Clinic", val: "Smith Family Clinic" }, { label: "Tagline", ph: "A short tagline for your clinic", val: "Quality Care for Every Family" }, { label: "Specialization", ph: "e.g. General Practice, Cardiology", val: "General Practice" }].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                    <input defaultValue={f.val} placeholder={f.ph} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Consultation Fee (USD)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input defaultValue="75" type="number" className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Location & Working Hours</h2>
              <p className="text-slate-500 text-sm mb-6">Add your clinic address and set your availability schedule.</p>
              <div className="space-y-4 mb-6">
                {[{ label: "Street Address", ph: "123 Medical Drive, Suite 4B", val: "" }, { label: "City", ph: "New York", val: "" }].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                    <input placeholder={f.ph} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">State</label>
                    <input placeholder="NY" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">ZIP Code</label>
                    <input placeholder="10001" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-xs font-semibold text-slate-700 mb-3">Working Days</p>
                <div className="space-y-2">
                  {Object.entries(hours).map(([day, active]) => (
                    <div key={day} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <Toggle checked={active} onChange={() => setHours(h => ({ ...h, [day]: !h[day] }))} />
                        <span className="text-sm font-medium text-slate-700">{day}</span>
                      </div>
                      {active && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <select className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"><option>09:00 AM</option><option>08:00 AM</option><option>10:00 AM</option></select>
                          <span>—</span>
                          <select className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"><option>05:00 PM</option><option>06:00 PM</option><option>04:00 PM</option></select>
                        </div>
                      )}
                      {!active && <span className="text-xs text-slate-400">Closed</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Services & Qualification</h2>
              <p className="text-slate-500 text-sm mb-6">Add the services you offer. You can always add more later.</p>
              <div className="space-y-3 mb-6">
                {[{ name: "General Consultation", duration: "30 min", fee: "75" }, { name: "Follow-up Visit", duration: "20 min", fee: "45" }].map((s, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <input defaultValue={s.name} className="col-span-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      <input defaultValue={s.duration} className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                        <input defaultValue={s.fee} className="w-full pl-6 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </div>
                    </div>
                    <button className="text-red-400 hover:text-red-600 p-1 transition-colors"><Trash2 size={14} /></button>
                  </div>
                ))}
                <button className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 font-medium py-3 border-2 border-dashed border-blue-200 rounded-xl hover:bg-blue-50 transition-colors">
                  <Plus size={14} /> Add Service
                </button>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700">Professional Credentials</h3>
                {[{ label: "Medical License Number", ph: "MD-XXXXXXX" }, { label: "Qualification", ph: "e.g. MBBS, MD" }, { label: "Years of Experience", ph: "e.g. 10" }].map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                    <input placeholder={f.ph} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-green-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">Your clinic is ready!</h2>
              <p className="text-slate-500 leading-relaxed max-w-md mx-auto mb-8">
                Smith Family Clinic has been created successfully. You can now start managing appointments, patients, and grow your practice with ClinicOS.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-8">
                {[{ Icon: Calendar, title: "Book first appt", desc: "Add your first appointment" }, { Icon: Users, title: "Add patients", desc: "Start your patient list" }, { Icon: Package, title: "Create package", desc: "Bundle your services" }, { Icon: Globe, title: "View public profile", desc: "See how patients find you" }].map(item => (
                  <div key={item.title} className="p-4 bg-slate-50 rounded-2xl text-left">
                    <item.Icon size={18} className="text-blue-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                ))}
              </div>
              <Btn variant="primary" size="lg" onClick={onFinish}>Go to Dashboard <ArrowRight size={16} /></Btn>
            </div>
          )}

          {step < 4 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-50">
              <Btn variant="ghost" size="sm" onClick={() => setStep(Math.max(0, step - 1))} className={step === 0 ? "invisible" : ""}>
                <ChevronRight size={14} className="rotate-180" /> Back
              </Btn>
              <Btn variant="primary" onClick={() => setStep(step + 1)}>
                {step === 3 ? "Finish Setup" : "Continue"} <ArrowRight size={14} />
              </Btn>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── Doctor Dashboard ─────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Practice",
    items: [
      { id: "overview",      label: "Overview",      Icon: LayoutDashboard, badge: null },
      { id: "appointments",  label: "Appointments",  Icon: Calendar,        badge: "6" },
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
      { id: "notifications", label: "Notifications", Icon: Bell,            badge: "3" },
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
            <div onClick={() => setClinicOpen(v => !v)} className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${clinicOpen ? "bg-blue-50" : "hover:bg-slate-50"}`}>
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-semibold text-[11px] flex items-center justify-center flex-shrink-0">{clinicInitials}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-900 truncate">{clinicName}</p>
                <p className="text-[10px] text-slate-400 truncate">{clinics.length} clinic{clinics.length > 1 ? "s" : ""}</p>
              </div>
              {clinics.length > 1 && <ChevronDown size={12} className={`text-slate-400 flex-shrink-0 transition-transform ${clinicOpen ? "rotate-180" : ""}`} />}
            </div>
            {clinicOpen && clinics.length > 1 && (
              <div className="absolute left-3 right-3 top-full mt-0.5 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
                {clinics.map(c => (
                  <button key={c.id} onClick={() => { onSwitchClinic?.(c); setClinicOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left transition-colors ${c.id === selectedClinic?.id ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-600 hover:bg-slate-50"}`}>
                    <div className="w-5 h-5 rounded bg-slate-100 text-slate-500 font-semibold text-[9px] flex items-center justify-center flex-shrink-0">
                      {c.name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <span className="flex-1 truncate">{c.name}</span>
                    {c.id === selectedClinic?.id && <Check size={11} className="text-blue-600 flex-shrink-0" />}
                  </button>
                ))}
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

function TopBar({ section, setSection, cmdOpen, setCmdOpen }: { section: string; setSection: (s: string) => void; cmdOpen: boolean; setCmdOpen: (v: boolean) => void }) {
  const allItems = NAV_GROUPS.flatMap(g => g.items);
  const current = allItems.find(i => i.id === section);
  const title = current?.label ?? "Dashboard";
  const group = NAV_GROUPS.find(g => g.items.some(i => i.id === section))?.label ?? "ClinicOS";

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState(NOTIFICATIONS_DATA);
  const notifRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifs.filter(n => !n.read).length;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = () => setNotifs(n => n.map(x => ({ ...x, read: true })));

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
          <button onClick={() => setNotifOpen(v => !v)} className={`relative w-9 h-9 rounded-xl border flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors ${notifOpen ? "bg-slate-50 border-blue-200" : "border-gray-200"}`}>
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
                {notifs.map(n => (
                  <div key={n.id} onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                    className={`flex gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? "bg-blue-50/40" : ""}`}>
                    <div className="mt-0.5 flex-shrink-0"><NotifIcon type={n.type} /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm font-medium truncate ${n.read ? "text-slate-700" : "text-slate-900"}`}>{n.title}</p>
                        {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.desc}</p>
                      <p className="text-xs text-slate-400 mt-1">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-50 px-5 py-3">
                <button onClick={() => { setSection("notifications"); setNotifOpen(false); }} className="text-sm text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1.5">
                  View all notifications <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-semibold text-sm flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors">JS</div>
      </div>
    </div>
  );
}

// ── Dashboard Views ────────────────────────────────────────────────────────────

function OverviewView({ setSection }: { setSection: (s: string) => void }) {
  const [stats, setStats] = useState({ total_patients: 284, upcoming_appointments: 6, total_revenue: 24800, packages_sold: 38 });
  const [todayAppts, setTodayAppts] = useState(TODAY_APPTS);
  const user = getStoredUser();

  useEffect(() => {
    (async () => {
      try {
        const myClinics = await clinicsApi.getMyClinics();
        const clinic = myClinics.data.clinics?.[0];
        if (clinic) {
          const dashRes = await clinicsApi.getDashboard(clinic.id);
          const statsData = dashRes.data.stats;
          setStats({
            total_patients: statsData.total_patients,
            upcoming_appointments: statsData.upcoming_appointments,
            total_revenue: statsData.total_revenue,
            packages_sold: statsData.packages_sold || 0,
          });
          if (dashRes.data.today_appointments) {
            setTodayAppts(dashRes.data.today_appointments.map((a: any) => ({
              id: a.id, patient: `${a.patient_first_name} ${a.patient_last_name}`,
              time: a.start_time, type: a.type || "Check-up",
              status: a.status === "scheduled" ? "Pending" : a.status === "confirmed" ? "Confirmed" : a.status === "cancelled" ? "Cancelled" : "Confirmed",
              duration: "30 min", initials: (a.patient_first_name?.[0] || "P") + (a.patient_last_name?.[0] || "t"),
              color: "bg-blue-100 text-blue-700",
            })));
          }
        }
      } catch {}
    })();
  }, []);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; })();

  return (
    <div className="p-8 space-y-7">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{greeting}, {user?.first_name || "Doctor"} 👋</h2>
          <p className="text-slate-500 text-sm mt-0.5">{today} · {stats.upcoming_appointments} appointments today</p>
        </div>
        <Btn variant="primary" onClick={() => setSection("appointments")}><Plus size={14} /> New Appointment</Btn>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Patients",       value: stats.total_patients.toString(),     delta: 12,  Icon: Users,      bg: "bg-blue-50 text-blue-600" },
          { label: "Today's Appointments", value: stats.upcoming_appointments.toString(), delta: 8,   Icon: Calendar,   bg: "bg-teal-50 text-teal-600" },
          { label: "Monthly Revenue",      value: `$${(stats.total_revenue || 0).toLocaleString()}`, delta: 18,  Icon: DollarSign, bg: "bg-green-50 text-green-600" },
          { label: "Packages Sold",        value: (stats.packages_sold || 0).toString(), delta: -3,  Icon: Package,    bg: "bg-amber-50 text-amber-600" },
        ].map(s => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}><s.Icon size={15} /></div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{s.value}</div>
            <div className={`flex items-center gap-1 text-xs font-medium ${s.delta > 0 ? "text-green-600" : "text-red-500"}`}>
              <TrendingUp size={11} className={s.delta < 0 ? "rotate-180" : ""} /> {Math.abs(s.delta)}% from last month
            </div>
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-slate-900">Revenue Overview</h3>
              <p className="text-xs text-slate-400 mt-0.5">Jul 2025 – Jul 2026</p>
            </div>
            <select className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-slate-600 bg-white focus:outline-none">
              <option>Last 7 months</option><option>Last year</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(val: number) => [`$${val.toLocaleString()}`, "Revenue"]} contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
              <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="#2563EB" fillOpacity={0.08} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-5">Visit Types</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={44} outerRadius={68} dataKey="value" paddingAngle={3}>
                {PIE_DATA.map((_, i) => <Cell key={`overview-visit-${i}`} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-5 space-y-2.5">
            {PIE_DATA.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} />
                  <span className="text-slate-600">{d.name}</span>
                </div>
                <span className="font-semibold text-slate-900">{d.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold text-slate-900">Today&apos;s Schedule</h3>
            <p className="text-xs text-slate-400 mt-0.5">July 8, 2026</p>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => setSection("appointments")}>View all <ChevronRight size={12} /></Btn>
        </div>
        <div className="space-y-1">
          {todayAppts.map((appt: any) => (
            <div key={appt.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
              <span className="text-xs font-semibold text-slate-400 w-20 flex-shrink-0">{appt.time}</span>
              <div className={`w-8 h-8 rounded-full ${appt.color} font-semibold text-xs flex items-center justify-center flex-shrink-0`}>{appt.initials}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{appt.patient}</p>
                <p className="text-xs text-slate-400">{appt.type} · {appt.duration}</p>
              </div>
              <ApptBadge status={appt.status} />
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white"><Eye size={13} /></button>
                <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white"><Edit size={13} /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AppointmentsView() {
  const [filter, setFilter] = useState("all");
  const filters = ["all", "Confirmed", "Pending", "Cancelled"];
  const filtered = filter === "all" ? TODAY_APPTS : TODAY_APPTS.filter(a => a.status === filter);
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize ${filter === f ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-200 text-slate-600 hover:bg-slate-50"}`}>
              {f === "all" ? "All Appointments" : f}
            </button>
          ))}
        </div>
        <Btn variant="primary"><Plus size={14} /> Book Appointment</Btn>
      </div>
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-slate-900">July 2026</span>
          <div className="flex gap-1">
            <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><ChevronRight size={14} className="rotate-180" /></button>
            <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"><ChevronRight size={14} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
            <div key={d} className="text-center text-xs font-medium text-slate-400 py-1">{d}</div>
          ))}
          {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
            <button key={day} className={`h-9 rounded-xl text-sm font-medium transition-all relative ${day === 8 ? "bg-blue-600 text-white" : [5,6,12,13,19,20,26,27].includes(day) ? "text-slate-200 cursor-default" : "text-slate-700 hover:bg-slate-100"}`}>
              {day}
              {[3,8,10,15].includes(day) && day !== 8 && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400" />}
            </button>
          ))}
        </div>
      </Card>
      <Card>
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">July 8, 2026 — {filtered.length} appointments</h3>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input placeholder="Search..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48" />
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {filtered.map(appt => (
            <div key={appt.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group">
              <span className="text-sm font-semibold text-slate-400 w-24 flex-shrink-0">{appt.time}</span>
              <div className={`w-10 h-10 rounded-full ${appt.color} font-semibold text-sm flex items-center justify-center flex-shrink-0`}>{appt.initials}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{appt.patient}</p>
                <p className="text-xs text-slate-400">{appt.type} · {appt.duration}</p>
              </div>
              <ApptBadge status={appt.status} />
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white"><Eye size={14} /></button>
                <button className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-white"><Edit size={14} /></button>
                <button className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

type Patient = typeof PATIENTS[number];

function PatientDetail({ patient, onBack }: { patient: Patient; onBack: () => void }) {
  const [tab, setTab] = useState("overview");
  return (
    <div className="p-8 space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ChevronRight size={13} className="rotate-180" /> Back to Patients
      </button>
      <Card className="p-6">
        <div className="flex items-start gap-5">
          <div className={`w-16 h-16 rounded-2xl ${patient.color} font-bold text-xl flex items-center justify-center flex-shrink-0`}>{patient.initials}</div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-slate-900">{patient.name}</h2>
              <PatientBadge status={patient.status} />
            </div>
            <p className="text-slate-500 text-sm mb-4">{patient.condition} · {patient.age} years old</p>
            <div className="flex flex-wrap gap-5">
              <span className="flex items-center gap-1.5 text-sm text-slate-600"><Phone size={12} className="text-slate-400" />{patient.phone}</span>
              <span className="flex items-center gap-1.5 text-sm text-slate-600"><Mail size={12} className="text-slate-400" />{patient.name.toLowerCase().replace(" ",".")}@email.com</span>
              <span className="flex items-center gap-1.5 text-sm text-slate-600"><Clock size={12} className="text-slate-400" />Last visit: {patient.lastVisit}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Btn variant="outline" size="sm"><Calendar size={12} /> Schedule</Btn>
            <Btn variant="primary" size="sm"><Pill size={12} /> Prescribe</Btn>
          </div>
        </div>
      </Card>
      <div className="flex gap-1 border-b border-gray-100">
        {["overview","records","appointments","prescriptions"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium capitalize transition-all border-b-2 ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{t}</button>
        ))}
      </div>
      {tab === "overview" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="col-span-2 p-6">
            <h3 className="font-semibold text-slate-900 mb-5">Medical History Timeline</h3>
            <div className="space-y-1">
              {[
                { date: "Jul 3, 2026",  type: "Consultation", note: "Elevated blood pressure (145/90). Adjusted medication dosage. Recommended low-sodium diet and regular walks." },
                { date: "Jun 15, 2026", type: "Follow-up",    note: "BP slightly improved (138/85). Lab results reviewed — cholesterol elevated. Added statin therapy." },
                { date: "May 20, 2026", type: "Check-up",     note: "Routine check-up. ECG normal. Patient reports occasional headaches, advised daily BP monitoring." },
              ].map((r, i, arr) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-0.5 flex-shrink-0" />
                    {i < arr.length - 1 && <div className="w-px flex-1 bg-gray-100 my-1" />}
                  </div>
                  <div className="pb-5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-semibold text-slate-400">{r.date}</span>
                      <Badge variant="outline">{r.type}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">{r.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <div className="space-y-4">
            <Card className="p-5">
              <h4 className="text-sm font-semibold text-slate-900 mb-4">Vitals</h4>
              <div className="space-y-3">
                {[{ k:"Blood Pressure",v:"145/90 mmHg"},{k:"Heart Rate",v:"78 bpm"},{k:"Temperature",v:"98.6 °F"},{k:"Weight",v:"72 kg"},{k:"BMI",v:"24.2"}].map(row => (
                  <div key={row.k} className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{row.k}</span>
                    <span className="text-sm font-semibold text-slate-900">{row.v}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Allergies</h4>
              <div className="flex flex-wrap gap-2">
                {["Penicillin","Sulfonamides"].map(a => (
                  <span key={a} className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium border border-red-100">{a}</span>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Active Medications</h4>
              <div className="space-y-2">
                {["Amlodipine 5mg","Lisinopril 10mg","Atorvastatin 20mg"].map(m => (
                  <div key={m} className="flex items-center gap-2 text-xs">
                    <Pill size={11} className="text-blue-500 flex-shrink-0" />
                    <span className="text-slate-600">{m}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function PatientsView() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const filtered = PATIENTS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.condition.toLowerCase().includes(search.toLowerCase()));
  if (selected !== null) {
    const patient = PATIENTS.find(p => p.id === selected);
    if (patient) return <PatientDetail patient={patient} onBack={() => setSelected(null)} />;
  }
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patients..."
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 bg-white" />
        </div>
        <Btn variant="outline"><Filter size={13} /> Filter</Btn>
        <div className="ml-auto"><Btn variant="primary"><Plus size={14} /> Add Patient</Btn></div>
      </div>
      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              {["Patient","Age","Condition","Last Visit","Status",""].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-400 px-6 py-4 uppercase tracking-wider last:px-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${p.color} font-semibold text-sm flex items-center justify-center flex-shrink-0`}>{p.initials}</div>
                    <div><p className="text-sm font-medium text-slate-900">{p.name}</p><p className="text-xs text-slate-400">{p.phone}</p></div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">{p.age}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{p.condition}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{p.lastVisit}</td>
                <td className="px-6 py-4"><PatientBadge status={p.status} /></td>
                <td className="px-4 py-4">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={() => setSelected(p.id)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Eye size={14} /></button>
                    <button className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><Edit size={14} /></button>
                    <button className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
          <span className="text-xs text-slate-400">Showing {filtered.length} of {PATIENTS.length} patients</span>
          <div className="flex items-center gap-1">
            {[1,2,3].map(page => <button key={page} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === 1 ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{page}</button>)}
          </div>
        </div>
      </Card>
    </div>
  );
}

function EMRView() {
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const filtered = EMR_RECORDS.filter(r => r.patient.toLowerCase().includes(search.toLowerCase()) || r.diagnosis.toLowerCase().includes(search.toLowerCase()));

  if (selected !== null) {
    const record = EMR_RECORDS.find(r => r.id === selected);
    if (!record) return null;
    return (
      <div className="p-8 space-y-6">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ChevronRight size={13} className="rotate-180" /> Back to Records
        </button>
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${record.color} font-bold text-lg flex items-center justify-center`}>{record.initials}</div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{record.patient}</h2>
                <p className="text-sm text-slate-500">{record.type} · {record.date}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant={record.status === "Complete" ? "success" : "warning"}>{record.status}</Badge>
              <Btn variant="outline" size="sm"><Download size={12} /> Export</Btn>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Primary Diagnosis</h3>
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm font-semibold text-slate-900">{record.diagnosis}</p>
              </div>
            </div>
            {[
              { label: "Subjective", placeholder: "Patient reports elevated blood pressure over the past week, accompanied by mild headaches. No chest pain, shortness of breath, or dizziness reported." },
              { label: "Objective",  placeholder: "BP: 145/90 mmHg, HR: 78 bpm, Temp: 98.6°F, Weight: 72 kg. Cardiovascular exam: regular rate and rhythm, no murmurs." },
              { label: "Assessment", placeholder: "Essential hypertension, inadequately controlled on current regimen. Elevated cholesterol noted on recent labs." },
              { label: "Plan",       placeholder: "1. Increase Amlodipine to 10mg daily\n2. Add statin therapy: Atorvastatin 20mg\n3. Low-sodium diet counseling\n4. Follow-up in 4 weeks" },
            ].map(f => (
              <div key={f.label}>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{f.label}</h3>
                <textarea rows={4} defaultValue={f.placeholder} className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-6 border-t border-gray-50">
            <Btn variant="outline">Save Draft</Btn>
            <Btn variant="primary"><Check size={13} /> Finalize Record</Btn>
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records..." className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 bg-white" />
        </div>
        <Btn variant="primary"><Plus size={14} /> New Record</Btn>
      </div>
      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              {["Patient","Record Type","Diagnosis","Date","Status",""].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-400 px-6 py-4 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${r.color} font-semibold text-sm flex items-center justify-center`}>{r.initials}</div>
                    <span className="text-sm font-medium text-slate-900">{r.patient}</span>
                  </div>
                </td>
                <td className="px-6 py-4"><Badge variant="outline">{r.type}</Badge></td>
                <td className="px-6 py-4 text-sm text-slate-600">{r.diagnosis}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{r.date}</td>
                <td className="px-6 py-4"><Badge variant={r.status === "Complete" ? "success" : "warning"}>{r.status}</Badge></td>
                <td className="px-4 py-4">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={() => setSelected(r.id)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Eye size={14} /></button>
                    <button className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Download size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function PrescriptionsView() {
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("All");
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {["All","Active","Completed"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-200 text-slate-600 hover:bg-slate-50"}`}>{f}</button>
          ))}
        </div>
        <Btn variant="primary" onClick={() => setCreating(!creating)}><Plus size={14} /> New Prescription</Btn>
      </div>
      {creating && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900">New Prescription</h3>
            <button onClick={() => setCreating(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Patient</label>
              <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PATIENTS.map(p => <option key={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Diagnosis</label>
              <input placeholder="Primary diagnosis" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Clinical Notes</label>
              <textarea rows={2} placeholder="Additional notes for the patient..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-5">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100">
                  {["Medicine","Dosage","Frequency","Duration","Instructions"].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {["Amlodipine 5mg","1 tablet","Once daily","30 days","Take with or without food"].map((v, i) => (
                    <td key={i} className="px-4 py-3">
                      <input defaultValue={v} className="w-full text-sm text-slate-700 focus:outline-none bg-transparent border-b border-transparent focus:border-blue-400 pb-0.5 transition-colors" />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="outline" size="sm" onClick={() => setCreating(false)}>Cancel</Btn>
            <Btn variant="primary" size="sm" onClick={() => setCreating(false)}><Check size={13} /> Save Prescription</Btn>
          </div>
        </Card>
      )}
      <Card>
        <div className="divide-y divide-gray-50">
          {PRESCRIPTIONS.filter(r => filter === "All" || r.status === filter).map(rx => (
            <div key={rx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group">
              <div className={`w-10 h-10 rounded-full ${rx.color} font-semibold text-sm flex items-center justify-center flex-shrink-0`}>{rx.initials}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{rx.patient}</span>
                  <Badge variant={rx.status === "Active" ? "success" : "teal"}>{rx.status}</Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{rx.diagnosis} · {rx.medicines} medicines · {rx.date}</p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Eye size={14} /></button>
                <button className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Download size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function BillingView() {
  const [filter, setFilter] = useState("All");
  const totalRevenue = INVOICES.filter(i => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
  const pending = INVOICES.filter(i => i.status === "Pending").reduce((s, i) => s + i.amount, 0);
  const overdue = INVOICES.filter(i => i.status === "Overdue").reduce((s, i) => s + i.amount, 0);
  const filtered = INVOICES.filter(i => filter === "All" || i.status === filter);
  return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Collected",    value: `$${totalRevenue.toLocaleString()}`, Icon: DollarSign,  bg: "bg-green-50 text-green-600",  sub: "This month" },
          { label: "Pending",            value: `$${pending}`,                       Icon: Clock,        bg: "bg-amber-50 text-amber-600",  sub: "Awaiting payment" },
          { label: "Overdue",            value: `$${overdue}`,                       Icon: AlertCircle,  bg: "bg-red-50 text-red-600",      sub: "Action required" },
          { label: "Total Invoices",     value: INVOICES.length.toString(),          Icon: Receipt,      bg: "bg-blue-50 text-blue-600",    sub: "This month" },
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
          {["All","Paid","Pending","Overdue"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-200 text-slate-600 hover:bg-slate-50"}`}>{f}</button>
          ))}
        </div>
        <Btn variant="primary"><Plus size={14} /> New Invoice</Btn>
      </div>
      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              {["Invoice","Patient","Service","Date","Amount","Status",""].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-400 px-6 py-4 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(inv => (
              <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4 text-sm font-mono font-medium text-blue-600">{inv.id}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full ${inv.color} font-semibold text-xs flex items-center justify-center`}>{inv.initials}</div>
                    <span className="text-sm font-medium text-slate-900">{inv.patient}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 max-w-[160px] truncate">{inv.service}</td>
                <td className="px-6 py-4 text-sm text-slate-400">{inv.date}</td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-900">${inv.amount}</td>
                <td className="px-6 py-4"><InvoiceBadge status={inv.status} /></td>
                <td className="px-4 py-4">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Eye size={14} /></button>
                    <button className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Download size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-6 py-4 border-t border-gray-50 flex items-center justify-between">
          <span className="text-xs text-slate-400">Showing {filtered.length} of {INVOICES.length} invoices</span>
          <div className="flex items-center gap-1">
            {[1,2].map(p => <button key={p} className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === 1 ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{p}</button>)}
          </div>
        </div>
      </Card>
    </div>
  );
}

function ClinicMgmtView() {
  const [tab, setTab] = useState("profile");
  const [toggles, setToggles] = useState<Record<string, boolean>>({ "Online Booking": true, "Patient Reviews": true, "Directory Listing": true, "WhatsApp Reminders": false });
  return (
    <div className="p-8">
      <div className="flex gap-1 mb-8 border-b border-gray-100">
        {["profile","branding","hours","gallery","policies"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium capitalize transition-all border-b-2 ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{t}</button>
        ))}
      </div>
      {tab === "profile" && (
        <div className="max-w-2xl space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Clinic Information</h3>
            <div className="space-y-4">
              {[{ label:"Clinic Name",value:"Smith Family Clinic"},{label:"Tagline",value:"Quality Care for Every Family"},{label:"Specialization",value:"General Practice"},{label:"Phone",value:"+1 (555) 123-4567"},{label:"Email",value:"info@smithclinic.com"},{label:"Website",value:"https://smithclinic.com"}].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                  <input defaultValue={f.value} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">About the Clinic</label>
                <textarea rows={3} defaultValue="Smith Family Clinic has been providing quality healthcare to the community since 2010. We specialize in comprehensive primary care for patients of all ages." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end mt-6"><Btn variant="primary"><Check size={13} /> Save Changes</Btn></div>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Clinic Settings</h3>
            <div className="space-y-1">
              {Object.entries(toggles).map(([label, val]) => (
                <div key={label} className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm font-medium text-slate-900">{label}</span>
                  <Toggle checked={val} onChange={() => setToggles(t => ({ ...t, [label]: !t[label] }))} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      {tab === "branding" && (
        <div className="max-w-2xl space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Clinic Branding</h3>
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-3">Clinic Logo</p>
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl border-2 border-dashed border-blue-200">SF</div>
                  <div>
                    <Btn variant="outline" size="sm" className="mb-2"><Upload size={12} /> Upload Logo</Btn>
                    <p className="text-xs text-slate-400">PNG or SVG, min 200×200px</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-3">Clinic Banner</p>
                <div className="w-full h-32 rounded-xl bg-gradient-to-r from-blue-500 to-teal-400 flex items-center justify-center border-2 border-dashed border-blue-200 cursor-pointer hover:opacity-90 transition-opacity">
                  <div className="text-center text-white">
                    <Upload size={20} className="mx-auto mb-1 opacity-70" />
                    <p className="text-sm font-medium opacity-80">Click to upload banner</p>
                    <p className="text-xs opacity-60">1440×400px recommended</p>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-3">Brand Color</p>
                <div className="flex items-center gap-3">
                  {["#2563EB","#14B8A6","#8B5CF6","#EF4444","#F59E0B","#22C55E"].map(c => (
                    <button key={c} className={`w-8 h-8 rounded-full border-2 transition-all ${c === "#2563EB" ? "border-slate-900 scale-110" : "border-transparent hover:scale-105"}`} style={{ background: c }} />
                  ))}
                  <div className="ml-2 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-600" />
                    <span className="text-xs font-mono text-slate-600">#2563EB</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6"><Btn variant="primary"><Check size={13} /> Save Branding</Btn></div>
          </Card>
        </div>
      )}
      {tab === "hours" && (
        <div className="max-w-xl">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Working Hours</h3>
            <div className="space-y-1">
              {[{ day:"Monday",open:"09:00 AM",close:"05:00 PM",active:true},{day:"Tuesday",open:"09:00 AM",close:"05:00 PM",active:true},{day:"Wednesday",open:"09:00 AM",close:"05:00 PM",active:true},{day:"Thursday",open:"09:00 AM",close:"05:00 PM",active:true},{day:"Friday",open:"09:00 AM",close:"04:00 PM",active:true},{day:"Saturday",open:"10:00 AM",close:"02:00 PM",active:true},{day:"Sunday",open:"",close:"",active:false}].map((row, i) => (
                <div key={i} className="flex items-center gap-4 py-3.5 border-b border-gray-50 last:border-0">
                  <div className="w-28 text-sm font-medium text-slate-700">{row.day}</div>
                  <Toggle checked={row.active} onChange={() => {}} />
                  {row.active ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600 ml-2">
                      <select defaultValue={row.open} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 text-slate-700">
                        {["08:00 AM","09:00 AM","10:00 AM","11:00 AM"].map(t => <option key={t}>{t}</option>)}
                      </select>
                      <span className="text-slate-400">to</span>
                      <select defaultValue={row.close} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 text-slate-700">
                        {["03:00 PM","04:00 PM","05:00 PM","06:00 PM"].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  ) : <span className="text-xs text-slate-400 ml-2">Closed</span>}
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-6"><Btn variant="primary"><Check size={13} /> Save Hours</Btn></div>
          </Card>
        </div>
      )}
      {tab === "gallery" && (
        <div className="max-w-3xl">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-slate-900">Clinic Gallery</h3>
              <Btn variant="outline" size="sm"><Upload size={12} /> Upload Photos</Btn>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`aspect-video rounded-xl overflow-hidden relative group cursor-pointer ${["bg-blue-100","bg-teal-100","bg-green-100","bg-amber-100","bg-purple-100","bg-rose-100"][i]}`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Building2 size={28} className="text-white opacity-40" />
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button className="p-2 bg-white rounded-lg text-slate-700"><Eye size={13} /></button>
                    <button className="p-2 bg-white rounded-lg text-red-500"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
              <div className="aspect-video rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all">
                <Plus size={20} className="text-slate-400" />
                <span className="text-xs text-slate-400 font-medium">Add Photo</span>
              </div>
            </div>
          </Card>
        </div>
      )}
      {tab === "policies" && (
        <div className="max-w-2xl space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Clinic Policies</h3>
            <div className="space-y-4">
              {[{ label:"Cancellation Policy",val:"Patients must cancel at least 24 hours before their appointment to avoid a cancellation fee of $25."},{label:"Late Arrival Policy",val:"Patients arriving more than 15 minutes late may need to be rescheduled based on availability."},{label:"Payment Policy",val:"Full payment is expected at the time of service. We accept all major credit cards, insurance, and online payments."}].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                  <textarea rows={3} defaultValue={f.val} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-6"><Btn variant="primary"><Check size={13} /> Save Policies</Btn></div>
          </Card>
        </div>
      )}
    </div>
  );
}

function ServicesView() {
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = SERVICES.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search services..." className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 bg-white" />
        </div>
        <Btn variant="primary" onClick={() => setCreating(!creating)}><Plus size={14} /> Add Service</Btn>
      </div>
      {creating && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900">New Service</h3>
            <button onClick={() => setCreating(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {[{ label:"Service Name",ph:"e.g. General Consultation"},{label:"Category",ph:"e.g. Consultation, Check-up"}].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                <input placeholder={f.ph} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Duration</label>
              <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["15 min","20 min","30 min","45 min","60 min","90 min"].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Fee (USD)</label>
              <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span><input type="number" placeholder="75" className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Description</label>
              <textarea rows={2} placeholder="Brief description of this service..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="outline" size="sm" onClick={() => setCreating(false)}>Cancel</Btn>
            <Btn variant="primary" size="sm" onClick={() => setCreating(false)}><Check size={13} /> Save Service</Btn>
          </div>
        </Card>
      )}
      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              {["Service","Category","Duration","Fee","Bookings","Status",""].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-400 px-6 py-4 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><Layers size={14} className="text-blue-600" /></div>
                    <span className="text-sm font-medium text-slate-900">{s.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4"><Badge variant="outline">{s.category}</Badge></td>
                <td className="px-6 py-4 text-sm text-slate-600">{s.duration}</td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-900">${s.fee}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{s.bookings} bookings</td>
                <td className="px-6 py-4"><Badge variant={s.active ? "success" : "outline"}>{s.active ? "Active" : "Inactive"}</Badge></td>
                <td className="px-4 py-4">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Edit size={14} /></button>
                    <button className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function PackagesView() {
  const [creating, setCreating] = useState(false);
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Service Packages</h2>
          <p className="text-sm text-slate-500 mt-0.5">Bundle your services with discounted pricing</p>
        </div>
        <Btn variant="primary" onClick={() => setCreating(!creating)}><Plus size={14} /> Create Package</Btn>
      </div>
      {creating && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-900">New Package</h3>
            <button onClick={() => setCreating(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Package Name</label>
              <input placeholder="e.g. Hypertension Care Pack" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Duration</label>
              <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["1 month","2 months","3 months","6 months","12 months"].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Package Price (USD)</label>
              <div className="relative"><span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span><input type="number" placeholder="299" className="w-full pl-8 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Follow-up Interval</label>
              <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {["Every week","Every 2 weeks","Every month","Every 2 months"].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Included Services</label>
              <div className="space-y-2">
                {SERVICES.slice(0,4).map(s => (
                  <label key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" defaultChecked={s.id <= 2} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm text-slate-700">{s.name}</span>
                    <span className="ml-auto text-xs text-slate-400">${s.fee}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Btn variant="outline" size="sm" onClick={() => setCreating(false)}>Cancel</Btn>
            <Btn variant="primary" size="sm" onClick={() => setCreating(false)}><Check size={13} /> Create Package</Btn>
          </div>
        </Card>
      )}
      <div className="grid md:grid-cols-2 gap-5">
        {PACKAGES.map(pkg => (
          <Card key={pkg.id} className={`border-2 ${pkg.color} p-6`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 mb-1">{pkg.name}</h3>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Layers size={11} /> {pkg.services} services</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {pkg.duration}</span>
                </div>
              </div>
              <Badge variant={pkg.active ? "success" : "outline"}>{pkg.active ? "Active" : "Inactive"}</Badge>
            </div>
            <div className="flex items-end justify-between mb-5">
              <div>
                <div className="text-3xl font-extrabold text-slate-900">${pkg.price}</div>
                <div className="text-xs text-slate-400 mt-0.5">per {pkg.duration}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-blue-600">{pkg.sold}</div>
                <div className="text-xs text-slate-400">packages sold</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Btn variant="outline" size="sm" className="flex-1"><Edit size={12} /> Edit</Btn>
              <button className="p-2 rounded-xl border border-gray-200 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-colors"><Trash2 size={14} /></button>
            </div>
          </Card>
        ))}
        <button onClick={() => setCreating(true)} className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer">
          <Plus size={24} />
          <span className="text-sm font-medium">Create New Package</span>
        </button>
      </div>
    </div>
  );
}

function AnalyticsView() {
  return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue",     value: "$148,200", sub: "+22% YoY",           up: true },
          { label: "Avg. Per Visit",    value: "$87",      sub: "+$12 vs last year",  up: true },
          { label: "Patient Retention", value: "78%",      sub: "+5% vs last year",   up: true },
          { label: "No-Show Rate",      value: "8%",       sub: "-3% vs last year",   up: false },
        ].map(k => (
          <Card key={k.label} className="p-5">
            <p className="text-xs font-medium text-slate-500 mb-1">{k.label}</p>
            <p className="text-2xl font-bold text-slate-900 mb-1">{k.value}</p>
            <p className={`text-xs font-medium ${k.up ? "text-green-600" : "text-red-500"}`}>{k.sub}</p>
          </Card>
        ))}
      </div>
      <Card className="p-6">
        <h3 className="font-semibold text-slate-900 mb-6">Monthly Revenue Breakdown</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={revenueData} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(val: number) => [`$${val.toLocaleString()}`, "Revenue"]} contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
            <Bar dataKey="revenue" fill="#2563EB" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-6">Appointment Volume</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
              <Area type="monotone" dataKey="appointments" stroke="#14B8A6" strokeWidth={2} fill="#14B8A6" fillOpacity={0.08} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-5">Visit Distribution</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={44} outerRadius={68} dataKey="value" paddingAngle={3}>
                {PIE_DATA.map((_, i) => <Cell key={`analytics-dist-${i}`} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-5 space-y-2.5">
            {PIE_DATA.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} /><span className="text-slate-600">{d.name}</span></div>
                <span className="font-semibold text-slate-900">{d.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function NotificationsView() {
  const [notifs, setNotifs] = useState(NOTIFICATIONS_DATA);
  const unread = notifs.filter(n => !n.read).length;
  const markAll = () => setNotifs(n => n.map(x => ({ ...x, read: true })));
  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
          <p className="text-sm text-slate-500 mt-0.5">{unread} unread notifications</p>
        </div>
        {unread > 0 && <Btn variant="ghost" size="sm" onClick={markAll}><Check size={13} /> Mark all as read</Btn>}
      </div>
      <Card>
        <div className="divide-y divide-gray-50">
          {notifs.map(n => (
            <div key={n.id} onClick={() => setNotifs(ns => ns.map(x => x.id === n.id ? { ...x, read: true } : x))}
              className={`flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors ${!n.read ? "bg-blue-50/40 hover:bg-blue-50/60" : "hover:bg-slate-50/50"}`}>
              <NotifIcon type={n.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-semibold ${!n.read ? "text-slate-900" : "text-slate-700"}`}>{n.title}</p>
                  <span className="text-xs text-slate-400 flex-shrink-0">{n.time}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.desc}</p>
              </div>
              {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SettingsView() {
  const [tab, setTab] = useState("profile");
  const [toggles, setToggles] = useState<Record<string, boolean>>({ "New Appointment": true, "Appointment Reminder": true, "Patient Messages": false, "Prescription Download": true, "Monthly Reports": false });
  return (
    <div className="p-8">
      <div className="flex gap-0.5 mb-8 border-b border-gray-100">
        {["profile","clinic","security","notifications"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium capitalize transition-all border-b-2 ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{t}</button>
        ))}
      </div>
      {tab === "profile" && (
        <div className="max-w-2xl space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Profile Information</h3>
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-50">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 font-bold text-xl flex items-center justify-center">JS</div>
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-0.5">Dr. James Smith</p>
                <p className="text-xs text-slate-400 mb-3">General Practitioner</p>
                <Btn variant="outline" size="sm"><Upload size={12} /> Upload Photo</Btn>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[{label:"First Name",value:"James",ph:"First name"},{label:"Last Name",value:"Smith",ph:"Last name"},{label:"Email",value:"james.smith@clinicos.io",ph:"Email"},{label:"Phone",value:"+1 (555) 123-4567",ph:"Phone"},{label:"Specialization",value:"General Practitioner",ph:"Specialization"},{label:"License No.",value:"MD-2847291",ph:"License number"}].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                  <input defaultValue={f.value} placeholder={f.ph} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-6"><Btn variant="primary"><Check size={13} /> Save Changes</Btn></div>
          </Card>
        </div>
      )}
      {tab === "clinic" && (
        <div className="max-w-2xl space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Clinic Details</h3>
            <div className="space-y-4">
              {[{label:"Clinic Name",value:"Smith Family Clinic"},{label:"Tagline",value:"Quality Care for Every Family"},{label:"Address",value:"123 Medical Drive, Suite 4B, New York, NY 10001"},{label:"Website",value:"https://smithclinic.com"}].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                  <input defaultValue={f.value} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-6"><Btn variant="primary"><Check size={13} /> Save Clinic Info</Btn></div>
          </Card>
        </div>
      )}
      {tab === "security" && (
        <div className="max-w-sm space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Change Password</h3>
            <div className="space-y-4">
              {["Current Password","New Password","Confirm Password"].map(l => (
                <div key={l}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{l}</label>
                  <input type="password" placeholder="••••••••" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <button className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mt-2">
                <Lock size={13} /> Update Password
              </button>
            </div>
          </Card>
        </div>
      )}
      {tab === "notifications" && (
        <div className="max-w-lg">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Notification Preferences</h3>
            <div className="space-y-1">
              {[{label:"New Appointment",desc:"When a patient books an appointment"},{label:"Appointment Reminder",desc:"1 hour before each appointment"},{label:"Patient Messages",desc:"When a patient sends a message"},{label:"Prescription Download",desc:"When a prescription is downloaded"},{label:"Monthly Reports",desc:"Monthly analytics summary email"}].map(item => (
                <div key={item.label} className="flex items-center justify-between py-3.5 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                  <Toggle checked={toggles[item.label]} onChange={() => setToggles(t => ({ ...t, [item.label]: !t[item.label] }))} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

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

function DashboardLayout({ section, setSection, onLogout, user, clinics, selectedClinic, onSwitchClinic, onCreateClinic }: { section: string; setSection: (s: string) => void; onLogout: () => void; user?: any; clinics?: any[]; selectedClinic?: any; onSwitchClinic?: (c: any) => void; onCreateClinic?: (data: any) => Promise<any>; }) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [showCreateClinic, setShowCreateClinic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", state: "", country: "", description: "" });

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      await onCreateClinic?.(form);
      setShowCreateClinic(false);
      setForm({ name: "", phone: "", email: "", address: "", city: "", state: "", country: "", description: "" });
    } catch { /* toast would go here */ }
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
      case "appointments":  return <AppointmentsView />;
      case "patients":      return <PatientsView />;
      case "emr":           return <EMRView />;
      case "prescriptions": return <PrescriptionsView />;
      case "billing":       return <BillingView />;
      case "clinic":        return <ClinicMgmtView />;
      case "services":      return <ServicesView />;
      case "packages":      return <PackagesView />;
      case "analytics":     return <AnalyticsView />;
      case "notifications": return <NotificationsView />;
      case "settings":      return <SettingsView />;
      default:              return <OverviewView setSection={setSection} />;
    }
  };
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar section={section} setSection={setSection} onLogout={onLogout} user={user} clinics={clinics} selectedClinic={selectedClinic} onSwitchClinic={onSwitchClinic} onOpenCreateClinic={() => setShowCreateClinic(true)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar section={section} setSection={setSection} cmdOpen={cmdOpen} setCmdOpen={setCmdOpen} />
        <main className="flex-1 overflow-y-auto">{renderView()}</main>
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

const PATIENT_NAV = [
  { id: "p-overview",     label: "My Health",        Icon: Heart },
  { id: "p-appointments", label: "Appointments",     Icon: Calendar },
  { id: "p-records",      label: "Medical Records",  Icon: FileText },
  { id: "p-prescriptions",label: "Prescriptions",    Icon: Pill },
  { id: "p-invoices",     label: "Invoices",         Icon: Receipt },
  { id: "p-profile",      label: "Profile",          Icon: UserCheck },
];

function PatientPortal({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  const [section, setSection] = useState("p-overview");
  const [patientNotifOpen, setPatientNotifOpen] = useState(false);
  const [patientNotifs, setPatientNotifs] = useState([
    { id: 1, title: "Appointment Confirmed", desc: "Your appointment on Jul 10 at 10:30 AM is confirmed", time: "1 hour ago", read: false },
    { id: 2, title: "Prescription Ready", desc: "Your prescription RX-001 is ready for download", time: "Yesterday", read: false },
    { id: 3, title: "Invoice Due", desc: "Invoice INV-2026-003 for $75 is due", time: "2 days ago", read: true },
  ]);
  const user = getStoredUser();
  const patientNotifRef = useRef<HTMLDivElement>(null);
  const patientUnread = patientNotifs.filter(n => !n.read).length;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (patientNotifRef.current && !patientNotifRef.current.contains(e.target as Node)) setPatientNotifOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="w-60 bg-white border-r border-gray-100 flex flex-col h-screen flex-shrink-0">
        <div className="px-6 py-5 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center"><Heart size={15} className="text-white" /></div>
            <span className="font-bold text-slate-900">Clinic<span className="text-teal-500">OS</span></span>
            <span className="ml-auto text-[10px] font-semibold bg-teal-50 text-teal-600 border border-teal-100 px-2 py-0.5 rounded-full">Patient</span>
          </div>
        </div>
        <div className="px-3 py-3 border-b border-gray-50">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 font-semibold text-sm flex items-center justify-center">{(user?.first_name?.[0] || "U") + (user?.last_name?.[0] || "")}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.first_name || "Patient"} {user?.last_name || ""}</p>
              <p className="text-xs text-slate-400 truncate">Patient Portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {PATIENT_NAV.map(item => {
            const active = section === item.id;
            return (
              <button key={item.id} onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
                <item.Icon size={15} className={active ? "text-teal-600" : "text-slate-400"} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-gray-50">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <LogOut size={15} className="text-slate-400" /> Sign Out
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0 relative z-20">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{PATIENT_NAV.find(n => n.id === section)?.label ?? "Patient Portal"}</h1>
            <p className="text-xs text-slate-400 mt-0.5">Smith Family Clinic · Dr. James Smith</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={patientNotifRef}>
              <button onClick={() => setPatientNotifOpen(v => !v)} className={`relative w-9 h-9 rounded-xl border flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors ${patientNotifOpen ? "bg-slate-50 border-teal-200" : "border-gray-200"}`}>
                <Bell size={15} />
                {patientUnread > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">{patientUnread}</span>}
              </button>
              {patientNotifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                    <h3 className="font-semibold text-slate-900 text-sm">Notifications</h3>
                    <button onClick={() => setPatientNotifOpen(false)} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-400"><X size={13} /></button>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {patientNotifs.map(n => (
                      <div key={n.id} onClick={() => setPatientNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                        className={`flex gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors ${!n.read ? "bg-teal-50/40" : ""}`}>
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Bell size={13} className="text-teal-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${n.read ? "text-slate-700" : "text-slate-900"}`}>{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{n.desc}</p>
                          <p className="text-xs text-slate-400 mt-1">{n.time}</p>
                        </div>
                        {!n.read && <span className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-2" />}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-50 px-5 py-3">
                    <button onClick={() => { setPatientNotifs(n => n.map(x => ({ ...x, read: true }))); setPatientNotifOpen(false); }} className="text-sm text-teal-600 font-medium hover:text-teal-700">
                      Mark all as read
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 font-semibold text-sm flex items-center justify-center cursor-pointer hover:bg-teal-200 transition-colors">SJ</div>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {section === "p-overview" && (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Hello, Sarah 👋</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Here is your health summary</p>
                </div>
                <Btn variant="teal" onClick={() => setSection("p-appointments")}><Plus size={14} /> Book Appointment</Btn>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Next Appointment",  value: "Jul 10",    Icon: Calendar,  bg: "bg-teal-50 text-teal-600" },
                  { label: "Active Medications",value: "3",          Icon: Pill,       bg: "bg-blue-50 text-blue-600" },
                  { label: "Total Visits",      value: "12",         Icon: Heart,      bg: "bg-rose-50 text-rose-600" },
                  { label: "Pending Invoices",  value: "$75",        Icon: Receipt,    bg: "bg-amber-50 text-amber-600" },
                ].map(s => (
                  <Card key={s.label} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-slate-500">{s.label}</span>
                      <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}><s.Icon size={15} /></div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{s.value}</div>
                  </Card>
                ))}
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Upcoming Appointments</h3>
                  <div className="space-y-3">
                    {TODAY_APPTS.slice(0,3).map((appt, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0"><Calendar size={15} className="text-teal-600" /></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{appt.type}</p>
                          <p className="text-xs text-slate-400">Jul 10, 2026 · {appt.time}</p>
                        </div>
                        <ApptBadge status={appt.status} />
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Current Medications</h3>
                  <div className="space-y-3">
                    {[{ name:"Amlodipine 5mg",freq:"Once daily",until:"Aug 3, 2026"},{name:"Lisinopril 10mg",freq:"Once daily",until:"Aug 3, 2026"},{name:"Atorvastatin 20mg",freq:"At bedtime",until:"Sep 1, 2026"}].map((m, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0"><Pill size={15} className="text-blue-600" /></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900">{m.name}</p>
                          <p className="text-xs text-slate-400">{m.freq} · Until {m.until}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
              <Card className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Your Vitals (Last Visit)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[{k:"Blood Pressure",v:"145/90",unit:"mmHg",Icon:Activity},{k:"Heart Rate",v:"78",unit:"bpm",Icon:Heart},{k:"Temperature",v:"98.6",unit:"°F",Icon:Activity},{k:"Weight",v:"72",unit:"kg",Icon:UserCheck},{k:"BMI",v:"24.2",unit:"",Icon:Activity}].map(row => (
                    <div key={row.k} className="bg-slate-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-400 mb-1">{row.k}</p>
                      <p className="text-xl font-bold text-slate-900">{row.v}</p>
                      <p className="text-xs text-slate-500">{row.unit}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
          {section === "p-appointments" && (
            <Card>
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">My Appointments</h3>
                <Btn variant="teal" size="sm"><Plus size={13} /> Book New</Btn>
              </div>
              <div className="divide-y divide-gray-50">
                {TODAY_APPTS.map(appt => (
                  <div key={appt.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0"><Calendar size={15} className="text-teal-600" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{appt.type} with Dr. James Smith</p>
                      <p className="text-xs text-slate-400">Jul 8, 2026 · {appt.time} · {appt.duration}</p>
                    </div>
                    <ApptBadge status={appt.status} />
                    {appt.status === "Confirmed" && <Btn variant="ghost" size="sm">Reschedule</Btn>}
                  </div>
                ))}
              </div>
            </Card>
          )}
          {section === "p-records" && (
            <Card>
              <div className="p-6 border-b border-gray-50"><h3 className="font-semibold text-slate-900">Medical Records</h3></div>
              <div className="divide-y divide-gray-50">
                {[{date:"Jul 3, 2026",type:"Consultation",diag:"Hypertension — adjusted medication"},{date:"Jun 15, 2026",type:"Follow-up",diag:"BP monitoring — cholesterol review"},{date:"May 20, 2026",type:"Check-up",diag:"Annual health check — ECG normal"}].map((r, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 group">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0"><FileText size={15} className="text-blue-600" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{r.diag}</p>
                      <p className="text-xs text-slate-400">{r.date} · {r.type}</p>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"><Download size={14} /></button>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {section === "p-prescriptions" && (
            <Card>
              <div className="p-6 border-b border-gray-50"><h3 className="font-semibold text-slate-900">My Prescriptions</h3></div>
              <div className="divide-y divide-gray-50">
                {PRESCRIPTIONS.slice(0,2).map(rx => (
                  <div key={rx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 group">
                    <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0"><Pill size={15} className="text-green-600" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{rx.diagnosis}</p>
                      <p className="text-xs text-slate-400">{rx.date} · {rx.medicines} medicines · Dr. James Smith</p>
                    </div>
                    <Badge variant={rx.status === "Active" ? "success" : "teal"}>{rx.status}</Badge>
                    <button className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"><Download size={14} /></button>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {section === "p-invoices" && (
            <Card>
              <div className="p-6 border-b border-gray-50"><h3 className="font-semibold text-slate-900">My Invoices</h3></div>
              <div className="divide-y divide-gray-50">
                {INVOICES.filter(i => i.patient === "Sarah Johnson" || i.patient === "Michael Chen").slice(0,3).map(inv => (
                  <div key={inv.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0"><Receipt size={15} className="text-amber-600" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{inv.service}</p>
                      <p className="text-xs text-slate-400">{inv.id} · {inv.date}</p>
                    </div>
                    <span className="text-sm font-bold text-slate-900">${inv.amount}</span>
                    <InvoiceBadge status={inv.status} />
                    {inv.status === "Pending" && <Btn variant="teal" size="sm">Pay Now</Btn>}
                  </div>
                ))}
              </div>
            </Card>
          )}
          {section === "p-profile" && (
            <div className="max-w-lg">
              <Card className="p-6">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-50">
                  <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 font-bold text-xl flex items-center justify-center">SJ</div>
                  <div><p className="text-sm font-semibold text-slate-900 mb-0.5">Sarah Johnson</p><p className="text-xs text-slate-400">Patient since Jan 2025</p></div>
                </div>
                <div className="space-y-4">
                  {[{label:"Full Name",value:"Sarah Johnson"},{label:"Date of Birth",value:"Mar 15, 1992"},{label:"Phone",value:"+1 (555) 234-5678"},{label:"Email",value:"sarah.johnson@email.com"},{label:"Blood Type",value:"A+"},{label:"Emergency Contact",value:"+1 (555) 999-0000"}].map(f => (
                    <div key={f.label}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                      <input defaultValue={f.value} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end mt-6"><Btn variant="teal"><Check size={13} /> Save Profile</Btn></div>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Admin Panel ─────────────────────────────────────────────────────────────────

const ADMIN_NAV = [
  { id: "a-overview",       label: "Platform Overview", Icon: LayoutDashboard },
  { id: "a-clinics",        label: "Clinics",           Icon: Building2 },
  { id: "a-doctors",        label: "Doctors",           Icon: UserCheck },
  { id: "a-subscriptions",  label: "Subscriptions",     Icon: CreditCard },
  { id: "a-reviews",        label: "Reviews",           Icon: Star },
  { id: "a-settings",       label: "Settings",          Icon: Settings },
];

function AdminPanel({ onBack, onLogout, user }: { onBack: () => void; onLogout: () => void; user?: any }) {
  const [section, setSection] = useState("a-overview");
  const [clinicFilter, setClinicFilter] = useState("All");
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Admin";
  const initials = ((user?.first_name?.[0] || "") + (user?.last_name?.[0] || "")).toUpperCase() || "AD";
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <aside className="w-60 bg-slate-900 flex flex-col h-screen flex-shrink-0">
        <div className="px-6 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Stethoscope size={15} className="text-white" /></div>
            <span className="font-bold text-white">Clinic<span className="text-blue-400">OS</span></span>
            <span className="ml-auto text-[10px] font-semibold bg-blue-900 text-blue-300 border border-blue-800 px-2 py-0.5 rounded-full">Admin</span>
          </div>
        </div>
        <div className="px-3 py-3 border-b border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-800 cursor-pointer transition-colors">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-semibold text-sm flex items-center justify-center">{initials}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{fullName}</p>
              <p className="text-xs text-slate-400 truncate">Platform Administrator</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {ADMIN_NAV.map(item => {
            const active = section === item.id;
            return (
              <button key={item.id} onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                <item.Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-slate-800">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <LogOut size={15} /> Exit Admin
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{ADMIN_NAV.find(n => n.id === section)?.label ?? "Admin Panel"}</h1>
            <p className="text-xs text-slate-400 mt-0.5">ClinicOS Platform · Administrator View</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
              <Bell size={15} /><span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-white font-semibold text-sm flex items-center justify-center">AD</div>
          </div>
        </div>
        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {section === "a-overview" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label:"Total Clinics",   value:"247",    Icon:Building2,   bg:"bg-blue-50 text-blue-600",   delta:"+12 this month" },
                  { label:"Active Doctors",  value:"312",    Icon:UserCheck,   bg:"bg-teal-50 text-teal-600",   delta:"+18 this month" },
                  { label:"Total Patients",  value:"28,400", Icon:Users,       bg:"bg-green-50 text-green-600", delta:"+1.2K this month" },
                  { label:"MRR",             value:"$48,600",Icon:DollarSign,  bg:"bg-amber-50 text-amber-600", delta:"+8% vs last month" },
                ].map(s => (
                  <Card key={s.label} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-slate-500">{s.label}</span>
                      <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}><s.Icon size={15} /></div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 mb-0.5">{s.value}</div>
                    <p className="text-xs text-green-600 font-medium">{s.delta}</p>
                  </Card>
                ))}
              </div>
              <div className="grid lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 p-6">
                  <h3 className="font-semibold text-slate-900 mb-6">Platform Revenue (MRR)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={revenueData.map(d => ({ ...d, revenue: d.revenue * 2 }))} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                      <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={2} fill="#2563EB" fillOpacity={0.08} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
                <Card className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Plan Distribution</h3>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={[{name:"Starter",value:40},{name:"Pro",value:45},{name:"Enterprise",value:15}]} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                        {[0,1,2].map(i => <Cell key={`admin-pie-${i}`} fill={CHART_COLORS[i]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-3">
                    {[{n:"Starter",v:"40%",c:CHART_COLORS[0]},{n:"Pro",v:"45%",c:CHART_COLORS[1]},{n:"Enterprise",v:"15%",c:CHART_COLORS[2]}].map(d => (
                      <div key={d.n} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: d.c }} /><span className="text-slate-600">{d.n}</span></div>
                        <span className="font-semibold text-slate-900">{d.v}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Recent Signups</h3>
                  <div className="space-y-3">
                    {ADMIN_CLINICS.slice(0,4).map(c => (
                      <div key={c.id} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center">{c.name[0]}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.doctor} · {c.joined}</p>
                        </div>
                        <PlanBadge plan={c.plan} />
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">Pending Verifications</h3>
                  <div className="space-y-3">
                    {ADMIN_CLINICS.filter(c => c.status === "Pending").map(c => (
                      <div key={c.id} className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                        <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.doctor} · {c.specialty}</p>
                        </div>
                        <div className="flex gap-1">
                          <Btn variant="primary" size="sm"><Check size={11} /></Btn>
                          <Btn variant="danger" size="sm"><X size={11} /></Btn>
                        </div>
                      </div>
                    ))}
                    {ADMIN_CLINICS.filter(c => c.status === "Pending").length === 0 && (
                      <p className="text-sm text-slate-400 text-center py-4">No pending verifications</p>
                    )}
                  </div>
                </Card>
              </div>
            </>
          )}
          {section === "a-clinics" && (
            <>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex gap-2">
                  {["All","Verified","Pending","Suspended"].map(f => (
                    <button key={f} onClick={() => setClinicFilter(f)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${clinicFilter === f ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-200 text-slate-600 hover:bg-slate-50"}`}>{f}</button>
                  ))}
                </div>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input placeholder="Search clinics..." className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 bg-white" />
                </div>
              </div>
              <Card>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {["Clinic","Doctor","Specialty","Patients","Plan","Status","Joined",""].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-slate-400 px-5 py-4 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {ADMIN_CLINICS.filter(c => clinicFilter === "All" || c.status === clinicFilter).map(c => (
                      <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">{c.name[0]}</div>
                            <span className="text-sm font-medium text-slate-900">{c.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">{c.doctor}</td>
                        <td className="px-5 py-4"><Badge variant="outline">{c.specialty}</Badge></td>
                        <td className="px-5 py-4 text-sm text-slate-600">{c.patients}</td>
                        <td className="px-5 py-4"><PlanBadge plan={c.plan} /></td>
                        <td className="px-5 py-4"><ClinicStatusBadge status={c.status} /></td>
                        <td className="px-5 py-4 text-sm text-slate-400">{c.joined}</td>
                        <td className="px-4 py-4">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"><Eye size={14} /></button>
                            <button className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"><Ban size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
          {section === "a-subscriptions" && (
            <>
              <div className="grid grid-cols-3 gap-4">
                {[{plan:"Starter",count:99,mrr:"$0",color:"bg-slate-50 border-slate-100"},{plan:"Pro",count:112,mrr:"$5,488",color:"bg-blue-50 border-blue-100"},{plan:"Enterprise",count:36,mrr:"$3,564",color:"bg-violet-50 border-violet-100"}].map(p => (
                  <Card key={p.plan} className={`p-6 border-2 ${p.color}`}>
                    <div className="flex items-center justify-between mb-4">
                      <PlanBadge plan={p.plan} />
                      <span className="text-2xl font-bold text-slate-900">{p.count}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">Monthly Recurring Revenue</p>
                    <p className="text-xl font-bold text-slate-900">{p.mrr}</p>
                  </Card>
                ))}
              </div>
              <Card className="p-6">
                <h3 className="font-semibold text-slate-900 mb-6">Subscription Growth</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={revenueData.map((d,i) => ({ ...d, pro: 90+i*3, enterprise: 28+i*2, starter: 75+i*4 }))} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }} />
                    <Bar dataKey="starter"    fill="#94A3B8" radius={[4,4,0,0]} />
                    <Bar dataKey="pro"        fill="#2563EB" radius={[4,4,0,0]} />
                    <Bar dataKey="enterprise" fill="#8B5CF6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}
          {(section === "a-doctors" || section === "a-reviews" || section === "a-settings") && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {section === "a-doctors" && <UserCheck size={24} className="text-slate-400" />}
                  {section === "a-reviews" && <Star size={24} className="text-slate-400" />}
                  {section === "a-settings" && <Settings size={24} className="text-slate-400" />}
                </div>
                <p className="text-slate-500 text-sm font-medium">{ADMIN_NAV.find(n => n.id === section)?.label}</p>
                <p className="text-slate-400 text-xs mt-1">Section available in full build</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── App Root ──────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<"landing" | "auth" | "onboarding" | "dashboard" | "patient-portal" | "admin">("landing");
  const [section, setSection] = useState("overview");
  const [user, setUser] = useState(getStoredUser());
  const [clinics, setClinics] = useState<any[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchClinics = useCallback(async () => {
    try {
      const { data } = await clinicsApi.getMyClinics();
      setClinics(data.clinics || data || []);
      const storedId = localStorage.getItem("clinic_os_selected_clinic_id");
      const found = (data.clinics || data || []).find((c: any) => c.id === storedId);
      if (found) setSelectedClinic(found);
      else if (data.clinics?.length) setSelectedClinic(data.clinics[0]);
      else if (data.length) setSelectedClinic(data[0]);
    } catch {
      // Keep defaults
    }
  }, []);

  const handleSwitchClinic = useCallback((clinic: any) => {
    setSelectedClinic(clinic);
    localStorage.setItem("clinic_os_selected_clinic_id", clinic.id);
  }, []);

  useEffect(() => {
    if (isAuthenticated() && getStoredUser()) {
      const saved = getStoredUser();
      setUser(saved);
      if (saved.role !== "patient" && saved.role !== "admin") fetchClinics();
      if (saved.role === "patient") setPage("patient-portal");
      else if (saved.role === "admin") setPage("admin");
      else setPage("dashboard");
    }
    setLoading(false);
  }, [fetchClinics]);

  const handleLoginSuccess = useCallback((token: string, userData: any) => {
    setAuthToken(token, userData);
    setUser(userData);
    if (userData.role === "patient") setPage("patient-portal");
    else if (userData.role === "admin") setPage("admin");
    else if (localStorage.getItem("clinic_os_onboarding_done")) {
      fetchClinics();
      setPage("dashboard");
    } else setPage("onboarding");
  }, [fetchClinics]);

  const handleCreateClinic = useCallback(async (data: any) => {
    const res = await clinicsApi.create(data);
    await fetchClinics();
    const newClinic = res.data?.clinic || res.data;
    if (newClinic?.id) {
      setSelectedClinic(newClinic);
      localStorage.setItem("clinic_os_selected_clinic_id", newClinic.id);
    }
    return res;
  }, [fetchClinics]);

  const handleLogout = useCallback(() => {
    setAuthToken(null, null);
    setUser(null);
    setClinics([]);
    setSelectedClinic(null);
    setPage("landing");
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (page === "auth")           return <AuthPage onSuccess={handleLoginSuccess} onBack={() => setPage("landing")} />;
  if (page === "onboarding")     return <OnboardingPage onFinish={() => { localStorage.setItem("clinic_os_onboarding_done", "true"); fetchClinics(); setPage("dashboard"); }} />;
  if (page === "dashboard")      return <DashboardLayout section={section} setSection={setSection} onLogout={handleLogout} user={user} clinics={clinics} selectedClinic={selectedClinic} onSwitchClinic={handleSwitchClinic} onCreateClinic={handleCreateClinic} />;
  if (page === "patient-portal") return <PatientPortal onBack={() => setPage("landing")} onLogout={handleLogout} />;
  if (page === "admin")          return <AdminPanel onBack={() => setPage("landing")} onLogout={handleLogout} user={user} />;
  return (
    <LandingPage
      onLogin={() => setPage("auth")}
      onStart={() => setPage("auth")}
      onPatientPortal={() => setPage("patient-portal")}
      onAdmin={() => setPage("admin")}
    />
  );
}
