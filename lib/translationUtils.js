import { DEFAULT_LANGUAGE } from "../constants/config.js";
import en from "../translations/en.jsx";
import fr from "../translations/fr.jsx";
import ar from "../translations/ar.jsx";
import ur from "../translations/ur.jsx";
import es from "../translations/es.jsx";
import tr from "../translations/tr.jsx";
import zh from "../translations/zh.jsx";


// Translation modules - explicit imports for Next.js
export const TRANSLATION_MODULES = {
    en,
    fr,
    ar,
    ur,
    es,
    tr,
    zh,
};

export const AVAILABLE_LANGUAGE_CODES = Object.keys(TRANSLATION_MODULES)
    .sort((a, b) => {
        if (a === DEFAULT_LANGUAGE) return -1;
        if (b === DEFAULT_LANGUAGE) return 1;
        return a.localeCompare(b);
    });

export function getLanguageLabel(code) {
    const capitalize = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

    try {
        return capitalize(new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code.toUpperCase());
    } catch {
        return code.toUpperCase();
    }
}

export const LANGUAGE_OPTIONS = AVAILABLE_LANGUAGE_CODES.map((code) => {
    const flagMap = {
        en: "🇬🇧",
        fr: "🇨🇦",
        ar: "🇸🇦",
        ur: "🇵🇰",
        es: "🇪🇸",
        tr: "🇹🇷",
        zh: "🇨🇳",
    };
    return {
        code,
        label: getLanguageLabel(code),
        flag: flagMap[code] || "🌐",
    };
});

// Translation utilities
export function getInitialLanguage() {
    return AVAILABLE_LANGUAGE_CODES.includes("fr") ? "fr" : DEFAULT_LANGUAGE;
}

export const DEFAULT_TRANSLATION = TRANSLATION_MODULES[DEFAULT_LANGUAGE] ?? Object.values(TRANSLATION_MODULES)[0] ?? {};

export const INITIAL_LANGUAGE = getInitialLanguage();
export const INITIAL_TRANSLATION = TRANSLATION_MODULES[INITIAL_LANGUAGE] ?? DEFAULT_TRANSLATION;

// Translations are static bundled imports — no localStorage caching needed.
// Caching bundled modules in localStorage only causes stale-data bugs when
// keys are added to translation files.
export const loadTranslation = async (lang) => {
    const code = TRANSLATION_MODULES[lang] ? lang : DEFAULT_LANGUAGE;
    return TRANSLATION_MODULES[code] ?? DEFAULT_TRANSLATION;
};

// Text utilities
export function truncateText(value, maxLength = 180) {
    if (!value) return "";
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

// URL utilities
export function getSiteUrl() {
    // Next.js environment variables
    const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";

    if (configuredUrl) return configuredUrl;

    if (typeof window !== "undefined") {
        return window.location.origin;
    }

    return "https://ccai-stjean.org/";
}

export function getAbsoluteUrl(pathOrUrl, siteUrl) {
    try {
        return new URL(pathOrUrl, siteUrl).toString();
    } catch {
        return pathOrUrl;
    }
}

// Currency formatting
export function languageCurrency(amount, dollarFirst = true) {
    return dollarFirst ? `$${amount.toLocaleString()}` : `${amount.toLocaleString()} $`;
}

// Prayer embed utilities
export function getPrayerEmbedMode() {
    if (typeof window === "undefined") return "w";
    return window.matchMedia(`(max-width: 1200px)`).matches ? "m" : "w";
}

// Meta tag utilities
export function setMetaTag(attribute, key, content) {
    if (typeof document === "undefined") return;

    let element = document.head.querySelector(`meta[${attribute}="${key}"]`);
    if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
    }
    element.setAttribute("content", content);
}

export function setLinkTag(rel, href, extraAttributes = {}) {
    if (typeof document === "undefined") return;

    const selector = Object.entries(extraAttributes).reduce(
        (acc, [key, value]) => `${acc}[${key}="${value}"]`,
        `link[rel="${rel}"]`
    );

    let element = document.head.querySelector(selector);
    if (!element) {
        element = document.createElement("link");
        element.setAttribute("rel", rel);
        document.head.appendChild(element);
    }

    Object.entries(extraAttributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });

    element.setAttribute("href", href);
}

export function setStructuredData(id, payload) {
    if (typeof document === "undefined") return;

    let element = document.head.querySelector(`script[data-seo-id="${id}"]`);
    if (!element) {
        element = document.createElement("script");
        element.type = "application/ld+json";
        element.dataset.seoId = id;
        document.head.appendChild(element);
    }

    element.textContent = JSON.stringify(payload);
}
