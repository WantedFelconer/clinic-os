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

export function LandingPage({ onLogin, onStart, onPatientPortal, onAdmin }: {
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
