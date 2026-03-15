'use client';

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SitePreloader from '@/components/SitePreloader.jsx';
import { useTranslation, useThemeMode } from '@/hooks/index.js';
import { useFirstVisitPreloader } from '@/hooks/useFirstVisitPreloader.js';
import { THEMES, MOBILE_BREAKPOINT } from '@/constants/config.js';
import { setupSEOMetaTags } from '@/lib/seoUtils.js';
import { getAbsoluteUrl, getSiteUrl, truncateText } from '@/lib/translationUtils.js';
import { createEngagement, getMe, getMyPayments, getMyRequests, updateEngagement, updateMe, updateMyPassword } from '@/lib/donorApi.js';
import { createRequest } from '@/lib/requestsApi.js';
import { clearTokens, tryAutoLogin } from '@/lib/auth.js';
import { clearStoredSession, getStoredSession, setStoredSession } from '@/lib/session.js';
import OverviewTab from './OverviewTab.jsx';
import PaymentsTab from './PaymentsTab.jsx';
import ProfileTab from './ProfileTab.jsx';
import RequestsTab from './RequestsTab.jsx';
import TabLoadingFallback from './TabLoadingFallback.jsx';

const sectionCardStyle = {
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

export default function DonorDashboardPage() {
    const router = useRouter();
    const hydratedRef = useRef(false);
    const { language, setLanguage, t, isMounted: translationMounted } = useTranslation();
    const { themeMode, setThemeMode, isMounted: themeMounted } = useThemeMode();
    const theme = THEMES[themeMode] ?? THEMES.dark;
    const languageDropdownRef = useRef(null);
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const [profile, setProfile] = useState(null);
    const [payments, setPayments] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [profileForm, setProfileForm] = useState({ name: '', email: '' });
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [engagementForm, setEngagementForm] = useState({ totalPledge: '', endDate: '' });
    const [requestForm, setRequestForm] = useState({ type: 'other', message: '' });
    const appReady = translationMounted && themeMounted;
    const { shouldShowPreloader, isResolved: preloaderResolved } = useFirstVisitPreloader(appReady);
    const isRTL = ['ar', 'ur'].includes(language);

    const siteUrl = getSiteUrl();
    const pageUrl = getAbsoluteUrl(`/donor/dashboard?lang=${language}`, siteUrl);
    const socialImageUrl = getAbsoluteUrl('/logo-ccai.png', siteUrl);
    const pageTitle = `Donor Dashboard | ${t.centerName || 'Centre Zad Al-Imane'}`;
    const pageDescription = truncateText('Manage your donor profile, engagement, payments, and support requests.');

    useEffect(() => {
        if (!translationMounted) return;
        setupSEOMetaTags({
            language,
            isRTL,
            pageTitle,
            pageDescription,
            pageUrl,
            socialImageUrl,
            logoAlt: `${t.centerName || 'Centre Zad Al-Imane'} logo`,
            locale: t.locale ?? language,
            siteUrl,
            t,
            pagePath: '/donor/dashboard',
            pageType: 'profile',
        });
    }, [translationMounted, language, isRTL, pageTitle, pageDescription, pageUrl, socialImageUrl, siteUrl, t]);

    useEffect(() => {
        if (hydratedRef.current) return;
        hydratedRef.current = true;

        let active = true;

        async function loadDashboard() {
            const session = getStoredSession();
            if (!session || session.role !== 'donor') {
                if (active) {
                    setLoading(false);
                }
                router.replace('/login');
                return;
            }

            try {
                const refreshed = await tryAutoLogin();
                if (!refreshed) {
                    clearTokens();
                    clearStoredSession();
                    if (active) {
                        setError('Your session has expired. Please log in again.');
                    }
                    router.replace('/login');
                    return;
                }

                const [me, myPayments, myRequests] = await Promise.all([
                    getMe(),
                    getMyPayments(),
                    getMyRequests(),
                ]);
                if (!active) return;

                setProfile(me);
                setPayments(myPayments);
                setRequests(myRequests);
                setProfileForm({ name: me.name || '', email: me.email || '' });
                setEngagementForm({
                    totalPledge: me.engagement?.totalPledge ? String(me.engagement.totalPledge) : '',
                    endDate: me.engagement?.endDate ? String(me.engagement.endDate).slice(0, 10) : '',
                });
                setStoredSession({ ...session, ...me, role: 'donor' });
                setError('');
            } catch (err) {
                if (!active) return;
                clearTokens();
                clearStoredSession();
                setError(err?.message || 'Unable to load donor dashboard.');
                router.replace('/login');
                return;
            } finally {
                if (active) setLoading(false);
            }
        }

        loadDashboard();
        return () => {
            active = false;
        };
    }, [router]);

    const paymentTotal = useMemo(
        () => payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        [payments]
    );
    const engagementTarget = Number(profile?.engagement?.totalPledge || 0);
    const progressPct = engagementTarget > 0 ? Math.min(100, Math.round((paymentTotal / engagementTarget) * 100)) : 0;
    const remainingAmount = Math.max(0, engagementTarget - paymentTotal);
    const latestPayments = payments.slice(0, 5);
    const latestRequests = requests.slice(0, 4);

    async function refreshRequests() {
        const myRequests = await getMyRequests();
        setRequests(myRequests);
    }

    async function handleProfileUpdate(event) {
        event.preventDefault();
        setError('');
        setSuccess('');
        try {
            const updated = await updateMe({
                name: profileForm.name.trim(),
                email: profileForm.email.trim().toLowerCase(),
            });
            setProfile((prev) => ({ ...prev, ...updated }));
            setStoredSession({ ...(getStoredSession() || {}), ...updated, role: 'donor' });
            setSuccess('Profile updated.');
        } catch (err) {
            setError(err?.message || 'Unable to update profile.');
        }
    }

    async function handlePasswordUpdate(event) {
        event.preventDefault();
        setError('');
        setSuccess('');
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        try {
            await updateMyPassword({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setSuccess('Password updated.');
        } catch (err) {
            setError(err?.message || 'Unable to update password.');
        }
    }

    async function handleEngagementUpdate(event) {
        event.preventDefault();
        setError('');
        setSuccess('');

        const body = {
            totalPledge: Number(engagementForm.totalPledge),
            endDate: engagementForm.endDate ? new Date(engagementForm.endDate).toISOString() : null,
        };

        try {
            const updated = profile?.engagement
                ? await updateEngagement(body)
                : await createEngagement({
                    totalPledge: body.totalPledge,
                    ...(body.endDate ? { endDate: body.endDate } : {}),
                });

            setProfile((prev) => ({ ...prev, engagement: updated }));
            setSuccess('Engagement updated.');
        } catch (err) {
            setError(err?.message || 'Unable to update engagement.');
        }
    }

    async function handleRequestCreate(event) {
        event.preventDefault();
        setError('');
        setSuccess('');
        try {
            await createRequest({
                type: requestForm.type,
                name: profile?.name || '',
                email: profile?.email || '',
                message: requestForm.message.trim(),
            });
            setRequestForm({ type: 'other', message: '' });
            await refreshRequests();
            setSuccess('Support request submitted.');
        } catch (err) {
            setError(err?.message || 'Unable to submit request.');
        }
    }

    if (!appReady && shouldShowPreloader && preloaderResolved) {
        return (
            <div className="mosque-donation" data-theme="dark" style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
                <SitePreloader title="Centre Zad Al-Imane" subtitle="Loading dashboard" />
            </div>
        );
    }

    return (
        <div
            dir={isRTL ? 'rtl' : 'ltr'}
            className="mosque-donation"
            data-theme={themeMode}
            suppressHydrationWarning
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:wght@400;600&family=Amiri:wght@400;700&display=swap');
                *{box-sizing:border-box}
                .dashboard-shell{width:100%;max-width:var(--page-max-width);margin:0 auto;padding:24px 20px 64px;display:grid;gap:24px}
                .dashboard-grid{display:grid;grid-template-columns:320px 1fr;gap:24px;align-items:start}
                .dashboard-tabs{display:flex;gap:10px;flex-wrap:wrap}
                .dashboard-tab{padding:10px 14px;border-radius:999px;border:1px solid var(--border);background:transparent;color:var(--text-primary);cursor:pointer}
                .dashboard-tab.active{background:var(--accent-gold);color:#111}
                .dashboard-stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
                .dashboard-stat{padding:18px;border-radius:18px;border:1px solid var(--border);background:rgba(255,255,255,0.03)}
                .dashboard-section-title{font-family:'Cinzel',serif;font-size:20px;margin-bottom:16px}
                .dashboard-form{display:grid;gap:14px}
                .dashboard-button{padding:12px 16px;border-radius:12px;border:none;background:var(--accent-gold);color:#111;font-weight:700;cursor:pointer}
                .dashboard-alert{padding:14px 16px;border-radius:14px}
                .dashboard-alert.error{background:rgba(176,52,52,0.12);border:1px solid rgba(224,96,96,0.45);color:#ffb4b4}
                .dashboard-alert.success{background:rgba(82,154,106,0.12);border:1px solid rgba(126,184,160,0.45);color:#b5f0c4}
                .dashboard-list{display:grid;gap:14px}
                .dashboard-list-item{padding:16px;border-radius:16px;border:1px solid var(--border);background:rgba(255,255,255,0.03)}
                .dashboard-progress{height:14px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden}
                .dashboard-progress-bar{height:100%;background:linear-gradient(90deg,var(--accent-gold),#e6c86e)}
                .dashboard-action{padding:12px 14px;border-radius:14px;border:1px solid var(--border);background:rgba(255,255,255,0.03);color:var(--text-primary);cursor:pointer;text-align:left}
                @media (max-width:${MOBILE_BREAKPOINT}px){.dashboard-grid{grid-template-columns:1fr}.dashboard-stat-grid{grid-template-columns:1fr}}
            `}</style>
            <Header
                language={language}
                setLanguage={setLanguage}
                t={t}
                theme={theme}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                showLanguageMenu={showLanguageMenu}
                setShowLanguageMenu={setShowLanguageMenu}
                languageDropdownRef={languageDropdownRef}
                isLoginPage={false}
                showHeaderCenter={false}
            />
            <main className="dashboard-shell">
                {loading ? <div style={sectionCardStyle}>Loading dashboard…</div> : null}
                {!loading ? (
                    <>
                        {error ? <div className="dashboard-alert error">{error}</div> : null}
                        {success ? <div className="dashboard-alert success">{success}</div> : null}

                        <div className="dashboard-grid">
                            <aside style={sectionCardStyle}>
                                <div style={{ fontFamily: "'Cinzel', serif", color: 'var(--accent-gold)', fontSize: 24, marginBottom: 8 }}>
                                    {profile?.name || 'Donor'}
                                </div>
                                <div style={{ color: 'var(--text-muted)', marginBottom: 18 }}>{profile?.email}</div>
                                <div className="dashboard-tabs" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                                    {[
                                        ['overview', 'Overview'],
                                        ['payments', 'Payments'],
                                        ['profile', 'Profile'],
                                        ['requests', 'Requests'],
                                    ].map(([key, label]) => (
                                        <button key={key} type="button" className={`dashboard-tab ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </aside>

                            <section style={{ display: 'grid', gap: 24 }}>
                                <Suspense fallback={<TabLoadingFallback sectionCardStyle={sectionCardStyle} />}>
                                    {activeTab === 'overview' && (
                                        <OverviewTab
                                            profile={profile}
                                            paymentTotal={paymentTotal}
                                            engagementTarget={engagementTarget}
                                            progressPct={progressPct}
                                            remainingAmount={remainingAmount}
                                            requests={requests}
                                            latestPayments={latestPayments}
                                            latestRequests={latestRequests}
                                            sectionCardStyle={sectionCardStyle}
                                            setActiveTab={setActiveTab}
                                        />
                                    )}
                                    {activeTab === 'payments' && (
                                        <PaymentsTab
                                            payments={payments}
                                            sectionCardStyle={sectionCardStyle}
                                            setActiveTab={setActiveTab}
                                        />
                                    )}
                                    {activeTab === 'profile' && (
                                        <ProfileTab
                                            profileForm={profileForm}
                                            setProfileForm={setProfileForm}
                                            passwordForm={passwordForm}
                                            setPasswordForm={setPasswordForm}
                                            engagementForm={engagementForm}
                                            setEngagementForm={setEngagementForm}
                                            profile={profile}
                                            sectionCardStyle={sectionCardStyle}
                                            inputStyle={inputStyle}
                                            handleProfileUpdate={handleProfileUpdate}
                                            handlePasswordUpdate={handlePasswordUpdate}
                                            handleEngagementUpdate={handleEngagementUpdate}
                                        />
                                    )}
                                    {activeTab === 'requests' && (
                                        <RequestsTab
                                            requestForm={requestForm}
                                            setRequestForm={setRequestForm}
                                            requests={requests}
                                            sectionCardStyle={sectionCardStyle}
                                            inputStyle={inputStyle}
                                            handleRequestCreate={handleRequestCreate}
                                        />
                                    )}
                                </Suspense>
                            </section>
                        </div>
                    </>
                ) : null}
            </main>
            <Footer t={t} />
        </div>
    );
}
