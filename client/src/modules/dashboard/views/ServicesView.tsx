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
export function ServicesView({ selectedClinic }: { selectedClinic?: any }) {
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
