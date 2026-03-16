export default function TabLoadingFallback() {
    return (
        <div className="dashboard-card">
            <div className="dashboard-loading-row">
                <div className="dashboard-spinner-inline" />
                <span>Loading tab content…</span>
            </div>
        </div>
    );
}
