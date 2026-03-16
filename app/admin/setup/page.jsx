'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bootstrapAdmin, getAdminSetupStatus } from '@/lib/auth.js';
import './page.scss';

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
        <main className="admin-setup-page">
            <div className="admin-setup-shell">
                <section className="admin-setup-card">
                <div className="admin-setup-title">Admin Setup</div>
                <p className="admin-setup-description">
                    Bootstrap the first administrator from the backend API when no admin account exists yet.
                </p>

                {status.loading ? <p className="admin-setup-status">Checking backend status...</p> : null}
                {status.error ? <div className="admin-setup-alert admin-setup-alert--error">{status.error}</div> : null}
                {submitError ? <div className="admin-setup-alert admin-setup-alert--error">{submitError}</div> : null}
                {submitSuccess ? <div className="admin-setup-alert admin-setup-alert--success">{submitSuccess}</div> : null}

                {!status.loading && !status.error && status.adminExists ? (
                    <div className="admin-setup-status">
                        Admin setup is closed. Existing admin accounts: <strong className="admin-setup-emphasis">{status.adminCount}</strong>
                    </div>
                ) : null}

                {!status.loading && !status.error && !status.adminExists ? (
                    <form onSubmit={handleSubmit} className="admin-setup-form">
                        <input
                            className="admin-setup-input"
                            placeholder="Full name"
                            value={form.name}
                            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                            required
                        />
                        <input
                            className="admin-setup-input"
                            type="email"
                            placeholder="Email"
                            value={form.email}
                            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                            required
                        />
                        <input
                            className="admin-setup-input"
                            type="password"
                            placeholder="Password"
                            value={form.password}
                            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                            required
                        />
                        <input
                            className="admin-setup-input"
                            type="password"
                            placeholder="Confirm password"
                            value={form.confirmPassword}
                            onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                            required
                        />
                        <button
                            type="submit"
                            disabled={submitting}
                            className={`admin-setup-button${submitting ? ' is-submitting' : ''}`}
                        >
                            {submitting ? 'Creating...' : 'Create initial admin'}
                        </button>
                    </form>
                ) : null}

                <div className="admin-setup-footer">
                    <Link href="/login" className="admin-setup-link">Back to login</Link>
                </div>
                </section>
            </div>
        </main>
    );
}
