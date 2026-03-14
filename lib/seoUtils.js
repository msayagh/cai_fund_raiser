import {
    setMetaTag,
    setLinkTag,
    setStructuredData,
    AVAILABLE_LANGUAGE_CODES,
    getAbsoluteUrl,
} from '@/lib/translationUtils.js';
import { SITE_NAME } from '@/constants/config.js';

function buildLocalizedPageUrl(siteUrl, pagePath, language) {
    const cleanPath = pagePath && pagePath !== '' ? pagePath : '/';
    const separator = cleanPath.includes('?') ? '&' : '?';
    return getAbsoluteUrl(`${cleanPath}${separator}lang=${language}`, siteUrl);
}

function getOrganizationStructuredData({ t, siteUrl, socialImageUrl }) {
    return {
        "@context": "https://schema.org",
        "@type": "NonprofitOrganization",
        "@id": `${siteUrl}#organization`,
        name: t.centerName,
        url: siteUrl,
        logo: socialImageUrl,
        image: socialImageUrl,
        telephone: "+1-450-800-4266",
        sameAs: [
            "https://ccai-stjean.org/",
            "https://www.facebook.com/centre.alimane.sjsr/",
        ],
        address: {
            "@type": "PostalAddress",
            streetAddress: "287 12e Avenue",
            addressLocality: "Saint-Jean-sur-Richelieu",
            addressRegion: "QC",
            postalCode: "J2X 1E4",
            addressCountry: "CA",
        },
    };
}

function getWebsiteStructuredData({ siteUrl }) {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${siteUrl}#website`,
        name: SITE_NAME,
        url: siteUrl,
    };
}

function getPageStructuredData({
    pageType,
    pageTitle,
    pageUrl,
    pageDescription,
    language,
    siteUrl,
}) {
    const pageSchemaType = pageType === "sitemap" ? "CollectionPage" : "WebPage";

    return {
        "@context": "https://schema.org",
        "@type": pageSchemaType,
        "@id": `${pageUrl}#webpage`,
        name: pageTitle,
        url: pageUrl,
        description: pageDescription,
        inLanguage: language,
        isPartOf: {
            "@id": `${siteUrl}#website`,
        },
    };
}

function getCampaignStructuredData({
    t,
    pageTitle,
    pageUrl,
    pageDescription,
    language,
    siteUrl,
    socialImageUrl,
}) {
    return [
        {
            "@context": "https://schema.org",
            "@type": "DonateAction",
            name: t.donationDialogTitle || "Support the masjid",
            description: t.howToParticipateText || pageDescription,
            target: pageUrl,
            agent: {
                "@id": `${siteUrl}#organization`,
            },
            recipient: {
                "@id": `${siteUrl}#organization`,
            },
        },
        {
            "@context": "https://schema.org",
            "@type": "Event",
            name: pageTitle,
            description: pageDescription,
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            eventStatus: "https://schema.org/EventScheduled",
            image: [socialImageUrl],
            inLanguage: language,
            organizer: {
                "@id": `${siteUrl}#organization`,
            },
            location: {
                "@type": "Place",
                name: t.centerName,
                address: {
                    "@type": "PostalAddress",
                    streetAddress: "287 12e Avenue",
                    addressLocality: "Saint-Jean-sur-Richelieu",
                    addressRegion: "QC",
                    postalCode: "J2X 1E4",
                    addressCountry: "CA",
                },
            },
            url: pageUrl,
        },
    ];
}

export function setupSEOMetaTags({
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
    pagePath = '/',
    pageType = 'page',
}) {
    if (typeof document === "undefined") return;

    document.title = pageTitle;
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";

    setMetaTag("name", "description", pageDescription);
    setMetaTag("name", "language", locale);
    setMetaTag("name", "robots", "index, follow, max-image-preview:large");
    setMetaTag("property", "og:type", "website");
    setMetaTag("property", "og:site_name", SITE_NAME);
    setMetaTag("property", "og:title", pageTitle);
    setMetaTag("property", "og:description", pageDescription);
    setMetaTag("property", "og:url", pageUrl);
    setMetaTag("property", "og:image", socialImageUrl);
    setMetaTag("property", "og:image:alt", logoAlt);
    setMetaTag("property", "og:locale", locale);
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", pageTitle);
    setMetaTag("name", "twitter:description", pageDescription);
    setMetaTag("name", "twitter:image", socialImageUrl);
    setMetaTag("name", "twitter:image:alt", logoAlt);
    setLinkTag("canonical", pageUrl);

    AVAILABLE_LANGUAGE_CODES.forEach((code) => {
        setLinkTag("alternate", buildLocalizedPageUrl(siteUrl, pagePath, code), { hreflang: code });
    });
    setLinkTag("alternate", getAbsoluteUrl(pagePath, siteUrl), { hreflang: "x-default" });

    const structuredData = [
        getOrganizationStructuredData({ t, siteUrl, socialImageUrl }),
        getWebsiteStructuredData({ siteUrl }),
        getPageStructuredData({ pageType, pageTitle, pageUrl, pageDescription, language, siteUrl }),
    ];

    if (pageType === "campaign") {
        structuredData.push(...getCampaignStructuredData({
            t,
            pageTitle,
            pageUrl,
            pageDescription,
            language,
            siteUrl,
            socialImageUrl,
        }));
    }

    setStructuredData("page-structured-data", structuredData);
}
