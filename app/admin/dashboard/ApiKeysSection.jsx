'use client';

import { useEffect, useMemo, useState } from 'react';
import { createApiKey, deleteApiKey, listApiKeys, updateApiKey } from '@/lib/adminApi.js';

export default function ApiKeysSection({ cardStyle, inputStyle, isActive }) {
    const [apiKeys, setApiKeys] = useState([]);
    const [title, setTitle] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [generatedKey, setGeneratedKey] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ title: '', isActive: true });

    async function loadKeys() {
        setLoading(true);
        setError('');
        try {
            const data = await listApiKeys();
            setApiKeys(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(err?.message || 'Unable to load API keys.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (isActive) {
            loadKeys();
        }
    }, [isActive]);

    const sortedKeys = useMemo(
        () => [...apiKeys].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        [apiKeys]
    );

    async function handleCreate(event) {
        event.preventDefault();
        if (!title.trim()) {
            setError('Title is required.');
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');
        setGeneratedKey('');
        try {
            const response = await createApiKey({ title: title.trim() });
            setTitle('');
            setGeneratedKey(response?.generatedKey || '');
            setMessage('API key created. Copy it now because it will not be shown again.');
            await loadKeys();
        } catch (err) {
            setError(err?.message || 'Unable to create API key.');
        } finally {
            setSaving(false);
        }
    }

    function startEditing(item) {
        setEditingId(item.id);
        setEditForm({ title: item.title || '', isActive: item.isActive !== false });
        setError('');
        setMessage('');
    }

    function stopEditing() {
        setEditingId(null);
        setEditForm({ title: '', isActive: true });
    }

    async function handleUpdate(id) {
        if (!editForm.title.trim()) {
            setError('Title is required.');
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');
        try {
            const updated = await updateApiKey(id, {
                title: editForm.title.trim(),
                isActive: Boolean(editForm.isActive),
            });
            setApiKeys((prev) => prev.map((item) => (item.id === id ? updated : item)));
            setMessage('API key updated.');
            stopEditing();
        } catch (err) {
            setError(err?.message || 'Unable to update API key.');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        if (typeof window !== 'undefined' && !window.confirm('Delete this API key? This cannot be undone.')) {
            return;
        }

        setSaving(true);
        setError('');
        setMessage('');
        try {
            await deleteApiKey(id);
            setApiKeys((prev) => prev.filter((item) => item.id !== id));
            setMessage('API key deleted.');
            if (editingId === id) {
                stopEditing();
            }
        } catch (err) {
            setError(err?.message || 'Unable to delete API key.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <div style={{ display: 'grid', gap: 24 }}>
            <div style={cardStyle}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 16 }}>API Key Tools</div>
                <p style={{ color: 'var(--text-muted)', marginTop: 0, marginBottom: 20 }}>
                    Generate and manage API keys for external integrations. Full secrets are only shown once at creation time.
                </p>

                <form className="admin-form" onSubmit={handleCreate}>
                    <input
                        style={inputStyle}
                        placeholder="Key title"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                    />
                    <button type="submit" className="admin-button" disabled={saving}>
                        {saving ? 'Generating...' : 'Generate API key'}
                    </button>
                </form>

                {generatedKey ? (
                    <div style={{ marginTop: 16, padding: 16, borderRadius: 16, border: '1px solid var(--accent-gold)', background: 'rgba(186, 158, 58, 0.08)' }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>New API key</div>
                        <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 14 }}>{generatedKey}</div>
                    </div>
                ) : null}

                {error ? <div style={{ color: '#ff8f8f', marginTop: 16 }}>{error}</div> : null}
                {message ? <div style={{ color: 'var(--accent-gold)', marginTop: 16 }}>{message}</div> : null}
            </div>

            <div style={cardStyle}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 16 }}>Saved API keys</div>
                {loading ? <div style={{ color: 'var(--text-muted)' }}>Loading API keys...</div> : null}
                {!loading && sortedKeys.length === 0 ? (
                    <div className="admin-item">No API keys created yet.</div>
                ) : null}

                <div className="admin-list">
                    {sortedKeys.map((item) => {
                        const isEditing = editingId === item.id;
                        return (
                            <div key={item.id} className="admin-item">
                                {isEditing ? (
                                    <div className="admin-form">
                                        <input
                                            style={inputStyle}
                                            value={editForm.title}
                                            onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                                        />
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <input
                                                type="checkbox"
                                                checked={editForm.isActive}
                                                onChange={(event) => setEditForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                                            />
                                            Active
                                        </label>
                                        <div className="admin-actions">
                                            <button type="button" className="admin-button" disabled={saving} onClick={() => handleUpdate(item.id)}>Save</button>
                                            <button type="button" className="admin-button secondary" disabled={saving} onClick={stopEditing}>Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start' }}>
                                            <div>
                                                <div style={{ fontWeight: 700 }}>{item.title}</div>
                                                <div style={{ color: 'var(--text-muted)', marginTop: 6, fontFamily: 'monospace' }}>{item.keyPrefix}</div>
                                                <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>
                                                    Created {new Date(item.createdAt).toLocaleString()}
                                                </div>
                                                {item.createdByAdmin?.name ? (
                                                    <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>
                                                        By {item.createdByAdmin.name}
                                                    </div>
                                                ) : null}
                                            </div>
                                            <div style={{
                                                padding: '6px 10px',
                                                borderRadius: 999,
                                                background: item.isActive ? 'rgba(84, 214, 44, 0.12)' : 'rgba(255,255,255,0.08)',
                                                color: item.isActive ? '#7ddb56' : 'var(--text-muted)',
                                                fontSize: 12,
                                                fontWeight: 700,
                                            }}>
                                                {item.isActive ? 'Active' : 'Inactive'}
                                            </div>
                                        </div>
                                        <div className="admin-actions" style={{ marginTop: 16 }}>
                                            <button type="button" className="admin-button secondary" onClick={() => startEditing(item)}>Edit</button>
                                            <button type="button" className="admin-button secondary" onClick={() => handleDelete(item.id)}>Delete</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
