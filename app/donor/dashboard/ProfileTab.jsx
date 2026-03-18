import { useState } from 'react';
import PillarSelector from '../../../components/PillarSelector';
import { useTranslation } from '@/hooks/index.js';
import { DEFAULT_TRANSLATION } from '@/lib/translationUtils.js';

export default function ProfileTab({ profileForm, setProfileForm, passwordForm, setPasswordForm, engagementForm, setEngagementForm, profile, handleProfileUpdate, handlePasswordUpdate, handleEngagementUpdate }) {
    const { t } = useTranslation();
    const donorText = { ...(DEFAULT_TRANSLATION.donor ?? {}), ...(t.donor ?? {}) };
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    return (
        <>
            <div className="dashboard-card">
                <div className="dashboard-section-title">{donorText.profile}</div>
                <form className="dashboard-form" onSubmit={handleProfileUpdate}>
                    <input
                        className="dashboard-input"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder={donorText.fullNamePlaceholder}
                    />
                    <input
                        className="dashboard-input"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder={donorText.emailPlaceholder}
                    />
                    <button className="dashboard-button" type="submit">{donorText.saveProfile}</button>
                </form>
            </div>

            <div className="dashboard-card">
                <div className="dashboard-section-title">{donorText.password}</div>
                <form className="dashboard-form" onSubmit={handlePasswordUpdate}>
                    <div style={{ position: 'relative' }}>
                        <input
                            className="dashboard-input"
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                            placeholder={donorText.curPwd}
                            style={{ paddingRight: '42px' }}
                        />
                        <button type="button" onClick={() => setShowCurrentPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}>
                            {showCurrentPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            )}
                        </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input
                            className="dashboard-input"
                            type={showNewPassword ? 'text' : 'password'}
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                            placeholder={donorText.newPwd}
                            style={{ paddingRight: '42px' }}
                        />
                        <button type="button" onClick={() => setShowNewPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label={showNewPassword ? 'Hide password' : 'Show password'}>
                            {showNewPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            )}
                        </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input
                            className="dashboard-input"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                            placeholder={donorText.confPwd}
                            style={{ paddingRight: '42px' }}
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                            {showConfirmPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            )}
                        </button>
                    </div>
                    <button className="dashboard-button" type="submit">{donorText.updatePwd}</button>
                </form>
            </div>

            <div className="dashboard-card">
                <form onSubmit={handleEngagementUpdate}>
                    <PillarSelector
                        pillars={engagementForm.pillars || {}}
                        onPillarsChange={(pillars) => setEngagementForm((prev) => ({ ...prev, pillars }))}
                        totalPledgeMode={false}
                    />
                    <input
                        className="dashboard-input dashboard-input--date"
                        type="date"
                        value={engagementForm.endDate}
                        onChange={(e) => setEngagementForm((prev) => ({ ...prev, endDate: e.target.value }))}
                        placeholder={donorText.deadline}
                    />
                    <button className="dashboard-button" type="submit">
                        {profile?.engagement ? donorText.updateEng : donorText.createEng}
                    </button>
                </form>
            </div>
        </>
    );
}
