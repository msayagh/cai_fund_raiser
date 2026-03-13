import { DEFAULT_LANGUAGE } from "../constants/config.js";

// Translation loader
export const TRANSLATION_LOADERS = import.meta.glob("../translations/*.jsx");
export const TRANSLATION_MODULES = import.meta.glob("../translations/*.jsx", { eager: true });

export function getLanguageCodeFromPath(path) {
    const match = path.match(/\/([^/]+)\.jsx$/);
    return match ? match[1] : null;
}

export function getLanguageLabel(code) {
    const capitalize = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

    try {
        return capitalize(new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code.toUpperCase());
    } catch {
        return code.toUpperCase();
    }
}

export const AVAILABLE_LANGUAGE_CODES = Object.keys(TRANSLATION_LOADERS)
    .map(getLanguageCodeFromPath)
    .filter(Boolean)
    .sort((a, b) => {
        if (a === DEFAULT_LANGUAGE) return -1;
        if (b === DEFAULT_LANGUAGE) return 1;
        return a.localeCompare(b);
    });

export const LANGUAGE_OPTIONS = AVAILABLE_LANGUAGE_CODES.map((code) => {
    const flagMap = {
        en: "🇬🇧",
        fr: "🇨🇦",
        ar: "🇸🇦",
        ur: "🇵🇰",
        es: "🇪🇸",
    };
    return {
        code,
        label: getLanguageLabel(code),
        flag: flagMap[code] || "🌐",
    };
});

// Translation utilities
export function getInitialLanguage() {
    if (typeof window !== "undefined") {
        const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
        if (requestedLanguage && AVAILABLE_LANGUAGE_CODES.includes(requestedLanguage)) {
            return requestedLanguage;
        }
    }

    return AVAILABLE_LANGUAGE_CODES.includes("fr") ? "fr" : DEFAULT_LANGUAGE;
}

export const DEFAULT_TRANSLATION =
    TRANSLATION_MODULES[`../translations/${DEFAULT_LANGUAGE}.jsx`]?.default ??
    Object.values(TRANSLATION_MODULES)[0]?.default ??
    {};

export const INITIAL_LANGUAGE = getInitialLanguage();
export const INITIAL_TRANSLATION =
    TRANSLATION_MODULES[`../translations/${INITIAL_LANGUAGE}.jsx`]?.default ??
    DEFAULT_TRANSLATION;

export const loadTranslation = async (lang) => {
    const loader = TRANSLATION_LOADERS[`../translations/${lang}.jsx`];
    if (!loader) return DEFAULT_TRANSLATION;
    const module = await loader();
    return module?.default ?? module ?? DEFAULT_TRANSLATION;
};

// Text utilities
export function truncateText(value, maxLength = 180) {
    if (!value) return "";
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 1).trimEnd()}...`;
}

// URL utilities
export function getSiteUrl() {
    const configuredUrl =
        typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_SITE_URL
            ? String(import.meta.env.VITE_SITE_URL).trim()
            : "";

    if (configuredUrl) return configuredUrl;

    if (typeof window !== "undefined") {
        return `${window.location.origin}${window.location.pathname}`;
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
