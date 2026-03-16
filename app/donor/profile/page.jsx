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
                    <div className="dashboard-alert dashboard-alert--error">
                        Error: {error}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="donor-dashboard-container">
            <div className="donor-dashboard-content">
                <div className="dashboard-page-header dashboard-page-header--split">
                    <h1 className="dashboard-page-title">My Profile</h1>
                    <Link href="/donor/profile/edit" className="dashboard-button-link">
                        <button className="dashboard-button">
                            Edit Profile
                        </button>
                    </Link>
                </div>

                <div className="dashboard-card">
                    <div className="dashboard-section-title">Basic Information</div>
                    
                    <div className="dashboard-field">
                        <label className="dashboard-label">Full Name</label>
                        <div className="dashboard-value">{profile?.name || 'Not set'}</div>
                    </div>

                    <div className="dashboard-field">
                        <label className="dashboard-label">Email</label>
                        <div className="dashboard-value">{profile?.email || 'Not set'}</div>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="dashboard-section-title">Contact Information</div>
                    
                    <div className="dashboard-field">
                        <label className="dashboard-label">Phone Number</label>
                        <div className="dashboard-value">
                            {profile?.phoneNumber ? profile.phoneNumber : <span className="dashboard-value--empty">Not set</span>}
                        </div>
                    </div>

                    <div className="dashboard-field">
                        <label className="dashboard-label">Address</label>
                        <div className="dashboard-value">
                            {profile?.address ? profile.address : <span className="dashboard-value--empty">Not set</span>}
                        </div>
                    </div>

                    <div className="dashboard-form-grid dashboard-form-grid--three">
                        <div className="dashboard-field">
                            <label className="dashboard-label">City</label>
                            <div className="dashboard-value">
                                {profile?.city ? profile.city : <span className="dashboard-value--empty">Not set</span>}
                            </div>
                        </div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">Country</label>
                            <div className="dashboard-value">
                                {profile?.country ? profile.country : <span className="dashboard-value--empty">Not set</span>}
                            </div>
                        </div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">Postal Code</label>
                            <div className="dashboard-value">
                                {profile?.postalCode ? profile.postalCode : <span className="dashboard-value--empty">Not set</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="dashboard-section-title">Additional Information</div>
                    
                    <div className="dashboard-field">
                        <label className="dashboard-label">Date of Birth</label>
                        <div className="dashboard-value">
                            {profile?.dateOfBirth 
                                ? new Date(profile.dateOfBirth).toLocaleDateString() 
                                : <span className="dashboard-value--empty">Not set</span>}
                        </div>
                    </div>

                    <div className="dashboard-field">
                        <label className="dashboard-label">Tax Number</label>
                        <div className="dashboard-value">
                            {profile?.taxNumber ? profile.taxNumber : <span className="dashboard-value--empty">Not set</span>}
                        </div>
                    </div>

                    <div className="dashboard-field">
                        <label className="dashboard-label">Company Name</label>
                        <div className="dashboard-value">
                            {profile?.companyName ? profile.companyName : <span className="dashboard-value--empty">Not set</span>}
                        </div>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="dashboard-section-title">Account Status</div>
                    
                    <div className="dashboard-field">
                        <label className="dashboard-label">Status</label>
                        <div className={`dashboard-value ${profile?.isActive ? 'dashboard-status-value--active' : 'dashboard-status-value--inactive'}`}>
                            {profile?.isActive ? 'Active' : 'Inactive'}
                        </div>
                    </div>

                    <div className="dashboard-field">
                        <label className="dashboard-label">Member Since</label>
                        <div className="dashboard-value">
                            {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
                        </div>
                    </div>
                </div>

                <div className="dashboard-divider-top">
                    <Link href="/donor/dashboard" className="dashboard-button-link">
                        <button className="dashboard-button dashboard-button--secondary">
                            Back to Dashboard
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
