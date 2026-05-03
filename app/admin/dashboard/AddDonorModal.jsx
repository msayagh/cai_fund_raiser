import { DEFAULT_TRANSLATION } from '@/lib/translationUtils.js';

export default function AddDonorModal({ isOpen, onClose, onSubmit, formData, setFormData, loading, inputStyle, cardStyle, t = {} }) {
    if (!isOpen) return null;
    const adminText = { ...(DEFAULT_TRANSLATION.admin ?? {}), ...(t.admin ?? {}) };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }}>
            <div style={{
                ...cardStyle,
                maxWidth: '500px',
                width: '90%',
                maxHeight: '90vh',
                overflowY: 'auto',
            }}>
                <div style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 20,
                    marginBottom: 18,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                    {adminText.addNewDonorTitle || 'Add New Donor'}
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-primary)',
                            fontSize: 24,
                            cursor: 'pointer',
                        }}
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
                    <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{adminText.fullNameLabel || 'Full Name'}*</span>
                        <input
                            type="text"
                            style={inputStyle}
                            value={formData.name || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder={adminText.donorFullNamePlaceholder || 'John Doe'}
                            required
                        />
                    </label>

                    <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{adminText.emailAddressLabel || 'Email'}*</span>
                        <input
                            type="email"
                            style={inputStyle}
                            value={formData.email || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                            placeholder={adminText.donorEmailPlaceholder || 'john@example.com'}
                            required
                        />
                    </label>

                    <label style={{ display: 'grid', gap: 6 }}>
                        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{adminText.pledgeAmountOptional || 'Pledge Amount (Optional)'}</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            style={inputStyle}
                            value={formData.pledge || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, pledge: e.target.value }))}
                            placeholder={adminText.zeroPlaceholder || '0.00'}
                        />
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                            }}
                        >
                            {adminText.cancelButton || 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                padding: '10px 14px',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'var(--accent-gold)',
                                color: '#111',
                                fontWeight: 700,
                                cursor: loading ? 'not-allowed' : 'pointer',
                                opacity: loading ? 0.6 : 1,
                            }}
                        >
                            {loading ? (adminText.creatingDonor || 'Creating...') : (adminText.addNewDonor || 'Add Donor')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
