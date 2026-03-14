import { DEFAULT_SITE_URL } from '@/constants/config.js';

const SITE_URL = DEFAULT_SITE_URL.endsWith('/') ? DEFAULT_SITE_URL.slice(0, -1) : DEFAULT_SITE_URL;

function buildSitemapXml() {
    const lastModified = new Date().toISOString();
    const urls = [
        { path: '/', changeFrequency: 'daily', priority: '1.0' },
        { path: '/login', changeFrequency: 'monthly', priority: '0.4' },
        { path: '/sitemap', changeFrequency: 'monthly', priority: '0.5' },
    ];

    const urlEntries = urls.map(({ path, changeFrequency, priority }) => `\
<url>\
<loc>${SITE_URL}${path}</loc>\
<lastmod>${lastModified}</lastmod>\
<changefreq>${changeFrequency}</changefreq>\
<priority>${priority}</priority>\
</url>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>\
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlEntries}</urlset>`;
}

export function GET() {
    return new Response(buildSitemapXml(), {
        headers: {
            'Content-Type': 'application/xml',
        },
    });
}
