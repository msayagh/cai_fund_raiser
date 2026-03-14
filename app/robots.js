import { DEFAULT_SITE_URL } from '@/constants/config.js';

const SITE_URL = DEFAULT_SITE_URL.endsWith('/') ? DEFAULT_SITE_URL.slice(0, -1) : DEFAULT_SITE_URL;

export default function robots() {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
        },
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
