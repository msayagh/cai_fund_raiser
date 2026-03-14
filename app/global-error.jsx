'use client';

import { useEffect } from 'react';
import { captureException } from '@/lib/monitoring.js';

export default function GlobalError({ error, reset }) {
    useEffect(() => {
        captureException(error, { source: 'app/global-error' });
    }, [error]);

    return (
        <html>
            <body>
                <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', background: '#090c18', color: '#fff' }}>
                    <div style={{ maxWidth: '480px', textAlign: 'center' }}>
                        <h1 style={{ marginBottom: '12px' }}>Something went wrong</h1>
                        <p style={{ marginBottom: '18px', color: 'rgba(255,255,255,0.75)' }}>
                            We logged the error and you can try reloading this screen.
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
                            Retry
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
