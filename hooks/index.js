import { useState, useEffect, useCallback } from 'react';
import { loadTranslation, INITIAL_TRANSLATION, INITIAL_LANGUAGE, AVAILABLE_LANGUAGE_CODES } from '@/lib/translationUtils.js';
import { fetchFundedFromSheet, fetchDonationsFromSheet } from '@/lib/dataFetching.js';
import { getCachedValue, setCachedValue } from '@/lib/clientCache.js';
import { captureException, captureMessage } from '@/lib/monitoring.js';
import { INITIAL_TIERS, MOBILE_BREAKPOINT, TIER_CONFIG } from '@/constants/config.js';

const TIERS_CACHE_KEY = 'tiers:funded';
const TIERS_CACHE_TTL = 1000 * 60 * 5;
const DONATIONS_CACHE_KEY = 'donations:rows';
const DONATIONS_CACHE_TTL = 1000 * 60;

function getSystemThemePreference() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return 'dark';
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTranslation() {
    // Initialize with default INITIAL_LANGUAGE to avoid SSR issues
    const [language, setLanguageState] = useState(INITIAL_LANGUAGE);
    const [t, setT] = useState(INITIAL_TRANSLATION);
    const [isMounted, setIsMounted] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load language from localStorage on mount and listen for changes
    useEffect(() => {
        setIsMounted(true);

        if (typeof window !== 'undefined') {
            const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
            const savedLanguage = localStorage.getItem('selectedLanguage');
            let selectedLang = INITIAL_LANGUAGE;

            if (requestedLanguage && AVAILABLE_LANGUAGE_CODES.includes(requestedLanguage)) {
                selectedLang = requestedLanguage;
            } else if (savedLanguage && AVAILABLE_LANGUAGE_CODES.includes(savedLanguage)) {
                selectedLang = savedLanguage;
            }

            setLanguageState(selectedLang);
            setIsInitialized(true);

            // Listen for storage changes from other tabs/windows
            const handleStorageChange = (e) => {
                if (e.key === 'selectedLanguage' && e.newValue && AVAILABLE_LANGUAGE_CODES.includes(e.newValue)) {
                    setLanguageState(e.newValue);
                }
            };

            window.addEventListener('storage', handleStorageChange);
            return () => window.removeEventListener('storage', handleStorageChange);
        }
        setIsInitialized(true);
    }, []);

    // Update translation when language changes (synchronous since modules are statically imported)
    useEffect(() => {
        const loaded = loadTranslation(language);
        setT(loaded);
    }, [language]);

    // Save language to localStorage and update URL only after initialization
    useEffect(() => {
        if (typeof window === "undefined" || !isInitialized) return;

        localStorage.setItem('selectedLanguage', language);
        const url = new URL(window.location.href);
        url.searchParams.set("lang", language);
        // Only update history if language actually changed from URL
        if (url.search !== window.location.search) {
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
    }, [language, isInitialized]);

    const setLanguage = useCallback((lang) => {
        setLanguageState(lang);
    }, []);

    return { language, setLanguage, t, isMounted };
}

export function useThemeMode() {
    // Initialize with a safe SSR default, then hydrate from saved/system preference
    const [themeMode, setThemeModeState] = useState('dark');
    const [isMounted, setIsMounted] = useState(false);

    // Load theme from localStorage or system preference on mount, then listen for changes
    useEffect(() => {
        setIsMounted(true);

        if (typeof window !== 'undefined') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const syncThemeMode = () => {
                const savedTheme = localStorage.getItem('themeMode');
                const preferredTheme = savedTheme || getSystemThemePreference();

                setThemeModeState((prevTheme) => (
                    prevTheme === preferredTheme ? prevTheme : preferredTheme
                ));
            };

            syncThemeMode();

            const handleSystemThemeChange = () => {
                if (!localStorage.getItem('themeMode')) {
                    syncThemeMode();
                }
            };

            const handleStorageChange = (e) => {
                if (e.key === 'themeMode') {
                    syncThemeMode();
                }
            };

            mediaQuery.addEventListener('change', handleSystemThemeChange);
            window.addEventListener('storage', handleStorageChange);

            return () => {
                mediaQuery.removeEventListener('change', handleSystemThemeChange);
                window.removeEventListener('storage', handleStorageChange);
            };
        }
    }, []);

    const setThemeMode = useCallback((modeOrUpdater) => {
        setThemeModeState((prevMode) => {
            const nextMode = typeof modeOrUpdater === 'function' ? modeOrUpdater(prevMode) : modeOrUpdater;
            const resolvedMode = nextMode === 'system' ? getSystemThemePreference() : nextMode;

            if (typeof window !== 'undefined') {
                if (nextMode === 'system') {
                    localStorage.removeItem('themeMode');
                } else {
                    localStorage.setItem('themeMode', resolvedMode);
                }
            }

            return resolvedMode;
        });
    }, []);

    return { themeMode, setThemeMode, isMounted };
}

export function useTiers() {
    const [tiers, setTiers] = useState(INITIAL_TIERS);
    const [selectedTier, setSelectedTier] = useState(0);
    const [isMounted, setIsMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

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
        const pollFunded = async ({ background = false } = {}) => {
            if (!background) {
                setIsLoading(true);
            }

            const cachedFunded = getCachedValue(TIERS_CACHE_KEY, { maxAgeMs: TIERS_CACHE_TTL });
            if (cachedFunded) {
                updateFundedTiers(cachedFunded);
                if (!background) {
                    setIsLoading(false);
                }
            }

            try {
                const funded = await fetchFundedFromSheet();
                if (!funded) {
                    setError('Unable to load tier progress right now.');
                    captureMessage('Tier progress fetch returned no data', { level: 'error', source: 'useTiers' });
                    return;
                }

                updateFundedTiers(funded);
                setCachedValue(TIERS_CACHE_KEY, funded);
                setError(null);
            } catch (error) {
                setError('Unable to load tier progress right now.');
                captureException(error, { source: 'useTiers' });
            } finally {
                setIsLoading(false);
            }
        };

        pollFunded();
        const fundedIntervalId = setInterval(() => pollFunded({ background: true }), 60 * 1000);

        return () => {
            clearInterval(fundedIntervalId);
        };
    }, [updateFundedTiers]);

    return { tiers, setTiers, selectedTier, setSelectedTier, updateFundedTiers, isMounted, isLoading, error };
}

export function useDonations() {
    const [donations, setDonations] = useState([]);
    const [ramadanRaised, setRamadanRaised] = useState(0);
    const [engagementAmount, setEngagementAmount] = useState(0);
    const [totalsByEmail, setTotalsByEmail] = useState({});
    const [isMounted, setIsMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const getTotalsByEmail = useCallback((donations) => {
        const summary = {};

        donations.forEach((donation) => {
            const email = donation["courriel"];
            const tier = String(donation["tier"]);
            const price = parseInt(donation["montant total"]);
            const donorLabel = String(donation["donorLabel"] || "").trim();
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

            if (!summary[email].donorLabel && donorLabel) {
                summary[email].donorLabel = donorLabel;
            }
        });

        return summary;
    }, []);

    const getRamadanRaised = useCallback((donations) => {
        const total = donations.reduce((sum, donation) => {
            const amount = parseInt(donation["montant total"], 10) || 0;
            return sum + amount;
        }, 0);
        console.log(`[getRamadanRaised] Calculated total from ${donations.length} donations: ${total}`);
        return total;
    }, []);

    const getTierAmount = useCallback((donation) => {
        const tierText = String(donation?.tier || donation?.["tier"] || donation?.["détails"] || "").toLowerCase();

        const matchedTier = Object.values(TIER_CONFIG).find((tier) => {
            return (
                tierText.includes(tier.key.toLowerCase()) ||
                tierText.includes(tier.name.toLowerCase())
            );
        });

        return matchedTier?.amount ?? 0;
    }, []);

    const getEngagementAmount = useCallback((donations) => {
        const seenObjectives = new Set();

        return donations.reduce((sum, donation, index) => {
            const email = String(donation?.["courriel"] || "").trim().toLowerCase();
            const details = String(donation?.["détails"] || donation?.tier || "").trim().toLowerCase();
            const objectiveKey = `${email}::${details || index}`;

            if (seenObjectives.has(objectiveKey)) {
                return sum;
            }

            seenObjectives.add(objectiveKey);
            return sum + getTierAmount(donation);
        }, 0);
    }, [getTierAmount]);

    useEffect(() => {
        const pollDonations = async ({ background = false } = {}) => {
            if (!background) {
                setIsLoading(true);
            }

            const cachedRows = getCachedValue(DONATIONS_CACHE_KEY, { maxAgeMs: DONATIONS_CACHE_TTL });
            if (Array.isArray(cachedRows) && cachedRows.length > 0) {
                setDonations(cachedRows);
                setTotalsByEmail(getTotalsByEmail(cachedRows));
                setRamadanRaised(getRamadanRaised(cachedRows));
                setEngagementAmount(getEngagementAmount(cachedRows));
                if (!background) {
                    setIsLoading(false);
                }
            }

            try {
                const rows = await fetchDonationsFromSheet();
                if (!Array.isArray(rows)) {
                    setError('Unable to load donations right now.');
                    captureMessage('Donations fetch returned a non-array payload', { level: 'error', source: 'useDonations' });
                    return;
                }

                console.log('[useDonations] Fetched donations:', rows.length);
                setDonations((prev) => {
                    if (prev.length === rows.length && prev.every((d, i) => d.id === rows[i].id && d.donated === rows[i].donated)) {
                        return prev;
                    }
                    return rows;
                });
                setCachedValue(DONATIONS_CACHE_KEY, rows);
                setTotalsByEmail(getTotalsByEmail(rows));
                setRamadanRaised(getRamadanRaised(rows));
                setEngagementAmount(getEngagementAmount(rows));
                setError(null);
            } catch (error) {
                setError('Unable to load donations right now.');
                captureException(error, { source: 'useDonations' });
            } finally {
                setIsLoading(false);
            }
        };

        pollDonations();
        const donationsIntervalId = setInterval(() => pollDonations({ background: true }), 60 * 1000);

        return () => {
            clearInterval(donationsIntervalId);
        };
    }, [getEngagementAmount, getTotalsByEmail, getRamadanRaised]);

    return {
        donations,
        ramadanRaised,
        engagementAmount,
        totalsByEmail,
        setDonations,
        setRamadanRaised,
        setEngagementAmount,
        setTotalsByEmail,
        isMounted,
        isLoading,
        error,
    };
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
