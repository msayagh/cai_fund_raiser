'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useTranslation, useThemeMode } from '@/hooks/index.js';
import { THEMES } from '@/constants/config.js';
import { DEFAULT_TRANSLATION, TRANSLATION_MODULES } from '@/lib/translationUtils.js';
import { getMe, updateMe, updateMyPassword } from '@/lib/donorApi.js';
import { createRequest } from '@/lib/requestsApi.js';
import { clearTokens, tryAutoLogin } from '@/lib/auth.js';
import { clearStoredSession, getStoredSession, setStoredSession } from '@/lib/session.js';
import { getVolunteeringSettings } from '@/lib/settingsApi.js';
import { FEATURES } from '@/constants/features.js';
import VolunteeringTab from '../dashboard/VolunteeringTab.jsx';

// ─────────────────────────────────────────────
// Tiny reusable SVG icon (matches dashboard)
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
// i18n fallback labels (English)
// ─────────────────────────────────────────────
const EN_DONOR = {
    welcome: 'Welcome',
    settings: 'Settings',
    contactAdmin: 'Contact admin',
    logout: 'Log out',
    dashboard: 'My donations',
    volunteeringTab: 'Volunteering',
    profile: 'Profile',
    password: 'Password',
    saveProfile: 'Save profile',
    updatePwd: 'Update password',
    curPwd: 'Current password',
    newPwd: 'New password',
    confPwd: 'Confirm password',
    reqType: 'Request type',
    message: 'Message',
    yourName: 'Your name',
    yourEmail: 'E-mail',
    sendReq: 'Send request',
    attachFiles: 'Attach files (optional)',
    contactDesc: 'Send us a message for support or any question.',
    loading: 'Loading',
    sessionExpired: 'Session expired. Please log in again.',
    unableLoadDashboard: 'Unable to load page.',
    menu: 'Menu',
    donorNavigation: 'Donor navigation',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
    profileUpdated: 'Profile updated successfully.',
    passwordUpdated: 'Password updated successfully.',
    reqSubmitted: 'Request submitted successfully.',
    pwdMismatch: 'Passwords do not match.',
    errUpdateProfile: 'Unable to update profile.',
    errUpdatePassword: 'Unable to update password.',
    errSubmitReq: 'Unable to submit request.',
    reqGeneral: 'General request',
    reqPayment: 'Payment upload',
    reqEngagement: 'Engagement change',
    reqAccount: 'Account help',
    fullNamePlaceholder: 'Full name',
    emailPlaceholder: 'Email',
    close: 'Close',
    sectionCommunity: 'My community',
    sectionSupport: 'Support',
};

// ─────────────────────────────────────────────
// Modal wrapper (matches dashboard)
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
export default function DonorVolunteeringPage() {
    const router = useRouter();
    const langDropRef = useRef(null);

    const { language, setLanguage, t, isMounted: tMounted } = useTranslation();
    const { themeMode, setThemeMode, isMounted: themeMounted } = useThemeMode();
    const theme = THEMES[themeMode] ?? THEMES.dark;
    const [showLangMenu, setShowLangMenu] = useState(false);
    const isRTL = ['ar', 'ur'].includes(language);

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [volSettings, setVolSettings] = useState({ volEnabled: true, volShowDiscussion: true, volShowHistory: true, volShowUnscheduled: true });

    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isSidenavCollapsed, setIsSidenavCollapsed] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(true);
    const [modal, setModal] = useState(null);

    const [profileForm, setProfileForm] = useState({ name: '', email: '' });
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [contactForm, setContactForm] = useState({ type: 'other', message: '' });
    const [attachedFiles, setAttachedFiles] = useState([]);

    const profileMessageRef = useRef(null);
    const passwordMessageRef = useRef(null);

    const canSubmitPassword = Boolean(
        passwordForm.currentPassword.trim() &&
        passwordForm.newPassword.trim() &&
        passwordForm.confirmPassword.trim()
    );

    const ui = useMemo(
        () => ({ ...EN_DONOR, ...(TRANSLATION_MODULES[language]?.donor ?? {}) }),
        [language],
    );

    // ── Bootstrap ──
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
                    router.replace('/login');
                    return;
                }
                const me = await getMe();
                if (!alive) return;
                setProfile(me);
                setProfileForm({ name: me.name || '', email: me.email || '' });
                setStoredSession({ ...session, ...me, role: 'donor' });
                // Load volunteering feature settings in parallel (non-blocking)
                getVolunteeringSettings().then((s) => { if (alive) setVolSettings((prev) => ({ ...prev, ...s })); }).catch(() => {});
            } catch (err) {
                if (!alive) return;
                clearTokens(); clearStoredSession();
                setError(err?.message || ui.sessionExpired);
                router.replace('/login');
            } finally {
                if (alive) setLoading(false);
            }
        }

        boot();
        return () => { alive = false; };
    }, [router]);

    // ── Modal helpers ──
    function closeModal() {
        setModal(null);
        setError('');
        setSuccess('');
        setProfileError('');
        setProfileSuccess('');
        setPasswordError('');
        setPasswordSuccess('');
    }
    function openSettings() {
        setProfileError(''); setProfileSuccess('');
        setPasswordError(''); setPasswordSuccess('');
        setModal('settings');
    }
    function openContact(type = 'other') { setContactForm(p => ({ ...p, type })); setModal('contact'); }
    function handleLogout() { clearTokens(); clearStoredSession(); router.replace('/login'); }

    function scrollToMessage(ref) {
        if (typeof window === 'undefined') return;
        window.setTimeout(() => {
            ref.current?.focus?.({ preventScroll: true });
            ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 40);
    }

    // ── Form handlers ──
    async function onProfileSave(e) {
        e.preventDefault();
        setProfileError(''); setProfileSuccess('');
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
        setPasswordError(''); setPasswordSuccess('');
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

    async function onContactSend(e) {
        e.preventDefault(); setError(''); setSuccess('');
        try {
            await createRequest({ type: contactForm.type, name: profile?.name || '', email: profile?.email || '', message: contactForm.message.trim() });
            setContactForm({ type: 'other', message: '' });
            setSuccess(ui.reqSubmitted);
        } catch (err) { setError(err?.message || ui.errSubmitReq); }
    }

    if (!tMounted || !themeMounted) return null;

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
                                {/* Desktop collapse toggle */}
                                <button
                                    type="button"
                                    className="sidenav-toggle sidenav-toggle--desktop"
                                    onClick={() => setIsSidenavCollapsed((v) => !v)}
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
                                {/* Mobile collapse toggle */}
                                <button
                                    type="button"
                                    className="sidenav-toggle sidenav-toggle--mobile"
                                    onClick={() => setIsMobileNavOpen((v) => !v)}
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

                            <button type="button" className="sidenav-btn" onClick={() => router.push('/donor/dashboard')} title={isSidenavCollapsed ? (ui.dashboard || 'My donations') : undefined}>
                                <span className="sidenav-icon">
                                    <Ico size={17}>
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                        <line x1="1" y1="10" x2="23" y2="10" />
                                    </Ico>
                                </span>
                                {!isSidenavCollapsed ? (ui.dashboard || 'My donations') : null}
                            </button>

                            {FEATURES.VOLUNTEERING && volSettings.volEnabled ? (
                                <button type="button" className="sidenav-btn sidenav-btn--active" title={isSidenavCollapsed ? (ui.volunteeringTab || 'Volunteering') : undefined}>
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
                            <header className="welcome">
                                <h1 className="welcome-name">
                                    {ui.welcome}, <span className="welcome-highlight">{profile?.name || profile?.email || ''}</span>
                                </h1>
                            </header>

                            {error && <div className="banner banner--error" role="alert">{error}</div>}
                            {success && <div className="banner banner--success" role="status">{success}</div>}

                            {FEATURES.VOLUNTEERING && volSettings.volEnabled ? (
                                <VolunteeringTab donorId={profile?.id} donorName={profile?.name} ui={ui} volSettings={volSettings} />
                            ) : (
                                <p className="admin-muted">{ui.volunteeringTab || 'Volunteering'} is not available.</p>
                            )}
                        </div>

                    </div>
                )}
            </main>

            <Footer t={t} />

            {/* Settings modal */}
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

            {/* Contact admin modal */}
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
