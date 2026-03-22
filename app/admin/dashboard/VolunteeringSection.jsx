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
    adminRemoveSignup,
    adminPreAssignVolunteer,
} from '@/lib/volunteeringApi.js';
import { getVolunteeringSettings } from '@/lib/settingsApi.js';

const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const POLL_INTERVAL_MS = 5000;

const MAX_CAP_ICONS = 15;
const AVATAR_COLORS = ['#6c63ff', '#3273dc', '#48c78e', '#e8a44a', '#00d1b2', '#e76f51', '#a78bfa'];

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return (parts[0][0] || '?').toUpperCase();
    return ((parts[0][0] || '') + (parts[parts.length - 1][0] || '')).toUpperCase();
}

function CapacityAvatars({ signups, cap, maxShow = MAX_CAP_ICONS }) {
    const active = (signups || []).filter((s) => s.status === 'signed_up');
    const filled = active.length;
    const isUnlimited = !(cap > 0);
    const empty = isUnlimited ? 0 : Math.max(0, cap - filled);
    const total = filled + empty;
    const visibleFilled = total > maxShow ? Math.min(filled, maxShow - 1) : filled;
    const visibleEmpty = total > maxShow ? Math.max(0, maxShow - 1 - visibleFilled) : empty;
    const overflow = total - visibleFilled - visibleEmpty;
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
            {active.slice(0, visibleFilled).map((su, i) => (
                <div
                    key={su.id}
                    title={su.donor?.name || 'Volunteer'}
                    style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                        color: '#fff', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0,
                        cursor: 'default', userSelect: 'none',
                    }}
                >
                    {getInitials(su.donor?.name)}
                </div>
            ))}
            {Array.from({ length: visibleEmpty }).map((_, i) => (
                <div
                    key={`e-${i}`}
                    style={{
                        width: 28, height: 28, borderRadius: '50%',
                        border: '1.5px dashed rgba(160,170,200,.22)',
                        background: 'rgba(160,170,200,.04)', flexShrink: 0,
                    }}
                />
            ))}
            {overflow > 0 && (
                <span style={{ fontSize: 11, color: 'rgba(160,170,200,.85)', fontWeight: 700, marginLeft: 1 }}>+{overflow}</span>
            )}
            {isUnlimited && filled === 0 && (
                <span style={{ fontSize: 11, color: 'rgba(160,170,200,.72)' }}>No signups yet</span>
            )}
            {isUnlimited && filled > 0 && (
                <span style={{ fontSize: 11, color: 'rgba(160,170,200,.72)', marginLeft: 2 }}>∞</span>
            )}
            {!isUnlimited && (
                <span style={{ fontSize: 10, color: 'rgba(160,170,200,.75)', marginLeft: 3 }}>
                    {filled}/{cap}
                </span>
            )}
        </div>
    );
}

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

    // Donor-facing feature settings (for informational banner only)
    const [donorSettings, setDonorSettings] = useState(null);
    useEffect(() => {
        getVolunteeringSettings().then(setDonorSettings).catch(() => {});
    }, []);

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
    // Pre-assign form: scheduleId → email string / error string
    const [preAssignEmail, setPreAssignEmail] = useState({});
    const [preAssignError, setPreAssignError] = useState({});
    const [preAssignSaving, setPreAssignSaving] = useState('');

    // ── Discussion ──
    const [discussionMsg, setDiscussionMsg] = useState('');
    const [discussionSending, setDiscussionSending] = useState(false);
    const [discussionError, setDiscussionError] = useState('');
    const discussionEndRef = useRef(null);
    const selectedIdRef = useRef(null);
    const [showUnscheduled, setShowUnscheduled] = useState(false);

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
        selectedIdRef.current = id;
        try {
            const res = await adminGetActivity(id);
            setSelected(res);
        } finally {
            setDetailLoading(false);
        }
    };

    const refreshSelected = async () => {
        if (!selectedIdRef.current) return;
        try {
            const res = await adminGetActivity(selectedIdRef.current);
            setSelected(res);
        } catch { /* silent */ }
    };

    // ── Auto-poll while detail view is open ──
    useEffect(() => {
        if (!selected) return;
        selectedIdRef.current = selected.id;
        const timerId = setInterval(refreshSelected, POLL_INTERVAL_MS);
        return () => clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.id]);

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
    const handleRemoveSignup = async (scheduleId, signupId) => {
        if (!window.confirm('Remove this volunteer from the schedule?')) return;
        try {
            await adminRemoveSignup(selected.id, scheduleId, signupId);
            await refreshSelected();
        } catch (err) {
            window.alert(err.message || 'Failed to remove signup');
        }
    };

    const handlePreAssign = async (scheduleId) => {
        const email = (preAssignEmail[scheduleId] || '').trim();
        if (!email) return;
        setPreAssignSaving(scheduleId);
        setPreAssignError((prev) => ({ ...prev, [scheduleId]: '' }));
        try {
            await adminPreAssignVolunteer(selected.id, scheduleId, { donorEmail: email });
            setPreAssignEmail((prev) => ({ ...prev, [scheduleId]: '' }));
            await refreshSelected();
        } catch (err) {
            setPreAssignError((prev) => ({ ...prev, [scheduleId]: err.message || 'Failed' }));
        } finally {
            setPreAssignSaving('');
        }
    };

    // ── Original discussion handler ──
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
                        <button type="button" className="admin-button secondary" onClick={() => { setSelected(null); setExpandedScheduleSignups(null); selectedIdRef.current = null; }}>{ui.backToList}</button>
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
                                        <div className="mt-sm">
                                            <div className="admin-muted" style={{ fontSize: 11, marginBottom: 6 }}>Volunteers</div>
                                            <CapacityAvatars signups={sch.signups || []} cap={sch.maxVolunteers || selected.maxVolunteers} />
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
                                                            <th></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sch.signups?.map((su) => (
                                                            <tr key={su.id}>
                                                                <td>{su.donor?.name}</td>
                                                                <td>{su.donor?.email}</td>
                                                                <td><span className={`vol-status vol-status--${su.status}`}>{su.status}</span></td>
                                                                <td>{su.note || '—'}</td>
                                                                <td>
                                                                    <button
                                                                        type="button"
                                                                        className="admin-button danger"
                                                                        style={{ padding: '2px 8px', fontSize: 12 }}
                                                                        onClick={() => handleRemoveSignup(sch.id, su.id)}
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                            {/* Pre-assign a volunteer */}
                                            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                                                <div className="admin-muted" style={{ fontSize: 12, marginBottom: 6 }}>Pre-assign a volunteer by email:</div>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                                                    <input
                                                        className="admin-input"
                                                        style={{ ...inputStyle, flex: '1 1 200px' }}
                                                        type="email"
                                                        placeholder="donor@example.com"
                                                        value={preAssignEmail[sch.id] || ''}
                                                        onChange={(e) => setPreAssignEmail((prev) => ({ ...prev, [sch.id]: e.target.value }))}
                                                        onKeyDown={(e) => e.key === 'Enter' && handlePreAssign(sch.id)}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="admin-button"
                                                        disabled={preAssignSaving === sch.id}
                                                        onClick={() => handlePreAssign(sch.id)}
                                                    >
                                                        {preAssignSaving === sch.id ? 'Saving…' : 'Pre-assign'}
                                                    </button>
                                                </div>
                                                {preAssignError[sch.id] && (
                                                    <div className="banner banner--error" style={{ marginTop: 6, padding: '6px 10px', fontSize: 13 }}>
                                                        {preAssignError[sch.id]}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── All Registrants — grouped by schedule ── */}
                {allSignups.length > 0 && (
                    <div className="admin-card" style={cardStyle}>
                        <div className="admin-section-title mb-md">{ui.signups} ({allSignups.length})</div>
                        {(selected.schedules || []).map((sch) => {
                            const schSignups = (sch.signups || []);
                            if (schSignups.length === 0) return null;
                            const schCap = sch.maxVolunteers || selected.maxVolunteers;
                            return (
                                <div key={sch.id} style={{ marginBottom: 20 }}>
                                    {/* Schedule header */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', flexWrap: 'wrap',
                                        gap: 10, padding: '8px 10px', marginBottom: 8,
                                        background: 'rgba(255,255,255,.04)', borderRadius: 8,
                                        borderLeft: '3px solid rgba(100,130,255,.4)',
                                    }}>
                                        <span className={`vol-status vol-status--${sch.status}`} style={{ fontSize: 11 }}>{sch.status}</span>
                                        <span style={{ fontWeight: 600, fontSize: 13, color: '#e0e6ff' }}>{fmtDate(sch.scheduledAt)}</span>
                                        {sch.location && (
                                            <span className="admin-muted" style={{ fontSize: 12 }}>📍 {sch.location}</span>
                                        )}
                                        <div style={{ marginLeft: 'auto' }}>
                                            <CapacityAvatars signups={schSignups} cap={schCap} maxShow={10} />
                                        </div>
                                    </div>
                                    {/* Signups table for this schedule */}
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
                                            {schSignups.map((su) => (
                                                <tr key={su.id}>
                                                    <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{
                                                            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                                            background: AVATAR_COLORS[schSignups.indexOf(su) % AVATAR_COLORS.length],
                                                            color: '#fff', display: 'flex', alignItems: 'center',
                                                            justifyContent: 'center', fontSize: 9, fontWeight: 700,
                                                        }}>
                                                            {getInitials(su.donor?.name)}
                                                        </div>
                                                        {su.donor?.name}
                                                    </td>
                                                    <td>{su.donor?.email}</td>
                                                    <td><span className={`vol-status vol-status--${su.status}`}>{su.status}</span></td>
                                                    <td>{su.note || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ── Discussion ── */}
                <div className="admin-card" style={cardStyle}>
                    <div className="admin-inline admin-inline--between mb-md">
                        <div className="admin-section-title">{ui.discussion}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span className="admin-muted" style={{ fontSize: 12 }}>
                                {selected.discussions?.length ?? 0} message{(selected.discussions?.length ?? 0) !== 1 ? 's' : ''}
                            </span>
                            <button type="button" className="admin-button secondary" style={{ padding: '4px 10px', fontSize: 12 }} onClick={refreshSelected} title="Refresh messages">↻</button>
                        </div>
                    </div>
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
            {donorSettings && !donorSettings.volEnabled && (
                <div className="banner banner--warning mb-md" style={{ background: 'rgba(255,180,50,.12)', border: '1px solid rgba(255,180,50,.3)', borderRadius: 10, padding: '10px 16px', fontSize: 14, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span><strong>Volunteering is currently disabled for donors.</strong> Donors cannot see or access this module. Go to <em>Settings</em> to re-enable it.</span>
                </div>
            )}
            {donorSettings && donorSettings.volEnabled && (!donorSettings.volShowDiscussion || !donorSettings.volShowHistory || !donorSettings.volShowUnscheduled) && (
                <div className="banner mb-md" style={{ background: 'rgba(var(--accent-rgb, 100,160,255),.08)', border: '1px solid rgba(var(--accent-rgb, 100,160,255),.2)', borderRadius: 10, padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
                    <span>
                        Some donor sub-features are hidden:{' '}
                        {[!donorSettings.volShowDiscussion && 'Discussion', !donorSettings.volShowHistory && 'History', !donorSettings.volShowUnscheduled && 'Unscheduled'].filter(Boolean).join(', ')}.
                        {' '}Manage in <em>Settings</em>.
                    </span>
                </div>
            )}
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
            ) : (() => {
                const withSchedules = activities.filter((a) => (a.schedules?.length ?? 0) > 0);
                const withoutSchedules = activities.filter((a) => (a.schedules?.length ?? 0) === 0);
                const actRow = (act) => (
                    <div key={act.id} className="vol-activity-row" onClick={() => openActivity(act.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openActivity(act.id)}>
                        <div className="vol-activity-info" style={{ flex: 1 }}>
                            <div className="vol-activity-title">{act.title}</div>
                            <div className="admin-muted" style={{ fontSize: 12, marginTop: 2 }}>
                                {act.recurrenceNote || act.recurrenceType}
                            </div>
                            {/* Per-schedule chips */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                                {(act.schedules || []).map((sch) => {
                                    const schFilled = sch._count?.signups ?? sch.signups?.length ?? 0;
                                    const schCap = sch.maxVolunteers || act.maxVolunteers;
                                    const full = schCap > 0 && schFilled >= schCap;
                                    return (
                                        <span key={sch.id} className={`vol-status vol-status--${full ? 'cancelled' : sch.status}`}
                                            style={{ fontSize: 11, fontWeight: 400, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            {fmtDate(sch.scheduledAt)}
                                            {schCap > 0
                                                ? <strong style={{ fontWeight: 700 }}>{schFilled}/{schCap}</strong>
                                                : schFilled > 0 && <strong style={{ fontWeight: 700 }}>{schFilled}</strong>}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                        <span className={`vol-status vol-status--${act.isActive ? 'active' : 'inactive'}`} style={{ flexShrink: 0 }}>
                            {act.isActive ? ui.statusActive : ui.statusInactive}
                        </span>
                    </div>
                );
                return (
                    <>
                        {withSchedules.length > 0 && (
                            <div className="vol-activity-list">
                                {withSchedules.map(actRow)}
                            </div>
                        )}
                        {withoutSchedules.length > 0 && (
                            <div style={{ marginTop: withSchedules.length > 0 ? 20 : 0, borderTop: withSchedules.length > 0 ? '1px solid rgba(255,255,255,.08)' : 'none', paddingTop: withSchedules.length > 0 ? 14 : 0 }}>
                                <button
                                    type="button"
                                    className="admin-button secondary"
                                    style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
                                    onClick={() => setShowUnscheduled((v) => !v)}
                                >
                                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ transition: 'transform .2s', transform: showUnscheduled ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                                        <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    Not Yet Scheduled
                                    <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,.08)', borderRadius: 999, padding: '1px 7px' }}>{withoutSchedules.length}</span>
                                </button>
                                {showUnscheduled && (
                                    <div className="vol-activity-list" style={{ marginTop: 12 }}>
                                        {withoutSchedules.map((act) => (
                                            <div key={act.id} className="vol-activity-row" onClick={() => openActivity(act.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && openActivity(act.id)}>
                                                <div className="vol-activity-info">
                                                    <div className="vol-activity-title">{act.title}</div>
                                                    <div className="admin-muted">
                                                        {act.recurrenceNote || act.recurrenceType}
                                                        {' · '}
                                                        <span className="vol-status vol-status--inactive" style={{ fontSize: '0.7rem' }}>No schedules yet</span>
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
                        )}
                    </>
                );
            })()}
        </div>
    );
}
