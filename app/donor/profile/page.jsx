'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMe } from '@/lib/donorApi';
import { useTranslation } from '@/hooks/index.js';
import { DEFAULT_TRANSLATION } from '@/lib/translationUtils.js';
//  import '@/app/styles/donor-dashboard.scss';

export default function ProfilePage() {
    const { t } = useTranslation();
    const donorText = { ...(DEFAULT_TRANSLATION.donor ?? {}), ...(t.donor ?? {}) };
    const failedLoadProfile = donorText.failedLoadProfile;
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                setLoading(true);
                const data = await getMe();
                if (!data.success) {
                    throw new Error(data.error?.message || failedLoadProfile);
                }
                setProfile(data.data);
            } catch (err) {
                setError(err.message || failedLoadProfile);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [failedLoadProfile]);

    if (loading) {
        return (
            <div className="donor-dashboard-container">
                <div className="donor-dashboard-content">
                    <div className="loading-spinner">{donorText.loadingProfile}</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="donor-dashboard-container">
                <div className="donor-dashboard-content">
                    <div className="dashboard-alert dashboard-alert--error">
                        {error}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="donor-dashboard-container">
            <div className="donor-dashboard-content">
                <div className="dashboard-page-header dashboard-page-header--split">
                    <h1 className="dashboard-page-title">{donorText.myProfile}</h1>
                    <Link href="/donor/profile/edit" className="dashboard-button-link">
                        <button className="dashboard-button">
                            {donorText.editProfilePageTitle}
                        </button>
                    </Link>
                </div>

                <div className="dashboard-card">
                    <div className="dashboard-section-title">{donorText.basicInformation}</div>
                    
                    <div className="dashboard-field">
                        <label className="dashboard-label">{(DEFAULT_TRANSLATION.admin?.fullName) || 'Full Name'}</label>
                        <div className="dashboard-value">{profile?.name || donorText.notSet}</div>
                    </div>

                    <div className="dashboard-field">
                        <label className="dashboard-label">{donorText.yourEmail}</label>
                        <div className="dashboard-value">{profile?.email || donorText.notSet}</div>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="dashboard-section-title">{donorText.contactInformation}</div>
                    
                    <div className="dashboard-field">
                        <label className="dashboard-label">{(DEFAULT_TRANSLATION.admin?.phoneNumber) || 'Phone Number'}</label>
                        <div className="dashboard-value">
                            {profile?.phoneNumber ? profile.phoneNumber : <span className="dashboard-value--empty">{donorText.notSet}</span>}
                        </div>
                    </div>

                    <div className="dashboard-field">
                        <label className="dashboard-label">{(DEFAULT_TRANSLATION.address) || 'Address'}</label>
                        <div className="dashboard-value">
                            {profile?.address ? profile.address : <span className="dashboard-value--empty">{donorText.notSet}</span>}
                        </div>
                    </div>

                    <div className="dashboard-form-grid dashboard-form-grid--three">
                        <div className="dashboard-field">
                            <label className="dashboard-label">{donorText.city}</label>
                            <div className="dashboard-value">
                                {profile?.city ? profile.city : <span className="dashboard-value--empty">{donorText.notSet}</span>}
                            </div>
                        </div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">{donorText.country}</label>
                            <div className="dashboard-value">
                                {profile?.country ? profile.country : <span className="dashboard-value--empty">{donorText.notSet}</span>}
                            </div>
                        </div>

                        <div className="dashboard-field">
                            <label className="dashboard-label">{donorText.postalCode}</label>
                            <div className="dashboard-value">
                                {profile?.postalCode ? profile.postalCode : <span className="dashboard-value--empty">{donorText.notSet}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="dashboard-section-title">{donorText.additionalInformation}</div>
                    
                    <div className="dashboard-field">
                        <label className="dashboard-label">{donorText.dateOfBirth}</label>
                        <div className="dashboard-value">
                            {profile?.dateOfBirth 
                                ? new Date(profile.dateOfBirth).toLocaleDateString() 
                                : <span className="dashboard-value--empty">{donorText.notSet}</span>}
                        </div>
                    </div>

                    <div className="dashboard-field">
                        <label className="dashboard-label">{donorText.taxNumber}</label>
                        <div className="dashboard-value">
                            {profile?.taxNumber ? profile.taxNumber : <span className="dashboard-value--empty">{donorText.notSet}</span>}
                        </div>
                    </div>

                    <div className="dashboard-field">
                        <label className="dashboard-label">{donorText.companyName}</label>
                        <div className="dashboard-value">
                            {profile?.companyName ? profile.companyName : <span className="dashboard-value--empty">{donorText.notSet}</span>}
                        </div>
                    </div>
                </div>

                <div className="dashboard-card">
                    <div className="dashboard-section-title">{donorText.accountStatusTitle}</div>
                    
                    <div className="dashboard-field">
                        <label className="dashboard-label">{(DEFAULT_TRANSLATION.admin?.status) || 'Status'}</label>
                        <div className={`dashboard-value ${profile?.isActive ? 'dashboard-status-value--active' : 'dashboard-status-value--inactive'}`}>
                            {profile?.isActive ? (DEFAULT_TRANSLATION.admin?.activeStatus || 'Active') : (DEFAULT_TRANSLATION.admin?.inactiveStatus || 'Inactive')}
                        </div>
                    </div>

                    <div className="dashboard-field">
                        <label className="dashboard-label">{donorText.memberSince}</label>
                        <div className="dashboard-value">
                            {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : donorText.unknown}
                        </div>
                    </div>
                </div>

                <div className="dashboard-divider-top">
                    <Link href="/donor/dashboard" className="dashboard-button-link">
                        <button className="dashboard-button dashboard-button--secondary">
                            {donorText.backToDashboard}
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
