export default function PaymentsTab({ payments, sectionCardStyle, setActiveTab }) {
    return (
        <>
            <div style={sectionCardStyle}>
                <div className="dashboard-section-title">Payment History</div>
                <div className="dashboard-list">
                    {payments.map((payment) => (
                        <div key={payment.id} className="dashboard-list-item">
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                                <strong>${Number(payment.amount || 0).toLocaleString()}</strong>
                                <span style={{ color: 'var(--accent-gold)' }}>{payment.method}</span>
                            </div>
                            <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>
                                {new Date(payment.date).toLocaleDateString()}
                            </div>
                            {payment.note ? <div style={{ marginTop: 8 }}>{payment.note}</div> : null}
                        </div>
                    ))}
                    {payments.length === 0 ? <div className="dashboard-list-item">No payments recorded yet.</div> : null}
                </div>
            </div>

            <div style={sectionCardStyle}>
                <div className="dashboard-section-title">Need to report an offline payment?</div>
                <p style={{ color: 'var(--text-muted)', marginBottom: 14 }}>
                    If you donated by cash or bank transfer, send a request so the admin team can record it for you.
                </p>
                <button className="dashboard-button" type="button" onClick={() => setActiveTab('requests')}>
                    Open request form
                </button>
            </div>
        </>
    );
}
