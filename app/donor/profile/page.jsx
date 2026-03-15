'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMe } from '@/lib/donorApi';
//  import '@/app/styles/donor-dashboard.scss';

export default function ProfilePage() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                setLoading(true);
                const data = await getMe();
                if (!data.success) {
                    throw new Error(data.error?.message || 'Failed to load profile');
                }
                setProfile(data.data);
            } catch (err) {
                setError(err.message || 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, []);

    if (loading) {
        return (
            <div className="donor-dashboard-container">
                <div className="donor-dashboard-content">
                    <div className="loading-spinner">Loading profile...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="donor-dashboard-container">
                <div className="donor-dashboard-content">
                    <div style={{ color: '#d32f2f', padding: '16px', textAlign: 'center' }}>
                        Error: {error}
                    </div>
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

    const fieldStyle = {
        marginBottom: '16px',
    };

    const labelStyle = {
        display: 'block',
        fontWeight: '600',
        marginBottom: '8px',
        color: '#333',
        fontSize: '14px',
    };

    const valueStyle = {
        color: '#666',
        fontSize: '14px',
        padding: '12px',
        backgroundColor: '#f5f5f5',
        borderRadius: '4px',
        minHeight: '20px',
        display: 'flex',
        alignItems: 'center',
    };

    const emptyStyle = {
        color: '#999',
        fontStyle: 'italic',
    };

    return (
        <div className="donor-dashboard-container">
            <div className="donor-dashboard-content">
                {/* Header with edit button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>My Profile</h1>
                    <Link href="/donor/profile/edit">
                        <button className="dashboard-button" style={{ marginLeft: 'auto' }}>
                            Edit Profile
                        </button>
                    </Link>
                </div>

                {/* Basic Information */}
                <div style={sectionCardStyle}>
                    <div className="dashboard-section-title">Basic Information</div>
                    
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Full Name</label>
                        <div style={valueStyle}>{profile?.name || 'Not set'}</div>
                    </div>

                    <div style={fieldStyle}>
                        <label style={labelStyle}>Email</label>
                        <div style={valueStyle}>{profile?.email || 'Not set'}</div>
                    </div>
                </div>

                {/* Contact Information */}
                <div style={sectionCardStyle}>
                    <div className="dashboard-section-title">Contact Information</div>
                    
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Phone Number</label>
                        <div style={valueStyle}>
                            {profile?.phoneNumber ? profile.phoneNumber : <span style={emptyStyle}>Not set</span>}
                        </div>
                    </div>

                    <div style={fieldStyle}>
                        <label style={labelStyle}>Address</label>
                        <div style={valueStyle}>
                            {profile?.address ? profile.address : <span style={emptyStyle}>Not set</span>}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                        <div style={fieldStyle}>
                            <label style={labelStyle}>City</label>
                            <div style={valueStyle}>
                                {profile?.city ? profile.city : <span style={emptyStyle}>Not set</span>}
                            </div>
                        </div>

                        <div style={fieldStyle}>
                            <label style={labelStyle}>Country</label>
                            <div style={valueStyle}>
                                {profile?.country ? profile.country : <span style={emptyStyle}>Not set</span>}
                            </div>
                        </div>

                        <div style={fieldStyle}>
                            <label style={labelStyle}>Postal Code</label>
                            <div style={valueStyle}>
                                {profile?.postalCode ? profile.postalCode : <span style={emptyStyle}>Not set</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Information */}
                <div style={sectionCardStyle}>
                    <div className="dashboard-section-title">Additional Information</div>
                    
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Date of Birth</label>
                        <div style={valueStyle}>
                            {profile?.dateOfBirth 
                                ? new Date(profile.dateOfBirth).toLocaleDateString() 
                                : <span style={emptyStyle}>Not set</span>}
                        </div>
                    </div>

                    <div style={fieldStyle}>
                        <label style={labelStyle}>Tax Number</label>
                        <div style={valueStyle}>
                            {profile?.taxNumber ? profile.taxNumber : <span style={emptyStyle}>Not set</span>}
                        </div>
                    </div>

                    <div style={fieldStyle}>
                        <label style={labelStyle}>Company Name</label>
                        <div style={valueStyle}>
                            {profile?.companyName ? profile.companyName : <span style={emptyStyle}>Not set</span>}
                        </div>
                    </div>
                </div>

                {/* Account Status */}
                <div style={sectionCardStyle}>
                    <div className="dashboard-section-title">Account Status</div>
                    
                    <div style={fieldStyle}>
                        <label style={labelStyle}>Status</label>
                        <div style={{
                            ...valueStyle,
                            backgroundColor: profile?.isActive ? '#e8f5e9' : '#ffebee',
                            color: profile?.isActive ? '#2e7d32' : '#c62828',
                        }}>
                            {profile?.isActive ? 'Active' : 'Inactive'}
                        </div>
                    </div>

                    <div style={fieldStyle}>
                        <label style={labelStyle}>Member Since</label>
                        <div style={valueStyle}>
                            {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
                        </div>
                    </div>
                </div>

                {/* Back Navigation */}
                <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #eee' }}>
                    <Link href="/donor/dashboard">
                        <button className="dashboard-button" style={{ backgroundColor: '#f5f5f5', color: '#666' }}>
                            Back to Dashboard
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
