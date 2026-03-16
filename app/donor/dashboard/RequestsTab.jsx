import { useTranslation } from '@/hooks/index.js';
import { DEFAULT_TRANSLATION } from '@/lib/translationUtils.js';

export default function RequestsTab({ requestForm, setRequestForm, requests, handleRequestCreate }) {
    const { t } = useTranslation();
    const donorText = { ...(DEFAULT_TRANSLATION.donor ?? {}), ...(t.donor ?? {}) };

    return (
        <>
            <div className="dashboard-card">
                <div className="dashboard-section-title">{donorText.needHelp}</div>
                <form className="dashboard-form" onSubmit={handleRequestCreate}>
                    <select
                        className="dashboard-input"
                        value={requestForm.type}
                        onChange={(e) => setRequestForm((prev) => ({ ...prev, type: e.target.value }))}
                    >
                        <option value="other">{donorText.generalRequest}</option>
                        <option value="payment_upload">{donorText.paymentUpload}</option>
                        <option value="engagement_change">{donorText.engagementChange}</option>
                        <option value="account_creation">{donorText.accountHelp}</option>
                    </select>
                    <textarea
                        className="dashboard-input dashboard-input--textarea"
                        value={requestForm.message}
                        onChange={(e) => setRequestForm((prev) => ({ ...prev, message: e.target.value }))}
                        placeholder={donorText.tellUsHowHelp}
                    />
                    <button className="dashboard-button" type="submit">{donorText.submitRequest}</button>
                </form>
            </div>

            <div className="dashboard-card">
                <div className="dashboard-section-title">{donorText.yourRequests}</div>
                <div className="dashboard-list">
                    {requests.map((request) => (
                        <div key={request.id} className="dashboard-list-item">
                            <div className="dashboard-list-title dashboard-list-title--caps">{request.type.replace(/_/g, ' ')}</div>
                            <div className="dashboard-list-status">{request.status}</div>
                            <div className="dashboard-list-meta">{request.message}</div>
                        </div>
                    ))}
                    {requests.length === 0 ? <div className="dashboard-list-item">{donorText.noRequestsSubmittedYet}</div> : null}
                </div>
            </div>
        </>
    );
}
