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
import { DEFAULT_TRANSLATION, getAbsoluteUrl, getSiteUrl, truncateText, TRANSLATION_MODULES } from '@/lib/translationUtils.js';
import {
    createEngagement, getMe, getMyPayments, getMyRequests,
    updateEngagement, updateMe, updateMyPassword,
} from '@/lib/donorApi.js';
import { createRequest, uploadRequestAttachments } from '@/lib/requestsApi.js';
import { clearTokens, tryAutoLogin } from '@/lib/auth.js';
import { clearStoredSession, getStoredSession, setStoredSession } from '@/lib/session.js';
import { getApiBaseUrl } from '@/lib/apiClient.js';
import { FEATURES } from '@/constants/features.js';

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
            className="dashboard-icon-svg"
        >
            {children}
        </svg>
    );
}

// ─────────────────────────────────────────────
// Donor i18n fallback (English) — module-level constant
// ─────────────────────────────────────────────
const EN_DONOR = {
    welcome: 'Welcome',
    settings: 'Settings',
    contactAdmin: 'Contact admin',
    logout: 'Log out',
    engTitle: 'Your engagement',
    editEng: 'Edit engagement',
    historyTitle: 'Payment history',
    makePayment: 'Make a payment',
    paid: 'Paid so far',
    pledged: 'Total pledged',
    remaining: 'Remaining',
    deadline: 'Deadline',
    daysLeft: 'days remaining',
    stateInProgress: 'Engagement in progress',
    stateOverdue: 'Engagement overdue',
    stateCompleted: 'Engagement completed',
    chipInProgress: 'In progress',
    chipOverdue: 'Overdue',
    chipCompleted: 'Completed',
    noPayments: 'No payments recorded yet.',
    profile: 'Profile',
    password: 'Password',
    saveProfile: 'Save profile',
    updatePwd: 'Update password',
    curPwd: 'Current password',
    newPwd: 'New password',
    confPwd: 'Confirm password',
    pledgeAmt: 'Pledge amount ($)',
    updateEng: 'Update engagement',
    createEng: 'Create engagement',
    reqType: 'Request type',
    message: 'Message',
    yourName: 'Your name',
    yourEmail: 'E-mail',
    payViaZeffy: 'Pay via Zeffy',
    submitCash: 'Submit cash receipt',
    amount: 'Amount ($)',
    note: 'Note',
    sendReq: 'Send request',
    attachFiles: 'Attach files (optional)',
    zeffySoon: 'Once your Zeffy payment is completed, it will be reflected in your dashboard within a few minutes.',
    payDesc: 'Pay online or submit a cash payment receipt.',
    payZeffyNote: 'Your payment will appear here automatically within a few minutes after completion.',
    zeffyBtnLabel: 'Pay via Zeffy (new tab)',
    contactDesc: 'Send us a message for support or any question.',
    cashOk: 'Cash payment request submitted.',
    pwdMismatch: 'Passwords do not match.',
    colDate: 'Date',
    colDisplayName: 'Display name',
    colAmount: 'Amount',
    colMethod: 'Method',
    colNote: 'Note',
    colReceipt: 'Receipt',
    adminNote: 'Note for admin',
    personalNote: 'Personal note',
    viewReceipt: 'View receipt',
    personalNotePh: 'Note visible only to you in your payment history',
    adminNotePh: 'Message for the admin team',
    or: 'or',
    name: 'Name',
    reqGeneral: 'General request',
    reqPayment: 'Payment upload',
    reqEngagement: 'Engagement change',
    reqAccount: 'Account help',
    // Success messages
    profileUpdated: 'Profile updated successfully.',
    passwordUpdated: 'Password updated successfully.',
    engUpdated: 'Engagement updated successfully.',
    reqSubmitted: 'Request submitted successfully.',
    // Error messages
    invalidAmount: 'Please enter a valid amount.',
    invalidPledge: 'Please enter a valid pledge amount.',
    invalidDate: 'Please enter a valid date (YYYY-MM-DD).',
    errUpdateProfile: 'Unable to update profile.',
    errUpdatePassword: 'Unable to update password.',
    errUpdateEng: 'Unable to update engagement.',
    errSubmitReq: 'Unable to submit request.',
    errSubmitCash: 'Unable to submit cash payment.',
    // Pending payments
    pendingBadge: 'Pending',
    pendingInfo: 'Awaiting admin confirmation — you can edit or cancel this submission.',
    editPayment: 'Edit',
    cancelPayment: 'Cancel',
    confirmCancel: 'Are you sure you want to cancel this pending payment?',
    paymentCancelled: 'Pending payment cancelled.',
    paymentUpdated: 'Pending payment updated.',
    chooseMethod: 'How would you like to pay?',
    payByCash: 'Cash / Interac',
    cashGuidance: 'To help us validate your payment, always include: your email on the envelope (cash), or the Interac transaction number / a screenshot of the transfer.',
    backToMethod: '← Back',
    close: 'Close',
    loadingDashboard: 'Loading dashboard',
    loading: 'Loading',
    donorNavigation: 'Donor navigation',
    menu: 'Menu',
    sessionExpired: 'Session expired. Please log in again.',
    unableLoadDashboard: 'Unable to load dashboard.',
    fullNamePlaceholder: 'Full name',
    emailPlaceholder: 'Email',
    pledgeExample: 'e.g. 2000',
    zeroPlaceholder: '0',
    paymentMethodCash: 'Cash',
    paymentMethodZeffy: 'Zeffy',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
    dashboard: 'My donations',
    sectionCommunity: 'My community',
    sectionSupport: 'Support',
};

// ─────────────────────────────────────────────
// Engagement-state colour tokens
// ─────────────────────────────────────────────
const STATE_COLORS = {
    'in-progress': { fg: '#e8a44a', bg: 'rgba(232,164,74,.13)', border: 'rgba(232,164,74,.32)' },
    overdue: { fg: '#e46767', bg: 'rgba(228,103,103,.13)', border: 'rgba(228,103,103,.32)' },
    completed: { fg: '#5cc8a0', bg: 'rgba(92,200,160,.13)', border: 'rgba(92,200,160,.32)' },
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
                    <button type="button" className="modal-x" onClick={onClose} aria-label={DEFAULT_TRANSLATION.donor?.close || 'Close'}>&times;</button>
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
    const [profile, setProfile] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── UI feedback ──
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSidenavCollapsed, setIsSidenavCollapsed] = useState(false);

    // ── Active modal: null | 'settings' | 'engagement' | 'payment' | 'contact' ──
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(true);
    const [modal, setModal] = useState(null);

    // ── Form state ──
    const [profileForm, setProfileForm] = useState({ name: '', email: '' });
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [engForm, setEngForm] = useState({ totalPledge: '', endDate: '' });
    const [contactForm, setContactForm] = useState({ type: 'other', message: '' });
    const [cashForm, setCashForm] = useState({ amount: '', adminNote: '', personalNote: '' });
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [payStep, setPayStep] = useState(null); // null | 'zeffy' | 'cash'
    const [pendingPayments, setPendingPayments] = useState([]);
    const [editingPendingId, setEditingPendingId] = useState(null);
    const profileMessageRef = useRef(null);
    const passwordMessageRef = useRef(null);
    // receipt cache: { "100.00": [{id, requestId, filename, mimeType}] }
    // populated when a pending payment transitions to confirmed so the link survives
    const [paymentReceipts, setPaymentReceipts] = useState({});

    const appReady = tMounted && themeMounted;
    const { shouldShowPreloader, isResolved: preloaderResolved } = useFirstVisitPreloader(appReady);
    const hasOpenModal = modal !== null;
    const canSubmitPassword = Boolean(
        passwordForm.currentPassword.trim() &&
        passwordForm.newPassword.trim() &&
        passwordForm.confirmPassword.trim()
    );

    // ── SEO ──
    const siteUrl = getSiteUrl();
    const pageUrl = getAbsoluteUrl(`/donor/dashboard?lang=${language}`, siteUrl);
    const socialImg = getAbsoluteUrl('/logo-ccai.png', siteUrl);
    const pageTitle = `Donor Dashboard | ${t.centerName || DEFAULT_TRANSLATION.centerName}`;
    const pageDesc = truncateText('Manage your donor profile, engagement, payments, and support requests.');

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
            logoAlt: `${t.centerName || DEFAULT_TRANSLATION.centerName} logo`,
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
                    if (alive) setError(ui.sessionExpired);
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
                    endDate: me.engagement?.endDate ? String(me.engagement.endDate).slice(0, 10) : '',
                });
                setStoredSession({ ...session, ...me, role: 'donor' });
            } catch (err) {
                if (!alive) return;
                clearTokens(); clearStoredSession();
                setError(err?.message || ui.unableLoadDashboard);
                router.replace('/login');
            } finally {
                if (alive) setLoading(false);
            }
        }

        boot();
        return () => { alive = false; };
    }, [router]); // run once per mount for a stable router instance

    // ── Derived engagement metrics ──
    const totalPaid = useMemo(() => payments.reduce((s, p) => s + Number(p.amount || 0), 0), [payments]);
    const engTarget = useMemo(() => payments.reduce((sum, item) => sum + (item.engagement || 0), 0), [payments]);
    const pct = engTarget > 0 ? Math.min(100, Math.round((totalPaid / engTarget) * 100)) : 0;
    const remaining = Math.max(0, engTarget - totalPaid);
    const endDate = profile?.engagement?.endDate
        ? new Date(profile.engagement.endDate)
        : new Date('2026-12-31');
    const daysLeft = endDate ? Math.max(0, Math.ceil((endDate.getTime() - Date.now()) / 86400000)) : 0;
    const startDate = profile?.engagement?.createdAt ? new Date(profile.engagement.createdAt) : null;
    const totalDays = (startDate && endDate) ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000)) : 0;
    const elapsed = totalDays > 0 ? Math.max(0, totalDays - daysLeft) : 0;
    const timePct = totalDays > 0 ? Math.min(100, Math.round((elapsed / totalDays) * 100)) : 0;

    const isDone = engTarget > 0 && pct >= 100;
    const isLate = !isDone && endDate && endDate.getTime() < Date.now();
    const stateKey = isDone ? 'completed' : isLate ? 'overdue' : 'in-progress';
    const sc = STATE_COLORS[stateKey];
    const chipLabel = { 'in-progress': ui.chipInProgress, overdue: ui.chipOverdue, completed: ui.chipCompleted }[stateKey];
    const stateLabel = { 'in-progress': ui.stateInProgress, overdue: ui.stateOverdue, completed: ui.stateCompleted }[stateKey];

    // SVG ring
    const R = 66;
    const C = 2 * Math.PI * R;
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
        return isCard ? { key: 'card', label: ui.paymentMethodZeffy } : { key: 'cash', label: ui.paymentMethodCash };
    }

    // ── Pending-payment localStorage helpers ──
    function savePendingToStorage(list) {
        if (!profile?.email) return;
        try { localStorage.setItem(`pending_pmts_${profile.email}`, JSON.stringify(list)); } catch { /* ignore */ }
    }
    function scrollToMessage(ref) {
        if (typeof window === 'undefined') return;
        window.setTimeout(() => {
            ref.current?.focus?.({ preventScroll: true });
            ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 40);
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
    function closeModal() {
        setModal(null);
        setError('');
        setSuccess('');
        setProfileError('');
        setProfileSuccess('');
        setPasswordError('');
        setPasswordSuccess('');
        setEditingPendingId(null);
        setPayStep(null);
    }

    function openSettings() {
        setProfileError('');
        setProfileSuccess('');
        setPasswordError('');
        setPasswordSuccess('');
        setModal('settings');
    }
    function openContact(type = 'other') { setContactForm(p => ({ ...p, type })); setModal('contact'); }
    function openEngagement() {
        setEngForm({
            totalPledge: profile?.engagement?.totalPledge ? String(profile.engagement.totalPledge) : '',
            endDate: profile?.engagement?.endDate ? String(profile.engagement.endDate).slice(0, 10) : '',
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
        e.preventDefault();
        setProfileError('');
        setProfileSuccess('');
        try {
            const up = await updateMe({ name: profileForm.name.trim(), email: profileForm.email.trim().toLowerCase() });
            setProfile(p => ({ ...p, ...up }));
            setStoredSession({ ...(getStoredSession() || {}), ...up, role: 'donor' });
            setProfileSuccess(ui.profileUpdated);
            scrollToMessage(profileMessageRef);
        } catch (err) {
            setProfileError(err?.message || ui.errUpdateProfile);
            scrollToMessage(profileMessageRef);
        }
    }

    async function onPasswordSave(e) {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess('');
        if (!canSubmitPassword) return;
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError(ui.pwdMismatch);
            scrollToMessage(passwordMessageRef);
            return;
        }
        try {
            await updateMyPassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setPasswordSuccess(ui.passwordUpdated);
            scrollToMessage(passwordMessageRef);
        } catch (err) {
            setPasswordError(err?.message || ui.errUpdatePassword);
            scrollToMessage(passwordMessageRef);
        }
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
            <div className="mosque-donation dashboard-preloader-shell" data-theme="dark">
                <SitePreloader title={t.centerName || DEFAULT_TRANSLATION.centerName} subtitle={ui.loadingDashboard} />
            </div>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div dir={isRTL ? 'rtl' : 'ltr'} className="mosque-donation" data-theme={themeMode} suppressHydrationWarning>
            <Header
                language={language} setLanguage={setLanguage} t={t}
                theme={theme} themeMode={themeMode} setThemeMode={setThemeMode}
                showLanguageMenu={showLangMenu} setShowLanguageMenu={setShowLangMenu}
                languageDropdownRef={langDropRef}
                onOpenAccountSettings={openSettings}
                onOpenAccountContact={() => openContact('other')}
                isLoginPage={false} showHeaderCenter={false}
            />

            <main className="pg-shell">
                {loading ? (
                    <div className="pg-loading" role="status" aria-label={ui.loading}>
                        <span className="pg-spinner" />
                    </div>
                ) : (
                    <div className={`pg-cols${isSidenavCollapsed ? ' pg-cols--collapsed' : ''}`}>

                        {/* ══════════════════════════════════════
                            LEFT NAV
                        ══════════════════════════════════════ */}
                        <nav className={`sidenav${isSidenavCollapsed ? ' sidenav--collapsed' : ''}${!isMobileNavOpen ? ' sidenav--mobile-closed' : ''}`} aria-label={ui.donorNavigation}>
                            <div className="sidenav-head">
                                {!isSidenavCollapsed ? <p className="sidenav-label">{ui.menu}</p> : <span className="sidenav-spacer" aria-hidden="true"></span>}
                                {/* Desktop collapse toggle (icon-only sidebar) */}
                                <button
                                    type="button"
                                    className="sidenav-toggle sidenav-toggle--desktop"
                                    onClick={() => setIsSidenavCollapsed((value) => !value)}
                                    aria-label={isSidenavCollapsed ? ui.expandSidebar : ui.collapseSidebar}
                                    title={isSidenavCollapsed ? ui.expandSidebar : ui.collapseSidebar}
                                >
                                    <Ico size={16}>
                                        {isRTL ? (
                                            isSidenavCollapsed
                                                ? <polyline points="15 18 9 12 15 6" />
                                                : <polyline points="9 18 15 12 9 6" />
                                        ) : (
                                            isSidenavCollapsed
                                                ? <polyline points="9 18 15 12 9 6" />
                                                : <polyline points="15 18 9 12 15 6" />
                                        )}
                                    </Ico>
                                </button>
                                {/* Mobile collapse toggle (show/hide menu buttons only) */}
                                <button
                                    type="button"
                                    className="sidenav-toggle sidenav-toggle--mobile"
                                    onClick={() => setIsMobileNavOpen((value) => !value)}
                                    aria-label={isMobileNavOpen ? ui.collapseSidebar : ui.expandSidebar}
                                    title={isMobileNavOpen ? ui.collapseSidebar : ui.expandSidebar}
                                >
                                    <Ico size={16}>
                                        {isMobileNavOpen
                                            ? <polyline points="18 15 12 9 6 15" />
                                            : <polyline points="6 9 12 15 18 9" />
                                        }
                                    </Ico>
                                </button>
                            </div>

                            {/* ── My Community ── */}
                            {!isSidenavCollapsed && <p className="sidenav-section-label">{ui.sectionCommunity || 'My community'}</p>}

                            <button type="button" className="sidenav-btn sidenav-btn--active" title={isSidenavCollapsed ? (ui.dashboard || 'My donations') : undefined}>
                                <span className="sidenav-icon">
                                    <Ico size={17}>
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                        <line x1="1" y1="10" x2="23" y2="10" />
                                    </Ico>
                                </span>
                                {!isSidenavCollapsed ? (ui.dashboard || 'My donations') : null}
                            </button>

                            {FEATURES.VOLUNTEERING ? (
                                <button type="button" className="sidenav-btn" onClick={() => router.push('/donor/volunteering')} title={isSidenavCollapsed ? (ui.volunteeringTab || 'Volunteering') : undefined}>
                                    <span className="sidenav-icon">
                                        <Ico size={17}>
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
                                            <circle cx="9" cy="7" r="4" />
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                        </Ico>
                                    </span>
                                    {!isSidenavCollapsed ? (ui.volunteeringTab || 'Volunteering') : null}
                                </button>
                            ) : null}

                            {/* ── Support ── */}
                            <div className="sidenav-divider" role="separator" />
                            {!isSidenavCollapsed && <p className="sidenav-section-label">{ui.sectionSupport || 'Support'}</p>}

                            <button type="button" className="sidenav-btn" onClick={openSettings} title={isSidenavCollapsed ? ui.settings : undefined}>
                                <span className="sidenav-icon">
                                    <Ico size={17}>
                                        <circle cx="12" cy="12" r="3" />
                                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                                    </Ico>
                                </span>
                                {!isSidenavCollapsed ? ui.settings : null}
                            </button>

                            <button type="button" className="sidenav-btn" onClick={() => openContact('other')} title={isSidenavCollapsed ? ui.contactAdmin : undefined}>
                                <span className="sidenav-icon">
                                    <Ico size={17}>
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </Ico>
                                </span>
                                {!isSidenavCollapsed ? ui.contactAdmin : null}
                            </button>

                            <button type="button" className="sidenav-btn sidenav-btn--danger" onClick={handleLogout} title={isSidenavCollapsed ? ui.logout : undefined}>
                                <span className="sidenav-icon">
                                    <Ico size={17}>
                                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                                        <polyline points="16 17 21 12 16 7" />
                                        <line x1="21" y1="12" x2="9" y2="12" />
                                    </Ico>
                                </span>
                                {!isSidenavCollapsed ? ui.logout : null}
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
                            {!hasOpenModal && error ? <div className="banner banner--error" role="alert">{error}</div> : null}
                            {!hasOpenModal && success ? <div className="banner banner--success" role="status">{success}</div> : null}

                            {/* ─────────────────────────────────
                                ENGAGEMENT CARD
                            ───────────────────────────────── */}
                            <section className="card card--eng">

                                {/* Card header row */}
                                <div className="card-hd">
                                    <div className="card-hd-left">
                                        <span className="card-icon">
                                            <Ico size={18}>
                                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
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
                                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
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
                                                    <feGaussianBlur stdDeviation="3.5" result="blur" />
                                                    <feMerge>
                                                        <feMergeNode in="blur" />
                                                        <feMergeNode in="SourceGraphic" />
                                                    </feMerge>
                                                </filter>
                                            </defs>
                                            {/* Track */}
                                            <circle className="ring-track" cx="80" cy="80" r={R} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="13" />
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
                                                    icon: <Ico size={13}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></Ico>,
                                                },
                                                {
                                                    label: ui.paid,
                                                    value: `$${totalPaid.toLocaleString()}`,
                                                    icon: <Ico size={13}><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></Ico>,
                                                },
                                                {
                                                    label: ui.remaining,
                                                    value: `$${remaining.toLocaleString()}`,
                                                    accent: true,
                                                    icon: <Ico size={13}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Ico>,
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
                                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                        <line x1="16" y1="2" x2="16" y2="6" />
                                                        <line x1="8" y1="2" x2="8" y2="6" />
                                                        <line x1="3" y1="10" x2="21" y2="10" />
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
                                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                                <line x1="1" y1="10" x2="23" y2="10" />
                                            </Ico>
                                        </span>
                                        <h2 className="card-title">{ui.historyTitle}</h2>
                                    </div>
                                    <button type="button" className="btn btn--cta" onClick={openPayment}>
                                        <Ico size={15}>
                                            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                            <line x1="1" y1="10" x2="23" y2="10" />
                                        </Ico>
                                        {ui.makePayment}
                                    </button>
                                </div>

                                {payments.length === 0 && pendingPayments.length === 0 ? (
                                    <div className="empty-state">
                                        <Ico size={48} children={<><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></>} />
                                        <p>{ui.noPayments}</p>
                                    </div>
                                ) : (
                                    <div className="table-wrap">
                                        <div className="table-head">
                                            <span>{ui.colDate}</span>
                                            <span>{ui.colDisplayName}</span>
                                            <span>{ui.colAmount}</span>
                                            <span>{ui.colMethod}</span>
                                            <span>{ui.colNote}</span>
                                            <span>{ui.colReceipt}</span>
                                        </div>

                                        {/* ── Pending (local) payments first ── */}
                                        {pendingPayments.map(p => (
                                            <div key={p.id} className="table-row table-row--pending">
                                                <span className="cell-muted">{fmtDate(p.date)}</span>
                                                <span className="cell-muted">{p.displayName || profile?.name || '—'}</span>
                                                <span className="cell-amount">${Number(p.amount || 0).toLocaleString()}</span>
                                                <span>
                                                    <span className="pill pill--pending">
                                                        <Ico size={12}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Ico>
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
                                                                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                                                        <polyline points="14 2 14 8 20 8" />
                                                                        <line x1="16" y1="13" x2="8" y2="13" />
                                                                        <line x1="16" y1="17" x2="8" y2="17" />
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
                                                            <Ico size={12}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></Ico>
                                                            {ui.editPayment}
                                                        </button>
                                                        <button type="button" className="pending-btn pending-btn--cancel" onClick={() => deletePendingPayment(p.id)}>
                                                            <Ico size={12}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Ico>
                                                            {ui.cancelPayment}
                                                        </button>
                                                    </span>
                                                </span>
                                            </div>
                                        ))}

                                        {/* Pending info banner */}
                                        {pendingPayments.length > 0 && (
                                            <div className="pending-info-bar">
                                                <Ico size={14}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></Ico>
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
                                                    <span className="cell-muted">{p.displayName || '—'}</span>
                                                    <span className="cell-amount">${Number(p.amount || 0).toLocaleString()}</span>
                                                    <span>
                                                        <span className={`pill pill--${m.key}`}>
                                                            {m.key === 'card' ? (
                                                                <Ico size={12}><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></Ico>
                                                            ) : (
                                                                <Ico size={12}><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><circle cx="12" cy="14" r="3" /></Ico>
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
                                                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                                                                    <polyline points="14 2 14 8 20 8" />
                                                                    <line x1="16" y1="13" x2="8" y2="13" />
                                                                    <line x1="16" y1="17" x2="8" y2="17" />
                                                                    <polyline points="10 9 9 9 8 9" />
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
                    <fieldset className="fset">
                        <legend className="fset-legend">{ui.profile}</legend>
                        <form className="mform" onSubmit={onProfileSave}>
                            <div ref={profileMessageRef} tabIndex={-1}>
                                {profileError ? <div className="banner banner--error" role="alert">{profileError}</div> : null}
                                {profileSuccess ? <div className="banner banner--success" role="status">{profileSuccess}</div> : null}
                            </div>
                            <label className="flabel">
                                {ui.yourName}
                                <input className="finput" value={profileForm.name}
                                    onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                                    placeholder={ui.fullNamePlaceholder} />
                            </label>
                            <label className="flabel">
                                {ui.yourEmail}
                                <input className="finput" type="email" value={profileForm.email}
                                    onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                                    placeholder={ui.emailPlaceholder} />
                            </label>
                            <button type="submit" className="btn btn--primary">{ui.saveProfile}</button>
                        </form>
                    </fieldset>

                    <fieldset className="fset">
                        <legend className="fset-legend">{ui.password}</legend>
                        <form className="mform" onSubmit={onPasswordSave}>
                            <div ref={passwordMessageRef} tabIndex={-1}>
                                {passwordError ? <div className="banner banner--error" role="alert">{passwordError}</div> : null}
                                {passwordSuccess ? <div className="banner banner--success" role="status">{passwordSuccess}</div> : null}
                            </div>
                            <label className="flabel">
                                {ui.curPwd}
                                <div style={{ position: 'relative' }}>
                                    <input className="finput" type={showCurrentPassword ? 'text' : 'password'} value={passwordForm.currentPassword}
                                        onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))} style={{ paddingRight: '42px' }} />
                                    <button type="button" onClick={() => setShowCurrentPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}>
                                        {showCurrentPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                        )}
                                    </button>
                                </div>
                            </label>
                            <label className="flabel">
                                {ui.newPwd}
                                <div style={{ position: 'relative' }}>
                                    <input className="finput" type={showNewPassword ? 'text' : 'password'} value={passwordForm.newPassword}
                                        onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} style={{ paddingRight: '42px' }} />
                                    <button type="button" onClick={() => setShowNewPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label={showNewPassword ? 'Hide password' : 'Show password'}>
                                        {showNewPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                        )}
                                    </button>
                                </div>
                            </label>
                            <label className="flabel">
                                {ui.confPwd}
                                <div style={{ position: 'relative' }}>
                                    <input className="finput" type={showConfirmPassword ? 'text' : 'password'} value={passwordForm.confirmPassword}
                                        onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} style={{ paddingRight: '42px' }} />
                                    <button type="button" onClick={() => setShowConfirmPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                                        {showConfirmPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                        )}
                                    </button>
                                </div>
                            </label>
                            <button type="submit" className="btn btn--primary" disabled={!canSubmitPassword} aria-disabled={!canSubmitPassword}>{ui.updatePwd}</button>
                        </form>
                    </fieldset>
                </Modal>
            )}

            {/* Engagement */}
            {modal === 'engagement' && (
                <Modal title={ui.editEng} onClose={closeModal}>
                    {error && <div className="banner banner--error" role="alert">{error}</div>}
                    {success && <div className="banner banner--success" role="status">{success}</div>}
                    <form className="mform" onSubmit={onEngSave}>
                        <label className="flabel">
                            {ui.pledgeAmt}
                            <input className="finput" type="number" min="1" value={engForm.totalPledge}
                                onChange={e => setEngForm(p => ({ ...p, totalPledge: e.target.value }))}
                                placeholder={ui.pledgeExample} />
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
                    {error && <div className="banner banner--error" role="alert">{error}</div>}
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
                                <Ico size={22}><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></Ico>
                                <span className="pay-method-label">{ui.payViaZeffy}</span>
                                <span className="pay-method-sub">{ui.paymentMethodZeffy}</span>
                            </button>
                            <button type="button" className="pay-method-btn" onClick={() => setPayStep('cash')}>
                                <Ico size={22}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Ico>
                                <span className="pay-method-label">{ui.payByCash}</span>
                                <span className="pay-method-sub">{ui.paymentMethodCash}</span>
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
                            <Ico size={16}><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></Ico>
                            {ui.payViaZeffy}
                        </a>
                        <p className="pay-soon-note">{ui.zeffySoon}</p>
                        <button type="button" className="btn btn--ghost-sm" onClick={() => setPayStep(null)}>{ui.backToMethod}</button>
                    </>)}

                    {/* Step 1b: Cash / Interac form */}
                    {(editingPendingId || payStep === 'cash') && (
                        <form className="mform" onSubmit={onCashPayment}>
                            <div className="cash-guidance">
                                <Ico size={15}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></Ico>
                                <span>{ui.cashGuidance}</span>
                            </div>
                            <label className="flabel">
                                {ui.amount}
                                <input className="finput" type="number" min="1" value={cashForm.amount}
                                    onChange={e => setCashForm(p => ({ ...p, amount: e.target.value }))}
                                    placeholder={ui.zeroPlaceholder} />
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
                    {error && <div className="banner banner--error" role="alert">{error}</div>}
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
