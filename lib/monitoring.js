const SENTRY_CDN_URL = 'https://browser.sentry-cdn.com/8.55.0/bundle.tracing.replay.min.js';

function hasWindow() {
    return typeof window !== 'undefined';
}

function getSentryBrowserClient() {
    if (!hasWindow()) return null;
    return window.Sentry ?? null;
}

export function getClientSentryConfig() {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
    if (!dsn) return null;

    return {
        dsn,
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV || 'development',
        tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
        replaysSessionSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? 0),
        replaysOnErrorSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? 1),
    };
}

export function shouldEnableSentry() {
    return Boolean(getClientSentryConfig());
}

export function getSentryScriptUrl() {
    return SENTRY_CDN_URL;
}

export function initBrowserMonitoring() {
    const config = getClientSentryConfig();
    const Sentry = getSentryBrowserClient();

    if (!config || !Sentry || window.__sentryInitialized) return;

    Sentry.init({
        ...config,
        integrations: [
            Sentry.browserTracingIntegration?.(),
            Sentry.replayIntegration?.(),
        ].filter(Boolean),
    });

    window.__sentryInitialized = true;
    captureMessage('Browser monitoring initialized', { level: 'info' });
}

export function captureMessage(message, context = {}) {
    const payload = { ...context, message };

    if (hasWindow()) {
        const Sentry = getSentryBrowserClient();
        if (Sentry?.captureMessage) {
            Sentry.captureMessage(message, context.level || 'info');
            return;
        }
    }

    if (payload.level === 'error') {
        console.error('[monitoring]', payload);
        return;
    }

    console.log('[monitoring]', payload);
}

export function captureException(error, context = {}) {
    if (hasWindow()) {
        const Sentry = getSentryBrowserClient();
        if (Sentry?.captureException) {
            Sentry.captureException(error, { extra: context });
            return;
        }
    }

    console.error('[monitoring]', {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        ...context,
    });
}
