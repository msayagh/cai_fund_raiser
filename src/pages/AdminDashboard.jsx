// ─── Admin Dashboard ───────────────────────────────────────────────────────────
// Provides admin login and a tabbed management interface.
// Tabs: Overview · Donors · Requests · Admins · Logs
//
// Props:
//   navigate    (fn)     — global page navigate function
//   language    (string) — current language code
//   setLanguage (fn)     — update language
//   donors      (array)  — donor list (App state)
//   setDonors   (fn)     — update donor list
//   admins      (array)  — admin list (App state)
//   setAdmins   (fn)     — add/update admins
//   requests    (array)  — help requests (App state)
//   setRequests (fn)     — update requests
//   addLog      (fn)     — add activity log entry
//   logs        (array)  — activity log entries

import React, { useState, useMemo, useEffect } from "react";
import { tryAutoLogin, clearTokens } from '../api/client.js';
import * as authApi from '../api/auth.js';
import * as adminApi from '../api/admin.js';
import { PORTAL_T } from "../i18n/portalTranslations";
import GoogleSignInButton from "../components/GoogleSignInButton";

// ─── Font scale ───────────────────────────────────────────────────────────────
const F = { xs: "13px", sm: "14px", base: "16px", md: "17px", lg: "19px", xl: "23px", xxl: "27px" };

// ─── Style tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      "#090c18",
  surface: "#131628",
  surface2:"#0e1020",
  border:  "#2e3250",
  gold:    "#D4A96E",
  text:    "#f0e8d8",
  muted:   "#c0c0d8",
  danger:  "#e06060",
  green:   "#7EB8A0",
  blue:    "#8AAED4",
};

const inputStyle = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: "8px",
  border: `1px solid ${C.border}`,
  background: C.surface2,
  color: C.text,
  fontSize: F.sm,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const primaryBtn = (disabled = false, color = C.gold) => ({
  padding: "11px 20px",
  borderRadius: "8px",
  border: "none",
  background: disabled ? C.border : color,
  color: disabled ? "#888899" : "#000",
  fontSize: F.xs,
  fontWeight: 800,
  cursor: disabled ? "not-allowed" : "pointer",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  fontFamily: "'Cinzel', serif",
  transition: "opacity 0.18s",
  whiteSpace: "nowrap",
});

const labelStyle = {
  display: "block",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: C.muted,
  marginBottom: "6px",
};

// ─── Error box ────────────────────────────────────────────────────────────────
function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      background: "rgba(224,96,96,0.12)",
      border: `1px solid ${C.danger}`,
      borderRadius: "8px",
      padding: "10px 14px",
      fontSize: F.xs,
      color: C.danger,
      marginBottom: "14px",
    }}>
      {msg}
    </div>
  );
}

// ─── Mini circular progress ───────────────────────────────────────────────────
function MiniProgress({ pct, color }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r={r} fill="none" stroke={C.border} strokeWidth="4" />
      <circle cx="18" cy="18" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 18 18)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="18" y="22" textAnchor="middle" fill={C.text} fontSize="9" fontWeight="700" fontFamily="sans-serif">
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      flex: "1 1 140px",
      background: C.surface2,
      border: `1px solid ${C.border}`,
      borderRadius: "12px",
      padding: "18px 20px",
    }}>
      <div style={{ fontSize: F.xl, marginBottom: "6px" }}>{icon}</div>
      <div style={{ fontSize: F.xxl, fontWeight: 800, color: color || C.gold, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "12px", color: C.muted, marginTop: "4px", letterSpacing: "0.04em" }}>{label}</div>
      {sub && <div style={{ fontSize: "11px", color: C.muted, marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(9,12,24,0.87)",
        zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: "14px",
        width: "100%",
        maxWidth: "520px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        maxHeight: "90vh",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px",
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: "'Cinzel', serif",
            fontSize: F.base, fontWeight: 700,
            color: C.gold, letterSpacing: "0.06em",
          }}>
            {title}
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none",
            color: C.muted, fontSize: F.lg,
            cursor: "pointer", lineHeight: 1, padding: "2px 6px",
          }}>×</button>
        </div>
        {/* Body */}
        <div style={{ padding: "22px", overflowY: "auto", flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Donor status helper ───────────────────────────────────────────────────────
function getDonorStatus(donor) {
  // paidAmount is computed by the backend's listDonors endpoint
  const paid = donor.paidAmount ?? (donor.payments || []).reduce((s, p) => s + p.amount, 0);
  const total = donor.engagement?.totalPledge || 0;
  const pct = total > 0 ? (paid / total) * 100 : 0;
  const endDate = donor.engagement?.endDate;
  const daysLeft = endDate ? Math.ceil((new Date(endDate) - new Date()) / (1000 * 60 * 60 * 24)) : null;
  const isComplete = total > 0 && paid >= total;
  const isOverdue = daysLeft !== null && daysLeft < 0 && !isComplete;
  return { paid, total, pct, daysLeft, isComplete, isOverdue };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AdminDashboard({ navigate, language, setLanguage }) {
  const t = PORTAL_T[language] || PORTAL_T.en;
  const isRTL = language === "ar";
  const googleSignInEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [currentAdmin, setCurrentAdmin]     = useState(null);
  const [loginEmail, setLoginEmail]         = useState("");
  const [loginPassword, setLoginPassword]   = useState("");
  const [loginError, setLoginError]         = useState("");
  const [googleSigningIn, setGoogleSigningIn] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [adminForgotStep, setAdminForgotStep]       = useState(1);
  const [adminForgotEmail, setAdminForgotEmail]     = useState("");
  const [adminForgotOtp, setAdminForgotOtp]         = useState("");
  const [adminForgotOtpSent, setAdminForgotOtpSent] = useState(false);
  const [adminForgotLoading, setAdminForgotLoading] = useState(false);
  const [adminForgotNewPwd, setAdminForgotNewPwd]   = useState("");
  const [adminForgotConfirm, setAdminForgotConfirm] = useState("");
  const [adminForgotError, setAdminForgotError]     = useState("");

  const [autoLogging, setAutoLogging]   = useState(true);
  const [donors, setDonors]             = useState([]);
  const [admins, setAdmins]             = useState([]);
  const [requests, setRequests]         = useState([]);
  const [logs, setLogs]                 = useState([]);
  const [stats, setStats]               = useState({ totalDonors: 0, totalRaised: 0, activeEngagements: 0, pendingRequests: 0 });
  const [dataLoading, setDataLoading]   = useState(false);

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("overview");

  // ── Add admin form ────────────────────────────────────────────────────────
  const [newAdminName, setNewAdminName]         = useState("");
  const [newAdminEmail, setNewAdminEmail]       = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [addAdminSuccess, setAddAdminSuccess]   = useState(false);
  const [addAdminError, setAddAdminError]       = useState("");

  // ── Donors: search & sort ─────────────────────────────────────────────────
  const [donorSearch, setDonorSearch] = useState("");
  const [donorSort, setDonorSort]     = useState({ col: null, dir: null });

  // ── Donors: remove confirmation ───────────────────────────────────────────
  const [removeDonorTarget, setRemoveDonorTarget] = useState(null);

  // ── Donors: reset password modal ──────────────────────────────────────────
  const [resetPwdDonor, setResetPwdDonor]       = useState(null);
  const [resetPwdNew, setResetPwdNew]           = useState("");
  const [resetPwdConfirm, setResetPwdConfirm]   = useState("");
  const [resetPwdError, setResetPwdError]       = useState("");
  const [resetPwdSuccess, setResetPwdSuccess]   = useState(false);

  // ── Admins: edit modal ────────────────────────────────────────────────────
  const [editAdminTarget, setEditAdminTarget]   = useState(null);
  const [editAdminName, setEditAdminName]       = useState("");
  const [editAdminEmail, setEditAdminEmail]     = useState("");
  const [editAdminPwd, setEditAdminPwd]         = useState("");
  const [editAdminError, setEditAdminError]     = useState("");
  const [editAdminSuccess, setEditAdminSuccess] = useState(false);

  // ── Requests: account_creation modal ─────────────────────────────────────
  const [acctModal, setAcctModal]     = useState(null);
  const [acctName, setAcctName]       = useState("");
  const [acctEmail, setAcctEmail]     = useState("");
  const [acctPassword, setAcctPassword] = useState("");
  const [acctPledge, setAcctPledge]   = useState("");
  const [acctError, setAcctError]     = useState("");
  const [acctSuccess, setAcctSuccess] = useState(false);

  // ── Requests: payment_upload modal ───────────────────────────────────────
  const [payModal, setPayModal]     = useState(null);
  const [payAmount, setPayAmount]   = useState("");
  const [payDate, setPayDate]       = useState(new Date().toISOString().split("T")[0]);
  const [payMethod, setPayMethod]   = useState("zeffy");
  const [payError, setPayError]     = useState("");
  const [paySuccess, setPaySuccess] = useState(false);

  // ── Logs: filters ────────────────────────────────────────────────────────
  const [logDonorFilter, setLogDonorFilter] = useState("");
  const [logTypeFilter, setLogTypeFilter]   = useState("");
  const [logDateFrom, setLogDateFrom]       = useState("");
  const [logDateTo, setLogDateTo]           = useState("");

  // ── Filtered & sorted donors ──────────────────────────────────────────────
  const filteredDonors = useMemo(() => {
    let list = [...donors];
    if (donorSearch.trim()) {
      const q = donorSearch.trim().toLowerCase();
      list = list.filter(
        (d) => d.name.toLowerCase().includes(q) || d.email.toLowerCase().includes(q)
      );
    }
    if (donorSort.col && donorSort.dir) {
      list.sort((a, b) => {
        const aS = getDonorStatus(a);
        const bS = getDonorStatus(b);
        let av, bv;
        switch (donorSort.col) {
          case "name":     av = a.name.toLowerCase();  bv = b.name.toLowerCase();  break;
          case "pledge":   av = aS.total;              bv = bS.total;              break;
          case "paid":     av = aS.paid;               bv = bS.paid;               break;
          case "progress": av = aS.pct;                bv = bS.pct;                break;
          case "due":      av = a.engagement.endDate;  bv = b.engagement.endDate;  break;
          case "status":
            av = aS.isComplete ? 2 : aS.isOverdue ? 0 : 1;
            bv = bS.isComplete ? 2 : bS.isOverdue ? 0 : 1;
            break;
          default: return 0;
        }
        if (av < bv) return donorSort.dir === "asc" ? -1 : 1;
        if (av > bv) return donorSort.dir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [donors, donorSearch, donorSort]);

  // ── Filtered logs (newest first) ─────────────────────────────────────────
  const logActionTypes = useMemo(() => [...new Set(logs.map(l => l.action))].sort(), [logs]);

  const filteredLogs = useMemo(() => {
    let list = logs;
    if (logDonorFilter) list = list.filter(l => l.donorId === logDonorFilter);
    if (logTypeFilter)  list = list.filter(l => l.action === logTypeFilter);
    if (logDateFrom)    list = list.filter(l => l.timestamp && l.timestamp.slice(0,10) >= logDateFrom);
    if (logDateTo)      list = list.filter(l => l.timestamp && l.timestamp.slice(0,10) <= logDateTo);
    return list;
  }, [logs, logDonorFilter, logTypeFilter, logDateFrom, logDateTo]);

  // ── Load all data from API ────────────────────────────────────────────────
  const loadAllData = async () => {
    setDataLoading(true);
    try {
      const [statsData, donorsData, requestsData, adminsData, logsData] = await Promise.all([
        adminApi.getStats(),
        adminApi.listDonors({ limit: 100 }),
        adminApi.listRequests({ limit: 100 }),
        adminApi.listAdmins(),
        adminApi.getLogs({ limit: 200 }),
      ]);
      setStats(statsData);
      setDonors(donorsData.items ?? []);
      setRequests(requestsData.items ?? []);
      setAdmins(adminsData);
      setLogs(logsData.items ?? []);
    } catch (err) { console.error('Load data error:', err); }
    finally { setDataLoading(false); }
  };

  // ── Auto-login on mount ───────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const result = await tryAutoLogin();
        if (result) {
          const statsData = await adminApi.getStats();
          const storedAdmin = JSON.parse(localStorage.getItem('mosque_admin') || 'null');
          if (storedAdmin) {
            setCurrentAdmin(storedAdmin);
            setStats(statsData);
            await loadAllData();
            setActiveTab('overview');
          } else { clearTokens(); }
        }
      } catch { clearTokens(); }
      finally { setAutoLogging(false); }
    })();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  async function completeAdminSignIn(admin) {
    localStorage.setItem('mosque_admin', JSON.stringify({ id: admin.id, name: admin.name, email: admin.email }));
    setCurrentAdmin(admin);
    await loadAllData();
    setActiveTab('overview');
  }

  async function handleLogin(e) {
    e.preventDefault(); setLoginError('');
    try {
      const admin = await authApi.adminLogin(loginEmail.trim(), loginPassword);
      await completeAdminSignIn(admin);
    } catch (err) { setLoginError(err.message || t.invalidCredentials); }
    setLoginEmail(''); setLoginPassword('');
  }

  async function handleGoogleLogin(credential) {
    setLoginError('');
    setGoogleSigningIn(true);
    try {
      const admin = await authApi.adminGoogleLogin(credential);
      await completeAdminSignIn(admin);
      setLoginEmail('');
      setLoginPassword('');
    } catch (err) {
      setLoginError(err.message || "Google sign-in failed.");
    } finally {
      setGoogleSigningIn(false);
    }
  }

  function resetAdminForgotState() {
    setAdminForgotStep(1);
    setAdminForgotEmail('');
    setAdminForgotOtp('');
    setAdminForgotOtpSent(false);
    setAdminForgotLoading(false);
    setAdminForgotNewPwd('');
    setAdminForgotConfirm('');
    setAdminForgotError('');
  }

  async function handleAdminForgotSendOtp(e) {
    e.preventDefault();
    setAdminForgotError('');
    setAdminForgotLoading(true);
    try {
      await authApi.adminForgotSendOtp(adminForgotEmail.trim());
      setAdminForgotOtpSent(true);
    } catch (err) {
      setAdminForgotError(err.message || 'Failed to send reset code.');
    } finally {
      setAdminForgotLoading(false);
    }
  }

  async function handleAdminForgotVerifyOtp() {
    setAdminForgotError('');
    try {
      await authApi.adminForgotVerifyOtp(adminForgotEmail.trim(), adminForgotOtp.trim());
      setAdminForgotStep(3);
    } catch (err) {
      setAdminForgotError(err.message || 'Failed to verify code.');
    }
  }

  async function handleAdminForgotSetPassword(e) {
    e.preventDefault();
    setAdminForgotError('');
    if (adminForgotNewPwd !== adminForgotConfirm) {
      setAdminForgotError(t.passwordsNoMatch);
      return;
    }
    try {
      await authApi.adminForgotReset(adminForgotEmail.trim(), adminForgotOtp.trim(), adminForgotNewPwd);
      setAdminForgotStep(4);
    } catch (err) {
      setAdminForgotError(err.message || 'Failed to reset password.');
    }
  }

  async function handleSignOut() {
    await authApi.logout();
    localStorage.removeItem('mosque_admin');
    setCurrentAdmin(null);
    setDonors([]); setRequests([]); setAdmins([]); setLogs([]); setStats({});
    setLoginEmail(''); setLoginPassword(''); setLoginError('');
  }

  async function handleRequest(id, newStatus, body = {}) {
    try {
      if (newStatus === 'approved') await adminApi.approveRequest(id, body);
      else await adminApi.declineRequest(id);
      await loadAllData();
    } catch (err) { alert(err.message); }
  }

  async function handleAddAdmin(e) {
    e.preventDefault(); setAddAdminError(''); setAddAdminSuccess(false);
    try {
      await adminApi.createAdmin({ name: newAdminName.trim(), email: newAdminEmail.trim().toLowerCase(), password: newAdminPassword });
      setAddAdminSuccess(true);
      setNewAdminName(''); setNewAdminEmail(''); setNewAdminPassword('');
      await adminApi.listAdmins().then(setAdmins);
    } catch (err) { setAddAdminError(err.message); }
  }

  // Sort toggle helpers
  function toggleSort(col) {
    setDonorSort((prev) => {
      if (prev.col !== col) return { col, dir: "asc" };
      if (prev.dir === "asc") return { col, dir: "desc" };
      return { col: null, dir: null };
    });
  }
  function sortArrow(col) {
    if (donorSort.col !== col) return "";
    return donorSort.dir === "asc" ? " ↑" : " ↓";
  }

  // Reset password
  async function handleResetPwd(e) {
    e.preventDefault(); setResetPwdError('');
    if (resetPwdNew.length < 6) { setResetPwdError('Password must be at least 6 characters.'); return; }
    if (resetPwdNew !== resetPwdConfirm) { setResetPwdError('Passwords do not match.'); return; }
    try {
      await adminApi.resetDonorPassword(resetPwdDonor.id, { newPassword: resetPwdNew });
      setResetPwdSuccess(true);
      setTimeout(() => {
        setResetPwdDonor(null); setResetPwdNew(''); setResetPwdConfirm('');
        setResetPwdError(''); setResetPwdSuccess(false);
      }, 1600);
    } catch (err) { setResetPwdError(err.message); }
  }

  async function handleRemoveDonor() {
    if (!removeDonorTarget) return;
    try {
      await adminApi.deleteDonor(removeDonorTarget.id);
      setRemoveDonorTarget(null);
      await loadAllData();
    } catch (err) { alert(err.message); }
  }

  // Edit admin
  function openEditAdmin(admin) {
    setEditAdminTarget(admin);
    setEditAdminName(admin.name);
    setEditAdminEmail(admin.email);
    setEditAdminPwd("");
    setEditAdminError("");
    setEditAdminSuccess(false);
  }

  async function handleEditAdmin(e) {
    e.preventDefault(); setEditAdminError('');
    try {
      const body = {
        name: editAdminName.trim(),
        email: editAdminEmail.trim().toLowerCase(),
        ...(editAdminPwd.length >= 6 ? { password: editAdminPwd } : {}),
      };
      const updated = await adminApi.updateAdmin(editAdminTarget.id, body);
      if (currentAdmin.id === editAdminTarget.id) {
        const newAdmin = { ...currentAdmin, ...updated };
        setCurrentAdmin(newAdmin);
        localStorage.setItem('mosque_admin', JSON.stringify(newAdmin));
      }
      setEditAdminSuccess(true);
      await adminApi.listAdmins().then(setAdmins);
      setTimeout(() => { setEditAdminTarget(null); setEditAdminSuccess(false); }, 1600);
    } catch (err) { setEditAdminError(err.message); }
  }

  // Account creation
  function openAcctModal(req) {
    setAcctModal(req);
    setAcctName(req.name || "");
    setAcctEmail(req.email || "");
    setAcctPassword("");
    setAcctPledge("");
    setAcctEndDate(`${new Date().getFullYear()}-12-31`);
    setAcctError("");
    setAcctSuccess(false);
  }

  async function handleCreateAccount(e) {
    e.preventDefault(); setAcctError('');
    if (acctPassword.length < 6) { setAcctError('Password must be at least 6 characters.'); return; }
    try {
      await adminApi.approveRequest(acctModal.id, {
        password: acctPassword,
        ...(acctPledge ? { pledgeAmount: Number(acctPledge) } : {}),
      });
      setAcctSuccess(true);
      await loadAllData();
      setTimeout(() => { setAcctModal(null); setAcctSuccess(false); }, 1600);
    } catch (err) { setAcctError(err.message); }
  }

  // Payment upload
  function openPayModal(req) {
    setPayModal(req);
    setPayAmount("");
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayMethod("zeffy");
    setPayError("");
    setPaySuccess(false);
  }

  async function handleAddPayment(e) {
    e.preventDefault(); setPayError('');
    if (!payAmount || Number(payAmount) <= 0) { setPayError('Enter a valid amount.'); return; }
    try {
      await adminApi.approveRequest(payModal.id, {
        amount: Number(payAmount),
        date: new Date(payDate).toISOString(),
        method: payMethod,
      });
      setPaySuccess(true);
      await loadAllData();
      setTimeout(() => { setPayModal(null); setPaySuccess(false); }, 1600);
    } catch (err) { setPayError(err.message); }
  }

  // ── Utility helpers ───────────────────────────────────────────────────────
  function reqTypeLabel(type) {
    if (type === "account_creation")  return t.accountCreationReq;
    if (type === "payment_upload")    return t.paymentUploadReq;
    if (type === "engagement_change") return t.engagementChangeReq;
    return t.otherReq;
  }

  function statusColor(status) {
    if (status === "approved") return C.green;
    if (status === "declined") return C.danger;
    return C.gold;
  }

  function logBadgeColor(action) {
    if (!action) return C.muted;
    if (action.includes("password")) return C.danger;
    if (action.includes("payment"))  return C.green;
    if (action.includes("account") || action.includes("profile") || action.includes("admin")) return C.blue;
    if (action.includes("engagement")) return C.gold;
    return C.muted;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LOGIN SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (autoLogging) {
    return (
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ color:"#c0c0d8", fontSize:"16px" }}>Loading…</div>
      </div>
    );
  }

  if (!currentAdmin) {
    return (
      <div
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "40px 20px",
          fontFamily: isRTL ? "'Amiri',serif" : "'Cormorant Garamond', serif",
          overflowY: "auto",
        }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond&family=Amiri:wght@400;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>

        <div style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: "16px", padding: "36px",
          width: "100%", maxWidth: "440px", boxSizing: "border-box",
        }}>
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{ fontSize: "40px" }}>🔑</div>
            <div style={{
              fontFamily: isRTL ? "'Amiri',serif" : "'Cinzel',serif",
              fontSize: F.xl, fontWeight: 700, color: C.text,
              marginTop: "12px", letterSpacing: isRTL ? "0" : "0.06em",
            }}>
              {t.adminPanelTitle}
            </div>
            <div style={{ fontSize: F.xs, color: C.muted, marginTop: "6px" }}>
              {t.adminLoginSubtitle}
            </div>
          </div>

          <div style={{
            background: "rgba(212,169,110,0.08)", border: `1px solid rgba(212,169,110,0.25)`,
            borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: C.gold,
            marginBottom: "18px",
          }}>
            {t.adminDemoHint}
          </div>

          {!showForgotPassword ? (
            <>
              <ErrorBox msg={loginError} />

              <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={labelStyle}>{t.email}</label>
                  <input type="email" required value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>{t.password}</label>
                  <input type="password" required value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)} style={inputStyle} />
                </div>
                <button type="submit" style={{ ...primaryBtn(), width: "100%", padding: "14px", fontSize: F.sm }}>
                  {t.signIn}
                </button>
              </form>

              <div style={{ marginTop: "12px", textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setLoginError('');
                    setAdminForgotError('');
                  }}
                  style={{ background: "transparent", border: "none", color: C.gold, cursor: "pointer", fontSize: F.xs, fontFamily: "inherit" }}
                >
                  {t.forgotPasswordLink}
                </button>
              </div>

              {googleSignInEnabled && (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px", marginTop:"16px", marginBottom:"12px" }}>
                    <div style={{ flex:1, height:"1px", background:C.border }} />
                    <span style={{ fontSize:F.xs, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em" }}>or</span>
                    <div style={{ flex:1, height:"1px", background:C.border }} />
                  </div>
                  <GoogleSignInButton
                    width={320}
                    disabled={googleSigningIn}
                    onCredential={handleGoogleLogin}
                    onError={(msg) => setLoginError(msg)}
                  />
                  {googleSigningIn && (
                    <div style={{ marginTop:"10px", fontSize:F.xs, color:C.muted }}>Signing in with Google...</div>
                  )}
                </>
              )}
            </>
          ) : (
            <div>
              <div style={{ fontSize: F.sm, color: C.muted, marginBottom: "14px" }}>{t.forgotPasswordSubtitle}</div>
              <ErrorBox msg={adminForgotError} />

              {adminForgotStep === 1 && (
                <form onSubmit={handleAdminForgotSendOtp} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label style={labelStyle}>{t.email}</label>
                    <input
                      type="email"
                      required
                      value={adminForgotEmail}
                      onChange={(e) => {
                        setAdminForgotEmail(e.target.value);
                        setAdminForgotOtpSent(false);
                        setAdminForgotError('');
                      }}
                      style={inputStyle}
                    />
                  </div>

                  {!adminForgotOtpSent ? (
                    <button type="submit" style={{ ...primaryBtn(adminForgotLoading), width: "100%", padding: "14px", fontSize: F.sm }} disabled={adminForgotLoading}>
                      {adminForgotLoading ? t.sending : t.sendCode}
                    </button>
                  ) : (
                    <>
                      <div style={{ background:"rgba(212,169,110,0.08)", border:`1px solid rgba(212,169,110,0.25)`, borderRadius:"8px", padding:"11px 14px", fontSize:F.xs, color:C.gold }}>
                        {t.codeSentTo}: <strong>{adminForgotEmail}</strong>
                      </div>
                      <div style={{ background:"rgba(90,90,130,0.15)", border:"1px solid #3a3a5a", borderRadius:"8px", padding:"9px 13px", fontSize:F.xs, color:"#9090bb", textAlign:"center" }}>
                        {t.demoOtpHint}
                      </div>
                      <div>
                        <label style={labelStyle}>{t.enterCode}</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={adminForgotOtp}
                          onChange={(e) => {
                            setAdminForgotOtp(e.target.value.replace(/\D/g, ""));
                            setAdminForgotError('');
                          }}
                          style={{ ...inputStyle, textAlign:"center", fontSize:"24px", letterSpacing:"0.35em", fontFamily:"monospace" }}
                        />
                      </div>
                      <button
                        type="button"
                        style={{ ...primaryBtn(adminForgotOtp.length < 6), width: "100%", padding: "14px", fontSize: F.sm }}
                        disabled={adminForgotOtp.length < 6}
                        onClick={handleAdminForgotVerifyOtp}
                      >
                        {t.verifyCode}
                      </button>
                    </>
                  )}
                </form>
              )}

              {adminForgotStep === 3 && (
                <form onSubmit={handleAdminForgotSetPassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ fontSize: F.xs, color: C.muted }}>{t.setNewPassword}</div>
                  <div>
                    <label style={labelStyle}>{t.newPassword}</label>
                    <input type="password" required minLength={8} value={adminForgotNewPwd} onChange={(e) => setAdminForgotNewPwd(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>{t.confirmPassword}</label>
                    <input type="password" required value={adminForgotConfirm} onChange={(e) => setAdminForgotConfirm(e.target.value)} style={inputStyle} />
                  </div>
                  <button type="submit" style={{ ...primaryBtn(), width: "100%", padding: "14px", fontSize: F.sm }}>
                    {t.resetPassword}
                  </button>
                </form>
              )}

              {adminForgotStep === 4 && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ background:"rgba(126,184,160,0.12)", border:"1px solid rgba(126,184,160,0.35)", borderRadius:"8px", padding:"11px 15px", fontSize:F.xs, color:C.green, marginBottom:"12px" }}>
                    {t.passwordResetSuccess}
                  </div>
                  <button
                    type="button"
                    style={{ ...primaryBtn(), width: "100%", padding: "14px", fontSize: F.sm }}
                    onClick={() => {
                      setLoginEmail(adminForgotEmail.trim().toLowerCase());
                      setLoginPassword('');
                      setShowForgotPassword(false);
                      resetAdminForgotState();
                    }}
                  >
                    {t.signIn}
                  </button>
                </div>
              )}

              <div style={{ marginTop: "12px", textAlign: "center" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    resetAdminForgotState();
                  }}
                  style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: F.xs, fontFamily: "inherit" }}
                >
                  {t.backToSignIn}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD (after login)
  // ─────────────────────────────────────────────────────────────────────────
  const TABS = [
    { key: "overview", label: t.overview },
    { key: "donors",   label: t.donors },
    { key: "requests", label: `${t.requests}${(stats.pendingRequests ?? 0) > 0 ? ` (${stats.pendingRequests})` : ""}` },
    { key: "admins",   label: t.admins },
    { key: "logs",     label: t.logs },
  ];

  const donorCols = [
    { key: "name",     label: t.donorName },
    { key: null,       label: t.donorEmail },
    { key: "pledge",   label: t.pledge },
    { key: "paid",     label: t.paid },
    { key: "progress", label: t.progress },
    { key: "due",      label: t.due },
    { key: "status",   label: t.status },
    { key: null,       label: t.actions },
  ];

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        flex: 1, display: "flex", flexDirection: "column",
        overflow: "hidden",
        fontFamily: isRTL ? "'Amiri',serif" : "'Cormorant Garamond', serif",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond&family=Amiri:wght@400;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* Sub-header */}
      <div style={{
        background: C.surface2,
        borderBottom: `1px solid ${C.border}`,
        padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "12px", flexShrink: 0,
      }}>
        <div style={{
          fontFamily: isRTL ? "'Amiri',serif" : "'Cinzel',serif",
          fontSize: F.md, fontWeight: 700, color: C.text,
          letterSpacing: isRTL ? "0" : "0.06em",
        }}>
          {t.adminPanelTitle}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: F.xs, color: C.muted }}>{t.adminWelcome(currentAdmin.name)}</span>
          <button onClick={handleSignOut} style={{
            padding: "6px 14px", borderRadius: "8px",
            border: `1px solid ${C.border}`, background: "transparent",
            color: C.danger, cursor: "pointer", fontSize: F.xs, fontFamily: "inherit",
          }}>
            {t.adminSignOut}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: "0 24px",
        display: "flex", gap: "0",
        flexShrink: 0,
        background: C.surface2,
        overflowX: "auto",
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "12px 18px",
              border: "none",
              borderBottom: activeTab === tab.key ? `2px solid ${C.gold}` : "2px solid transparent",
              background: "transparent",
              color: activeTab === tab.key ? C.gold : C.muted,
              cursor: "pointer",
              fontSize: F.xs,
              fontWeight: activeTab === tab.key ? 700 : 500,
              letterSpacing: "0.04em",
              fontFamily: "inherit",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>

        {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "28px" }}>
              <StatCard icon="👥" label={t.totalDonors}       value={stats.totalDonors}                             color={C.blue} />
              <StatCard icon="💰" label={t.totalRaised}       value={`$${stats.totalRaised.toLocaleString()}`}      color={C.green} />
              <StatCard icon="📋" label={t.activeEngagements} value={stats.activeEngagements}                       color={C.gold} />
              <StatCard icon="📬" label={t.pendingRequests}   value={stats.pendingRequests ?? 0}
                color={(stats.pendingRequests ?? 0) > 0 ? C.danger : C.muted} />
            </div>

            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: "12px", padding: "20px",
            }}>
              <div style={{
                fontFamily: isRTL ? "'Amiri',serif" : "'Cinzel',serif",
                fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em",
                color: C.gold, textTransform: "uppercase", marginBottom: "16px",
              }}>
                {t.donors}
              </div>
              {donors.map((donor) => {
                const { paid, total, pct, isComplete, isOverdue } = getDonorStatus(donor);
                const color = isComplete ? C.green : isOverdue ? C.danger : C.gold;
                return (
                  <div key={donor.id} style={{
                    display: "flex", alignItems: "center", gap: "16px",
                    padding: "10px 0", borderBottom: `1px solid rgba(46,50,80,0.5)`,
                  }}>
                    <MiniProgress pct={pct} color={color} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: F.sm, fontWeight: 700, color: C.text, marginBottom: "2px" }}>{donor.name}</div>
                      <div style={{ fontSize: "12px", color: C.muted }}>{donor.email}</div>
                    </div>
                    <div style={{ textAlign: isRTL ? "left" : "right" }}>
                      <div style={{ fontSize: F.sm, fontWeight: 700, color }}>
                        ${paid.toLocaleString()} / ${total.toLocaleString()}
                      </div>
                      <div style={{ fontSize: "11px", color: C.muted }}>{donor.engagement?.endDate?.split('T')[0] || '—'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── DONORS ───────────────────────────────────────────────────────── */}
        {activeTab === "donors" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <input
              type="text"
              placeholder={t.searchDonors}
              value={donorSearch}
              onChange={(e) => setDonorSearch(e.target.value)}
              style={{ ...inputStyle, maxWidth: "420px" }}
            />

            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: "12px", overflow: "hidden",
            }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: F.sm }}>
                  <thead>
                    <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                      {donorCols.map((col) => (
                        <th
                          key={col.label}
                          onClick={col.key ? () => toggleSort(col.key) : undefined}
                          style={{
                            padding: "12px 16px",
                            textAlign: isRTL ? "right" : "left",
                            fontSize: "11px", fontWeight: 700,
                            letterSpacing: "0.06em", textTransform: "uppercase",
                            color: donorSort.col === col.key ? C.gold : C.muted,
                            whiteSpace: "nowrap",
                            cursor: col.key ? "pointer" : "default",
                            userSelect: "none",
                          }}
                        >
                          {col.label}{col.key ? sortArrow(col.key) : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDonors.length === 0 ? (
                      <tr>
                        <td colSpan={donorCols.length} style={{
                          padding: "32px 16px", textAlign: "center",
                          color: C.muted, fontSize: F.sm,
                        }}>
                          {t.noResultsSearch}
                        </td>
                      </tr>
                    ) : (
                      filteredDonors.map((donor) => {
                        const { paid, total, pct, isComplete, isOverdue } = getDonorStatus(donor);
                        const color = isComplete ? C.green : isOverdue ? C.danger : C.gold;
                        const statusLabel = isComplete ? t.statusFulfilled : isOverdue ? t.statusOverdue : t.statusActive;
                        return (
                          <tr key={donor.id} style={{ borderBottom: `1px solid rgba(46,50,80,0.5)` }}>
                            <td style={{ padding: "12px 16px", color: C.text, fontWeight: 600 }}>{donor.name}</td>
                            <td style={{ padding: "12px 16px", color: C.muted, fontSize: F.xs }}>{donor.email}</td>
                            <td style={{ padding: "12px 16px", color: C.text }}>${total.toLocaleString()}</td>
                            <td style={{ padding: "12px 16px", color: C.green, fontWeight: 700 }}>${paid.toLocaleString()}</td>
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div style={{ flex: 1, minWidth: "60px", background: C.border, borderRadius: "3px", height: "5px", overflow: "hidden" }}>
                                  <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: color, borderRadius: "3px" }} />
                                </div>
                                <span style={{ fontSize: "12px", color, fontWeight: 700, flexShrink: 0 }}>{Math.round(pct)}%</span>
                              </div>
                            </td>
                            <td style={{ padding: "12px 16px", color: C.muted, fontSize: F.xs, whiteSpace: "nowrap" }}>
                              {donor.engagement?.endDate?.split('T')[0] || '—'}
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <span style={{
                                padding: "4px 12px", borderRadius: "12px", fontSize: "11px", fontWeight: 700,
                                background: `${color}1a`, border: `1px solid ${color}55`, color,
                              }}>
                                {statusLabel}
                              </span>
                            </td>
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ display: "flex", gap: "6px", flexWrap: "nowrap" }}>
                                <button
                                  onClick={() => {
                                    setResetPwdDonor(donor);
                                    setResetPwdNew("");
                                    setResetPwdConfirm("");
                                    setResetPwdError("");
                                    setResetPwdSuccess(false);
                                  }}
                                  style={{ ...primaryBtn(false, C.blue), padding: "5px 12px", fontSize: "11px" }}
                                >
                                  {t.resetPassword}
                                </button>
                                <button
                                  onClick={() => setRemoveDonorTarget(donor)}
                                  style={{ ...primaryBtn(false, C.danger), padding: "5px 12px", fontSize: "11px" }}
                                >
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── REQUESTS ─────────────────────────────────────────────────────── */}
        {activeTab === "requests" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {requests.length === 0 ? (
              <div style={{ textAlign: "center", color: C.muted, padding: "40px 0" }}>
                {t.noRequests}
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} style={{
                  background: C.surface,
                  border: `1px solid ${req.status === "pending" ? C.border : statusColor(req.status) + "55"}`,
                  borderRadius: "12px",
                  padding: "18px 20px",
                }}>
                  {/* Card header */}
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    marginBottom: "10px", flexWrap: "wrap", gap: "8px",
                  }}>
                    <div>
                      <span style={{
                        padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700,
                        background: "rgba(138,174,212,0.15)", color: C.blue, marginRight: "8px",
                      }}>
                        {reqTypeLabel(req.type)}
                      </span>
                      <span style={{ fontSize: F.base, fontWeight: 700, color: C.text }}>{req.name}</span>
                      <span style={{ fontSize: F.xs, color: C.muted, marginLeft: "8px" }}>{req.email}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "12px", color: C.muted }}>{req.createdAt}</span>
                      <span style={{
                        padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700,
                        background: `${statusColor(req.status)}1a`,
                        border: `1px solid ${statusColor(req.status)}55`,
                        color: statusColor(req.status),
                      }}>
                        {req.status === "pending" ? t.pending : req.status === "approved" ? t.approved : t.declined}
                      </span>
                    </div>
                  </div>

                  {/* Message */}
                  <p style={{ fontSize: F.sm, color: C.muted, lineHeight: 1.6, marginBottom: "10px" }}>
                    {req.message}
                  </p>

                  {/* Attachments */}
                  {req.attachments && req.attachments.length > 0 && (
                    <div style={{ marginBottom: "14px" }}>
                      <div style={{
                        fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em",
                        textTransform: "uppercase", color: C.muted, marginBottom: "8px",
                      }}>
                        Attachments
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {req.attachments.map((att, i) =>
                          (att.type || att.mimetype || '').startsWith("image/") ? (
                            <img
                              key={i}
                              src={att.dataUrl || att.url}
                              alt={att.name || att.filename || 'attachment'}
                              title={att.name || att.filename}
                              onClick={() => window.open(att.dataUrl || att.url, "_blank")}
                              style={{
                                maxHeight: "80px",
                                borderRadius: "6px",
                                border: `1px solid ${C.border}`,
                                cursor: "pointer",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <a
                              key={i}
                              href={att.dataUrl || att.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: "flex", alignItems: "center", gap: "6px",
                                padding: "6px 12px", borderRadius: "8px",
                                border: `1px solid ${C.border}`, background: C.surface2,
                                color: C.blue, fontSize: "12px",
                                textDecoration: "none", whiteSpace: "nowrap",
                              }}
                            >
                              📎 {att.name || att.filename || 'attachment'}
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  {/* engagement_change info banner */}
                  {req.type === "engagement_change" && req.status === "pending" && (
                    <div style={{
                      background: "rgba(212,169,110,0.08)",
                      border: `1px solid rgba(212,169,110,0.25)`,
                      borderRadius: "8px", padding: "10px 14px",
                      fontSize: F.xs, color: C.gold, marginBottom: "14px",
                    }}>
                      This engagement was already updated by the donor. Click{" "}
                      <strong>Acknowledge</strong> to confirm you've reviewed it.
                    </div>
                  )}

                  {/* Action buttons */}
                  {req.status === "pending" && (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {req.type === "account_creation" ? (
                        <button
                          onClick={() => openAcctModal(req)}
                          style={{ ...primaryBtn(false, C.green), padding: "7px 16px", fontSize: "12px" }}
                        >
                          Create Account
                        </button>
                      ) : req.type === "payment_upload" ? (
                        <button
                          onClick={() => openPayModal(req)}
                          style={{ ...primaryBtn(false, C.green), padding: "7px 16px", fontSize: "12px" }}
                        >
                          {t.approve}
                        </button>
                      ) : req.type === "engagement_change" ? (
                        <button
                          onClick={() => handleRequest(req.id, "approved", {})}
                          style={{ ...primaryBtn(false, C.gold), padding: "7px 16px", fontSize: "12px" }}
                        >
                          Acknowledge
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRequest(req.id, "approved", {})}
                          style={{ ...primaryBtn(false, C.green), padding: "7px 16px", fontSize: "12px" }}
                        >
                          {t.approve}
                        </button>
                      )}
                      <button
                        onClick={() => handleRequest(req.id, "declined", {})}
                        style={{
                          padding: "7px 16px", borderRadius: "8px",
                          border: `1px solid ${C.danger}55`, background: "transparent",
                          color: C.danger, cursor: "pointer", fontSize: "12px",
                          fontWeight: 700, letterSpacing: "0.04em", fontFamily: "inherit",
                        }}
                      >
                        {t.decline}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── ADMINS ───────────────────────────────────────────────────────── */}
        {activeTab === "admins" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Admin list */}
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: "12px", overflow: "hidden",
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: F.sm }}>
                <thead>
                  <tr style={{ background: C.surface2, borderBottom: `1px solid ${C.border}` }}>
                    {[t.donorName, t.donorEmail, t.addedBy, t.addedOn, t.actions].map((h) => (
                      <th key={h} style={{
                        padding: "12px 16px",
                        textAlign: isRTL ? "right" : "left",
                        fontSize: "11px", fontWeight: 700,
                        letterSpacing: "0.06em", textTransform: "uppercase",
                        color: C.muted,
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.id} style={{ borderBottom: `1px solid rgba(46,50,80,0.5)` }}>
                      <td style={{ padding: "12px 16px", color: C.text, fontWeight: 600 }}>
                        {a.name}
                        {a.id === currentAdmin.id && (
                          <span style={{ fontSize: "10px", color: C.gold, marginLeft: "8px", fontWeight: 700 }}>YOU</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", color: C.muted, fontSize: F.xs }}>{a.email}</td>
                      <td style={{ padding: "12px 16px", color: C.muted, fontSize: F.xs }}>{a.addedBy?.name || "—"}</td>
                      <td style={{ padding: "12px 16px", color: C.muted, fontSize: F.xs }}>{a.createdAt}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <button
                          onClick={() => openEditAdmin(a)}
                          style={{ ...primaryBtn(false, C.blue), padding: "5px 14px", fontSize: "11px" }}
                        >
                          {t.editAdminBtn}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add admin form */}
            <div style={{
              background: C.surface,
              border: `1px solid rgba(212,169,110,0.25)`,
              borderRadius: "12px",
              padding: "24px",
            }}>
              <div style={{
                fontFamily: isRTL ? "'Amiri',serif" : "'Cinzel',serif",
                fontSize: F.base, fontWeight: 700, letterSpacing: "0.06em",
                color: C.gold, marginBottom: "6px",
              }}>
                {t.addAdminTitle}
              </div>
              <p style={{ fontSize: F.xs, color: C.muted, marginBottom: "20px" }}>
                {t.addAdminSubtitle}
              </p>

              {addAdminSuccess && (
                <div style={{
                  background: "rgba(126,184,160,0.12)",
                  border: "1px solid rgba(126,184,160,0.35)",
                  borderRadius: "8px", padding: "10px 14px",
                  fontSize: F.xs, color: C.green, marginBottom: "14px",
                }}>
                  {t.adminAdded}
                </div>
              )}

              <ErrorBox msg={addAdminError} />

              <form onSubmit={handleAddAdmin}>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 180px" }}>
                    <label style={labelStyle}>{t.fullName}</label>
                    <input type="text" required value={newAdminName}
                      onChange={(e) => { setNewAdminName(e.target.value); setAddAdminSuccess(false); }}
                      style={inputStyle} placeholder="Full name" />
                  </div>
                  <div style={{ flex: "1 1 200px" }}>
                    <label style={labelStyle}>{t.email}</label>
                    <input type="email" required value={newAdminEmail}
                      onChange={(e) => { setNewAdminEmail(e.target.value); setAddAdminSuccess(false); }}
                      style={inputStyle} placeholder="admin@example.com" />
                  </div>
                  <div style={{ flex: "1 1 160px" }}>
                    <label style={labelStyle}>{t.password}</label>
                    <input type="password" required minLength={6} value={newAdminPassword}
                      onChange={(e) => { setNewAdminPassword(e.target.value); setAddAdminSuccess(false); }}
                      style={inputStyle} placeholder="Min. 6 chars" />
                  </div>
                </div>
                <div style={{ marginTop: "16px" }}>
                  <button type="submit" style={{ ...primaryBtn(), width: "auto" }}>
                    {t.sendInvitation}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── LOGS ─────────────────────────────────────────────────────────── */}
        {activeTab === "logs" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

            {/* Filter bar */}
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: "10px", padding: "16px 18px",
              display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end",
            }}>
              {/* Donor filter */}
              <div style={{ flex: "1 1 180px" }}>
                <label style={labelStyle}>Donor</label>
                <select
                  value={logDonorFilter}
                  onChange={(e) => setLogDonorFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">All donors</option>
                  {donors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Event type filter */}
              <div style={{ flex: "1 1 180px" }}>
                <label style={labelStyle}>Event type</label>
                <select
                  value={logTypeFilter}
                  onChange={(e) => setLogTypeFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="">All types</option>
                  {logActionTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date from */}
              <div style={{ flex: "1 1 150px" }}>
                <label style={labelStyle}>From date</label>
                <input
                  type="date"
                  value={logDateFrom}
                  onChange={(e) => setLogDateFrom(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Date to */}
              <div style={{ flex: "1 1 150px" }}>
                <label style={labelStyle}>To date</label>
                <input
                  type="date"
                  value={logDateTo}
                  onChange={(e) => setLogDateTo(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Clear button (shown only when any filter active) */}
              {(logDonorFilter || logTypeFilter || logDateFrom || logDateTo) && (
                <button
                  onClick={() => { setLogDonorFilter(""); setLogTypeFilter(""); setLogDateFrom(""); setLogDateTo(""); }}
                  style={{
                    padding: "10px 16px", borderRadius: "8px",
                    border: `1px solid ${C.border}`, background: "transparent",
                    color: C.muted, cursor: "pointer", fontSize: F.xs,
                    fontFamily: "inherit", whiteSpace: "nowrap", alignSelf: "flex-end",
                  }}
                >
                  ✕ Clear filters
                </button>
              )}
            </div>

            {filteredLogs.length === 0 ? (
              <div style={{ textAlign: "center", color: C.muted, padding: "40px 0", fontSize: F.sm }}>
                No activity recorded yet.
              </div>
            ) : (
              filteredLogs.map((entry, i) => {
                const badgeColor = logBadgeColor(entry.action);
                return (
                  <div key={i} style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: "10px",
                    padding: "14px 18px",
                    display: "flex", alignItems: "flex-start", gap: "14px",
                  }}>
                    <div style={{
                      flexShrink: 0,
                      padding: "4px 10px", borderRadius: "8px",
                      background: `${badgeColor}1a`, border: `1px solid ${badgeColor}55`,
                      color: badgeColor,
                      fontSize: "11px", fontWeight: 700,
                      textTransform: "uppercase", letterSpacing: "0.04em",
                      marginTop: "1px", whiteSpace: "nowrap",
                    }}>
                      {(entry.action || "log").replace(/_/g, " ")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: F.sm, fontWeight: 700, color: C.text, marginBottom: "2px" }}>
                        {entry.actor || "System"}
                      </div>
                      <div style={{ fontSize: F.xs, color: C.muted, lineHeight: 1.5 }}>
                        {entry.details || ""}
                      </div>
                    </div>
                    {entry.timestamp && (
                      <div style={{ flexShrink: 0, fontSize: "11px", color: C.muted, whiteSpace: "nowrap", marginTop: "2px" }}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>{/* end tab content */}

      {/* ── MODALS ──────────────────────────────────────────────────────────── */}

      {/* Remove Donor Confirmation Modal */}
      {removeDonorTarget && (
        <Modal title="Remove Donor" onClose={() => setRemoveDonorTarget(null)}>
          <p style={{ fontSize: F.base, color: C.muted, marginBottom: "20px", lineHeight: 1.6 }}>
            Are you sure you want to permanently remove{" "}
            <strong style={{ color: C.text }}>{removeDonorTarget.name}</strong>?
            This will delete their account, engagement, and all payment history.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
            <button onClick={() => setRemoveDonorTarget(null)} style={{
              padding: "9px 18px", borderRadius: "8px", border: `1px solid ${C.border}`,
              background: "transparent", color: C.muted, cursor: "pointer",
              fontSize: F.sm, fontFamily: "inherit",
            }}>
              Cancel
            </button>
            <button onClick={handleRemoveDonor} style={primaryBtn(false, C.danger)}>
              Remove Permanently
            </button>
          </div>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {resetPwdDonor && (
        <Modal
          title={`${t.resetPassword} – ${resetPwdDonor.name}`}
          onClose={() => setResetPwdDonor(null)}
        >
          {resetPwdSuccess ? (
            <div style={{
              background: "rgba(126,184,160,0.12)", border: "1px solid rgba(126,184,160,0.35)",
              borderRadius: "8px", padding: "14px 18px", color: C.green, fontSize: F.sm,
            }}>
              ✓ Password reset successfully.
            </div>
          ) : (
            <form onSubmit={handleResetPwd} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <ErrorBox msg={resetPwdError} />
              <div>
                <label style={labelStyle}>{t.newPassword}</label>
                <input
                  type="password" required minLength={6}
                  value={resetPwdNew} onChange={(e) => setResetPwdNew(e.target.value)}
                  style={inputStyle} placeholder="Min. 6 chars" autoFocus
                />
              </div>
              <div>
                <label style={labelStyle}>{t.confirmPassword}</label>
                <input
                  type="password" required minLength={6}
                  value={resetPwdConfirm} onChange={(e) => setResetPwdConfirm(e.target.value)}
                  style={inputStyle} placeholder="Repeat new password"
                />
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setResetPwdDonor(null)} style={{
                  padding: "9px 18px", borderRadius: "8px", border: `1px solid ${C.border}`,
                  background: "transparent", color: C.muted, cursor: "pointer",
                  fontSize: F.xs, fontFamily: "inherit",
                }}>
                  {t.cancelBtn}
                </button>
                <button type="submit" style={primaryBtn(false, C.danger)}>
                  {t.resetPwdBtn}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Edit Admin Modal */}
      {editAdminTarget && (
        <Modal
          title={`${t.editAdmin} – ${editAdminTarget.name}`}
          onClose={() => setEditAdminTarget(null)}
        >
          {editAdminSuccess ? (
            <div style={{
              background: "rgba(126,184,160,0.12)", border: "1px solid rgba(126,184,160,0.35)",
              borderRadius: "8px", padding: "14px 18px", color: C.green, fontSize: F.sm,
            }}>
              ✓ Admin updated successfully.
            </div>
          ) : (
            <form onSubmit={handleEditAdmin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <ErrorBox msg={editAdminError} />
              <div>
                <label style={labelStyle}>{t.fullName}</label>
                <input type="text" required value={editAdminName}
                  onChange={(e) => setEditAdminName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t.email}</label>
                <input type="email" required value={editAdminEmail}
                  onChange={(e) => setEditAdminEmail(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t.password}</label>
                <input type="password" minLength={6} value={editAdminPwd}
                  onChange={(e) => setEditAdminPwd(e.target.value)}
                  style={inputStyle} placeholder={t.leaveBlankToKeep} />
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setEditAdminTarget(null)} style={{
                  padding: "9px 18px", borderRadius: "8px", border: `1px solid ${C.border}`,
                  background: "transparent", color: C.muted, cursor: "pointer",
                  fontSize: F.xs, fontFamily: "inherit",
                }}>
                  {t.cancelBtn}
                </button>
                <button type="submit" style={primaryBtn()}>
                  {t.saveChanges}
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Create Account Modal */}
      {acctModal && (
        <Modal title="Create Donor Account" onClose={() => setAcctModal(null)}>
          {acctSuccess ? (
            <div style={{
              background: "rgba(126,184,160,0.12)", border: "1px solid rgba(126,184,160,0.35)",
              borderRadius: "8px", padding: "14px 18px", color: C.green, fontSize: F.sm,
            }}>
              ✓ Donor account created successfully.
            </div>
          ) : (
            <form onSubmit={handleCreateAccount} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <ErrorBox msg={acctError} />
              <div>
                <label style={labelStyle}>{t.fullName}</label>
                <input type="text" required value={acctName}
                  onChange={(e) => setAcctName(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t.email}</label>
                <input type="email" required value={acctEmail}
                  onChange={(e) => setAcctEmail(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t.initialPassword}</label>
                <input type="password" required minLength={6} value={acctPassword}
                  onChange={(e) => setAcctPassword(e.target.value)}
                  style={inputStyle} placeholder="Min. 6 chars" />
              </div>
              <div>
                <label style={labelStyle}>{t.totalPledgeAmount}</label>
                <input type="number" min={0} value={acctPledge}
                  onChange={(e) => setAcctPledge(e.target.value)}
                  style={inputStyle} placeholder="Optional — donor can set later" />
              </div>
              <p style={{ fontSize: F.xs, color: C.muted, marginTop: "-8px" }}>
                ℹ️ Pledge amount and end date can be set by the donor after their first login.
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setAcctModal(null)} style={{
                  padding: "9px 18px", borderRadius: "8px", border: `1px solid ${C.border}`,
                  background: "transparent", color: C.muted, cursor: "pointer",
                  fontSize: F.xs, fontFamily: "inherit",
                }}>
                  {t.cancelBtn}
                </button>
                <button type="submit" style={primaryBtn(false, C.green)}>
                  Create Account
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

      {/* Add Payment Modal */}
      {payModal && (
        <Modal title={`Add Payment – ${payModal.name}`} onClose={() => setPayModal(null)}>
          {paySuccess ? (
            <div style={{
              background: "rgba(126,184,160,0.12)", border: "1px solid rgba(126,184,160,0.35)",
              borderRadius: "8px", padding: "14px 18px", color: C.green, fontSize: F.sm,
            }}>
              ✓ Payment added successfully.
            </div>
          ) : (
            <form onSubmit={handleAddPayment} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{
                background: C.surface2, borderRadius: "8px", padding: "12px 14px",
                fontSize: F.xs, color: C.muted, lineHeight: 1.6,
              }}>
                {payModal.message}
              </div>
              <ErrorBox msg={payError} />
              <div>
                <label style={labelStyle}>{t.amount} ($)</label>
                <input type="number" required min={1} step="0.01" value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  style={inputStyle} placeholder="e.g. 200" />
              </div>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" required value={payDate}
                  onChange={(e) => setPayDate(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{t.method}</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)}
                  style={inputStyle}>
                  <option value="zeffy">Zeffy</option>
                  <option value="cash">Cash</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setPayModal(null)} style={{
                  padding: "9px 18px", borderRadius: "8px", border: `1px solid ${C.border}`,
                  background: "transparent", color: C.muted, cursor: "pointer",
                  fontSize: F.xs, fontFamily: "inherit",
                }}>
                  {t.cancelBtn}
                </button>
                <button type="submit" style={primaryBtn(false, C.green)}>
                  Add Payment
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}

    </div>
  );
}
