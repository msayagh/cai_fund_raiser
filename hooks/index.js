import { useState, useEffect, useCallback } from 'react';
import { loadTranslation, INITIAL_TRANSLATION, INITIAL_LANGUAGE } from '@/lib/translationUtils.js';
import { fetchFundedFromSheet, fetchDonationsFromSheet } from '@/lib/dataFetching.js';
import { INITIAL_TIERS, MOBILE_BREAKPOINT } from '@/constants/config.js';

export function useTranslation() {
    // Initialize with default INITIAL_LANGUAGE to avoid SSR issues
    const [language, setLanguageState] = useState(INITIAL_LANGUAGE);
    const [t, setT] = useState(INITIAL_TRANSLATION);
    const [isMounted, setIsMounted] = useState(false);

    // Load language from localStorage on mount and listen for changes
    useEffect(() => {
        setIsMounted(true);

        if (typeof window !== 'undefined') {
            // Load saved language from localStorage
            const savedLanguage = localStorage.getItem('selectedLanguage');
            if (savedLanguage && savedLanguage !== language) {
                setLanguageState(savedLanguage);
            }

            // Listen for storage changes from other tabs/windows
            const handleStorageChange = (e) => {
                if (e.key === 'selectedLanguage' && e.newValue) {
                    setLanguageState(e.newValue);
                }
            };

            window.addEventListener('storage', handleStorageChange);
            return () => window.removeEventListener('storage', handleStorageChange);
        }
    }, []);

    // Update translation when language changes
    useEffect(() => {
        let active = true;

        loadTranslation(language).then((loaded) => {
            if (active) setT(loaded);
        });

        return () => {
            active = false;
        };
    }, [language]);

    // Save language to localStorage and update URL
    useEffect(() => {
        if (typeof window === "undefined") return;

        localStorage.setItem('selectedLanguage', language);
        const url = new URL(window.location.href);
        url.searchParams.set("lang", language);
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }, [language]);

    const setLanguage = useCallback((lang) => {
        setLanguageState(lang);
    }, []);

    return { language, setLanguage, t, isMounted };
}

export function useThemeMode() {
    // Initialize with default 'dark' to avoid SSR issues
    const [themeMode, setThemeModeState] = useState('dark');
    const [isMounted, setIsMounted] = useState(false);

    // Load theme from localStorage on mount and listen for changes
    useEffect(() => {
        setIsMounted(true);

        if (typeof window !== 'undefined') {
            // Load saved theme from localStorage
            const savedTheme = localStorage.getItem('themeMode') || 'dark';
            if (savedTheme !== themeMode) {
                setThemeModeState(savedTheme);
            }

            // Listen for storage changes from other tabs/windows
            const handleStorageChange = (e) => {
                if (e.key === 'themeMode' && e.newValue) {
                    setThemeModeState(e.newValue);
                }
            };

            window.addEventListener('storage', handleStorageChange);
            return () => window.removeEventListener('storage', handleStorageChange);
        }
    }, []);

    // Custom setThemeMode that can handle both string values and updater functions
    const setThemeMode = useCallback((modeOrUpdater) => {
        setThemeModeState((prevMode) => {
            const newMode = typeof modeOrUpdater === 'function' ? modeOrUpdater(prevMode) : modeOrUpdater;
            if (typeof window !== 'undefined') {
                localStorage.setItem('themeMode', newMode);
            }
            return newMode;
        });
    }, []);

    return { themeMode, setThemeMode, isMounted };
}

export function useTiers() {
    const [tiers, setTiers] = useState(INITIAL_TIERS);
    const [selectedTier, setSelectedTier] = useState(0);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const updateFundedTiers = useCallback((funded) => {
        if (!funded) return;
        setTiers((prev) => {
            const next = prev.map((tier) => ({
                ...tier,
                funded: Math.min(tier.total, funded[tier.key] ?? tier.funded),
            }));
            const unchanged = prev.every((tier, idx) => tier.funded === next[idx].funded);
            return unchanged ? prev : next;
        });
    }, []);

    useEffect(() => {
        const pollFunded = () => fetchFundedFromSheet().then(updateFundedTiers);

        pollFunded();
        const fundedIntervalId = setInterval(pollFunded, 60 * 1000);

        return () => {
            clearInterval(fundedIntervalId);
        };
    }, [updateFundedTiers]);

    return { tiers, setTiers, selectedTier, setSelectedTier, updateFundedTiers, isMounted };
}

export function useDonations() {
    const [donations, setDonations] = useState([]);
    const [ramadanRaised, setRamadanRaised] = useState(0);
    const [totalsByEmail, setTotalsByEmail] = useState({});
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const getTotalsByEmail = useCallback((donations) => {
        const summary = {};

        donations.forEach((donation) => {
            const email = donation["courriel"];
            const tier = String(donation["tier"]);
            const price = parseInt(donation["montant total"]);
            const donorLabel = donation[Object.keys(donation)[23]];
            const details = String(donation["détails"]);

            if (!summary[email]) {
                summary[email] = {
                    email: email,
                    details: details,
                    donorLabel: donorLabel,
                    tier: tier,
                    totalDonated: 0,
                    ticketCount: 0,
                };
            }

            summary[email].totalDonated += price;
            summary[email].ticketCount += 1;

            if (summary[email].donorLabel !== donorLabel) {
                summary[email].donorLabel = donorLabel;
            }
        });

        return summary;
    }, []);

    const getRamadanRaised = useCallback((donations) => {
        return donations.reduce((sum, donation) => sum + parseInt(donation["montant total"]), 0);
    }, []);

    useEffect(() => {
        const pollDonations = () =>
            fetchDonationsFromSheet().then((rows) => {
                if (!Array.isArray(rows)) return;
                setDonations((prev) => {
                    if (prev.length === rows.length && prev.every((d, i) => d.id === rows[i].id && d.donated === rows[i].donated)) {
                        return prev;
                    }
                    return rows;
                });
                setTotalsByEmail(getTotalsByEmail(rows));
                setRamadanRaised(getRamadanRaised(rows));
            });

        pollDonations();
        const donationsIntervalId = setInterval(pollDonations, 60 * 1000);

        return () => {
            clearInterval(donationsIntervalId);
        };
    }, [getTotalsByEmail, getRamadanRaised]);

    return { donations, ramadanRaised, totalsByEmail, setDonations, setRamadanRaised, setTotalsByEmail, isMounted };
}

export function useMediaQuery(query) {
    const [matches, setMatches] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);

        const mediaQuery = window.matchMedia(query);
        const syncMatches = () => setMatches(mediaQuery.matches);

        syncMatches();
        mediaQuery.addEventListener("change", syncMatches);

        return () => {
            mediaQuery.removeEventListener("change", syncMatches);
        };
    }, [query]);

    // Return false during SSR/hydration to match server render, then client updates it
    return isMounted ? matches : false;
}

export function useResponsiveSidebars() {
    const [showDonationDialog, setShowDonationDialog] = useState(false);
    const [showRightSidebar, setShowRightSidebar] = useState(false);
    const [showLeftSidebar, setShowLeftSidebar] = useState(false);
    const [showPrayerSidebar, setShowPrayerSidebar] = useState(false);
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT}px)`);

    return {
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
        isMobile,
    };
}
