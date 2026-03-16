'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import '../page.scss';
import './page.scss';
import { Header } from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SitePreloader from '@/components/SitePreloader.jsx';
import { useTranslation, useThemeMode } from '@/hooks/index.js';
import { useFirstVisitPreloader } from '@/hooks/useFirstVisitPreloader.js';
import { THEMES } from '@/constants/config.js';
import { setupSEOMetaTags } from '@/lib/seoUtils.js';
import { getAbsoluteUrl, getSiteUrl, truncateText } from '@/lib/translationUtils.js';

export default function SitemapPage() {
    const { language, setLanguage, t, isMounted } = useTranslation();
    const { themeMode, setThemeMode, isMounted: themeMounted } = useThemeMode();
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const languageDropdownRef = useRef(null);
    const theme = THEMES[themeMode] ?? THEMES.dark;
    const appReady = isMounted && themeMounted;
    const { shouldShowPreloader, isResolved: preloaderResolved } = useFirstVisitPreloader(appReady);
    const isRTL = language === 'ar' || language === 'ur';
    const siteUrl = getSiteUrl();
    const pageUrl = getAbsoluteUrl(`/sitemap?lang=${language}`, siteUrl);
    const socialImageUrl = getAbsoluteUrl('/logo-ccai.png', siteUrl);
    const pageTitle = `${t.sitemap || 'Sitemap'} | ${t.centerName || 'Centre Zad Al-Imane'}`;
    const pageDescription = truncateText(
        t.sitemapDescription || 'Browse the main internal pages available on this site.'
    );
    const locale = t.locale ?? language;
    const logoAlt = `${t.centerName || 'Centre Zad Al-Imane'} logo`;
    const sitemapLinks = [
        {
            href: '/',
            label: t.sitemapHomeLabel || 'Home',
            description: t.sitemapHomeDescription || 'Main fundraising page and campaign overview.',
        },
        {
            href: '/login',
            label: t.loginTitle || 'Login',
            description: t.sitemapLoginDescription || 'Upcoming secure login entry point.',
        },
    ];

    useEffect(() => {
        if (languageDropdownRef.current && showLanguageMenu) {
            const closeMenu = (e) => {
                if (!languageDropdownRef.current?.contains(e.target)) {
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
            pagePath: '/sitemap',
            pageType: 'sitemap',
        });
    }, [isMounted, isRTL, language, locale, logoAlt, pageDescription, pageTitle, pageUrl, siteUrl, socialImageUrl, t]);

    if (!appReady && shouldShowPreloader && preloaderResolved) {
        return (
            <div
                className="sitemap-page-wrapper"
                data-theme="dark"
                suppressHydrationWarning
            >
                <SitePreloader title="Centre Zad Al-Imane" subtitle="Loading sitemap" />
            </div>
        );
    }

    return (
        <div
            className="sitemap-page-wrapper"
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

            <main className="sitemap-container">
                <section className="sitemap-card">
                    <div className="sitemap-content">
                        <p className="sitemap-eyebrow">{t.sitemap || 'Sitemap'}</p>
                        <h1 className="sitemap-title">{t.sitemap || 'Sitemap'}</h1>
                        <p className="sitemap-description">
                            {t.sitemapDescription || 'Browse the main internal pages available on this site.'}
                        </p>
                    </div>

                    <div className="sitemap-links">
                        {sitemapLinks.map((item) => (
                            <Link key={item.href} href={item.href} className="sitemap-link-card">
                                <span className="sitemap-link-label">{item.label}</span>
                                <span className="sitemap-link-description">{item.description}</span>
                            </Link>
                        ))}
                    </div>

                    <Link href="/" className="sitemap-back-button">
                        {t.backToHome || 'Back to Home'}
                    </Link>
                </section>
            </main>

            <Footer t={t} />
        </div>
    );
}
