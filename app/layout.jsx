import React from 'react';
import './page.scss';
import { DEFAULT_SITE_URL } from '@/constants/config.js';
import SentryInit from '@/components/SentryInit.jsx';

export const metadata = {
    metadataBase: new URL(DEFAULT_SITE_URL),
    title: 'Centre Zad Al-Imane - Support Our Mosque',
    description:
        'Support the Centre Zad Al-Imane masjid establishment campaign and help fund the foundation, walls, arches, and dome for a new community mosque.',
    icons: {
        icon: '/logo-ccai.png',
    },
};

export const viewport = {
    themeColor: '#090c18',
    width: 'device-width',
    initialScale: 1,
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <head>
                <meta charSet="UTF-8" />
                <link rel="icon" type="image/png" href="/logo-ccai.png" />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    rel="stylesheet"
                    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                />
                <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-XXXXXXXXXX');
            `,
                    }}
                />
            </head>
            <body suppressHydrationWarning>
                <SentryInit />
                {children}
            </body>
        </html>
    );
}
