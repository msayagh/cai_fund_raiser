import { useEffect, useRef, useState } from 'react';
import { LANGUAGE_OPTIONS, languageCurrency } from '@/lib/translationUtils.js';
import Link from 'next/link';
import AccessibilityWidget from '@/components/AccessibilityWidget.jsx';
import { getStoredSession, subscribeToSessionChange } from '@/lib/session.js';
import { logout } from '@/lib/auth.js';

export function Header({
    language,
    setLanguage,
    t,
    themeMode,
    setThemeMode,
    tierCollectedAmount = 0,
    tierEngagementPct = 0,
    tierEngagementTarget = 0,
    receivedAmount = 0,
    receivedTarget = 0,
    showLanguageMenu,
    setShowLanguageMenu,
    languageDropdownRef,
    currencyFirst = false,
    isLoginPage = false,
    onOpenStatistics,
    showHeaderCenter = !isLoginPage,
}) {
    const [showHeaderMenu, setShowHeaderMenu] = useState(false);
    const headerMenuRef = useRef(null);
    const [session, setSession] = useState(null);
    const isCurrencyFirst = currencyFirst || language === "en";
    const engagementPct = tierEngagementTarget > 0 ? Math.min(100, Math.round((tierCollectedAmount / tierEngagementTarget) * 100)) : tierEngagementPct;
    const receivedPct = receivedTarget > 0 ? Math.min(100, Math.round((receivedAmount / receivedTarget) * 100)) : 0;

    useEffect(() => {
        if (!showHeaderMenu) return;

        const handlePointerDown = (event) => {
            if (!headerMenuRef.current?.contains(event.target)) {
                setShowHeaderMenu(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [showHeaderMenu]);

    useEffect(() => {
        setSession(getStoredSession());
        return subscribeToSessionChange(setSession);
    }, []);

    const dashboardHref = session?.role === 'admin' ? '/admin/dashboard' : '/donor/dashboard';

    async function handleLogout() {
        await logout();
        setShowHeaderMenu(false);
        if (typeof window !== 'undefined') {
            window.location.assign('/login');
        }
    }

    return (
        <header className="mosque-donation-header">
            <div className="mosque-donation-header-inner">
                <div className="header-left">
                    <Link href="/" className="logo-link">
                        <img
                            src="/logo-ccai.png"
                            alt={t.centerName}
                            className="header-logo"
                        />
                    </Link>
                    <div className="header-title">
                        <div className="header-center-name">
                            {t.centerName}
                        </div>
                        <h1 className="header-title-text">
                            {t.title}
                        </h1>
                    </div>
                </div>

                {showHeaderCenter && (
                    <div className="header-center">
                        <div className="progress-bar-container">
                            <div className="progress-objective-title">
                                <span className="progress-objective-text">
                                    {t.campaignOverview || 'Campaign comparison'}
                                </span>
                            </div>

                            <div className="progress-raised-line">
                                {languageCurrency(tierCollectedAmount, isCurrencyFirst)}{" "}
                                <span className="progress-raised-of">
                                    {t.prepositionOf}
                                </span>{" "}
                                {languageCurrency(tierEngagementTarget, isCurrencyFirst)}
                            </div>

                            <div className="progress-bar-row">
                                <div className="progress-bar-track">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${engagementPct}%` }}
                                        aria-hidden="true"
                                    ></div>
                                </div>
                                <span className="progress-bar-value">
                                    {engagementPct}%
                                </span>
                            </div>

                            <div className="progress-objective-title" style={{ marginTop: '16px' }}>
                                <span className="progress-objective-text">
                                    {t.engagement}
                                </span>
                            </div>

                            <div className="progress-raised-line">
                                {languageCurrency(receivedAmount, isCurrencyFirst)}{" "}
                                <span className="progress-raised-of">
                                    {t.prepositionOf}
                                </span>{" "}
                                {languageCurrency(receivedTarget, isCurrencyFirst)}
                            </div>

                            <div className="progress-bar-row">
                                <div className="progress-bar-track">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${receivedPct}%` }}
                                        aria-hidden="true"
                                    ></div>
                                </div>
                                <span className="progress-bar-value">
                                    {receivedPct}%
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="header-right">
                    <div className="header-controls-desktop">
                        {!isLoginPage && onOpenStatistics && (
                            <button
                                type="button"
                                className="header-stats-button"
                                onClick={onOpenStatistics}
                                aria-label={t.campaignOverview || 'Campaign overview'}
                                title={t.campaignOverview || 'Campaign overview'}
                            >
                                <i className="fas fa-chart-column" aria-hidden="true"></i>
                            </button>
                        )}
                        {session ? (
                            <Link href={dashboardHref} className="login-button" title={session.email}>
                                <i className="fas fa-user-check" aria-hidden="true"></i>
                                <span className="login-button-text">{session.name || session.email}</span>
                            </Link>
                        ) : (
                            <Link href="/login" className="login-button" title="Login">
                                <i className="fas fa-user" aria-hidden="true"></i>
                                <span className="login-button-text">{t.loginTitle}</span>
                            </Link>
                        )}
                        <AccessibilityWidget compact />
                        <button
                            onClick={() => setThemeMode((m) => (m === "dark" ? "light" : "dark"))}
                            title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                            className="theme-toggle-button"
                            aria-label={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                        >
                            {themeMode === "dark" ? "☀" : "☾"}
                        </button>
                        <span className="language-label">
                            {t.language}
                        </span>
                        <div className="language-button-group">
                            {LANGUAGE_OPTIONS.map(({ code, label, flag }) => (
                                <button
                                    key={code}
                                    onClick={() => setLanguage(code)}
                                    className={`language-button ${language === code ? 'active' : ''}`}
                                    title={label}
                                >
                                    <span className="language-flag">{flag}</span>
                                    <span className="language-button-text">{label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="language-dropdown" ref={languageDropdownRef}>
                            <button
                                type="button"
                                className={`language-dropdown-trigger ${showLanguageMenu ? 'open' : ''}`}
                                onClick={() => setShowLanguageMenu((open) => !open)}
                                aria-haspopup="menu"
                                aria-expanded={showLanguageMenu}
                            >
                                <span className="language-flag">{LANGUAGE_OPTIONS.find((option) => option.code === language)?.flag ?? '🌐'}</span>
                                <span className="language-dropdown-text">{LANGUAGE_OPTIONS.find((option) => option.code === language)?.label ?? language.toUpperCase()}</span>
                            </button>
                            {showLanguageMenu && (
                                <div className="language-dropdown-menu" role="menu">
                                    {LANGUAGE_OPTIONS.map(({ code, label, flag }) => (
                                        <button
                                            key={code}
                                            type="button"
                                            role="menuitem"
                                            onClick={() => {
                                                setLanguage(code);
                                                setShowLanguageMenu(false);
                                            }}
                                            className={`language-dropdown-item ${language === code ? 'active' : ''}`}
                                        >
                                            <span className="language-flag">{flag}</span>
                                            <span>{label}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="header-menu" ref={headerMenuRef}>
                        <button
                            type="button"
                            className={`header-menu-trigger ${showHeaderMenu ? 'open' : ''}`}
                            onClick={() => setShowHeaderMenu((open) => !open)}
                            aria-haspopup="menu"
                            aria-expanded={showHeaderMenu}
                            aria-label={showHeaderMenu ? 'Close menu' : 'Open menu'}
                            title={showHeaderMenu ? 'Close menu' : 'Open menu'}
                        >
                            <i className="fas fa-bars" aria-hidden="true"></i>
                        </button>

                        {showHeaderMenu && (
                            <div className="header-menu-panel" role="menu">
                                <div className="header-menu-section">
                                    {!isLoginPage && onOpenStatistics && (
                                        <button
                                            type="button"
                                            className="header-menu-item"
                                            onClick={() => {
                                                onOpenStatistics?.();
                                                setShowHeaderMenu(false);
                                            }}
                                        >
                                            <i className="fas fa-chart-column" aria-hidden="true"></i>
                                            <span>{t.campaignOverview || 'Campaign overview'}</span>
                                        </button>
                                    )}
                                    {session ? (
                                        <>
                                            <Link
                                                href={dashboardHref}
                                                className="header-menu-item"
                                                onClick={() => setShowHeaderMenu(false)}
                                            >
                                                <i className="fas fa-gauge" aria-hidden="true"></i>
                                                <span>{session.name || session.email}</span>
                                            </Link>
                                            <button
                                                type="button"
                                                className="header-menu-item"
                                                onClick={handleLogout}
                                            >
                                                <i className="fas fa-right-from-bracket" aria-hidden="true"></i>
                                                <span>Sign out</span>
                                            </button>
                                        </>
                                    ) : (
                                        <Link
                                            href="/login"
                                            className="header-menu-item"
                                            onClick={() => setShowHeaderMenu(false)}
                                        >
                                            <i className="fas fa-user" aria-hidden="true"></i>
                                            <span>{t.loginTitle}</span>
                                        </Link>
                                    )}
                                    <div className="header-menu-item header-menu-item--inline">
                                        <span className="header-menu-item-label">{themeMode === "dark" ? "Light mode" : "Dark mode"}</span>
                                        <button
                                            type="button"
                                            onClick={() => setThemeMode((m) => (m === "dark" ? "light" : "dark"))}
                                            title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                                            className="theme-toggle-button"
                                            aria-label={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                                        >
                                            {themeMode === "dark" ? "☀" : "☾"}
                                        </button>
                                    </div>
                                    <div className="header-menu-item header-menu-item--inline">
                                        <span className="header-menu-item-label">{t.accessibilityShortLabel || 'A11y'}</span>
                                        <AccessibilityWidget compact />
                                    </div>
                                </div>

                                <div className="header-menu-section">
                                    <div className="header-menu-section-title">{t.language}</div>
                                    <div className="header-menu-languages">
                                        {LANGUAGE_OPTIONS.map(({ code, label, flag }) => (
                                            <button
                                                key={code}
                                                type="button"
                                                onClick={() => {
                                                    setLanguage(code);
                                                    setShowHeaderMenu(false);
                                                }}
                                                className={`language-button ${language === code ? 'active' : ''}`}
                                                title={label}
                                            >
                                                <span className="language-flag">{flag}</span>
                                                <span className="language-button-text">{label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
