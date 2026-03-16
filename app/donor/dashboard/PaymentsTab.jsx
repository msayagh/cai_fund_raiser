export default function PaymentsTab({ payments, setActiveTab }) {
    return (
        <>
            <div className="dashboard-card">
                <div className="dashboard-section-title">Payment History</div>
                <div className="dashboard-list">
                    {payments.map((payment) => (
                        <div key={payment.id} className="dashboard-list-item">
                            <div className="dashboard-card__header">
                                <strong className="dashboard-list-title">${Number(payment.amount || 0).toLocaleString()}</strong>
                                <span className="dashboard-list-status">{payment.method}</span>
                            </div>
                            <div className="dashboard-list-meta">
                                {new Date(payment.date).toLocaleDateString()}
                            </div>
                            {payment.note ? <div className="dashboard-list-meta">{payment.note}</div> : null}
                        </div>
                    ))}
                    {payments.length === 0 ? <div className="dashboard-list-item">No payments recorded yet.</div> : null}
                </div>
            </div>

            <div className="dashboard-card">
                <div className="dashboard-section-title">Need to report an offline payment?</div>
                <p className="dashboard-page-subtitle">
                    If you donated by cash or bank transfer, send a request so the admin team can record it for you.
                </p>
                <button className="dashboard-button" type="button" onClick={() => setActiveTab('requests')}>
                    Open request form
                </button>
            </div>
        </>
    );
}
