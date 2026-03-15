export default function OverviewTab({ profile, paymentTotal, engagementTarget, progressPct, remainingAmount, requests, latestPayments, latestRequests, sectionCardStyle, setActiveTab }) {
    return (
        <>
            <div style={sectionCardStyle}>
                <div className="dashboard-section-title">Giving Summary</div>
                <div className="dashboard-stat-grid">
                    <div className="dashboard-stat">
                        <div style={{ color: 'var(--text-muted)' }}>Committed</div>
                        <div style={{ fontSize: 28, fontWeight: 700 }}>${engagementTarget.toLocaleString()}</div>
                    </div>
                    <div className="dashboard-stat">
                        <div style={{ color: 'var(--text-muted)' }}>Received</div>
                        <div style={{ fontSize: 28, fontWeight: 700 }}>${paymentTotal.toLocaleString()}</div>
                    </div>
                    <div className="dashboard-stat">
                        <div style={{ color: 'var(--text-muted)' }}>Progress</div>
                        <div style={{ fontSize: 28, fontWeight: 700 }}>{progressPct}%</div>
                    </div>
                </div>
                <div style={{ marginTop: 18 }}>
                    <div className="dashboard-progress">
                        <div className="dashboard-progress-bar" style={{ width: `${progressPct}%` }}></div>
                    </div>
                </div>
            </div>

            <div style={sectionCardStyle}>
                <div className="dashboard-section-title">Engagement Details</div>
                <div className="dashboard-stat-grid">
                    <div className="dashboard-stat">
                        <div style={{ color: 'var(--text-muted)' }}>Remaining</div>
                        <div style={{ fontSize: 28, fontWeight: 700 }}>${remainingAmount.toLocaleString()}</div>
                    </div>
                    <div className="dashboard-stat">
                        <div style={{ color: 'var(--text-muted)' }}>End date</div>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>
                            {profile?.engagement?.endDate ? new Date(profile.engagement.endDate).toLocaleDateString() : 'Open'}
                        </div>
                    </div>
                    <div className="dashboard-stat">
                        <div style={{ color: 'var(--text-muted)' }}>Requests filed</div>
                        <div style={{ fontSize: 28, fontWeight: 700 }}>{requests.length}</div>
                    </div>
                </div>
            </div>

            <div style={sectionCardStyle}>
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

            <div style={sectionCardStyle}>
                <div className="dashboard-section-title">Recent Payments</div>
                <div className="dashboard-list">
                    {latestPayments.map((payment) => (
                        <div key={payment.id} className="dashboard-list-item">
                            <div style={{ fontWeight: 700 }}>${Number(payment.amount || 0).toLocaleString()}</div>
                            <div style={{ color: 'var(--text-muted)' }}>
                                {new Date(payment.date).toLocaleDateString()} · {payment.method}
                            </div>
                        </div>
                    ))}
                    {latestPayments.length === 0 ? <div className="dashboard-list-item">No payments recorded yet.</div> : null}
                </div>
            </div>

            <div style={sectionCardStyle}>
                <div className="dashboard-section-title">Recent Requests</div>
                <div className="dashboard-list">
                    {latestRequests.map((request) => (
                        <div key={request.id} className="dashboard-list-item">
                            <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{request.type.replace(/_/g, ' ')}</div>
                            <div style={{ color: 'var(--accent-gold)', marginTop: 4 }}>{request.status}</div>
                            <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>{request.message}</div>
                        </div>
                    ))}
                    {latestRequests.length === 0 ? <div className="dashboard-list-item">No requests submitted yet.</div> : null}
                </div>
            </div>
        </>
    );
}
