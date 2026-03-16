export default function RequestsTab({ requestForm, setRequestForm, requests, handleRequestCreate }) {
    return (
        <>
            <div className="dashboard-card">
                <div className="dashboard-section-title">Need help?</div>
                <form className="dashboard-form" onSubmit={handleRequestCreate}>
                    <select
                        className="dashboard-input"
                        value={requestForm.type}
                        onChange={(e) => setRequestForm((prev) => ({ ...prev, type: e.target.value }))}
                    >
                        <option value="other">General request</option>
                        <option value="payment_upload">Payment upload</option>
                        <option value="engagement_change">Engagement change</option>
                        <option value="account_creation">Account help</option>
                    </select>
                    <textarea
                        className="dashboard-input dashboard-input--textarea"
                        value={requestForm.message}
                        onChange={(e) => setRequestForm((prev) => ({ ...prev, message: e.target.value }))}
                        placeholder="Tell us how we can help."
                    />
                    <button className="dashboard-button" type="submit">Submit request</button>
                </form>
            </div>

            <div className="dashboard-card">
                <div className="dashboard-section-title">Your requests</div>
                <div className="dashboard-list">
                    {requests.map((request) => (
                        <div key={request.id} className="dashboard-list-item">
                            <div className="dashboard-list-title dashboard-list-title--caps">{request.type.replace(/_/g, ' ')}</div>
                            <div className="dashboard-list-status">{request.status}</div>
                            <div className="dashboard-list-meta">{request.message}</div>
                        </div>
                    ))}
                    {requests.length === 0 ? <div className="dashboard-list-item">No requests submitted yet.</div> : null}
                </div>
            </div>
        </>
    );
}
