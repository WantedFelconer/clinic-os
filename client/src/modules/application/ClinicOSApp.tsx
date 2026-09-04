/** Root ClinicOS route and authenticated-session coordinator. */
import { useState, useEffect, useCallback } from "react";
import { authApi, setAuthToken, getStoredUser, getStoredToken, isAuthenticated, clinicsApi, getApiErrorMessage } from "../../app/api";
import { LandingPage } from "../landing/LandingPage";
import { AuthPage, ResetPasswordPage } from "../auth/AuthPage";
import { DashboardLayout } from "../dashboard/DoctorDashboard";
import { PatientPortal } from "../patient/PatientPortal";
import { AdminPanel } from "../admin/AdminPanel";
export default function App() {
  const [page, setPage] = useState<"landing" | "auth" | "dashboard" | "patient-portal" | "admin" | "reset-password">("landing");
  const [section, setSection] = useState("overview");
  const [user, setUser] = useState(getStoredUser());
  const [clinics, setClinics] = useState<any[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState("");
  const [clinicError, setClinicError] = useState("");

  const fetchClinics = useCallback(async () => {
    setClinicError("");
    try {
      const { data } = await clinicsApi.getMyClinics();
      const accessible = data.clinics || data || [];
      const currentUser = getStoredUser();
      const storageKey = `clinic_os_selected_clinic_id_${currentUser?.id || "anonymous"}`;
      const active = accessible.filter((clinic: any) => Boolean(clinic.is_active));
      setClinics(accessible);
      const storedId = localStorage.getItem(storageKey);
      const found = active.find((c: any) => c.id === storedId);
      if (found) setSelectedClinic(found);
      else if (active.length) {
        setSelectedClinic(active[0]);
        localStorage.setItem(storageKey, active[0].id);
      } else {
        setSelectedClinic(null);
        localStorage.removeItem(storageKey);
      }
    } catch (requestError) {
      setClinicError(getApiErrorMessage(requestError, "Unable to refresh clinic workspaces."));
    }
  }, []);

  const handleSwitchClinic = useCallback((clinic: any) => {
    const authorized = clinics.find((candidate: any) => candidate.id === clinic?.id && candidate.is_active);
    if (!authorized) return;
    setSection("overview");
    setSelectedClinic(authorized);
    localStorage.setItem(`clinic_os_selected_clinic_id_${user?.id || "anonymous"}`, authorized.id);
  }, [clinics, user?.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("token")) {
      setPage("reset-password");
      setLoading(false);
      return;
    }
    if (isAuthenticated() && getStoredUser()) {
      const saved = getStoredUser();
      setUser(saved);
      if (saved.role !== "patient" && saved.role !== "admin") fetchClinics();
      if (saved.role === "patient") setPage("patient-portal");
      else if (saved.role === "admin") setPage("admin");
      else setPage("dashboard");
    }
    setLoading(false);
  }, [fetchClinics, user?.id]);

  useEffect(() => {
    const expire = () => {
      Object.keys(localStorage).filter(key => key.startsWith('clinic_os_')).forEach(key => localStorage.removeItem(key));
      setUser(null);
      setClinics([]);
      setSelectedClinic(null);
      setSection('overview');
      setSessionNotice('Your session expired. Please sign in again.');
      setPage('auth');
    };
    window.addEventListener('auth:expired', expire);
    return () => window.removeEventListener('auth:expired', expire);
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "clinic_os_user" || e.key === "clinic_os_token") {
        const updatedUser = getStoredUser();
        if (updatedUser?.role !== user?.role) window.location.reload();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [user?.role]);

  const handleLoginSuccess = useCallback((token: string, userData: any) => {
    setAuthToken(token, userData);
    setUser(userData);
    if (userData.role === "patient") setPage("patient-portal");
    else if (userData.role === "admin") setPage("admin");
    else {
      fetchClinics();
      setPage("dashboard");
    }
  }, [fetchClinics]);

  const handleCreateClinic = useCallback(async (data: any) => {
    const res = await clinicsApi.create(data);
    await fetchClinics();
    const newClinic = res.data?.clinic || res.data;
    if (newClinic?.id) {
      setSelectedClinic(newClinic);
      localStorage.setItem(`clinic_os_selected_clinic_id_${user?.id || "anonymous"}`, newClinic.id);
    }
    return res;
  }, [fetchClinics]);

  const handleLogout = useCallback(() => {
    setAuthToken(null, null);
    setUser(null);
    setClinics([]);
    setSelectedClinic(null);
    Object.keys(localStorage).filter(key => key.startsWith("clinic_os_selected_clinic_id_")).forEach(key => localStorage.removeItem(key));
    setPage("landing");
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (page === "auth")           return <AuthPage notice={sessionNotice} onSuccess={(token, data) => { setSessionNotice(''); handleLoginSuccess(token, data); }} onBack={() => setPage("landing")} />;
  if (page === "dashboard")      return <><DashboardLayout section={section} setSection={setSection} onLogout={handleLogout} user={user} clinics={clinics} selectedClinic={selectedClinic} onSwitchClinic={handleSwitchClinic} onCreateClinic={handleCreateClinic} />{clinicError && <div role="alert" className="fixed bottom-5 right-5 z-[150] max-w-sm rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-700 shadow-xl">{clinicError}<button type="button" onClick={fetchClinics} className="ml-3 font-semibold text-blue-700">Retry</button></div>}</>;
  if (page === "patient-portal") return <PatientPortal onBack={() => setPage("landing")} onLogout={handleLogout} />;
  if (page === "admin" && user?.role === "admin") return <AdminPanel onBack={() => setPage("landing")} onLogout={handleLogout} user={user} />;
  if (page === "reset-password") return <ResetPasswordPage onBackToLogin={() => setPage("auth")} />;
  return (
    <LandingPage
      onLogin={() => setPage("auth")}
      onStart={() => setPage("auth")}
      onPatientPortal={() => setPage("auth")}
      onAdmin={() => setPage("auth")}
    />
  );
}
