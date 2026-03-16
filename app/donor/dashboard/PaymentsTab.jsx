import { useTranslation } from '@/hooks/index.js';
import { DEFAULT_TRANSLATION } from '@/lib/translationUtils.js';

export default function PaymentsTab({ payments, setActiveTab }) {
    const { t } = useTranslation();
    const donorText = { ...(DEFAULT_TRANSLATION.donor ?? {}), ...(t.donor ?? {}) };

    return (
        <>
            <div className="dashboard-card">
                <div className="dashboard-section-title">{donorText.historyTitle}</div>
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
                    {payments.length === 0 ? <div className="dashboard-list-item">{donorText.paymentHistoryEmpty}</div> : null}
                </div>
            </div>

            <div className="dashboard-card">
                <div className="dashboard-section-title">{donorText.reportOfflinePayment}</div>
                <p className="dashboard-page-subtitle">
                    {donorText.offlinePaymentHelp}
                </p>
                <button className="dashboard-button" type="button" onClick={() => setActiveTab('requests')}>
                    {donorText.openRequestForm}
                </button>
            </div>
        </>
    );
}
