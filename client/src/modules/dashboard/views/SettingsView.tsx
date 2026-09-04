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
export function SettingsView({ selectedClinic }: { selectedClinic?: any }) {
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
