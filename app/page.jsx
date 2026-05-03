'use client';

import React, { useRef, useEffect, useState } from "react";
import "./page.scss";

// Components
import { Header } from "@/components/Header.jsx";
import { QRCode } from "@/components/QRCode.jsx";
import { DonationsList } from "@/components/DonationsList.jsx";
import StatisticsScreen from "@/components/StatisticsScreen.jsx";
import { MosqueViz } from "@/components/Mosque/MosqueViz.jsx";
import { HadithSection, MosqueSideChips, TierLegend } from "@/components/CenterContent.jsx";
import { TierSelection, SelectedTierCard } from "@/components/RightSidebarContent.jsx";
import { SidebarBackdrop, SidebarToggleButton, PrayerSidebar, LeftSidebar, RightSidebar } from "@/components/Sidebars.jsx";
import Footer from "@/components/Footer.jsx";
import SitePreloader from "@/components/SitePreloader.jsx";

// Hooks
import { useTranslation, useThemeMode, useTiers, useDonations, useResponsiveSidebars } from "@/hooks/index.js";
import { useFirstVisitPreloader } from "@/hooks/useFirstVisitPreloader.js";

// Utilities
import { DEFAULT_TRANSLATION, truncateText, getSiteUrl, getAbsoluteUrl } from "@/lib/translationUtils.js";
import { setupSEOMetaTags } from "@/lib/seoUtils.js";

// Constants
import { THEMES, MOBILE_BREAKPOINT, RAMADAN_TARGET, PRE_RAISED, DEFAULT_SOCIAL_IMAGE } from "@/constants/config.js";

export default function MosqueDonation() {
  // Language management
  const { language, setLanguage, t, isMounted: translationMounted } = useTranslation();

  // Tier management
  const { tiers, selectedTier, setSelectedTier, isLoading: tiersLoading, error: tiersError } = useTiers();

  // Donations data
  const {
    donations,
    ramadanRaised,
    engagementAmount,
    totalsByEmail,
    isLoading: donationsLoading,
    error: donationsError,
  } = useDonations();

  // Log data availability
  useEffect(() => {
    console.log('[page.jsx] Data status:', {
      donations: donations.length,
      ramadanRaised,
      engagementAmount,
      tiers: tiers.length,
      tiersWithFunded: tiers.map(t => ({ key: t.key, funded: t.funded, total: t.total })),
    });
  }, [donations, ramadanRaised, engagementAmount, tiers]);

  // Theme management
  const { themeMode, setThemeMode, isMounted: themeMounted } = useThemeMode();
  const theme = THEMES[themeMode] ?? THEMES.dark;

  // Responsive UI state
  const {
    showDonationDialog,
    setShowDonationDialog,
    showRightSidebar,
    setShowRightSidebar,
    showLeftSidebar,
    setShowLeftSidebar,
    showPrayerSidebar,
    setShowPrayerSidebar,
    showLanguageMenu,
    setShowLanguageMenu,
  } = useResponsiveSidebars();

  // Prayer embed - initialize with default, update on mount
  const [prayerEmbedMode, setPrayerEmbedMode] = useState("w");
  const [isMounted, setIsMounted] = useState(false);
  const [donationFeedback, setDonationFeedback] = useState(null);
  const [donationIframeLoaded, setDonationIframeLoaded] = useState(false);
  const [showStatisticsScreen, setShowStatisticsScreen] = useState(false);
  const appReady = isMounted && themeMounted && translationMounted;
  const { shouldShowPreloader, isResolved: preloaderResolved } = useFirstVisitPreloader(appReady);

  // Refs
  const languageDropdownRef = useRef(null);

  // Mark component as mounted and sync initial values
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update prayer embed on resize and mount
  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const syncPrayerEmbedMode = () => {
      setPrayerEmbedMode(mediaQuery.matches ? "m" : "w");
    };

    syncPrayerEmbedMode();
    mediaQuery.addEventListener("change", syncPrayerEmbedMode);

    return () => {
      mediaQuery.removeEventListener("change", syncPrayerEmbedMode);
    };
  }, []);

  // Language dropdown handler
  useEffect(() => {
    if (!showLanguageMenu) return;

    const handlePointerDown = (event) => {
      if (!languageDropdownRef.current?.contains(event.target)) {
        setShowLanguageMenu(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [showLanguageMenu, setShowLanguageMenu]);

  // Calculate values
  const isRTL = ["ar", "ur"].includes(language);
  const localizedTiers = tiers.map((tier) => ({
    ...tier,
    label: t?.tierLabels?.[tier.key] ?? tier.key,
  }));

  const sel = localizedTiers[selectedTier];
  const pct = Math.round((sel.funded / sel.total) * 100);
  const remaining = sel.total - sel.funded;

  const totalRaised = ramadanRaised + PRE_RAISED;
  const totalGoal = localizedTiers.reduce((sum, tier) => sum + tier.total * tier.amount, 0);

  const currencyFirst = language === "en";
  const delayedDonationMessage = t.donationFormDelayed || DEFAULT_TRANSLATION.donationFormDelayed;
  const siteUrl = getSiteUrl();
  const pageUrl = getAbsoluteUrl(`/?lang=${language}`, siteUrl);
  const socialImageUrl = getAbsoluteUrl(DEFAULT_SOCIAL_IMAGE, siteUrl);
  const pageTitle = `${t.title} | ${t.centerName}`;
  const pageDescription = truncateText(
    t.aboutCampaignText ||
    DEFAULT_TRANSLATION.campaignSeoDescription
  );
  const locale = t.locale ?? language;
  const logoAlt = `${t.centerName} logo`;
  const qrAlt = `${t.qrAlt} - ${sel.label}`;
  const prayerLanguage = language.split("-")[0];
  const prayerIframeSrc = `https://mawaqit.net/${prayerLanguage}/${prayerEmbedMode}/ccai-sjsr?showOnly5PrayerTimes=0`;

  // Setup SEO
  useEffect(() => {
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
      pagePath: '/',
      pageType: 'campaign',
    });
  }, [isRTL, language, locale, logoAlt, pageDescription, pageTitle, pageUrl, siteUrl, socialImageUrl, t]);

  useEffect(() => {
    if (!showDonationDialog || donationIframeLoaded) return;

    const timeoutId = window.setTimeout(() => {
      setDonationFeedback({
        tone: 'error',
        message: delayedDonationMessage,
      });
    }, 9000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [showDonationDialog, donationIframeLoaded, delayedDonationMessage]);

  // Don't render anything that depends on hydration until theme and language are ready
  if (!appReady && shouldShowPreloader && preloaderResolved) {
    return (
      <div
        className="mosque-donation"
        data-theme="dark"
        suppressHydrationWarning
      >
        <SitePreloader title={t.centerName || DEFAULT_TRANSLATION.centerName} subtitle={t.loadingCampaign || DEFAULT_TRANSLATION.loadingCampaign} />
      </div>
    );
  }

  // Handlers
  function handleTierSelect(nextTier) {
    setSelectedTier(nextTier);

    if (isMounted && window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches) {
      setShowRightSidebar(true);
    }
  }

  function togglePrayerSidebar() {
    setShowPrayerSidebar((open) => !open);
    setShowLeftSidebar(false);
    setShowRightSidebar(false);
  }

  function closeSidebars() {
    setShowLeftSidebar(false);
    setShowRightSidebar(false);
    setShowPrayerSidebar(false);
  }

  function openDonationDialog() {
    setDonationIframeLoaded(false);
    setShowDonationDialog(true);
  }

  function closeDonationDialog() {
    setShowDonationDialog(false);
    setDonationIframeLoaded(false);
    setDonationFeedback(null);
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`mosque-donation ${isRTL ? 'rtl' : ''}`}
      data-theme={themeMode}
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
        tierCollectedAmount={engagementAmount}
        tierEngagementPct={RAMADAN_TARGET > 0 ? Math.min(100, Math.round((engagementAmount / RAMADAN_TARGET) * 100)) : 0}
        tierEngagementTarget={RAMADAN_TARGET}
        receivedAmount={ramadanRaised}
        receivedTarget={RAMADAN_TARGET}
        showLanguageMenu={showLanguageMenu}
        setShowLanguageMenu={setShowLanguageMenu}
        languageDropdownRef={languageDropdownRef}
        currencyFirst={currencyFirst}
        onOpenStatistics={() => setShowStatisticsScreen(true)}
      />

      <StatisticsScreen
        isOpen={showStatisticsScreen}
        onClose={() => setShowStatisticsScreen(false)}
        t={t}
        theme={theme}
        language={language}
        localizedTiers={localizedTiers}
        selectedTier={selectedTier}
        totalRaised={totalRaised}
        totalGoal={totalGoal}
        campaignGoal={RAMADAN_TARGET}
        ramadanRaised={ramadanRaised}
        engagementAmount={engagementAmount}
        totalsByEmail={totalsByEmail}
      />

      <div className="layout-main">
        <SidebarBackdrop
          isVisible={showLeftSidebar || showRightSidebar || showPrayerSidebar}
          onClose={closeSidebars}
        />

        <SidebarToggleButton
          position="left"
          onClick={() => {
            if (isMounted && window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches) {
              setShowLeftSidebar(!showLeftSidebar);
            }
          }}
          ariaLabel={t.donationsAndQr || DEFAULT_TRANSLATION.donationsAndQr}
          title={t.donationsAndQr || DEFAULT_TRANSLATION.donationsAndQr}
        >
          <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M15 15h2v2h-2zM18 15h2v5h-2zM15 18h2v2h-2z" fill="currentColor" />
        </SidebarToggleButton>

        <SidebarToggleButton
          position="right"
          onClick={() => {
            if (isMounted && window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches) {
              setShowRightSidebar(!showRightSidebar);
            }
          }}
          ariaLabel={t.tierSelectionTitle || DEFAULT_TRANSLATION.tierSelectionTitle}
          title={t.tierSelectionTitle || DEFAULT_TRANSLATION.tierSelectionTitle}
        >
          <path d="M12 20s-6.5-3.9-6.5-9.1A3.9 3.9 0 0 1 9.4 7c1.1 0 2.1.5 2.6 1.4.5-.9 1.5-1.4 2.6-1.4a3.9 3.9 0 0 1 3.9 3.9C18.5 16.1 12 20 12 20Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M9.2 12h5.6M12 9.2v5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </SidebarToggleButton>

        <button
          className="sidebar-toggle-btn sidebar-toggle-prayer"
          onClick={togglePrayerSidebar}
          aria-label={t.prayerTimes}
          title={t.prayerTimes}
          aria-controls="prayer-sidebar"
          aria-expanded={showPrayerSidebar}
        >
          <i className="fa-solid fa-clock sidebar-toggle-icon" aria-hidden="true"></i>
        </button>

        <PrayerSidebar
          isOpen={showPrayerSidebar}
          onClose={() => setShowPrayerSidebar(false)}
          t={t}
          prayerIframeSrc={prayerIframeSrc}
        />

        <div className="layout-main-inner">
          <div className="layout-left">
            <div className="qr-section">
              <div className="qr-title">{t.scanToDonate}</div>
              <div className="qr-help">{t.qrHelp}</div>
              <div className="qr-code-container">
                <QRCode color={sel.color} alt={qrAlt} theme={theme} />
              </div>
            </div>
            <DonationsList
              donations={donations}
              tiers={localizedTiers}
              language={language}
              isRTL={isRTL}
              theme={theme}
              totalsByEmail={totalsByEmail}
              t={t}
              isLoading={donationsLoading}
              error={donationsError}
              variant="sidebar"
            />
          </div>

          <LeftSidebar
            isOpen={showLeftSidebar}
            onClose={() => setShowLeftSidebar(false)}
          >
            <div className="qr-section">
              <div className="qr-title">{t.scanToDonate}</div>
              <div className="qr-help">{t.qrHelp}</div>
              <div className="qr-code-container">
                <QRCode color={sel.color} alt={qrAlt} theme={theme} />
              </div>
            </div>
            <DonationsList
              donations={donations}
              tiers={localizedTiers}
              language={language}
              isRTL={isRTL}
              theme={theme}
              totalsByEmail={totalsByEmail}
              t={t}
              isLoading={donationsLoading}
              error={donationsError}
              variant="sidebar"
            />
          </LeftSidebar>

          <div className="layout-center">
            <HadithSection t={t} isRTL={isRTL} theme={theme} />

            <div className="mosque-viz-wrapper">
              <div className="mosque-viz-overlay"></div>
              <div className="mosque-viz-container">
                <MosqueViz
                  tiers={localizedTiers}
                  selectedTier={selectedTier}
                  onSelectTier={openDonationDialog}
                  theme={theme}
                  describedBy="mosque-viz-summary"
                />
              </div>
              <p className="sr-only" id="mosque-viz-summary">
                Interactive mosque fundraising visualization with selectable sections for foundation, walls, arches, and dome.
              </p>
              <MosqueSideChips
                localizedTiers={localizedTiers}
                selectedTier={selectedTier}
                setSelectedTier={setSelectedTier}
                setShowRightSidebar={setShowRightSidebar}
                isRTL={isRTL}
                theme={theme}
                currencyFirst={currencyFirst}
                t={t}
              />
            </div>

            <TierLegend
              localizedTiers={localizedTiers}
              selectedTier={selectedTier}
              handleTierSelect={handleTierSelect}
              theme={theme}
              t={t}
            />
          </div>

          <div className="layout-right">
            <TierSelection
              localizedTiers={localizedTiers}
              selectedTier={selectedTier}
              setSelectedTier={setSelectedTier}
              theme={theme}
              currencyFirst={currencyFirst}
              t={t}
              isLoading={tiersLoading}
              error={tiersError}
            />

            <SelectedTierCard
              sel={sel}
              pct={pct}
              remaining={remaining}
              currencyFirst={currencyFirst}
              t={t}
              onDonate={openDonationDialog}
              isLoading={tiersLoading}
              statusMessage={donationFeedback?.message || tiersError}
              statusTone={donationFeedback?.tone || (tiersError ? 'error' : 'info')}
            />
          </div>

          <RightSidebar
            isOpen={showRightSidebar}
            onClose={() => setShowRightSidebar(false)}
          >
            <TierSelection
              localizedTiers={localizedTiers}
              selectedTier={selectedTier}
              setSelectedTier={setSelectedTier}
              theme={theme}
              currencyFirst={currencyFirst}
              t={t}
              isLoading={tiersLoading}
              error={tiersError}
            />

            <SelectedTierCard
              sel={sel}
              pct={pct}
              remaining={remaining}
              currencyFirst={currencyFirst}
              t={t}
              onDonate={openDonationDialog}
              isLoading={tiersLoading}
              statusMessage={donationFeedback?.message || tiersError}
              statusTone={donationFeedback?.tone || (tiersError ? 'error' : 'info')}
            />
          </RightSidebar>

        </div>
      </div>

      {showDonationDialog && (
        <div className="donation-dialog-overlay">
          <div className="donation-dialog-content">
            <div className="donation-dialog-body">
              <button
                type="button"
                onClick={closeDonationDialog}
                aria-label={t.closeDonationDialog || DEFAULT_TRANSLATION.closeDonationDialog}
                className="donation-dialog-close"
              >
                ×
              </button>
              <div className="donation-dialog-form-wrapper">
                {!donationIframeLoaded && (
                  <div className="donation-dialog-loading">
                    <div className="donation-dialog-spinner" aria-hidden="true"></div>
                    <div className="donation-dialog-loading-title">{t.preparingSecureCheckout || DEFAULT_TRANSLATION.preparingSecureCheckout}</div>
                    <div className="donation-dialog-loading-text">
                      {t.donationDialogLoadingText || DEFAULT_TRANSLATION.donationDialogLoadingText}
                    </div>
                  </div>
                )}
                <iframe
                  title={t.donationFormPoweredByZeffy || DEFAULT_TRANSLATION.donationFormPoweredByZeffy}
                  src="https://www.zeffy.com/embed/ticketing/travaux-damenagement-dans-le-nouveau-centre"
                  aria-label={t.secureDonationForm || DEFAULT_TRANSLATION.secureDonationForm}
                  onLoad={() => {
                    setDonationIframeLoaded(true);
                  }}
                />
              </div>
              <div className="donation-dialog-external-link-wrapper">
                <a
                  href="https://www.zeffy.com/en-CA/ticketing/travaux-damenagement-dans-le-nouveau-centre"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="donation-dialog-external-link-button"
                  aria-label={t.openDonationFormNewTab || "Open donation form in new tab"}
                >
                  {(t.openDonationFormNewTab || "Open in new tab") + " ↗"}
                </a>
              </div>
              {donationFeedback ? (
                <div
                  className={`donation-dialog-feedback donation-dialog-feedback--${donationFeedback.tone}`}
                  role="status"
                  aria-live="polite"
                >
                  {donationFeedback.message}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <Footer t={t} />
    </div>
  );
}
