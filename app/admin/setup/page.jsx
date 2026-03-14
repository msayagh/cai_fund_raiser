'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bootstrapAdmin, getAdminSetupStatus } from '@/lib/auth.js';

export default function AdminSetupPage() {
    const router = useRouter();
    const [status, setStatus] = useState({
        loading: true,
        checked: false,
        adminExists: false,
        adminCount: 0,
        error: '',
    });
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        let active = true;

        async function loadStatus() {
            try {
                const data = await getAdminSetupStatus();
                if (!active) return;
                setStatus({
                    loading: false,
                    checked: true,
                    adminExists: Boolean(data.adminExists),
                    adminCount: Number(data.adminCount || 0),
                    error: '',
                });
            } catch (error) {
                if (!active) return;
                setStatus({
                    loading: false,
                    checked: false,
                    adminExists: false,
                    adminCount: 0,
                    error: error?.message || 'Unable to reach the backend.',
                });
            }
        }

        loadStatus();
        return () => {
            active = false;
        };
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();
        setSubmitError('');
        setSubmitSuccess('');

        if (form.password !== form.confirmPassword) {
            setSubmitError('Passwords do not match.');
            return;
        }

        setSubmitting(true);
        try {
            const admin = await bootstrapAdmin({
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                password: form.password,
            });
            setSubmitSuccess(`Initial admin created for ${admin.email}.`);
            router.replace('/admin/dashboard');
        } catch (error) {
            setSubmitError(error?.message || 'Failed to create the initial admin.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main style={{ minHeight: '100vh', background: '#090c18', color: '#f0e8d8' }}>
            <div style={{ width: '100%', maxWidth: 'var(--page-max-width)', margin: '0 auto', minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px' }}>
                <section style={{ width: '100%', maxWidth: '540px', background: '#131628', border: '1px solid #2e3250', borderRadius: '24px', padding: '32px' }}>
                <div style={{ fontFamily: "'Cinzel', serif", color: '#D4A96E', fontSize: '28px', marginBottom: '12px' }}>Admin Setup</div>
                <p style={{ color: '#c0c0d8', lineHeight: 1.6, marginBottom: '24px' }}>
                    Bootstrap the first administrator from the backend API when no admin account exists yet.
                </p>

                {status.loading ? <p>Checking backend status...</p> : null}
                {status.error ? <div style={{ color: '#ffb4b4', marginBottom: '16px' }}>{status.error}</div> : null}
                {submitError ? <div style={{ color: '#ffb4b4', marginBottom: '16px' }}>{submitError}</div> : null}
                {submitSuccess ? <div style={{ color: '#a6f0c1', marginBottom: '16px' }}>{submitSuccess}</div> : null}

                {!status.loading && !status.error && status.adminExists ? (
                    <div style={{ marginBottom: '20px', color: '#c0c0d8' }}>
                        Admin setup is closed. Existing admin accounts: <strong style={{ color: '#D4A96E' }}>{status.adminCount}</strong>
                    </div>
                ) : null}

                {!status.loading && !status.error && !status.adminExists ? (
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
                        <input
                            style={inputStyle}
                            placeholder="Full name"
                            value={form.name}
                            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                            required
                        />
                        <input
                            style={inputStyle}
                            type="email"
                            placeholder="Email"
                            value={form.email}
                            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                            required
                        />
                        <input
                            style={inputStyle}
                            type="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                            required
                        />
                        <input
                            style={inputStyle}
                            type="password"
                            placeholder="Confirm password"
                            value={form.confirmPassword}
                            onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                            required
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            style={{
                                background: submitting ? '#2e3250' : '#D4A96E',
                                color: submitting ? '#a8acc6' : '#000',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '12px 16px',
                                fontWeight: 700,
                                cursor: submitting ? 'not-allowed' : 'pointer',
                            }}
                        >
                            {submitting ? 'Creating...' : 'Create initial admin'}
                        </button>
                    </form>
                ) : null}

                <div style={{ marginTop: '20px' }}>
                    <Link href="/login" style={{ color: '#D4A96E' }}>Back to login</Link>
                </div>
                </section>
            </div>
        </main>
    );
}

const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid #2e3250',
    background: '#0e1020',
    color: '#f0e8d8',
};
