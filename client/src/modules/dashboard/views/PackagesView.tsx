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
export function PackagesView({ selectedClinic }: { selectedClinic?: any }) {
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
