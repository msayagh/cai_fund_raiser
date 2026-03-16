import PillarSelector from '../../../components/PillarSelector';

export default function ProfileTab({ profileForm, setProfileForm, passwordForm, setPasswordForm, engagementForm, setEngagementForm, profile, handleProfileUpdate, handlePasswordUpdate, handleEngagementUpdate }) {
    return (
        <>
            <div className="dashboard-card">
                <div className="dashboard-section-title">Profile</div>
                <form className="dashboard-form" onSubmit={handleProfileUpdate}>
                    <input
                        className="dashboard-input"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="Full name"
                    />
                    <input
                        className="dashboard-input"
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="Email"
                    />
                    <button className="dashboard-button" type="submit">Save profile</button>
                </form>
            </div>

            <div className="dashboard-card">
                <div className="dashboard-section-title">Password</div>
                <form className="dashboard-form" onSubmit={handlePasswordUpdate}>
                    <input
                        className="dashboard-input"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                        placeholder="Current password"
                    />
                    <input
                        className="dashboard-input"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                        placeholder="New password"
                    />
                    <input
                        className="dashboard-input"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        placeholder="Confirm new password"
                    />
                    <button className="dashboard-button" type="submit">Update password</button>
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
                        placeholder="Commitment end date"
                    />
                    <button className="dashboard-button" type="submit">
                        {profile?.engagement ? 'Update engagement' : 'Create engagement'}
                    </button>
                </form>
            </div>
        </>
    );
}
