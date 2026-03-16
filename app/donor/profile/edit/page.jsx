'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe, updateMe } from '@/lib/donorApi';
import { useTranslation } from '@/hooks/index.js';
import { DEFAULT_TRANSLATION } from '@/lib/translationUtils.js';
// import '@/app/styles/donor-dashboard.scss';

export default function EditProfilePage() {
    const router = useRouter();
    const { t } = useTranslation();
    const donorText = { ...(DEFAULT_TRANSLATION.donor ?? {}), ...(t.donor ?? {}) };
    const failedLoadProfile = donorText.failedLoadProfile;
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
                    throw new Error(data.error?.message || failedLoadProfile);
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
                setError(err.message || failedLoadProfile);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [failedLoadProfile]);

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
                throw new Error(response.error?.message || donorText.saveChanges);
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/donor/profile');
            }, 1500);
        } catch (err) {
            setError(err.message || donorText.saveChanges);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="donor-dashboard-container">
                <div className="donor-dashboard-content">
                    <div className="loading-spinner">{donorText.loadingProfile}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="donor-dashboard-container">
            <div className="donor-dashboard-content">
                <div className="dashboard-page-header">
                    <h1 className="dashboard-page-title">{donorText.editProfilePageTitle}</h1>
                    <p className="dashboard-page-subtitle">{donorText.editProfileSubtitle}</p>
                </div>

                {error && (
                    <div className="dashboard-alert dashboard-alert--error">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="dashboard-alert dashboard-alert--success">
                        {donorText.profileUpdatedRedirecting}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="dashboard-card">
                        <div className="dashboard-section-title">{donorText.basicInformation}</div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">{(DEFAULT_TRANSLATION.admin?.fullName) || 'Full Name'} *</label>
                            <input
                                className="dashboard-input"
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder={donorText.enterFullName}
                                required
                            />
                        </div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">{donorText.yourEmail} *</label>
                            <input
                                className="dashboard-input"
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder={donorText.enterEmail}
                                required
                            />
                        </div>
                    </div>

                    <div className="dashboard-card">
                        <div className="dashboard-section-title">{donorText.contactInformation}</div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">{(DEFAULT_TRANSLATION.admin?.phoneNumber) || 'Phone Number'}</label>
                            <input
                                className="dashboard-input"
                                type="tel"
                                name="phoneNumber"
                                value={form.phoneNumber}
                                onChange={handleChange}
                                placeholder={donorText.phonePlaceholder}
                            />
                        </div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">{(DEFAULT_TRANSLATION.address) || 'Address'}</label>
                            <input
                                className="dashboard-input"
                                type="text"
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder={donorText.addressPlaceholder}
                            />
                        </div>

                        <div className="dashboard-form-grid dashboard-form-grid--two">
                            <div className="dashboard-field">
                                <label className="dashboard-label">{donorText.city}</label>
                                <input
                                    className="dashboard-input"
                                    type="text"
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    placeholder={donorText.cityPlaceholder}
                                />
                            </div>

                            <div className="dashboard-field">
                                <label className="dashboard-label">{donorText.country}</label>
                                <input
                                    className="dashboard-input"
                                    type="text"
                                    name="country"
                                    value={form.country}
                                    onChange={handleChange}
                                    placeholder={donorText.countryPlaceholder}
                                />
                            </div>

                            <div className="dashboard-field dashboard-field--span-2">
                                <label className="dashboard-label">{donorText.postalCode}</label>
                                <input
                                    className="dashboard-input"
                                    type="text"
                                    name="postalCode"
                                    value={form.postalCode}
                                    onChange={handleChange}
                                    placeholder={donorText.postalPlaceholder}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="dashboard-card">
                        <div className="dashboard-section-title">{donorText.additionalInformation}</div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">{donorText.dateOfBirth}</label>
                            <input
                                className="dashboard-input dashboard-input--date"
                                type="date"
                                name="dateOfBirth"
                                value={form.dateOfBirth}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">{donorText.taxNumber}</label>
                            <input
                                className="dashboard-input"
                                type="text"
                                name="taxNumber"
                                value={form.taxNumber}
                                onChange={handleChange}
                                placeholder={donorText.taxPlaceholder}
                            />
                        </div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">{donorText.companyName}</label>
                            <input
                                className="dashboard-input"
                                type="text"
                                name="companyName"
                                value={form.companyName}
                                onChange={handleChange}
                                placeholder={donorText.companyPlaceholder}
                            />
                        </div>
                    </div>

                    <div className="dashboard-card">
                        <div className="dashboard-actions">
                            <Link href="/donor/profile" className="dashboard-button-link">
                                <button type="button" className="dashboard-button dashboard-button--secondary">
                                    {donorText.cancel}
                                </button>
                            </Link>
                            <button
                                type="submit"
                                className="dashboard-button"
                                disabled={saving}
                            >
                                {saving ? donorText.saveProfile : donorText.saveChanges}
                            </button>
                        </div>
                    </div>
                </form>

                <div className="dashboard-note">
                    <strong>{donorText.note}:</strong> {donorText.requiredFieldsNote}
                </div>
            </div>
        </div>
    );
}
