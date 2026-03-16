'use client';

// ─────────────────────────────────────────────
// Donor Dashboard — written from scratch
// Backup of previous version: page.jsx.backup
// ─────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SitePreloader from '@/components/SitePreloader.jsx';
import { useTranslation, useThemeMode } from '@/hooks/index.js';
import { useFirstVisitPreloader } from '@/hooks/useFirstVisitPreloader.js';
import { THEMES } from '@/constants/config.js';
import { setupSEOMetaTags } from '@/lib/seoUtils.js';
import { getAbsoluteUrl, getSiteUrl, truncateText, TRANSLATION_MODULES } from '@/lib/translationUtils.js';
import {
    createEngagement, getMe, getMyPayments, getMyRequests,
    updateEngagement, updateMe, updateMyPassword,
} from '@/lib/donorApi.js';
import { createRequest, uploadRequestAttachments } from '@/lib/requestsApi.js';
import { clearTokens, tryAutoLogin } from '@/lib/auth.js';
import { clearStoredSession, getStoredSession, setStoredSession } from '@/lib/session.js';
import { getApiBaseUrl } from '@/lib/apiClient.js';

// ─────────────────────────────────────────────
// Tiny reusable SVG icon
// ─────────────────────────────────────────────
function Ico({ size = 16, children }) {
    return (
        <svg
            width={size} height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ display: 'block', flexShrink: 0 }}
        >
            {children}
        </svg>
    );
}

// ─────────────────────────────────────────────
// Donor i18n fallback (English) — module-level constant
// ─────────────────────────────────────────────
const EN_DONOR = {
    welcome:         'Welcome',
    settings:        'Settings',
    contactAdmin:    'Contact admin',
    logout:          'Log out',
    engTitle:        'Your engagement',
    editEng:         'Edit engagement',
    historyTitle:    'Payment history',
    makePayment:     'Make a payment',
    paid:            'Paid so far',
    pledged:         'Total pledged',
    remaining:       'Remaining',
    deadline:        'Deadline',
    daysLeft:        'days remaining',
    stateInProgress: 'Engagement in progress',
    stateOverdue:    'Engagement overdue',
    stateCompleted:  'Engagement completed',
    chipInProgress:  'In progress',
    chipOverdue:     'Overdue',
    chipCompleted:   'Completed',
    noPayments:      'No payments recorded yet.',
    profile:         'Profile',
    password:        'Password',
    saveProfile:     'Save profile',
    updatePwd:       'Update password',
    curPwd:          'Current password',
    newPwd:          'New password',
    confPwd:         'Confirm password',
    pledgeAmt:       'Pledge amount ($)',
    updateEng:       'Update engagement',
    createEng:       'Create engagement',
    reqType:         'Request type',
    message:         'Message',
    yourName:        'Your name',
    yourEmail:       'E-mail',
    payViaZeffy:     'Pay via Zeffy',
    submitCash:      'Submit cash receipt',
    amount:          'Amount ($)',
    note:            'Note',
    sendReq:         'Send request',
    attachFiles:     'Attach files (optional)',
    zeffySoon:       'Once your Zeffy payment is completed, it will be reflected in your dashboard within a few minutes.',
    payDesc:         'Pay online or submit a cash payment receipt.',
    payZeffyNote:    'Your payment will appear here automatically within a few minutes after completion.',
    zeffyBtnLabel:   'Pay via Zeffy (new tab)',
    contactDesc:     'Send us a message for support or any question.',
    cashOk:          'Cash payment request submitted.',
    pwdMismatch:     'Passwords do not match.',
    colDate:         'Date',
    colAmount:       'Amount',
    colMethod:       'Method',
    colNote:         'Note',
    colReceipt:      'Receipt',
    adminNote:       'Note for admin',
    personalNote:    'Personal note',
    viewReceipt:     'View receipt',
    personalNotePh:  'Note visible only to you in your payment history',
    adminNotePh:     'Message for the admin team',
    or:              'or',
    name:            'Name',
    reqGeneral:      'General request',
    reqPayment:      'Payment upload',
    reqEngagement:   'Engagement change',
    reqAccount:      'Account help',
    // Success messages
    profileUpdated:  'Profile updated successfully.',
    passwordUpdated: 'Password updated successfully.',
    engUpdated:      'Engagement updated successfully.',
    reqSubmitted:    'Request submitted successfully.',
    // Error messages
    invalidAmount:   'Please enter a valid amount.',
    invalidPledge:   'Please enter a valid pledge amount.',
    invalidDate:     'Please enter a valid date (YYYY-MM-DD).',
    errUpdateProfile: 'Unable to update profile.',
    errUpdatePassword:'Unable to update password.',
    errUpdateEng:    'Unable to update engagement.',
    errSubmitReq:    'Unable to submit request.',
    errSubmitCash:   'Unable to submit cash payment.',
    // Pending payments
    pendingBadge:    'Pending',
    pendingInfo:     'Awaiting admin confirmation — you can edit or cancel this submission.',
    editPayment:     'Edit',
    cancelPayment:   'Cancel',
    confirmCancel:   'Are you sure you want to cancel this pending payment?',
    paymentCancelled:'Pending payment cancelled.',
    paymentUpdated:  'Pending payment updated.',
    chooseMethod:    'How would you like to pay?',
    payByCash:       'Cash / Interac',
    cashGuidance:    'To help us validate your payment, please include: your name on the envelope (cash), or the Interac transaction number / a screenshot of the transfer.',
    backToMethod:    '← Back',
};

// ─────────────────────────────────────────────
// Engagement-state colour tokens
// ─────────────────────────────────────────────
const STATE_COLORS = {
    'in-progress': { fg: '#e8a44a', bg: 'rgba(232,164,74,.13)', border: 'rgba(232,164,74,.32)' },
    overdue:       { fg: '#e46767', bg: 'rgba(228,103,103,.13)', border: 'rgba(228,103,103,.32)' },
    completed:     { fg: '#5cc8a0', bg: 'rgba(92,200,160,.13)', border: 'rgba(92,200,160,.32)' },
};

// ─────────────────────────────────────────────
// Modal wrapper (shared by all 4 modals)
// ─────────────────────────────────────────────
function Modal({ title, description, onClose, children }) {
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div
            className="overlay"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="modal">
                <div className="modal-hd">
                    <h3 className="modal-ttl">{title}</h3>
                    <button type="button" className="modal-x" onClick={onClose} aria-label="Close">&times;</button>
                </div>
                {description && <p className="modal-desc">{description}</p>}
                <div className="modal-bd">{children}</div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────
export default function DonorDashboardPage() {
    const router = useRouter();
    const langDropRef = useRef(null);

    const { language, setLanguage, t, isMounted: tMounted } = useTranslation();
    const { themeMode, setThemeMode, isMounted: themeMounted } = useThemeMode();
    const theme = THEMES[themeMode] ?? THEMES.dark;
    const [showLangMenu, setShowLangMenu] = useState(false);
    const isRTL = ['ar', 'ur'].includes(language);

    // ── Remote data ──
    const [profile,  setProfile]  = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading,  setLoading]  = useState(true);

    // ── UI feedback ──
    const [error,   setError]   = useState('');
    const [success, setSuccess] = useState('');

    // ── Active modal: null | 'settings' | 'engagement' | 'payment' | 'contact' ──
    const [modal, setModal] = useState(null);

    // ── Form state ──
    const [profileForm,    setProfileForm]    = useState({ name: '', email: '' });
    const [passwordForm,   setPasswordForm]   = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [engForm,        setEngForm]        = useState({ totalPledge: '', endDate: '' });
    const [contactForm,    setContactForm]    = useState({ type: 'other', message: '' });
    const [cashForm,       setCashForm]       = useState({ amount: '', adminNote: '', personalNote: '' });
    const [attachedFiles,  setAttachedFiles]  = useState([]);
    const [payStep,        setPayStep]        = useState(null); // null | 'zeffy' | 'cash'
    const [pendingPayments,setPendingPayments]= useState([]);
    const [editingPendingId,setEditingPendingId]=useState(null);
    // receipt cache: { "100.00": [{id, requestId, filename, mimeType}] }
    // populated when a pending payment transitions to confirmed so the link survives
    const [paymentReceipts,setPaymentReceipts]= useState({});

    const appReady = tMounted && themeMounted;
    const { shouldShowPreloader, isResolved: preloaderResolved } = useFirstVisitPreloader(appReady);

    // ── SEO ──
    const siteUrl    = getSiteUrl();
    const pageUrl    = getAbsoluteUrl(`/donor/dashboard?lang=${language}`, siteUrl);
    const socialImg  = getAbsoluteUrl('/logo-ccai.png', siteUrl);
    const pageTitle  = `Donor Dashboard | ${t.centerName || 'Centre Zad Al-Imane'}`;
    const pageDesc   = truncateText('Manage your donor profile, engagement, payments, and support requests.');

    // ── i18n labels ──
    // Read directly from the imported ES module (bypasses the 30-day localStorage
    // translation cache, which may not yet contain the donor section).
    const ui = useMemo(
        () => ({ ...EN_DONOR, ...(TRANSLATION_MODULES[language]?.donor ?? {}) }),
        [language],
    );

    // ── SEO side-effect ──
    useEffect(() => {
        if (!tMounted) return;
        setupSEOMetaTags({
            language, isRTL, pageTitle, pageDescription: pageDesc, pageUrl,
            socialImageUrl: socialImg,
            logoAlt: `${t.centerName || 'Centre Zad Al-Imane'} logo`,
            locale: t.locale ?? language, siteUrl, t,
            pagePath: '/donor/dashboard', pageType: 'profile',
        });
    }, [tMounted, language, isRTL, pageTitle, pageDesc, pageUrl, socialImg, siteUrl, t]);

    // ── Bootstrap ──
    // No hydratedRef guard here: Next.js can reuse a cached component instance
    // after navigation (login → dashboard → logout → login → dashboard), so a
    // ref that stays `true` would permanently block boot() from running again.
    // The `alive` flag is enough to cancel in-flight state updates on unmount /
    // React Strict Mode double-invoke.
    useEffect(() => {
        let alive = true;

        async function boot() {
            const session = getStoredSession();
            if (!session || session.role !== 'donor') {
                if (alive) setLoading(false);
                router.replace('/login');
                return;
            }
            try {
                const ok = await tryAutoLogin();
                if (!ok) {
                    clearTokens(); clearStoredSession();
                    if (alive) setError('Session expired. Please log in again.');
                    router.replace('/login');
                    return;
                }
                const [me, myPayments] = await Promise.all([
                    getMe(), getMyPayments(), getMyRequests(),
                ]);
                if (!alive) return;
                setProfile(me);
                setPayments(myPayments);
                setProfileForm({ name: me.name || '', email: me.email || '' });
                // ── Receipt cache ──────────────────────────────────────────
                // Persists attachment links for cash payments after the admin
                // confirms them (at that point the pending entry is cleared from
                // localStorage, so we transfer the attachment data here).
                // Format: { "100.00": [{id, requestId, filename, mimeType}] }
                const receiptKey = `receipts_${me.email}`;
                let receiptCache = {};
                try {
                    const rcRaw = localStorage.getItem(receiptKey);
                    if (rcRaw) receiptCache = JSON.parse(rcRaw);
                } catch { /* ignore */ }

                // ── Pending payments ────────────────────────────────────────
                // Load locally-stored pending payments and auto-clear any that
                // the admin has already confirmed (matched by cash amount).
                try {
                    const pendingKey = `pending_pmts_${me.email}`;
                    const raw = localStorage.getItem(pendingKey);
                    if (raw) {
                        const stored = JSON.parse(raw);
                        // Keep only pending entries that have no matching confirmed payment.
                        // We match on amount + cash method only — we deliberately skip a
                        // date check because the admin often records the payment with the
                        // actual cash-received date, which can be earlier than the donor's
                        // digital submission timestamp.
                        const stillPending = stored.filter(pp => {
                            return !myPayments.some(cp => {
                                const isCash = methodInfo(cp.method).key === 'cash';
                                const sameAmt = Math.abs(Number(cp.amount) - Number(pp.amount)) < 0.01;
                                return isCash && sameAmt;
                            });
                        });
                        if (stillPending.length !== stored.length) {
                            // Transfer attachment data from newly-confirmed entries into the
                            // receipt cache so the confirmed payment row can still show the link.
                            const nowConfirmed = stored.filter(pp => !stillPending.includes(pp));
                            let cacheUpdated = false;
                            nowConfirmed.forEach(pp => {
                                if (pp.attachments?.length > 0) {
                                    const key = Number(pp.amount).toFixed(2);
                                    // Don't overwrite an existing entry for this amount
                                    if (!receiptCache[key]) {
                                        receiptCache[key] = pp.attachments;
                                        cacheUpdated = true;
                                    }
                                }
                            });
                            if (cacheUpdated) {
                                try { localStorage.setItem(receiptKey, JSON.stringify(receiptCache)); } catch { /* ignore */ }
                            }
                            localStorage.setItem(pendingKey, JSON.stringify(stillPending));
                        }
                        setPendingPayments(stillPending);
                    }
                } catch { /* ignore */ }
                setPaymentReceipts(receiptCache);
                setEngForm({
                    totalPledge: me.engagement?.totalPledge ? String(me.engagement.totalPledge) : '',
                    endDate:     me.engagement?.endDate ? String(me.engagement.endDate).slice(0, 10) : '',
                });
                setStoredSession({ ...session, ...me, role: 'donor' });
            } catch (err) {
                if (!alive) return;
                clearTokens(); clearStoredSession();
                setError(err?.message || 'Unable to load dashboard.');
                router.replace('/login');
            } finally {
                if (alive) setLoading(false);
            }
        }

        boot();
        return () => { alive = false; };
    }, [router]); // run once per mount for a stable router instance

    // ── Derived engagement metrics ──
    const totalPaid   = useMemo(() => payments.reduce((s, p) => s + Number(p.amount || 0), 0), [payments]);
    const engTarget   = Number(profile?.engagement?.totalPledge || 0);
    const pct         = engTarget > 0 ? Math.min(100, Math.round((totalPaid / engTarget) * 100)) : 0;
    const remaining   = Math.max(0, engTarget - totalPaid);
    const endDate     = profile?.engagement?.endDate ? new Date(profile.engagement.endDate) : null;
    const daysLeft    = endDate ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000)) : 0;
    const startDate   = profile?.engagement?.createdAt ? new Date(profile.engagement.createdAt) : null;
    const totalDays   = (startDate && endDate) ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000)) : 0;
    const elapsed     = totalDays > 0 ? Math.max(0, totalDays - daysLeft) : 0;
    const timePct     = totalDays > 0 ? Math.min(100, Math.round((elapsed / totalDays) * 100)) : 0;

    const isDone    = engTarget > 0 && pct >= 100;
    const isLate    = !isDone && endDate && endDate.getTime() < Date.now();
    const stateKey  = isDone ? 'completed' : isLate ? 'overdue' : 'in-progress';
    const sc        = STATE_COLORS[stateKey];
    const chipLabel = { 'in-progress': ui.chipInProgress, overdue: ui.chipOverdue, completed: ui.chipCompleted }[stateKey];
    const stateLabel = { 'in-progress': ui.stateInProgress, overdue: ui.stateOverdue, completed: ui.stateCompleted }[stateKey];

    // SVG ring
    const R   = 66;
    const C   = 2 * Math.PI * R;
    const dashOffset = C * (1 - pct / 100);

    // ── Helpers ──
    function fmtDate(v) {
        if (!v) return '—';
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
    }

    function methodInfo(method) {
        const s = String(method || '').toLowerCase();
        const isCard = s.includes('zeffy') || s.includes('card') || s.includes('stripe');
        return isCard ? { key: 'card', label: 'Zeffy' } : { key: 'cash', label: 'Cash' };
    }

    // ── Pending-payment localStorage helpers ──
    function savePendingToStorage(list) {
        if (!profile?.email) return;
        try { localStorage.setItem(`pending_pmts_${profile.email}`, JSON.stringify(list)); } catch { /* ignore */ }
    }
    function deletePendingPayment(id) {
        if (!window.confirm(ui.confirmCancel)) return;
        const updated = pendingPayments.filter(p => p.id !== id);
        setPendingPayments(updated);
        savePendingToStorage(updated);
        setSuccess(ui.paymentCancelled);
    }
    function openEditPending(pmt) {
        setEditingPendingId(pmt.id);
        setCashForm({ amount: String(pmt.amount), adminNote: pmt.adminNote || '', personalNote: pmt.personalNote || '' });
        setAttachedFiles([]);
        setPayStep('cash');
        setModal('payment');
    }

    // ── Modal actions ──
    function closeModal() { setModal(null); setError(''); setSuccess(''); setEditingPendingId(null); setPayStep(null); }

    function openSettings()   { setModal('settings'); }
    function openContact(type = 'other') { setContactForm(p => ({ ...p, type })); setModal('contact'); }
    function openEngagement() {
        setEngForm({
            totalPledge: profile?.engagement?.totalPledge ? String(profile.engagement.totalPledge) : '',
            endDate:     profile?.engagement?.endDate     ? String(profile.engagement.endDate).slice(0, 10) : '',
        });
        setModal('engagement');
    }
    function openPayment() {
        setEditingPendingId(null);
        setCashForm({ amount: '100', adminNote: '', personalNote: '' });
        setAttachedFiles([]);
        setPayStep(null);
        setModal('payment');
    }

    function handleLogout() { clearTokens(); clearStoredSession(); router.replace('/login'); }

    // ── Form handlers ──
    async function onProfileSave(e) {
        e.preventDefault(); setError(''); setSuccess('');
        try {
            const up = await updateMe({ name: profileForm.name.trim(), email: profileForm.email.trim().toLowerCase() });
            setProfile(p => ({ ...p, ...up }));
            setStoredSession({ ...(getStoredSession() || {}), ...up, role: 'donor' });
            setSuccess(ui.profileUpdated);
        } catch (err) { setError(err?.message || ui.errUpdateProfile); }
    }

    async function onPasswordSave(e) {
        e.preventDefault(); setError(''); setSuccess('');
        if (passwordForm.newPassword !== passwordForm.confirmPassword) { setError(ui.pwdMismatch); return; }
        try {
            await updateMyPassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setSuccess(ui.passwordUpdated);
        } catch (err) { setError(err?.message || ui.errUpdatePassword); }
    }

    async function onEngSave(e) {
        e.preventDefault(); setError(''); setSuccess('');
        if (!engForm.totalPledge || Number(engForm.totalPledge) <= 0) {
            setError(ui.invalidPledge); return;
        }
        if (engForm.endDate) {
            const parsed = new Date(engForm.endDate);
            if (isNaN(parsed.getTime())) {
                setError(ui.invalidDate); return;
            }
        }
        const body = {
            totalPledge: Number(engForm.totalPledge),
            endDate: engForm.endDate ? new Date(engForm.endDate).toISOString() : null,
        };
        try {
            const up = profile?.engagement
                ? await updateEngagement(body)
                : await createEngagement({ totalPledge: body.totalPledge, ...(body.endDate ? { endDate: body.endDate } : {}) });
            setProfile(p => ({ ...p, engagement: up }));
            setSuccess(ui.engUpdated);
        } catch (err) { setError(err?.message || ui.errUpdateEng); }
    }

    async function onContactSend(e) {
        e.preventDefault(); setError(''); setSuccess('');
        try {
            await createRequest({ type: contactForm.type, name: profile?.name || '', email: profile?.email || '', message: contactForm.message.trim() });
            setContactForm({ type: 'other', message: '' });
            setSuccess(ui.reqSubmitted);
        } catch (err) { setError(err?.message || ui.errSubmitReq); }
    }

    async function onCashPayment(e) {
        e.preventDefault(); setError(''); setSuccess('');
        const amt = Number(cashForm.amount || 0);
        if (!amt || amt <= 0) { setError(ui.invalidAmount); return; }
        const parts = [
            'Cash payment request',
            `Amount: $${amt.toLocaleString()}`,
            cashForm.adminNote ? `Admin note: ${cashForm.adminNote.trim()}` : '',
            cashForm.personalNote ? `Personal note: ${cashForm.personalNote.trim()}` : '',
            attachedFiles.length ? `Files: ${attachedFiles.map(f => f.name).join(', ')}` : '',
        ].filter(Boolean);
        try {
            if (editingPendingId) {
                // Update existing pending payment (no new request sent)
                const updated = pendingPayments.map(p =>
                    p.id === editingPendingId
                        ? { ...p, amount: amt, adminNote: cashForm.adminNote.trim(), personalNote: cashForm.personalNote.trim() }
                        : p
                );
                setPendingPayments(updated);
                savePendingToStorage(updated);
                setSuccess(ui.paymentUpdated);
            } else {
                // New submission — send request to admin + upload files + store locally
                const request = await createRequest({
                    type: 'payment_upload',
                    name: profile?.name || '',
                    email: profile?.email || '',
                    message: parts.join('\n'),
                    personalNote: cashForm.personalNote.trim(),
                });
                // Upload any attached files to the request
                let attachments = [];
                if (attachedFiles.length > 0) {
                    try {
                        attachments = await uploadRequestAttachments(request.id, attachedFiles);
                    } catch (uploadErr) {
                        // Don't block the whole submission if upload fails — warn only
                        console.warn('File upload failed:', uploadErr);
                    }
                }
                const newPending = {
                    id: `pending_${Date.now()}`,
                    requestId: request.id,
                    amount: amt,
                    date: new Date().toISOString(),
                    method: 'cash',
                    status: 'pending',
                    adminNote: cashForm.adminNote.trim(),
                    personalNote: cashForm.personalNote.trim(),
                    // Store enough to build download links later
                    attachments: attachments.map(a => ({
                        id: a.id,
                        requestId: request.id,
                        filename: a.filename,
                        mimeType: a.mimeType,
                    })),
                };
                const updated = [newPending, ...pendingPayments];
                setPendingPayments(updated);
                savePendingToStorage(updated);
                setSuccess(ui.cashOk);
            }
            setCashForm({ amount: '', adminNote: '', personalNote: '' });
            setAttachedFiles([]);
            closeModal();
        } catch (err) { setError(err?.message || ui.errSubmitCash); }
    }

    // ── Preloader ──
    if (!appReady && shouldShowPreloader && preloaderResolved) {
        return (
            <div className="mosque-donation" data-theme="dark" style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
                <SitePreloader title="Centre Zad Al-Imane" subtitle="Loading dashboard" />
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div dir={isRTL ? 'rtl' : 'ltr'} className="mosque-donation" data-theme={themeMode} suppressHydrationWarning>
            <style>{STYLES}</style>

            <Header
                language={language} setLanguage={setLanguage} t={t}
                theme={theme} themeMode={themeMode} setThemeMode={setThemeMode}
                showLanguageMenu={showLangMenu} setShowLanguageMenu={setShowLangMenu}
                languageDropdownRef={langDropRef}
                isLoginPage={false} showHeaderCenter={false}
            />

            <main className="pg-shell">
                {loading ? (
                    <div className="pg-loading" role="status" aria-label="Loading">
                        <span className="pg-spinner" />
                    </div>
                ) : (
                    <div className="pg-cols">

                        {/* ══════════════════════════════════════
                            LEFT NAV
                        ══════════════════════════════════════ */}
                        <nav className="sidenav" aria-label="Donor navigation">
                            <p className="sidenav-label">Menu</p>

                            <button type="button" className="sidenav-btn" onClick={openSettings}>
                                <span className="sidenav-icon">
                                    <Ico size={17}>
                                        <circle cx="12" cy="12" r="3"/>
                                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                                    </Ico>
                                </span>
                                {ui.settings}
                            </button>

                            <button type="button" className="sidenav-btn" onClick={() => openContact('other')}>
                                <span className="sidenav-icon">
                                    <Ico size={17}>
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                                        <polyline points="22,6 12,13 2,6"/>
                                    </Ico>
                                </span>
                                {ui.contactAdmin}
                            </button>

                            <button type="button" className="sidenav-btn sidenav-btn--danger" onClick={handleLogout}>
                                <span className="sidenav-icon">
                                    <Ico size={17}>
                                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                                        <polyline points="16 17 21 12 16 7"/>
                                        <line x1="21" y1="12" x2="9" y2="12"/>
                                    </Ico>
                                </span>
                                {ui.logout}
                            </button>
                        </nav>

                        {/* ══════════════════════════════════════
                            CONTENT
                        ══════════════════════════════════════ */}
                        <div className="content">

                            {/* Welcome header */}
                            <header className="welcome">
                                <h1 className="welcome-name">
                                    {ui.welcome}, <span className="welcome-highlight">{profile?.name || profile?.email || ''}</span>
                                </h1>
                                
                            </header>

                            {/* Global feedback banners */}
                            {error   && <div className="banner banner--error"   role="alert">{error}</div>}
                            {success && <div className="banner banner--success" role="status">{success}</div>}

                            {/* ─────────────────────────────────
                                ENGAGEMENT CARD
                            ───────────────────────────────── */}
                            <section className="card card--eng">

                                {/* Card header row */}
                                <div className="card-hd">
                                    <div className="card-hd-left">
                                        <span className="card-icon">
                                            <Ico size={18}>
                                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                                            </Ico>
                                        </span>
                                        <h2 className="card-title">{ui.engTitle}</h2>
                                    </div>
                                    <div className="card-hd-right">
                                        <span
                                            className="status-chip"
                                            style={{ color: sc.fg, background: sc.bg, borderColor: sc.border }}
                                        >
                                            <span className="status-dot" style={{ background: sc.fg }} />
                                            {chipLabel}
                                        </span>
                                        <button type="button" className="btn btn--ghost" onClick={openEngagement}>
                                            <Ico size={14}>
                                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                            </Ico>
                                            {ui.editEng}
                                        </button>
                                    </div>
                                </div>

                                {/* Ring + metrics grid */}
                                <div className="eng-body">

                                    {/* Circular progress ring */}
                                    <div className="ring-wrap" aria-label={`${pct}% funded`}>
                                        <svg width="190" height="190" viewBox="0 0 160 160" aria-hidden="true">
                                            <defs>
                                                <filter id="ring-glow" x="-25%" y="-25%" width="150%" height="150%">
                                                    <feGaussianBlur stdDeviation="3.5" result="blur"/>
                                                    <feMerge>
                                                        <feMergeNode in="blur"/>
                                                        <feMergeNode in="SourceGraphic"/>
                                                    </feMerge>
                                                </filter>
                                            </defs>
                                            {/* Track */}
                                            <circle className="ring-track" cx="80" cy="80" r={R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="13"/>
                                            {/* Progress */}
                                            <circle
                                                cx="80" cy="80" r={R}
                                                fill="none"
                                                stroke={sc.fg}
                                                strokeWidth="13"
                                                strokeLinecap="round"
                                                strokeDasharray={C}
                                                strokeDashoffset={dashOffset}
                                                transform="rotate(-90 80 80)"
                                                filter="url(#ring-glow)"
                                                style={{ transition: 'stroke-dashoffset .65s cubic-bezier(.4,0,.2,1)' }}
                                            />
                                        </svg>
                                        <div className="ring-center">
                                            <span className="ring-pct" style={{ color: sc.fg }}>{pct}%</span>
                                            <span className="ring-sub">${totalPaid.toLocaleString()} / ${engTarget.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Metrics + deadline */}
                                    <div className="eng-side">

                                        {/* 3 stat tiles */}
                                        <div className="stats-row">
                                            {[
                                                {
                                                    label: ui.pledged,
                                                    value: `$${engTarget.toLocaleString()}`,
                                                    icon: <Ico size={13}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></Ico>,
                                                },
                                                {
                                                    label: ui.paid,
                                                    value: `$${totalPaid.toLocaleString()}`,
                                                    icon: <Ico size={13}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></Ico>,
                                                },
                                                {
                                                    label: ui.remaining,
                                                    value: `$${remaining.toLocaleString()}`,
                                                    accent: true,
                                                    icon: <Ico size={13}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Ico>,
                                                },
                                            ].map(({ label, value, icon, accent }) => (
                                                <div key={label} className={`stat-tile${accent ? ' stat-tile--accent' : ''}`}>
                                                    <span className="stat-label">{icon}{label}</span>
                                                    <span className="stat-value">{value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Deadline tile */}
                                        <div className="deadline-tile">
                                            <div className="deadline-row">
                                                <span className="deadline-label">
                                                    <Ico size={13}>
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                                    </Ico>
                                                    {ui.deadline}
                                                </span>
                                                <span className="deadline-date">{fmtDate(endDate)}</span>
                                            </div>
                                            <p className="deadline-remaining" style={{ color: sc.fg }}>
                                                {isDone ? stateLabel : `${daysLeft} ${ui.daysLeft}`}
                                            </p>
                                            <div className="progress-track">
                                                <div className="progress-fill" style={{ width: `${timePct}%`, background: sc.fg }} />
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </section>

                            {/* ─────────────────────────────────
                                PAYMENT HISTORY CARD
                            ───────────────────────────────── */}
                            <section className="card">

                                <div className="card-hd">
                                    <div className="card-hd-left">
                                        <span className="card-icon">
                                            <Ico size={18}>
                                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                                <line x1="1" y1="10" x2="23" y2="10"/>
                                            </Ico>
                                        </span>
                                        <h2 className="card-title">{ui.historyTitle}</h2>
                                    </div>
                                    <button type="button" className="btn btn--cta" onClick={openPayment}>
                                        <Ico size={15}>
                                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                            <line x1="1" y1="10" x2="23" y2="10"/>
                                        </Ico>
                                        {ui.makePayment}
                                    </button>
                                </div>

                                {payments.length === 0 && pendingPayments.length === 0 ? (
                                    <div className="empty-state">
                                        <Ico size={48} children={<><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></>} />
                                        <p>{ui.noPayments}</p>
                                    </div>
                                ) : (
                                    <div className="table-wrap">
                                        <div className="table-head">
                                            <span>{ui.colDate}</span>
                                            <span>{ui.colAmount}</span>
                                            <span>{ui.colMethod}</span>
                                            <span>{ui.colNote}</span>
                                            <span>{ui.colReceipt}</span>
                                        </div>

                                        {/* ── Pending (local) payments first ── */}
                                        {pendingPayments.map(p => (
                                            <div key={p.id} className="table-row table-row--pending">
                                                <span className="cell-muted">{fmtDate(p.date)}</span>
                                                <span className="cell-amount">${Number(p.amount || 0).toLocaleString()}</span>
                                                <span>
                                                    <span className="pill pill--pending">
                                                        <Ico size={12}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Ico>
                                                        {ui.pendingBadge}
                                                    </span>
                                                </span>
                                                <span className="cell-muted">{p.personalNote || '—'}</span>
                                                <span className="pending-receipt-cell">
                                                    {/* Attachment links */}
                                                    {p.attachments?.length > 0 ? (
                                                        <span className="attachment-list">
                                                            {p.attachments.map(a => (
                                                                <a
                                                                    key={a.id}
                                                                    href={`${getApiBaseUrl()}/api/requests/${a.requestId}/attachments/${a.id}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="receipt-link"
                                                                    title={a.filename}
                                                                >
                                                                    <Ico size={13}>
                                                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                                                        <polyline points="14 2 14 8 20 8"/>
                                                                        <line x1="16" y1="13" x2="8" y2="13"/>
                                                                        <line x1="16" y1="17" x2="8" y2="17"/>
                                                                    </Ico>
                                                                    {a.filename.length > 18 ? a.filename.slice(0, 16) + '…' : a.filename}
                                                                </a>
                                                            ))}
                                                        </span>
                                                    ) : (
                                                        <span className="cell-muted">—</span>
                                                    )}
                                                    {/* Edit / Cancel buttons */}
                                                    <span className="pending-actions">
                                                        <button type="button" className="pending-btn pending-btn--edit" onClick={() => openEditPending(p)}>
                                                            <Ico size={12}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></Ico>
                                                            {ui.editPayment}
                                                        </button>
                                                        <button type="button" className="pending-btn pending-btn--cancel" onClick={() => deletePendingPayment(p.id)}>
                                                            <Ico size={12}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></Ico>
                                                            {ui.cancelPayment}
                                                        </button>
                                                    </span>
                                                </span>
                                            </div>
                                        ))}

                                        {/* Pending info banner */}
                                        {pendingPayments.length > 0 && (
                                            <div className="pending-info-bar">
                                                <Ico size={14}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></Ico>
                                                {ui.pendingInfo}
                                            </div>
                                        )}

                                        {/* ── Confirmed payments ── */}
                                        {payments.map(p => {
                                            const m = methodInfo(p.method);
                                            // Look up the receipt cache (attachment link saved when
                                            // the matching pending payment was cleared on confirmation).
                                            const amtKey = Number(p.amount).toFixed(2);
                                            const cachedAtt = (paymentReceipts[amtKey] || [])[0] || null;
                                            const receiptHref = cachedAtt
                                                ? `${getApiBaseUrl()}/api/requests/${cachedAtt.requestId}/attachments/${cachedAtt.id}`
                                                : null;
                                            return (
                                                <div key={p.id} className="table-row">
                                                    <span className="cell-muted">{fmtDate(p.date)}</span>
                                                    <span className="cell-amount">${Number(p.amount || 0).toLocaleString()}</span>
                                                    <span>
                                                        <span className={`pill pill--${m.key}`}>
                                                            {m.key === 'card' ? (
                                                                <Ico size={12}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></Ico>
                                                            ) : (
                                                                <Ico size={12}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><circle cx="12" cy="14" r="3"/></Ico>
                                                            )}
                                                            {m.label}
                                                        </span>
                                                    </span>
                                                    <span className="cell-muted">{p.personalNote || p.note || '—'}</span>
                                                    <span>
                                                        {receiptHref ? (
                                                            <a
                                                                href={receiptHref}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="receipt-link"
                                                                title={ui.viewReceipt}
                                                            >
                                                                <Ico size={13}>
                                                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                                                                    <polyline points="14 2 14 8 20 8"/>
                                                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                                                    <polyline points="10 9 9 9 8 9"/>
                                                                </Ico>
                                                                {ui.viewReceipt}
                                                            </a>
                                                        ) : (
                                                            <span className="cell-muted">—</span>
                                                        )}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>

                        </div>{/* /content */}
                    </div>
                )}
            </main>

            <Footer t={t} />

            {/* ════════════════════════════════════
                MODALS
            ════════════════════════════════════ */}

            {/* Settings */}
            {modal === 'settings' && (
                <Modal title={ui.settings} onClose={closeModal}>
                    {error   && <div className="banner banner--error"   role="alert">{error}</div>}
                    {success && <div className="banner banner--success" role="status">{success}</div>}

                    <fieldset className="fset">
                        <legend className="fset-legend">{ui.profile}</legend>
                        <form className="mform" onSubmit={onProfileSave}>
                            <label className="flabel">
                                {ui.yourName}
                                <input className="finput" value={profileForm.name}
                                    onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Full name" />
                            </label>
                            <label className="flabel">
                                {ui.yourEmail}
                                <input className="finput" type="email" value={profileForm.email}
                                    onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                                    placeholder="Email" />
                            </label>
                            <button type="submit" className="btn btn--primary">{ui.saveProfile}</button>
                        </form>
                    </fieldset>

                    <fieldset className="fset">
                        <legend className="fset-legend">{ui.password}</legend>
                        <form className="mform" onSubmit={onPasswordSave}>
                            <label className="flabel">
                                {ui.curPwd}
                                <input className="finput" type="password" value={passwordForm.currentPassword}
                                    onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))} />
                            </label>
                            <label className="flabel">
                                {ui.newPwd}
                                <input className="finput" type="password" value={passwordForm.newPassword}
                                    onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} />
                            </label>
                            <label className="flabel">
                                {ui.confPwd}
                                <input className="finput" type="password" value={passwordForm.confirmPassword}
                                    onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} />
                            </label>
                            <button type="submit" className="btn btn--primary">{ui.updatePwd}</button>
                        </form>
                    </fieldset>
                </Modal>
            )}

            {/* Engagement */}
            {modal === 'engagement' && (
                <Modal title={ui.editEng} onClose={closeModal}>
                    {error   && <div className="banner banner--error"   role="alert">{error}</div>}
                    {success && <div className="banner banner--success" role="status">{success}</div>}
                    <form className="mform" onSubmit={onEngSave}>
                        <label className="flabel">
                            {ui.pledgeAmt}
                            <input className="finput" type="number" min="1" value={engForm.totalPledge}
                                onChange={e => setEngForm(p => ({ ...p, totalPledge: e.target.value }))}
                                placeholder="e.g. 2000" />
                        </label>
                        <label className="flabel">
                            {ui.deadline}
                            <input className="finput" type="date" value={engForm.endDate}
                                min={new Date().toISOString().slice(0, 10)}
                                onChange={e => setEngForm(p => ({ ...p, endDate: e.target.value }))} />
                        </label>
                        <button type="submit" className="btn btn--primary">
                            {profile?.engagement ? ui.updateEng : ui.createEng}
                        </button>
                    </form>
                </Modal>
            )}

            {/* Payment */}
            {modal === 'payment' && (
                <Modal title={editingPendingId ? ui.editPayment + ' — ' + ui.pendingBadge : ui.makePayment}
                       description={editingPendingId ? ui.pendingInfo : payStep === null ? ui.payDesc : ''}
                       onClose={closeModal}>
                    {error   && <div className="banner banner--error"   role="alert">{error}</div>}
                    {success && <div className="banner banner--success" role="status">{success}</div>}

                    {/* Remaining amount highlight */}
                    <div className="pay-badge">
                        <span className="pay-badge-label">{ui.remaining}</span>
                        <span className="pay-badge-value">${remaining.toLocaleString()}</span>
                    </div>

                    {/* Step 0: Choose payment method */}
                    {!editingPendingId && payStep === null && (
                        <div className="pay-method-grid">
                            <button type="button" className="pay-method-btn" onClick={() => setPayStep('zeffy')}>
                                <Ico size={22}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></Ico>
                                <span className="pay-method-label">{ui.payViaZeffy}</span>
                                <span className="pay-method-sub">Online</span>
                            </button>
                            <button type="button" className="pay-method-btn" onClick={() => setPayStep('cash')}>
                                <Ico size={22}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Ico>
                                <span className="pay-method-label">{ui.payByCash}</span>
                                <span className="pay-method-sub">Cash / Interac</span>
                            </button>
                        </div>
                    )}

                    {/* Step 1a: Zeffy */}
                    {!editingPendingId && payStep === 'zeffy' && (<>
                        <a
                            href="https://www.zeffy.com/fr-CA/donation-form/nouveau-centre-al-imane"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn--zeffy"
                            onClick={closeModal}
                        >
                            <Ico size={16}><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></Ico>
                            {ui.payViaZeffy}
                        </a>
                        <p className="pay-soon-note">{ui.zeffySoon}</p>
                        <button type="button" className="btn btn--ghost-sm" onClick={() => setPayStep(null)}>{ui.backToMethod}</button>
                    </>)}

                    {/* Step 1b: Cash / Interac form */}
                    {(editingPendingId || payStep === 'cash') && (
                        <form className="mform" onSubmit={onCashPayment}>
                            <div className="cash-guidance">
                                <Ico size={15}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></Ico>
                                <span>{ui.cashGuidance}</span>
                            </div>
                            <label className="flabel">
                                {ui.amount}
                                <input className="finput" type="number" min="1" value={cashForm.amount}
                                    onChange={e => setCashForm(p => ({ ...p, amount: e.target.value }))}
                                    placeholder="0" />
                            </label>
                            <label className="flabel">
                                {ui.adminNote}
                                <textarea className="finput ftextarea" value={cashForm.adminNote}
                                    onChange={e => setCashForm(p => ({ ...p, adminNote: e.target.value }))}
                                    placeholder={ui.adminNotePh} />
                            </label>
                            <label className="flabel">
                                {ui.personalNote}
                                <textarea className="finput ftextarea" value={cashForm.personalNote}
                                    onChange={e => setCashForm(p => ({ ...p, personalNote: e.target.value }))}
                                    placeholder={ui.personalNotePh} />
                            </label>
                            <label className="flabel">
                                {ui.attachFiles}
                                <input className="finput" type="file" multiple
                                    onChange={e => setAttachedFiles(Array.from(e.target.files || []))} />
                            </label>
                            <div className="pay-form-actions">
                                {!editingPendingId && (
                                    <button type="button" className="btn btn--ghost-sm" onClick={() => setPayStep(null)}>{ui.backToMethod}</button>
                                )}
                                <button type="submit" className="btn btn--outline-gold">{ui.submitCash}</button>
                            </div>
                        </form>
                    )}
                </Modal>
            )}

            {/* Contact admin */}
            {modal === 'contact' && (
                <Modal title={ui.contactAdmin} description={ui.contactDesc} onClose={closeModal}>
                    {error   && <div className="banner banner--error"   role="alert">{error}</div>}
                    {success && <div className="banner banner--success" role="status">{success}</div>}
                    <form className="mform" onSubmit={onContactSend}>
                        <div className="mform-row">
                            <label className="flabel">
                                {ui.yourName}
                                <input className="finput" value={profile?.name || ''} readOnly tabIndex={-1} />
                            </label>
                            <label className="flabel">
                                {ui.yourEmail}
                                <input className="finput" value={profile?.email || ''} readOnly tabIndex={-1} />
                            </label>
                        </div>
                        <label className="flabel">
                            {ui.reqType}
                            <select className="finput" value={contactForm.type}
                                onChange={e => setContactForm(p => ({ ...p, type: e.target.value }))}>
                                <option value="other">{ui.reqGeneral}</option>
                                <option value="payment_upload">{ui.reqPayment}</option>
                                <option value="engagement_change">{ui.reqEngagement}</option>
                                <option value="account_creation">{ui.reqAccount}</option>
                            </select>
                        </label>
                        <label className="flabel">
                            {ui.message}
                            <textarea className="finput ftextarea ftextarea--lg" value={contactForm.message}
                                onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                                placeholder={ui.message} />
                        </label>
                        <label className="flabel">
                            {ui.attachFiles}
                            <input className="finput" type="file" multiple
                                onChange={e => setAttachedFiles(Array.from(e.target.files || []))} />
                        </label>
                        <button type="submit" className="btn btn--primary">{ui.sendReq}</button>
                    </form>
                </Modal>
            )}

        </div>
    );
}

// ─────────────────────────────────────────────
// CSS — static string, never re-created
// ─────────────────────────────────────────────
const STYLES = `
*, *::before, *::after { box-sizing: border-box; }

/* ── Page shell ── */
.pg-shell {
    width: 100%;
    max-width: 1380px;
    margin: 0 auto;
    padding: 36px 32px 88px;
}

/* ── Loading spinner ── */
.pg-loading {
    min-height: 50vh;
    display: flex;
    align-items: center;
    justify-content: center;
}
.pg-spinner {
    display: block;
    width: 46px;
    height: 46px;
    border: 3px solid rgba(255,255,255,.1);
    border-top-color: #e8a44a;
    border-radius: 50%;
    animation: spinIt .7s linear infinite;
}
@keyframes spinIt { to { transform: rotate(360deg); } }

/* ── Two-column page grid ── */
.pg-cols {
    display: grid;
    grid-template-columns: 226px minmax(0, 1fr);
    gap: 26px;
    align-items: start;
}

/* ══════════════════════════════════════
   SIDE NAV
══════════════════════════════════════ */
.sidenav {
    position: sticky;
    top: 22px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 20px 14px 24px;
    border-radius: 20px;
    border: 1px solid rgba(226,185,100,.2);
    background: linear-gradient(170deg, #0f1e40 0%, #0a1428 55%, #070d1c 100%);
    box-shadow:
        0 28px 70px rgba(0,0,0,.58),
        inset 0 1px 0 rgba(255,255,255,.05);
}
.sidenav-label {
    margin: 0 0 10px 3px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: rgba(226,185,100,.55);
}
.sidenav-btn {
    display: flex;
    align-items: center;
    gap: 11px;
    width: 100%;
    padding: 12px 13px;
    border-radius: 12px;
    border: 1px solid transparent;
    background: transparent;
    color: rgba(200,210,240,.65);
    font-size: 16px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: background .16s, border-color .16s, color .16s, transform .14s;
}
.sidenav-btn:hover {
    background: rgba(255,255,255,.07);
    border-color: rgba(226,185,100,.3);
    color: #fff;
    transform: translateX(4px);
}
.sidenav-icon {
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgba(255,255,255,.06);
    color: rgba(226,185,100,.75);
    flex-shrink: 0;
    transition: background .16s, color .16s;
}
.sidenav-btn:hover .sidenav-icon {
    background: rgba(226,185,100,.14);
    color: #e8bc5a;
}
.sidenav-btn--danger { color: rgba(255,175,175,.65); }
.sidenav-btn--danger:hover {
    background: rgba(220,70,70,.09);
    border-color: rgba(220,70,70,.28);
    color: #ffb4b4;
}
.sidenav-btn--danger .sidenav-icon { color: rgba(228,103,103,.7); }
.sidenav-btn--danger:hover .sidenav-icon {
    background: rgba(228,103,103,.14);
    color: #e46767;
}

/* ══════════════════════════════════════
   CONTENT COLUMN
══════════════════════════════════════ */
.content {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

/* Welcome */
.welcome { padding: 2px 2px 6px; }
.welcome-name {
    margin: 0;
    font-size: 34px;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -.02em;
    color: #f0f4ff;
}
.welcome-highlight { color: #e8bc5a; }
.welcome-email {
    margin: 4px 0 0;
    font-size: 15px;
    color: rgba(160,170,200,.65);
}

/* Feedback banners */
.banner {
    padding: 13px 16px;
    border-radius: 12px;
    font-size: 16px;
    line-height: 1.5;
}
.banner--error   { background: rgba(180,52,52,.12); border: 1px solid rgba(220,90,90,.3);  color: #ffb4b4; }
.banner--success { background: rgba(80,155,100,.12); border: 1px solid rgba(120,185,150,.3); color: #a8edbe; }

/* ══════════════════════════════════════
   CARDS
══════════════════════════════════════ */
.card {
    border-radius: 20px;
    padding: 24px;
    background: rgba(255,255,255,.035);
    border: 1px solid rgba(255,255,255,.08);
    box-shadow: 0 6px 28px rgba(0,0,0,.2);
}
.card--eng {
    background: linear-gradient(148deg, #0f1d3e 0%, #0b1528 52%, #07101f 100%);
    border-color: rgba(226,185,100,.22);
    box-shadow:
        0 18px 52px rgba(0,0,0,.38),
        inset 0 1px 0 rgba(255,255,255,.04);
}

/* Card header */
.card-hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 22px;
}
.card-hd-left, .card-hd-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}
.card-icon {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    background: rgba(226,185,100,.12);
    color: #e8bc5a;
    flex-shrink: 0;
}
.card-title {
    margin: 0;
    font-size: 19px;
    font-weight: 700;
    color: #f0f4ff;
}
.card--eng .card-title { color: #e8bc5a; font-size: 20px; }

/* Status chip */
.status-chip {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 13px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 700;
    border: 1px solid;
    letter-spacing: .025em;
}
.status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
}

/* ══════════════════════════════════════
   ENGAGEMENT BODY
══════════════════════════════════════ */
.eng-body {
    display: grid;
    grid-template-columns: 190px 1fr;
    gap: 24px;
    align-items: center;
}

/* Ring */
.ring-wrap {
    position: relative;
    width: 190px;
    height: 190px;
    flex-shrink: 0;
}
.ring-wrap svg {
    position: absolute;
    inset: 0;
}
.ring-center {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    pointer-events: none;
}
.ring-pct {
    font-size: 48px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -.03em;
}
.ring-sub {
    font-size: 14px;
    font-weight: 600;
    color: rgba(226,185,100,.72);
    text-align: center;
    line-height: 1.35;
}

/* Engagement right side */
.eng-side {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* Stat tiles */
.stats-row {
    display: grid;
    grid-template-columns: repeat(3,1fr);
    gap: 10px;
}
.stat-tile {
    padding: 18px 14px;
    border-radius: 14px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.08);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    transition: transform .17s, border-color .17s, box-shadow .17s;
    cursor: default;
}
.stat-tile:hover {
    transform: translateY(-3px);
    border-color: rgba(226,185,100,.28);
    box-shadow: 0 12px 30px rgba(0,0,0,.25);
}
.stat-tile--accent {
    background: rgba(226,185,100,.07);
    border-color: rgba(226,185,100,.2);
}
.stat-label {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .07em;
    text-transform: uppercase;
    color: rgba(160,170,200,.7);
    text-align: center;
}
.stat-label svg { color: #e8bc5a; }
.stat-value {
    font-size: 29px;
    font-weight: 800;
    color: #f0f4ff;
    letter-spacing: -.02em;
}
.stat-tile--accent .stat-value { color: #e8bc5a; }

/* Deadline tile */
.deadline-tile {
    padding: 15px 17px;
    border-radius: 14px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.08);
    display: flex;
    flex-direction: column;
    gap: 10px;
}
.deadline-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}
.deadline-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 600;
    color: rgba(160,170,200,.65);
}
.deadline-date {
    font-size: 15px;
    font-weight: 600;
    color: rgba(200,210,240,.8);
}
.deadline-remaining {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    letter-spacing: -.01em;
}
.progress-track {
    height: 8px;
    border-radius: 999px;
    background: rgba(255,255,255,.08);
    overflow: hidden;
}
.progress-fill {
    height: 100%;
    border-radius: 999px;
    transition: width .65s cubic-bezier(.4,0,.2,1);
}

/* ══════════════════════════════════════
   PAYMENT TABLE
══════════════════════════════════════ */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 44px 20px;
    color: rgba(160,170,200,.45);
}
.empty-state p { margin: 0; font-size: 17px; }

.table-wrap { margin-top: 6px; }
.table-head {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1.1fr 1fr 1.1fr;
    gap: 12px;
    padding: 0 12px 11px;
    border-bottom: 1px solid rgba(255,255,255,.07);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    color: rgba(160,170,200,.55);
}
.table-row {
    display: grid;
    grid-template-columns: 1.5fr 1fr 1.1fr 1fr 1.1fr;
    gap: 12px;
    padding: 13px 12px;
    border-radius: 10px;
    align-items: center;
    font-size: 16px;
    transition: background .14s;
}
.table-row:hover { background: rgba(255,255,255,.04); }
.table-row + .table-row { border-top: 1px solid rgba(255,255,255,.045); }
.cell-muted  { font-size: 15px; color: rgba(180,190,220,.7); }
.cell-amount { font-size: 17px; font-weight: 700; color: #f0f4ff; }
.receipt-link {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 14px;
    font-weight: 600;
    color: #e8a44a;
    text-decoration: none;
    padding: 3px 8px;
    border-radius: 7px;
    border: 1px solid rgba(232,164,74,.3);
    background: rgba(232,164,74,.08);
    transition: background .15s, border-color .15s, color .15s;
}
.receipt-link:hover {
    background: rgba(232,164,74,.18);
    border-color: rgba(232,164,74,.55);
    color: #f0c060;
}

/* Pending payment row */
.table-row--pending {
    background: rgba(232,164,74,.05);
    border-left: 3px solid rgba(232,164,74,.4);
    border-radius: 10px;
}
.table-row--pending + .table-row--pending { border-top: 1px solid rgba(232,164,74,.12); }

/* Pending info bar */
.pending-info-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
    margin: 4px 0 8px;
    border-radius: 10px;
    background: rgba(232,164,74,.07);
    border: 1px solid rgba(232,164,74,.22);
    font-size: 13px;
    color: rgba(232,164,74,.85);
    font-style: italic;
}

/* Receipt cell for pending rows (contains both file links and action buttons) */
.pending-receipt-cell {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.attachment-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

/* Pending action buttons */
.pending-actions {
    display: flex;
    gap: 6px;
    align-items: center;
    flex-wrap: wrap;
}
.pending-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 700;
    font-family: inherit;
    padding: 3px 8px;
    border-radius: 7px;
    border: 1px solid;
    cursor: pointer;
    transition: background .15s, border-color .15s;
}
.pending-btn--edit {
    color: #93b5ee;
    border-color: rgba(100,148,230,.3);
    background: rgba(100,148,230,.08);
}
.pending-btn--edit:hover {
    background: rgba(100,148,230,.18);
    border-color: rgba(100,148,230,.55);
}
.pending-btn--cancel {
    color: #e46767;
    border-color: rgba(228,103,103,.3);
    background: rgba(228,103,103,.07);
}
.pending-btn--cancel:hover {
    background: rgba(228,103,103,.16);
    border-color: rgba(228,103,103,.55);
}

/* Method pills */
.pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
}
.pill--card {
    background: rgba(100,148,230,.11);
    border: 1px solid rgba(100,148,230,.26);
    color: #93b5ee;
}
.pill--cash {
    background: rgba(226,185,100,.1);
    border: 1px solid rgba(226,185,100,.24);
    color: #e8bc5a;
}
.pill--pending {
    background: rgba(232,164,74,.1);
    border: 1px solid rgba(232,164,74,.3);
    color: #e8a44a;
}

/* ══════════════════════════════════════
   BUTTONS
══════════════════════════════════════ */
.btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    border-radius: 11px;
    font-size: 15px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    border: 1px solid transparent;
    transition: transform .15s, filter .18s, background .18s, border-color .18s, box-shadow .18s;
    white-space: nowrap;
}
.btn:hover  { transform: translateY(-2px); }
.btn:active { transform: translateY(0); }

/* Ghost */
.btn--ghost {
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.11);
    color: rgba(200,210,240,.8);
}
.btn--ghost:hover {
    background: rgba(226,185,100,.1);
    border-color: rgba(226,185,100,.38);
    color: #e8bc5a;
}

/* Gold CTA (pulsing) */
.btn--cta {
    background: linear-gradient(135deg, #f6e09c 0%, #dcb060 45%, #f8e3a0 100%);
    color: #120d02;
    font-weight: 800;
    font-size: 16px;
    padding: 11px 20px;
    border: none;
    box-shadow: 0 8px 24px rgba(210,155,48,.38);
    animation: ctaPulse 2.8s ease-in-out infinite;
}
.btn--cta:hover { filter: brightness(1.09); }
@keyframes ctaPulse {
    0%,100% { box-shadow: 0 8px 24px rgba(210,155,48,.32); }
    50%      { box-shadow: 0 12px 32px rgba(210,155,48,.52); }
}

/* Primary (modal submit) */
.btn--primary {
    background: #e8bc5a;
    color: #0a0d16;
    font-size: 16px;
    font-weight: 700;
    padding: 13px 20px;
    width: 100%;
    justify-content: center;
    border: none;
}
.btn--primary:hover { filter: brightness(1.09); }

/* Zeffy */
.btn--zeffy {
    width: 100%;
    justify-content: center;
    background: rgba(100,148,230,.12);
    border: 1px solid rgba(100,148,230,.28);
    color: #93b5ee;
    font-size: 16px;
    font-weight: 700;
    padding: 13px 20px;
    text-decoration: none;
}
.btn--zeffy:hover {
    background: rgba(100,148,230,.22);
    border-color: rgba(100,148,230,.52);
    color: #b8d0f8;
}

/* Outline gold */
.btn--outline-gold {
    width: 100%;
    justify-content: center;
    background: rgba(226,185,100,.07);
    border: 1px solid rgba(226,185,100,.33);
    color: #e8bc5a;
    font-size: 16px;
    font-weight: 700;
    padding: 13px 20px;
}
.btn--outline-gold:hover {
    background: rgba(226,185,100,.15);
    border-color: #e8bc5a;
}

/* ══════════════════════════════════════
   MODAL OVERLAY
══════════════════════════════════════ */
.overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(2,5,18,.74);
    backdrop-filter: blur(9px) saturate(120%);
    -webkit-backdrop-filter: blur(9px) saturate(120%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn .18s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.modal {
    width: 100%;
    max-width: 524px;
    max-height: 88vh;
    overflow-y: auto;
    border-radius: 22px;
    background: linear-gradient(155deg, #101d3e 0%, #0c1630 52%, #080e1e 100%);
    border: 1px solid rgba(226,185,100,.26);
    box-shadow:
        0 40px 100px rgba(0,0,0,.75),
        0 0 0 1px rgba(255,255,255,.03);
    display: flex;
    flex-direction: column;
    animation: slideUp .22s cubic-bezier(.22,.8,.4,1);
}
@keyframes slideUp {
    from { transform: translateY(18px) scale(.965); opacity: 0; }
    to   { transform: translateY(0) scale(1); opacity: 1; }
}

.modal-hd {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 22px 24px 18px;
    border-bottom: 1px solid rgba(255,255,255,.07);
    flex-shrink: 0;
}
.modal-ttl {
    margin: 0;
    font-size: 21px;
    font-weight: 800;
    color: #f0f4ff;
    letter-spacing: .01em;
}
.modal-x {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.055);
    color: rgba(210,220,250,.7);
    font-size: 20px;
    line-height: 1;
    cursor: pointer;
    flex-shrink: 0;
    transition: background .14s, border-color .14s, color .14s;
}
.modal-x:hover {
    background: rgba(255,255,255,.1);
    border-color: rgba(226,185,100,.4);
    color: #fff;
}
.modal-desc {
    margin: 0;
    padding: 14px 24px 0;
    font-size: 15px;
    line-height: 1.65;
    color: rgba(160,172,204,.75);
    flex-shrink: 0;
}
.modal-bd {
    padding: 20px 24px 28px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    overflow-y: auto;
}

/* ══════════════════════════════════════
   FORMS
══════════════════════════════════════ */
.mform {
    display: flex;
    flex-direction: column;
    gap: 14px;
}
.mform-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}
.flabel {
    display: flex;
    flex-direction: column;
    gap: 7px;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: .07em;
    text-transform: uppercase;
    color: rgba(155,168,202,.7);
}
.finput {
    width: 100%;
    padding: 11px 14px;
    border-radius: 11px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.055);
    color: #f0f4ff;
    font-size: 16px;
    font-family: inherit;
    outline: none;
    transition: border-color .17s, box-shadow .17s;
}
.finput:focus {
    border-color: rgba(226,185,100,.55);
    box-shadow: 0 0 0 3px rgba(226,185,100,.11);
}
.finput[readonly] { opacity: .5; cursor: default; }
select.finput option { background: #0f1d3e; color: #f0f4ff; }
.ftextarea { min-height: 92px; resize: vertical; }
.ftextarea--lg { min-height: 130px; }

/* Fieldset section */
.fset {
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 14px;
    padding: 16px 18px 18px;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
}
.fset-legend {
    padding: 0 8px;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: rgba(226,185,100,.7);
}

/* ══════════════════════════════════════
   PAYMENT MODAL EXTRAS
══════════════════════════════════════ */
.pay-badge {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-radius: 14px;
    background: rgba(226,185,100,.08);
    border: 1px solid rgba(226,185,100,.22);
}
.pay-badge-label {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: .07em;
    text-transform: uppercase;
    color: rgba(226,185,100,.65);
}
.pay-badge-value {
    font-size: 31px;
    font-weight: 800;
    color: #e8bc5a;
    letter-spacing: -.02em;
}
.pay-soon-note {
    margin: -4px 0 0;
    font-size: 14px;
    font-style: italic;
    color: rgba(160,172,204,.55);
    text-align: center;
}
.or-sep {
    display: flex;
    align-items: center;
    gap: 12px;
    color: rgba(160,172,204,.45);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
}
.or-sep::before, .or-sep::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,.08);
}
.pay-method-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}
.pay-method-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px 16px;
    border-radius: 14px;
    background: rgba(100,148,230,.18);
    border: 1.5px solid rgba(100,148,230,.50);
    color: #c8dcfc;
    cursor: pointer;
    transition: background .18s, border-color .18s, transform .12s;
    font-family: inherit;
}
.pay-method-btn:hover {
    background: rgba(100,148,230,.28);
    border-color: rgba(226,185,100,.70);
    transform: translateY(-2px);
}
.pay-method-label {
    font-size: 14px;
    font-weight: 700;
    color: #e8f0ff;
}
.pay-method-sub {
    font-size: 12px;
    color: rgba(185,205,245,.80);
}
.cash-guidance {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 12px 16px;
    border-radius: 10px;
    background: rgba(92,200,160,.18);
    border: 1px solid rgba(92,200,160,.50);
    font-size: 13px;
    line-height: 1.5;
    color: #c0f0d8;
}
.cash-guidance svg { flex-shrink: 0; margin-top: 2px; }
.pay-form-actions {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: flex-end;
}
.btn--ghost-sm {
    background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.28);
    color: #c4cfe8;
    padding: 8px 16px;
    border-radius: 9px;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    transition: color .15s, border-color .15s, background .15s;
}
.btn--ghost-sm:hover {
    background: rgba(255,255,255,.11);
    color: #e8f0ff;
    border-color: rgba(255,255,255,.50);
}

/* ══════════════════════════════════════
   RESPONSIVE
══════════════════════════════════════ */
@media (max-width: 1100px) {
    .pg-shell { padding: 26px 22px 70px; }
    .pg-cols { grid-template-columns: 200px minmax(0,1fr); gap: 20px; }
}
@media (max-width: 880px) {
    .pg-cols { grid-template-columns: 1fr; }
    .sidenav {
        position: static;
        flex-direction: row;
        flex-wrap: wrap;
        padding: 14px;
        gap: 8px;
    }
    .sidenav-label { display: none; }
    .sidenav-btn { width: auto; flex: 1 1 auto; min-width: 120px; justify-content: center; }
    .welcome-name { font-size: 29px; }
}
@media (max-width: 660px) {
    .pg-shell { padding: 16px 14px 60px; }
    .sidenav-btn { flex: 1 1 100%; }
    .eng-body { grid-template-columns: 1fr; justify-items: center; }
    .eng-side { width: 100%; }
    .stats-row { grid-template-columns: 1fr; }
    .card { padding: 18px 16px; }
    .welcome-name { font-size: 25px; }
    .table-head { display: none; }
    .table-row { grid-template-columns: 1fr 1fr; row-gap: 4px; column-gap: 10px; }
    .mform-row { grid-template-columns: 1fr; }
    .modal { border-radius: 18px; }
    .modal-bd { padding: 16px 18px 24px; }
}

/* ══════════════════════════════════════
   LIGHT THEME OVERRIDES
══════════════════════════════════════ */

/* Spinner */
[data-theme="light"] .pg-spinner {
    border-color: rgba(0,0,0,.1);
    border-top-color: #9a7b4f;
}

/* ── Side nav ── */
[data-theme="light"] .sidenav {
    background: linear-gradient(170deg, #ffffff 0%, #faf8f3 55%, #f3efe6 100%);
    border-color: rgba(154,123,79,.22);
    box-shadow: 0 8px 28px rgba(0,0,0,.07), inset 0 1px 0 rgba(255,255,255,.9);
}
[data-theme="light"] .sidenav-label { color: rgba(154,123,79,.6); }
[data-theme="light"] .sidenav-btn   { color: #4a4040; }
[data-theme="light"] .sidenav-btn:hover {
    background: rgba(154,123,79,.08);
    border-color: rgba(154,123,79,.3);
    color: #2a1f0e;
}
[data-theme="light"] .sidenav-icon {
    background: rgba(0,0,0,.05);
    color: rgba(154,123,79,.8);
}
[data-theme="light"] .sidenav-btn:hover .sidenav-icon {
    background: rgba(154,123,79,.13);
    color: #9a7b4f;
}
[data-theme="light"] .sidenav-btn--danger { color: #9a3a3a; }
[data-theme="light"] .sidenav-btn--danger:hover {
    background: rgba(180,50,50,.06);
    border-color: rgba(180,50,50,.22);
    color: #7a2020;
}
[data-theme="light"] .sidenav-btn--danger .sidenav-icon { color: rgba(180,50,50,.7); }
[data-theme="light"] .sidenav-btn--danger:hover .sidenav-icon {
    background: rgba(180,50,50,.1);
    color: #b43232;
}

/* ── Welcome ── */
[data-theme="light"] .welcome-name      { color: #1a1208; }
[data-theme="light"] .welcome-highlight  { color: #9a7b4f; }
[data-theme="light"] .welcome-email      { color: #7a7060; }

/* ── Banners ── */
[data-theme="light"] .banner--error   { background: rgba(160,40,40,.06);  border-color: rgba(180,60,60,.22);  color: #8b2020; }
[data-theme="light"] .banner--success { background: rgba(50,110,70,.06);  border-color: rgba(80,150,100,.22); color: #235234; }

/* ── Cards ── */
[data-theme="light"] .card {
    background: #ffffff;
    border-color: #e5e2dc;
    box-shadow: 0 2px 16px rgba(0,0,0,.06);
}
[data-theme="light"] .card--eng {
    background: linear-gradient(148deg, #fffdf8 0%, #faf6ec 52%, #f4ede0 100%);
    border-color: rgba(154,123,79,.25);
    box-shadow: 0 6px 24px rgba(0,0,0,.07), inset 0 1px 0 rgba(255,255,255,.85);
}
[data-theme="light"] .card-icon  { background: rgba(154,123,79,.11); color: #9a7b4f; }
[data-theme="light"] .card-title { color: #1a1208; }
[data-theme="light"] .card--eng .card-title { color: #7a5c28; }

/* ── Ring ── */
[data-theme="light"] .ring-track { stroke: rgba(0,0,0,.08); }
[data-theme="light"] .ring-sub   { color: rgba(154,123,79,.75); }

/* ── Stat tiles ── */
[data-theme="light"] .stat-tile {
    background: rgba(0,0,0,.022);
    border-color: #e5e2dc;
}
[data-theme="light"] .stat-tile:hover {
    border-color: rgba(154,123,79,.3);
    box-shadow: 0 6px 18px rgba(0,0,0,.07);
}
[data-theme="light"] .stat-tile--accent {
    background: rgba(154,123,79,.07);
    border-color: rgba(154,123,79,.22);
}
[data-theme="light"] .stat-label        { color: #7a7060; }
[data-theme="light"] .stat-label svg    { color: #9a7b4f; }
[data-theme="light"] .stat-value        { color: #1a1208; }
[data-theme="light"] .stat-tile--accent .stat-value { color: #9a7b4f; }

/* ── Deadline tile ── */
[data-theme="light"] .deadline-tile {
    background: rgba(0,0,0,.022);
    border-color: #e5e2dc;
}
[data-theme="light"] .deadline-label    { color: #7a7060; }
[data-theme="light"] .deadline-date     { color: #3a3028; }
[data-theme="light"] .progress-track    { background: #e5e2dc; }

/* ── Payment table ── */
[data-theme="light"] .table-head {
    border-color: #e5e2dc;
    color: #7a7060;
}
[data-theme="light"] .table-row + .table-row { border-color: #e5e2dc; }
[data-theme="light"] .table-row:hover        { background: rgba(0,0,0,.025); }
[data-theme="light"] .cell-muted  { color: #7a7060; }
[data-theme="light"] .cell-amount { color: #1a1208; }
[data-theme="light"] .empty-state { color: rgba(0,0,0,.3); }
[data-theme="light"] .table-row--pending { background: rgba(154,123,79,.05); border-left-color: rgba(154,123,79,.45); }
[data-theme="light"] .pending-info-bar { background: rgba(154,123,79,.07); border-color: rgba(154,123,79,.22); color: #9a7b4f; }
[data-theme="light"] .pending-btn--edit { color: #3a5ca8; border-color: rgba(60,100,190,.28); background: rgba(60,100,190,.06); }
[data-theme="light"] .pending-btn--cancel { color: #b43232; border-color: rgba(180,50,50,.28); background: rgba(180,50,50,.06); }
[data-theme="light"] .pill--pending { background: rgba(154,123,79,.09); border-color: rgba(154,123,79,.28); color: #9a7b4f; }
[data-theme="light"] .receipt-link { color: #9a7b4f; border-color: rgba(154,123,79,.3); background: rgba(154,123,79,.07); }
[data-theme="light"] .receipt-link:hover { background: rgba(154,123,79,.15); border-color: #9a7b4f; color: #7a5c28; }
[data-theme="light"] .pill--card {
    background: rgba(60,100,190,.07);
    border-color: rgba(60,100,190,.22);
    color: #3a5ca8;
}
[data-theme="light"] .pill--cash {
    background: rgba(154,123,79,.08);
    border-color: rgba(154,123,79,.22);
    color: #9a7b4f;
}

/* ── Buttons ── */
[data-theme="light"] .btn--ghost {
    background: rgba(0,0,0,.04);
    border-color: rgba(0,0,0,.12);
    color: #3a3028;
}
[data-theme="light"] .btn--ghost:hover {
    background: rgba(154,123,79,.09);
    border-color: rgba(154,123,79,.38);
    color: #7a5c28;
}
[data-theme="light"] .btn--cta {
    background: linear-gradient(135deg, #e8c96a 0%, #c89030 45%, #e8c96a 100%);
    color: #1a0d00;
    box-shadow: 0 8px 24px rgba(154,123,79,.35);
}
[data-theme="light"] .btn--primary {
    background: #9a7b4f;
    color: #ffffff;
}
[data-theme="light"] .btn--zeffy {
    background: rgba(60,100,190,.07);
    border-color: rgba(60,100,190,.22);
    color: #3a5ca8;
}
[data-theme="light"] .btn--zeffy:hover {
    background: rgba(60,100,190,.13);
    border-color: rgba(60,100,190,.4);
    color: #2a4898;
}
[data-theme="light"] .btn--outline-gold {
    background: rgba(154,123,79,.06);
    border-color: rgba(154,123,79,.3);
    color: #9a7b4f;
}
[data-theme="light"] .btn--outline-gold:hover {
    background: rgba(154,123,79,.13);
    border-color: #9a7b4f;
}

/* ── Overlay & Modal ── */
[data-theme="light"] .overlay { background: rgba(0,0,0,.42); }
[data-theme="light"] .modal {
    background: linear-gradient(155deg, #ffffff 0%, #faf8f4 52%, #f4f0e6 100%);
    border-color: rgba(154,123,79,.28);
    box-shadow: 0 28px 64px rgba(0,0,0,.14), 0 0 0 1px rgba(0,0,0,.03);
}
[data-theme="light"] .modal-hd  { border-color: #e5e2dc; }
[data-theme="light"] .modal-ttl { color: #1a1208; }
[data-theme="light"] .modal-x {
    border-color: #e5e2dc;
    background: rgba(0,0,0,.04);
    color: #5a5040;
}
[data-theme="light"] .modal-x:hover {
    background: rgba(0,0,0,.07);
    border-color: rgba(154,123,79,.4);
    color: #1a1208;
}
[data-theme="light"] .modal-desc { color: #7a7060; }

/* ── Forms ── */
[data-theme="light"] .flabel { color: #7a7060; }
[data-theme="light"] .finput {
    border-color: #e5e2dc;
    background: #f9f7f3;
    color: #1a1208;
}
[data-theme="light"] .finput:focus {
    border-color: rgba(154,123,79,.55);
    box-shadow: 0 0 0 3px rgba(154,123,79,.1);
}
[data-theme="light"] select.finput option { background: #ffffff; color: #1a1208; }
[data-theme="light"] .fset        { border-color: #e5e2dc; }
[data-theme="light"] .fset-legend { color: rgba(154,123,79,.75); }

/* ── Payment modal extras ── */
[data-theme="light"] .pay-badge {
    background: rgba(154,123,79,.07);
    border-color: rgba(154,123,79,.22);
}
[data-theme="light"] .pay-badge-label { color: rgba(154,123,79,.7); }
[data-theme="light"] .pay-badge-value { color: #9a7b4f; }
[data-theme="light"] .pay-soon-note   { color: #9a9080; }
[data-theme="light"] .or-sep { color: #9a9080; }
[data-theme="light"] .or-sep::before,
[data-theme="light"] .or-sep::after { background: #e5e2dc; }
[data-theme="light"] .pay-method-btn {
    background: rgba(60,100,190,.07);
    border-color: rgba(60,100,190,.30);
    color: #3a5ca8;
}
[data-theme="light"] .pay-method-btn:hover {
    background: rgba(60,100,190,.13);
    border-color: rgba(154,123,79,.55);
}
[data-theme="light"] .pay-method-label { color: #1a2a5a; }
[data-theme="light"] .pay-method-sub   { color: #5a6a90; }
[data-theme="light"] .cash-guidance {
    background: rgba(40,140,90,.07);
    border-color: rgba(40,140,90,.28);
    color: #1a6040;
}
[data-theme="light"] .btn--ghost-sm {
    background: rgba(0,0,0,.04);
    border-color: rgba(0,0,0,.18);
    color: #3a3028;
}
[data-theme="light"] .btn--ghost-sm:hover {
    background: rgba(0,0,0,.07);
    border-color: rgba(0,0,0,.32);
    color: #1a1208;
}
`;
