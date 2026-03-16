'use client';

import { useEffect } from 'react';
import { DEFAULT_TRANSLATION } from '@/lib/translationUtils.js';
import { captureException } from '@/lib/monitoring.js';

export default function GlobalError({ error, reset }) {
    useEffect(() => {
        captureException(error, { source: 'app/global-error', level: 'error', fatal: true });
    }, [error]);

    return (
        <html>
            <body>
                <div style={{ minHeight: '100vh', background: '#090c18', color: '#fff' }}>
                    <div style={{ width: '100%', maxWidth: 'var(--page-max-width)', margin: '0 auto', minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
                        <div style={{ width: '100%', maxWidth: '480px', textAlign: 'center' }}>
                        <h1 style={{ marginBottom: '12px' }}>{DEFAULT_TRANSLATION.globalErrorTitle || 'Something went wrong'}</h1>
                        <p style={{ marginBottom: '18px', color: 'rgba(255,255,255,0.75)' }}>
                            {DEFAULT_TRANSLATION.globalErrorDescription || 'We logged the error and you can try reloading this screen.'}
                        </p>
                        <button
                            type="button"
                            onClick={() => reset()}
                            style={{
                                padding: '12px 18px',
                                borderRadius: '999px',
                                border: '1px solid rgba(212,169,110,0.45)',
                                background: 'rgba(212,169,110,0.16)',
                                color: '#fff',
                                cursor: 'pointer',
                            }}
                        >
                            {DEFAULT_TRANSLATION.retryLabel || 'Retry'}
                        </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
