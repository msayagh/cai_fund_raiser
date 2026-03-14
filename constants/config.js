// Theme configuration
export const THEMES = {
    dark: {
        mode: "dark",
        bgPage: "#090c18",
        bgHeader: "#0e1020",
        bgSidebar: "#0e1020",
        bgCard: "#131628",
        bgCardAlt: "#181b30",
        bgCardSelected: "#1e2240",
        border: "#2e3250",
        borderAccent: "rgba(214,188,132,0.34)",
        textPrimary: "#ffffff",
        textSecondary: "#f0e8d8",
        textMuted: "#d8d8e8",
        textMutedAlt: "#ece6d8",
        accentGold: "#D4A96E",
        scrollbarThumb: "rgba(200,169,110,0.22)",
        // Mosque viz
        vizGradientTop: "#12142a",
        vizGradientBottom: "#0a0c1c",
        vizInnerFill: "#161930",
        vizMaskFill: "#090c18",
        vizBrickUnfunded: "rgba(0,0,0,0.6)",
        vizBrickStructural: "rgba(0,0,0,0.55)",
        vizProgressTrack: "#2e3250",
        vizStarFill: "white",
        vizLineStroke: "rgba(255,255,255,0.18)",
        vizLineMuted: "rgba(255,255,255,0.10)",
        vizLineSubtle: "rgba(255,255,255,0.07)",
        vizAccentFill: "rgba(0,0,0,0.25)",
        vizMoonBg: "#fffde8",
        vizMoonCrater: "#090c18",
        vizHadith: "#e8e0d0",
    },
    light: {
        mode: "light",
        bgPage: "#f8f6f2",
        bgHeader: "#ffffff",
        bgSidebar: "#faf9f6",
        bgCard: "#ffffff",
        bgCardAlt: "#f5f3ef",
        bgCardSelected: "#f0ebe3",
        border: "#e5e2dc",
        borderAccent: "rgba(154,123,79,0.25)",
        textPrimary: "#1a1a1a",
        textSecondary: "#2d2d2d",
        textMuted: "#5c5c5c",
        textMutedAlt: "#6b6b6b",
        accentGold: "#9a7b4f",
        scrollbarThumb: "rgba(154,123,79,0.3)",
        // Mosque viz
        vizGradientTop: "#e8e6e0",
        vizGradientBottom: "#d8d4cc",
        vizInnerFill: "#e0ddd6",
        vizMaskFill: "#f8f6f2",
        vizBrickUnfunded: "rgba(0,0,0,0.12)",
        vizBrickStructural: "rgba(0,0,0,0.08)",
        vizProgressTrack: "#e5e2dc",
        vizStarFill: "#2d2d2d",
        vizLineStroke: "rgba(0,0,0,0.12)",
        vizLineMuted: "rgba(0,0,0,0.08)",
        vizLineSubtle: "rgba(0,0,0,0.06)",
        vizAccentFill: "rgba(0,0,0,0.06)",
        vizMoonBg: "rgba(51, 51, 51, 0.9)",
        vizMoonCrater: "rgba(225, 226, 228, 0.9)",
        vizHadith: "#3d3d3d",
    },
};

export const TIER_CONFIG = {
    foundation: { key: "foundation", name: "Mutasaddiq", funded: 0, total: 320, amount: 500, color: "#C8935A" },
    walls: { key: "walls", name: "Kareem", funded: 0, total: 320, amount: 1000, color: "#7EB8A0" },
    arches: { key: "arches", name: "Jawaad", funded: 0, total: 320, amount: 1500, color: "#8AAED4" },
    dome: { key: "dome", name: "Sabbaq", funded: 0, total: 320, amount: 2000, color: "#B87AD9" },
};

export const TIER_KEYS = ["foundation", "walls", "arches", "dome"];

export const INITIAL_TIERS = [
    { id: 0, ...TIER_CONFIG.foundation },
    { id: 1, ...TIER_CONFIG.walls },
    { id: 2, ...TIER_CONFIG.arches },
    { id: 3, ...TIER_CONFIG.dome },
];

export const DEFAULT_LANGUAGE = "en";
export const DEFAULT_SITE_URL = "https://ccai-stjean.org/";
export const DEFAULT_SOCIAL_IMAGE = "/logo-ccai.png";
export const SITE_NAME = "Centre Zad Al-Imane";
export const DONATION_URL = "https://your-donation-page.com";
export const MOBILE_BREAKPOINT = 1200;

export const BOUNDARIES = [624, 514, 394];

export const RAMADAN_TARGET = 200000;
export const PRE_RAISED = 692602;
