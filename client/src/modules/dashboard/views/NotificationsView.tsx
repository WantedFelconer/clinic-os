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
export function NotificationsView({ selectedClinic }: { selectedClinic?: any }) {
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
