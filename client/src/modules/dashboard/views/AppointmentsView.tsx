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
export function AppointmentsView({ selectedClinic }: { selectedClinic?: any }) {
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
