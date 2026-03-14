import { LANGUAGE_OPTIONS, languageCurrency } from '@/lib/translationUtils.js';
import Link from 'next/link';
import { useEffect } from 'react';

export function Header({
    language,
    setLanguage,
    t,
    themeMode,
    setThemeMode,
    ramadanRaised,
    headerRamadanPct,
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
}) {
    const isCurrencyFirst = currencyFirst || language === "en";
    const engagementPct = tierEngagementTarget > 0 ? Math.min(100, Math.round((tierCollectedAmount / tierEngagementTarget) * 100)) : tierEngagementPct;
    const receivedPct = receivedTarget > 0 ? Math.min(100, Math.round((receivedAmount / receivedTarget) * 100)) : 0;

    useEffect(() => {
        console.log('[Header] Global campaign metrics:', {
            ramadanRaised,
            headerRamadanPct,
            engagementAmount: tierCollectedAmount,
            engagementTarget: tierEngagementTarget,
            engagementPct,
            receivedAmount,
            receivedTarget,
            receivedPct,
        });
    }, [ramadanRaised, headerRamadanPct, tierCollectedAmount, tierEngagementTarget, engagementPct, receivedAmount, receivedTarget, receivedPct]);

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

                {!isLoginPage && (
                    <div className="header-center">
                        <div className="progress-bar-container">
                            <div className="progress-objective-title">
                                <span className="progress-objective-text">
                                    {t.ramadanObjective}
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

                            {receivedAmount !== undefined && receivedAmount >= 0 && (
                                <>
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
                                </>
                            )}
                        </div>
                    </div>
                )}

                <div className="header-right">
                    <Link href="/login" className="login-button" title="Login">
                        <i className="fas fa-user"></i>
                    </Link>
                    <button
                        onClick={() => setThemeMode((m) => (m === "dark" ? "light" : "dark"))}
                        title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                        className="theme-toggle-button"
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
            </div>
        </header>
    );
}
