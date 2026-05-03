'use client';

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
import { DEFAULT_TRANSLATION, getAbsoluteUrl, getSiteUrl, truncateText } from '@/lib/translationUtils.js';
import {
    clearTokens,
    logout,
    sendAdminLoginOtp,
    sendDonorLoginOtp,
    tryAutoLogin,
    verifyAdminLoginOtp,
    verifyDonorLoginOtp,
} from '@/lib/auth.js';
import { hasRefreshToken } from '@/lib/apiClient.js';
import { getStoredSession } from '@/lib/session.js';
import './page.scss';

function normalizeOtpInput(value) {
    const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
    const easternArabicIndic = '۰۱۲۳۴۵۶۷۸۹';
    return String(value || '')
        .split('')
        .map((char) => {
            const ai = arabicIndic.indexOf(char);
            if (ai >= 0) return String(ai);
            const eai = easternArabicIndic.indexOf(char);
            if (eai >= 0) return String(eai);
            return char;
        })
        .join('')
        .replace(/\D/g, '')
        .slice(0, 6);
}

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

    const auth = { ...(DEFAULT_TRANSLATION.auth ?? {}), ...(t.auth ?? {}) };
    const pageTitle = `${t.loginTitle || DEFAULT_TRANSLATION.loginTitle || 'Login'} | ${t.centerName || DEFAULT_TRANSLATION.centerName || 'Centre Zad Al-Imane'}`;
    const pageDescription = truncateText(
        auth.loginSeoDescription || DEFAULT_TRANSLATION.auth?.loginSeoDescription || 'Secure donor and admin login for the Centre Zad Al-Imane platform.',
    );
    const locale = t.locale ?? language;
    const logoAlt = `${t.centerName || DEFAULT_TRANSLATION.centerName || 'Centre Zad Al-Imane'} logo`;

    const initialRole = searchParams.get('role') === 'admin' ? 'admin' : 'donor';
    const [activeRole, setActiveRole] = useState(initialRole);
    const [step, setStep] = useState('email'); // 'email' | 'otp'
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [status, setStatus] = useState({ loading: true, error: '', success: '', user: null, role: null });
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);

    useEffect(() => {
        if (!languageDropdownRef.current || !showLanguageMenu) return;
        const close = (e) => {
            if (!languageDropdownRef.current?.contains(e.target)) setShowLanguageMenu(false);
        };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [showLanguageMenu]);

    useEffect(() => {
        setActiveRole(initialRole);
        setStep('email');
        setOtpCode('');
        setStatus((prev) => ({ ...prev, error: '', success: '' }));
    }, [initialRole]);

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

    useEffect(() => {
        if (!status.user || status.loading) return;
        router.replace(status.role === 'admin' ? '/admin/dashboard' : '/donor/dashboard');
    }, [router, status.loading, status.role, status.user]);

    if (!appReady && shouldShowPreloader && preloaderResolved) {
        return (
            <div className="login-page-wrapper" data-theme="dark" suppressHydrationWarning>
                <SitePreloader title={t.centerName || DEFAULT_TRANSLATION.centerName} subtitle={DEFAULT_TRANSLATION.loadingSite} />
            </div>
        );
    }

    async function handleSendOtp(event) {
        event?.preventDefault();
        setSendingOtp(true);
        setStatus((prev) => ({ ...prev, error: '', success: '' }));

        const normalizedEmail = email.trim().toLowerCase();

        try {
            if (activeRole === 'admin') {
                await sendAdminLoginOtp(normalizedEmail);
            } else {
                await sendDonorLoginOtp(normalizedEmail);
            }

            if (rememberMe) {
                localStorage.setItem('rememberedEmail', normalizedEmail);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            setStep('otp');
            setOtpCode('');
            setStatus((prev) => ({ ...prev, loading: false, success: auth.verificationCodeSent }));
        } catch (err) {
            const code = err?.code;
            if (activeRole === 'donor' && (code === 'ACCOUNT_NOT_FOUND' || err?.status === 404)) {
                sessionStorage.setItem('registerEmail', normalizedEmail);
                router.push('/register');
                return;
            }
            setStatus((prev) => ({
                ...prev,
                loading: false,
                error: err?.message || auth.unableToSendCode,
            }));
        } finally {
            setSendingOtp(false);
        }
    }

    async function handleVerifyOtp(event) {
        event.preventDefault();
        setVerifyingOtp(true);
        setStatus((prev) => ({ ...prev, error: '', success: '' }));

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedCode = normalizeOtpInput(otpCode);

        if (!/^\d{6}$/.test(normalizedCode)) {
            setVerifyingOtp(false);
            setStatus((prev) => ({ ...prev, error: auth.invalidOtpCode }));
            return;
        }

        try {
            const user = activeRole === 'admin'
                ? await verifyAdminLoginOtp(normalizedEmail, normalizedCode)
                : await verifyDonorLoginOtp(normalizedEmail, normalizedCode);

            setStatus({
                loading: false,
                error: '',
                success: activeRole === 'admin' ? auth.adminLoginSuccess : auth.donorLoginSuccess,
                user: { ...user, role: activeRole },
                role: activeRole,
            });
            setOtpCode('');
        } catch (err) {
            setStatus((prev) => ({
                ...prev,
                loading: false,
                error: err?.message || auth.unableToVerifyCode,
            }));
        } finally {
            setVerifyingOtp(false);
        }
    }

    async function handleLogout() {
        await logout();
        setStatus({ loading: false, error: '', success: auth.signedOut, user: null, role: null });
        setStep('email');
        setOtpCode('');
    }

    const authTitle = activeRole === 'admin' ? auth.adminAccessTitle : auth.donorAccessTitle;
    const authDescription = activeRole === 'admin' ? auth.adminLoginDescription : auth.donorLoginDescription;
    const showcaseSteps = [auth.donorStep1, auth.donorStep2, auth.donorStep3];

    return (
        <div
            className="login-page-wrapper"
            data-theme={themeMode}
            dir={isRTL ? 'rtl' : 'ltr'}
            suppressHydrationWarning
        >
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

                    <div className="login-card login-card--wide">

                        <div className="login-content">
                            <p className="login-eyebrow">{authTitle}</p>
                            <h2 className="login-title">{auth.loginHeading}</h2>
                            <p className="login-description">{authDescription}</p>
                        </div>

                        <div className="login-role-switcher" role="tablist" aria-label={auth.roleSwitcherLabel}>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeRole === 'donor'}
                                className={`login-role-button${activeRole === 'donor' ? ' active' : ''}`}
                                onClick={() => {
                                    setActiveRole('donor');
                                    setStep('email');
                                    setOtpCode('');
                                    setStatus((prev) => ({ ...prev, error: '', success: '' }));
                                }}
                            >
                                {auth.donorTab}
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeRole === 'admin'}
                                className={`login-role-button${activeRole === 'admin' ? ' active' : ''}`}
                                onClick={() => {
                                    setActiveRole('admin');
                                    setStep('email');
                                    setOtpCode('');
                                    setStatus((prev) => ({ ...prev, error: '', success: '' }));
                                }}
                            >
                                {auth.adminTab}
                            </button>
                        </div>

                        {status.error
                            ? <div className="login-alert login-alert--error" role="alert">{status.error}</div>
                            : null}
                        {status.success
                            ? <div className="login-alert login-alert--success" role="status">{status.success}</div>
                            : null}

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
                        ) : step === 'email' ? (
                            <form className="login-form" onSubmit={handleSendOtp} noValidate>
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
                                </div>

                                <button
                                    type="submit"
                                    className="login-primary-button"
                                    disabled={sendingOtp || status.loading}
                                >
                                    {sendingOtp ? auth.sendingCode : auth.sendVerificationCode}
                                </button>

                                {activeRole === 'donor' && (
                                    <Link href="/register" className="login-secondary-action">
                                        {auth.createDonorAccount}
                                    </Link>
                                )}
                            </form>
                        ) : (
                            <form className="login-form" onSubmit={handleVerifyOtp} noValidate>
                                <p className="login-description">
                                    {auth.verificationCodeSent} <strong>{email}</strong>
                                </p>
                                <label className="login-label">
                                    <span>{auth.verificationCode}</span>
                                    <input
                                        className="login-input"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        autoComplete="one-time-code"
                                        value={otpCode}
                                        onChange={(e) => setOtpCode(normalizeOtpInput(e.target.value))}
                                        placeholder={auth.otpPlaceholder}
                                        required
                                        autoFocus
                                    />
                                </label>

                                <div className="register-actions-row">
                                    <button
                                        type="submit"
                                        className="login-primary-button"
                                        disabled={verifyingOtp || status.loading}
                                    >
                                        {verifyingOtp ? auth.verifying : auth.verifyCode}
                                    </button>
                                    <button
                                        type="button"
                                        className="login-primary-button login-primary-button--secondary"
                                        onClick={() => handleSendOtp()}
                                        disabled={sendingOtp || status.loading}
                                    >
                                        {sendingOtp ? auth.resending : auth.resendCode}
                                    </button>
                                    <button
                                        type="button"
                                        className="login-primary-button login-primary-button--secondary"
                                        onClick={() => {
                                            setStep('email');
                                            setOtpCode('');
                                            setStatus((prev) => ({ ...prev, error: '', success: '' }));
                                        }}
                                    >
                                        {auth.back}
                                    </button>
                                </div>
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
