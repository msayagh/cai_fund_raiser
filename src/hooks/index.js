import { useState, useEffect, useCallback } from 'react';
import { loadTranslation, INITIAL_TRANSLATION, INITIAL_LANGUAGE } from '../utils/translationUtils.js';
import { fetchFundedFromSheet, fetchDonationsFromSheet } from '../utils/dataFetching.js';
import { INITIAL_TIERS, MOBILE_BREAKPOINT } from '../constants/config.js';

export function useTranslation() {
    const [language, setLanguage] = useState(INITIAL_LANGUAGE);
    const [t, setT] = useState(INITIAL_TRANSLATION);

    useEffect(() => {
        let active = true;

        loadTranslation(language).then((loaded) => {
            if (active) setT(loaded);
        });

        return () => {
            active = false;
        };
    }, [language]);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const url = new URL(window.location.href);
        url.searchParams.set("lang", language);
        window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }, [language]);

    return { language, setLanguage, t };
}

export function useTiers() {
    const [tiers, setTiers] = useState(INITIAL_TIERS);
    const [selectedTier, setSelectedTier] = useState(0);

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

    return { tiers, setTiers, selectedTier, setSelectedTier, updateFundedTiers };
}

export function useDonations() {
    const [donations, setDonations] = useState([]);
    const [ramadanRaised, setRamadanRaised] = useState(0);
    const [totalsByEmail, setTotalsByEmail] = useState({});

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

    const updateFundedTiers = useCallback((funded) => {
        if (!funded) return;
    }, []);

    useEffect(() => {
        const pollFunded = () => fetchFundedFromSheet().then(updateFundedTiers);

        pollFunded();
        const fundedIntervalId = setInterval(pollFunded, 60 * 1000);

        return () => {
            clearInterval(fundedIntervalId);
        };
    }, [updateFundedTiers]);

    return { donations, ramadanRaised, totalsByEmail, setDonations, setRamadanRaised, setTotalsByEmail };
}

export function useMediaQuery(query) {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const mediaQuery = window.matchMedia(query);
        const syncMatches = () => setMatches(mediaQuery.matches);

        syncMatches();
        mediaQuery.addEventListener("change", syncMatches);

        return () => {
            mediaQuery.removeEventListener("change", syncMatches);
        };
    }, [query]);

    return matches;
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
