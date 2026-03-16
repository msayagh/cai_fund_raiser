export default function OverviewTab({ profile, paymentTotal, engagementTarget, progressPct, remainingAmount, requests, latestPayments, latestRequests, setActiveTab }) {
    return (
        <>
            <div className="dashboard-card">
                <div className="dashboard-section-title">Giving Summary</div>
                <div className="dashboard-stat-grid">
                    <div className="dashboard-stat">
                        <div className="dashboard-stat-label">Committed</div>
                        <div className="dashboard-stat-value">${engagementTarget.toLocaleString()}</div>
                    </div>
                    <div className="dashboard-stat">
                        <div className="dashboard-stat-label">Received</div>
                        <div className="dashboard-stat-value">${paymentTotal.toLocaleString()}</div>
                    </div>
                    <div className="dashboard-stat">
                        <div className="dashboard-stat-label">Progress</div>
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
                <div className="dashboard-section-title">Engagement Details</div>
                <div className="dashboard-stat-grid">
                    <div className="dashboard-stat">
                        <div className="dashboard-stat-label">Remaining</div>
                        <div className="dashboard-stat-value">${remainingAmount.toLocaleString()}</div>
                    </div>
                    <div className="dashboard-stat">
                        <div className="dashboard-stat-label">End date</div>
                        <div className="dashboard-stat-value dashboard-stat-value--sm">
                            {profile?.engagement?.endDate ? new Date(profile.engagement.endDate).toLocaleDateString() : 'Open'}
                        </div>
                    </div>
                    <div className="dashboard-stat">
                        <div className="dashboard-stat-label">Requests filed</div>
                        <div className="dashboard-stat-value">{requests.length}</div>
                    </div>
                </div>
            </div>

            <div className="dashboard-card">
                <div className="dashboard-section-title">Quick Actions</div>
                <div className="dashboard-list">
                    <button type="button" className="dashboard-action" onClick={() => setActiveTab('payments')}>
                        Review your payment history and current progress
                    </button>
                    <button type="button" className="dashboard-action" onClick={() => setActiveTab('profile')}>
                        Update your profile, password, and pledge details
                    </button>
                    <button type="button" className="dashboard-action" onClick={() => setActiveTab('requests')}>
                        Contact the admin team or submit a help request
                    </button>
                </div>
            </div>

            <div className="dashboard-card">
                <div className="dashboard-section-title">Recent Payments</div>
                <div className="dashboard-list">
                    {latestPayments.map((payment) => (
                        <div key={payment.id} className="dashboard-list-item">
                            <div className="dashboard-list-title">${Number(payment.amount || 0).toLocaleString()}</div>
                            <div className="dashboard-list-meta">
                                {new Date(payment.date).toLocaleDateString()} · {payment.method}
                            </div>
                        </div>
                    ))}
                    {latestPayments.length === 0 ? <div className="dashboard-list-item">No payments recorded yet.</div> : null}
                </div>
            </div>

            <div className="dashboard-card">
                <div className="dashboard-section-title">Recent Requests</div>
                <div className="dashboard-list">
                    {latestRequests.map((request) => (
                        <div key={request.id} className="dashboard-list-item">
                            <div className="dashboard-list-title dashboard-list-title--caps">{request.type.replace(/_/g, ' ')}</div>
                            <div className="dashboard-list-status">{request.status}</div>
                            <div className="dashboard-list-meta">{request.message}</div>
                        </div>
                    ))}
                    {latestRequests.length === 0 ? <div className="dashboard-list-item">No requests submitted yet.</div> : null}
                </div>
            </div>
        </>
    );
}
