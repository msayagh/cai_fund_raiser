'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe, updateMe } from '@/lib/donorApi';
// import '@/app/styles/donor-dashboard.scss';

export default function EditProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const [form, setForm] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        address: '',
        city: '',
        country: '',
        postalCode: '',
        dateOfBirth: '',
        taxNumber: '',
        companyName: '',
    });

    useEffect(() => {
        const loadProfile = async () => {
            try {
                setLoading(true);
                const data = await getMe();
                if (!data.success) {
                    throw new Error(data.error?.message || 'Failed to load profile');
                }
                const profile = data.data;
                setForm({
                    name: profile?.name || '',
                    email: profile?.email || '',
                    phoneNumber: profile?.phoneNumber || '',
                    address: profile?.address || '',
                    city: profile?.city || '',
                    country: profile?.country || '',
                    postalCode: profile?.postalCode || '',
                    dateOfBirth: profile?.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : '',
                    taxNumber: profile?.taxNumber || '',
                    companyName: profile?.companyName || '',
                });
            } catch (err) {
                setError(err.message || 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            // Convert empty strings to null for optional fields
            const updateData = {};
            Object.entries(form).forEach(([key, value]) => {
                updateData[key] = value === '' ? null : value;
            });

            const response = await updateMe(updateData);
            if (!response.success) {
                throw new Error(response.error?.message || 'Failed to update profile');
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/donor/profile');
            }, 1500);
        } catch (err) {
            setError(err.message || 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="donor-dashboard-container">
                <div className="donor-dashboard-content">
                    <div className="loading-spinner">Loading profile...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="donor-dashboard-container">
            <div className="donor-dashboard-content">
                <div className="dashboard-page-header">
                    <h1 className="dashboard-page-title">Edit Profile</h1>
                    <p className="dashboard-page-subtitle">Update your profile information below</p>
                </div>

                {error && (
                    <div className="dashboard-alert dashboard-alert--error">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="dashboard-alert dashboard-alert--success">
                        Profile updated successfully! Redirecting...
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="dashboard-card">
                        <div className="dashboard-section-title">Basic Information</div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">Full Name *</label>
                            <input
                                className="dashboard-input"
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                required
                            />
                        </div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">Email *</label>
                            <input
                                className="dashboard-input"
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                                required
                            />
                        </div>
                    </div>

                    <div className="dashboard-card">
                        <div className="dashboard-section-title">Contact Information</div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">Phone Number</label>
                            <input
                                className="dashboard-input"
                                type="tel"
                                name="phoneNumber"
                                value={form.phoneNumber}
                                onChange={handleChange}
                                placeholder="+1-555-0123 (optional)"
                            />
                        </div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">Address</label>
                            <input
                                className="dashboard-input"
                                type="text"
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder="Street address (optional)"
                            />
                        </div>

                        <div className="dashboard-form-grid dashboard-form-grid--two">
                            <div className="dashboard-field">
                                <label className="dashboard-label">City</label>
                                <input
                                    className="dashboard-input"
                                    type="text"
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    placeholder="City (optional)"
                                />
                            </div>

                            <div className="dashboard-field">
                                <label className="dashboard-label">Country</label>
                                <input
                                    className="dashboard-input"
                                    type="text"
                                    name="country"
                                    value={form.country}
                                    onChange={handleChange}
                                    placeholder="Country (optional)"
                                />
                            </div>

                            <div className="dashboard-field dashboard-field--span-2">
                                <label className="dashboard-label">Postal Code</label>
                                <input
                                    className="dashboard-input"
                                    type="text"
                                    name="postalCode"
                                    value={form.postalCode}
                                    onChange={handleChange}
                                    placeholder="Postal code (optional)"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="dashboard-card">
                        <div className="dashboard-section-title">Additional Information</div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">Date of Birth</label>
                            <input
                                className="dashboard-input dashboard-input--date"
                                type="date"
                                name="dateOfBirth"
                                value={form.dateOfBirth}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">Tax Number</label>
                            <input
                                className="dashboard-input"
                                type="text"
                                name="taxNumber"
                                value={form.taxNumber}
                                onChange={handleChange}
                                placeholder="Tax ID or SSN (optional)"
                            />
                        </div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">Company Name</label>
                            <input
                                className="dashboard-input"
                                type="text"
                                name="companyName"
                                value={form.companyName}
                                onChange={handleChange}
                                placeholder="Company name (optional)"
                            />
                        </div>
                    </div>

                    <div className="dashboard-card">
                        <div className="dashboard-actions">
                            <Link href="/donor/profile" className="dashboard-button-link">
                                <button type="button" className="dashboard-button dashboard-button--secondary">
                                    Cancel
                                </button>
                            </Link>
                            <button
                                type="submit"
                                className="dashboard-button"
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>

                <div className="dashboard-note">
                    <strong>Note:</strong> Fields marked with * are required. Other fields are optional and can be left blank.
                </div>
            </div>
        </div>
    );
}
