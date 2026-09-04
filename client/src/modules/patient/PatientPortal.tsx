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

export function PatientPortal({ onBack, onLogout }: { onBack: () => void; onLogout: () => void }) {
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

  const downloadPrescription = (prescription: any) => {
    setDownloadingPrescriptionId(prescription.id);
    try {
      generatePrescriptionPdf(prescription);
    } catch (error) {
      setPortalError("Unable to generate the prescription PDF. Please try viewing and printing.");
    } finally {
      setDownloadingPrescriptionId("");
    }
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
        onClose={() => {
          setShowBookModal(false);
          setBookingDoctorId("");
        }}
        clinicId={bookingClinicId && bookingClinicId !== "0" ? bookingClinicId : (patientProfile?.clinic_id || "")}
        doctorId={bookingDoctorId}
        appointmentDate={discoveryDate}
        patientId={patientProfile?.id}
        isPatient={true}
        clinicsList={clinics}
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
