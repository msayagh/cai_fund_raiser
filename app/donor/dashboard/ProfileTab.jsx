import PillarSelector from '../../../components/PillarSelector';
import { useTranslation } from '@/hooks/index.js';
import { DEFAULT_TRANSLATION } from '@/lib/translationUtils.js';

export default function ProfileTab({ profileForm, setProfileForm, engagementForm, setEngagementForm, profile, handleProfileUpdate, handleEngagementUpdate }) {
    const { t } = useTranslation();
    const donorText = { ...(DEFAULT_TRANSLATION.donor ?? {}), ...(t.donor ?? {}) };

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
