'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import '../page.scss';
import { Header } from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SitePreloader from '@/components/SitePreloader.jsx';
import { useTranslation, useThemeMode } from '@/hooks/index.js';
import { useFirstVisitPreloader } from '@/hooks/useFirstVisitPreloader.js';
import { THEMES } from '@/constants/config.js';
import { setupSEOMetaTags } from '@/lib/seoUtils.js';
import { DEFAULT_TRANSLATION, getAbsoluteUrl, getSiteUrl, truncateText } from '@/lib/translationUtils.js';
import { apiFetch } from '@/lib/apiClient.js';
import '../login/page.scss';

function ForgotPasswordPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { language, setLanguage, t, isMounted } = useTranslation();
    const { themeMode, setThemeMode, isMounted: themeMounted } = useThemeMode();
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const languageDropdownRef = useRef(null);
    const theme = THEMES[themeMode] ?? THEMES.dark;
    const appReady = isMounted && themeMounted;
    const { shouldShowPreloader, isResolved: preloaderResolved } = useFirstVisitPreloader(appReady);
    const isRTL = language === 'ar' || language === 'ur';
    const siteUrl = getSiteUrl();
    const pageUrl = getAbsoluteUrl(`/forgot-password?lang=${language}`, siteUrl);
    const socialImageUrl = getAbsoluteUrl('/logo-ccai.png', siteUrl);
    const auth = { ...(DEFAULT_TRANSLATION.auth ?? {}), ...(t.auth ?? {}) };
    const pageTitle = `${auth.resetPassword} | ${t.centerName || DEFAULT_TRANSLATION.centerName || 'Centre Zad Al-Imane'}`;
    const pageDescription = truncateText(auth.resetSeoDescription || DEFAULT_TRANSLATION.auth?.resetSeoDescription);
    const locale = t.locale ?? language;
    const logoAlt = `${t.centerName || DEFAULT_TRANSLATION.centerName || 'Centre Zad Al-Imane'} logo`;

    const initialRole = searchParams.get('role') === 'admin' ? 'admin' : 'donor';
    const [activeRole, setActiveRole] = useState(initialRole);
    const [step, setStep] = useState('request');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState({ error: '', success: '' });
    const [loading, setLoading] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        setActiveRole(initialRole);
    }, [initialRole]);

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
            pagePath: '/forgot-password',
            pageType: 'forgot-password',
        });
    }, [isMounted, isRTL, language, locale, logoAlt, pageDescription, pageTitle, pageUrl, siteUrl, socialImageUrl, t]);

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
        setLoading(true);
        setStatus({ error: '', success: '' });

        try {
            await apiFetch(`/api/auth/${activeRole}/forgot/send-otp`, {
                method: 'POST',
                body: JSON.stringify({ email: email.trim().toLowerCase() }),
            });
            setStep('verify');
            setStatus({ error: '', success: auth.resetCodeSent });
        } catch (error) {
            setStatus({ error: error?.message || auth.unableToSendResetCode, success: '' });
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyCode(event) {
        event.preventDefault();
        setLoading(true);
        setStatus({ error: '', success: '' });

        try {
            await apiFetch(`/api/auth/${activeRole}/forgot/verify-otp`, {
                method: 'POST',
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    code: code.trim(),
                }),
            });
            setStep('reset');
            setStatus({ error: '', success: auth.codeVerified });
        } catch (error) {
            setStatus({ error: error?.message || auth.invalidOrExpiredResetCode, success: '' });
        } finally {
            setLoading(false);
        }
    }

    async function handleResetPassword(event) {
        event.preventDefault();
        setLoading(true);
        setStatus({ error: '', success: '' });

        if (newPassword.length < 8) {
            setStatus({ error: auth.passwordMinLength, success: '' });
            setLoading(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setStatus({ error: auth.passwordsDoNotMatch, success: '' });
            setLoading(false);
            return;
        }

        try {
            await apiFetch(`/api/auth/${activeRole}/forgot/reset`, {
                method: 'POST',
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    code: code.trim(),
                    newPassword,
                }),
            });
            setStatus({ error: '', success: auth.passwordResetSuccess });
            setTimeout(() => router.push(`/login?role=${activeRole}`), 1200);
        } catch (error) {
            setStatus({ error: error?.message || auth.unableToResetPassword, success: '' });
        } finally {
            setLoading(false);
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
                <div className="login-shell">
                    <section className="login-showcase">
                        <div className="login-showcase-card">
                            <div className="login-showcase-kicker">{auth.resetKicker}</div>
                            <h1 className="login-showcase-title">{auth.resetShowcaseTitle}</h1>
                            <p className="login-showcase-copy">{auth.resetShowcaseCopy}</p>
                            <div className="login-showcase-list">
                                <div className="login-showcase-item">{auth.resetStep1}</div>
                                <div className="login-showcase-item">{auth.resetStep2}</div>
                                <div className="login-showcase-item">{auth.resetStep3}</div>
                            </div>
                        </div>
                    </section>

                    <div className="login-card login-card--wide">
                        <div className="login-content">
                            <div className="login-eyebrow">{auth.resetKicker}</div>
                            <h1 className="login-title">{auth.recoverAccessTitle}</h1>
                            <p className="login-description">{auth.recoverAccessDescription}</p>
                        </div>

                        <div className="login-role-switcher" role="tablist" aria-label={auth.roleSwitcherLabel}>
                            <button type="button" className={`login-role-button ${activeRole === 'donor' ? 'active' : ''}`} onClick={() => setActiveRole('donor')}>
                                {auth.donorTab}
                            </button>
                            <button type="button" className={`login-role-button ${activeRole === 'admin' ? 'active' : ''}`} onClick={() => setActiveRole('admin')}>
                                {auth.adminTab}
                            </button>
                        </div>

                        {status.error ? <div className="login-alert login-alert--error">{status.error}</div> : null}
                        {status.success ? <div className="login-alert login-alert--success">{status.success}</div> : null}

                        {step === 'request' && (
                            <form className="login-form" onSubmit={handleSendOtp}>
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

                                <button type="submit" className="login-primary-button" disabled={loading}>
                                    {loading ? auth.sendingResetCode : auth.sendResetCode}
                                </button>
                            </form>
                        )}

                        {step === 'verify' && (
                            <form className="login-form" onSubmit={handleVerifyCode}>
                                <label className="login-label">
                                    <span>{auth.verificationCode}</span>
                                    <input
                                        className="login-input"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={code}
                                        onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder={auth.otpPlaceholder}
                                        required
                                    />
                                </label>

                                <div className="login-form-row">
                                    <button type="submit" className="login-primary-button" disabled={loading}>
                                        {loading ? auth.verifying : auth.verifyCode}
                                    </button>
                                    <button type="button" className="login-primary-button login-primary-button--secondary" onClick={() => setStep('request')}>
                                        {auth.back}
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === 'reset' && (
                            <form className="login-form" onSubmit={handleResetPassword}>
                                <label className="login-label">
                                    <span>{auth.newPassword}</span>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className="login-input"
                                            type={showNewPassword ? 'text' : 'password'}
                                            autoComplete="new-password"
                                            value={newPassword}
                                            onChange={(event) => setNewPassword(event.target.value)}
                                            required
                                            style={{ paddingRight: '42px' }}
                                        />
                                        <button type="button" onClick={() => setShowNewPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label={showNewPassword ? 'Hide password' : 'Show password'}>
                                            {showNewPassword ? (
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

                                <div className="login-form-row">
                                    <button type="submit" className="login-primary-button" disabled={loading}>
                                        {loading ? auth.resettingPassword : auth.resetPassword}
                                    </button>
                                    <button type="button" className="login-primary-button login-primary-button--secondary" onClick={() => setStep('verify')}>
                                        {auth.back}
                                    </button>
                                </div>
                            </form>
                        )}

                        <div className="login-links login-links--footer">
                            <Link href={`/login?role=${activeRole}`} className="login-inline-link">{auth.returnToLogin}</Link>
                        </div>
                    </div>
                </div>
            </div>

            <Footer t={isMounted ? t : {}} />
        </div>
    );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ForgotPasswordPageContent />
        </Suspense>
    );
}
