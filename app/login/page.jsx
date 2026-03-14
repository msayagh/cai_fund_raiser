'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import '../page.scss';
import { Header } from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { useTranslation, useThemeMode } from '@/hooks/index.js';
import { THEMES } from '@/constants/config.js';
import './page.scss';

export default function LoginPage() {
    const { language, setLanguage, t, isMounted } = useTranslation();
    const { themeMode, setThemeMode, isMounted: themeMounted } = useThemeMode();
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const languageDropdownRef = useRef(null);
    const theme = THEMES[themeMode] ?? THEMES.dark;

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

    // Don't render until theme and language are loaded
    if (!isMounted || !themeMounted) {
        return (
            <div
                className="login-page-wrapper"
                data-theme="dark"
                suppressHydrationWarning
                style={{ minHeight: '100vh', background: 'var(--bg-page)' }}
            >
                <div style={{ minHeight: '100vh', width: '100%' }} />
            </div>
        );
    }

    return (
        <div
            className="login-page-wrapper"
            data-theme={themeMode}
            dir={language === 'ar' || language === 'ur' ? 'rtl' : 'ltr'}
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
                <div className="login-card">
                    <div className="login-content">
                        <h1 className="login-title">{isMounted ? t.loginTitle : ''}</h1>
                        <p className="login-message">{isMounted ? t.loginMessage : ''}</p>
                        <p className="login-description">
                            {isMounted ? t.loginDescription : ''}
                        </p>
                    </div>
                    <Link href="/" className="login-back-button">
                        {isMounted ? t.backToHome : ''}
                    </Link>
                </div>
            </div>
            <Footer t={isMounted ? t : {}} />
        </div>
    );
}
