'use client';

import { useState, useEffect } from 'react';
import * as settingsApi from '@/lib/settingsApi.js';

const getTranslation = (t, key, fallback) => {
    if (typeof t === 'function') {
        return t(key) || fallback;
    }
    return fallback;
};

export default function PillarsOverview({ t, pillars = {} }) {
    const [pillarAmounts, setPillarAmounts] = useState(pillars);
    const [isEditing, setIsEditing] = useState(false);
    const [editValues, setEditValues] = useState(pillars);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Load from API on mount (with localStorage fallback)
    useEffect(() => {
        const loadPillars = async () => {
            try {
                const response = await settingsApi.getPillars();

                if (response?.data && typeof response.data === 'object') {
                    // Convert API response to amounts object
                    const amounts = {};
                    Object.entries(response.data).forEach(([key, pillar]) => {
                        amounts[key] = pillar.amount || 0;
                    });
                    setPillarAmounts(amounts);
                    setEditValues(amounts);
                    // Cache in localStorage
                    localStorage.setItem('adminPillars', JSON.stringify(amounts));
                }
            } catch (err) {
                console.warn('Failed to load pillars from API (using cache):', err.message);
                // Fallback to localStorage
                try {
                    const saved = localStorage.getItem('adminPillars');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        setPillarAmounts(parsed);
                        setEditValues(parsed);
                    } else {
                        setPillarAmounts(pillars);
                        setEditValues(pillars);
                    }
                } catch (e) {
                    console.error('Error loading from localStorage:', e);
                    setPillarAmounts(pillars);
                    setEditValues(pillars);
                }
            }
        };

        loadPillars();
    }, [pillars]);

    const handleSavePillars = async () => {
        try {
            setIsSaving(true);

            // Try to save to API
            try {
                await settingsApi.updateAllPillars(editValues);
            } catch (apiErr) {
                console.error('Error saving pillars via API:', apiErr);
                // Continue with local save
            }

            setPillarAmounts(editValues);
            localStorage.setItem('adminPillars', JSON.stringify(editValues));
            setIsEditing(false);
            setSaveMessage('✓ Pillar amounts saved');
            setTimeout(() => setSaveMessage(''), 3000);
            setIsSaving(false);
        } catch (err) {
            console.error('Error saving pillars:', err);
            setSaveMessage('✗ Error saving');
            setTimeout(() => setSaveMessage(''), 3000);
            setIsSaving(false);
        }
    };

    const pillarConfig = {
        foundation: {
            label: getTranslation(t, 'admin.foundation', 'Foundation'),
            arabicName: 'Mutasaddiq',
            icon: '🏛️',
            color: '#8B4513',
            lightColor: '#D2B48C',
        },
        walls: {
            label: getTranslation(t, 'admin.walls', 'Walls'),
            arabicName: 'Kareem',
            icon: '🧱',
            color: '#696969',
            lightColor: '#A9A9A9',
        },
        arches: {
            label: getTranslation(t, 'admin.arches', 'Arches'),
            arabicName: 'Jawaad',
            icon: '🌉',
            color: '#4169E1',
            lightColor: '#87CEEB',
        },
        dome: {
            label: getTranslation(t, 'admin.dome', 'Dome'),
            arabicName: 'Sabbaq',
            icon: '⛪',
            color: '#FFD700',
            lightColor: '#FFED4E',
        }
    };

    const totalPillarAmount = Object.values(pillarAmounts).reduce((sum, amount) => sum + (Number(amount) || 0), 0);

    return (
        <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            padding: '24px',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20 }}>
                    🔨 {getTranslation(t, 'admin.pillars', 'Pillar Breakdown')}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button
                        type="button"
                        className="admin-button"
                        onClick={() => {
                            if (isEditing) {
                                setEditValues(pillarAmounts);
                            }
                            setIsEditing(!isEditing);
                        }}
                        style={{ fontSize: 12, padding: '6px 12px' }}
                    >
                        {isEditing ? 'Cancel' : 'Edit Amounts'}
                    </button>
                    {saveMessage && (
                        <span style={{ fontSize: 12, color: saveMessage.includes('✓') ? '#4CAF50' : '#F44336', fontWeight: 600, minWidth: 150, textAlign: 'right' }}>
                            {saveMessage}
                        </span>
                    )}
                </div>
            </div>

            {totalPillarAmount === 0 && !isEditing ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                    No pillar donations yet. <button onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', color: '#2196F3', cursor: 'pointer', textDecoration: 'underline' }}>Add amounts</button>?
                </div>
            ) : (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: isEditing ? 24 : 0 }}>
                        {Object.entries(pillarConfig).map(([key, pillar]) => {
                            const amount = isEditing ? (editValues[key] || 0) : (pillarAmounts[key] || 0);
                            const percentage = totalPillarAmount > 0 ? (amount / totalPillarAmount) * 100 : 0;

                            return (
                                <div
                                    key={key}
                                    style={{
                                        padding: 16,
                                        borderRadius: 12,
                                        background: `linear-gradient(135deg, ${pillar.lightColor}22, ${pillar.color}11)`,
                                        border: `2px solid ${pillar.color}`,
                                        transition: 'transform 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                                        <div>
                                            <div style={{ fontSize: 24, marginBottom: 4 }}>{pillar.icon}</div>
                                            <div style={{ fontWeight: 700 }}>{pillar.label}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pillar.arabicName}</div>
                                        </div>
                                        {isEditing ? (
                                            <input
                                                type="number"
                                                value={editValues[key] || 0}
                                                onChange={(e) => setEditValues({ ...editValues, [key]: Number(e.target.value) })}
                                                style={{
                                                    width: 80,
                                                    padding: '6px 8px',
                                                    borderRadius: 4,
                                                    border: `1px solid ${pillar.color}`,
                                                    fontSize: 14,
                                                    fontWeight: 700,
                                                    color: pillar.color
                                                }}
                                                min="0"
                                            />
                                        ) : (
                                            <div style={{ textAlign: 'right', fontWeight: 700 }}>
                                                <div style={{ fontSize: 18, color: pillar.color }}>${amount.toLocaleString()}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{Math.round(percentage)}%</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress Bar */}
                                    <div style={{
                                        width: '100%',
                                        height: 4,
                                        background: `${pillar.color}22`,
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                        marginTop: 8
                                    }}>
                                        <div style={{
                                            width: `${percentage}%`,
                                            height: '100%',
                                            background: pillar.color,
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Save Button (Edit Mode) */}
                    {isEditing && (
                        <button
                            type="button"
                            className="admin-button"
                            onClick={handleSavePillars}
                            disabled={isSaving}
                            style={{
                                width: '100%',
                                padding: '10px 16px',
                                opacity: isSaving ? 0.6 : 1,
                                cursor: isSaving ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isSaving ? 'Saving...' : 'Save Pillar Amounts'}
                        </button>
                    )}
                </>
            )}

            {/* Total Summary */}
            {totalPillarAmount > 0 && (
                <div style={{
                    marginTop: 20,
                    paddingTop: 20,
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Pillar Donations</span>
                    <span style={{ fontWeight: 700, fontSize: 18 }}>${totalPillarAmount}</span>
                </div>
            )}
        </div>
    );
}
