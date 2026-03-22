'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FEATURES } from '@/constants/features.js';
import {
    adminListActivities,
    adminGetActivity,
    adminCreateActivity,
    adminUpdateActivity,
    adminDeactivateActivity,
    adminReactivateActivity,
    adminDeleteActivity,
    adminAddSchedule,
    adminUpdateSchedule,
    adminDeleteSchedule,
    adminPostDiscussion,
} from '@/lib/volunteeringApi.js';

const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const emptyForm = {
    title: '',
    description: '',
    skills: '',
    recurrenceType: 'none',
    recurrenceNote: '',
    maxVolunteers: 0,
};

const emptyScheduleForm = {
    scheduledAt: '',
    location: '',
    notes: '',
    maxVolunteers: '',
};

export default function VolunteeringSection({ cardStyle, inputStyle, adminId, adminName, adminText: t }) {
    if (!FEATURES.VOLUNTEERING) return null;

    const ui = {
        title: t?.volunteeringTitle || 'Volunteering Activities',
        createActivity: t?.createActivity || 'Create Activity',
        editActivity: t?.editActivity || 'Edit Activity',
        activityTitle: t?.activityTitle || 'Title',
        activityDescription: t?.activityDescription || 'Description',
        activitySkills: t?.activitySkills || 'Skills (comma-separated tags)',
        recurrenceType: t?.recurrenceType || 'Recurrence',
        recurrenceNote: t?.recurrenceNote || 'Recurrence note (e.g. Every Friday)',
        maxVolunteers: t?.maxVolunteers || 'Max volunteers (0 = unlimited)',
        addSchedule: t?.addSchedule || 'Add Schedule',
        scheduledAt: t?.scheduledAt || 'Date & Time',
        location: t?.scheduleLocation || 'Location',
        scheduleNotes: t?.scheduleNotes || 'Notes',
        scheduleMaxVol: t?.scheduleMaxVol || 'Override max volunteers',
        signups: t?.signups || 'Signups',
        discussion: t?.discussion || 'Discussion',
        postMessage: t?.postMessage || 'Post',
        messagePlaceholder: t?.messagePlaceholder || 'Write a message…',
        deactivate: t?.deactivateActivity || 'Deactivate',
        reactivate: t?.reactivateActivity || 'Re-activate',
        deleteActivity: t?.deleteActivity || 'Delete permanently',
        deleteActivityConfirm: t?.deleteActivityConfirm || 'Permanently delete this activity? All schedules, signups, and messages will be removed and cannot be recovered.',
        backToList: t?.backToList || '← Back',
        saveActivity: t?.saveActivity || 'Save',
        cancel: t?.cancel || 'Cancel',
        noActivities: t?.noActivities || 'No activities yet.',
        statusUpcoming: t?.statusUpcoming || 'Upcoming',
        statusCompleted: t?.statusCompleted || 'Completed',
        statusCancelled: t?.statusCancelled || 'Cancelled',
        statusActive: t?.statusActive || 'Active',
        statusInactive: t?.statusInactive || 'Inactive',
        markCompleted: t?.markCompleted || 'Mark completed',
        markUpcoming: t?.markUpcoming || 'Mark as upcoming',
        restoreSchedule: t?.restoreSchedule || 'Restore',
        cancelSchedule: t?.cancelSchedule || 'Cancel schedule',
        deleteSchedule: t?.deleteSchedule || 'Delete',
        editSchedule: t?.editSchedule || 'Edit',
        saving: t?.saving || 'Saving…',
        viewSignups: t?.viewSignups || 'View signups',
        donorName: t?.donorName || 'Donor',
        donorEmail: t?.donorEmail || 'Email',
        signupStatus: t?.signupStatus || 'Status',
        note: t?.note || 'Note',
        noSignups: t?.noSignups || 'No signups yet.',
    };

    // ── List view state ──
    const [activities, setActivities] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [includeInactive, setIncludeInactive] = useState(false);

    // ── Detail view state ──
    const [selected, setSelected] = useState(null); // full activity object
    const [detailLoading, setDetailLoading] = useState(false);

    // ── Form state ──
    const [showForm, setShowForm] = useState(false);
    const [editingActivity, setEditingActivity] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [formSaving, setFormSaving] = useState(false);
    const [formError, setFormError] = useState('');

    // ── Schedule form ──
    const [showScheduleForm, setShowScheduleForm] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [scheduleForm, setScheduleForm] = useState(emptyScheduleForm);
    const [scheduleSaving, setScheduleSaving] = useState(false);
    const [scheduleError, setScheduleError] = useState('');

    // ── Expanded schedule signups (inline toggle) ──
    const [expandedScheduleSignups, setExpandedScheduleSignups] = useState(null);

    // ── Discussion ──
    const [discussionMsg, setDiscussionMsg] = useState('');
    const [discussionSending, setDiscussionSending] = useState(false);
    const [discussionError, setDiscussionError] = useState('');
    const discussionEndRef = useRef(null);

    // ── Load list ──
    const loadList = useCallback(async () => {
        setListLoading(true);
        setListError('');
        try {
            const res = await adminListActivities({ includeInactive: includeInactive ? 'true' : 'false', limit: 100 });
            setActivities(res?.items || []);
        } catch (err) {
            setListError(err.message || 'Failed to load activities');
        } finally {
            setListLoading(false);
        }
    }, [includeInactive]);

    useEffect(() => { loadList(); }, [loadList]);

    // ── Load detail ──
    const openActivity = async (id) => {
        setDetailLoading(true);
        setSelected(null);
        setExpandedScheduleSignups(null);
        try {
            const res = await adminGetActivity(id);
            setSelected(res);
        } finally {
            setDetailLoading(false);
        }
    };

    const refreshSelected = async () => {
        if (!selected) return;
        const res = await adminGetActivity(selected.id);
        setSelected(res);
    };

    // ── Open form for create/edit ──
    const openCreateForm = () => {
        setEditingActivity(null);
        setForm(emptyForm);
        setFormError('');
        setShowForm(true);
    };

    const openEditForm = (activity) => {
        setEditingActivity(activity);
        setForm({
            title: activity.title,
            description: activity.description,
            skills: activity.skills || '',
            recurrenceType: activity.recurrenceType,
            recurrenceNote: activity.recurrenceNote || '',
            maxVolunteers: activity.maxVolunteers,
        });
        setFormError('');
        setShowForm(true);
    };

    const handleFormSave = async (e) => {
        e.preventDefault();
        setFormSaving(true);
        setFormError('');
        try {
            const payload = {
                title: form.title,
                description: form.description,
                skills: form.skills || undefined,
                recurrenceType: form.recurrenceType,
                recurrenceNote: form.recurrenceNote || undefined,
                maxVolunteers: Number(form.maxVolunteers) || 0,
            };
            if (editingActivity) {
                await adminUpdateActivity(editingActivity.id, payload);
                if (selected?.id === editingActivity.id) await refreshSelected();
            } else {
                await adminCreateActivity(payload);
            }
            setShowForm(false);
            loadList();
        } catch (err) {
            setFormError(err.message || 'Save failed');
        } finally {
            setFormSaving(false);
        }
    };

    const handleDeactivate = async (id) => {
        if (!window.confirm('Deactivate this activity? Donors will no longer see it.')) return;
        await adminDeactivateActivity(id);
        loadList();
        if (selected?.id === id) await refreshSelected();
    };

    const handleReactivate = async (id) => {
        if (!window.confirm('Re-activate this activity? It will become visible to donors again.')) return;
        await adminReactivateActivity(id);
        loadList();
        if (selected?.id === id) await refreshSelected();
    };

    const handleDeleteActivity = async (id) => {
        if (!window.confirm(ui.deleteActivityConfirm)) return;
        await adminDeleteActivity(id);
        loadList();
        setSelected(null);
    };

    // ── Schedule handlers ──
    const openAddSchedule = () => {
        setEditingSchedule(null);
        setScheduleForm(emptyScheduleForm);
        setScheduleError('');
        setShowScheduleForm(true);
    };

    const openEditSchedule = (sch) => {
        setEditingSchedule(sch);
        setScheduleForm({
            scheduledAt: sch.scheduledAt ? new Date(sch.scheduledAt).toISOString().slice(0, 16) : '',
            location: sch.location,
            notes: sch.notes || '',
            maxVolunteers: sch.maxVolunteers ?? '',
        });
        setScheduleError('');
        setShowScheduleForm(true);
    };

    const handleScheduleSave = async (e) => {
        e.preventDefault();
        setScheduleSaving(true);
        setScheduleError('');
        try {
            const payload = {
                scheduledAt: new Date(scheduleForm.scheduledAt).toISOString(),
                location: scheduleForm.location,
                notes: scheduleForm.notes || undefined,
                maxVolunteers: scheduleForm.maxVolunteers ? Number(scheduleForm.maxVolunteers) : undefined,
            };
            if (editingSchedule) {
                await adminUpdateSchedule(selected.id, editingSchedule.id, payload);
            } else {
                await adminAddSchedule(selected.id, payload);
            }
            setShowScheduleForm(false);
            await refreshSelected();
        } catch (err) {
            setScheduleError(err.message || 'Save failed');
        } finally {
            setScheduleSaving(false);
        }
    };

    const handleDeleteSchedule = async (scheduleId) => {
        if (!window.confirm('Delete this schedule? All signups for it will also be removed.')) return;
        await adminDeleteSchedule(selected.id, scheduleId);
        await refreshSelected();
    };

    const handleMarkScheduleStatus = async (scheduleId, status) => {
        await adminUpdateSchedule(selected.id, scheduleId, { status });
        await refreshSelected();
    };

    // ── Discussion handler ──
    const handlePostDiscussion = async (e) => {
        e.preventDefault();
        if (!discussionMsg.trim()) return;
        setDiscussionSending(true);
        setDiscussionError('');
        try {
            await adminPostDiscussion(selected.id, discussionMsg.trim());
            setDiscussionMsg('');
            await refreshSelected();
            setTimeout(() => discussionEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (err) {
            setDiscussionError(err.message || 'Failed to post');
        } finally {
            setDiscussionSending(false);
        }
    };

    // ── Render ──

    // Modal: create / edit activity form
    if (showForm) {
        return (
            <div className="vol-modal-overlay">
                <div className="vol-modal" style={cardStyle}>
                    <div className="vol-modal-header">
                        <h2 className="admin-section-title">{editingActivity ? ui.editActivity : ui.createActivity}</h2>
                        <button type="button" className="vol-close-btn" onClick={() => setShowForm(false)}>✕</button>
                    </div>
                    {formError ? <div className="banner banner--error">{formError}</div> : null}
                    <form onSubmit={handleFormSave} className="vol-form">
                        <label className="vol-label">{ui.activityTitle} *
                            <input className="admin-input" style={inputStyle} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
                        </label>
                        <label className="vol-label">{ui.activityDescription} *
                            <textarea className="admin-input vol-textarea" style={inputStyle} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required rows={4} />
                        </label>
                        <label className="vol-label">{ui.activitySkills}
                            <input className="admin-input" style={inputStyle} value={form.skills} onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))} placeholder="e.g. driving, cooking, IT" />
                        </label>
                        <div className="vol-row">
                            <label className="vol-label">{ui.recurrenceType}
                                <select className="admin-input" style={inputStyle} value={form.recurrenceType} onChange={(e) => setForm((f) => ({ ...f, recurrenceType: e.target.value }))}>
                                    <option value="none">One-time</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="custom">Custom</option>
                                </select>
                            </label>
                            <label className="vol-label">{ui.recurrenceNote}
                                <input className="admin-input" style={inputStyle} value={form.recurrenceNote} onChange={(e) => setForm((f) => ({ ...f, recurrenceNote: e.target.value }))} />
                            </label>
                        </div>
                        <label className="vol-label">{ui.maxVolunteers}
                            <input type="number" min="0" className="admin-input" style={inputStyle} value={form.maxVolunteers} onChange={(e) => setForm((f) => ({ ...f, maxVolunteers: e.target.value }))} />
                        </label>
                        <div className="vol-form-actions">
                            <button type="button" className="admin-button secondary" onClick={() => setShowForm(false)}>{ui.cancel}</button>
                            <button type="submit" className="admin-button" disabled={formSaving}>{formSaving ? ui.saving : ui.saveActivity}</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // Modal: add / edit schedule form
    if (showScheduleForm && selected) {
        return (
            <div className="vol-modal-overlay">
                <div className="vol-modal" style={cardStyle}>
                    <div className="vol-modal-header">
                        <h2 className="admin-section-title">{editingSchedule ? ui.editSchedule : ui.addSchedule}</h2>
                        <button type="button" className="vol-close-btn" onClick={() => setShowScheduleForm(false)}>✕</button>
                    </div>
                    {scheduleError ? <div className="banner banner--error">{scheduleError}</div> : null}
                    <form onSubmit={handleScheduleSave} className="vol-form">
                        <label className="vol-label">{ui.scheduledAt} *
                            <input type="datetime-local" className="admin-input" style={inputStyle} value={scheduleForm.scheduledAt} onChange={(e) => setScheduleForm((f) => ({ ...f, scheduledAt: e.target.value }))} required />
                        </label>
                        <label className="vol-label">{ui.location}
                            <input className="admin-input" style={inputStyle} value={scheduleForm.location} onChange={(e) => setScheduleForm((f) => ({ ...f, location: e.target.value }))} placeholder="Optional — e.g. Main hall, Room 3" />
                        </label>
                        <label className="vol-label">{ui.scheduleNotes}
                            <textarea className="admin-input vol-textarea" style={inputStyle} value={scheduleForm.notes} onChange={(e) => setScheduleForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
                        </label>
                        <label className="vol-label">{ui.scheduleMaxVol}
                            <input type="number" min="1" className="admin-input" style={inputStyle} value={scheduleForm.maxVolunteers} onChange={(e) => setScheduleForm((f) => ({ ...f, maxVolunteers: e.target.value }))} placeholder="Leave blank to use activity default" />
                        </label>
                        <div className="vol-form-actions">
                            <button type="button" className="admin-button secondary" onClick={() => setShowScheduleForm(false)}>{ui.cancel}</button>
                            <button type="submit" className="admin-button" disabled={scheduleSaving}>{scheduleSaving ? ui.saving : ui.saveActivity}</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    // Detail view
    if (selected || detailLoading) {
        if (detailLoading) return <div className="admin-card" style={cardStyle}><div className="admin-muted">Loading…</div></div>;

        const allSignups = (selected.schedules || []).flatMap((sch) =>
            (sch.signups || []).map((su) => ({ ...su, schedule: sch }))
        );

        return (
            <div className="admin-stack admin-stack--xl">
                {/* ── Activity header & schedules ── */}
                <div className="admin-card" style={cardStyle}>
                    <div className="admin-inline admin-inline--between admin-inline--wrap mb-md">
                        <button type="button" className="admin-button secondary" onClick={() => { setSelected(null); setExpandedScheduleSignups(null); }}>{ui.backToList}</button>
                        <div className="vol-action-row">
                            <button type="button" className="admin-button secondary" onClick={() => openEditForm(selected)}>{ui.editActivity}</button>
                            {selected.isActive ? (
                                <button type="button" className="admin-button secondary" onClick={() => handleDeactivate(selected.id)}>{ui.deactivate}</button>
                            ) : (
                                <button type="button" className="admin-button" onClick={() => handleReactivate(selected.id)}>{ui.reactivate}</button>
                            )}
                            <button type="button" className="admin-button danger" onClick={() => handleDeleteActivity(selected.id)}>{ui.deleteActivity}</button>
                        </div>
                    </div>

                    <h2 className="admin-section-title">{selected.title}</h2>
                    <p className="admin-muted mb-md">{selected.description}</p>

                    {selected.skills && (
                        <div className="vol-tags mb-md">
                            {selected.skills.split(',').map((s) => s.trim()).filter(Boolean).map((tag) => (
                                <span key={tag} className="vol-tag">{tag}</span>
                            ))}
                        </div>
                    )}

                    <div className="admin-grid admin-grid--4cols mb-md">
                        <div className="admin-stat"><div className="admin-muted">Recurrence</div><div className="admin-value-md">{selected.recurrenceNote || selected.recurrenceType}</div></div>
                        <div className="admin-stat"><div className="admin-muted">Max volunteers</div><div className="admin-value-md">{selected.maxVolunteers === 0 ? 'Unlimited' : selected.maxVolunteers}</div></div>
                        <div className="admin-stat"><div className="admin-muted">Status</div><div className="admin-value-md">{selected.isActive ? ui.statusActive : ui.statusInactive}</div></div>
                        <div className="admin-stat"><div className="admin-muted">Total signups</div><div className="admin-value-md">{allSignups.length}</div></div>
                    </div>

                    <div className="vol-section-header mb-sm">
                        <span className="admin-section-title" style={{ fontSize: '1rem' }}>Schedules</span>
                        <button type="button" className="admin-button" onClick={openAddSchedule}>{ui.addSchedule}</button>
                    </div>

                    {(selected.schedules?.length ?? 0) === 0 ? (
                        <div className="admin-muted mb-md">No schedules yet.</div>
                    ) : (
                        <div className="vol-schedule-list mb-md">
                            {selected.schedules?.map((sch) => (
                                <div key={sch.id} className="vol-schedule-card">
                                    <div className="vol-schedule-info">
                                        <div className="vol-schedule-date">{fmtDate(sch.scheduledAt)}</div>
                                        <div className="admin-muted">{sch.location}</div>
                                        {sch.notes && <div className="admin-muted mt-sm">{sch.notes}</div>}
                                        <div className="admin-muted mt-sm">
                                            Signups: {sch.signups?.length ?? 0}
                                            {(sch.maxVolunteers || selected.maxVolunteers > 0) && ` / ${sch.maxVolunteers || selected.maxVolunteers}`}
                                        </div>
                                    </div>
                                    <div className="vol-schedule-actions">
                                        <span className={`vol-status vol-status--${sch.status}`}>{sch.status}</span>
                                        {sch.status === 'upcoming' && (
                                            <>
                                                <button type="button" className="admin-button secondary" onClick={() => openEditSchedule(sch)}>{ui.editSchedule}</button>
                                                <button type="button" className="admin-button secondary" onClick={() => handleMarkScheduleStatus(sch.id, 'completed')}>{ui.markCompleted}</button>
                                                <button type="button" className="admin-button secondary" onClick={() => handleMarkScheduleStatus(sch.id, 'cancelled')}>{ui.cancelSchedule}</button>
                                            </>
                                        )}
                                        {sch.status === 'completed' && (
                                            <>
                                                <button type="button" className="admin-button secondary" onClick={() => handleMarkScheduleStatus(sch.id, 'upcoming')}>{ui.markUpcoming}</button>
                                                <button type="button" className="admin-button secondary" onClick={() => handleMarkScheduleStatus(sch.id, 'cancelled')}>{ui.cancelSchedule}</button>
                                            </>
                                        )}
                                        {sch.status === 'cancelled' && (
                                            <>
                                                <button type="button" className="admin-button secondary" onClick={() => handleMarkScheduleStatus(sch.id, 'upcoming')}>{ui.restoreSchedule}</button>
                                                <button type="button" className="admin-button secondary" onClick={() => handleMarkScheduleStatus(sch.id, 'completed')}>{ui.markCompleted}</button>
                                            </>
                                        )}
                                        <button type="button" className="admin-button danger" onClick={() => handleDeleteSchedule(sch.id)}>{ui.deleteSchedule}</button>
                                        <button
                                            type="button"
                                            className="admin-button secondary"
                                            onClick={() => setExpandedScheduleSignups(expandedScheduleSignups === sch.id ? null : sch.id)}
                                        >
                                            {expandedScheduleSignups === sch.id ? 'Hide registrants' : `${ui.viewSignups} (${sch.signups?.length ?? 0})`}
                                        </button>
                                    </div>
                                    {expandedScheduleSignups === sch.id && (
                                        <div className="vol-registrants mt-sm">
                                            {(sch.signups?.length ?? 0) === 0 ? (
                                                <div className="admin-muted">{ui.noSignups}</div>
                                            ) : (
                                                <table className="vol-table vol-table--compact">
                                                    <thead>
                                                        <tr>
                                                            <th>{ui.donorName}</th>
                                                            <th>{ui.donorEmail}</th>
                                                            <th>{ui.signupStatus}</th>
                                                            <th>{ui.note}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sch.signups?.map((su) => (
                                                            <tr key={su.id}>
                                                                <td>{su.donor?.name}</td>
                                                                <td>{su.donor?.email}</td>
                                                                <td><span className={`vol-status vol-status--${su.status}`}>{su.status}</span></td>
                                                                <td>{su.note || '—'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── All Registrants ── */}
                {allSignups.length > 0 && (
                    <div className="admin-card" style={cardStyle}>
                        <div className="admin-section-title mb-md">{ui.signups} ({allSignups.length})</div>
                        <table className="vol-table">
                            <thead>
                                <tr>
                                    <th>{ui.donorName}</th>
                                    <th>{ui.donorEmail}</th>
                                    <th>{ui.scheduledAt}</th>
                                    <th>{ui.signupStatus}</th>
                                    <th>{ui.note}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allSignups.map((s) => (
                                    <tr key={s.id}>
                                        <td>{s.donor?.name}</td>
                                        <td>{s.donor?.email}</td>
                                        <td>{fmtDate(s.schedule?.scheduledAt)}</td>
                                        <td><span className={`vol-status vol-status--${s.status}`}>{s.status}</span></td>
                                        <td>{s.note || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── Discussion ── */}
                <div className="admin-card" style={cardStyle}>
                    <div className="admin-section-title mb-md">{ui.discussion}</div>
                    <div className="vol-discussion-list mb-md">
                        {selected.discussions?.length === 0 && <div className="admin-muted">No messages yet.</div>}
                        {selected.discussions?.map((msg) => (
                            <div key={msg.id} className={`vol-msg vol-msg--${msg.authorType}`}>
                                <div className="vol-msg-author">
                                    <strong>{msg.authorName}</strong>
                                    <span className={`vol-badge vol-badge--${msg.authorType}`}>{msg.authorType}</span>
                                    <span className="admin-muted">{fmtDate(msg.createdAt)}</span>
                                </div>
                                <div className="vol-msg-body">{msg.message}</div>
                            </div>
                        ))}
                        <div ref={discussionEndRef} />
                    </div>
                    {discussionError && <div className="banner banner--error mb-sm">{discussionError}</div>}
                    <form onSubmit={handlePostDiscussion} className="vol-discussion-form">
                        <input
                            className="admin-input"
                            style={inputStyle}
                            value={discussionMsg}
                            onChange={(e) => setDiscussionMsg(e.target.value)}
                            placeholder={ui.messagePlaceholder}
                        />
                        <button type="submit" className="admin-button" disabled={discussionSending || !discussionMsg.trim()}>{ui.postMessage}</button>
                    </form>
                </div>
            </div>
        );
    }

    // List view
    return (
        <div className="admin-card" style={cardStyle}>
            <div className="admin-inline admin-inline--between admin-inline--wrap mb-md">
                <div>
                    <div className="admin-section-title">{ui.title}</div>
                </div>
                <div className="vol-action-row">
                    <label className="vol-toggle-label">
                        <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
                        Show inactive
                    </label>
                    <button type="button" className="admin-button" onClick={openCreateForm}>{ui.createActivity}</button>
                </div>
            </div>

            {listError && <div className="banner banner--error mb-md">{listError}</div>}

            {listLoading ? (
                <div className="admin-muted">Loading…</div>
            ) : activities.length === 0 ? (
                <div className="admin-item">{ui.noActivities}</div>
            ) : (
                <div className="vol-activity-list">
                    {activities.map((act) => (
                        <div key={act.id} className="vol-activity-row" onClick={() => openActivity(act.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openActivity(act.id)}>
                            <div className="vol-activity-info">
                                <div className="vol-activity-title">{act.title}</div>
                                <div className="admin-muted">
                                    {act.recurrenceNote || act.recurrenceType}
                                    {' · '}
                                    {act.schedules?.length || 0} schedule(s)
                                    {' · '}
                                    {act._count?.signups || 0} signup(s)
                                </div>
                            </div>
                            <span className={`vol-status vol-status--${act.isActive ? 'active' : 'inactive'}`}>
                                {act.isActive ? ui.statusActive : ui.statusInactive}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
