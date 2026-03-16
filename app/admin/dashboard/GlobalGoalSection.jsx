'use client';

import { useState, useEffect } from 'react';
import * as settingsApi from '@/lib/settingsApi.js';

const getTranslation = (t, key, fallback) => {
    if (typeof t === 'function') {
        return t(key) || fallback;
    }
    return fallback;
};

export default function GlobalGoalSection({ t, cardStyle, inputStyle, goal, onGoalUpdate }) {
    const [globalGoal, setGlobalGoal] = useState(goal?.amount || 0);
    const [amountRaised, setAmountRaised] = useState(goal?.raised || 0);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Load from API on mount (with localStorage fallback)
    useEffect(() => {
        const loadGoal = async () => {
            try {
                const response = await settingsApi.getGlobalGoal();

                if (response?.data) {
                    setGlobalGoal(response.data.amount || 0);
                    setAmountRaised(response.data.raised || 0);
                    // Cache in localStorage
                    localStorage.setItem('adminGlobalGoal', JSON.stringify({ amount: response.data.amount, raised: response.data.raised }));
                }
            } catch (err) {
                console.error('Error loading goal from API:', err);
                // Fallback to localStorage
                try {
                    const saved = localStorage.getItem('adminGlobalGoal');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        setGlobalGoal(parsed.amount || 0);
                        setAmountRaised(parsed.raised || 0);
                    }
                } catch (e) {
                    console.error('Error loading from localStorage:', e);
                }
            }
        };

        loadGoal();
    }, []);

    const handleSaveGoal = async () => {
        try {
            setIsSaving(true);
            const newGoal = { amount: Number(globalGoal), raised: Number(amountRaised) };

            // Try to save to API
            try {
                await settingsApi.updateGlobalGoal(newGoal);
                // Cache in localStorage
                localStorage.setItem('adminGlobalGoal', JSON.stringify(newGoal));
                setSaveMessage('✓ Saved successfully');
            } catch (apiErr) {
                console.error('Error saving to API:', JSON.stringify(apiErr, null, 2));
                console.error('Error details:', apiErr?.message || 'No message', 'Status:', apiErr?.status, 'Code:', apiErr?.code);
                // Fallback to localStorage only
                localStorage.setItem('adminGlobalGoal', JSON.stringify(newGoal));
                setSaveMessage('✓ Saved locally (API unavailable)');
            }

            // Call callback if provided
            if (typeof onGoalUpdate === 'function') {
                await onGoalUpdate(newGoal);
            }

            setTimeout(() => setSaveMessage(''), 3000);
            setIsSaving(false);
        } catch (err) {
            console.error('Error saving goal:', err);
            setSaveMessage('✗ Error saving');
            setTimeout(() => setSaveMessage(''), 3000);
            setIsSaving(false);
        }
    };

    const progressPercent = globalGoal > 0 ? (amountRaised / globalGoal) * 100 : 0;
    const remaining = Math.max(0, globalGoal - amountRaised);

    return (
        <div style={cardStyle}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 24 }}>🎯 {getTranslation(t, 'admin.globalGoalTitle', 'Set Global Goal')}</div>

            <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
                {/* Progress Bar */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{getTranslation(t, 'admin.goalProgress', 'Goal Progress')}</span>
                        <span style={{ fontWeight: 700 }}>{Math.round(progressPercent)}%</span>
                    </div>
                    <div style={{
                        width: '100%',
                        height: 8,
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: 4,
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            width: `${progressPercent}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #7EB8A0, #DAC676)',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>

                {/* Goal Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div style={{ padding: 12, background: 'rgba(126, 184, 160, 0.1)', borderRadius: 8 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{getTranslation(t, 'admin.amountRaised', 'Amount Raised')}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>${amountRaised.toLocaleString()}</div>
                    </div>
                    <div style={{ padding: 12, background: 'rgba(218, 198, 118, 0.1)', borderRadius: 8 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{getTranslation(t, 'admin.globalGoal', 'Global Goal')}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>${globalGoal.toLocaleString()}</div>
                    </div>
                    <div style={{ padding: 12, background: 'rgba(255, 107, 107, 0.1)', borderRadius: 8 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{getTranslation(t, 'admin.remainingAmount', 'Remaining')}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>${remaining.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div style={{ display: 'grid', gap: 12 }}>
                <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>{getTranslation(t, 'admin.globalGoal', 'Global Goal')}</label>
                    <input
                        style={inputStyle}
                        type="number"
                        value={globalGoal}
                        onChange={(e) => setGlobalGoal(Number(e.target.value))}
                        min="0"
                    />
                </div>
                <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>{getTranslation(t, 'admin.amountRaised', 'Amount Raised')}</label>
                    <input
                        style={inputStyle}
                        type="number"
                        value={amountRaised}
                        onChange={(e) => setAmountRaised(Number(e.target.value))}
                        min="0"
                        max={globalGoal}
                    />
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button
                        type="button"
                        className="admin-button"
                        onClick={handleSaveGoal}
                        disabled={isSaving}
                        style={{ flex: 1, opacity: isSaving ? 0.6 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}
                    >
                        {isSaving ? 'Saving...' : getTranslation(t, 'admin.saveChanges', 'Save Changes')}
                    </button>
                    {saveMessage && (
                        <span style={{ fontSize: 12, color: saveMessage.includes('✓') ? '#4CAF50' : '#F44336', fontWeight: 600 }}>
                            {saveMessage}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
