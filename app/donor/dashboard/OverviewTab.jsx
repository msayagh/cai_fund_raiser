import { useTranslation } from '@/hooks/index.js';
import { DEFAULT_TRANSLATION } from '@/lib/translationUtils.js';

export default function OverviewTab({ profile, paymentTotal, engagementTarget, progressPct, remainingAmount, requests, latestPayments, latestRequests, setActiveTab }) {
    const { t } = useTranslation();
    const donorText = { ...(DEFAULT_TRANSLATION.donor ?? {}), ...(t.donor ?? {}) };

    return (
        <>
            <div className="dashboard-card">
                <div className="dashboard-section-title">{donorText.givingSummary}</div>
                <div className="dashboard-stat-grid">
                    <div className="dashboard-stat">
                        <div className="dashboard-stat-label">{donorText.committed}</div>
                        <div className="dashboard-stat-value">${engagementTarget.toLocaleString()}</div>
                    </div>
                    <div className="dashboard-stat">
                        <div className="dashboard-stat-label">{donorText.paid}</div>
                        <div className="dashboard-stat-value">${paymentTotal.toLocaleString()}</div>
                    </div>
                    <div className="dashboard-stat">
                        <div className="dashboard-stat-label">{donorText.progress}</div>
                        <div className="dashboard-stat-value">{progressPct}%</div>
                    </div>
                </div>
                <div className="dashboard-field">
                    <div className="dashboard-progress">
                        <div className="dashboard-progress-bar" style={{ width: `${progressPct}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="dashboard-card">
                <div className="dashboard-section-title">{donorText.engagementDetails}</div>
                <div className="dashboard-stat-grid">
                    <div className="dashboard-stat">
                        <div className="dashboard-stat-label">{donorText.remaining}</div>
                        <div className="dashboard-stat-value">${remainingAmount.toLocaleString()}</div>
                    </div>
                    <div className="dashboard-stat">
                        <div className="dashboard-stat-label">{donorText.endDate}</div>
                        <div className="dashboard-stat-value dashboard-stat-value--sm">
                            {profile?.engagement?.endDate ? new Date(profile.engagement.endDate).toLocaleDateString() : donorText.openEnded}
                        </div>
                    </div>
                    <div className="dashboard-stat">
                        <div className="dashboard-stat-label">{donorText.requestsFiled}</div>
                        <div className="dashboard-stat-value">{requests.length}</div>
                    </div>
                </div>
            </div>

            <div className="dashboard-card">
                <div className="dashboard-section-title">{donorText.quickActions}</div>
                <div className="dashboard-list">
                    <button type="button" className="dashboard-action" onClick={() => setActiveTab('payments')}>
                        {donorText.reviewPaymentHistoryAction}
                    </button>
                    <button type="button" className="dashboard-action" onClick={() => setActiveTab('profile')}>
                        {donorText.updateProfileAction}
                    </button>
                    <button type="button" className="dashboard-action" onClick={() => setActiveTab('requests')}>
                        {donorText.contactAdminAction}
                    </button>
                </div>
            </div>

            <div className="dashboard-card">
                <div className="dashboard-section-title">{donorText.recentPayments}</div>
                <div className="dashboard-list">
                    {latestPayments.map((payment) => (
                        <div key={payment.id} className="dashboard-list-item">
                            <div className="dashboard-list-title">${Number(payment.amount || 0).toLocaleString()}</div>
                            <div className="dashboard-list-meta">
                                {new Date(payment.date).toLocaleDateString()} · {payment.method}
                            </div>
                        </div>
                    ))}
                    {latestPayments.length === 0 ? <div className="dashboard-list-item">{donorText.paymentHistoryEmpty}</div> : null}
                </div>
            </div>

            <div className="dashboard-card">
                <div className="dashboard-section-title">{donorText.recentRequests}</div>
                <div className="dashboard-list">
                    {latestRequests.map((request) => (
                        <div key={request.id} className="dashboard-list-item">
                            <div className="dashboard-list-title dashboard-list-title--caps">{request.type.replace(/_/g, ' ')}</div>
                            <div className="dashboard-list-status">{request.status}</div>
                            <div className="dashboard-list-meta">{request.message}</div>
                        </div>
                    ))}
                    {latestRequests.length === 0 ? <div className="dashboard-list-item">{donorText.noRequestsSubmittedYet}</div> : null}
                </div>
            </div>
        </>
    );
}
