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
import { donorLogin } from '@/lib/auth.js';
import { apiFetch } from '@/lib/apiClient.js';
import '../login/page.scss';

export default function RegisterPage() {
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
    const pageUrl = getAbsoluteUrl(`/register?lang=${language}`, siteUrl);
    const socialImageUrl = getAbsoluteUrl('/logo-ccai.png', siteUrl);
    const pageTitle = `Register | ${t.centerName || 'Centre Zad Al-Imane'}`;
    const pageDescription = truncateText(
        'Create a new donor account to support the Centre Zad Al-Imane'
    );
    const locale = t.locale ?? language;
    const logoAlt = `${t.centerName || 'Centre Zad Al-Imane'} logo`;

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState({ loading: false, error: '', success: '' });
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

        // Validate passwords match
        if (password !== confirmPassword) {
            setStatus((prev) => ({
                ...prev,
                error: 'Passwords do not match',
            }));
            setSubmitting(false);
            return;
        }

        try {
            await apiFetch('/api/auth/donor/register/complete', {
                method: 'POST',
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    name: name.trim(),
                    password
                }),
            });

            // After registration, attempt login
            const user = await donorLogin(email.trim().toLowerCase(), password);

            setStatus({
                loading: false,
                error: '',
                success: 'Account created successfully! Redirecting to dashboard...',
            });

            // Save email for "Remember me"
            localStorage.setItem('rememberedEmail', email.trim().toLowerCase());

            // Redirect to dashboard
            setTimeout(() => router.replace('/donor/dashboard'), 1500);
        } catch (error) {
            setStatus((prev) => ({
                ...prev,
                loading: false,
                error: error?.message || 'Unable to register right now.',
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
                        <div className="login-eyebrow">Create Account</div>
                        <h1 className="login-title">Register as a Donor</h1>
                        <p className="login-description">Join us and support the Centre Zad Al-Imane campaign</p>
                    </div>

                    {status.error ? <div className="login-alert login-alert--error">{status.error}</div> : null}
                    {status.success ? <div className="login-alert login-alert--success">{status.success}</div> : null}

                    <form className="login-form" onSubmit={handleSubmit}>
                        <label className="login-label">
                            <span>Full Name</span>
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
                                autoComplete="new-password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                required
                            />
                        </label>

                        <label className="login-label">
                            <span>Confirm Password</span>
                            <input
                                className="login-input"
                                type="password"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                required
                            />
                        </label>

                        <button type="submit" className="login-primary-button" disabled={submitting || status.loading}>
                            {submitting ? 'Creating account...' : 'Create Account'}
                        </button>
                    </form>

                    <div className="login-links">
                    </div>
                </div>
            </div>
            <Footer t={isMounted ? t : {}} />
        </div>
    );
}
