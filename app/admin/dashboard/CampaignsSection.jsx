'use client';

import { useState, useEffect } from 'react';
import * as settingsApi from '@/lib/settingsApi.js';
import { DEFAULT_TRANSLATION } from '@/lib/translationUtils.js';

const getTranslation = (t, key, fallback) => {
    const value = key.split('.').reduce((acc, part) => acc?.[part], t);
    return value ?? fallback;
};

export default function CampaignsSection({ t, cardStyle, inputStyle, campaigns = [] }) {
    const adminText = { ...(DEFAULT_TRANSLATION.admin ?? {}), ...(t.admin ?? {}) };
    const [campaignsList, setCampaignsList] = useState(campaigns);
    const [isAdding, setIsAdding] = useState(false);
    const [newCampaign, setNewCampaign] = useState({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        goal: 0,
        status: 'active'
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Load from API on mount (with localStorage fallback)
    useEffect(() => {
        const loadCampaigns = async () => {
            try {
                const response = await settingsApi.listCampaigns();

                if (response?.data && Array.isArray(response.data)) {
                    setCampaignsList(response.data);
                    // Cache in localStorage
                    localStorage.setItem('adminCampaigns', JSON.stringify(response.data));
                }
            } catch (err) {
                console.warn('Failed to load campaigns from API (using cache):', err.message);
                // Fallback to localStorage
                try {
                    const saved = localStorage.getItem('adminCampaigns');
                    if (saved) {
                        const parsed = JSON.parse(saved);
                        setCampaignsList(parsed);
                    }
                } catch (e) {
                    console.error('Error loading from localStorage:', e);
                }
            }
        };

        loadCampaigns();
    }, []);

    const handleAddCampaign = async () => {
        if (!newCampaign.name || !newCampaign.goal) {
            alert(adminText.campaignNameAndGoalRequired || 'Please fill in campaign name and goal');
            return;
        }

        try {
            setIsSaving(true);
            const campaign = {
                name: newCampaign.name,
                description: newCampaign.description,
                goal: Number(newCampaign.goal),
                startDate: newCampaign.startDate || null,
                endDate: newCampaign.endDate || null,
                status: newCampaign.status,
                raised: 0
            };

            // Try to save to API
            let savedCampaign = campaign;
            try {
                const response = await settingsApi.createCampaign(campaign);
                if (response?.data) {
                    savedCampaign = response.data;
                }
            } catch (apiErr) {
                console.error('Error creating campaign via API:', apiErr);
                // Use local save with ID
                savedCampaign = { ...campaign, id: Date.now(), createdAt: new Date().toISOString() };
            }

            const updated = [...campaignsList, savedCampaign];
            setCampaignsList(updated);
            localStorage.setItem('adminCampaigns', JSON.stringify(updated));

            setNewCampaign({
                name: '',
                description: '',
                startDate: '',
                endDate: '',
                goal: 0,
                status: 'active'
            });
            setIsAdding(false);
            setSaveMessage(adminText.campaignCreated || 'Campaign created');
            setTimeout(() => setSaveMessage(''), 3000);
            setIsSaving(false);
        } catch (err) {
            console.error('Error adding campaign:', err);
            setSaveMessage(adminText.campaignCreateError || 'Error creating campaign');
            setTimeout(() => setSaveMessage(''), 3000);
            setIsSaving(false);
        }
    };

    const handleDeleteCampaign = async (id) => {
        try {
            // Try to delete from API
            try {
                await settingsApi.deleteCampaign(id);
            } catch (apiErr) {
                console.error('Error deleting campaign via API:', apiErr);
                // Continue with local delete
            }

            const updated = campaignsList.filter(c => c.id !== id);
            setCampaignsList(updated);
            localStorage.setItem('adminCampaigns', JSON.stringify(updated));
            setSaveMessage(adminText.campaignDeleted || 'Campaign deleted');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (err) {
            console.error('Error deleting campaign:', err);
            setSaveMessage(adminText.campaignDeleteError || 'Error deleting campaign');
            setTimeout(() => setSaveMessage(''), 3000);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return '#7EB8A0';
            case 'completed': return '#DAC676';
            case 'archived': return '#666';
            default: return '#999';
        }
    };

    return (
        <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20 }}>📢 {getTranslation(t, 'admin.campaigns', 'Campaigns')}</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button
                        type="button"
                        className="admin-button"
                        onClick={() => setIsAdding(!isAdding)}
                    >
                        {isAdding ? adminText.cancelButton || 'Cancel' : getTranslation(t, 'admin.newCampaign', 'Create Campaign')}
                    </button>
                    {saveMessage && (
                        <span style={{ fontSize: 12, color: saveMessage.includes('✓') ? '#4CAF50' : '#F44336', fontWeight: 600 }}>
                            {saveMessage}
                        </span>
                    )}
                </div>
            </div>

            {/* Add Campaign Form */}
            {isAdding && (
                <div style={{
                    padding: 16,
                    background: 'rgba(126, 184, 160, 0.05)',
                    borderRadius: 8,
                    marginBottom: 24,
                    border: '1px solid var(--border)'
                }}>
                    <div style={{ display: 'grid', gap: 12 }}>
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
                                {getTranslation(t, 'admin.campaignName', 'Campaign Name')} *
                            </label>
                            <input
                                style={inputStyle}
                                type="text"
                                value={newCampaign.name}
                                onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                                placeholder={adminText.campaignNamePlaceholder || 'Campaign name'}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
                                {getTranslation(t, 'admin.campaignDescription', 'Description')}
                            </label>
                            <textarea
                                style={{ ...inputStyle, minHeight: 60 }}
                                value={newCampaign.description}
                                onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                                placeholder={adminText.campaignDescriptionPlaceholder || 'Campaign description'}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
                                    {getTranslation(t, 'admin.campaignStartDate', 'Start Date')}
                                </label>
                                <input
                                    style={inputStyle}
                                    type="date"
                                    value={newCampaign.startDate}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
                                    {getTranslation(t, 'admin.campaignEndDate', 'End Date')}
                                </label>
                                <input
                                    style={inputStyle}
                                    type="date"
                                    value={newCampaign.endDate}
                                    onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
                                {getTranslation(t, 'admin.campaignGoal', 'Campaign Goal')} *
                            </label>
                            <input
                                style={inputStyle}
                                type="number"
                                value={newCampaign.goal}
                                onChange={(e) => setNewCampaign({ ...newCampaign, goal: Number(e.target.value) })}
                                placeholder={adminText.zeroPlaceholder || '0'}
                                min="0"
                            />
                        </div>
                        <button
                            type="button"
                            className="admin-button"
                            onClick={handleAddCampaign}
                            disabled={isSaving}
                            style={{ opacity: isSaving ? 0.6 : 1 }}
                        >
                            {isSaving ? adminText.creating || 'Creating...' : (adminText.newCampaign || 'Create Campaign')}
                        </button>
                    </div>
                </div>
            )}

            {/* Campaigns List */}
            <div style={{ display: 'grid', gap: 12 }}>
                {campaignsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                        {adminText.noCampaignsYet || 'No campaigns yet. Create your first campaign!'}
                    </div>
                ) : (
                    campaignsList.map((campaign) => {
                        const progress = campaign.goal > 0 ? (campaign.raised / campaign.goal) * 100 : 0;
                        return (
                            <div key={campaign.id} style={{
                                padding: 16,
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                background: 'rgba(255,255,255,0.02)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 16 }}>{campaign.name}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
                                            {campaign.description}
                                        </div>
                                    </div>
                                    <span style={{
                                        padding: '4px 12px',
                                        background: getStatusColor(campaign.status),
                                        color: '#fff',
                                        borderRadius: 4,
                                        fontSize: 11,
                                        fontWeight: 700
                                    }}>
                                        {campaign.status}
                                    </span>
                                </div>

                                {/* Progress */}
                                <div style={{ marginBottom: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                                        <span style={{ color: 'var(--text-muted)' }}>${campaign.raised}/{campaign.goal}</span>
                                        <span style={{ fontWeight: 700 }}>{Math.round(progress)}%</span>
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        height: 6,
                                        background: 'rgba(255,255,255,0.1)',
                                        borderRadius: 3,
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${progress}%`,
                                            height: '100%',
                                            background: getStatusColor(campaign.status),
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>
                                </div>

                                {/* Dates and Delete */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                                        <div>Start: {campaign.startDate || 'Not set'}</div>
                                        <div>End: {campaign.endDate || 'Not set'}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteCampaign(campaign.id)}
                                        style={{
                                            padding: '6px 12px',
                                            background: '#F44336',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 4,
                                            fontSize: 11,
                                            cursor: 'pointer',
                                            fontWeight: 600
                                        }}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
