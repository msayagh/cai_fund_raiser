import { useState } from 'react';
import { DEFAULT_TRANSLATION } from '@/lib/translationUtils.js';

export default function AddDonorModal({ isOpen, onClose, onSubmit, formData, setFormData, loading, inputStyle, cardStyle, t = {} }) {
    const [showPassword, setShowPassword] = useState(false);
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
                        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{adminText.passwordLabel || 'Password'}*</span>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                style={{ ...inputStyle, paddingRight: '42px' }}
                                value={formData.password || ''}
                                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                                placeholder={adminText.donorPasswordPlaceholder || 'Temporary password'}
                                required
                            />
                            <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                )}
                            </button>
                        </div>
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
