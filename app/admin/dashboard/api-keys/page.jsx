'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SitePreloader from '@/components/SitePreloader.jsx';
import AdminSidebar from '@/components/AdminSidebar.jsx';
import { useTranslation, useThemeMode } from '@/hooks/index.js';
import { useFirstVisitPreloader } from '@/hooks/useFirstVisitPreloader.js';
import { THEMES } from '@/constants/config.js';
import { setupSEOMetaTags } from '@/lib/seoUtils.js';
import { getAbsoluteUrl, getSiteUrl, truncateText } from '@/lib/translationUtils.js';
import { clearTokens, logout, tryAutoLogin } from '@/lib/auth.js';
import { clearStoredSession, getStoredSession } from '@/lib/session.js';
import { startTokenRefreshManager, stopTokenRefreshManager } from '@/lib/tokenRefreshManager.js';
import ApiKeysSection from '../ApiKeysSection.jsx';

const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '24px',
    padding: '24px',
};

const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-primary)',
};

export default function AdminApiKeysPage() {
    const router = useRouter();
    const { language, setLanguage, t, isMounted: translationMounted } = useTranslation();
    const { themeMode, setThemeMode, isMounted: themeMounted } = useThemeMode();
    const theme = THEMES[themeMode] ?? THEMES.dark;
    const languageDropdownRef = useRef(null);
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const appReady = translationMounted && themeMounted;
    const { shouldShowPreloader, isResolved: preloaderResolved } = useFirstVisitPreloader(appReady);
    const isRTL = ['ar', 'ur'].includes(language);

    const siteUrl = getSiteUrl();
    const pageUrl = getAbsoluteUrl(`/admin/dashboard/api-keys?lang=${language}`, siteUrl);
    const pageTitle = `API Keys | ${t.centerName || 'Centre Zad Al-Imane'}`;
    const pageDescription = truncateText('Generate and manage admin API keys for integrations.');

    useEffect(() => {
        if (!translationMounted) return;
        setupSEOMetaTags({
            language,
            isRTL,
            pageTitle,
            pageDescription,
            pageUrl,
            socialImageUrl: getAbsoluteUrl('/logo-ccai.png', siteUrl),
            logoAlt: `${t.centerName || 'Centre Zad Al-Imane'} logo`,
            locale: t.locale ?? language,
            siteUrl,
            t,
            pagePath: '/admin/dashboard/api-keys',
            pageType: 'profile',
        });
    }, [translationMounted, language, isRTL, pageTitle, pageDescription, pageUrl, siteUrl, t]);

    useEffect(() => {
        let active = true;

        async function guardPage() {
            const session = getStoredSession();
            if (!session || session.role !== 'admin') {
                if (active) setLoading(false);
                stopTokenRefreshManager();
                router.replace('/login');
                return;
            }

            try {
                const refreshed = await tryAutoLogin();
                if (!refreshed) {
                    clearTokens();
                    clearStoredSession();
                    stopTokenRefreshManager();
                    if (active) setError('Your session has expired. Please log in again.');
                    router.replace('/login');
                    return;
                }

                startTokenRefreshManager();
                if (active) setError('');
            } catch (err) {
                if (!active) return;
                clearTokens();
                clearStoredSession();
                stopTokenRefreshManager();
                setError(err?.message || 'Unable to load API key tools.');
                router.replace('/login');
                return;
            } finally {
                if (active) setLoading(false);
            }
        }

        guardPage();
        return () => {
            active = false;
            stopTokenRefreshManager();
        };
    }, [router]);

    async function handleLogout() {
        stopTokenRefreshManager();
        await logout();
        router.replace('/login');
    }

    function handleSidebarTabSelect(tab) {
        if (typeof window !== 'undefined') {
            if (tab === 'apiKeys') {
                window.localStorage.setItem('adminActiveTab', 'apiKeys');
                return;
            }

            window.localStorage.setItem('adminActiveTab', tab);
        }

        router.push('/admin/dashboard');
    }

    if (!appReady || !preloaderResolved || shouldShowPreloader) {
        return <SitePreloader title="Centre Zad Al-Imane" subtitle="Loading admin tools" />;
    }

    return (
        <div className="page-shell admin-dashboard-page" style={theme}>
            <Header
                language={language}
                setLanguage={setLanguage}
                t={t}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                showLanguageMenu={showLanguageMenu}
                setShowLanguageMenu={setShowLanguageMenu}
                languageDropdownRef={languageDropdownRef}
                isLoginPage={false}
                showHeaderCenter={false}
            />
            <main className="admin-shell">
                {loading ? (
                    <div className="admin-loading-overlay">
                        <div style={{ textAlign: 'center', display: 'grid', gap: 16, alignItems: 'center' }}>
                            <div className="admin-spinner"></div>
                            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: 'var(--text-primary)' }}>
                                Loading API key tools...
                            </div>
                        </div>
                    </div>
                ) : null}

                {error ? <div className="admin-alert error">{error}</div> : null}

                <div className="admin-layout">
                    <AdminSidebar
                        activeTab="apiKeys"
                        setActiveTab={() => {}}
                        isRTL={isRTL}
                        onLogout={handleLogout}
                        onTabSelect={handleSidebarTabSelect}
                    />

                    <section style={{ display: 'grid', gap: 24 }}>
                        <div style={cardStyle}>
                            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 24, marginBottom: 10 }}>API Key Manager</div>
                            <div style={{ color: 'var(--text-muted)' }}>
                                Create and manage integration keys from a dedicated admin page.
                            </div>
                        </div>

                        <ApiKeysSection
                            cardStyle={cardStyle}
                            inputStyle={inputStyle}
                            isActive={true}
                        />
                    </section>
                </div>
            </main>

            <Footer t={t} />
        </div>
    );
}
