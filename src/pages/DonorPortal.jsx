// ─── Donor Portal ─────────────────────────────────────────────────────────────
// Views: home · login · register · dashboard · settings ·
//        forgotPassword · editEngagement · requestHelp

import React, { useState, useMemo, useEffect } from "react";
import { PORTAL_T } from "../i18n/portalTranslations";
import { tryAutoLogin } from '../api/client.js';
import * as authApi from '../api/auth.js';
import * as donorApi from '../api/donors.js';
import * as requestsApi from '../api/requests.js';
import GoogleSignInButton from "../components/GoogleSignInButton";

// ─── Style tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:      "#090c18",
  surface: "#131628",
  surf2:   "#0e1020",
  border:  "#2e3250",
  gold:    "#D4A96E",
  text:    "#f0e8d8",
  muted:   "#c0c0d8",
  danger:  "#e06060",
  green:   "#7EB8A0",
  blue:    "#8AAED4",
};

// Font scale
const F = { xs:"14px", sm:"15px", base:"17px", md:"18px", lg:"20px", xl:"24px", xxl:"28px" };

const INPUT = {
  width:"100%", padding:"13px 16px", borderRadius:"8px",
  border:`1px solid ${C.border}`, background:C.surf2,
  color:C.text, fontSize:F.md, outline:"none",
  boxSizing:"border-box", fontFamily:"inherit",
};

const PRIMARY = (disabled=false) => ({
  width:"100%", padding:"15px", borderRadius:"8px", border:"none",
  background: disabled ? C.border : C.gold,
  color: disabled ? "#888899" : "#000",
  fontSize:F.base, fontWeight:800, cursor: disabled?"not-allowed":"pointer",
  letterSpacing:"0.06em", textTransform:"uppercase",
  transition:"opacity 0.18s", fontFamily:"'Cinzel',serif",
});

const GHOST = {
  background:"transparent", border:"none", color:C.muted,
  cursor:"pointer", fontSize:F.base, padding:"6px 0", fontFamily:"inherit",
};

const CARD = {
  background:C.surface, border:`1px solid ${C.border}`,
  borderRadius:"16px", padding:"36px",
  width:"100%", maxWidth:"480px", boxSizing:"border-box",
};

const LBL = {
  display:"block", fontSize:F.sm, fontWeight:700,
  letterSpacing:"0.08em", textTransform:"uppercase",
  color:C.muted, marginBottom:"7px",
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600&family=Amiri:wght@400;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}`;

const formatDateOnly = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.includes("T") ? value.slice(0, 10) : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

// ─── Shared sub-components ────────────────────────────────────────────────────
function Err({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      background:"rgba(224,96,96,0.12)", border:`1px solid ${C.danger}`,
      borderRadius:"8px", padding:"11px 15px",
      fontSize:F.base, color:C.danger, marginBottom:"14px",
    }}>{msg}</div>
  );
}

function Success({ msg }) {
  if (!msg) return null;
  return (
    <div style={{
      background:"rgba(126,184,160,0.12)", border:"1px solid rgba(126,184,160,0.35)",
      borderRadius:"8px", padding:"11px 15px",
      fontSize:F.base, color:C.green, marginBottom:"14px",
    }}>{msg}</div>
  );
}

function StepDots({ current, total }) {
  return (
    <span style={{ display:"inline-flex", gap:"5px", verticalAlign:"middle", marginLeft:"10px" }}>
      {Array.from({ length:total }).map((_,i) => (
        <span key={i} style={{ width:"24px", height:"3px", borderRadius:"2px",
          background: i < current ? C.gold : C.border, transition:"background 0.3s" }} />
      ))}
    </span>
  );
}

function PageWrap({ isRTL, children }) {
  return (
    <div dir={isRTL?"rtl":"ltr"} style={{
      flex:1, display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center",
      padding:"40px 20px", overflowY:"auto",
      fontFamily: isRTL ? "'Amiri',serif" : "'Cormorant Garamond',serif",
    }}>
      <style>{FONTS}</style>
      {children}
    </div>
  );
}

// ─── Circular progress SVG ────────────────────────────────────────────────────
function CircularProgress({ percentage, paidAmount, totalAmount, color }) {
  const r = 72, circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(percentage, 100) / 100);
  return (
    <svg viewBox="0 0 180 180" width="210" height="210">
      <circle cx="90" cy="90" r={r} fill="none" stroke={C.border} strokeWidth="14" />
      <circle cx="90" cy="90" r={r} fill="none" stroke={color} strokeWidth="14"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 90 90)" style={{ transition:"stroke-dashoffset 1.2s ease" }} />
      <text x="90" y="84" textAnchor="middle" fill={C.text} fontSize="30" fontWeight="800" fontFamily="sans-serif">
        {Math.round(percentage)}%
      </text>
      <text x="90" y="106" textAnchor="middle" fill={color} fontSize="12" fontWeight="600" fontFamily="sans-serif">
        ${paidAmount.toLocaleString()} / ${totalAmount.toLocaleString()}
      </text>
    </svg>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ flex:"1 1 0", background:C.surf2, border:`1px solid ${C.border}`,
      borderRadius:"10px", padding:"16px 12px", textAlign:"center" }}>
      <div style={{ fontSize:F.sm, color:C.muted, letterSpacing:"0.06em",
        textTransform:"uppercase", marginBottom:"7px" }}>{label}</div>
      <div style={{ fontSize:F.lg, fontWeight:800, color: color||C.text }}>{value}</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function DonorPortal({ navigate, language, setLanguage }) {
  const t     = PORTAL_T[language] || PORTAL_T.en;
  const isRTL = language === "ar";
  const googleSignInEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

  // ── Auth & view ──────────────────────────────────────────────────────────
  const [currentDonor, setCurrentDonor] = useState(null);
  const [view, setView] = useState("home");
  // home | login | register | dashboard | settings | forgotPassword | editEngagement | requestHelp | makePayment
  const [autoLogging, setAutoLogging] = useState(true);
  const [engagement, setEngagement]   = useState(null);
  const [payments, setPayments]       = useState([]);
  const [donorRequests, setDonorRequests] = useState([]);

  // ── Login ────────────────────────────────────────────────────────────────
  const [loginEmail, setLoginEmail]       = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError]       = useState("");
  const [googleSigningIn, setGoogleSigningIn] = useState(false);

  // ── Register ─────────────────────────────────────────────────────────────
  const [regStep, setRegStep]           = useState(1);
  const [regEmail, setRegEmail]         = useState("");
  const [regOtp, setRegOtp]             = useState("");
  const [otpSent, setOtpSent]           = useState(false);
  const [otpLoading, setOtpLoading]     = useState(false);
  const [otpError, setOtpError]         = useState("");
  const [regName, setRegName]           = useState("");
  const [regPassword, setRegPassword]   = useState("");
  const [regConfirm, setRegConfirm]     = useState("");
  const [regPledge, setRegPledge]       = useState("");
  const [regEndDate, setRegEndDate]     = useState(`${new Date().getFullYear()}-12-31`);
  const [regError, setRegError]         = useState("");
  const [regEmailError, setRegEmailError] = useState("");

  // ── Settings ─────────────────────────────────────────────────────────────
  const [settingsName, setSettingsName]     = useState("");
  const [settingsEmail, setSettingsEmail]   = useState("");
  const [settingsError, setSettingsError]   = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [currentPwd, setCurrentPwd]         = useState("");
  const [newPwd, setNewPwd]                 = useState("");
  const [confirmPwd, setConfirmPwd]         = useState("");

  // ── Forgot password ───────────────────────────────────────────────────────
  const [forgotStep, setForgotStep]         = useState(1);
  const [forgotEmail, setForgotEmail]       = useState("");
  const [forgotOtp, setForgotOtp]           = useState("");
  const [forgotOtpSent, setForgotOtpSent]   = useState(false);
  const [forgotLoading, setForgotLoading]   = useState(false);
  const [forgotNewPwd, setForgotNewPwd]     = useState("");
  const [forgotConfirm, setForgotConfirm]   = useState("");
  const [forgotError, setForgotError]       = useState("");
  const [forgotDonor, setForgotDonor]       = useState(null);

  // ── Edit engagement ───────────────────────────────────────────────────────
  const [engPledge, setEngPledge]   = useState("");
  const [engEndDate, setEngEndDate] = useState(`${new Date().getFullYear()}-12-31`);
  const [engError, setEngError]     = useState("");
  const [engSuccess, setEngSuccess] = useState("");

  // ── Request help ──────────────────────────────────────────────────────────
  const [reqName, setReqName]       = useState("");
  const [reqEmail, setReqEmail]     = useState("");
  const [reqType, setReqType]       = useState("account_creation");
  const [reqMessage, setReqMessage] = useState("");
  const [reqFiles, setReqFiles]     = useState([]);
  const [reqSent, setReqSent]       = useState(false);

  // ── Dashboard computed ────────────────────────────────────────────────────
  const dashData = useMemo(() => {
    if (!currentDonor) return null;
    const paid  = payments.reduce((s, p) => s + p.amount, 0);
    const total = engagement?.totalPledge || 0;
    const pct   = total > 0 ? (paid / total) * 100 : 0;
    const end   = engagement?.endDate ? new Date(engagement.endDate) : null;
    const daysLeft = end ? Math.ceil((end - new Date()) / 86400000) : null;
    return { paid, total, pct, daysLeft, endDate: formatDateOnly(engagement?.endDate) };
  }, [currentDonor, payments, engagement]);

  // ── Auto-login on mount ───────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const result = await tryAutoLogin();
        if (result) {
          const [profile, paymentsData] = await Promise.all([
            donorApi.getMe(),
            donorApi.getMyPayments(),
          ]);
          setCurrentDonor(profile);
          setEngagement(profile.engagement ?? null);
          setPayments(paymentsData);
          setView('dashboard');
        }
      } catch { /* not logged in */ }
      finally { setAutoLogging(false); }
    })();
  }, []);

  // ── Populate settings form when entering settings view ───────────────────
  useEffect(() => {
    if (view === 'settings' && currentDonor) {
      setSettingsName(currentDonor.name);
      setSettingsEmail(currentDonor.email);
    }
  }, [view, currentDonor]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function completeDonorSignIn() {
    const [profile, paymentsData] = await Promise.all([
      donorApi.getMe(),
      donorApi.getMyPayments(),
    ]);
    setCurrentDonor(profile);
    setEngagement(profile.engagement ?? null);
    setPayments(paymentsData);
    setView('dashboard');
  }

  async function handleLogin(e) {
    e.preventDefault(); setLoginError('');
    try {
      await authApi.donorLogin(loginEmail.trim(), loginPassword);
      await completeDonorSignIn();
      setLoginEmail(''); setLoginPassword('');
    } catch (err) { setLoginError(err.message || t.invalidCredentials); }
  }

  async function handleGoogleLogin(credential) {
    setLoginError('');
    setGoogleSigningIn(true);
    try {
      await authApi.donorGoogleLogin(credential);
      await completeDonorSignIn();
      setLoginEmail('');
      setLoginPassword('');
    } catch (err) {
      setLoginError(err.message || 'Google sign-in failed.');
    } finally {
      setGoogleSigningIn(false);
    }
  }

  async function handleSendOtp(e) {
    e.preventDefault(); setRegEmailError('');
    try {
      await authApi.donorSendOtp(regEmail.trim());
      setOtpSent(true);
    } catch (err) { setRegEmailError(err.message); }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault(); setOtpError('');
    try {
      await authApi.donorVerifyOtp(regEmail.trim(), regOtp.trim());
      setRegStep(3);
    } catch (err) { setOtpError(err.message); }
  }

  async function handleCreateAccount(e) {
    e.preventDefault(); setRegError('');
    if (regPassword !== regConfirm) { setRegError(t.passwordsNoMatch); return; }
    try {
      const pledge = parseFloat(regPledge) > 0
        ? { totalPledge: parseFloat(regPledge), ...(regEndDate ? { endDate: new Date(regEndDate).toISOString() } : {}) }
        : undefined;
      await authApi.donorCompleteRegistration({
        email: regEmail.trim(), name: regName.trim(), password: regPassword, pledge,
      });
      const [profile, paymentsData] = await Promise.all([
        donorApi.getMe(),
        donorApi.getMyPayments(),
      ]);
      setCurrentDonor(profile);
      setEngagement(profile.engagement ?? null);
      setPayments(paymentsData);
      setView('dashboard');
      setRegStep(1); setRegEmail(''); setRegOtp(''); setOtpSent(false);
    } catch (err) { setRegError(err.message); }
  }

  async function handleSignOut() {
    await authApi.logout();
    setCurrentDonor(null); setEngagement(null); setPayments([]); setDonorRequests([]);
    setView('home'); setLoginEmail(''); setLoginPassword(''); setLoginError('');
  }

  // Settings
  async function handleSaveName(e) {
    e.preventDefault(); setSettingsError(''); setSettingsSuccess('');
    try {
      const updated = await donorApi.updateMe({ name: settingsName.trim(), email: settingsEmail.trim().toLowerCase() });
      setCurrentDonor(updated);
      setSettingsSuccess(t.changesSaved);
    } catch (err) { setSettingsError(err.message); }
  }

  async function handleChangePassword(e) {
    e.preventDefault(); setSettingsError(''); setSettingsSuccess('');
    if (newPwd !== confirmPwd) { setSettingsError(t.passwordsNoMatch); return; }
    try {
      await donorApi.updateMyPassword({ currentPassword: currentPwd, newPassword: newPwd });
      setSettingsSuccess(t.changesSaved);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (err) { setSettingsError(err.message); }
  }

  // Forgot password
  async function handleForgotSendOtp(e) {
    e.preventDefault(); setForgotError('');
    try {
      await authApi.donorForgotSendOtp(forgotEmail.trim());
      setForgotOtpSent(true);
    } catch (err) { setForgotError(err.message); }
  }

  async function handleForgotVerifyOtp(e) {
    e.preventDefault(); setForgotError('');
    try {
      await authApi.donorForgotVerifyOtp(forgotEmail.trim(), forgotOtp.trim());
      setForgotStep(3);
    } catch (err) { setForgotError(err.message); }
  }

  async function handleForgotSetPassword(e) {
    e.preventDefault(); setForgotError('');
    if (forgotNewPwd !== forgotConfirm) { setForgotError(t.passwordsNoMatch); return; }
    try {
      await authApi.donorForgotReset(forgotEmail.trim(), forgotOtp.trim(), forgotNewPwd);
      setForgotStep(4);
    } catch (err) { setForgotError(err.message); }
  }

  // Edit engagement
  function openEditEngagement() {
    setEngPledge(engagement?.totalPledge?.toString() || '');
    setEngEndDate(engagement?.endDate ? engagement.endDate.split('T')[0] : `${new Date().getFullYear()}-12-31`);
    setEngError(''); setEngSuccess('');
    setView('editEngagement');
  }

  async function handleSaveEngagement(e) {
    e.preventDefault(); setEngError('');
    try {
      const isNew = !engagement?.totalPledge;
      const body = { totalPledge: parseFloat(engPledge), ...(engEndDate ? { endDate: new Date(engEndDate).toISOString() } : {}) };
      let updated;
      if (isNew) {
        updated = await donorApi.createEngagement(body);
      } else {
        updated = await donorApi.updateEngagement(body);
      }
      setEngagement(updated);
      await requestsApi.createRequest({
        type: 'engagement_change',
        name: currentDonor.name,
        email: currentDonor.email,
        message: `${currentDonor.name} ${isNew ? 'created a new' : 'modified their'} engagement: $${parseFloat(engPledge).toLocaleString()}${engEndDate ? ' by ' + engEndDate : ''}`,
      });
      setEngSuccess(t.engagementSaved);
      setTimeout(() => setView('dashboard'), 1800);
    } catch (err) { setEngError(err.message); }
  }

  // Request help
  function handleFileChange(e) {
    const files = Array.from(e.target.files);
    Promise.all(files.map(file => new Promise(res => {
      const reader = new FileReader();
      reader.onload = ev => res({ name:file.name, type:file.type, dataUrl:ev.target.result, size:file.size, file });
      reader.readAsDataURL(file);
    }))).then(results => setReqFiles(prev => [...prev, ...results]));
    e.target.value = "";
  }

  async function handleSendRequest(e) {
    e.preventDefault();
    try {
      const req = await requestsApi.createRequest({
        type: reqType, name: reqName || currentDonor?.name || '',
        email: reqEmail || currentDonor?.email || '',
        message: reqMessage || '(No message provided)',
      });
      if (reqFiles.length > 0) {
        const form = new FormData();
        reqFiles.forEach(f => form.append('files', f.file ?? f));
        await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api/requests/${req.id}/attachments`, {
          method: 'POST', body: form,
        });
      }
      setReqSent(true); setReqFiles([]);
    } catch { /* silently fail — request already submitted */ }
  }

  // ─── Loading (auto-login in progress) ─────────────────────────────────────
  if (autoLogging) return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ color:"#c0c0d8", fontSize:"16px" }}>Loading…</div>
    </div>
  );

  // ─── VIEW: home ────────────────────────────────────────────────────────────
  if (view === "home") return (
    <PageWrap isRTL={isRTL}>
      <div style={CARD}>
        <div style={{ textAlign:"center", marginBottom:"28px" }}>
          <div style={{ fontSize:"48px", lineHeight:1 }}>🕌</div>
          <div style={{ fontFamily: isRTL?"'Amiri',serif":"'Cinzel',serif", fontSize:F.xl, fontWeight:700, color:C.text, marginTop:"14px", letterSpacing: isRTL?"0":"0.06em" }}>
            {t.donorPortalTitle}
          </div>
          <div style={{ fontSize:F.base, color:C.muted, marginTop:"8px" }}>{t.donorPortalSubtitle}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          <button style={PRIMARY()} onClick={() => setView("login")}>{t.signIn}</button>
          <button style={{ ...PRIMARY(), background:"transparent", border:`1px solid ${C.gold}`, color:C.gold }}
            onClick={() => { setView("register"); setRegStep(1); setOtpSent(false); }}>
            {t.createAccount}
          </button>
          <button style={{ ...PRIMARY(), background:"transparent", border:`1px solid ${C.border}`, color:C.muted }}
            onClick={() => { setView("requestHelp"); setReqSent(false); setReqFiles([]); }}>
            {t.requestHelpBtn}
          </button>
        </div>
      </div>
    </PageWrap>
  );

  // ─── VIEW: login ───────────────────────────────────────────────────────────
  if (view === "login") return (
    <PageWrap isRTL={isRTL}>
      <div style={CARD}>
        <div style={{ fontFamily: isRTL?"'Amiri',serif":"'Cinzel',serif", fontSize:F.xl, fontWeight:700, color:C.text, marginBottom:"20px", letterSpacing: isRTL?"0":"0.06em" }}>
          {t.signInToAccount}
        </div>
        <div style={{ background:"rgba(212,169,110,0.08)", border:`1px solid rgba(212,169,110,0.25)`, borderRadius:"8px", padding:"11px 14px", fontSize:F.sm, color:C.gold, marginBottom:"20px", lineHeight:1.7 }}>
          {t.demoHint}
        </div>
        <Err msg={loginError} />
        <form onSubmit={handleLogin} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
          <div>
            <label style={LBL}>{t.email}</label>
            <input type="email" required autoComplete="email" value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)} style={INPUT} />
          </div>
          <div>
            <label style={LBL}>{t.password}</label>
            <input type="password" required value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)} style={INPUT} />
          </div>
          <button type="submit" style={PRIMARY()}>{t.signIn}</button>
        </form>
        {googleSignInEnabled && (
          <>
            <div style={{ display:"flex", alignItems:"center", gap:"10px", marginTop:"16px", marginBottom:"14px" }}>
              <div style={{ flex:1, height:"1px", background:C.border }} />
              <span style={{ fontSize:F.sm, color:C.muted, textTransform:"uppercase", letterSpacing:"0.08em" }}>or</span>
              <div style={{ flex:1, height:"1px", background:C.border }} />
            </div>
            <GoogleSignInButton
              width={320}
              disabled={googleSigningIn}
              onCredential={handleGoogleLogin}
              onError={(msg) => setLoginError(msg)}
            />
            {googleSigningIn && (
              <div style={{ marginTop:"10px", fontSize:F.sm, color:C.muted }}>Signing in with Google...</div>
            )}
          </>
        )}
        <div style={{ marginTop:"16px", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:"8px" }}>
          <button style={GHOST} onClick={() => setView("home")}>{t.back}</button>
          <button style={{ ...GHOST, color:C.gold }} onClick={() => { setForgotStep(1); setForgotEmail(""); setForgotOtp(""); setForgotOtpSent(false); setForgotError(""); setView("forgotPassword"); }}>
            {t.forgotPasswordLink}
          </button>
        </div>
      </div>
    </PageWrap>
  );

  // ─── VIEW: register ────────────────────────────────────────────────────────
  if (view === "register") return (
    <PageWrap isRTL={isRTL}>
      <div style={{ ...CARD, maxWidth:"500px" }}>
        <div style={{ fontFamily: isRTL?"'Amiri',serif":"'Cinzel',serif", fontSize:F.xl, fontWeight:700, color:C.text, marginBottom:"6px" }}>
          {t.createAccountTitle}
        </div>
        <div style={{ fontSize:F.sm, color:C.muted, marginBottom:"20px" }}>
          {t.step} {regStep} {t.of} 3 <StepDots current={regStep} total={3} />
        </div>

        {/* Step 1: email */}
        {regStep === 1 && (
          <form onSubmit={handleSendOtp} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <p style={{ fontSize:F.base, color:C.muted }}>{t.enterEmailStep}</p>
            <Err msg={regEmailError} />
            <div>
              <label style={LBL}>{t.email}</label>
              <input type="email" required value={regEmail}
                onChange={e => { setRegEmail(e.target.value); setOtpSent(false); setRegEmailError(""); }}
                style={INPUT} />
            </div>
            {!otpSent ? (
              <button type="submit" style={PRIMARY(otpLoading)} disabled={otpLoading}>
                {otpLoading ? t.sending : t.sendCode}
              </button>
            ) : (
              <>
                <div style={{ background:"rgba(212,169,110,0.08)", border:`1px solid rgba(212,169,110,0.2)`, borderRadius:"8px", padding:"11px 14px", fontSize:F.base, color:C.gold }}>
                  {t.codeSentTo}: <strong>{regEmail}</strong>
                </div>
                <div style={{ background:"rgba(90,90,130,0.15)", border:"1px solid #3a3a5a", borderRadius:"8px", padding:"9px 13px", fontSize:F.base, color:"#9090bb", textAlign:"center" }}>
                  {t.demoOtpHint}
                </div>
                <Err msg={otpError} />
                <div>
                  <label style={LBL}>{t.enterCode}</label>
                  <input type="text" maxLength={6} placeholder="• • • • • •"
                    value={regOtp} onChange={e => { setRegOtp(e.target.value.replace(/\D/g,"")); setOtpError(""); }}
                    style={{ ...INPUT, textAlign:"center", fontSize:"28px", letterSpacing:"0.4em", fontFamily:"monospace" }} />
                </div>
                <button type="button" style={PRIMARY(regOtp.length<6)} disabled={regOtp.length<6} onClick={handleVerifyOtp}>
                  {t.verifyCode}
                </button>
              </>
            )}
            <button type="button" style={GHOST} onClick={() => setView("home")}>{t.back}</button>
          </form>
        )}

        {/* Step 3: account details */}
        {regStep === 3 && (
          <form onSubmit={handleCreateAccount} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <Err msg={regError} />
            <div><label style={LBL}>{t.fullName}</label><input type="text" required value={regName} onChange={e=>setRegName(e.target.value)} style={INPUT} /></div>
            <div><label style={LBL}>{t.password}</label><input type="password" required value={regPassword} onChange={e=>setRegPassword(e.target.value)} style={INPUT} /></div>
            <div><label style={LBL}>{t.confirmPassword}</label><input type="password" required value={regConfirm} onChange={e=>setRegConfirm(e.target.value)} style={INPUT} /></div>
            <div style={{ border:`1px solid rgba(212,169,110,0.25)`, borderRadius:"10px", padding:"18px", background:"rgba(212,169,110,0.04)" }}>
              <div style={{ fontFamily: isRTL?"'Amiri',serif":"'Cinzel',serif", fontSize:F.sm, fontWeight:700, letterSpacing:"0.1em", color:C.gold, textTransform:"uppercase", marginBottom:"14px" }}>
                {t.engagementPledge}
              </div>
              <div style={{ marginBottom:"12px" }}>
                <label style={LBL}>{t.totalPledgeAmount}</label>
                <input type="number" min="1" required value={regPledge} onChange={e=>setRegPledge(e.target.value)} style={INPUT} placeholder="e.g. 1000" />
              </div>
              <div>
                <label style={LBL}>{t.engagementEndDate}</label>
                <input type="date" required value={regEndDate} onChange={e=>setRegEndDate(e.target.value)} style={INPUT} />
                <div style={{ fontSize:F.sm, color:C.muted, marginTop:"5px" }}>{t.endDateHint}</div>
              </div>
            </div>
            <button type="submit" style={PRIMARY()}>{t.createAccountBtn}</button>
            <button type="button" style={GHOST} onClick={() => { setRegStep(1); setOtpSent(false); setRegOtp(""); }}>{t.back}</button>
          </form>
        )}
      </div>
    </PageWrap>
  );

  // ─── VIEW: forgotPassword ──────────────────────────────────────────────────
  if (view === "forgotPassword") return (
    <PageWrap isRTL={isRTL}>
      <div style={{ ...CARD, maxWidth:"460px" }}>
        <div style={{ fontFamily: isRTL?"'Amiri',serif":"'Cinzel',serif", fontSize:F.xl, fontWeight:700, color:C.text, marginBottom:"8px" }}>
          {t.forgotPassword}
        </div>
        <p style={{ fontSize:F.base, color:C.muted, marginBottom:"24px" }}>{t.forgotPasswordSubtitle}</p>

        {/* Step 1: email */}
        {forgotStep === 1 && (
          <form onSubmit={handleForgotSendOtp} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <Err msg={forgotError} />
            <div>
              <label style={LBL}>{t.email}</label>
              <input type="email" required value={forgotEmail}
                onChange={e => { setForgotEmail(e.target.value); setForgotOtpSent(false); setForgotError(""); }}
                style={INPUT} />
            </div>
            {!forgotOtpSent ? (
              <button type="submit" style={PRIMARY(forgotLoading)} disabled={forgotLoading}>
                {forgotLoading ? t.sending : t.sendCode}
              </button>
            ) : (
              <>
                <div style={{ background:"rgba(212,169,110,0.08)", border:`1px solid rgba(212,169,110,0.2)`, borderRadius:"8px", padding:"11px 14px", fontSize:F.base, color:C.gold }}>
                  {t.codeSentTo}: <strong>{forgotEmail}</strong>
                </div>
                <div style={{ background:"rgba(90,90,130,0.15)", border:"1px solid #3a3a5a", borderRadius:"8px", padding:"9px 13px", fontSize:F.base, color:"#9090bb", textAlign:"center" }}>
                  {t.demoOtpHint}
                </div>
                <Err msg={forgotError} />
                <div>
                  <label style={LBL}>{t.enterCode}</label>
                  <input type="text" maxLength={6} placeholder="• • • • • •"
                    value={forgotOtp} onChange={e => { setForgotOtp(e.target.value.replace(/\D/g,"")); setForgotError(""); }}
                    style={{ ...INPUT, textAlign:"center", fontSize:"28px", letterSpacing:"0.4em", fontFamily:"monospace" }} />
                </div>
                <button type="button" style={PRIMARY(forgotOtp.length<6)} disabled={forgotOtp.length<6} onClick={handleForgotVerifyOtp}>
                  {t.verifyCode}
                </button>
              </>
            )}
            <button type="button" style={GHOST} onClick={() => setView("login")}>{t.backToSignIn}</button>
          </form>
        )}

        {/* Step 3: new password */}
        {forgotStep === 3 && (
          <form onSubmit={handleForgotSetPassword} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <p style={{ fontSize:F.base, color:C.muted }}>{t.setNewPassword}</p>
            <Err msg={forgotError} />
            <div>
              <label style={LBL}>{t.newPassword}</label>
              <input type="password" required minLength={8} value={forgotNewPwd} onChange={e=>setForgotNewPwd(e.target.value)} style={INPUT} />
            </div>
            <div>
              <label style={LBL}>{t.confirmPassword}</label>
              <input type="password" required value={forgotConfirm} onChange={e=>setForgotConfirm(e.target.value)} style={INPUT} />
            </div>
            <button type="submit" style={PRIMARY()}>{t.resetPassword}</button>
          </form>
        )}

        {/* Step 4: success */}
        {forgotStep === 4 && (
          <div style={{ textAlign:"center" }}>
            <Success msg={t.passwordResetSuccess} />
            <button style={PRIMARY()} onClick={() => {
              setLoginEmail(forgotEmail.trim().toLowerCase());
              setLoginPassword("");
              setView("login");
              setForgotStep(1);
              setForgotEmail("");
              setForgotOtp("");
              setForgotOtpSent(false);
            }}>
              {t.signIn}
            </button>
          </div>
        )}
      </div>
    </PageWrap>
  );

  // ─── VIEW: settings ────────────────────────────────────────────────────────
  if (view === "settings") {
    return (
      <PageWrap isRTL={isRTL}>
        <div style={{ ...CARD, maxWidth:"500px" }}>
          <div style={{ fontFamily: isRTL?"'Amiri',serif":"'Cinzel',serif", fontSize:F.xl, fontWeight:700, color:C.text, marginBottom:"24px" }}>
            {t.profileSettings}
          </div>

          {/* Personal info */}
          <div style={{ fontFamily: isRTL?"'Amiri',serif":"'Cinzel',serif", fontSize:F.sm, fontWeight:700, letterSpacing:"0.1em", color:C.gold, textTransform:"uppercase", marginBottom:"14px" }}>
            {t.personalInfo}
          </div>
          <Success msg={settingsSuccess} />
          <Err msg={settingsError} />
          <form onSubmit={handleSaveName} style={{ display:"flex", flexDirection:"column", gap:"14px", marginBottom:"28px" }}>
            <div>
              <label style={LBL}>{t.fullName}</label>
              <input type="text" required value={settingsName}
                onChange={e => { setSettingsName(e.target.value); setSettingsSuccess(""); setSettingsError(""); }}
                style={INPUT} />
            </div>
            <div>
              <label style={LBL}>{t.email}</label>
              <input type="email" required value={settingsEmail}
                onChange={e => { setSettingsEmail(e.target.value); setSettingsSuccess(""); setSettingsError(""); }}
                style={INPUT} />
            </div>
            <button type="submit" style={{ ...PRIMARY(), width:"auto", padding:"12px 24px" }}>{t.saveChanges}</button>
          </form>

          {/* Change password */}
          <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:"24px" }}>
            <div style={{ fontFamily: isRTL?"'Amiri',serif":"'Cinzel',serif", fontSize:F.sm, fontWeight:700, letterSpacing:"0.1em", color:C.gold, textTransform:"uppercase", marginBottom:"14px" }}>
              {t.changePassword}
            </div>
            <form onSubmit={handleChangePassword} style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
              <div>
                <label style={LBL}>{t.currentPassword}</label>
                <input type="password" required value={currentPwd} onChange={e=>{setCurrentPwd(e.target.value);setSettingsSuccess("");setSettingsError("");}} style={INPUT} />
              </div>
              <div>
                <label style={LBL}>{t.newPassword}</label>
                <input type="password" required minLength={6} value={newPwd} onChange={e=>setNewPwd(e.target.value)} style={INPUT} />
              </div>
              <div>
                <label style={LBL}>{t.confirmPassword}</label>
                <input type="password" required value={confirmPwd} onChange={e=>setConfirmPwd(e.target.value)} style={INPUT} />
              </div>
              <button type="submit" style={{ ...PRIMARY(), width:"auto", padding:"12px 24px" }}>{t.changePassword}</button>
            </form>
          </div>

          <button style={{ ...GHOST, marginTop:"20px" }} onClick={() => setView("dashboard")}>{t.back}</button>
        </div>
      </PageWrap>
    );
  }

  // ─── VIEW: editEngagement ──────────────────────────────────────────────────
  if (view === "editEngagement") {
    const hasEng = !!engagement?.totalPledge;
    return (
      <PageWrap isRTL={isRTL}>
        <div style={{ ...CARD, maxWidth:"460px" }}>
          <div style={{ fontFamily: isRTL?"'Amiri',serif":"'Cinzel',serif", fontSize:F.xl, fontWeight:700, color:C.text, marginBottom:"8px" }}>
            {hasEng ? t.editEngagement : t.addEngagement}
          </div>

          {hasEng && (
            <div style={{ background:"rgba(212,169,110,0.06)", border:`1px solid rgba(212,169,110,0.2)`, borderRadius:"10px", padding:"14px", marginBottom:"20px", fontSize:F.base, color:C.muted }}>
              <span style={{ color:C.gold, fontWeight:700 }}>{t.currentEngagement}: </span>
              ${engagement.totalPledge.toLocaleString()} · {engagement?.endDate?.split('T')[0]}
            </div>
          )}

          <Success msg={engSuccess} />
          <Err msg={engError} />

          <form onSubmit={handleSaveEngagement} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div>
              <label style={LBL}>{t.totalPledgeAmount}</label>
              <input type="number" min="1" required value={engPledge} onChange={e=>setEngPledge(e.target.value)} style={INPUT} placeholder="e.g. 1000" />
            </div>
            <div>
              <label style={LBL}>{t.engagementEndDate}</label>
              <input type="date" required value={engEndDate} onChange={e=>setEngEndDate(e.target.value)} style={INPUT} />
              <div style={{ fontSize:F.sm, color:C.muted, marginTop:"5px" }}>{t.endDateHint}</div>
            </div>
            {hasEng && (
              <div style={{ background:"rgba(212,169,110,0.06)", border:`1px solid rgba(212,169,110,0.2)`, borderRadius:"8px", padding:"11px 14px", fontSize:F.sm, color:C.gold }}>
                ℹ️ {t.engagementSaved.replace("✓ ", "").split(".")[1] || "The admin will be notified of any changes."}
              </div>
            )}
            <button type="submit" style={PRIMARY(!!engSuccess)}>{hasEng ? t.editEngagement : t.addEngagement}</button>
          </form>
          <button style={{ ...GHOST, marginTop:"14px" }} onClick={() => setView("dashboard")}>{t.back}</button>
        </div>
      </PageWrap>
    );
  }

  // ─── VIEW: makePayment ────────────────────────────────────────────────────
  if (view === "makePayment" && currentDonor) {
    const remaining = Math.max(0, (engagement?.totalPledge||0) - payments.reduce((s,p)=>s+p.amount,0));
    return (
      <PageWrap isRTL={isRTL}>
        <div style={{ ...CARD, maxWidth:"480px" }}>
          <div style={{ fontFamily: isRTL?"'Amiri',serif":"'Cinzel',serif", fontSize:F.xl, fontWeight:700, color:C.text, marginBottom:"8px" }}>
            {t.makePayment}
          </div>
          <p style={{ fontSize:F.base, color:C.muted, marginBottom:"24px" }}>{t.makePaymentSubtitle}</p>

          {/* Remaining amount info */}
          {remaining > 0 && (
            <div style={{ background:"rgba(212,169,110,0.07)", border:`1px solid rgba(212,169,110,0.25)`, borderRadius:"10px", padding:"16px 18px", marginBottom:"24px" }}>
              <div style={{ fontSize:F.sm, color:C.muted, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:"4px" }}>{t.remaining}</div>
              <div style={{ fontSize:F.xl, fontWeight:800, color:C.gold }}>${remaining.toLocaleString()}</div>
            </div>
          )}

          {/* Zeffy CTA */}
          <div style={{ marginBottom:"20px" }}>
            <button
              disabled
              style={{
                width:"100%", padding:"18px", borderRadius:"10px", border:"none",
                background:`linear-gradient(135deg, #4a90d9, #357abd)`,
                color:"#fff", fontSize:F.md, fontWeight:800,
                fontFamily:"'Cinzel',serif", letterSpacing:"0.06em", textTransform:"uppercase",
                cursor:"not-allowed", opacity:0.65,
                display:"flex", alignItems:"center", justifyContent:"center", gap:"10px",
              }}
            >
              <span style={{ fontSize:"22px" }}>💳</span>
              <span>{t.payViaZeffy}</span>
            </button>
            <div style={{ textAlign:"center", marginTop:"10px", fontSize:F.sm, color:C.muted }}>
              🔗 {t.zeffyComingSoon}
            </div>
          </div>

          {/* Divider */}
          <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"20px" }}>
            <div style={{ flex:1, height:"1px", background:C.border }} />
            <span style={{ fontSize:F.sm, color:C.muted, whiteSpace:"nowrap" }}>{t.orAlternatively}</span>
            <div style={{ flex:1, height:"1px", background:C.border }} />
          </div>

          {/* Submit receipt fallback */}
          <button
            onClick={() => {
              setReqType("payment_upload");
              setReqName(currentDonor.name); setReqEmail(currentDonor.email);
              setReqMessage(""); setReqFiles([]); setReqSent(false);
              setView("requestHelp");
            }}
            style={{
              ...PRIMARY(), background:"transparent",
              border:`1px solid ${C.gold}`, color:C.gold,
            }}
          >
            📄 {t.submitPaymentReceipt}
          </button>

          <button style={{ ...GHOST, marginTop:"14px" }} onClick={() => setView("dashboard")}>{t.back}</button>
        </div>
      </PageWrap>
    );
  }

  // ─── VIEW: requestHelp ─────────────────────────────────────────────────────
  if (view === "requestHelp") return (
    <PageWrap isRTL={isRTL}>
      <div style={{ ...CARD, maxWidth:"520px" }}>
        <div style={{ fontFamily: isRTL?"'Amiri',serif":"'Cinzel',serif", fontSize:F.xl, fontWeight:700, color:C.text, marginBottom:"8px" }}>
          {t.requestHelpTitle}
        </div>
        <p style={{ fontSize:F.base, color:C.muted, marginBottom:"24px" }}>{t.requestHelpSubtitle}</p>

        {reqSent ? (
          <Success msg={t.requestSent} />
        ) : (
          <form onSubmit={handleSendRequest} style={{ display:"flex", flexDirection:"column", gap:"16px" }}>
            <div><label style={LBL}>{t.yourName}</label><input type="text" required value={reqName} onChange={e=>setReqName(e.target.value)} style={INPUT} /></div>
            <div><label style={LBL}>{t.yourEmail}</label><input type="email" required value={reqEmail} onChange={e=>setReqEmail(e.target.value)} style={INPUT} /></div>
            <div>
              <label style={LBL}>{t.requestType}</label>
              <select value={reqType} onChange={e=>setReqType(e.target.value)} style={{ ...INPUT, appearance:"none" }}>
                <option value="account_creation">{t.typeAccountCreation}</option>
                <option value="payment_upload">{t.typePaymentUpload}</option>
                <option value="other">{t.typeOther}</option>
              </select>
            </div>
            <div>
              <label style={LBL}>{t.yourMessage}</label>
              <textarea required rows={4} value={reqMessage} onChange={e=>setReqMessage(e.target.value)} style={{ ...INPUT, resize:"vertical", lineHeight:"1.6" }} />
            </div>

            {/* File attachments */}
            <div>
              <label style={LBL}>{t.attachFiles}</label>
              <div style={{ fontSize:F.sm, color:C.muted, marginBottom:"8px" }}>{t.attachFilesHint}</div>
              <label style={{
                display:"flex", alignItems:"center", gap:"8px", padding:"11px 16px",
                border:`1px dashed ${C.border}`, borderRadius:"8px", cursor:"pointer",
                fontSize:F.base, color:C.muted, background:C.surf2,
              }}>
                <span>📎</span>
                <span>{t.attachFiles}</span>
                <input type="file" multiple style={{ display:"none" }} onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx" />
              </label>
              {reqFiles.length > 0 && (
                <div style={{ marginTop:"10px", display:"flex", flexDirection:"column", gap:"6px" }}>
                  {reqFiles.map((f,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 12px", background:C.surf2, border:`1px solid ${C.border}`, borderRadius:"7px", fontSize:F.sm, color:C.muted }}>
                      <span>📄 {f.name} ({(f.size/1024).toFixed(1)} KB)</span>
                      <button type="button" onClick={() => setReqFiles(p=>p.filter((_,j)=>j!==i))}
                        style={{ background:"transparent", border:"none", color:C.danger, cursor:"pointer", fontSize:F.sm }}>
                        {t.removeFile}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" style={PRIMARY()}>{t.sendRequest}</button>
          </form>
        )}
        <button style={{ ...GHOST, marginTop:"16px" }} onClick={() => setView(currentDonor ? "dashboard" : "home")}>{t.back}</button>
      </div>
    </PageWrap>
  );

  // ─── VIEW: dashboard ───────────────────────────────────────────────────────
  if (view === "dashboard" && dashData) {
    const { paid, total, pct, daysLeft, endDate } = dashData;
    const isComplete = paid >= total && total > 0;
    const isOverdue  = daysLeft !== null && daysLeft < 0 && !isComplete;
    const statColor  = isComplete ? C.green : isOverdue ? C.danger : C.gold;

    return (
      <div dir={isRTL?"rtl":"ltr"} style={{ flex:1, overflowY:"auto", padding:"32px 20px", fontFamily: isRTL?"'Amiri',serif":"'Cormorant Garamond',serif" }}>
        <style>{FONTS}</style>
        <div style={{ maxWidth:"740px", margin:"0 auto" }}>

          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"28px", flexWrap:"wrap", gap:"12px" }}>
            <div>
              <div style={{ fontFamily: isRTL?"'Amiri',serif":"'Cinzel',serif", fontSize:F.xxl, fontWeight:700, color:C.text, letterSpacing: isRTL?"0":"0.04em" }}>
                {t.welcomeBack(currentDonor.name)}
              </div>
              <div style={{ fontSize:F.base, color:C.muted, marginTop:"5px" }}>{currentDonor.email}</div>
            </div>
            <div style={{ display:"flex", gap:"8px", flexWrap:"wrap" }}>
              {[
                { label:t.settings,     fn:() => { setSettingsError(""); setSettingsSuccess(""); setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); setView("settings"); } },
                { label:t.contactAdmin, fn:() => { setView("requestHelp"); setReqSent(false); setReqEmail(currentDonor.email); setReqName(currentDonor.name); setReqFiles([]); } },
                { label:t.signOut,      fn:handleSignOut, danger:true },
              ].map(btn => (
                <button key={btn.label} onClick={btn.fn} style={{
                  padding:"9px 16px", borderRadius:"8px", border:`1px solid ${btn.danger?C.danger:C.border}`,
                  background:"transparent", color: btn.danger?C.danger:C.muted,
                  cursor:"pointer", fontSize:F.base, fontFamily:"inherit",
                }}>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Engagement card */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"16px", padding:"28px", marginBottom:"20px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px", flexWrap:"wrap", gap:"10px" }}>
              <div style={{ fontFamily: isRTL?"'Amiri',serif":"'Cinzel',serif", fontSize:F.base, fontWeight:700, letterSpacing:"0.1em", color:C.gold, textTransform:"uppercase" }}>
                {t.yourEngagement}
              </div>
              <button onClick={openEditEngagement} style={{
                padding:"8px 16px", borderRadius:"8px",
                border:`1px solid ${C.gold}55`, background:"rgba(212,169,110,0.08)",
                color:C.gold, cursor:"pointer", fontSize:F.sm, fontFamily:"inherit", fontWeight:700,
              }}>
                {total > 0 ? t.editEngagementBtn : t.addEngagementBtn}
              </button>
            </div>

            {total === 0 ? (
              <div style={{ textAlign:"center", padding:"20px 0", color:C.muted, fontSize:F.base }}>{t.noEngagement}</div>
            ) : (
              <>
                {(isComplete || isOverdue) && (
                  <div style={{ display:"inline-block", padding:"5px 16px", borderRadius:"20px", background:`${statColor}1a`, border:`1px solid ${statColor}55`, color:statColor, fontSize:F.base, fontWeight:700, marginBottom:"20px" }}>
                    {isComplete ? t.completed : t.overdue}
                  </div>
                )}
                <div style={{ display:"flex", alignItems:"center", gap:"32px", flexWrap:"wrap" }}>
                  <div style={{ flexShrink:0 }}>
                    <CircularProgress percentage={pct} paidAmount={paid} totalAmount={total} color={statColor} />
                  </div>
                  <div style={{ flex:1, minWidth:"180px" }}>
                    <div style={{ display:"flex", gap:"10px", flexWrap:"wrap", marginBottom:"16px" }}>
                      <StatCard label={t.totalPledge}  value={`$${total.toLocaleString()}`} />
                      <StatCard label={t.paidSoFar}    value={`$${paid.toLocaleString()}`} color={statColor} />
                      <StatCard label={t.remaining}    value={`$${Math.max(0,total-paid).toLocaleString()}`} />
                    </div>
                    <div style={{ background:C.surf2, border:`1px solid ${C.border}`, borderRadius:"10px", padding:"15px 17px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"8px", fontSize:F.base, color:C.muted }}>
                        <span>{t.dueDate}</span>
                        <span style={{ color:C.text, fontWeight:700 }}>{endDate}</span>
                      </div>
                      <div style={{ fontSize:F.base, color:statColor, fontWeight:700, marginBottom:"10px" }}>
                        {isOverdue ? t.overdue : isComplete ? t.completed : (daysLeft !== null ? t.daysLeft(daysLeft) : "")}
                      </div>
                      <div style={{ background:C.border, borderRadius:"4px", height:"6px", overflow:"hidden" }}>
                        <div style={{ width:`${Math.min(pct,100)}%`, height:"100%", background:statColor, borderRadius:"4px", transition:"width 1s ease" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Payment history */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:"16px", padding:"24px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"16px", flexWrap:"wrap", gap:"10px" }}>
              <div style={{ fontFamily: isRTL?"'Amiri',serif":"'Cinzel',serif", fontSize:F.base, fontWeight:700, letterSpacing:"0.1em", color:C.gold, textTransform:"uppercase" }}>
                {t.paymentHistory}
              </div>
              {!isComplete && (
                <button onClick={() => setView("makePayment")} style={{
                  padding:"10px 22px", borderRadius:"8px", border:"none",
                  background:`linear-gradient(135deg, ${C.gold}, #e8c47a)`,
                  color:"#000", cursor:"pointer", fontSize:F.sm,
                  fontFamily:"'Cinzel',serif", fontWeight:800,
                  letterSpacing:"0.06em", textTransform:"uppercase",
                  boxShadow:`0 2px 12px rgba(212,169,110,0.35)`,
                  transition:"opacity 0.18s",
                }}>
                  💳 {t.makePayment}
                </button>
              )}
            </div>
            {payments.length === 0 ? (
              <div style={{ fontSize:F.base, color:C.muted, textAlign:"center", padding:"20px 0" }}>{t.noPayments}</div>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:F.base }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${C.border}` }}>
                      {[t.date,t.amount,t.method,t.note].map(h => (
                        <th key={h} style={{ textAlign: isRTL?"right":"left", padding:"9px 13px", color:C.muted, fontSize:F.sm, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...payments].sort((a,b) => new Date(b.date)-new Date(a.date)).map(p => (
                      <tr key={p.id} style={{ borderBottom:`1px solid rgba(46,50,80,0.5)` }}>
                        <td style={{ padding:"11px 13px", color:C.text }}>{p.date}</td>
                        <td style={{ padding:"11px 13px", color:C.green, fontWeight:700 }}>${p.amount.toLocaleString()}</td>
                        <td style={{ padding:"11px 13px" }}>
                          <span style={{ padding:"4px 11px", borderRadius:"12px", fontSize:F.sm, fontWeight:700,
                            background: p.method==="zeffy"?"rgba(138,174,212,0.15)":"rgba(212,169,110,0.15)",
                            color: p.method==="zeffy"?C.blue:C.gold }}>
                            {p.method==="zeffy"?t.zeffy:t.cash}
                          </span>
                        </td>
                        <td style={{ padding:"11px 13px", color:C.muted, fontSize:F.base }}>{p.note||"—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
