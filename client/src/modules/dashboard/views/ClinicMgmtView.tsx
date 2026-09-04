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
export function ClinicMgmtView({ selectedClinic }: { selectedClinic?: any }) {
  const [tab, setTab] = useState("profile");
  const [clinicData, setClinicData] = useState<any>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const clinicId = selectedClinic?.id || "0";

  const fetchClinicDetails = useCallback(async () => {
    if (clinicId && clinicId !== "0") {
      try {
        const [res, staffRes] = await Promise.all([
          clinicsApi.getById(clinicId),
          clinicsApi.getStaff(clinicId),
        ]);
        setClinicData(res.data?.clinic || {});
        setStaff(staffRes.data?.staff || []);
        if (res.data?.schedules) {
          setSchedules(res.data.schedules);
        }
      } catch (requestError) { alert(getApiErrorMessage(requestError, "Unable to load clinic settings.")); }
    }
  }, [clinicId]);

  useEffect(() => {
    fetchClinicDetails();
  }, [fetchClinicDetails]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await clinicsApi.update(clinicId, clinicData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (requestError) { alert(getApiErrorMessage(requestError, "Unable to save clinic settings.")); } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedules = async () => {
    setSaving(true);
    try {
      await clinicsApi.updateSchedules(clinicId, schedules);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (requestError) { alert(getApiErrorMessage(requestError, "Unable to save operating hours.")); } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    setSaving(true);
    try {
      const response = await clinicsApi.updateBranding(clinicId, {
        logo_url: clinicData?.logo_url || null,
        banner_url: clinicData?.banner_url || null,
      });
      setClinicData(response.data?.clinic || clinicData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveStaff = async (userId: string) => {
    if (confirm("Remove this staff member from the clinic?")) {
      try {
        await clinicsApi.removeStaff(clinicId, userId);
        fetchClinicDetails();
      } catch (requestError) { alert(getApiErrorMessage(requestError, "Unable to remove this staff member.")); }
    }
  };

  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <div className="p-8">
      <div className="flex gap-1 mb-8 border-b border-gray-100">
        {["profile", "hours", "staff", "plan", "branding", "policies"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-medium capitalize transition-all border-b-2 ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            {t === "hours" ? "Operating Hours" : t === "plan" ? "Plan & Limits" : t}
          </button>
        ))}
      </div>

      {saveSuccess && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check size={14} /> Changes saved successfully to database!
        </div>
      )}

      {tab === "profile" && clinicData && (
        <div className="max-w-2xl space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Clinic Information</h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Clinic Name</label>
                <input
                  value={clinicData.name || ""}
                  onChange={e => setClinicData({ ...clinicData, name: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">City</label>
                  <input
                    value={clinicData.city || ""}
                    onChange={e => setClinicData({ ...clinicData, city: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Timezone</label>
                  <input
                    value={clinicData.timezone || "UTC"}
                    onChange={e => setClinicData({ ...clinicData, timezone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label>
                  <input
                    value={clinicData.phone || ""}
                    onChange={e => setClinicData({ ...clinicData, phone: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                  <input
                    value={clinicData.email || ""}
                    onChange={e => setClinicData({ ...clinicData, email: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Address</label>
                <input
                  value={clinicData.address || ""}
                  onChange={e => setClinicData({ ...clinicData, address: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">About the Clinic</label>
                <textarea
                  rows={3}
                  value={clinicData.description || ""}
                  onChange={e => setClinicData({ ...clinicData, description: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
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

      {tab === "hours" && (
        <div className="max-w-xl space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-6">Clinic Operating Days & Hours</h3>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => {
                const daySched = schedules.find(s => s.day_of_week === dayIdx) || {
                  day_of_week: dayIdx,
                  start_time: "09:00",
                  end_time: "17:00",
                  is_available: dayIdx !== 0,
                };
                return (
                  <div key={dayIdx} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <span className="w-28 text-xs font-semibold text-slate-700">{DAYS[dayIdx]}</span>
                    <input
                      type="checkbox"
                      checked={Boolean(daySched.is_available)}
                      onChange={e => {
                        const updated = [...schedules];
                        const idx = updated.findIndex(s => s.day_of_week === dayIdx);
                        if (idx >= 0) updated[idx].is_available = e.target.checked ? 1 : 0;
                        else updated.push({ day_of_week: dayIdx, start_time: "09:00", end_time: "17:00", is_available: e.target.checked ? 1 : 0 });
                        setSchedules(updated);
                      }}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    {Boolean(daySched.is_available) ? (
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          type="time"
                          value={daySched.start_time?.substring(0, 5) || "09:00"}
                          onChange={e => {
                            const updated = [...schedules];
                            const idx = updated.findIndex(s => s.day_of_week === dayIdx);
                            if (idx >= 0) updated[idx].start_time = e.target.value;
                            else updated.push({ day_of_week: dayIdx, start_time: e.target.value, end_time: "17:00", is_available: 1 });
                            setSchedules(updated);
                          }}
                          className="px-2 py-1 border border-gray-200 rounded-lg"
                        />
                        <span className="text-slate-400">to</span>
                        <input
                          type="time"
                          value={daySched.end_time?.substring(0, 5) || "17:00"}
                          onChange={e => {
                            const updated = [...schedules];
                            const idx = updated.findIndex(s => s.day_of_week === dayIdx);
                            if (idx >= 0) updated[idx].end_time = e.target.value;
                            else updated.push({ day_of_week: dayIdx, start_time: "09:00", end_time: e.target.value, is_available: 1 });
                            setSchedules(updated);
                          }}
                          className="px-2 py-1 border border-gray-200 rounded-lg"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end pt-4 mt-2">
              <button
                onClick={handleSaveSchedules}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
              >
                {saving ? "Saving..." : "Save Operating Hours"}
              </button>
            </div>
          </Card>
        </div>
      )}

      {tab === "staff" && (
        <div className="max-w-2xl space-y-4">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-semibold text-slate-900">Clinic Staff Members</h3>
                <p className="text-xs text-slate-400">Doctors and clinic assistants with access</p>
              </div>
              <Btn variant="primary" size="sm" onClick={() => setShowAddStaffModal(true)}>
                <Plus size={12} /> Add Staff
              </Btn>
            </div>
            <div className="divide-y divide-gray-50">
              {staff.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No additional staff members added yet</p>
              ) : (
                staff.map((s: any) => (
                  <div key={s.id || s.user_id} className="py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-slate-400">{s.email} · <span className="capitalize font-semibold text-blue-600">{s.role}</span></p>
                    </div>
                    <button
                      onClick={() => handleRemoveStaff(s.user_id || s.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove from clinic"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>

          <AddStaffModal
            open={showAddStaffModal}
            onClose={() => setShowAddStaffModal(false)}
            clinicId={clinicId}
            onSuccess={fetchClinicDetails}
          />
        </div>
      )}

      {tab === "plan" && (
        <ClinicSubscriptionTab clinicId={clinicId} />
      )}

      {tab === "branding" && clinicData && (
        <div className="max-w-2xl space-y-5">
          <Card className="p-6 space-y-5">
            <div>
              <h3 className="font-semibold text-slate-900">Clinic Branding</h3>
              <p className="text-xs text-slate-500 mt-1">Use HTTPS image links or simulated:// references. Binary storage is not enabled.</p>
            </div>
            {[{ key: "logo_url", label: "Logo", ratio: "h-28" }, { key: "banner_url", label: "Banner", ratio: "h-44" }].map(item => (
              <div key={item.key} className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">{item.label} reference</label>
                <div className="flex gap-2">
                  <input
                    value={clinicData[item.key] || ""}
                    onChange={e => setClinicData({ ...clinicData, [item.key]: e.target.value })}
                    placeholder={`https://example.com/${item.label.toLowerCase()}.png`}
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
                  />
                  <button type="button" onClick={() => setClinicData({ ...clinicData, [item.key]: "" })} className="px-3 text-xs font-semibold text-rose-600 border border-rose-200 rounded-xl">Remove</button>
                </div>
                <div className={`${item.ratio} rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center overflow-hidden`}>
                  {clinicData[item.key]?.startsWith('https://') ? <img src={clinicData[item.key]} alt={`${item.label} preview`} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-slate-400">{clinicData[item.key] ? "Simulated reference saved" : `No ${item.label.toLowerCase()} selected`}</span>}
                </div>
              </div>
            ))}
            <div className="flex justify-end"><Btn onClick={handleSaveBranding}>{saving ? "Saving..." : "Save Branding"}</Btn></div>
          </Card>
        </div>
      )}

      {tab === "policies" && (
        <div className="max-w-xl">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 mb-4 capitalize">{tab} Settings</h3>
            <p className="text-xs text-slate-500">Configure clinic {tab} options.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
