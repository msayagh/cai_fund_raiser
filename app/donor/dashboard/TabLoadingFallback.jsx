export default function TabLoadingFallback({ sectionCardStyle }) {
    return (
        <div style={sectionCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: '3px solid rgba(255, 255, 255, 0.2)',
                    borderTopColor: 'var(--accent-gold)',
                    animation: 'spin 1s linear infinite',
                }} />
                <span style={{ color: 'var(--text-muted)' }}>Loading tab content…</span>
            </div>
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
