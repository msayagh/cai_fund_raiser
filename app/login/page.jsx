'use client';

// ─────────────────────────────────────────────
// Login page — rewritten from scratch
// Backup of previous version: page.jsx.backup2
// ─────────────────────────────────────────────

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SitePreloader from '@/components/SitePreloader.jsx';
import { useTranslation, useThemeMode } from '@/hooks/index.js';
import { useFirstVisitPreloader } from '@/hooks/useFirstVisitPreloader.js';
import { THEMES } from '@/constants/config.js';
import { setupSEOMetaTags } from '@/lib/seoUtils.js';
import { getAbsoluteUrl, getSiteUrl, truncateText } from '@/lib/translationUtils.js';
import { adminLogin, clearTokens, donorLogin, logout, tryAutoLogin } from '@/lib/auth.js';
import { hasRefreshToken } from '@/lib/apiClient.js';
import { getStoredSession } from '@/lib/session.js';
import './page.scss';

// ─────────────────────────────────────────────
// English fallbacks — merged with t.auth at render time
// ─────────────────────────────────────────────
const DEFAULT_AUTH_TEXT = {
    loginSeoDescription: 'Secure donor and admin login for the Centre Zad Al-Imane platform.',
    donorAccessTitle: 'Donor access',
    adminAccessTitle: 'Admin access',
    loginHeading: 'Sign in to your portal',
    donorLoginDescription: 'Use the same email as your donations to link your history and follow your engagement.',
    adminLoginDescription: 'Use your administrator credentials to manage donors, requests, and campaign activity.',
    roleSwitcherLabel: 'Account type',
    donorTab: 'Donor',
    adminTab: 'Admin',
    showcaseKicker: 'How it works',
    donorShowcaseTitle: 'A simple 3-step donor journey',
    donorShowcaseCopy: 'Create your account with the same email used for your donations.',
    donorStep1: 'Create your account and link it to your donations.',
    donorStep2: 'Choose an engagement.',
    donorStep3: 'Pay at your own pace and monitor your progress.',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    signInDonor: 'Sign in as donor',
    signInAdmin: 'Sign in as admin',
    signingIn: 'Signing in\u2026',
    createDonorAccount: 'Create a donor account',
    alignedEmailHint: 'Use the same email address as your donations to keep your history aligned.',
    signedInAs: 'Signed in as',
    signOut: 'Sign out',
    signedOut: 'You have been signed out.',
    adminSessionRestored: 'Admin session restored.',
    donorSessionRestored: 'Donor session restored.',
    sessionRestored: 'Session restored.',
    adminLoginSuccess: 'Admin login successful.',
    donorLoginSuccess: 'Donor login successful.',
    unableToSignIn: 'Unable to sign in right now.',
};

function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const hydratedRef = useRef(false);
    const { language, setLanguage, t, isMounted } = useTranslation();
    const { themeMode, setThemeMode, isMounted: themeMounted } = useThemeMode();
    const theme = THEMES[themeMode] ?? THEMES.dark;
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const languageDropdownRef = useRef(null);
    const appReady = isMounted && themeMounted;
    const { shouldShowPreloader, isResolved: preloaderResolved } = useFirstVisitPreloader(appReady);
    const isRTL = language === 'ar' || language === 'ur';

    const siteUrl = getSiteUrl();
    const pageUrl = getAbsoluteUrl(`/login?lang=${language}`, siteUrl);
    const socialImageUrl = getAbsoluteUrl('/logo-ccai.png', siteUrl);

    const auth = { ...DEFAULT_AUTH_TEXT, ...(t.auth ?? {}) };
    const pageTitle = `${t.loginTitle || 'Login'} | ${t.centerName || 'Centre Zad Al-Imane'}`;
    const pageDescription = truncateText(
        auth.loginSeoDescription || 'Secure donor and admin login for the Centre Zad Al-Imane platform.',
    );
    const locale = t.locale ?? language;
    const logoAlt = `${t.centerName || 'Centre Zad Al-Imane'} logo`;

    const initialRole = searchParams.get('role') === 'admin' ? 'admin' : 'donor';
    const [activeRole, setActiveRole] = useState(initialRole);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [status, setStatus] = useState({ loading: true, error: '', success: '', user: null, role: null });
    const [submitting, setSubmitting] = useState(false);

    // ── Close language menu on outside click ──
    useEffect(() => {
        if (!languageDropdownRef.current || !showLanguageMenu) return;
        const close = (e) => {
            if (!languageDropdownRef.current?.contains(e.target)) setShowLanguageMenu(false);
        };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [showLanguageMenu]);

    // ── Sync role from URL param ──
    useEffect(() => { setActiveRole(initialRole); }, [initialRole]);

    // ── SEO + remembered email ──
    useEffect(() => {
        if (!isMounted) return;
        setupSEOMetaTags({
            language, isRTL, pageTitle, pageDescription, pageUrl,
            socialImageUrl, logoAlt, locale, siteUrl, t,
            pagePath: '/login', pageType: 'login',
        });
        const saved = localStorage.getItem('rememberedEmail');
        if (saved) { setEmail(saved); setRememberMe(true); }
    }, [isMounted, isRTL, language, locale, logoAlt, pageDescription, pageTitle, pageUrl, siteUrl, socialImageUrl, t]);

    // ── Session hydration ──
    useEffect(() => {
        if (hydratedRef.current) return;
        hydratedRef.current = true;
        let active = true;

        async function hydrate() {
            try {
                const saved = getStoredSession();
                if (!saved || !hasRefreshToken()) {
                    clearTokens();
                    setStatus({ loading: false, error: '', success: '', user: null, role: null });
                    return;
                }
                const refreshed = await tryAutoLogin();
                if (!active) return;
                if (!refreshed) {
                    clearTokens();
                    setStatus({ loading: false, error: '', success: '', user: null, role: null });
                    return;
                }
                const parsed = getStoredSession();
                setStatus({
                    loading: false,
                    error: '',
                    success: parsed
                        ? (parsed.role === 'admin' ? auth.adminSessionRestored : auth.donorSessionRestored)
                        : auth.sessionRestored,
                    user: parsed,
                    role: parsed?.role ?? null,
                });
            } catch {
                if (!active) return;
                clearTokens();
                setStatus({ loading: false, error: '', success: '', user: null, role: null });
            }
        }

        hydrate();
        return () => { active = false; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Redirect once session is confirmed ──
    useEffect(() => {
        if (!status.user || status.loading) return;
        router.replace(status.role === 'admin' ? '/admin/dashboard' : '/donor/dashboard');
    }, [router, status.loading, status.role, status.user]);

    // ─────────────────────────────────────────
    // Preloader
    // ─────────────────────────────────────────
    if (!appReady && shouldShowPreloader && preloaderResolved) {
        return (
            <div className="login-page-wrapper" data-theme="dark" suppressHydrationWarning>
                <SitePreloader title="Centre Zad Al-Imane" subtitle="Loading" />
            </div>
        );
    }

    // ─────────────────────────────────────────
    // Form handlers
    // ─────────────────────────────────────────
    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitting(true);
        setStatus((prev) => ({ ...prev, error: '', success: '' }));

        try {
            const user = activeRole === 'admin'
                ? await adminLogin(email.trim().toLowerCase(), password)
                : await donorLogin(email.trim().toLowerCase(), password);

            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email.trim().toLowerCase());
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            setStatus({
                loading: false,
                error: '',
                success: activeRole === 'admin' ? auth.adminLoginSuccess : auth.donorLoginSuccess,
                user: { ...user, role: activeRole },
                role: activeRole,
            });
            setPassword('');
        } catch (err) {
            const msg = err?.message || auth.unableToSignIn;
            if (activeRole === 'donor' && msg.toLowerCase().includes('not found')) {
                sessionStorage.setItem('registerEmail', email.trim().toLowerCase());
                router.push('/register');
                return;
            }
            setStatus((prev) => ({ ...prev, loading: false, error: msg, success: '' }));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleLogout() {
        await logout();
        setStatus({ loading: false, error: '', success: auth.signedOut, user: null, role: null });
    }

    // ─────────────────────────────────────────
    // Derived display values
    // ─────────────────────────────────────────
    const authTitle       = activeRole === 'admin' ? auth.adminAccessTitle  : auth.donorAccessTitle;
    const authDescription = activeRole === 'admin' ? auth.adminLoginDescription : auth.donorLoginDescription;
    const showcaseSteps   = [auth.donorStep1, auth.donorStep2, auth.donorStep3];

    // ─────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────
    return (
        <div
            className="login-page-wrapper"
            data-theme={themeMode}
            dir={isRTL ? 'rtl' : 'ltr'}
            suppressHydrationWarning
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                *, *::before, *::after { box-sizing: border-box; }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-thumb { background: rgba(200,169,110,.22); border-radius: 4px; }
            `}</style>

            <Header
                language={language}
                setLanguage={setLanguage}
                t={t}
                theme={theme}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                ramadanRaised={0}
                headerRamadanPct={0}
                showLanguageMenu={showLanguageMenu}
                setShowLanguageMenu={setShowLanguageMenu}
                languageDropdownRef={languageDropdownRef}
                isLoginPage={true}
            />

            <main className="login-container">
                <div className="login-shell">

                    {/* ─────────────────────────
                        LEFT: 3-step showcase
                    ───────────────────────── */}
                    <section className="login-showcase" aria-label={auth.showcaseKicker}>
                        <div className="login-showcase-card">
                            <p className="login-showcase-kicker">{auth.showcaseKicker}</p>
                            <h1 className="login-showcase-title">{auth.donorShowcaseTitle}</h1>
                            <p className="login-showcase-copy">{auth.donorShowcaseCopy}</p>

                            <div className="login-steps">
                                {showcaseSteps.map((text, index) => (
                                    <div key={index} className="login-step">
                                        <div className="login-step-num" aria-hidden="true">{index + 1}</div>
                                        <p className="login-step-text">{text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* ─────────────────────────
                        RIGHT: Auth card
                    ───────────────────────── */}
                    <div className="login-card login-card--wide">

                        <div className="login-content">
                            <p className="login-eyebrow">{authTitle}</p>
                            <h2 className="login-title">{auth.loginHeading}</h2>
                            <p className="login-description">{authDescription}</p>
                        </div>

                        {/* Role tabs */}
                        <div className="login-role-switcher" role="tablist" aria-label={auth.roleSwitcherLabel}>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeRole === 'donor'}
                                className={`login-role-button${activeRole === 'donor' ? ' active' : ''}`}
                                onClick={() => setActiveRole('donor')}
                            >
                                {auth.donorTab}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeRole === 'admin'}
                                className={`login-role-button${activeRole === 'admin' ? ' active' : ''}`}
                                onClick={() => setActiveRole('admin')}
                            >
                                {auth.adminTab}
                            </button>
                        </div>

                        {/* Feedback banners */}
                        {status.error
                            ? <div className="login-alert login-alert--error" role="alert">{status.error}</div>
                            : null}
                        {status.success
                            ? <div className="login-alert login-alert--success" role="status">{status.success}</div>
                            : null}

                        {/* Active session view */}
                        {status.user ? (
                            <div className="login-session-card">
                                <div>
                                    <p className="login-session-label">{auth.signedInAs}</p>
                                    <p className="login-session-name">{status.user.name || status.user.email}</p>
                                    <p className="login-session-meta">{status.user.email} &middot; {status.role}</p>
                                </div>
                                <button
                                    type="button"
                                    className="login-primary-button login-primary-button--secondary"
                                    onClick={handleLogout}
                                >
                                    {auth.signOut}
                                </button>
                            </div>
                        ) : (
                            /* Login form */
                            <form className="login-form" onSubmit={handleSubmit} noValidate>
                                <label className="login-label">
                                    <span>{auth.emailLabel}</span>
                                    <input
                                        className="login-input"
                                        type="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </label>

                                <label className="login-label">
                                    <span>{auth.passwordLabel}</span>
                                    <input
                                        className="login-input"
                                        type="password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </label>

                                <div className="login-form-row">
                                    <label className="login-checkbox-label">
                                        <input
                                            type="checkbox"
                                            className="login-checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                        />
                                        <span>{auth.rememberMe}</span>
                                    </label>
                                    <Link
                                        href={`/forgot-password?role=${activeRole}`}
                                        className="login-inline-link"
                                    >
                                        {auth.forgotPassword}
                                    </Link>
                                </div>

                                <button
                                    type="submit"
                                    className="login-primary-button"
                                    disabled={submitting || status.loading}
                                >
                                    {submitting
                                        ? auth.signingIn
                                        : activeRole === 'admin'
                                            ? auth.signInAdmin
                                            : auth.signInDonor}
                                </button>

                                {activeRole === 'donor' && (
                                    <Link href="/register" className="login-secondary-action">
                                        {auth.createDonorAccount}
                                    </Link>
                                )}
                            </form>
                        )}

                        <div className="login-links login-links--footer">
                            <p className="login-footer-note">{auth.alignedEmailHint}</p>
                        </div>
                    </div>

                </div>
            </main>

            <Footer t={isMounted ? t : {}} />
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginPageContent />
        </Suspense>
    );
}
