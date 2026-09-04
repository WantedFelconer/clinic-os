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
export function ClinicSubscriptionTab({ clinicId }: { clinicId: string }) {
  const [sub, setSub] = useState<any>(null);
  const [limits, setLimits] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [msg, setMsg] = useState("");

  const loadSubData = useCallback(async () => {
    try {
      const [subRes, limRes, plansRes] = await Promise.all([
        subscriptionsApi.getMySubscription(clinicId),
        subscriptionsApi.getLimits(clinicId),
        subscriptionsApi.getPlans(),
      ]);
      if (subRes?.data?.subscription) setSub(subRes.data.subscription);
      if (limRes?.data?.limits) setLimits(limRes.data.limits);
      if (plansRes?.data?.plans) setPlans(plansRes.data.plans);
    } catch (requestError) { setMsg(getApiErrorMessage(requestError, "Unable to load plan and usage data.")); }
    setLoading(false);
  }, [clinicId]);

  useEffect(() => {
    loadSubData();
  }, [loadSubData]);

  const handleSubscribe = async (planId: string) => {
    setSubscribing(true);
    setMsg("");
    try {
      await subscriptionsApi.subscribe(clinicId, planId, "monthly");
      setMsg("Subscription updated successfully! (Simulated payment recorded)");
      setTimeout(() => setMsg(""), 3500);
      loadSubData();
    } catch (err: any) {
      setMsg(err.response?.data?.message || "Failed to update subscription");
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    if (confirm("Are you sure you want to cancel your active clinic subscription?")) {
      try {
        await subscriptionsApi.cancelSubscription(clinicId);
        setMsg("Subscription cancelled");
        setTimeout(() => setMsg(""), 3000);
        loadSubData();
      } catch (requestError) { setMsg(getApiErrorMessage(requestError, "Unable to cancel the subscription.")); }
    }
  };

  const handleRenew = async () => {
    setSubscribing(true);
    try {
      await subscriptionsApi.renewSubscription(clinicId);
      setMsg("Subscription renewed; the new expiration date is active.");
      loadSubData();
    } catch (err: any) {
      setMsg(err.response?.data?.message || "Unable to renew subscription");
    } finally { setSubscribing(false); }
  };

  if (loading) return <div className="p-8 text-xs text-slate-400">Loading plan and usage data...</div>;

  return (
    <div className="max-w-4xl space-y-6">
      {msg && (
        <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check size={14} /> {msg}
        </div>
      )}

      {/* Current Subscription Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Plan</span>
            <h3 className="text-xl font-bold text-slate-900 mt-0.5">{sub?.plan_name || "Starter"}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-xs font-bold rounded-full ${sub?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}`}>
              {sub?.status === 'active' ? 'Active' : 'Inactive'}
            </span>
            {sub && !sub.is_default && sub.status === 'active' && (
              <button onClick={handleCancel} className="text-xs text-red-600 hover:underline ml-2 font-semibold">Cancel Plan</button>
            )}
            {sub && !sub.is_default && (
              <button disabled={subscribing} onClick={handleRenew} className="text-xs text-blue-600 hover:underline ml-2 font-semibold">Renew Plan</button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-gray-100 mb-6">
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Price</p>
            <p className="text-base font-bold text-slate-900">${sub?.price || 0} / mo</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Start Date</p>
            <p className="text-sm font-semibold text-slate-800">{sub?.start_date || "Lifetime"}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-medium">Expiration / Renewal</p>
            <p className="text-sm font-semibold text-slate-800">{sub?.end_date || "Continuous"}</p>
          </div>
        </div>

        {/* Real-time Limits & Usage */}
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Resource Limits & Usage</h4>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Patients</span>
              <span>{limits?.patients?.current || 0} / {limits?.patients?.max ?? "Unlimited"}</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${limits?.patients?.allowed ? 'bg-blue-600' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, (((limits?.patients?.current || 0) / (limits?.patients?.max || 1)) * 100))}%` }}
              />
            </div>
            {!limits?.patients?.allowed && <p className="text-[10px] text-red-600 font-semibold mt-1">Patient limit reached</p>}
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Clinic Staff</span>
              <span>{limits?.staff?.current || 0} / {limits?.staff?.max ?? "Unlimited"}</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${limits?.staff?.allowed ? 'bg-teal-600' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, (((limits?.staff?.current || 0) / (limits?.staff?.max || 1)) * 100))}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-white border border-gray-200 rounded-xl">
            <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1.5">
              <span>Doctors</span>
              <span>{limits?.doctors?.current || 1} / {limits?.doctors?.max ?? 1}</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${limits?.doctors?.allowed ? 'bg-violet-600' : 'bg-red-500'}`}
                style={{ width: `${Math.min(100, (((limits?.doctors?.current || 1) / (limits?.doctors?.max || 1)) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Available Plans Grid */}
      <div>
        <h3 className="text-base font-bold text-slate-900 mb-4">Available Subscription Plans</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((p: any) => {
            const isCurrent = sub?.plan_id === p.id || (sub?.is_default && p.name.includes("Starter"));
            return (
              <Card key={p.id} className={`p-5 flex flex-col justify-between ${isCurrent ? 'border-2 border-blue-600 shadow-md' : 'border border-gray-200'}`}>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-base font-bold text-slate-900">{p.name}</span>
                    {isCurrent && <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">CURRENT</span>}
                  </div>
                  <p className="text-2xl font-extrabold text-slate-900 mb-1">${p.price}<span className="text-xs text-slate-400 font-normal"> / {p.billing_cycle || 'mo'}</span></p>
                  <p className="text-xs text-slate-500 mb-4">{p.description || "Healthcare management plan"}</p>

                  <div className="space-y-2 border-t border-gray-100 pt-3 text-xs text-slate-600 mb-6">
                    <div className="flex items-center gap-2"><Check size={13} className="text-green-600" /> Max {p.max_patients || "Unlimited"} Patients</div>
                    <div className="flex items-center gap-2"><Check size={13} className="text-green-600" /> Max {p.max_doctors || 1} Doctor(s)</div>
                    <div className="flex items-center gap-2"><Check size={13} className="text-green-600" /> Max {p.max_staff || 2} Staff Members</div>
                    {(p.features || []).map((feat: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2"><Check size={13} className="text-blue-600" /> {feat}</div>
                    ))}
                  </div>
                </div>

                <button
                  disabled={isCurrent || subscribing}
                  onClick={() => handleSubscribe(p.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors ${
                    isCurrent
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  }`}
                >
                  {isCurrent ? "Current Plan" : "Subscribe / Upgrade"}
                </button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Admin Panel ─────────────────────────────────────────────────────────────────
