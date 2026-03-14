'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { getSentryScriptUrl, initBrowserMonitoring, shouldEnableSentry } from '@/lib/monitoring.js';

export default function SentryInit() {
    const enabled = shouldEnableSentry();

    useEffect(() => {
        if (!enabled) return;

        const handleUnhandledRejection = (event) => {
            if (window.Sentry?.captureException && event.reason) {
                window.Sentry.captureException(event.reason);
            }
        };

        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        return () => {
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, [enabled]);

    if (!enabled) return null;

    return (
        <Script
            id="sentry-browser-bundle"
            src={getSentryScriptUrl()}
            strategy="afterInteractive"
            onLoad={initBrowserMonitoring}
        />
    );
}
