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

    const sectionCardStyle = {
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    };

    const inputStyle = {
        width: '100%',
        padding: '12px',
        marginBottom: '16px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        fontSize: '14px',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
    };

    const labelStyle = {
        display: 'block',
        fontWeight: '600',
        marginBottom: '8px',
        color: '#333',
        fontSize: '14px',
    };

    const gridLayoutStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
    };

    return (
        <div className="donor-dashboard-container">
            <div className="donor-dashboard-content">
                {/* Header */}
                <div style={{ marginBottom: '32px' }}>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Edit Profile</h1>
                    <p style={{ color: '#666', marginTop: '8px' }}>Update your profile information below</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        backgroundColor: '#ffebee',
                        color: '#c62828',
                        padding: '16px',
                        borderRadius: '4px',
                        marginBottom: '24px',
                        borderLeft: '4px solid #c62828',
                    }}>
                        {error}
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div style={{
                        backgroundColor: '#e8f5e9',
                        color: '#2e7d32',
                        padding: '16px',
                        borderRadius: '4px',
                        marginBottom: '24px',
                        borderLeft: '4px solid #2e7d32',
                    }}>
                        Profile updated successfully! Redirecting...
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Basic Information */}
                    <div style={sectionCardStyle}>
                        <div className="dashboard-section-title">Basic Information</div>

                        <label style={labelStyle}>Full Name *</label>
                        <input
                            style={inputStyle}
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            placeholder="Enter your full name"
                            required
                        />

                        <label style={labelStyle}>Email *</label>
                        <input
                            style={inputStyle}
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    {/* Contact Information */}
                    <div style={sectionCardStyle}>
                        <div className="dashboard-section-title">Contact Information</div>

                        <label style={labelStyle}>Phone Number</label>
                        <input
                            style={inputStyle}
                            type="tel"
                            name="phoneNumber"
                            value={form.phoneNumber}
                            onChange={handleChange}
                            placeholder="+1-555-0123 (optional)"
                        />

                        <label style={labelStyle}>Address</label>
                        <input
                            style={inputStyle}
                            type="text"
                            name="address"
                            value={form.address}
                            onChange={handleChange}
                            placeholder="Street address (optional)"
                        />

                        <div style={gridLayoutStyle}>
                            <div>
                                <label style={labelStyle}>City</label>
                                <input
                                    style={inputStyle}
                                    type="text"
                                    name="city"
                                    value={form.city}
                                    onChange={handleChange}
                                    placeholder="City (optional)"
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>Country</label>
                                <input
                                    style={inputStyle}
                                    type="text"
                                    name="country"
                                    value={form.country}
                                    onChange={handleChange}
                                    placeholder="Country (optional)"
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={labelStyle}>Postal Code</label>
                                <input
                                    style={inputStyle}
                                    type="text"
                                    name="postalCode"
                                    value={form.postalCode}
                                    onChange={handleChange}
                                    placeholder="Postal code (optional)"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Additional Information */}
                    <div style={sectionCardStyle}>
                        <div className="dashboard-section-title">Additional Information</div>

                        <label style={labelStyle}>Date of Birth</label>
                        <input
                            style={inputStyle}
                            type="date"
                            name="dateOfBirth"
                            value={form.dateOfBirth}
                            onChange={handleChange}
                        />

                        <label style={labelStyle}>Tax Number</label>
                        <input
                            style={inputStyle}
                            type="text"
                            name="taxNumber"
                            value={form.taxNumber}
                            onChange={handleChange}
                            placeholder="Tax ID or SSN (optional)"
                        />

                        <label style={labelStyle}>Company Name</label>
                        <input
                            style={inputStyle}
                            type="text"
                            name="companyName"
                            value={form.companyName}
                            onChange={handleChange}
                            placeholder="Company name (optional)"
                        />
                    </div>

                    {/* Form Actions */}
                    <div style={sectionCardStyle}>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <Link href="/donor/profile">
                                <button
                                    type="button"
                                    className="dashboard-button"
                                    style={{ backgroundColor: '#f5f5f5', color: '#666' }}
                                >
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

                {/* Notice */}
                <div style={{
                    backgroundColor: '#f5f5f5',
                    padding: '16px',
                    borderRadius: '4px',
                    marginTop: '24px',
                    color: '#666',
                    fontSize: '13px',
                }}>
                    <strong>Note:</strong> Fields marked with * are required. Other fields are optional and can be left blank.
                </div>
            </div>
        </div>
    );
}
