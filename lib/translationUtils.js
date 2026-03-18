import { DEFAULT_LANGUAGE } from "../constants/config.js";
import en from "../translations/en.js";
import fr from "../translations/fr.js";
import ar from "../translations/ar.js";
import ur from "../translations/ur.js";
import es from "../translations/es.js";
import tr from "../translations/tr.js";
import zh from "../translations/zh.js";
import it from "../translations/it.js";

// Translation modules - explicit imports for Next.js
export const TRANSLATION_MODULES = {
    en,
    fr,
    ar,
    ur,
    es,
    it,
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
        it: "🇮🇹",
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
    return DEFAULT_LANGUAGE;
}

export const DEFAULT_TRANSLATION = TRANSLATION_MODULES[DEFAULT_LANGUAGE] ?? Object.values(TRANSLATION_MODULES)[0] ?? {};

export const INITIAL_LANGUAGE = getInitialLanguage();
function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeTranslations(base, override) {
    if (!isPlainObject(base)) {
        return override ?? base;
    }

    const merged = { ...base };

    Object.entries(override ?? {}).forEach(([key, value]) => {
        if (isPlainObject(value) && isPlainObject(base[key])) {
            merged[key] = mergeTranslations(base[key], value);
            return;
        }

        merged[key] = value;
    });

    return merged;
}

export const INITIAL_TRANSLATION = mergeTranslations(
    DEFAULT_TRANSLATION,
    TRANSLATION_MODULES[INITIAL_LANGUAGE] ?? {}
);

// Configuration for cache clearing behavior (kept for backward compatibility but no longer used)
export const TRANSLATION_CONFIG = {
    clearCacheOnLanguageSwitch: false,
};

export const clearTranslationCache = () => {
    // Cache is no longer needed since modules are statically imported
};

export const loadTranslation = (lang) => {
    const code = TRANSLATION_MODULES[lang] ? lang : DEFAULT_LANGUAGE;
    return mergeTranslations(DEFAULT_TRANSLATION, TRANSLATION_MODULES[code] ?? {});
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
    if (dollarFirst) {
        const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
            // This ensures the comma is always used as the separator
          }).format(amount);
        return formatted;
    }
    const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        // This ensures the comma is always used as the separator
      }).format(amount);
    return formatted;
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
