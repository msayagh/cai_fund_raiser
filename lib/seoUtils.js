import {
    setMetaTag,
    setLinkTag,
    setStructuredData,
    truncateText,
    AVAILABLE_LANGUAGE_CODES,
    getAbsoluteUrl,
} from '@/lib/translationUtils.js';
import { SITE_NAME, DEFAULT_SOCIAL_IMAGE } from '@/constants/config.js';

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
}) {
    if (typeof document === "undefined") return;

    document.title = pageTitle;
    document.documentElement.lang = language;
    document.documentElement.dir = isRTL ? "rtl" : "ltr";

    setMetaTag("name", "description", pageDescription);
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
        setLinkTag("alternate", getAbsoluteUrl(`/?lang=${code}`, siteUrl), { hreflang: code });
    });
    setLinkTag("alternate", siteUrl, { hreflang: "x-default" });

    setStructuredData("campaign-page", [
        {
            "@context": "https://schema.org",
            "@type": "NonprofitOrganization",
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
        },
        {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: pageTitle,
            url: pageUrl,
            description: pageDescription,
            inLanguage: language,
            isPartOf: {
                "@type": "WebSite",
                name: SITE_NAME,
                url: siteUrl,
            },
            about: {
                "@type": "Thing",
                name: "Masjid establishment campaign",
            },
        },
    ]);
}
