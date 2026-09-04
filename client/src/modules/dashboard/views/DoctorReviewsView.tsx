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
export function DoctorReviewsView() {
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
