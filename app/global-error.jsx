'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/hooks/index.js';
import { DEFAULT_TRANSLATION } from '@/lib/translationUtils.js';
import { captureException } from '@/lib/monitoring.js';
import './global-error.scss';

export default function GlobalError({ error, reset }) {
    const { t } = useTranslation();
    const globalErrorText = {
        title: t?.globalErrorTitle || DEFAULT_TRANSLATION.globalErrorTitle || 'Something went wrong',
        description: t?.globalErrorDescription || DEFAULT_TRANSLATION.globalErrorDescription || 'We logged the error and you can try reloading this screen.',
        retry: t?.retryLabel || DEFAULT_TRANSLATION.retryLabel || 'Retry',
    };

    useEffect(() => {
        captureException(error, { source: 'app/global-error', level: 'error', fatal: true });
    }, [error]);

    return (
        <html>
            <body>
                <div className="global-error-page">
                    <div className="global-error-shell">
                        <div className="global-error-card">
                        <h1 className="global-error-title">{globalErrorText.title}</h1>
                        <p className="global-error-description">
                            {globalErrorText.description}
                        </p>
                        <button type="button" onClick={() => reset()} className="global-error-button">
                            {globalErrorText.retry}
                        </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
