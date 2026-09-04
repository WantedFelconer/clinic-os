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
import { PatientDetail } from './PatientDetail';
export function PatientsView({ selectedClinic }: { selectedClinic?: any }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
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
        const res = await patientsApi.getByClinic(selectedClinic.id, { search: debouncedSearch, limit: 100 });
        setPatients(res.data?.patients || []);
      } catch (requestError: any) {
        if (requestError?.response?.status === 403) {
          setError("Authorization error: You do not have permission to view patients for this clinic. Please verify you are logged in as a Doctor.");
        } else {
          setPatients([]);
          setError(getApiErrorMessage(requestError, "Unable to load patients."));
        }
      } finally {
        setLoading(false);
      }
    } else { setPatients([]); setLoading(false); }
  }, [selectedClinic, debouncedSearch]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timeout);
  }, [search]);

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
