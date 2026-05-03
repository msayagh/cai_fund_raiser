import { useState, useEffect, useCallback } from 'react';
import { loadTranslation, INITIAL_TRANSLATION, INITIAL_LANGUAGE, AVAILABLE_LANGUAGE_CODES } from '@/lib/translationUtils.js';
import { fetchCampaignSnapshot } from '@/lib/dataFetching.js';
import { getCachedValue, setCachedValue } from '@/lib/clientCache.js';
import { captureException, captureMessage } from '@/lib/monitoring.js';
import { INITIAL_TIERS, MOBILE_BREAKPOINT } from '@/constants/config.js';

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
        const TIER_NAME_TO_KEY = {
            mutasaddiq: 'foundation',
            kareem: 'walls',
            jawaad: 'arches',
            sabbaq: 'dome',
        };

        const computeFundedFromPayments = (payments) => {
            const counts = { foundation: 0, walls: 0, arches: 0, dome: 0 };
            for (const payment of payments) {
                const key = TIER_NAME_TO_KEY[String(payment?.tier || '').toLowerCase()];
                if (!key) continue;
                counts[key] += Number(payment.quantity) || 1;
            }
            return counts;
        };

        const pollFunded = async ({ background = false } = {}) => {
            const cachedFunded = getCachedValue(TIERS_CACHE_KEY, { maxAgeMs: TIERS_CACHE_TTL });
            if (cachedFunded) {
                updateFundedTiers(cachedFunded);
                setIsLoading(false);
            }

            try {
                const payments = await fetchCampaignSnapshot();
                if (!Array.isArray(payments)) {
                    if (!cachedFunded) {
                        captureMessage('Tier progress fetch returned no data', { level: 'error', source: 'useTiers' });
                    }
                    return;
                }

                const funded = computeFundedFromPayments(payments);
                updateFundedTiers(funded);
                setCachedValue(TIERS_CACHE_KEY, funded);
                setError(null);
                setIsLoading(false);
            } catch (error) {
                if (!cachedFunded) {
                    setError('Unable to load tier progress right now.');
                }
                captureException(error, { source: 'useTiers' });
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

    const getTotalsByEmailApi = useCallback((donations) => {
        const summary = {};

        donations.forEach((donation) => {
            const ID = donation.id;
            let tier = String(donation.tier || '').trim();
            const amount = parseInt(donation.amount, 10) || 0;
            const donorLabel = String(donation.displayName || "Anonyme").trim();
            const details = String(donation.note || '');
            const quantity = Number(donation.quantity || 1);
            const email = String(donation.donor?.email || donation.email || '').trim();
            if (!tier) {
                tier = ["sabbaq", "mutasaddiq", "kareem", "jawaad"].find((t) => details.toLowerCase().includes(t.toLowerCase())) || "unknown";
            }

            summary[ID] = {
                email,
                donorLabel,
                tier,
                totalDonated: amount,
                ticketCount: quantity,
            };
        });

        return summary;
    }, []);

    const getRamadanRaisedApi = useCallback((donations) => {
        const total = donations.reduce((sum, donation) => {
            const amount = parseInt(donation.amount, 10) || 0;
            return sum + amount;
        }, 0);
        console.log(`[getRamadanRaisedApi] Calculated total from ${donations.length} donations: ${total}`);
        return total;
    }, []);

    const getEngagementAmount = useCallback((totalsByEmail) => {
        if (Object.keys(totalsByEmail).length === 0) return 0;

        // 1. Define the value mapping (case-insensitive keys for safety)
        const TIER_VALUES = {
            sabbaq: 2000,
            jawaad: 1500,
            kareem: 1000,
            mutasaddiq: 500
        };

        // 2. Reduce the object values into a single sum
        return Object.values(totalsByEmail).reduce((acc, donor) => {
            const tierKey = donor.tier.toLowerCase();
            const unitValue = TIER_VALUES[tierKey] || 0;
            return acc + (unitValue * donor.ticketCount);
        }, 0);
    }, []);

    useEffect(() => {
        const applySnapshot = (snapshot) => {
            const totals = getTotalsByEmailApi(snapshot);
            setDonations((prev) => {
                if (prev.length === snapshot.length && prev.every((d, i) => d.id === snapshot[i].id && d.amount === snapshot[i].amount)) {
                    return prev;
                }
                return snapshot;
            });
            setTotalsByEmail(totals);
            setRamadanRaised(getRamadanRaisedApi(snapshot));
            setEngagementAmount(getEngagementAmount(totals));
        };

        const pollDonations = async ({ background = false } = {}) => {
            const cachedRows = getCachedValue(DONATIONS_CACHE_KEY, { maxAgeMs: DONATIONS_CACHE_TTL });
            if (Array.isArray(cachedRows)) {
                applySnapshot(cachedRows);
                setIsLoading(false);
            }

            try {
                const snapshot = await fetchCampaignSnapshot();
                if (!Array.isArray(snapshot)) {
                    if (!cachedRows) {
                        captureMessage('Donations fetch returned no data', { level: 'error', source: 'useDonations' });
                    }
                    return;
                }

                applySnapshot(snapshot);
                setCachedValue(DONATIONS_CACHE_KEY, snapshot);
                setError(null);
                setIsLoading(false);
            } catch (error) {
                if (!cachedRows) {
                    setError('Unable to load donations right now.');
                }
                captureException(error, { source: 'useDonations' });
            }
        };

        pollDonations();
        const donationsIntervalId = setInterval(() => pollDonations({ background: true }), 60 * 1000);

        return () => {
            clearInterval(donationsIntervalId);
        };
    }, [getRamadanRaisedApi, getTotalsByEmailApi, getEngagementAmount]);

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
