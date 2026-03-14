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
import { getAbsoluteUrl, getSiteUrl, truncateText } from '@/lib/translationUtils.js';
import { adminLogin, clearTokens, donorLogin, logout, tryAutoLogin } from '@/lib/auth.js';
import { hasRefreshToken } from '@/lib/apiClient.js';
import { getStoredSession } from '@/lib/session.js';
import './page.scss';

export default function LoginPage() {
    const router = useRouter();
    const hydratedRef = useRef(false);
    const { language, setLanguage, t, isMounted } = useTranslation();
    const { themeMode, setThemeMode, isMounted: themeMounted } = useThemeMode();
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const languageDropdownRef = useRef(null);
    const theme = THEMES[themeMode] ?? THEMES.dark;
    const appReady = isMounted && themeMounted;
    const { shouldShowPreloader, isResolved: preloaderResolved } = useFirstVisitPreloader(appReady);
    const isRTL = language === 'ar' || language === 'ur';
    const siteUrl = getSiteUrl();
    const pageUrl = getAbsoluteUrl(`/login?lang=${language}`, siteUrl);
    const socialImageUrl = getAbsoluteUrl('/logo-ccai.png', siteUrl);
    const pageTitle = `${t.loginTitle || 'Login'} | ${t.centerName || 'Centre Zad Al-Imane'}`;
    const pageDescription = truncateText(
        t.loginDescription || 'Secure donor and admin login for the Centre Zad Al-Imane platform.'
    );
    const locale = t.locale ?? language;
    const logoAlt = `${t.centerName || 'Centre Zad Al-Imane'} logo`;

    const [activeRole, setActiveRole] = useState('donor');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [status, setStatus] = useState({ loading: true, error: '', success: '', user: null, role: null });
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
            pagePath: '/login',
            pageType: 'login',
        });
    }, [isMounted, isRTL, language, locale, logoAlt, pageDescription, pageTitle, pageUrl, siteUrl, socialImageUrl, t]);

    useEffect(() => {
        if (hydratedRef.current) return;
        hydratedRef.current = true;

        let active = true;

        async function hydrateSession() {
            try {
                const saved = getStoredSession();
                const canRestoreSession = Boolean(saved) && hasRefreshToken();

                if (!canRestoreSession) {
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
                    success: parsed ? `${parsed.role === 'admin' ? 'Admin' : 'Donor'} session restored.` : 'Session restored.',
                    user: parsed,
                    role: parsed?.role ?? null,
                });
            } catch {
                if (!active) return;
                clearTokens();
                setStatus({ loading: false, error: '', success: '', user: null, role: null });
            }
        }

        hydrateSession();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!status.user || status.loading) return;
        router.replace(status.role === 'admin' ? '/admin/dashboard' : '/donor/dashboard');
    }, [router, status.loading, status.role, status.user]);

    if (!appReady && shouldShowPreloader && preloaderResolved) {
        return (
            <div
                className="login-page-wrapper"
                data-theme="dark"
                suppressHydrationWarning
                style={{ minHeight: '100vh', background: 'var(--bg-page)' }}
            >
                <SitePreloader title="Centre Zad Al-Imane" subtitle="Loading site" />
            </div>
        );
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitting(true);
        setStatus((prev) => ({ ...prev, error: '', success: '' }));

        try {
            const user = activeRole === 'admin'
                ? await adminLogin(email.trim().toLowerCase(), password)
                : await donorLogin(email.trim().toLowerCase(), password);

            const nextSession = { ...user, role: activeRole };
            setStatus({
                loading: false,
                error: '',
                success: `${activeRole === 'admin' ? 'Admin' : 'Donor'} login successful.`,
                user: nextSession,
                role: activeRole,
            });
            setPassword('');
        } catch (error) {
            setStatus((prev) => ({
                ...prev,
                loading: false,
                error: error?.message || 'Unable to sign in right now.',
                success: '',
            }));
        } finally {
            setSubmitting(false);
        }
    }

    async function handleLogout() {
        await logout();
        setStatus({ loading: false, error: '', success: 'You have been signed out.', user: null, role: null });
    }

    const authTitle = activeRole === 'admin' ? 'Admin access' : 'Donor access';
    const authDescription = activeRole === 'admin'
        ? 'Use your administrator credentials to manage donors, requests, and campaign activity.'
        : 'Use your donor credentials to access your engagement and account records.';

    return (
        <div
            className="login-page-wrapper"
            data-theme={themeMode}
            dir={isRTL ? 'rtl' : 'ltr'}
            suppressHydrationWarning
            style={{
                '--bg-primary': theme['bg-primary'],
                '--bg-page': theme['bg-page'],
                '--text-primary': theme['text-primary'],
                '--border': theme['border'],
                '--bg-card': theme['bg-card'],
                '--accent-gold': theme['accent-gold'],
            }}
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
                        <div className="login-eyebrow">{authTitle}</div>
                        <h1 className="login-title">{isMounted ? t.loginTitle : 'Login'}</h1>
                        <p className="login-description">{authDescription}</p>
                    </div>

                    <div className="login-role-switcher" role="tablist" aria-label="Account type">
                        <button type="button" className={`login-role-button ${activeRole === 'donor' ? 'active' : ''}`} onClick={() => setActiveRole('donor')}>
                            Donor
                        </button>
                        <button type="button" className={`login-role-button ${activeRole === 'admin' ? 'active' : ''}`} onClick={() => setActiveRole('admin')}>
                            Admin
                        </button>
                    </div>

                    {status.error ? <div className="login-alert login-alert--error">{status.error}</div> : null}
                    {status.success ? <div className="login-alert login-alert--success">{status.success}</div> : null}

                    {status.user ? (
                        <div className="login-session-card">
                            <div className="login-session-copy">
                                <div className="login-session-label">Signed in as</div>
                                <div className="login-session-name">{status.user.name || status.user.email}</div>
                                <div className="login-session-meta">{status.user.email} · {status.role}</div>
                            </div>
                            <button type="button" className="login-primary-button login-primary-button--secondary" onClick={handleLogout}>
                                Sign out
                            </button>
                        </div>
                    ) : (
                        <form className="login-form" onSubmit={handleSubmit}>
                            <label className="login-label">
                                <span>Email</span>
                                <input
                                    className="login-input"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    required
                                />
                            </label>

                            <label className="login-label">
                                <span>Password</span>
                                <input
                                    className="login-input"
                                    type="password"
                                    autoComplete={activeRole === 'admin' ? 'current-password' : 'current-password'}
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    required
                                />
                            </label>

                            <button type="submit" className="login-primary-button" disabled={submitting || status.loading}>
                                {submitting ? 'Signing in...' : `Sign in as ${activeRole}`}
                            </button>
                        </form>
                    )}

                    <div className="login-links">
                        <Link href="/" className="login-back-button">
                            {isMounted ? t.backToHome : 'Back to Home'}
                        </Link>
                        <Link href="/admin/setup" className="login-inline-link">
                            Initial admin setup
                        </Link>
                    </div>
                </div>
            </div>
            <Footer t={isMounted ? t : {}} />
        </div>
    );
}
