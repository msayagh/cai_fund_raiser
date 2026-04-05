'use client';

import { useEffect, useState } from 'react';
import { getVolunteeringSettings, updateVolunteeringSettings } from '@/lib/settingsApi.js';
import { FEATURES } from '@/constants/features.js';

const DEFAULT_SETTINGS = {
    volEnabled: true,
    volShowDiscussion: true,
    volShowHistory: true,
    volShowUnscheduled: true,
};

function ToggleSwitch({ checked, onChange, disabled, id }) {
    return (
        <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            style={{
                position: 'relative',
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                background: checked && !disabled
                    ? 'var(--accent, #64a0ff)'
                    : 'var(--border, rgba(128,128,128,.3))',
                transition: 'background 0.2s',
                flexShrink: 0,
                opacity: disabled ? 0.4 : 1,
                padding: 0,
            }}
        >
            <span
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    top: 3,
                    left: checked ? 23 : 3,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'left 0.18s',
                    boxShadow: '0 1px 4px rgba(0,0,0,.25)',
                    display: 'block',
                }}
            />
        </button>
    );
}

function ToggleRow({ label, description, checked, onChange, disabled = false, indent = false }) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
            padding: '14px 0',
            borderBottom: '1px solid var(--border)',
            paddingLeft: indent ? 20 : 0,
        }}>
            <div style={{ flex: 1 }}>
                <div style={{
                    fontWeight: indent ? 500 : 600,
                    fontSize: indent ? 14 : 15,
                    color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
                    transition: 'color 0.2s',
                }}>
                    {indent && <span style={{ marginRight: 6, opacity: 0.5 }}>↳</span>}
                    {label}
                </div>
                {description && (
                    <div style={{
                        fontSize: 13,
                        color: 'var(--text-muted)',
                        marginTop: 3,
                        lineHeight: 1.5,
                        opacity: disabled ? 0.6 : 1,
                        transition: 'opacity 0.2s',
                    }}>
                        {description}
                    </div>
                )}
            </div>
            <ToggleSwitch checked={checked} onChange={onChange} disabled={disabled} />
        </div>
    );
}

export default function VolunteeringSettingsSection({ cardStyle, adminText }) {
    const ui = adminText || {};
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        getVolunteeringSettings()
            .then((data) => setSettings({ ...DEFAULT_SETTINGS, ...data }))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const update = (key, value) => {
        setSettings((prev) => {
            const next = { ...prev, [key]: value };
            // If master is turned off, coerce all sub-toggles to false
            if (key === 'volEnabled' && !value) {
                next.volShowDiscussion = false;
                next.volShowHistory = false;
                next.volShowUnscheduled = false;
            }
            return next;
        });
        setDirty(true);
        setMessage('');
        setError('');
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage('');
        setError('');
        try {
            const saved = await updateVolunteeringSettings(settings);
            setSettings({ ...DEFAULT_SETTINGS, ...saved });
            setDirty(false);
            setMessage(ui.volSettingsSaved || 'Settings saved successfully.');
        } catch (err) {
            setError(err?.message || ui.volSettingsFailed || 'Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-card" style={cardStyle}>
                <div className="admin-muted">{ui.volSettingsLoading || 'Loading settings…'}</div>
            </div>
        );
    }

    const subDisabled = !settings.volEnabled;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── Volunteering feature toggles ── */}
            <div className="admin-card" style={cardStyle}>
                <div style={{ marginBottom: 20 }}>
                    <div className="admin-section-title" style={{ marginBottom: 4 }}>{ui.volSettingsTitle || 'Volunteering'}</div>
                    <div className="admin-muted" style={{ fontSize: 14, lineHeight: 1.6 }}>
                        {ui.volSettingsDescription || 'Control visibility of the volunteering module and its sub-features for donors. Disabling the master switch automatically hides all sub-features.'}
                        {!FEATURES.VOLUNTEERING && (
                            <span style={{ color: '#f14668', fontWeight: 600, display: 'block', marginTop: 6 }}>
                                {ui.volSettingsEnvWarning || '⚠ The NEXT_PUBLIC_FEATURE_VOLUNTEERING env flag is off — donors cannot see volunteering regardless of these settings.'}
                            </span>
                        )}
                    </div>
                </div>

                {/* Master toggle */}
                <ToggleRow
                    label={ui.volSettingsModuleLabel || 'Volunteering Module'}
                    description={ui.volSettingsModuleDesc || 'When disabled, the Volunteering tab is hidden from donors entirely and none of the sub-features are accessible.'}
                    checked={settings.volEnabled}
                    onChange={(v) => update('volEnabled', v)}
                />

                {/* Sub-features — indented under master */}
                <div style={{
                    marginLeft: 0,
                    borderLeft: `3px solid ${settings.volEnabled ? 'var(--accent, #64a0ff)' : 'var(--border)'}`,
                    paddingLeft: 18,
                    marginTop: 0,
                    transition: 'border-color 0.2s',
                }}>
                    <ToggleRow
                        label={ui.volSettingsDiscussionLabel || 'Discussion'}
                        description={ui.volSettingsDiscussionDesc || 'Show the discussion / messaging panel inside each activity detail view, allowing donors to communicate with admins.'}
                        checked={settings.volShowDiscussion}
                        onChange={(v) => update('volShowDiscussion', v)}
                        disabled={subDisabled}
                        indent
                    />
                    <ToggleRow
                        label={ui.volSettingsHistoryLabel || 'Activity History'}
                        description={ui.volSettingsHistoryDesc || 'Show the “Show activity history” button that lets donors browse their past activity sign-ups.'}
                        checked={settings.volShowHistory}
                        onChange={(v) => update('volShowHistory', v)}
                        disabled={subDisabled}
                        indent
                    />
                    <ToggleRow
                        label={ui.volSettingsUnscheduledLabel || 'Not Yet Scheduled Activities'}
                        description={ui.volSettingsUnscheduledDesc || 'Show the collapsible “Not Yet Scheduled” section listing activities that have no upcoming sessions.'}
                        checked={settings.volShowUnscheduled}
                        onChange={(v) => update('volShowUnscheduled', v)}
                        disabled={subDisabled}
                        indent
                    />
                </div>

                {/* Save row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 24, flexWrap: 'wrap' }}>
                    <button
                        type="button"
                        className="admin-button"
                        disabled={saving || !dirty}
                        onClick={handleSave}
                        style={{ opacity: dirty ? 1 : 0.55 }}
                    >
                        {saving ? (ui.volSettingsSaving || 'Saving…') : (ui.volSettingsSave || 'Save settings')}
                    </button>
                    {message && (
                        <span style={{ color: '#48c78e', fontSize: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                            {message}
                        </span>
                    )}
                    {error && (
                        <span style={{ color: '#f14668', fontSize: 14 }}>{error}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
