export default function RequestsTab({ requestForm, setRequestForm, requests, sectionCardStyle, inputStyle, handleRequestCreate }) {
    return (
        <>
            <div style={sectionCardStyle}>
                <div className="dashboard-section-title">Need help?</div>
                <form className="dashboard-form" onSubmit={handleRequestCreate}>
                    <select
                        style={inputStyle}
                        value={requestForm.type}
                        onChange={(e) => setRequestForm((prev) => ({ ...prev, type: e.target.value }))}
                    >
                        <option value="other">General request</option>
                        <option value="payment_upload">Payment upload</option>
                        <option value="engagement_change">Engagement change</option>
                        <option value="account_creation">Account help</option>
                    </select>
                    <textarea
                        style={{ ...inputStyle, minHeight: 140 }}
                        value={requestForm.message}
                        onChange={(e) => setRequestForm((prev) => ({ ...prev, message: e.target.value }))}
                        placeholder="Tell us how we can help."
                    />
                    <button className="dashboard-button" type="submit">Submit request</button>
                </form>
            </div>

            <div style={sectionCardStyle}>
                <div className="dashboard-section-title">Your requests</div>
                <div className="dashboard-list">
                    {requests.map((request) => (
                        <div key={request.id} className="dashboard-list-item">
                            <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{request.type.replace(/_/g, ' ')}</div>
                            <div style={{ color: 'var(--accent-gold)', margin: '4px 0' }}>{request.status}</div>
                            <div style={{ color: 'var(--text-muted)' }}>{request.message}</div>
                        </div>
                    ))}
                    {requests.length === 0 ? <div className="dashboard-list-item">No requests submitted yet.</div> : null}
                </div>
            </div>
        </>
    );
}
