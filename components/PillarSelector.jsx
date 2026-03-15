import { useState, useMemo } from 'react';
import './PillarSelector.scss';

/**
 * Pillar Selector Component
 * Allows donors to select and input amounts for each pillar (foundation, walls, arches, dome)
 * Shows colors, descriptions, and calculates total automatically
 */

const PILLARS = [
    {
        key: 'foundation',
        label: 'Foundation',
        arabicName: 'Mutasaddiq',
        description: 'Support the Foundation',
        color: '#8B4513',
        lightColor: '#D2B48C',
        icon: '🏛️',
        order: 1,
    },
    {
        key: 'walls',
        label: 'Walls',
        arabicName: 'Kareem',
        description: 'Build the Walls',
        color: '#696969',
        lightColor: '#A9A9A9',
        icon: '🧱',
        order: 2,
    },
    {
        key: 'arches',
        label: 'Arches',
        arabicName: 'Jawaad',
        description: 'Create the Arches',
        color: '#4169E1',
        lightColor: '#87CEEB',
        icon: '🌉',
        order: 3,
    },
    {
        key: 'dome',
        label: 'Dome',
        arabicName: 'Sabbaq',
        description: 'Complete the Dome',
        color: '#FFD700',
        lightColor: '#FFED4E',
        icon: '⛪',
        order: 4,
    },
];

export default function PillarSelector({ pillars = {}, onPillarsChange, totalPledgeMode = false, onTotalChange }) {
    const [useManualEntry, setUseManualEntry] = useState(totalPledgeMode);

    // Calculate total from pillars
    const total = useMemo(() => {
        return Object.values(pillars).reduce((sum, amount) => sum + (Number(amount) || 0), 0);
    }, [pillars]);

    // Handle pillar amount change
    const handlePillarChange = (key, value) => {
        const numValue = value === '' ? 0 : Math.max(0, Number(value) || 0);
        const updated = { ...pillars, [key]: numValue };
        onPillarsChange(updated);
    };

    // Handle switching between manual and pillar-based entry
    const handleModeToggle = () => {
        setUseManualEntry(!useManualEntry);
        if (useManualEntry) {
            // Switching to pillar mode - clear pillars selection
            onPillarsChange({});
        }
        if (onTotalChange && useManualEntry) {
            onTotalChange(0);
        }
    };

    // Quick preset buttons that set pillar amounts to match the predefined amounts
    const setQuickPreset = (presetKey) => {
        const presets = {
            foundation: { foundation: 500, walls: 0, arches: 0, dome: 0 },
            walls: { foundation: 0, walls: 1000, arches: 0, dome: 0 },
            arches: { foundation: 0, walls: 0, arches: 1500, dome: 0 },
            dome: { foundation: 0, walls: 0, arches: 0, dome: 2000 },
            quarter: { foundation: 500, walls: 250, arches: 250, dome: 250 },
            half: { foundation: 500, walls: 500, arches: 500, dome: 500 },
            full: { foundation: 500, walls: 1000, arches: 1500, dome: 2000 },
        };
        onPillarsChange(presets[presetKey] || {});
    };

    return (
        <div className="pillar-selector">
            <div className="pillar-selector-header">
                <h3>Engagement Pledge</h3>
                <div className="mode-toggle">
                    <label>
                        <input
                            type="radio"
                            checked={!useManualEntry}
                            onChange={handleModeToggle}
                            disabled
                        />
                        By Pillar
                    </label>
                    <span className="mode-label">(Dynamic)</span>
                </div>
            </div>

            {!useManualEntry && (
                <>
                    {/* Quick Presets */}
                    <div className="presets-section">
                        <div className="presets-label">Quick Presets:</div>
                        <div className="presets-buttons">
                            {PILLARS.map((pillar) => (
                                <button
                                    key={pillar.key}
                                    type="button"
                                    className="preset-btn"
                                    onClick={() => setQuickPreset(pillar.key)}
                                    style={{ borderColor: pillar.color }}
                                    title={`Set ${pillar.label} only ($${pillar.key === 'foundation' ? 500 : pillar.key === 'walls' ? 1000 : pillar.key === 'arches' ? 1500 : 2000})`}
                                >
                                    {pillar.icon} {pillar.label}
                                </button>
                            ))}
                            <div className="divider" />
                            <button
                                type="button"
                                className="preset-btn preset-combined"
                                onClick={() => setQuickPreset('half')}
                                title="Equal parts for all pillars"
                            >
                                📊 Equal Split
                            </button>
                            <button
                                type="button"
                                className="preset-btn preset-combined"
                                onClick={() => setQuickPreset('full')}
                                title="Full support for all pillars"
                            >
                                ✨ All Pillars
                            </button>
                        </div>
                    </div>

                    {/* Pillar Cards */}
                    <div className="pillars-grid">
                        {PILLARS.map((pillar) => (
                            <div
                                key={pillar.key}
                                className="pillar-card"
                                style={{ borderLeftColor: pillar.color }}
                            >
                                <div className="pillar-header" style={{ backgroundColor: pillar.lightColor }}>
                                    <span className="pillar-icon">{pillar.icon}</span>
                                    <div className="pillar-title-section">
                                        <div className="pillar-label">{pillar.label}</div>
                                        <div className="pillar-arabic">{pillar.arabicName}</div>
                                    </div>
                                </div>

                                <div className="pillar-description">{pillar.description}</div>

                                <div className="pillar-input-group">
                                    <label htmlFor={`pillar-${pillar.key}`}>Amount ($)</label>
                                    <input
                                        id={`pillar-${pillar.key}`}
                                        type="number"
                                        min="0"
                                        step="50"
                                        placeholder="0"
                                        value={pillars[pillar.key] || ''}
                                        onChange={(e) => handlePillarChange(pillar.key, e.target.value)}
                                        className="pillar-input"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total Summary */}
                    <div className="total-summary">
                        <div className="summary-label">Total Commitment</div>
                        <div className="summary-amount">${total.toFixed(2)}</div>
                        {total > 0 && (
                            <div className="summary-breakdown">
                                {PILLARS.map((pillar) => {
                                    const amount = pillars[pillar.key] || 0;
                                    if (amount === 0) return null;
                                    return (
                                        <div key={pillar.key} className="breakdown-item">
                                            <span className="breakdown-pillar">
                                                <span className="breakdown-icon">{pillar.icon}</span>
                                                {pillar.label}
                                            </span>
                                            <span className="breakdown-amount" style={{ color: pillar.color }}>
                                                ${amount.toFixed(2)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
