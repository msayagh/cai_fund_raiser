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

    const [step, setStep] = useState('identity'); // identity -> otp -> account
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pledgeAmount, setPledgeAmount] = useState('');
    const [pledgeEndDate, setPledgeEndDate] = useState('');
    const [verifiedEmail, setVerifiedEmail] = useState('');
    const [status, setStatus] = useState({ loading: false, error: '', success: '' });
    const [sendingOtp, setSendingOtp] = useState(false);
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
                <SitePreloader title="Centre Zad Al-Imane" subtitle={DEFAULT_TRANSLATION.loadingSite} />
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
                body: JSON.stringify({
                    email: normalizedEmail,
                }),
            });

            setStep('otp');
            setVerifiedEmail(normalizedEmail);
            setStatus({
                loading: false,
                error: '',
                success: auth.verificationCodeSent,
            });
        } catch (error) {
            setStatus((prev) => ({
                ...prev,
                loading: false,
                error: error?.message || auth.unableToSendCode,
            }));
        } finally {
            setSendingOtp(false);
        }
    }

    async function handleVerifyOtp(event) {
        event.preventDefault();
        setVerifyingOtp(true);
        setStatus((prev) => ({ ...prev, error: '', success: '' }));

        try {
            const normalizedCode = normalizeOtpInput(otpCode);
            if (!/^\d{6}$/.test(normalizedCode)) {
                throw new Error(auth.invalidOtpCode);
            }

            await apiFetch('/api/auth/donor/register/verify-otp', {
                method: 'POST',
                body: JSON.stringify({
                    email: verifiedEmail || email.trim().toLowerCase(),
                    code: normalizedCode,
                }),
            });

            setStep('account');
            setStatus({ loading: false, error: '', success: auth.emailVerified });
        } catch (error) {
            setStatus((prev) => ({
                ...prev,
                loading: false,
                error: error?.message || auth.unableToVerifyCode,
            }));
        } finally {
            setVerifyingOtp(false);
        }
    }

    async function handleCompleteRegistration(event) {
        event.preventDefault();
        setSubmitting(true);
        setStatus((prev) => ({ ...prev, error: '', success: '' }));

        if (password.length < 8) {
            setStatus((prev) => ({ ...prev, error: auth.passwordMinLength }));
            setSubmitting(false);
            return;
        }

        if (password !== confirmPassword) {
            setStatus((prev) => ({ ...prev, error: auth.passwordsDoNotMatch }));
            setSubmitting(false);
            return;
        }

        let pledge = undefined;
        const normalizedPledge = pledgeAmount.trim();
        if (normalizedPledge !== '') {
            const numericPledge = Number(normalizedPledge);
            if (!Number.isFinite(numericPledge) || numericPledge <= 0) {
                setStatus((prev) => ({ ...prev, error: auth.invalidEngagementAmount }));
                setSubmitting(false);
                return;
            }

            pledge = { totalPledge: numericPledge };
            if (pledgeEndDate) {
                pledge.endDate = new Date(`${pledgeEndDate}T00:00:00`).toISOString();
            }
        }

        try {
            const normalizedEmail = (verifiedEmail || email).trim().toLowerCase();

            const data = await apiFetch('/api/auth/donor/register/complete', {
                method: 'POST',
                body: JSON.stringify({
                    email: normalizedEmail,
                    name: name.trim(),
                    password,
                    ...(pledge ? { pledge } : {}),
                }),
            });

            // Registration already returns an authenticated donor session.
            if (data?.tokens?.accessToken) setAccessToken(data.tokens.accessToken);
            if (data?.tokens?.refreshToken) setRefreshToken(data.tokens.refreshToken);
            if (data?.donor) setStoredSession({ ...data.donor, role: 'donor' });

            setStatus({
                loading: false,
                error: '',
                success: auth.accountCreated,
            });

            // Save email for "Remember me"
            localStorage.setItem('rememberedEmail', normalizedEmail);

            // Redirect to dashboard
            setTimeout(() => router.replace('/donor/dashboard'), 1500);
        } catch (error) {
            setStatus((prev) => ({
                ...prev,
                loading: false,
                error: error?.message || auth.unableToRegister,
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
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Amiri:wght@400;700&display=swap');
                *{box-sizing:border-box;margin:0;padding:0}
                ::-webkit-scrollbar{width:4px}
                ::-webkit-scrollbar-thumb{background:${theme.scrollbarThumb};border-radius:4px}
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
            <div className="login-container">
                <div className="login-card login-card--wide">
                    <div className="login-content">
                        <p className="login-eyebrow">{auth.registerKicker}</p>
                        <h2 className="login-title">{auth.registerTitle}</h2>
                        <p className="login-description">{auth.registerDescription}</p>
                        <div className="register-steps" aria-label={auth.registrationProgress}>
                            <span className={`register-step${step === 'identity' ? ' active' : ''}`}>1. {auth.registerStep1}</span>
                            <span className={`register-step${step === 'otp' ? ' active' : ''}`}>2. {auth.registerStep2}</span>
                            <span className={`register-step${step === 'account' ? ' active' : ''}`}>3. {auth.registerStep3}</span>
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
                        <form className="login-form" onSubmit={handleVerifyOtp} noValidate>
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
                                />
                            </label>

                            <div className="register-actions-row">
                                <button type="submit" className="login-primary-button" disabled={verifyingOtp || status.loading}>
                                    {verifyingOtp ? auth.verifying : auth.verifyCode}
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

                    {step === 'account' && (
                        <form className="login-form" onSubmit={handleCompleteRegistration} noValidate>
                            <label className="login-label">
                                <span>{auth.passwordLabel}</span>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        className="login-input"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        minLength={8}
                                        required
                                        style={{ paddingRight: '42px' }}
                                    />
                                    <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                        )}
                                    </button>
                                </div>
                            </label>

                            <label className="login-label">
                                <span>{auth.confirmPassword}</span>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        className="login-input"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        autoComplete="new-password"
                                        value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)}
                                        minLength={8}
                                        required
                                        style={{ paddingRight: '42px' }}
                                    />
                                    <button type="button" onClick={() => setShowConfirmPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                                        {showConfirmPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                        )}
                                    </button>
                                </div>
                            </label>

                            <div className="register-optional-block">
                                <p className="register-optional-title">{auth.optionalEngagement}</p>
                                <p className="register-optional-copy">{auth.optionalEngagementHint}</p>

                                <label className="login-label">
                                    <span>{auth.engagementAmount}</span>
                                    <input
                                        className="login-input"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={pledgeAmount}
                                        onChange={(event) => setPledgeAmount(event.target.value)}
                                        placeholder={auth.engagementAmountPlaceholder}
                                    />
                                </label>

                                <label className="login-label">
                                    <span>{auth.targetEndDate}</span>
                                    <input
                                        className="login-input"
                                        type="date"
                                        value={pledgeEndDate}
                                        onChange={(event) => setPledgeEndDate(event.target.value)}
                                    />
                                </label>
                            </div>

                            <div className="register-actions-row">
                                <button type="submit" className="login-primary-button" disabled={submitting || status.loading}>
                                    {submitting ? auth.creatingAccount : auth.createAccount}
                                </button>
                                <button
                                    type="button"
                                    className="login-primary-button login-primary-button--secondary"
                                    onClick={() => {
                                        setStep('otp');
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

            <style jsx>{`
                .register-steps {
                    margin-top: 12px;
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .register-step {
                    border: 1px solid var(--border);
                    background: var(--bg-card);
                    color: var(--text-primary);
                    border-radius: 999px;
                    padding: 4px 10px;
                    font-size: 12px;
                    font-weight: 600;
                    opacity: 0.75;
                }
                .register-step.active {
                    border-color: var(--accent-gold);
                    color: var(--accent-gold);
                    opacity: 1;
                }
                .register-actions-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                .register-optional-block {
                    border: 1px solid var(--border);
                    border-radius: 14px;
                    padding: 14px;
                    background: var(--bg-card);
                }
                .register-optional-title {
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 6px;
                }
                .register-optional-copy {
                    margin: 0 0 10px;
                    font-size: 12px;
                    opacity: 0.8;
                }
                [data-theme="light"] .login-alert--success {
                    background: rgba(42, 122, 70, 0.10);
                    border: 1px solid rgba(42, 122, 70, 0.36);
                    color: #1f6a3a;
                }
                [data-theme="light"] .login-alert--error {
                    background: rgba(176, 52, 52, 0.10);
                    border: 1px solid rgba(176, 52, 52, 0.32);
                    color: #8b2626;
                }
            `}</style>
        </div>
    );
}
