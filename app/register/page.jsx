'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import '../page.scss';
import { Header } from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SitePreloader from '@/components/SitePreloader.jsx';
import { useTranslation, useThemeMode } from '@/hooks/index.js';
import { useFirstVisitPreloader } from '@/hooks/useFirstVisitPreloader.js';
import { THEMES } from '@/constants/config.js';
import { setupSEOMetaTags } from '@/lib/seoUtils.js';
import { DEFAULT_TRANSLATION, getAbsoluteUrl, getSiteUrl, truncateText } from '@/lib/translationUtils.js';
import { apiFetch, setAccessToken, setRefreshToken } from '@/lib/apiClient.js';
import { setStoredSession } from '@/lib/session.js';
import '../login/page.scss';

const normalizeOtpInput = (value) => {
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
};

export default function RegisterPage() {
    const router = useRouter();
    const { language, setLanguage, t, isMounted } = useTranslation();
    const { themeMode, setThemeMode, isMounted: themeMounted } = useThemeMode();
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const languageDropdownRef = useRef(null);
    const theme = THEMES[themeMode] ?? THEMES.dark;
    const appReady = isMounted && themeMounted;
    const { shouldShowPreloader, isResolved: preloaderResolved } = useFirstVisitPreloader(appReady);
    const isRTL = language === 'ar' || language === 'ur';
    const siteUrl = getSiteUrl();
    const pageUrl = getAbsoluteUrl(`/register?lang=${language}`, siteUrl);
    const socialImageUrl = getAbsoluteUrl('/logo-ccai.png', siteUrl);
    const auth = { ...(DEFAULT_TRANSLATION.auth ?? {}), ...(t.auth ?? {}) };
    const pageTitle = `${auth.registerPageTitle} | ${t.centerName || DEFAULT_TRANSLATION.centerName || 'Centre Zad Al-Imane'}`;
    const pageDescription = truncateText(auth.registerSeoDescription || DEFAULT_TRANSLATION.auth?.registerSeoDescription);
    const locale = t.locale ?? language;
    const logoAlt = `${t.centerName || DEFAULT_TRANSLATION.centerName || 'Centre Zad Al-Imane'} logo`;

    const [step, setStep] = useState('identity'); // identity -> otp
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [verifiedEmail, setVerifiedEmail] = useState('');
    const [status, setStatus] = useState({ loading: false, error: '', success: '' });
    const [sendingOtp, setSendingOtp] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (languageDropdownRef.current && showLanguageMenu) {
            const closeMenu = (event) => {
                if (!languageDropdownRef.current?.contains(event.target)) {
                    setShowLanguageMenu(false);
                }
            };
            document.addEventListener('click', closeMenu);
            return () => document.removeEventListener('click', closeMenu);
        }
    }, [showLanguageMenu]);

    useEffect(() => {
        if (!isMounted) return;

        setupSEOMetaTags({
            language,
            isRTL,
            pageTitle,
            pageDescription,
            pageUrl,
            socialImageUrl,
            logoAlt,
            locale,
            siteUrl,
            t,
            pagePath: '/register',
            pageType: 'register',
        });
    }, [isMounted, isRTL, language, locale, logoAlt, pageDescription, pageTitle, pageUrl, siteUrl, socialImageUrl, t]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const cachedEmail = window.sessionStorage.getItem('registerEmail');
        if (!cachedEmail) return;
        setEmail(cachedEmail);
        window.sessionStorage.removeItem('registerEmail');
    }, []);

    if (!appReady && shouldShowPreloader && preloaderResolved) {
        return (
            <div
                className="login-page-wrapper"
                data-theme="dark"
                suppressHydrationWarning
            >
                <SitePreloader title={t.centerName || DEFAULT_TRANSLATION.centerName} subtitle={DEFAULT_TRANSLATION.loadingSite} />
            </div>
        );
    }

    async function handleSendOtp(event) {
        event.preventDefault();
        setSendingOtp(true);
        setStatus((prev) => ({ ...prev, error: '', success: '' }));

        try {
            const normalizedName = name.trim();
            const normalizedEmail = email.trim().toLowerCase();

            if (normalizedName.length < 2) {
                throw new Error(auth.invalidNameLength);
            }

            await apiFetch('/api/auth/donor/register/send-otp', {
                method: 'POST',
                body: JSON.stringify({ email: normalizedEmail }),
            });

            setStep('otp');
            setVerifiedEmail(normalizedEmail);
            setStatus({ loading: false, error: '', success: auth.verificationCodeSent });
        } catch (error) {
            if (error?.code === 'EMAIL_TAKEN') {
                localStorage.setItem('rememberedEmail', email.trim().toLowerCase());
                router.push('/login');
                return;
            }
            setStatus((prev) => ({
                ...prev,
                loading: false,
                error: error?.message || auth.unableToSendCode,
            }));
        } finally {
            setSendingOtp(false);
        }
    }

    async function handleVerifyAndCreate(event) {
        event.preventDefault();
        setSubmitting(true);
        setStatus((prev) => ({ ...prev, error: '', success: '' }));

        const normalizedCode = normalizeOtpInput(otpCode);
        if (!/^\d{6}$/.test(normalizedCode)) {
            setStatus((prev) => ({ ...prev, error: auth.invalidOtpCode }));
            setSubmitting(false);
            return;
        }

        const normalizedEmail = (verifiedEmail || email).trim().toLowerCase();

        try {
            await apiFetch('/api/auth/donor/register/verify-otp', {
                method: 'POST',
                body: JSON.stringify({ email: normalizedEmail, code: normalizedCode }),
            });

            const data = await apiFetch('/api/auth/donor/register/complete', {
                method: 'POST',
                body: JSON.stringify({
                    email: normalizedEmail,
                    name: name.trim(),
                }),
            });

            if (data?.tokens?.accessToken) setAccessToken(data.tokens.accessToken);
            if (data?.tokens?.refreshToken) setRefreshToken(data.tokens.refreshToken);
            if (data?.donor) setStoredSession({ ...data.donor, role: 'donor' });

            setStatus({ loading: false, error: '', success: auth.accountCreated });

            localStorage.setItem('rememberedEmail', normalizedEmail);

            setTimeout(() => router.replace('/donor/dashboard'), 1500);
        } catch (error) {
            setStatus((prev) => ({
                ...prev,
                loading: false,
                error: error?.message || auth.unableToVerifyCode,
            }));
        } finally {
            setSubmitting(false);
        }
    }

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
            <div className="login-container">
                <div className="login-card login-card--wide">
                    <div className="login-content">
                        <p className="login-eyebrow">{auth.registerKicker}</p>
                        <h2 className="login-title">{auth.registerTitle}</h2>
                        <p className="login-description">{auth.registerDescription}</p>
                        <div className="register-steps" aria-label={auth.registrationProgress}>
                            <span className={`register-step${step === 'identity' ? ' active' : ''}`}>1. {auth.registerStep1}</span>
                            <span className={`register-step${step === 'otp' ? ' active' : ''}`}>2. {auth.registerStep2}</span>
                        </div>
                    </div>

                    {status.error ? <div className="login-alert login-alert--error">{status.error}</div> : null}
                    {status.success ? <div className="login-alert login-alert--success">{status.success}</div> : null}

                    {step === 'identity' && (
                        <form className="login-form" onSubmit={handleSendOtp} noValidate>
                            <label className="login-label">
                                <span>{auth.fullName}</span>
                                <input
                                    className="login-input"
                                    type="text"
                                    autoComplete="name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    required
                                />
                            </label>

                            <label className="login-label">
                                <span>{auth.emailLabel}</span>
                                <input
                                    className="login-input"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                />
                            </label>

                            <button type="submit" className="login-primary-button" disabled={sendingOtp || status.loading}>
                                {sendingOtp ? auth.sendingCode : auth.sendVerificationCode}
                            </button>
                        </form>
                    )}

                    {step === 'otp' && (
                        <form className="login-form" onSubmit={handleVerifyAndCreate} noValidate>
                            <p className="login-description">
                                {auth.verificationCodeSent} <strong>{verifiedEmail || email}</strong>
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
                                    onChange={(event) => setOtpCode(normalizeOtpInput(event.target.value))}
                                    placeholder={auth.otpPlaceholder}
                                    required
                                    autoFocus
                                />
                            </label>

                            <div className="register-actions-row">
                                <button type="submit" className="login-primary-button" disabled={submitting || status.loading}>
                                    {submitting ? auth.creatingAccount : auth.createAccount}
                                </button>
                                <button
                                    type="button"
                                    className="login-primary-button login-primary-button--secondary"
                                    onClick={(event) => handleSendOtp(event)}
                                    disabled={sendingOtp || status.loading}
                                >
                                    {sendingOtp ? auth.resending : auth.resendCode}
                                </button>
                                <button
                                    type="button"
                                    className="login-primary-button login-primary-button--secondary"
                                    onClick={() => {
                                        setStep('identity');
                                        setOtpCode('');
                                        setStatus({ loading: false, error: '', success: '' });
                                    }}
                                >
                                    {auth.back}
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="login-links login-links--footer">
                        <Link href="/login" className="login-inline-link">{auth.alreadyHaveAccount}</Link>
                    </div>
                </div>
            </div>
            <Footer t={isMounted ? t : {}} />
        </div>
    );
}
