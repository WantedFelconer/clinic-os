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
export function PatientDetail({ patient, clinicId, onBack }: { patient: any; clinicId: string; onBack: () => void }) {
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
