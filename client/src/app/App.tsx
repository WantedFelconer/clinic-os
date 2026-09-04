import { useState, useEffect, useRef, useCallback } from "react";
import {
  authApi, patientApi, setAuthToken, getStoredUser, getStoredToken, isAuthenticated,
  clinicsApi, appointmentsApi, patientsApi, medicalRecordsApi,
  prescriptionsApi, paymentsApi, reviewsApi, subscriptionsApi, adminApi, messagesApi, doctorsApi, getApiErrorMessage,
} from "./api";
import {
  BookAppointmentModal, RescheduleModal, CancelAppointmentModal,
  CreateEMRModal, CreatePrescriptionModal, ViewPrescriptionModal, ViewMedicalRecordModal,
  CreateServiceModal, EditServiceModal, CreatePackageModal,
  AddPatientModal, CreateInvoiceModal, PayInvoiceModal, SubmitReviewModal,
  SendMessageModal, AddStaffModal, UploadMedicalReportModal,
} from "./components/ActionModals";
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

// ── Design Tokens ──────────────────────────────────────────────────────────────

const CHART_COLORS = ["#2563EB", "#14B8A6", "#22C55E", "#F59E0B", "#8B5CF6", "#EC4899"];

const localDateString = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

const shiftDate = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return localDateString(value);
};

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

function Btn({ variant = "primary", size = "md", children, onClick, className = "", disabled = false }: {
  variant?: BtnVariant; size?: "sm" | "md" | "lg";
  children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean;
}) {
  const base = "inline-flex items-center gap-2 font-medium rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
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
    <button type="button" disabled={disabled} onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
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
          <Sparkles size={13} /> Modern Clinic Operating System for Healthcare Practices
        </div>
        <h1 className="text-5xl md:text-[72px] font-extrabold text-slate-900 mb-6 leading-none tracking-tight">
          Run Your Practice<br /><span className="text-blue-600">Like a Pro.</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          ClinicOS gives independent doctors a complete digital workspace — appointments, patients, prescriptions, billing, and analytics. All in one beautiful platform.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Btn variant="primary" size="lg" onClick={onStart}>Get Started Free <ArrowRight size={16} /></Btn>
          <Btn variant="outline" size="lg" onClick={onStart}><Video size={15} /> Explore Sandbox</Btn>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-10 mb-20">
          {[{ value: "100% MySQL", label: "Relational Architecture" }, { value: "RBAC", label: "Role-Based Access" }, { value: "Anti-IDOR", label: "Tenant Isolation" }, { value: "Simulated", label: "Payment Sandbox" }].map(s => (
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
    { Icon: Receipt,   title: "Online Billing",        desc: "Auto-generate invoices and settle payments in simulation mode with audit trails.", color: "bg-cyan-50 text-cyan-600" },
    { Icon: Shield,    title: "Security-Focused",      desc: "Role-based access control, tenant isolation, and audit logging keep patient data safe.", color: "bg-indigo-50 text-indigo-600" },
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
          <p className="text-sm font-semibold text-blue-600 uppercase tracking-wider mb-3">Showcase & Feedback</p>
          <h2 className="text-4xl font-bold text-slate-900">Loved by doctors & clinics</h2>
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
        <p className="text-blue-200 text-lg mb-10">Experience ClinicOS — the modern workspace for clinical practices.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Btn variant="white" size="lg" onClick={onStart}>Start Free — No Credit Card <ArrowRight size={16} /></Btn>
          <button onClick={onStart} className="text-blue-200 hover:text-white text-sm font-medium transition-colors">Get Started →</button>
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
    </div>
  );
}

// ── Auth ────────────────────────────────────────────────────────────────────────

function AuthPage({ onSuccess, onBack, notice }: { onSuccess: (token: string, user: any) => void; onBack: () => void; notice?: string }) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "verify">("login");
  const [role, setRole] = useState<"doctor" | "patient" | "admin">("doctor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(notice || "");
  const [submitting, setSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [first_name, setFirstName] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(v => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split("");
      setOtp(digits);
      otpRefs.current[5]?.focus();
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleVerify = async () => {
    setError("");
    setResendSuccess(false);
    setSubmitting(true);
    try {
      const code = otp.join("");
      if (code.length !== 6) {
        setError("Please enter the full 6-digit code");
        setSubmitting(false);
        return;
      }
      await authApi.verifyOTP(email, code);
      setVerified(true);
      setTimeout(() => {
        setMode("login");
        setVerified(false);
        setOtp(["", "", "", "", "", ""]);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setResendSuccess(false);
    try {
      await authApi.resendOTP(email);
      setResendCooldown(60);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    }
  };

  const handleAuth = async () => {
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        const { data } = await authApi.login({ email, password });
        if (role === "doctor" && !["doctor", "assistant"].includes(data.user.role)) {
          return setError(`This account is a ${data.user.role}. Switch to the Patient tab.`);
        }
        if (role === "patient" && data.user.role !== "patient") {
          return setError(`This account is a ${data.user.role}. Switch to the Doctor tab.`);
        }
        if (role === "admin" && data.user.role !== "admin") {
          return setError("This account does not have platform administrator access.");
        }
        onSuccess(data.token, data.user);
      } else if (mode === "register") {
        const nameParts = name.trim().split(/\s+/);
        const fn = nameParts[0] || "";
        const ln = nameParts.slice(1).join(" ") || "";
        setFirstName(fn);
        const res = await authApi.register({ email, password, role, first_name: fn, last_name: ln });
        if (res.data?.dev_otp) {
          const digits = String(res.data.dev_otp).split("");
          if (digits.length === 6) setOtp(digits);
        }
        setMode("verify");
      } else {
        await authApi.forgotPassword(email);
        setSent(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const renderSidebar = () => (
    <div className="hidden lg:flex flex-col w-[480px] bg-blue-600 p-12 text-white flex-shrink-0">
      <div className="flex items-center gap-2 mb-auto">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"><Stethoscope size={15} className="text-white" /></div>
        <span className="font-bold text-lg">ClinicOS</span>
      </div>
      <div className="py-16">
        <h2 className="text-4xl font-extrabold mb-6 leading-tight">Your clinic,<br />fully digital.</h2>
        <p className="text-blue-200 text-lg mb-10">Manage appointments, medical records, digital prescriptions, and billing in one unified platform.</p>
        <div className="space-y-4">
          {[{ Icon: Calendar, text: "Smart appointment scheduling" }, { Icon: FileText, text: "Digital records & prescriptions" }, { Icon: BarChart3, text: "Real-time revenue analytics" }].map(item => (
            <div key={item.text} className="flex items-center gap-3 text-sm text-blue-100">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0"><item.Icon size={14} /></div>
              {item.text}
            </div>
          ))}
        </div>
      </div>
      <p className="text-blue-300 text-sm">Security-focused clinical operating system</p>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {renderSidebar()}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <button onClick={mode === "verify" ? () => setMode("register") : onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-8 transition-colors">
            <ChevronRight size={13} className="rotate-180" /> {mode === "verify" ? "Back" : "Back to home"}
          </button>

          <Card className="p-8">
            {verified && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2.5 mb-4">
                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700 font-medium">Email verified! You can now sign in.</p>
              </div>
            )}

            {mode === "verify" && (
              <>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-5"><Heart size={20} className="text-blue-600" /></div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Verify your email</h1>
                <p className="text-slate-500 text-sm mb-1">Enter the 6-digit verification code sent to</p>
                <p className="text-sm font-semibold text-slate-900 mb-6">{email}</p>
                
                {resendSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2.5 mb-4">
                    <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                    <p className="text-sm text-green-700 font-medium">A new verification code has been sent.</p>
                  </div>
                )}

                <div className="flex gap-2 justify-center mb-6">
                  {otp.map((d, i) => (
                    <input key={i} ref={el => otpRefs.current[i] = el} type="text" inputMode="numeric" maxLength={1} value={d} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)} onPaste={handleOtpPaste} autoFocus={i === 0}
                      className="w-11 h-12 text-center text-lg font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  ))}
                </div>
                <button onClick={handleVerify} disabled={submitting || otp.join("").length !== 6} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {submitting ? "Verifying..." : "Verify Email"}
                </button>
                <div className="text-center mt-4">
                  <button onClick={handleResend} disabled={resendCooldown > 0} className="text-sm text-blue-600 font-medium hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed">
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5 mt-4">
                  <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>}
              </>
            )}

            {mode === "forgot" && (
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
            )}

            {(mode === "login" || mode === "register") && (
              <>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
                <p className="text-slate-500 text-sm mb-6">{mode === "login" ? "Sign in to your ClinicOS account" : "Start your 14-day free trial — no card needed"}</p>
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
                  {(mode === "login" ? (["doctor", "patient", "admin"] as const) : (["doctor", "patient"] as const)).map(r => (
                    <button key={r} onClick={() => setRole(r)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${role === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                      {r === "doctor" ? "Doctor" : r === "patient" ? "Patient" : "Admin"}
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
                      ? role === "admin" ? <>Administrator accounts are provisioned by the platform.</> : <>Don&apos;t have an account? <button onClick={() => { setRole(role === "patient" ? "patient" : "doctor"); setMode("register"); }} className="text-blue-600 font-medium hover:text-blue-700">Sign up free</button></>
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

// ── Reset Password Page ────────────────────────────────────────────────────────

function ResetPasswordPage({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
    else setError("Invalid or missing reset token");
  }, []);

  const handleReset = async () => {
    setError("");
    if (newPassword.length < 6) {
      return setError("Password must be at least 6 characters");
    }
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match");
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Password reset failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="p-8">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-900 mb-2">Password reset successful</h1>
              <p className="text-sm text-slate-500 mb-6">You can now sign in with your new password.</p>
              <button onClick={onBackToLogin} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">Sign In</button>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-5"><Lock size={20} className="text-blue-600" /></div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Reset password</h1>
              <p className="text-slate-500 text-sm mb-8">Enter your new password.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">New Password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>}
                <button onClick={handleReset} disabled={submitting || !token} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {submitting ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </>
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
    try {
      const res = await authApi.getNotifications(1);
      if (res.data?.notifications) {
        setNotifs(res.data.notifications);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    return () => clearInterval(interval);
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

function OverviewView({ setSection, selectedClinic }: { setSection: (s: string) => void; selectedClinic?: any }) {
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

function AppointmentsView({ selectedClinic }: { selectedClinic?: any }) {
  const [filter, setFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(localDateString());
  const [showBookModal, setShowBookModal] = useState(false);
  const [selectedApptForReschedule, setSelectedApptForReschedule] = useState<any>(null);
  const [selectedApptForCancel, setSelectedApptForCancel] = useState<any>(null);
  const [selectedApptForRx, setSelectedApptForRx] = useState<any>(null);
  const [selectedApptForEMR, setSelectedApptForEMR] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAppts = useCallback(async () => {
    if (selectedClinic?.id) {
      setLoading(true);
      setError("");
      try {
        const res = await appointmentsApi.getByClinic(selectedClinic.id, {
          status: filter === "all" ? undefined : filter.toLowerCase().replace(" ", "_"),
          date: selectedDate || undefined,
          limit: 100,
        });
        if (res.data?.appointments) {
          setAppointments(res.data.appointments.map((a: any) => ({
            id: a.id,
            patient_id: a.patient_id,
            patient_first_name: a.patient_first_name,
            patient_last_name: a.patient_last_name,
            patient: a.patient_first_name ? `${a.patient_first_name} ${a.patient_last_name}` : "Patient",
            phone: a.patient_phone || "",
            appointment_date: a.appointment_date,
            start_time: a.start_time,
            end_time: a.end_time,
            time: a.start_time ? `${a.start_time.substring(0, 5)} - ${a.end_time ? a.end_time.substring(0, 5) : ''}` : "10:00 AM",
            type: a.service_name || a.type || "Consultation",
            status: a.status || "scheduled",
            cancellation_reason: a.cancellation_reason,
            notes: a.notes,
            initials: `${a.patient_first_name?.[0] || "P"}${a.patient_last_name?.[0] || "T"}`.toUpperCase(),
            color: "bg-blue-100 text-blue-700",
          })));
        }
      } catch (requestError) { setAppointments([]); setError(getApiErrorMessage(requestError, "Unable to load appointments.")); } finally {
        setLoading(false);
      }
    } else { setAppointments([]); setLoading(false); }
  }, [selectedClinic, filter, selectedDate]);

  useEffect(() => { fetchAppts(); }, [fetchAppts]);

  const handleUpdateStatus = async (apptId: string, newStatus: string) => {
    try {
      await appointmentsApi.updateStatus(selectedClinic.id, apptId, newStatus);
      fetchAppts();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update appointment status");
    }
  };

  const filters = [
    { id: "all", label: "All Appointments" },
    { id: "scheduled", label: "Scheduled" },
    { id: "confirmed", label: "Confirmed" },
    { id: "in_progress", label: "In Progress" },
    { id: "completed", label: "Completed" },
    { id: "cancelled", label: "Cancelled" },
  ];

  const filtered = appointments.filter(a =>
    a.patient.toLowerCase().includes(search.toLowerCase()) ||
    a.type.toLowerCase().includes(search.toLowerCase()) ||
    a.phone.includes(search)
  );

  const calendarDays = Array.from({ length: 7 }, (_, index) => shiftDate(selectedDate || localDateString(), index - 3));

  return (
    <div className="p-8 space-y-6">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Appointment calendar</h2>
            <p className="text-xs text-slate-500">Select a day to view its live schedule.</p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous week" onClick={() => setSelectedDate(shiftDate(selectedDate || localDateString(), -7))} className="p-2 rounded-lg border border-gray-200 text-slate-600 hover:bg-slate-50"><ChevronLeft size={15} /></button>
            <button type="button" onClick={() => setSelectedDate(localDateString())} className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-slate-700 hover:bg-slate-50">Today</button>
            <button type="button" aria-label="Next week" onClick={() => setSelectedDate(shiftDate(selectedDate || localDateString(), 7))} className="p-2 rounded-lg border border-gray-200 text-slate-600 hover:bg-slate-50"><ChevronRight size={15} /></button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {calendarDays.map(date => {
            const parsed = new Date(`${date}T12:00:00`);
            const active = date === selectedDate;
            const today = date === localDateString();
            return <button type="button" key={date} onClick={() => setSelectedDate(date)} aria-pressed={active}
              className={`min-w-[76px] flex-1 rounded-xl border px-3 py-2.5 text-center transition-colors ${active ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-slate-600 hover:border-blue-300"}`}>
              <span className="block text-[10px] font-semibold uppercase">{parsed.toLocaleDateString(undefined, { weekday: "short" })}</span>
              <span className="block text-lg font-bold leading-6">{parsed.getDate()}</span>
              <span className={`block text-[10px] ${active ? "text-blue-100" : today ? "font-bold text-blue-600" : "text-slate-400"}`}>{today ? "Today" : parsed.toLocaleDateString(undefined, { month: "short" })}</span>
            </button>;
          })}
        </div>
        <button type="button" onClick={() => setSelectedDate("")} className={`mt-3 text-xs font-semibold ${selectedDate ? "text-blue-600" : "text-slate-900"}`}>Show all dates</button>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f.id ? "bg-blue-600 text-white shadow-sm" : "bg-white border border-gray-200 text-slate-600 hover:bg-slate-50"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <Btn variant="primary" disabled={!selectedClinic?.id} onClick={() => setShowBookModal(true)}><Plus size={14} /> Book Appointment</Btn>
      </div>

      <Card>
        {error && <div role="alert" className="m-5 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold">{error}</div>}
        <div className="p-6 border-b border-gray-50 flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-semibold text-slate-900">{filtered.length} appointments listed</h3>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by patient, phone..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 bg-white"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {loading ? <div role="status" className="p-10 text-center text-sm text-slate-400">Loading appointments...</div> : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              No appointments found matching this filter. Click &quot;Book Appointment&quot; to schedule one.
            </div>
          ) : (
            filtered.map(appt => (
              <div key={appt.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors group flex-wrap">
                <div className="w-28 flex-shrink-0">
                  <p className="text-xs font-bold text-slate-900">{appt.appointment_date}</p>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{appt.time}</p>
                </div>
                <div className={`w-10 h-10 rounded-full ${appt.color} font-semibold text-sm flex items-center justify-center flex-shrink-0`}>{appt.initials}</div>
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm font-semibold text-slate-900">{appt.patient}</p>
                  <p className="text-xs text-slate-400">{appt.type} · {appt.phone || "No phone"}</p>
                  {appt.notes && <p className="text-xs text-slate-500 mt-1 italic">&quot;{appt.notes}&quot;</p>}
                  {appt.status === "cancelled" && appt.cancellation_reason && (
                    <p className="text-xs text-red-500 mt-1 font-medium">Reason: {appt.cancellation_reason}</p>
                  )}
                </div>
                <div>
                  <ApptBadge status={appt.status} />
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  {/* Status transition actions */}
                  {appt.status === "scheduled" && (
                    <button
                      onClick={() => handleUpdateStatus(appt.id, "confirmed")}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 transition-colors"
                    >
                      Confirm
                    </button>
                  )}
                  {(appt.status === "scheduled" || appt.status === "confirmed") && (
                    <button
                      onClick={() => handleUpdateStatus(appt.id, "in_progress")}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                    >
                      Check-In
                    </button>
                  )}
                  {appt.status === "in_progress" && (
                    <button
                      onClick={() => handleUpdateStatus(appt.id, "completed")}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors flex items-center gap-1"
                    >
                      <CheckCircle2 size={12} /> Complete
                    </button>
                  )}
                  {appt.status !== "completed" && appt.status !== "cancelled" && (
                    <>
                      <button
                        onClick={() => setSelectedApptForReschedule(appt)}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => setSelectedApptForCancel(appt)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Cancel Appointment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setSelectedApptForRx(appt)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Write Prescription"
                  >
                    <Pill size={14} />
                  </button>
                  <button
                    onClick={() => setSelectedApptForEMR(appt)}
                    className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    title="Create EMR Note"
                  >
                    <FileText size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <BookAppointmentModal
        open={showBookModal}
        onClose={() => setShowBookModal(false)}
        clinicId={selectedClinic?.id || "0"}
        appointmentDate={selectedDate || undefined}
        onSuccess={fetchAppts}
      />

      <RescheduleModal
        open={!!selectedApptForReschedule}
        onClose={() => setSelectedApptForReschedule(null)}
        appointment={selectedApptForReschedule}
        clinicId={selectedClinic?.id || "0"}
        onSuccess={fetchAppts}
      />

      <CancelAppointmentModal
        open={!!selectedApptForCancel}
        onClose={() => setSelectedApptForCancel(null)}
        appointment={selectedApptForCancel}
        clinicId={selectedClinic?.id || "0"}
        onSuccess={fetchAppts}
      />

      <CreatePrescriptionModal
        open={!!selectedApptForRx}
        onClose={() => setSelectedApptForRx(null)}
        clinicId={selectedClinic?.id || "0"}
        patientId={selectedApptForRx?.patient_id}
        appointmentId={selectedApptForRx?.id}
        onSuccess={fetchAppts}
      />

      <CreateEMRModal
        open={!!selectedApptForEMR}
        onClose={() => setSelectedApptForEMR(null)}
        clinicId={selectedClinic?.id || "0"}
        patientId={selectedApptForEMR?.patient_id}
        onSuccess={fetchAppts}
      />
    </div>
  );
}

function PatientDetail({ patient, clinicId, onBack }: { patient: any; clinicId: string; onBack: () => void }) {
  const [tab, setTab] = useState("overview");
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRxModal, setShowRxModal] = useState(false);
  const [showEmrModal, setShowEmrModal] = useState(false);
  const [showBookModal, setShowBookModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [viewRx, setViewRx] = useState<any>(null);

  const fetchHistory = useCallback(async () => {
    if (patient?.id && clinicId) {
      setLoading(true);
      try {
        const res = await patientsApi.getHistory(clinicId, patient.id);
        setHistory(res.data);
      } catch (requestError) { setHistory(null); alert(getApiErrorMessage(requestError, "Unable to load patient history.")); } finally {
        setLoading(false);
      }
    }
  }, [patient, clinicId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const pData = history?.patient || patient;
  const canEditClinical = getStoredUser()?.role === 'doctor';
  const initials = `${pData.first_name?.[0] || 'P'}${pData.last_name?.[0] || 'T'}`.toUpperCase();

  return (
    <div className="p-8 space-y-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <ChevronRight size={13} className="rotate-180" /> Back to Patients
      </button>

      <Card className="p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 font-bold text-xl flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-[240px]">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-slate-900">{pData.first_name} {pData.last_name}</h2>
              <Badge variant="outline">{pData.gender || 'Patient'}</Badge>
            </div>
            <p className="text-slate-500 text-sm mb-4">
              Blood Group: <span className="font-semibold text-slate-700">{pData.blood_group || 'N/A'}</span> ·
              DOB: {pData.date_of_birth || 'Not recorded'}
            </p>
            <div className="flex flex-wrap gap-5 text-xs text-slate-600">
              <span className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" />{pData.phone || "No phone"}</span>
              <span className="flex items-center gap-1.5"><Mail size={12} className="text-slate-400" />{pData.email || "No email"}</span>
              <span className="flex items-center gap-1.5"><Clock size={12} className="text-slate-400" />Registered: {new Date(pData.created_at || Date.now()).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Btn variant="outline" size="sm" onClick={() => setShowBookModal(true)}><Calendar size={12} /> Schedule</Btn>
            {canEditClinical && <Btn variant="outline" size="sm" onClick={() => setShowEmrModal(true)}><FileText size={12} /> Add EMR</Btn>}
            <Btn variant="outline" size="sm" onClick={() => setShowReportModal(true)}><Upload size={12} /> Report</Btn>
            {canEditClinical && <Btn variant="primary" size="sm" onClick={() => setShowRxModal(true)}><Pill size={12} /> Prescribe</Btn>}
          </div>
        </div>
      </Card>

      <div className="flex gap-1 border-b border-gray-100">
        {["overview", "records", "appointments", "prescriptions", "billing"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium capitalize transition-all border-b-2 ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t === "records" ? "EMR Records" : t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="col-span-2 p-6">
            <h3 className="font-semibold text-slate-900 mb-5">Clinical History Timeline</h3>
            <div className="space-y-4">
              {(history?.medical_records || []).length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No clinical records logged yet for this patient.</p>
              ) : (
                history.medical_records.map((r: any) => (
                  <div key={r.id} className="p-4 bg-slate-50 rounded-xl space-y-1.5 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{r.diagnosis}</span>
                      <span className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    {r.treatment_plan && <p className="text-xs text-slate-600">{r.treatment_plan}</p>}
                  </div>
                ))
              )}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Allergies</h4>
              <div className="flex flex-wrap gap-2">
                {pData.allergies ? (
                  pData.allergies.split(",").map((a: string) => (
                    <span key={a} className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-xs font-medium border border-red-100">{a.trim()}</span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No known allergies</span>
                )}
              </div>
            </Card>

            <Card className="p-5">
              <h4 className="text-sm font-semibold text-slate-900 mb-3">Chronic Conditions</h4>
              <p className="text-xs text-slate-600">{pData.chronic_conditions || "None reported"}</p>
            </Card>

            <Card className="p-5">
              <h4 className="text-sm font-semibold text-slate-900 mb-2">Emergency Contact</h4>
              <p className="text-xs font-semibold text-slate-800">{pData.emergency_contact_name || "Not provided"}</p>
              <p className="text-xs text-slate-500 mt-0.5">{pData.emergency_contact_phone || ""}</p>
            </Card>
          </div>
        </div>
      )}

      {tab === "records" && (
        <Card className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-900">Medical Records (EMR)</h3>
            {canEditClinical && <Btn variant="primary" size="sm" onClick={() => setShowEmrModal(true)}><Plus size={12} /> Add Record</Btn>}
          </div>
          {(history?.medical_records || []).length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No medical records created yet</p>
          ) : (
            history.medical_records.map((rec: any) => (
              <div key={rec.id} className="p-4 border border-gray-100 rounded-xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{rec.diagnosis}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Recorded on {new Date(rec.created_at).toLocaleDateString()}</p>
                  </div>
                  {rec.is_confidential && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-[11px] font-semibold">Confidential</span>}
                </div>
                {rec.symptoms && <p className="text-xs text-slate-600"><span className="font-semibold">Symptoms:</span> {rec.symptoms}</p>}
                {rec.treatment_plan && <p className="text-xs text-slate-600"><span className="font-semibold">Treatment Plan:</span> {rec.treatment_plan}</p>}
                {rec.follow_up_date && <p className="text-xs text-blue-600 font-medium">Follow-up: {rec.follow_up_date}</p>}
              </div>
            ))
          )}
          <div className="pt-4 border-t border-gray-100 flex justify-between items-center"><h3 className="font-semibold text-slate-900">Medical Reports</h3><Btn variant="outline" size="sm" onClick={() => setShowReportModal(true)}><Upload size={12}/> Upload Report</Btn></div>
          {(history?.medical_reports || []).map((report: any) => <div key={report.id} className="p-4 border border-gray-100 rounded-xl"><p className="text-sm font-bold">{report.title || report.report_type}</p><p className="text-xs text-slate-500">{report.file_name} · {String(report.report_date || '').slice(0,10)}</p><p className="text-xs text-slate-600 mt-1">{report.description}</p></div>)}
        </Card>
      )}

      {tab === "appointments" && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-900">Appointment History</h3>
            <Btn variant="primary" size="sm" onClick={() => setShowBookModal(true)}><Plus size={12} /> Book Appointment</Btn>
          </div>
          <div className="divide-y divide-gray-50">
            {(history?.appointments || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No appointments found</p>
            ) : (
              history.appointments.map((a: any) => (
                <div key={a.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-900">{a.appointment_date}</span>
                    <span className="text-slate-400 ml-2">{a.start_time?.substring(0,5)}</span>
                    <p className="text-slate-500 mt-0.5">{a.service_name || a.type || 'Consultation'}</p>
                  </div>
                  <ApptBadge status={a.status} />
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {tab === "prescriptions" && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-900">Digital Prescriptions</h3>
            <Btn variant="primary" size="sm" onClick={() => setShowRxModal(true)}><Plus size={12} /> New Prescription</Btn>
          </div>
          <div className="space-y-3">
            {(history?.prescriptions || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No prescriptions issued yet</p>
            ) : (
              history.prescriptions.map((rx: any) => (
                <div key={rx.id} className="p-4 border border-gray-100 rounded-xl flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{rx.diagnosis}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(rx.created_at).toLocaleDateString()} · {(rx.items || []).length} medications</p>
                  </div>
                  <button onClick={() => setViewRx(rx)} className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5">
                    <Eye size={13} /> View Rx
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {tab === "billing" && (
        <Card className="p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Invoices & Payments</h3>
          <div className="divide-y divide-gray-50">
            {(history?.payments || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No payment records found</p>
            ) : (
              history.payments.map((p: any) => (
                <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-mono font-bold text-slate-900">{p.invoice_number}</p>
                    <p className="text-slate-400">{new Date(p.created_at).toLocaleDateString()} · {p.payment_method}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900">${p.total_amount}</p>
                    <InvoiceBadge status={p.payment_status === "completed" ? "Paid" : "Pending"} />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      <CreatePrescriptionModal
        open={showRxModal}
        onClose={() => setShowRxModal(false)}
        clinicId={clinicId}
        patientId={patient.id}
        onSuccess={fetchHistory}
      />

      <CreateEMRModal
        open={showEmrModal}
        onClose={() => setShowEmrModal(false)}
        clinicId={clinicId}
        patientId={patient.id}
        onSuccess={fetchHistory}
      />

      <UploadMedicalReportModal open={showReportModal} onClose={() => setShowReportModal(false)} clinicId={clinicId} patientId={patient.id} onSuccess={fetchHistory} />

      <BookAppointmentModal
        open={showBookModal}
        onClose={() => setShowBookModal(false)}
        clinicId={clinicId}
        patientId={patient.id}
        onSuccess={fetchHistory}
      />

      <ViewPrescriptionModal
        open={!!viewRx}
        onClose={() => setViewRx(null)}
        prescription={viewRx}
      />
    </div>
  );
}

function PatientsView({ selectedClinic }: { selectedClinic?: any }) {
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPatients = useCallback(async () => {
    if (selectedClinic?.id) {
      setLoading(true);
      setError("");
      try {
        const res = await patientsApi.getByClinic(selectedClinic.id, { search, limit: 100 });
        setPatients(res.data?.patients || []);
      } catch (requestError) { setPatients([]); setError(getApiErrorMessage(requestError, "Unable to load patients.")); } finally {
        setLoading(false);
      }
    } else { setPatients([]); setLoading(false); }
  }, [selectedClinic, search]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  if (selectedPatient !== null) {
    return (
      <PatientDetail
        patient={selectedPatient}
        clinicId={selectedClinic?.id || "0"}
        onBack={() => setSelectedPatient(null)}
      />
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patients by name, phone..."
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 bg-white"
          />
        </div>
        <div className="ml-auto">
          <Btn variant="primary" disabled={!selectedClinic?.id} onClick={() => setShowAddPatientModal(true)}>
            <Plus size={14} /> Add Patient
          </Btn>
        </div>
      </div>

      {!selectedClinic?.id && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Select an active clinic before creating or viewing patients.</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-gray-50">
              {["Patient", "Contact", "Gender / Blood", "Conditions", "Registered", ""].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-400 px-6 py-4 uppercase tracking-wider last:px-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? <tr><td colSpan={6} className="text-center py-10 text-sm text-slate-400">Loading patients...</td></tr> : patients.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-sm text-slate-400">
                  No patients registered yet. Click &quot;Add Patient&quot; to register walk-in patients.
                </td>
              </tr>
            ) : (
              patients.map(p => {
                const initials = `${p.first_name?.[0] || 'P'}${p.last_name?.[0] || 'T'}`.toUpperCase();
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm flex items-center justify-center flex-shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{p.first_name} {p.last_name}</p>
                          <p className="text-xs text-slate-400">{p.email || "No email"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-mono">{p.phone || "N/A"}</td>
                    <td className="px-6 py-4 text-xs text-slate-600">{p.gender || 'N/A'} · <span className="font-semibold text-slate-800">{p.blood_group || 'N/A'}</span></td>
                    <td className="px-6 py-4 text-xs text-slate-500 max-w-[180px] truncate">{p.chronic_conditions || "None reported"}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{new Date(p.created_at || Date.now()).toLocaleDateString()}</td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => setSelectedPatient(p)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        View History →
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>

      <AddPatientModal
        open={showAddPatientModal}
        onClose={() => setShowAddPatientModal(false)}
        clinicId={selectedClinic?.id || "0"}
        onSuccess={fetchPatients}
      />
    </div>
  );
}

function EMRView({ selectedClinic }: { selectedClinic?: any }) {
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

function PrescriptionsView({ selectedClinic }: { selectedClinic?: any }) {
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

function BillingView({ selectedClinic }: { selectedClinic?: any }) {
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

function ClinicMgmtView({ selectedClinic }: { selectedClinic?: any }) {
  const [tab, setTab] = useState("profile");
  const [clinicData, setClinicData] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const clinicId = selectedClinic?.id || "0";

  const fetchClinicDetails = useCallback(async () => {
    if (clinicId && clinicId !== "0") {
      try {
        const [res, staffRes] = await Promise.all([
          clinicsApi.getById(clinicId),
          clinicsApi.getStaff(clinicId),
        ]);
        setClinicData(res.data?.clinic || {});
        setStaff(staffRes.data?.staff || []);
        if (res.data?.schedules) {
          setSchedules(res.data.schedules);
        }
      } catch (requestError) { alert(getApiErrorMessage(requestError, "Unable to load clinic settings.")); }
    }
  }, [clinicId]);

  useEffect(() => {
    fetchClinicDetails();
  }, [fetchClinicDetails]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await clinicsApi.update(clinicId, clinicData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (requestError) { alert(getApiErrorMessage(requestError, "Unable to save clinic settings.")); } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedules = async () => {
    setSaving(true);
    try {
      await clinicsApi.updateSchedules(clinicId, schedules);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (requestError) { alert(getApiErrorMessage(requestError, "Unable to save operating hours.")); } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    setSaving(true);
    try {
      const response = await clinicsApi.updateBranding(clinicId, {
        logo_url: clinicData?.logo_url || null,
        banner_url: clinicData?.banner_url || null,
      });
      setClinicData(response.data?.clinic || clinicData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStaff = async (userId: string) => {
    if (confirm("Remove this staff member from the clinic?")) {
      try {
        await clinicsApi.removeStaff(clinicId, userId);
        fetchClinicDetails();
      } catch (requestError) { alert(getApiErrorMessage(requestError, "Unable to remove this staff member.")); }
    }
  };

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="p-8">
      <div className="flex gap-1 mb-8 border-b border-gray-100">
        {["profile", "hours", "staff", "plan", "branding", "policies"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium capitalize transition-all border-b-2 ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t === "hours" ? "Operating Hours" : t === "plan" ? "Plan & Limits" : t}
          </button>
        ))}
      </div>

      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check size={14} /> Changes saved successfully to database!
        </div>
      )}

      {tab === "profile" && clinicData && (
        <div className="max-w-2xl space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Clinic Information</h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Clinic Name</label>
                <input
                  value={clinicData.name || ""}
                  onChange={e => setClinicData({ ...clinicData, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">City</label>
                  <input
                    value={clinicData.city || ""}
                    onChange={e => setClinicData({ ...clinicData, city: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Timezone</label>
                  <input
                    value={clinicData.timezone || "UTC"}
                    onChange={e => setClinicData({ ...clinicData, timezone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label>
                  <input
                    value={clinicData.phone || ""}
                    onChange={e => setClinicData({ ...clinicData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                  <input
                    value={clinicData.email || ""}
                    onChange={e => setClinicData({ ...clinicData, email: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Address</label>
                <input
                  value={clinicData.address || ""}
                  onChange={e => setClinicData({ ...clinicData, address: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">About the Clinic</label>
                <textarea
                  rows={3}
                  value={clinicData.description || ""}
                  onChange={e => setClinicData({ ...clinicData, description: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Check size={14} /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {tab === "hours" && (
        <div className="max-w-xl space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Clinic Operating Days & Hours</h3>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => {
                const daySched = schedules.find(s => s.day_of_week === dayIdx) || {
                  day_of_week: dayIdx,
                  start_time: "09:00",
                  end_time: "17:00",
                  is_available: dayIdx !== 0,
                };
                return (
                  <div key={dayIdx} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <span className="w-28 text-xs font-semibold text-slate-700">{DAYS[dayIdx]}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(daySched.is_available)}
                      onChange={e => {
                        const updated = [...schedules];
                        const idx = updated.findIndex(s => s.day_of_week === dayIdx);
                        if (idx >= 0) updated[idx].is_available = e.target.checked ? 1 : 0;
                        else updated.push({ day_of_week: dayIdx, start_time: "09:00", end_time: "17:00", is_available: e.target.checked ? 1 : 0 });
                        setSchedules(updated);
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    {Boolean(daySched.is_available) ? (
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          type="time"
                          value={daySched.start_time?.substring(0, 5) || "09:00"}
                          onChange={e => {
                            const updated = [...schedules];
                            const idx = updated.findIndex(s => s.day_of_week === dayIdx);
                            if (idx >= 0) updated[idx].start_time = e.target.value;
                            else updated.push({ day_of_week: dayIdx, start_time: e.target.value, end_time: "17:00", is_available: 1 });
                            setSchedules(updated);
                          }}
                          className="px-2 py-1 border border-gray-200 rounded-lg"
                        />
                        <span className="text-slate-400">to</span>
                        <input
                          type="time"
                          value={daySched.end_time?.substring(0, 5) || "17:00"}
                          onChange={e => {
                            const updated = [...schedules];
                            const idx = updated.findIndex(s => s.day_of_week === dayIdx);
                            if (idx >= 0) updated[idx].end_time = e.target.value;
                            else updated.push({ day_of_week: dayIdx, start_time: "09:00", end_time: e.target.value, is_available: 1 });
                            setSchedules(updated);
                          }}
                          className="px-2 py-1 border border-gray-200 rounded-lg"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end pt-4 mt-2">
              <button
                onClick={handleSaveSchedules}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
              >
                {saving ? "Saving..." : "Save Operating Hours"}
              </button>
            </div>
          </Card>
        </div>
      )}

      {tab === "staff" && (
        <div className="max-w-2xl space-y-4">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-semibold text-slate-900">Clinic Staff Members</h3>
                <p className="text-xs text-slate-400">Doctors and clinic assistants with access</p>
              </div>
              <Btn variant="primary" size="sm" onClick={() => setShowAddStaffModal(true)}>
                <Plus size={12} /> Add Staff
              </Btn>
            </div>
            <div className="divide-y divide-gray-50">
              {staff.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No additional staff members added yet</p>
              ) : (
                staff.map((s: any) => (
                  <div key={s.id || s.user_id} className="py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-slate-400">{s.email} · <span className="capitalize font-semibold text-blue-600">{s.role}</span></p>
                    </div>
                    <button
                      onClick={() => handleRemoveStaff(s.user_id || s.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove from clinic"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>

          <AddStaffModal
            open={showAddStaffModal}
            onClose={() => setShowAddStaffModal(false)}
            clinicId={clinicId}
            onSuccess={fetchClinicDetails}
          />
        </div>
      )}

      {tab === "plan" && (
        <ClinicSubscriptionTab clinicId={clinicId} />
      )}

      {tab === "branding" && clinicData && (
        <div className="max-w-2xl space-y-5">
          <Card className="p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-slate-900">Clinic Branding</h3>
              <p className="text-xs text-slate-500 mt-1">Use HTTPS image links or simulated:// references. Binary storage is not enabled.</p>
            </div>
            {[{ key: "logo_url", label: "Logo", ratio: "h-28" }, { key: "banner_url", label: "Banner", ratio: "h-44" }].map(item => (
              <div key={item.key} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">{item.label} reference</label>
                <div className="flex gap-2">
                  <input
                    value={clinicData[item.key] || ""}
                    onChange={e => setClinicData({ ...clinicData, [item.key]: e.target.value })}
                    placeholder={`https://example.com/${item.label.toLowerCase()}.png`}
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <button type="button" onClick={() => setClinicData({ ...clinicData, [item.key]: "" })} className="px-3 text-xs font-semibold text-rose-600 border border-rose-200 rounded-xl">Remove</button>
                </div>
                <div className={`${item.ratio} rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center overflow-hidden`}>
                  {clinicData[item.key]?.startsWith('https://') ? <img src={clinicData[item.key]} alt={`${item.label} preview`} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-slate-400">{clinicData[item.key] ? "Simulated reference saved" : `No ${item.label.toLowerCase()} selected`}</span>}
                </div>
              </div>
            ))}
            <div className="flex justify-end"><Btn onClick={handleSaveBranding}>{saving ? "Saving..." : "Save Branding"}</Btn></div>
          </Card>
        </div>
      )}

      {tab === "policies" && (
        <div className="max-w-xl">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4 capitalize">{tab} Settings</h3>
            <p className="text-xs text-slate-500">Configure clinic {tab} options.</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function ServicesView({ selectedClinic }: { selectedClinic?: any }) {
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const clinicId = selectedClinic?.id || "0";

  const fetchServices = useCallback(async () => {
    if (clinicId && clinicId !== "0") {
      setLoading(true);
      try {
        const res = await clinicsApi.getServices(clinicId);
        setServices(res.data?.services || []);
      } catch (requestError) { setServices([]); alert(getApiErrorMessage(requestError, "Unable to load services.")); } finally {
        setLoading(false);
      }
    }
  }, [clinicId]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const handleDeleteService = async (serviceId: string) => {
    if (confirm("Are you sure you want to delete this service?")) {
      try {
        await clinicsApi.deleteService(clinicId, serviceId);
        fetchServices();
      } catch (requestError) { alert(getApiErrorMessage(requestError, "Unable to delete this service.")); }
    }
  };

  const filtered = services.filter(s => (s.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search services..."
            className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 bg-white"
          />
        </div>
        <Btn variant="primary" onClick={() => setShowServiceModal(true)}><Plus size={14} /> Add Service</Btn>
      </div>
      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              {["Service", "Duration", "Fee / Price", "Status", ""].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-400 px-6 py-4 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-slate-400">No services configured yet</td>
              </tr>
            ) : (
              filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-semibold text-slate-900">{s.name}</span>
                    {s.description && <p className="text-xs text-slate-400 mt-0.5">{s.description}</p>}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">{s.duration_minutes} mins</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">${s.price}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${s.is_active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditingService(s)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Edit size={14} />
                      </button>
                      <button onClick={() => handleDeleteService(s.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <CreateServiceModal
        open={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        clinicId={clinicId}
        onSuccess={fetchServices}
      />

      <EditServiceModal
        open={!!editingService}
        onClose={() => setEditingService(null)}
        service={editingService}
        clinicId={clinicId}
        onSuccess={fetchServices}
      />
    </div>
  );
}

function PackagesView({ selectedClinic }: { selectedClinic?: any }) {
  const [packages, setPackages] = useState<any[]>([]);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const clinicId = selectedClinic?.id || "0";

  const fetchPackages = useCallback(async () => {
    if (clinicId && clinicId !== "0") {
      setLoading(true);
      try {
        const res = await clinicsApi.getPackages(clinicId);
        setPackages(res.data?.packages || []);
      } catch (requestError) { setPackages([]); alert(getApiErrorMessage(requestError, "Unable to load packages.")); } finally {
        setLoading(false);
      }
    }
  }, [clinicId]);

  useEffect(() => { fetchPackages(); }, [fetchPackages]);

  const handleDelete = async (pkgId: string) => {
    if (confirm("Delete this consultation package?")) {
      try {
        await clinicsApi.deletePackage(clinicId, pkgId);
        fetchPackages();
      } catch (requestError) { alert(getApiErrorMessage(requestError, "Unable to delete this package.")); }
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Service Packages</h2>
          <p className="text-sm text-slate-500 mt-0.5">Bundle your consultations with custom pricing</p>
        </div>
        <Btn variant="primary" onClick={() => setShowPackageModal(true)}><Plus size={14} /> Create Package</Btn>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {packages.map(pkg => (
          <Card key={pkg.id} className="border-2 border-blue-50 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 mb-1">{pkg.name}</h3>
                <p className="text-xs text-slate-500">{pkg.description || `${pkg.sessions_count || 1} consultation sessions bundle`}</p>
              </div>
              <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-semibold rounded">Active</span>
            </div>
            <div className="flex items-end justify-between mb-5">
              <div>
                <div className="text-3xl font-extrabold text-slate-900">${pkg.price}</div>
                <div className="text-xs text-slate-400 mt-0.5">{pkg.sessions_count} sessions total</div>
              </div>
              <button
                onClick={() => handleDelete(pkg.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </Card>
        ))}
        <button onClick={() => setShowPackageModal(true)} className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer">
          <Plus size={24} />
          <span className="text-sm font-medium">Create New Package</span>
        </button>
      </div>

      <CreatePackageModal
        open={showPackageModal}
        onClose={() => setShowPackageModal(false)}
        clinicId={clinicId}
        onSuccess={fetchPackages}
      />
    </div>
  );
}

function DoctorReviewsView() {
  const [data, setData] = useState<any>({ reviews: [], summary: { total: 0, average: 0, distribution: {} } });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const doctorId = getStoredUser()?.id;
    if (!doctorId) return;
    doctorsApi.getReviews(doctorId, { limit: 50 })
      .then(result => setData(result))
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="p-8 text-sm text-slate-400">Loading reviews...</div>;
  return (
    <div className="p-8 space-y-6">
      <div><h2 className="text-xl font-bold text-slate-900">Patient Reviews</h2><p className="text-xs text-slate-500">Approved feedback from completed consultations</p></div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5"><p className="text-xs text-slate-500">Average rating</p><p className="text-3xl font-bold text-slate-900 mt-1">{Number(data.summary?.average || 0).toFixed(1)} <Star size={20} className="inline fill-amber-400 text-amber-400" /></p></Card>
        <Card className="p-5"><p className="text-xs text-slate-500">Total reviews</p><p className="text-3xl font-bold text-slate-900 mt-1">{data.summary?.total || 0}</p></Card>
      </div>
      <Card className="p-5">
        <h3 className="font-bold text-sm mb-4">Rating distribution</h3>
        {[5,4,3,2,1].map(rating => <div key={rating} className="flex items-center gap-3 py-1 text-xs"><span className="w-10">{rating} star</span><div className="h-2 bg-slate-100 rounded flex-1"><div className="h-2 bg-amber-400 rounded" style={{width: `${data.summary?.total ? ((data.summary.distribution?.[rating] || 0) / data.summary.total) * 100 : 0}%`}} /></div><span className="w-6 text-right">{data.summary?.distribution?.[rating] || 0}</span></div>)}
      </Card>
      <div className="space-y-3">
        {(data.reviews || []).map((review: any) => <Card key={review.id} className="p-5"><div className="flex justify-between"><p className="font-semibold text-sm">{review.reviewer_name || 'Verified patient'}</p><span className="text-amber-600 text-xs font-bold">{review.rating}/5</span></div><p className="text-sm text-slate-600 mt-2">{review.comment || 'No written feedback.'}</p><p className="text-[11px] text-slate-400 mt-2">{new Date(review.created_at).toLocaleDateString()}</p></Card>)}
        {!data.reviews?.length && <p className="text-sm text-slate-400">No approved reviews yet.</p>}
      </div>
    </div>
  );
}

function AnalyticsView({ selectedClinic }: { selectedClinic?: any }) {
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

function NotificationsView({ selectedClinic }: { selectedClinic?: any }) {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authApi.getNotifications(1);
      setNotifs(res.data?.notifications || []);
    } catch (requestError) { setNotifs([]); alert(getApiErrorMessage(requestError, "Unable to load notifications.")); } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
  }, [fetchNotifs]);

  const unread = notifs.filter(n => !n.is_read && !n.read).length;

  const markAll = async () => {
    try {
      await authApi.markAllNotificationsRead();
      setNotifs(ns => ns.map(x => ({ ...x, is_read: 1, read: true })));
    } catch { alert("Unable to mark notifications as read."); }
  };

  const markSingle = async (id: string) => {
    try {
      await authApi.markNotificationRead(id);
      setNotifs(ns => ns.map(x => x.id === id ? { ...x, is_read: 1, read: true } : x));
    } catch { alert("Unable to mark this notification as read."); }
  };

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
          {notifs.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">No notifications received yet</div>
          ) : (
            notifs.map(n => {
              const isRead = Boolean(n.is_read || n.read);
              return (
                <div key={n.id} onClick={() => markSingle(n.id)}
                  className={`flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors ${!isRead ? "bg-blue-50/40 hover:bg-blue-50/60" : "hover:bg-slate-50/50"}`}>
                  <NotifIcon type={n.type || n.reference_type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!isRead ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>{n.title}</p>
                      <span className="text-xs text-slate-400 flex-shrink-0">{new Date(n.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message || n.desc}</p>
                  </div>
                  {!isRead && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />}
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}

function SettingsView({ selectedClinic }: { selectedClinic?: any }) {
  const [tab, setTab] = useState("profile");
  const [userProfile, setUserProfile] = useState<any>(getStoredUser() || {});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    authApi.getProfile().then(res => {
      if (res.data?.user) {
        setUserProfile(res.data.user);
      }
    }).catch(() => {});
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authApi.updateProfile({
        first_name: userProfile.first_name,
        last_name: userProfile.last_name,
        phone: userProfile.phone,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (requestError) { alert(getApiErrorMessage(requestError, "Unable to save your profile.")); } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex gap-0.5 mb-8 border-b border-gray-100">
        {["profile", "security"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium capitalize transition-all border-b-2 ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{t}</button>
        ))}
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check size={14} /> Profile updated successfully!
        </div>
      )}

      {tab === "profile" && (
        <div className="max-w-2xl space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Doctor Profile Information</h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">First Name</label>
                  <input
                    value={userProfile.first_name || ""}
                    onChange={e => setUserProfile({ ...userProfile, first_name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Last Name</label>
                  <input
                    value={userProfile.last_name || ""}
                    onChange={e => setUserProfile({ ...userProfile, last_name: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                  <input
                    value={userProfile.email || ""}
                    disabled
                    className="w-full px-3 py-2.5 border border-gray-200 bg-slate-50 text-slate-500 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label>
                  <input
                    value={userProfile.phone || ""}
                    onChange={e => setUserProfile({ ...userProfile, phone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Check size={14} /> {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {tab === "security" && (
        <div className="max-w-sm space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Security Settings</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your password is encrypted using bcrypt. To change your password, use the reset password flow from the login page.
            </p>
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

const PATIENT_NAV = [
  { id: "p-overview",      label: "My Health",           Icon: Heart },
  { id: "p-discovery",     label: "Find Clinics & Docs",  Icon: Search },
  { id: "p-appointments",  label: "Appointments",        Icon: Calendar },
  { id: "p-records",       label: "Medical Records",     Icon: FileText },
  { id: "p-prescriptions", label: "Prescriptions",       Icon: Pill },
  { id: "p-invoices",      label: "Invoices & Billing",  Icon: Receipt },
  { id: "p-messages",      label: "Messages",            Icon: MessageSquare },
  { id: "p-profile",       label: "Profile Settings",    Icon: UserCheck },
];

function PatientPortal({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
  const [section, setSection] = useState("p-overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patientNotifOpen, setPatientNotifOpen] = useState(false);
  const [patientNotifs, setPatientNotifs] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [apptFilter, setApptFilter] = useState("all");
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [medicalReports, setMedicalReports] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [payFilter, setPayFilter] = useState("all");
  const [messages, setMessages] = useState<any[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [discoverySearch, setDiscoverySearch] = useState("");
  const [discoveryCity, setDiscoveryCity] = useState("");
  const [discoverySpec, setDiscoverySpec] = useState("All");
  const [discoveryDate, setDiscoveryDate] = useState(() => shiftDate(localDateString(), 1));
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [portalError, setPortalError] = useState("");

  // Profile form state
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");
  const [editAllergies, setEditAllergies] = useState("");
  const [editChronic, setEditChronic] = useState("");
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Modal triggers
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookingClinicId, setBookingClinicId] = useState<string>("0");
  const [bookingDoctorId, setBookingDoctorId] = useState<string>("");
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedCancelAppt, setSelectedCancelAppt] = useState<any>(null);
  const [showViewRxModal, setShowViewRxModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [downloadingPrescriptionId, setDownloadingPrescriptionId] = useState<string>("");
  const [showViewRecordModal, setShowViewRecordModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewClinicId, setReviewClinicId] = useState<string>("0");
  const [reviewAppointmentId, setReviewAppointmentId] = useState<string>("");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageReceiverId, setMessageReceiverId] = useState<string>("");
  const [messageReceiverName, setMessageReceiverName] = useState<string>("");

  const user = getStoredUser();
  const patientNotifRef = useRef<HTMLDivElement>(null);
  const patientUnread = patientNotifs.filter((n: any) => !n.read && !n.is_read).length;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (patientNotifRef.current && !patientNotifRef.current.contains(e.target as Node)) setPatientNotifOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const loadAllData = useCallback(async () => {
    try {
      const [profRes, apptRes, recordsRes, reportsRes, rxRes, payRes, notifRes, userRes, msgRes] = await Promise.all([
        authApi.getPatientProfile(),
        authApi.getMyAppointments(),
        authApi.getMedicalRecords(),
        authApi.getMedicalReports(),
        authApi.getPrescriptions(),
        authApi.getMyPayments(),
        authApi.getNotifications(1),
        authApi.getProfile(),
        messagesApi.getMyMessages(),
      ]);

      if (profRes?.data?.patient) {
        const pp = profRes.data.patient;
        setPatientProfile(pp);
        setEditFirstName(pp.first_name || userRes?.data?.user?.first_name || "");
        setEditLastName(pp.last_name || userRes?.data?.user?.last_name || "");
        setEditPhone(pp.phone || userRes?.data?.user?.phone || "");
        setEditDob(pp.date_of_birth ? pp.date_of_birth.split("T")[0] : "");
        setEditGender(pp.gender || "");
        setEditBloodGroup(pp.blood_group || "");
        setEditAllergies(pp.allergies || "");
        setEditChronic(pp.chronic_conditions || "");
        setEditEmergencyName(pp.emergency_contact_name || "");
        setEditEmergencyPhone(pp.emergency_contact_phone || "");
        setEditAddress(pp.address || "");
      } else if (userRes?.data?.user) {
        const u = userRes.data.user;
        setEditFirstName(u.first_name || "");
        setEditLastName(u.last_name || "");
        setEditPhone(u.phone || "");
      }

      if (apptRes?.data?.appointments) setAppointments(apptRes.data.appointments);
      if (recordsRes?.data?.records) setMedicalRecords(recordsRes.data.records);
      if (reportsRes?.data?.reports) setMedicalReports(reportsRes.data.reports);
      if (rxRes?.data?.prescriptions) setPrescriptions(rxRes.data.prescriptions);
      if (payRes?.data?.payments) setPayments(payRes.data.payments);
      if (notifRes?.data?.notifications) setPatientNotifs(notifRes.data.notifications);
      if (userRes?.data?.user) setUserProfile(userRes.data.user);
      if (msgRes?.data?.messages) setMessages(msgRes.data.messages);
    } catch (requestError) {
      setPortalError(getApiErrorMessage(requestError, "Unable to load your patient portal data."));
    }
    setLoading(false);
  }, []);

  const searchClinics = useCallback(async () => {
    setDiscoveryLoading(true);
    try {
      const [res, doctorResult] = await Promise.all([
        clinicsApi.search({
          query: discoverySearch || undefined,
          city: discoveryCity || undefined,
          specialization: discoverySpec !== "All" ? discoverySpec : undefined,
          limit: 50,
        }),
        doctorsApi.search({
          query: discoverySearch || undefined,
          city: discoveryCity || undefined,
          specialty: discoverySpec !== "All" ? discoverySpec : undefined,
          availability_date: discoveryDate,
          limit: 50,
        }),
      ]);
      if (res?.data?.clinics) setClinics(res.data.clinics);
      setDoctors(doctorResult?.doctors || []);
    } catch (requestError) {
      setClinics([]);
      setDoctors([]);
      setPortalError(getApiErrorMessage(requestError, "Unable to search clinics and doctors."));
    }
    setDiscoveryLoading(false);
  }, [discoverySearch, discoveryCity, discoverySpec, discoveryDate]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (section === "p-discovery") {
      searchClinics();
    }
  }, [section, searchClinics]);

  const initials = ((userProfile?.first_name?.[0] || user?.first_name?.[0] || "P") + (userProfile?.last_name?.[0] || user?.last_name?.[0] || "T")).toUpperCase();
  const fullName = [userProfile?.first_name || user?.first_name || "Patient", userProfile?.last_name || user?.last_name || ""].filter(Boolean).join(" ");

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileSaved(false);
    setProfileError("");
    const today = new Date();
    const todayText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (editDob && editDob > todayText) {
      setProfileError("Date of birth cannot be in the future.");
      setProfileSaving(false);
      return;
    }
    try {
      await authApi.updateProfile({
        first_name: editFirstName,
        last_name: editLastName,
        phone: editPhone,
        date_of_birth: editDob || undefined,
        gender: editGender || undefined,
        blood_group: editBloodGroup || undefined,
        allergies: editAllergies || undefined,
        chronic_conditions: editChronic || undefined,
        emergency_contact_name: editEmergencyName || undefined,
        emergency_contact_phone: editEmergencyPhone || undefined,
        address: editAddress || undefined,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
      loadAllData();
    } catch (error) { setProfileError(getApiErrorMessage(error, "Unable to save your profile.")); }
    setProfileSaving(false);
  };

  const downloadPrescription = async (prescription: any) => {
    setDownloadingPrescriptionId(prescription.id);
    try {
      const response = await prescriptionsApi.downloadPdf(prescription.clinic_id, prescription.id);
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `prescription-${prescription.id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) { setPortalError(getApiErrorMessage(error, "Unable to generate the prescription PDF.")); }
    finally { setDownloadingPrescriptionId(""); }
  };

  // Compute live metrics
  const activeAppts = appointments.filter((a: any) => a.status === "scheduled" || a.status === "confirmed");
  const nextAppt = activeAppts.length > 0 ? activeAppts[0] : null;
  const pendingInvoices = payments.filter((p: any) => p.status === "pending" || p.payment_status === "pending");
  const pendingAmount = pendingInvoices.reduce((sum: number, p: any) => sum + (parseFloat(p.total_amount || p.amount) || 0), 0);

  // Extract all active medication items from real prescriptions
  const allMedications = prescriptions.flatMap((rx: any) =>
    (rx.items || []).map((item: any) => ({
      ...item,
      rx_id: rx.id,
      diagnosis: rx.diagnosis,
      doctor: `Dr. ${rx.doctor_first_name || ''} ${rx.doctor_last_name || ''}`.trim(),
      date: rx.created_at ? new Date(rx.created_at).toLocaleDateString() : '',
    }))
  );

  // Filtered lists
  const filteredAppointments = appointments.filter((a: any) => {
    if (apptFilter === "upcoming") return a.status === "scheduled" || a.status === "confirmed";
    if (apptFilter === "completed") return a.status === "completed";
    if (apptFilter === "cancelled") return a.status === "cancelled";
    return true;
  });

  const filteredPayments = payments.filter((p: any) => {
    const s = (p.status || p.payment_status || "").toLowerCase();
    if (payFilter === "pending") return s === "pending";
    if (payFilter === "completed") return s === "completed";
    return true;
  });

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      {portalError && <div role="alert" className="fixed top-4 right-4 z-[120] max-w-sm rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-rose-700 shadow-lg"><button className="float-right ml-3" onClick={() => setPortalError("")} aria-label="Dismiss error"><X size={14} /></button>{portalError}</div>}
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-100 flex flex-col h-screen flex-shrink-0 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center shadow-sm text-white">
              <Heart size={18} />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-base tracking-tight">Clinic<span className="text-teal-600">OS</span></span>
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-teal-600">Patient Portal</span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-slate-600 p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 border-b border-gray-50">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-teal-50/50 border border-teal-100/40">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{fullName}</p>
              <p className="text-xs text-teal-700 truncate">{patientProfile?.clinic_name || "Patient Account"}</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {PATIENT_NAV.map(item => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSection(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-teal-50 text-teal-700 font-bold border border-teal-100/80 shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.Icon size={16} className={active ? "text-teal-600" : "text-slate-400"} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-4 border-t border-gray-50">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-100 px-4 sm:px-8 py-4 flex items-center justify-between flex-shrink-0 relative z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{PATIENT_NAV.find(n => n.id === section)?.label ?? "Patient Portal"}</h1>
              <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px] sm:max-w-none">
                {patientProfile?.clinic_name ? `${patientProfile.clinic_name} · ` : ""}
                {fullName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications Menu */}
            <div className="relative" ref={patientNotifRef}>
              <button
                onClick={() => setPatientNotifOpen(v => !v)}
                className={`relative w-9 h-9 rounded-xl border flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors ${
                  patientNotifOpen ? "bg-slate-50 border-teal-300" : "border-gray-200"
                }`}
              >
                <Bell size={16} />
                {patientUnread > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center shadow-xs animate-pulse">
                    {patientUnread}
                  </span>
                )}
              </button>

              {patientNotifOpen && (
                <div className="absolute right-0 top-full mt-2 w-84 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                    <h3 className="font-bold text-slate-900 text-sm">Notifications</h3>
                    <button onClick={() => setPatientNotifOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
                  </div>
                  <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                    {patientNotifs.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-6">No notifications</p>
                    )}
                    {patientNotifs.map((n: any) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          authApi.markNotificationRead(n.id).catch(() => {});
                          setPatientNotifs((prev: any[]) => prev.map((x: any) => x.id === n.id ? { ...x, read: true, is_read: true } : x));
                        }}
                        className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors text-xs ${(!n.read && !n.is_read) ? "bg-teal-50/40" : ""}`}
                      >
                        <p className={`font-bold ${(!n.read && !n.is_read) ? "text-slate-900" : "text-slate-700"}`}>{n.title}</p>
                        <p className="text-slate-500 mt-1">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{n.created_at ? new Date(n.created_at).toLocaleString() : ""}</p>
                      </div>
                    ))}
                  </div>
                  {patientNotifs.length > 0 && (
                    <div className="border-t border-gray-50 px-5 py-2.5 bg-slate-50">
                      <button
                        onClick={() => {
                          authApi.markAllNotificationsRead().catch(() => {});
                          setPatientNotifs(n => n.map(x => ({ ...x, read: true, is_read: true })));
                          setPatientNotifOpen(false);
                        }}
                        className="text-xs text-teal-600 font-semibold hover:underline"
                      >
                        Mark all as read
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
              {initials}
            </div>
          </div>
        </div>

        {/* Views Content */}
        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* 1. MY HEALTH OVERVIEW */}
          {section === "p-overview" && (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Hello, {fullName.split(" ")[0]} 👋</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Here is your live health & clinical summary</p>
                </div>
                <div className="flex gap-2.5">
                  <Btn variant="outline" size="sm" onClick={() => setSection("p-discovery")}>
                    <Search size={14} /> Find Clinics
                  </Btn>
                  <Btn variant="teal" onClick={() => { setBookingClinicId(patientProfile?.clinic_id || "0"); setBookingDoctorId(""); setShowBookModal(true); }}>
                    <Plus size={14} /> Book Appointment
                  </Btn>
                </div>
              </div>

              {/* 4 Summary Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "Next Appointment",
                    value: nextAppt ? `${nextAppt.appointment_date} · ${nextAppt.start_time?.substring(0, 5)}` : "No upcoming",
                    sub: nextAppt ? nextAppt.clinic_name || "Clinic" : "Book a slot anytime",
                    Icon: Calendar,
                    bg: "bg-teal-50 text-teal-600",
                  },
                  {
                    label: "Medical Records",
                    value: medicalRecords.length.toString(),
                    sub: "Clinical SOAP notes",
                    Icon: FileText,
                    bg: "bg-blue-50 text-blue-600",
                  },
                  {
                    label: "Consultation Visits",
                    value: appointments.length.toString(),
                    sub: `${appointments.filter((a: any) => a.status === 'completed').length} completed visits`,
                    Icon: Heart,
                    bg: "bg-rose-50 text-rose-600",
                  },
                  {
                    label: "Pending Invoices",
                    value: `$${pendingAmount.toFixed(2)}`,
                    sub: `${pendingInvoices.length} pending payment`,
                    Icon: Receipt,
                    bg: "bg-amber-50 text-amber-600",
                  },
                ].map(s => (
                  <Card key={s.label} className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-500">{s.label}</span>
                      <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}><s.Icon size={16} /></div>
                    </div>
                    <div className="text-xl font-bold text-slate-900 truncate">{s.value}</div>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">{s.sub}</p>
                  </Card>
                ))}
              </div>

              {/* Upcoming Appointments & Current Medications */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Upcoming Appointments */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 text-sm">Upcoming Appointments</h3>
                    <button onClick={() => setSection("p-appointments")} className="text-xs text-teal-600 font-semibold hover:underline">
                      View all ({appointments.length})
                    </button>
                  </div>
                  <div className="space-y-3">
                    {activeAppts.slice(0, 3).map((appt: any) => (
                      <div key={appt.id} className="p-3.5 bg-slate-50 rounded-xl flex items-center justify-between gap-3 border border-gray-100/60">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0 font-bold">
                            <Calendar size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{appt.service_name || appt.type || "Consultation"}</p>
                            <p className="text-[11px] text-slate-500">{appt.appointment_date} · {appt.start_time?.substring(0, 5)} · {appt.clinic_name || "Clinic"}</p>
                            {appt.doctor_first_name && (
                              <p className="text-[10px] text-slate-400">Dr. {appt.doctor_first_name} {appt.doctor_last_name || ''}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <ApptBadge status={appt.status === "scheduled" ? "Confirmed" : appt.status} />
                          <button
                            onClick={() => { setSelectedAppointment(appt); setShowRescheduleModal(true); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Reschedule"
                          >
                            <RefreshCw size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {activeAppts.length === 0 && (
                      <div className="text-center py-8 bg-slate-50 rounded-xl">
                        <Calendar size={28} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs text-slate-500 font-medium">No upcoming appointments</p>
                        <button
                          onClick={() => { setBookingClinicId(patientProfile?.clinic_id || "0"); setBookingDoctorId(""); setShowBookModal(true); }}
                          className="mt-2 text-xs text-teal-600 font-bold hover:underline"
                        >
                          Book an appointment now
                        </button>
                      </div>
                    )}
                  </div>
                </Card>

                {/* Active Prescribed Medications */}
                <Card className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 text-sm">Active Medications</h3>
                    <button onClick={() => setSection("p-prescriptions")} className="text-xs text-teal-600 font-semibold hover:underline">
                      View all Rx ({prescriptions.length})
                    </button>
                  </div>
                  <div className="space-y-3">
                    {allMedications.slice(0, 4).map((m: any, idx: number) => (
                      <div key={idx} className="p-3.5 bg-slate-50 rounded-xl flex items-center justify-between gap-3 border border-gray-100/60">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold">
                            <Pill size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{m.medication_name || m.medicine_name}</p>
                            <p className="text-[11px] text-slate-500">{m.dosage || 'Dosage not recorded'} · {m.frequency || 'Frequency not recorded'} · {m.duration || 'Duration not recorded'}</p>
                            {m.instructions && <p className="text-[10px] text-slate-400 italic">"{m.instructions}"</p>}
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                          {m.doctor || 'Doctor Rx'}
                        </span>
                      </div>
                    ))}
                    {allMedications.length === 0 && (
                      <div className="text-center py-8 bg-slate-50 rounded-xl">
                        <Pill size={28} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs text-slate-500 font-medium">No active medications recorded</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Medications issued during doctor consultations appear here</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Patient Clinical Profile & Vitals Summary */}
              <Card className="p-6">
                <h3 className="font-bold text-slate-900 text-sm mb-4">Clinical Profile Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  <div className="bg-slate-50 p-4 rounded-xl border border-gray-100/60">
                    <p className="text-[11px] font-semibold text-slate-400 mb-1">Blood Group</p>
                    <p className="text-lg font-extrabold text-teal-700">{patientProfile?.blood_group || userProfile?.blood_group || "Not set"}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-gray-100/60">
                    <p className="text-[11px] font-semibold text-slate-400 mb-1">Gender</p>
                    <p className="text-lg font-extrabold text-slate-800 capitalize">{patientProfile?.gender || "Not set"}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-gray-100/60">
                    <p className="text-[11px] font-semibold text-slate-400 mb-1">Date of Birth</p>
                    <p className="text-sm font-bold text-slate-800 mt-1">{patientProfile?.date_of_birth ? new Date(patientProfile.date_of_birth).toLocaleDateString() : "Not set"}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-gray-100/60">
                    <p className="text-[11px] font-semibold text-slate-400 mb-1">Allergies</p>
                    <p className="text-xs font-bold text-rose-600 mt-1 truncate">{patientProfile?.allergies || "None noted"}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-gray-100/60">
                    <p className="text-[11px] font-semibold text-slate-400 mb-1">Emergency Contact</p>
                    <p className="text-xs font-bold text-slate-800 mt-1 truncate">{patientProfile?.emergency_contact_phone || "Not set"}</p>
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* 2. CLINIC & DOCTOR DISCOVERY */}
          {section === "p-discovery" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Find Clinics & Doctors</h2>
                <p className="text-slate-500 text-xs mt-0.5">Search verified clinics, doctors, and available medical services</p>
              </div>

              {/* Filter controls */}
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={discoverySearch}
                      onChange={e => setDiscoverySearch(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && searchClinics()}
                      placeholder="Search clinic name, doctor, or treatment..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <input
                    type="search"
                    value={discoveryCity}
                    onChange={e => setDiscoveryCity(e.target.value)}
                    placeholder="City or location"
                    aria-label="Clinic city"
                    className="px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  />
                  <input
                    type="date"
                    min={localDateString()}
                    value={discoveryDate}
                    onChange={e => setDiscoveryDate(e.target.value)}
                    aria-label="Doctor availability date"
                    className="px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
                  />
                  <button
                    onClick={searchClinics}
                    className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors"
                  >
                    Search
                  </button>
                </div>

                {/* Specialization Chips */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-50">
                  {["All", "Cardiology", "General Medicine", "Pediatrics", "Dermatology", "Orthopedics", "Dentistry"].map(spec => (
                    <button
                      key={spec}
                      onClick={() => setDiscoverySpec(spec)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        discoverySpec === spec
                          ? "bg-teal-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-900">Available doctors</h3>
                  <span className="text-xs text-slate-400">{discoveryDate}</span>
                </div>
                {doctors.length === 0 ? (
                  <div className="p-5 bg-white border border-gray-100 rounded-2xl text-xs text-slate-500">No doctors have an open slot for these filters.</div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {doctors.map((doctor: any) => (
                      <Card key={doctor.doctor_id} className="p-5">
                        <div className="flex justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-900">Dr. {doctor.first_name} {doctor.last_name}</p>
                            <p className="text-xs text-teal-700 font-semibold">{doctor.specialization || "General Medicine"}</p>
                            <p className="text-xs text-slate-500 mt-2">{doctor.experience_years || 0} years · ${doctor.consultation_fee || 0}</p>
                          </div>
                          <div className="text-xs font-bold text-amber-700"><Star size={12} className="inline fill-amber-400" /> {Number(doctor.avg_rating || 0).toFixed(1)}</div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <Btn variant="teal" size="sm" onClick={() => {
                            const clinic = doctor.available_clinic_ids?.[0];
                            if (clinic) {
                              setBookingClinicId(clinic);
                              setBookingDoctorId(doctor.doctor_id);
                              setShowBookModal(true);
                            }
                          }}><Calendar size={13} /> View slots & book</Btn>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Clinics Result Grid */}
              {discoveryLoading ? (
                <div className="text-center py-12 text-slate-400 text-sm font-medium">Searching verified clinics...</div>
              ) : clinics.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-8">
                  <Building2 size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-700">No clinics found</p>
                  <p className="text-xs text-slate-400 mt-1">Try broadening your search query or location filter.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {clinics.map((clinic: any) => (
                    <Card key={clinic.id} className="p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-slate-900 text-base">{clinic.name}</h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <MapPin size={12} className="text-slate-400" />
                              {clinic.address ? `${clinic.address}, ` : ""}{clinic.city || "Location not provided"}
                            </p>
                          </div>
                          {Number(clinic.reviews_count || 0) > 0 ? <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded-lg text-xs font-bold border border-amber-100">
                            <Star size={12} className="fill-amber-400 text-amber-400" />
                            {parseFloat(clinic.avg_rating || 0).toFixed(1)}
                            <span className="text-[10px] text-amber-600 font-normal">({clinic.reviews_count})</span>
                          </div> : <span className="text-[10px] font-semibold text-slate-400">No reviews yet</span>}
                        </div>

                        {clinic.doctor_first_name && (
                          <div className="p-3 bg-teal-50/50 rounded-xl text-xs flex items-center gap-2 border border-teal-100/40">
                            <Stethoscope size={14} className="text-teal-600" />
                            <span className="font-semibold text-slate-700">Primary Doctor:</span>
                            <span className="font-bold text-teal-800">Dr. {clinic.doctor_first_name} {clinic.doctor_last_name || ''}</span>
                          </div>
                        )}

                        <p className="text-xs text-slate-600 line-clamp-2">
                          {clinic.description || "No clinic description provided."}
                        </p>
                      </div>

                      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                        <div className="text-xs text-slate-500">Fees shown when selecting a service</div>
                        <div className="flex gap-2">
                          <Btn
                            variant="teal"
                            size="sm"
                            onClick={() => {
                              setBookingClinicId(clinic.id);
                              setBookingDoctorId(clinic.primary_doctor_id || "");
                              setShowBookModal(true);
                            }}
                          >
                            <Calendar size={13} /> Book Consultation
                          </Btn>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. MY APPOINTMENTS */}
          {section === "p-appointments" && (
            <Card>
              <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900">My Appointments</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Track, reschedule, or cancel your clinic visits</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
                    {["all", "upcoming", "completed", "cancelled"].map(f => (
                      <button
                        key={f}
                        onClick={() => setApptFilter(f)}
                        className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                          apptFilter === f ? "bg-white text-slate-900 shadow-xs font-bold" : "hover:text-slate-900"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <Btn variant="teal" size="sm" onClick={() => { setBookingClinicId(patientProfile?.clinic_id || "0"); setBookingDoctorId(""); setShowBookModal(true); }}>
                    <Plus size={13} /> Book New
                  </Btn>
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {filteredAppointments.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-medium">No appointments found for this filter</p>
                  </div>
                )}
                {filteredAppointments.map((appt: any) => (
                  <div key={appt.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {appt.service_name || appt.type || "Medical Consultation"}
                          {appt.doctor_first_name ? ` with Dr. ${appt.doctor_first_name} ${appt.doctor_last_name || ""}` : ""}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          📅 {appt.appointment_date} at {appt.start_time?.substring(0, 5)} · 🏥 {appt.clinic_name || "Clinic"}
                        </p>
                        {appt.notes && <p className="text-xs text-slate-400 italic mt-1">"{appt.notes}"</p>}
                        {appt.cancellation_reason && (
                          <p className="text-xs text-rose-600 font-medium mt-1">Reason: {appt.cancellation_reason}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <ApptBadge status={appt.status === "scheduled" ? "Confirmed" : appt.status} />

                      {(appt.status === "scheduled" || appt.status === "confirmed") && (
                        <>
                          <button
                            onClick={() => { setSelectedAppointment(appt); setShowRescheduleModal(true); }}
                            className="px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                          >
                            Reschedule
                          </button>
                          <button
                            onClick={() => { setSelectedCancelAppt(appt); setShowCancelModal(true); }}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {appt.status === "completed" && (
                        <button
                          onClick={() => {
                            setReviewClinicId(appt.clinic_id);
                            setReviewAppointmentId(appt.id);
                            setShowReviewModal(true);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors flex items-center gap-1"
                        >
                          <Star size={12} className="fill-amber-400" /> Review
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 4. MEDICAL RECORDS */}
          {section === "p-records" && (
            <Card>
              <div className="p-6 border-b border-gray-50">
                <h3 className="font-bold text-slate-900">My Medical History & Records</h3>
                <p className="text-xs text-slate-400 mt-0.5">Your official consultation records, diagnosis, and treatment plans</p>
              </div>

              <div className="divide-y divide-gray-50">
                {medicalRecords.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-medium">No medical records on file yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Clinical notes recorded during visits will appear here</p>
                  </div>
                )}
                {medicalRecords.map((r: any) => (
                  <div key={r.id} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{r.diagnosis || "Medical Examination"}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          📅 {r.created_at ? new Date(r.created_at).toLocaleDateString() : ""} · Dr. {r.doctor_first_name} {r.doctor_last_name || ''} · {r.clinic_name || 'Clinic'}
                        </p>
                        {r.treatment_plan && (
                          <p className="text-xs text-slate-600 mt-1.5 line-clamp-2"><span className="font-semibold text-slate-700">Treatment:</span> {r.treatment_plan}</p>
                        )}
                        {r.follow_up_date && (
                          <p className="text-[11px] text-amber-700 font-medium mt-1">Follow-up: {new Date(r.follow_up_date).toLocaleDateString()}</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => { setSelectedRecord(r); setShowViewRecordModal(true); }}
                      className="px-4 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors self-start sm:self-center"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {section === "p-records" && (
            <Card className="mt-5">
              <div className="p-6 border-b border-gray-50"><h3 className="font-bold text-slate-900">Medical Reports</h3><p className="text-xs text-slate-400">Lab results and report references uploaded by your clinic</p></div>
              <div className="divide-y divide-gray-50">
                {medicalReports.map((report: any) => <div key={report.id} className="p-5 flex items-center justify-between gap-4"><div><p className="text-sm font-bold">{report.title || report.report_type}</p><p className="text-xs text-slate-500">{report.report_type} · {report.file_name || 'Referenced document'} · {String(report.report_date || '').slice(0,10)}</p><p className="text-xs text-slate-600 mt-1">{report.description}</p></div>{report.file_url?.startsWith('https://') ? <a href={report.file_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-teal-700">Open report</a> : <span className="text-xs text-slate-400">Simulated file</span>}</div>)}
                {!medicalReports.length && <p className="p-6 text-xs text-slate-400">No medical reports uploaded.</p>}
              </div>
            </Card>
          )}

          {/* 5. PRESCRIPTIONS */}
          {section === "p-prescriptions" && (
            <Card>
              <div className="p-6 border-b border-gray-50">
                <h3 className="font-bold text-slate-900">Digital Prescriptions</h3>
                <p className="text-xs text-slate-400 mt-0.5">Official prescription orders with complete medication instructions</p>
              </div>

              <div className="divide-y divide-gray-50">
                {prescriptions.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Pill size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-medium">No prescriptions issued yet</p>
                  </div>
                )}
                {prescriptions.map((rx: any) => (
                  <div key={rx.id} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                        <Pill size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{rx.diagnosis || "Prescription"}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          📅 {rx.created_at ? new Date(rx.created_at).toLocaleDateString() : ""} · Dr. {rx.doctor_first_name} {rx.doctor_last_name || ''} · {rx.clinic_name || 'Clinic'}
                        </p>
                        <p className="text-xs text-teal-700 font-semibold mt-1">
                          💊 {(rx.items || []).length} medication(s) prescribed
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 self-start sm:self-center">
                      <button onClick={() => { setSelectedPrescription(rx); setShowViewRxModal(true); }} className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition-colors flex items-center gap-1.5"><Eye size={13} /> View</button>
                      <button disabled={downloadingPrescriptionId === rx.id} onClick={() => downloadPrescription(rx)} className="px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5"><Download size={13} /> {downloadingPrescriptionId === rx.id ? "Generating..." : "PDF"}</button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 6. INVOICES & SIMULATED PAYMENTS */}
          {section === "p-invoices" && (
            <Card>
              <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900">Invoices & Payments</h3>
                  <p className="text-xs text-slate-400 mt-0.5">View consultation fees, receipts, and complete online checkout</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
                  {["all", "pending", "completed"].map(f => (
                    <button
                      key={f}
                      onClick={() => setPayFilter(f)}
                      className={`px-3 py-1 rounded-lg capitalize transition-colors ${
                        payFilter === f ? "bg-white text-slate-900 shadow-xs font-bold" : "hover:text-slate-900"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-gray-50">
                {filteredPayments.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Receipt size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-medium">No invoices found for this filter</p>
                  </div>
                )}
                {filteredPayments.map((inv: any) => {
                  const isPaid = (inv.status || inv.payment_status) === "completed";
                  return (
                    <div key={inv.id} className="p-6 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold flex-shrink-0 mt-0.5 ${
                          isPaid ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
                        }`}>
                          <Receipt size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{inv.service_name || inv.notes || "Medical Consultation Invoice"}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Invoice: <span className="font-mono font-semibold">{inv.invoice_number || inv.id}</span> · {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : ""} · {inv.clinic_name || "Clinic"}
                          </p>
                          {inv.transaction_id && (
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">Txn: {inv.transaction_id}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-base font-extrabold text-slate-900">
                          ${parseFloat(inv.total_amount || inv.amount || 0).toFixed(2)}
                        </span>
                        <InvoiceBadge status={isPaid ? "Paid" : "Pending"} />
                        {isPaid && (
                          <Btn variant="outline" size="sm" onClick={async () => {
                            const response = await paymentsApi.downloadReceipt(inv.clinic_id, inv.id);
                            const url = URL.createObjectURL(response.data);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `receipt-${inv.receipt_number || inv.id}.pdf`;
                            link.click();
                            URL.revokeObjectURL(url);
                          }}><Download size={13} /> Receipt</Btn>
                        )}
                        {!isPaid && (
                          <Btn
                            variant="teal"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setShowPayModal(true);
                            }}
                          >
                            <CreditCard size={13} /> Pay Now
                          </Btn>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* 7. MESSAGES */}
          {section === "p-messages" && (
            <Card>
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Doctor Inquiries & Messages</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Secure direct communication with your healthcare providers</p>
                </div>
                <Btn
                  variant="teal"
                  size="sm"
                  onClick={() => {
                    setMessageReceiverId("");
                    setMessageReceiverName("");
                    setShowMessageModal(true);
                  }}
                >
                  <Send size={13} /> New Message
                </Btn>
              </div>

              <div className="divide-y divide-gray-50">
                {messages.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <MessageSquare size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs font-medium">No messages yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Send a message to your doctor for medical inquiries</p>
                  </div>
                )}
                {messages.map((m: any) => {
                  const isSentByMe = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className="p-6 hover:bg-slate-50/50 transition-colors space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            isSentByMe ? "bg-blue-50 text-blue-700" : "bg-teal-50 text-teal-700"
                          }`}>
                            {isSentByMe ? "Sent to Doctor" : `From: Dr. ${m.sender_first_name} ${m.sender_last_name || ''}`}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">{m.subject || "General Query"}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{m.created_at ? new Date(m.created_at).toLocaleString() : ""}</span>
                      </div>
                      <p className="text-xs text-slate-600 bg-slate-50 p-3.5 rounded-xl whitespace-pre-wrap border border-gray-100/60">
                        {m.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* 8. PROFILE SETTINGS */}
          {section === "p-profile" && (
            <div className="max-w-2xl">
              <Card className="p-6 space-y-6">
                <div className="flex items-center gap-4 pb-6 border-b border-gray-50">
                  <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white font-bold text-xl flex items-center justify-center shadow-sm">
                    {initials}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{fullName}</h3>
                    <p className="text-xs text-slate-400">Patient Account · {patientProfile?.created_at ? `Member since ${new Date(patientProfile.created_at).toLocaleDateString()}` : "Profile not yet linked to a clinic"}</p>
                  </div>
                </div>

                {profileSaved && (
                  <div className="p-3.5 bg-teal-50 border border-teal-200 text-teal-800 text-xs rounded-xl font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} /> Profile updated successfully!
                  </div>
                )}
                {profileError && <div role="alert" className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold">{profileError}</div>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">First Name *</label>
                    <input
                      value={editFirstName}
                      onChange={e => setEditFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Last Name *</label>
                    <input
                      value={editLastName}
                      onChange={e => setEditLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number</label>
                    <input
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                    <input
                      value={userProfile?.email || user?.email || ""}
                      disabled
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Blood Group</label>
                    <select
                      value={editBloodGroup}
                      onChange={e => setEditBloodGroup(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    >
                      <option value="">Select</option>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Gender</label>
                    <select
                      value={editGender}
                      onChange={e => setEditGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Date of Birth</label>
                    <input
                      type="date"
                      max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`}
                      value={editDob}
                      onChange={e => setEditDob(e.target.value)}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Known Allergies</label>
                    <input
                      value={editAllergies}
                      onChange={e => setEditAllergies(e.target.value)}
                      placeholder="e.g. Penicillin, Peanuts"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Chronic Conditions</label>
                    <input
                      value={editChronic}
                      onChange={e => setEditChronic(e.target.value)}
                      placeholder="e.g. Hypertension, Diabetes"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Emergency Contact Name</label>
                    <input
                      value={editEmergencyName}
                      onChange={e => setEditEmergencyName(e.target.value)}
                      placeholder="e.g. Jane Doe (Spouse)"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Emergency Contact Phone</label>
                    <input
                      value={editEmergencyPhone}
                      onChange={e => setEditEmergencyPhone(e.target.value)}
                      placeholder="+1 (555) 999-0000"
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Residential Address</label>
                  <input
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    placeholder="123 Health Ave, Suite 400"
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <Btn variant="teal" onClick={handleSaveProfile} disabled={profileSaving}>
                    <Check size={14} /> {profileSaving ? "Saving..." : "Save Profile Details"}
                  </Btn>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <BookAppointmentModal
        open={showBookModal}
        onClose={() => setShowBookModal(false)}
        clinicId={bookingClinicId || patientProfile?.clinic_id || "0"}
        doctorId={bookingDoctorId || ""}
        appointmentDate={discoveryDate}
        patientId={patientProfile?.id}
        onSuccess={() => {
          loadAllData();
        }}
      />

      <RescheduleModal
        open={showRescheduleModal}
        onClose={() => { setShowRescheduleModal(false); setSelectedAppointment(null); }}
        appointment={selectedAppointment}
        clinicId={selectedAppointment?.clinic_id || "0"}
        onSuccess={() => {
          loadAllData();
        }}
      />

      <CancelAppointmentModal
        open={showCancelModal}
        onClose={() => { setShowCancelModal(false); setSelectedCancelAppt(null); }}
        appointment={selectedCancelAppt}
        clinicId={selectedCancelAppt?.clinic_id || "0"}
        onSuccess={() => {
          loadAllData();
        }}
      />

      <ViewPrescriptionModal
        open={showViewRxModal}
        onClose={() => { setShowViewRxModal(false); setSelectedPrescription(null); }}
        prescription={selectedPrescription}
      />

      <ViewMedicalRecordModal
        open={showViewRecordModal}
        onClose={() => { setShowViewRecordModal(false); setSelectedRecord(null); }}
        record={selectedRecord}
      />

      <PayInvoiceModal
        open={showPayModal}
        onClose={() => { setShowPayModal(false); setSelectedInvoice(null); }}
        invoice={selectedInvoice}
        clinicId={selectedInvoice?.clinic_id || patientProfile?.clinic_id || "0"}
        onSuccess={() => {
          loadAllData();
        }}
      />

      <SubmitReviewModal
        open={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setReviewAppointmentId("");
        }}
        clinicId={reviewClinicId || patientProfile?.clinic_id || "0"}
        appointmentId={reviewAppointmentId}
        onSuccess={() => {
          loadAllData();
        }}
      />

      <SendMessageModal
        open={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        receiverId={messageReceiverId}
        receiverName={messageReceiverName}
        senderId={user?.id}
        senderName={fullName}
        onSuccess={() => {
          loadAllData();
        }}
      />
    </div>
  );
}

function ClinicSubscriptionTab({ clinicId }: { clinicId: string }) {
  const [sub, setSub] = useState<any>(null);
  const [limits, setLimits] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [msg, setMsg] = useState("");

  const loadSubData = useCallback(async () => {
    try {
      const [subRes, limRes, plansRes] = await Promise.all([
        subscriptionsApi.getMySubscription(clinicId),
        subscriptionsApi.getLimits(clinicId),
        subscriptionsApi.getPlans(),
      ]);
      if (subRes?.data?.subscription) setSub(subRes.data.subscription);
      if (limRes?.data?.limits) setLimits(limRes.data.limits);
      if (plansRes?.data?.plans) setPlans(plansRes.data.plans);
    } catch (requestError) { setMsg(getApiErrorMessage(requestError, "Unable to load plan and usage data.")); }
    setLoading(false);
  }, [clinicId]);

  useEffect(() => {
    loadSubData();
  }, [loadSubData]);

  const handleSubscribe = async (planId: string) => {
    setSubscribing(true);
    setMsg("");
    try {
      await subscriptionsApi.subscribe(clinicId, planId, "monthly");
      setMsg("Subscription updated successfully! (Simulated payment recorded)");
      setTimeout(() => setMsg(""), 3500);
      loadSubData();
    } catch (err: any) {
      setMsg(err.response?.data?.message || "Failed to update subscription");
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    if (confirm("Are you sure you want to cancel your active clinic subscription?")) {
      try {
        await subscriptionsApi.cancelSubscription(clinicId);
        setMsg("Subscription cancelled");
        setTimeout(() => setMsg(""), 3000);
        loadSubData();
      } catch (requestError) { setMsg(getApiErrorMessage(requestError, "Unable to cancel the subscription.")); }
    }
  };

  const handleRenew = async () => {
    setSubscribing(true);
    try {
      await subscriptionsApi.renewSubscription(clinicId);
      setMsg("Subscription renewed; the new expiration date is active.");
      loadSubData();
    } catch (err: any) {
      setMsg(err.response?.data?.message || "Unable to renew subscription");
    } finally { setSubscribing(false); }
  };

  if (loading) return <div className="p-8 text-xs text-slate-400">Loading plan and usage data...</div>;

  return (
    <div className="max-w-4xl space-y-6">
      {msg && (
        <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check size={14} /> {msg}
        </div>
      )}

      {/* Current Subscription Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Plan</span>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{sub?.plan_name || "Starter"}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${sub?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}`}>
              {sub?.status === 'active' ? 'Active' : 'Inactive'}
            </span>
            {sub && !sub.is_default && sub.status === 'active' && (
              <button onClick={handleCancel} className="text-xs text-red-600 hover:underline ml-2 font-semibold">Cancel Plan</button>
            )}
            {sub && !sub.is_default && (
              <button disabled={subscribing} onClick={handleRenew} className="text-xs text-blue-600 hover:underline ml-2 font-semibold">Renew Plan</button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-gray-100 mb-6">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Price</p>
            <p className="text-base font-bold text-slate-900">${sub?.price || 0} / mo</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Start Date</p>
            <p className="text-sm font-semibold text-slate-800">{sub?.start_date || "Lifetime"}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Expiration / Renewal</p>
            <p className="text-sm font-semibold text-slate-800">{sub?.end_date || "Continuous"}</p>
          </div>
        </div>

        {/* Real-time Limits & Usage */}
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Resource Limits & Usage</h4>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Patients</span>
              <span>{limits?.patients?.current || 0} / {limits?.patients?.max ?? "Unlimited"}</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${limits?.patients?.allowed ? 'bg-blue-600' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, (((limits?.patients?.current || 0) / (limits?.patients?.max || 1)) * 100))}%` }}
              />
            </div>
            {!limits?.patients?.allowed && <p className="text-[10px] text-red-600 font-semibold mt-1">Patient limit reached</p>}
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Clinic Staff</span>
              <span>{limits?.staff?.current || 0} / {limits?.staff?.max ?? "Unlimited"}</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${limits?.staff?.allowed ? 'bg-teal-600' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, (((limits?.staff?.current || 0) / (limits?.staff?.max || 1)) * 100))}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Doctors</span>
              <span>{limits?.doctors?.current || 1} / {limits?.doctors?.max ?? 1}</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${limits?.doctors?.allowed ? 'bg-violet-600' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, (((limits?.doctors?.current || 1) / (limits?.doctors?.max || 1)) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Available Plans Grid */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-4">Available Subscription Plans</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((p: any) => {
            const isCurrent = sub?.plan_id === p.id || (sub?.is_default && p.name.includes("Starter"));
            return (
              <Card key={p.id} className={`p-5 flex flex-col justify-between ${isCurrent ? 'border-2 border-blue-600 shadow-md' : 'border border-gray-200'}`}>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-base font-bold text-slate-900">{p.name}</span>
                    {isCurrent && <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">CURRENT</span>}
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900 mb-1">${p.price}<span className="text-xs text-slate-400 font-normal"> / {p.billing_cycle || 'mo'}</span></p>
                  <p className="text-xs text-slate-500 mb-4">{p.description || "Healthcare management plan"}</p>

                  <div className="space-y-2 border-t border-gray-100 pt-3 text-xs text-slate-600 mb-6">
                    <div className="flex items-center gap-2"><Check size={13} className="text-green-600" /> Max {p.max_patients || "Unlimited"} Patients</div>
                    <div className="flex items-center gap-2"><Check size={13} className="text-green-600" /> Max {p.max_doctors || 1} Doctor(s)</div>
                    <div className="flex items-center gap-2"><Check size={13} className="text-green-600" /> Max {p.max_staff || 2} Staff Members</div>
                    {(p.features || []).map((feat: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2"><Check size={13} className="text-blue-600" /> {feat}</div>
                    ))}
                  </div>
                </div>

                <button
                  disabled={isCurrent || subscribing}
                  onClick={() => handleSubscribe(p.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  }`}
                >
                  {isCurrent ? "Current Plan" : "Subscribe / Upgrade"}
                </button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Admin Panel ─────────────────────────────────────────────────────────────────

const ADMIN_NAV = [
  { id: "a-overview",       label: "Platform Overview",    Icon: LayoutDashboard },
  { id: "a-clinics",        label: "Clinics Management",   Icon: Building2 },
  { id: "a-users",          label: "User Management",      Icon: Users },
  { id: "a-subscriptions",  label: "Subscriptions & Plans",Icon: CreditCard },
  { id: "a-reviews",        label: "Review Moderation",    Icon: Star },
  { id: "a-settings",       label: "Audit Logs & Security",Icon: Shield },
];

function AdminPanel({ onBack, onLogout, user }: { onBack: () => void; onLogout: () => void; user?: any }) {
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

  // Users state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);

  // Subscriptions & Plans state
  const [plans, setPlans] = useState<any[]>([]);
  const [clinicSubs, setClinicSubs] = useState<any[]>([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({
    name: "",
    description: "",
    price: 0,
    billing_cycle: "monthly",
    max_doctors: 1,
    max_patients: 100,
    max_staff: 2,
    features: "Basic Scheduling, EMR Notes, Digital Prescriptions",
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
      const featArray = typeof planForm.features === 'string'
        ? planForm.features.split(',').map(s => s.trim()).filter(Boolean)
        : planForm.features;
      const payload = {
        ...planForm,
        features: featArray,
        price: parseFloat(planForm.price as any) || 0,
        max_doctors: parseInt(planForm.max_doctors as any, 10) || 1,
        max_patients: parseInt(planForm.max_patients as any, 10) || 100,
        max_staff: parseInt(planForm.max_staff as any, 10) || 2,
      };

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
                        <td className="px-5 py-3.5">
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
                        </td>
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
                        <td className="px-5 py-3.5">
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
                        </td>
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
                      features: "Online Booking, EMR Notes, Digital Prescriptions, Billing",
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
                            features: (p.features || []).join(", "),
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
                        {["Clinic", "Subscribed Plan", "Plan Price", "Billing Cycle", "Start Date", "End Date", "Status"].map(h => (
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
                        </tr>
                      ))}
                      {clinicSubs.length === 0 && (
                        <tr><td colSpan={7} className="py-8 text-center text-slate-400">No clinic subscriptions recorded</td></tr>
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">Features (comma-separated)</label>
                <textarea
                  rows={2}
                  value={planForm.features}
                  onChange={e => setPlanForm({ ...planForm, features: e.target.value })}
                  placeholder="Online Booking, EMR Notes, Digital Prescriptions"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
                />
              </div>

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

export default function App() {
  const [page, setPage] = useState<"landing" | "auth" | "dashboard" | "patient-portal" | "admin" | "reset-password">("landing");
  const [section, setSection] = useState("overview");
  const [user, setUser] = useState(getStoredUser());
  const [clinics, setClinics] = useState<any[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState("");
  const [clinicError, setClinicError] = useState("");

  const fetchClinics = useCallback(async () => {
    setClinicError("");
    try {
      const { data } = await clinicsApi.getMyClinics();
      const accessible = data.clinics || data || [];
      const currentUser = getStoredUser();
      const storageKey = `clinic_os_selected_clinic_id_${currentUser?.id || "anonymous"}`;
      const active = accessible.filter((clinic: any) => Boolean(clinic.is_active));
      setClinics(accessible);
      const storedId = localStorage.getItem(storageKey);
      const found = active.find((c: any) => c.id === storedId);
      if (found) setSelectedClinic(found);
      else if (active.length) {
        setSelectedClinic(active[0]);
        localStorage.setItem(storageKey, active[0].id);
      } else {
        setSelectedClinic(null);
        localStorage.removeItem(storageKey);
      }
    } catch (requestError) {
      setClinics([]);
      setSelectedClinic(null);
      setClinicError(getApiErrorMessage(requestError, "Unable to load your clinic workspaces."));
    }
  }, []);

  const handleSwitchClinic = useCallback((clinic: any) => {
    const authorized = clinics.find((candidate: any) => candidate.id === clinic?.id && candidate.is_active);
    if (!authorized) return;
    setSection("overview");
    setSelectedClinic(authorized);
    localStorage.setItem(`clinic_os_selected_clinic_id_${user?.id || "anonymous"}`, authorized.id);
  }, [clinics, user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("token")) {
      setPage("reset-password");
      setLoading(false);
      return;
    }
    if (isAuthenticated() && getStoredUser()) {
      const saved = getStoredUser();
      setUser(saved);
      if (saved.role !== "patient" && saved.role !== "admin") fetchClinics();
      if (saved.role === "patient") setPage("patient-portal");
      else if (saved.role === "admin") setPage("admin");
      else setPage("dashboard");
    }
    setLoading(false);
  }, [fetchClinics, user?.id]);

  useEffect(() => {
    const expire = () => {
      Object.keys(localStorage).filter(key => key.startsWith('clinic_os_')).forEach(key => localStorage.removeItem(key));
      setUser(null);
      setClinics([]);
      setSelectedClinic(null);
      setSection('overview');
      setSessionNotice('Your session expired. Please sign in again.');
      setPage('auth');
    };
    window.addEventListener('auth:expired', expire);
    return () => window.removeEventListener('auth:expired', expire);
  }, []);

  const handleLoginSuccess = useCallback((token: string, userData: any) => {
    setAuthToken(token, userData);
    setUser(userData);
    if (userData.role === "patient") setPage("patient-portal");
    else if (userData.role === "admin") setPage("admin");
    else {
      fetchClinics();
      setPage("dashboard");
    }
  }, [fetchClinics]);

  const handleCreateClinic = useCallback(async (data: any) => {
    const res = await clinicsApi.create(data);
    await fetchClinics();
    const newClinic = res.data?.clinic || res.data;
    if (newClinic?.id) {
      setSelectedClinic(newClinic);
      localStorage.setItem(`clinic_os_selected_clinic_id_${user?.id || "anonymous"}`, newClinic.id);
    }
    return res;
  }, [fetchClinics]);

  const handleLogout = useCallback(() => {
    setAuthToken(null, null);
    setUser(null);
    setClinics([]);
    setSelectedClinic(null);
    Object.keys(localStorage).filter(key => key.startsWith("clinic_os_selected_clinic_id_")).forEach(key => localStorage.removeItem(key));
    setPage("landing");
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (page === "auth")           return <AuthPage notice={sessionNotice} onSuccess={(token, data) => { setSessionNotice(''); handleLoginSuccess(token, data); }} onBack={() => setPage("landing")} />;
  if (page === "dashboard")      return <><DashboardLayout section={section} setSection={setSection} onLogout={handleLogout} user={user} clinics={clinics} selectedClinic={selectedClinic} onSwitchClinic={handleSwitchClinic} onCreateClinic={handleCreateClinic} />{clinicError && <div role="alert" className="fixed bottom-5 right-5 z-[150] max-w-sm rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-xl">{clinicError}<button type="button" onClick={fetchClinics} className="ml-3 font-semibold text-blue-700">Retry</button></div>}</>;
  if (page === "patient-portal") return <PatientPortal onBack={() => setPage("landing")} onLogout={handleLogout} />;
  if (page === "admin" && user?.role === "admin") return <AdminPanel onBack={() => setPage("landing")} onLogout={handleLogout} user={user} />;
  if (page === "reset-password") return <ResetPasswordPage onBackToLogin={() => setPage("auth")} />;
  return (
    <LandingPage
      onLogin={() => setPage("auth")}
      onStart={() => setPage("auth")}
      onPatientPortal={() => setPage("auth")}
      onAdmin={() => setPage("auth")}
    />
  );
}
