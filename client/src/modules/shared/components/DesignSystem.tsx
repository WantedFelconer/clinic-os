/** Shared, typed visual primitives used by ClinicOS feature modules. */
import React from "react";
import { Calendar, Clock, FileText, Bell, CheckCircle, CreditCard, AlertCircle, X } from "lucide-react";
export const CHART_COLORS = ["#2563EB", "#14B8A6", "#22C55E", "#F59E0B", "#8B5CF6", "#EC4899"];
export const ADMIN_PLAN_FEATURES = [
  ["packages", "Service Packages"], ["messaging", "Secure Direct Messaging"],
  ["advanced_emr", "Advanced EMR"], ["digital_prescriptions", "Digital Prescriptions"],
  ["staff_management", "Staff Management"], ["analytics", "Advanced Analytics"],
  ["financial_reports", "Financial & Revenue Reports"], ["custom_branding", "Custom Branding & Domain"],
] as const;

export const localDateString = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};

export const shiftDate = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return localDateString(value);
};

// ── Design System ──────────────────────────────────────────────────────────────

type BadgeVariant = "default" | "success" | "warning" | "danger" | "teal" | "outline" | "violet" | "amber";

export function Badge({ variant = "default", children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  const variants: Record<BadgeVariant, string> = {
    default: "bg-blue-50 text-blue-700 border border-blue-100",
    success: "bg-green-50 text-green-700 border border-green-100",
    warning: "bg-amber-50 text-amber-700 border border-amber-100",
    danger:  "bg-red-50 text-red-700 border border-red-100",
    teal:    "bg-teal-50 text-teal-700 border border-teal-100",
    outline: "bg-transparent text-slate-500 border border-slate-200",
    violet:  "bg-violet-50 text-violet-700 border border-violet-100",
    amber:   "bg-orange-50 text-orange-700 border border-orange-100",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}>
      {children}
    </span>
  );
}

type BtnVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "white" | "teal";

export function Btn({ variant = "primary", size = "md", children, onClick, className = "", disabled = false }: {
  variant?: BtnVariant; size?: "sm" | "md" | "lg";
  children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean;
}) {
  const base = "inline-flex items-center gap-2 font-medium rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-base" };
  const variants: Record<BtnVariant, string> = {
    primary:   "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    outline:   "border border-slate-200 text-slate-700 hover:bg-slate-50 bg-white",
    ghost:     "text-slate-600 hover:bg-slate-100",
    danger:    "bg-red-600 text-white hover:bg-red-700",
    white:     "bg-white text-blue-600 hover:bg-blue-50 shadow-sm font-semibold",
    teal:      "bg-teal-600 text-white hover:bg-teal-700 shadow-sm",
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}>{children}</div>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest px-3 pt-4 pb-1">{children}</p>;
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 flex-shrink-0 ${checked ? "bg-blue-600" : "bg-slate-200"}`}>
      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

export function ApptBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = { Confirmed: "success", Pending: "warning", Cancelled: "danger", Completed: "teal" };
  return <Badge variant={map[status] ?? "outline"}>{status}</Badge>;
}

export function PatientBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = { Active: "success", Inactive: "outline", New: "violet" };
  return <Badge variant={map[status] ?? "outline"}>{status}</Badge>;
}

export function InvoiceBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = { Paid: "success", Pending: "warning", Overdue: "danger" };
  return <Badge variant={map[status] ?? "outline"}>{status}</Badge>;
}

export function ClinicStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = { Verified: "success", Pending: "warning", Suspended: "danger" };
  return <Badge variant={map[status] ?? "outline"}>{status}</Badge>;
}

export function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, BadgeVariant> = { Starter: "outline", Pro: "default", Enterprise: "violet" };
  return <Badge variant={map[plan] ?? "outline"}>{plan}</Badge>;
}

export function NotifIcon({ type }: { type: string }) {
  const map: Record<string, { Icon: React.FC<{ size?: number; className?: string }>; bg: string; text: string }> = {
    appointment: { Icon: Calendar,     bg: "bg-blue-50",   text: "text-blue-600" },
    payment:     { Icon: DollarSign,   bg: "bg-green-50",  text: "text-green-600" },
    message:     { Icon: MessageSquare,bg: "bg-violet-50", text: "text-violet-600" },
    review:      { Icon: Star,         bg: "bg-amber-50",  text: "text-amber-600" },
    system:      { Icon: Bell,         bg: "bg-slate-100", text: "text-slate-500" },
  };
  const cfg = map[type] ?? map["system"];
  return (
    <div className={`w-9 h-9 rounded-xl ${cfg.bg} ${cfg.text} flex items-center justify-center flex-shrink-0`}>
      <cfg.Icon size={15} />
    </div>
  );
}

// ── Landing Page ───────────────────────────────────────────────────────────────
