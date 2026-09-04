/** Domain module extracted from the ClinicOS application coordinator. */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  authApi, patientApi, setAuthToken, getStoredUser, getStoredToken, isAuthenticated,
  clinicsApi, appointmentsApi, patientsApi, medicalRecordsApi,
  prescriptionsApi, paymentsApi, reviewsApi, subscriptionsApi, adminApi, messagesApi, doctorsApi, getApiErrorMessage,
} from "../../app/api";
import {
  BookAppointmentModal, RescheduleModal, CancelAppointmentModal,
  CreateEMRModal, CreatePrescriptionModal, ViewPrescriptionModal, ViewMedicalRecordModal,
  CreateServiceModal, EditServiceModal, CreatePackageModal,
  AddPatientModal, CreateInvoiceModal, PayInvoiceModal, SubmitReviewModal,
  SendMessageModal, AddStaffModal, UploadMedicalReportModal,
} from "../modals";
import { PrescriptionDocument } from "../prescriptions/components/PrescriptionDocument";
import { generatePrescriptionPdf } from "../prescriptions/prescriptionPdf";
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
import { Badge, Btn, Card, SectionLabel, Toggle, ApptBadge, PatientBadge, InvoiceBadge, ClinicStatusBadge, PlanBadge, NotifIcon, CHART_COLORS, ADMIN_PLAN_FEATURES, localDateString, shiftDate } from "../shared/components/DesignSystem";
export function AuthPage({ onSuccess, onBack, notice }: { onSuccess: (token: string, user: any) => void; onBack: () => void; notice?: string }) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "verify">("login");
  const [role, setRole] = useState<"doctor" | "patient" | "admin">("doctor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(notice || "");
  const [submitting, setSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [first_name, setFirstName] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(v => v - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split("");
      setOtp(digits);
      otpRefs.current[5]?.focus();
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowLeft" && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < 5) {
      otpRefs.current[idx + 1]?.focus();
    }
  };

  const handleVerify = async () => {
    setError("");
    setResendSuccess(false);
    setSubmitting(true);
    try {
      const code = otp.join("");
      if (code.length !== 6) {
        setError("Please enter the full 6-digit code");
        setSubmitting(false);
        return;
      }
      await authApi.verifyOTP(email, code);
      setVerified(true);
      setTimeout(() => {
        setMode("login");
        setVerified(false);
        setOtp(["", "", "", "", "", ""]);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    setResendSuccess(false);
    try {
      await authApi.resendOTP(email);
      setResendCooldown(60);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    }
  };

  const handleAuth = async () => {
    setError("");
    setSubmitting(true);
    try {
      if (mode === "login") {
        const { data } = await authApi.login({ email, password });
        if (role === "doctor" && !["doctor", "assistant"].includes(data.user.role)) {
          return setError(`This account is a ${data.user.role}. Switch to the Patient tab.`);
        }
        if (role === "patient" && data.user.role !== "patient") {
          return setError(`This account is a ${data.user.role}. Switch to the Doctor tab.`);
        }
        if (role === "admin" && data.user.role !== "admin") {
          return setError("This account does not have platform administrator access.");
        }
        onSuccess(data.token, data.user);
      } else if (mode === "register") {
        const nameParts = name.trim().split(/\s+/);
        const fn = nameParts[0] || "";
        const ln = nameParts.slice(1).join(" ") || "";
        setFirstName(fn);
        const res = await authApi.register({ email, password, role, first_name: fn, last_name: ln });
        if (res.data?.dev_otp) {
          const digits = String(res.data.dev_otp).split("");
          if (digits.length === 6) setOtp(digits);
        }
        setMode("verify");
      } else {
        await authApi.forgotPassword(email);
        setSent(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const renderSidebar = () => (
    <div className="hidden lg:flex flex-col w-[480px] bg-blue-600 p-12 text-white flex-shrink-0">
      <div className="flex items-center gap-2 mb-auto">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center"><Stethoscope size={15} className="text-white" /></div>
        <span className="font-bold text-lg">ClinicOS</span>
      </div>
      <div className="py-16">
        <h2 className="text-4xl font-extrabold mb-6 leading-tight">Your clinic,<br />fully digital.</h2>
        <p className="text-blue-200 text-lg mb-10">Manage appointments, medical records, digital prescriptions, and billing in one unified platform.</p>
        <div className="space-y-4">
          {[{ Icon: Calendar, text: "Smart appointment scheduling" }, { Icon: FileText, text: "Digital records & prescriptions" }, { Icon: BarChart3, text: "Real-time revenue analytics" }].map(item => (
            <div key={item.text} className="flex items-center gap-3 text-sm text-blue-100">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0"><item.Icon size={14} /></div>
              {item.text}
            </div>
          ))}
        </div>
      </div>
      <p className="text-blue-300 text-sm">Security-focused clinical operating system</p>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {renderSidebar()}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <button onClick={mode === "verify" ? () => setMode("register") : onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-8 transition-colors">
            <ChevronRight size={13} className="rotate-180" /> {mode === "verify" ? "Back" : "Back to home"}
          </button>

          <Card className="p-8">
            {verified && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2.5 mb-4">
                <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                <p className="text-sm text-green-700 font-medium">Email verified! You can now sign in.</p>
              </div>
            )}

            {mode === "verify" && (
              <>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-5"><Heart size={20} className="text-blue-600" /></div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Verify your email</h1>
                <p className="text-slate-500 text-sm mb-1">Enter the 6-digit verification code sent to</p>
                <p className="text-sm font-semibold text-slate-900 mb-6">{email}</p>
                
                {resendSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2.5 mb-4">
                    <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
                    <p className="text-sm text-green-700 font-medium">A new verification code has been sent.</p>
                  </div>
                )}

                <div className="flex gap-2 justify-center mb-6">
                  {otp.map((d, i) => (
                    <input key={i} ref={el => otpRefs.current[i] = el} type="text" inputMode="numeric" maxLength={1} value={d} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)} onPaste={handleOtpPaste} autoFocus={i === 0}
                      className="w-11 h-12 text-center text-lg font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                  ))}
                </div>
                <button onClick={handleVerify} disabled={submitting || otp.join("").length !== 6} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {submitting ? "Verifying..." : "Verify Email"}
                </button>
                <div className="text-center mt-4">
                  <button onClick={handleResend} disabled={resendCooldown > 0} className="text-sm text-blue-600 font-medium hover:text-blue-700 disabled:text-slate-400 disabled:cursor-not-allowed">
                    {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5 mt-4">
                  <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>}
              </>
            )}

            {mode === "forgot" && (
              <>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-5"><Lock size={20} className="text-blue-600" /></div>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">Reset password</h1>
                <p className="text-slate-500 text-sm mb-8">Enter your email and we will send you a reset link.</p>
                {sent ? (
                  <div className="text-center py-4">
                    <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-900 mb-1">Check your email</p>
                    <p className="text-sm text-slate-500">Reset link sent to {email || "your email"}</p>
                    <button onClick={() => { setSent(false); setMode("login"); }} className="mt-6 text-sm text-blue-600 font-medium hover:text-blue-700">Back to sign in</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="doctor@clinic.com" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <button onClick={handleAuth} disabled={submitting} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">{submitting ? "Sending..." : "Send Reset Link"}</button>
                    <button onClick={() => setMode("login")} className="w-full text-center text-sm text-slate-500 hover:text-slate-700 transition-colors">Back to sign in</button>
                  </div>
                )}
              </>
            )}

            {(mode === "login" || mode === "register") && (
              <>
                <h1 className="text-2xl font-bold text-slate-900 mb-1">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
                <p className="text-slate-500 text-sm mb-6">{mode === "login" ? "Sign in to your ClinicOS account" : "Start your 14-day free trial — no card needed"}</p>
                <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
                  {(mode === "login" ? (["doctor", "patient", "admin"] as const) : (["doctor", "patient"] as const)).map(r => (
                    <button key={r} onClick={() => setRole(r)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${role === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                      {r === "doctor" ? "Doctor" : r === "patient" ? "Patient" : "Admin"}
                    </button>
                  ))}
                </div>
                <div className="space-y-4">
                  {mode === "register" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{role === "doctor" ? "Full Name" : "Your Name"}</label>
                      <input value={name} onChange={e => setName(e.target.value)} placeholder={role === "doctor" ? "Dr. Jane Smith" : "Jane Smith"} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={role === "doctor" ? "doctor@clinic.com" : "patient@email.com"} className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-600">Password</label>
                      {mode === "login" && <button onClick={() => setMode("forgot")} className="text-xs text-blue-600 hover:text-blue-700">Forgot?</button>}
                    </div>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                    <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>}
                  <button onClick={handleAuth} disabled={submitting} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {submitting ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
                  </button>
                </div>
                <p className="text-center text-sm text-slate-500 mt-6">
                  {mode === "login"
                      ? role === "admin" ? <>Administrator accounts are provisioned by the platform.</> : <>Don&apos;t have an account? <button onClick={() => { setRole(role === "patient" ? "patient" : "doctor"); setMode("register"); }} className="text-blue-600 font-medium hover:text-blue-700">Sign up free</button></>
                    : <>Already have an account? <button onClick={() => setMode("login")} className="text-blue-600 font-medium hover:text-blue-700">Sign in</button></>}
                </p>
              </>
            )}
          </Card>
          <p className="text-center text-xs text-slate-400 mt-6">By continuing you agree to our <a href="#" className="underline">Terms</a> and <a href="#" className="underline">Privacy Policy</a></p>
        </div>
      </div>
    </div>
  );
}

// ── Reset Password Page ────────────────────────────────────────────────────────

export function ResetPasswordPage({ onBackToLogin }: { onBackToLogin: () => void }) {
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
    else setError("Invalid or missing reset token");
  }, []);

  const handleReset = async () => {
    setError("");
    if (newPassword.length < 6) {
      return setError("Password must be at least 6 characters");
    }
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match");
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Password reset failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="p-8">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-slate-900 mb-2">Password reset successful</h1>
              <p className="text-sm text-slate-500 mb-6">You can now sign in with your new password.</p>
              <button onClick={onBackToLogin} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">Sign In</button>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-5"><Lock size={20} className="text-blue-600" /></div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">Reset password</h1>
              <p className="text-slate-500 text-sm mb-8">Enter your new password.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">New Password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>}
                <button onClick={handleReset} disabled={submitting || !token} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {submitting ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
// ── Doctor Dashboard ─────────────────────────────────────────────────────────────
