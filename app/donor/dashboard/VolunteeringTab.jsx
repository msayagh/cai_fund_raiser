'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FEATURES } from '@/constants/features.js';
import {
    donorListActivities,
    donorGetActivity,
    donorGetMySignups,
    donorSignUp,
    donorCancelSignup,
    donorPostDiscussion,
} from '@/lib/volunteeringApi.js';

const POLL_INTERVAL_MS = 5000; // refresh discussion every 5 s

const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

function VolIcon({ size = 17 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 11V6a2 2 0 0 0-4 0v5" />
            <path d="M14 10V4a2 2 0 0 0-4 0v6" />
            <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
            <path d="M6 14a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4v-1a2 2 0 0 0-2-2h-1" />
        </svg>
    );
}

function CalIcon({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="3" />
            <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
    );
}

function PinIcon({ size = 13 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 10c0 6-8 13-8 13S4 16 4 10a8 8 0 0 1 16 0Z" />
            <circle cx="12" cy="10" r="3" />
        </svg>
    );
}

function UsersIcon({ size = 13 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

function MsgIcon({ size = 15 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
    );
}

const MAX_CAP_ICONS = 15;
const SLOT_COLORS = ['#3273dc', '#6c63ff', '#e8a44a', '#00d1b2', '#e76f51', '#a78bfa', '#48c78e'];

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return (parts[0][0] || '?').toUpperCase();
    return ((parts[0][0] || '') + (parts[parts.length - 1][0] || '')).toUpperCase();
}

function CapacitySlots({ filled, cap, maxShow = MAX_CAP_ICONS, size = 28, mySignup, donorName }) {
    const isUnlimited = !(cap > 0);
    const iAmIn = mySignup?.status === 'signed_up';
    const empty = isUnlimited ? 0 : Math.max(0, cap - filled);
    const total = filled + empty;
    const visibleFilled = total > maxShow ? Math.min(filled, maxShow - 1) : filled;
    const visibleEmpty = total > maxShow ? Math.max(0, maxShow - 1 - visibleFilled) : empty;
    const overflow = total - visibleFilled - visibleEmpty;
    const iconSize = Math.round(size * 0.46);
    const fontSize = Math.round(size * 0.36);
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
            {Array.from({ length: visibleFilled }).map((_, i) => {
                const isMe = iAmIn && i === 0;
                return (
                    <div
                        key={`f-${i}`}
                        title={isMe ? donorName : 'Volunteer'}
                        style={{
                            width: size, height: size, borderRadius: '50%',
                            background: isMe ? SLOT_COLORS[0] : 'rgba(72,199,142,.13)',
                            border: isMe ? '1.5px solid ' + SLOT_COLORS[0] : '1.5px solid rgba(72,199,142,.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            color: isMe ? '#fff' : 'rgba(72,199,142,.85)',
                            fontSize, fontWeight: 700,
                            cursor: 'default', userSelect: 'none',
                        }}
                    >
                        {isMe ? getInitials(donorName) : (
                            <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                <circle cx="12" cy="7" r="4" />
                            </svg>
                        )}
                    </div>
                );
            })}
            {Array.from({ length: visibleEmpty }).map((_, i) => (
                <div key={`e-${i}`} style={{
                    width: size, height: size, borderRadius: '50%',
                    border: '1.5px dashed rgba(160,170,200,.18)',
                    background: 'rgba(160,170,200,.03)', flexShrink: 0,
                }} />
            ))}
            {overflow > 0 && (
                <span style={{ fontSize: fontSize - 1, color: 'var(--text-secondary)', fontWeight: 700 }}>+{overflow}</span>
            )}
            {isUnlimited && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {filled > 0 ? `${filled} joined` : 'Open'}
                </span>
            )}
            {!isUnlimited && total > 0 && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 1 }}>
                    {filled}/{cap}
                </span>
            )}
        </div>
    );
}

export default function VolunteeringTab({ donorId, donorName, ui: pageUi, volSettings }) {
    if (!FEATURES.VOLUNTEERING) return null;

    const {
        volShowDiscussion = true,
        volShowHistory = true,
        volShowUnscheduled = true,
    } = volSettings || {};

    const ui = {
        tabTitle: pageUi?.volunteeringTab || 'Volunteering',
        browseTitle: pageUi?.volBrowseTitle || 'Available Activities',
        mySignupsTitle: pageUi?.volMySignupsTitle || 'My Sign-ups',
        signUp: pageUi?.volSignUp || 'Sign up',
        cancelSignup: pageUi?.volCancelSignup || 'Cancel sign-up',
        discussion: pageUi?.volDiscussion || 'Discussion',
        postMessage: pageUi?.volPostMessage || 'Post',
        messagePlaceholder: pageUi?.volMsgPlaceholder || 'Write a message…',
        backToList: pageUi?.volBackToList || '← Back',
        noActivities: pageUi?.volNoActivities || 'No activities available right now.',
        noSignups: pageUi?.volNoSignups || "You haven't signed up for any activities yet.",
        schedulesFull: pageUi?.volSchedulesFull || 'Full',
        unlimited: pageUi?.volUnlimited || 'Unlimited',
        myStatus: pageUi?.volMyStatus || 'My status',
        loading: pageUi?.loading || 'Loading…',
        locationTbd: pageUi?.volLocationTbd || 'Location TBD',
        showHistory: pageUi?.volShowHistory || 'Show activity history',
        hideHistory: pageUi?.volHideHistory || 'Hide history',
        historyTitle: pageUi?.volHistoryTitle || 'Past Activities',
        noHistory: pageUi?.volNoHistory || 'No past activities found.',
    };

    // ── List / browse state ──
    const [view, setView] = useState('browse'); // 'browse' | 'mySignups'
    const [activities, setActivities] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [showUnscheduled, setShowUnscheduled] = useState(false);
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    // signupMap: { [scheduleId]: { status } } — for quick actions in browse list
    const [signupMap, setSignupMap] = useState({});

    // ── Detail state ──
    const [selected, setSelected] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');

    // ── My signups (for My Sign-ups tab) ──
    const [mySignups, setMySignups] = useState([]);
    const [mySignupsLoading, setMySignupsLoading] = useState(false);

    // ── Sign-up action ──
    const [signupLoading, setSignupLoading] = useState(''); // scheduleId being processed

    // ── Discussion ──
    const [discussionMsg, setDiscussionMsg] = useState('');
    const [discussionSending, setDiscussionSending] = useState(false);
    const [discussionError, setDiscussionError] = useState('');
    const discussionEndRef = useRef(null);
    const selectedIdRef = useRef(null);

    // ── Load activities + signup map in parallel ──
    const loadAll = useCallback(async () => {
        setListLoading(true);
        setListError('');
        try {
            const [activitiesRes, signupsRes] = await Promise.all([
                donorListActivities({ limit: 100 }),
                donorGetMySignups().catch(() => []),
            ]);
            setActivities(activitiesRes?.items || []);
            const map = {};
            for (const s of (signupsRes || [])) {
                if (s.schedule?.id) map[s.schedule.id] = { status: s.status };
            }
            setSignupMap(map);
        } catch (err) {
            setListError(err.message || 'Failed to load');
        } finally {
            setListLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    // ── Load history (inactive activities based on past signups) ──
    const toggleHistory = async () => {
        if (showHistory) { setShowHistory(false); return; }
        setShowHistory(true);
        if (history.length > 0) return; // already loaded
        setHistoryLoading(true);
        try {
            const signups = await donorGetMySignups();
            // Deduplicate activities that are either inactive or have only past schedules
            const seen = new Set();
            const past = [];
            for (const s of (signups || [])) {
                if (s.activity && !seen.has(s.activity.id)) {
                    seen.add(s.activity.id);
                    past.push(s.activity);
                }
            }
            setHistory(past);
        } finally {
            setHistoryLoading(false);
        }
    };

    // ── My signups (on-demand for My Sign-ups tab) ──
    const loadMySignups = async () => {
        setMySignupsLoading(true);
        try {
            const res = await donorGetMySignups();
            setMySignups(res || []);
        } finally {
            setMySignupsLoading(false);
        }
    };

    // ── Quick sign-up / cancel from browse list ──
    const quickSignUp = async (activityId, scheduleId) => {
        setSignupLoading(scheduleId);
        try {
            await donorSignUp(activityId, scheduleId, undefined);
            setSignupMap((prev) => ({ ...prev, [scheduleId]: { status: 'signed_up' } }));
            const res = await donorListActivities({ limit: 100 });
            setActivities(res?.items || []);
        } catch (err) {
            setListError(err.message || 'Sign-up failed');
        } finally {
            setSignupLoading('');
        }
    };

    const quickCancel = async (activityId, scheduleId) => {
        setSignupLoading(scheduleId);
        try {
            await donorCancelSignup(activityId, scheduleId);
            setSignupMap((prev) => ({ ...prev, [scheduleId]: { status: 'cancelled' } }));
            const res = await donorListActivities({ limit: 100 });
            setActivities(res?.items || []);
        } catch (err) {
            setListError(err.message || 'Cancel failed');
        } finally {
            setSignupLoading('');
        }
    };

    // ── Detail load / refresh ──
    const openActivity = async (id, fromHistory = false) => {
        setDetailLoading(true);
        setDetailError('');
        setSelected(null);
        selectedIdRef.current = id;
        try {
            const res = await donorGetActivity(id, { includeInactive: fromHistory });
            setSelected(res);
        } catch (err) {
            setDetailError(err.message || 'Failed to load activity');
        } finally {
            setDetailLoading(false);
        }
    };

    const refreshSelected = async () => {
        if (!selectedIdRef.current) return;
        try {
            const res = await donorGetActivity(selectedIdRef.current);
            setSelected(res);
        } catch { /* silent background refresh */ }
    };

    // ── Auto-poll discussion while detail view is open ──
    useEffect(() => {
        if (!selected) return;
        selectedIdRef.current = selected.id;
        const timerId = setInterval(refreshSelected, POLL_INTERVAL_MS);
        return () => clearInterval(timerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.id]);

    // ── Sign-up / cancel ──
    const handleSignUp = async (scheduleId) => {
        setSignupLoading(scheduleId);
        try {
            await donorSignUp(selected.id, scheduleId, undefined);
            await refreshSelected();
            loadMySignups();
        } finally {
            setSignupLoading('');
        }
    };

    const handleCancel = async (scheduleId) => {
        setSignupLoading(scheduleId);
        try {
            await donorCancelSignup(selected.id, scheduleId);
            await refreshSelected();
            loadMySignups();
        } finally {
            setSignupLoading('');
        }
    };

    // ── Discussion post ──
    const handlePostDiscussion = async (e) => {
        e.preventDefault();
        if (!discussionMsg.trim()) return;
        setDiscussionSending(true);
        setDiscussionError('');
        try {
            await donorPostDiscussion(selected.id, discussionMsg.trim());
            setDiscussionMsg('');
            await refreshSelected();
            setTimeout(() => discussionEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (err) {
            setDiscussionError(err.message || 'Failed to post');
        } finally {
            setDiscussionSending(false);
        }
    };

    // ── Detail view ──
    if (selected || detailLoading) {
        if (detailLoading) return (
            <section className="card">
                <div className="card-hd">
                    <div className="card-hd-left">
                        <span className="card-icon"><VolIcon /></span>
                        <h2 className="card-title">{ui.tabTitle}</h2>
                    </div>
                </div>
                <div className="empty-state">
                    <VolIcon size={40} />
                    <p>{ui.loading}</p>
                </div>
            </section>
        );

        const upcomingCount = selected.schedules?.filter((s) => s.status === 'upcoming').length ?? 0;

        return (
            <section className="card">
                {/* ── Header row: back + inactive badge ── */}
                <div className="card-hd">
                    <div className="card-hd-left">
                        <button
                            type="button"
                            className="btn btn--ghost"
                            style={{ padding: '7px 14px', fontSize: 14 }}
                            onClick={() => { setSelected(null); selectedIdRef.current = null; }}
                        >
                            {ui.backToList}
                        </button>
                    </div>
                    {!selected.isActive && (
                        <div className="card-hd-right">
                            <span className="vol-status vol-status--inactive">Closed</span>
                        </div>
                    )}
                </div>

                {detailError && <div className="banner banner--error" style={{ marginBottom: 16 }}>{detailError}</div>}
                {!selected.isActive && (
                    <div className="banner banner--warn" style={{ marginBottom: 16 }}>
                        This activity is no longer accepting new registrations.
                    </div>
                )}

                {/* ── Activity info ── */}
                <h2 className="vol-detail-title">{selected.title}</h2>
                <p className="vol-detail-desc">{selected.description}</p>

                {selected.skills && (
                    <div className="vol-tags" style={{ marginBottom: 14 }}>
                        {selected.skills.split(',').map((s) => s.trim()).filter(Boolean).map((tag) => (
                            <span key={tag} className="vol-tag">{tag}</span>
                        ))}
                    </div>
                )}

                {selected.recurrenceNote && (
                    <p className="cell-muted" style={{ marginBottom: 14, fontSize: 13 }}>🔁 {selected.recurrenceNote}</p>
                )}

                {/* ── Schedules ── */}
                <div style={{ marginBottom: 24 }}>
                    <div className="card-hd" style={{ marginBottom: 14 }}>
                        <div className="card-hd-left" style={{ gap: 8 }}>
                            <CalIcon size={15} />
                            <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>Sessions</span>
                        </div>
                        {upcomingCount > 0 && (
                            <span className="vol-status vol-status--upcoming" style={{ fontSize: '0.72rem' }}>
                                {upcomingCount} upcoming
                            </span>
                        )}
                    </div>

                    {(selected.schedules?.length ?? 0) === 0 ? (
                        <div className="empty-state" style={{ padding: '28px 20px' }}>
                            <CalIcon size={36} />
                            <p style={{ fontSize: 14 }}>No sessions scheduled yet.</p>
                        </div>
                    ) : (
                        <div className="vol-schedules">
                            {selected.schedules.map((sch) => {
                                const isUpcoming = sch.status === 'upcoming';
                                const mySignup = sch.signups?.[0];
                                const signedUp = mySignup?.status === 'signed_up';
                                const cap = sch.maxVolunteers || selected.maxVolunteers;
                                const isFull = cap > 0 && (sch._count?.signups ?? 0) >= cap;
                                const busy = signupLoading === sch.id;
                                const accentColor = signedUp ? '#48c78e' : isFull ? '#f14668' : isUpcoming ? '#3273dc' : 'rgba(160,170,200,.2)';

                                return (
                                    <div key={sch.id} style={{
                                        borderRadius: 12,
                                        background: 'var(--bg-card)',
                                        borderLeft: `3px solid ${accentColor}`,
                                        overflow: 'hidden',
                                        marginBottom: 8,
                                    }}>
                                        {/* Top bar: date + location + status */}
                                        <div style={{
                                            display: 'flex', alignItems: 'center', flexWrap: 'wrap',
                                            gap: 10, padding: '10px 14px',
                                            background: 'var(--bg-card-alt)',
                                            borderBottom: '1px solid var(--border)',
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                                                <CalIcon size={13} />
                                                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{fmtDate(sch.scheduledAt)}</span>
                                                {sch.location && (
                                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <PinIcon size={11} />{sch.location}
                                                    </span>
                                                )}
                                            </div>
                                            {signedUp && (
                                                <span style={{ fontSize: 12, fontWeight: 700, color: '#48c78e', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                    You&apos;re in
                                                </span>
                                            )}
                                            {!signedUp && (
                                                <span className={`vol-status vol-status--${sch.status}`} style={{ fontSize: 11 }}>{sch.status}</span>
                                            )}
                                        </div>
                                        {/* Bottom: capacity + CTA */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', flexWrap: 'wrap' }}>
                                            <div>
                                                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>Volunteers</div>
                                                <CapacitySlots filled={sch._count?.signups ?? 0} cap={cap} mySignup={mySignup} donorName={donorName} />
                                            </div>
                                            {isUpcoming && selected.isActive && (
                                                signedUp ? (
                                                    <button type="button" className="btn btn--ghost vol-btn-cancel" style={{ fontSize: 13 }} disabled={busy} onClick={() => handleCancel(sch.id)}>
                                                        {busy ? '…' : ui.cancelSignup}
                                                    </button>
                                                ) : (
                                                    <button type="button" className="btn btn--cta" style={{ padding: '9px 22px', fontSize: 14, flexShrink: 0 }} disabled={busy || isFull} onClick={() => handleSignUp(sch.id)}>
                                                        {busy ? '…' : isFull ? ui.schedulesFull : ui.signUp}
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Discussion ── */}
                {volShowDiscussion && (
                <div className="vol-discussion">
                    <div className="card-hd" style={{ marginBottom: 14 }}>
                        <div className="card-hd-left" style={{ gap: 8 }}>
                            <MsgIcon size={15} />
                            <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>{ui.discussion}</span>
                        </div>
                        <div className="card-hd-right">
                            <span className="cell-muted" style={{ fontSize: 12 }}>
                                {selected.discussions?.length ?? 0} message{(selected.discussions?.length ?? 0) !== 1 ? 's' : ''}
                            </span>
                            <button
                                type="button"
                                className="btn btn--ghost"
                                style={{ fontSize: 12, padding: '4px 10px' }}
                                onClick={refreshSelected}
                                title="Refresh messages"
                            >
                                ↻
                            </button>
                        </div>
                    </div>

                    <div className="vol-discussion-list" style={{ marginBottom: 12 }}>
                        {(selected.discussions?.length ?? 0) === 0 && (
                            <div className="empty-state" style={{ padding: '24px 20px' }}>
                                <MsgIcon size={34} />
                                <p style={{ fontSize: 14 }}>No messages yet. Be the first to post.</p>
                            </div>
                        )}
                        {selected.discussions?.map((msg) => (
                            <div key={msg.id} className={`vol-msg vol-msg--${msg.authorType}`}>
                                <div className="vol-msg-author">
                                    <strong>{msg.authorName}</strong>
                                    <span className={`vol-badge vol-badge--${msg.authorType}`}>{msg.authorType}</span>
                                    <span className="cell-muted" style={{ fontSize: 12 }}>{fmtDate(msg.createdAt)}</span>
                                </div>
                                <div className="vol-msg-body">{msg.message}</div>
                            </div>
                        ))}
                        <div ref={discussionEndRef} />
                    </div>

                    {discussionError && <div className="banner banner--error" style={{ marginBottom: 10 }}>{discussionError}</div>}
                    {selected.isActive && (
                        <form onSubmit={handlePostDiscussion} className="vol-discussion-form">
                            <input
                                className="vol-msg-input"
                                value={discussionMsg}
                                onChange={(e) => setDiscussionMsg(e.target.value)}
                                placeholder={ui.messagePlaceholder}
                            />
                            <button type="submit" className="btn btn--ghost" disabled={discussionSending || !discussionMsg.trim()}>
                                {ui.postMessage}
                            </button>
                        </form>
                    )}
                </div>
                )}
            </section>
        );
    }

    // ── Main list view ──
    return (
        <section className="card">
            <div className="card-hd">
                <div className="card-hd-left">
                    <span className="card-icon"><VolIcon /></span>
                    <h2 className="card-title">{ui.tabTitle}</h2>
                </div>
                <div className="card-hd-right">
                    <div className="vol-tab-nav">
                        <button
                            type="button"
                            className={`btn btn--ghost${view === 'browse' ? ' vol-tab-btn--active' : ''}`}
                            onClick={() => setView('browse')}
                        >
                            {ui.browseTitle}
                        </button>
                        <button
                            type="button"
                            className={`btn btn--ghost${view === 'mySignups' ? ' vol-tab-btn--active' : ''}`}
                            onClick={() => { setView('mySignups'); loadMySignups(); }}
                        >
                            {ui.mySignupsTitle}
                        </button>
                    </div>
                </div>
            </div>

            {view === 'browse' && (
                <>
                    {listError && <div className="banner banner--error" style={{ marginBottom: 16 }}>{listError}</div>}

                    {(() => {
                        if (listLoading) return (
                            <div className="empty-state"><VolIcon size={40} /><p>{ui.loading}</p></div>
                        );
                        const withUpcoming = activities.filter((a) => (a.schedules?.length ?? 0) > 0);
                        const withoutUpcoming = activities.filter((a) => (a.schedules?.length ?? 0) === 0);

                        return (
                            <>
                                {withUpcoming.length === 0 && withoutUpcoming.length === 0 && (
                                    <div className="empty-state"><VolIcon size={48} /><p>{ui.noActivities}</p></div>
                                )}

                                {withUpcoming.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {withUpcoming.map((act) => {
                                            const firstSch = act.schedules[0];
                                            const mySignup = signupMap[firstSch.id];
                                            const isSignedUp = mySignup?.status === 'signed_up';
                                            const cap = firstSch.maxVolunteers || act.maxVolunteers;
                                            const isFull = cap > 0 && (firstSch._count?.signups ?? 0) >= cap;
                                            const busy = signupLoading === firstSch.id;
                                            const multiSessions = act.schedules.length > 1;
                                            const accentColor = isSignedUp ? '#48c78e' : isFull ? '#f14668' : '#3273dc';
                                            return (
                                                <div key={act.id} style={{
                                                    borderRadius: 12,
                                                    background: 'var(--bg-card)',
                                                    borderLeft: `3px solid ${accentColor}`,
                                                    overflow: 'hidden',
                                                }}>
                                                    {/* Row 1: title + CTA button */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px 8px' }}>
                                                        <div
                                                            style={{ flex: 1, cursor: 'pointer' }}
                                                            onClick={() => openActivity(act.id)}
                                                            role="button" tabIndex={0}
                                                            onKeyDown={(e) => e.key === 'Enter' && openActivity(act.id)}
                                                        >
                                                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.3 }}>{act.title}</div>
                                                            {act.recurrenceNote && (
                                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>🔁 {act.recurrenceNote}</div>
                                                            )}
                                                        </div>
                                                        {isSignedUp ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                                                                <span style={{ fontSize: 12, fontWeight: 700, color: '#48c78e', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                                                    Joined
                                                                </span>
                                                                <button type="button" className="btn btn--ghost vol-btn-cancel" style={{ fontSize: 11, padding: '3px 10px' }} disabled={busy} onClick={() => quickCancel(act.id, firstSch.id)}>
                                                                    {busy ? '…' : 'Cancel'}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button type="button" className="btn btn--cta" style={{ fontSize: 13, padding: '7px 16px', animation: 'none', flexShrink: 0 }} disabled={busy || isFull} onClick={() => quickSignUp(act.id, firstSch.id)}>
                                                                {busy ? '…' : isFull ? 'Full' : 'Join →'}
                                                            </button>
                                                        )}
                                                    </div>
                                                    {/* Row 2: date + location + micro capacity dots */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px 10px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <CalIcon size={11} />{fmtDate(firstSch.scheduledAt)}
                                                        </span>
                                                        {firstSch.location && (
                                                            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <PinIcon size={11} />{firstSch.location}
                                                            </span>
                                                        )}
                                                        {multiSessions && (
                                                            <button type="button" className="btn btn--ghost" style={{ fontSize: 11, padding: '1px 6px' }}
                                                                onClick={(e) => { e.stopPropagation(); openActivity(act.id); }}>
                                                                +{act.schedules.length - 1} more sessions
                                                            </button>
                                                        )}
                                                        <div style={{ marginLeft: 'auto' }}>
                                                            <CapacitySlots filled={firstSch._count?.signups ?? 0} cap={cap} maxShow={7} size={22} mySignup={mySignup} donorName={donorName} />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Collapsible: activities without upcoming sessions */}
                                {volShowUnscheduled && withoutUpcoming.length > 0 && (
                                    <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                                        <button
                                            type="button"
                                            className="btn btn--ghost"
                                            style={{ fontSize: 13, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 }}
                                            onClick={() => setShowUnscheduled((v) => !v)}
                                        >
                                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ transition: 'transform .2s', transform: showUnscheduled ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                                                <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Not Yet Scheduled
                                            <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--bg-card-alt)', borderRadius: 999, padding: '1px 7px' }}>{withoutUpcoming.length}</span>
                                        </button>
                                        {showUnscheduled && (
                                            <div className="vol-activity-list" style={{ marginTop: 12 }}>
                                                {withoutUpcoming.map((act) => (
                                                    <button
                                                        key={act.id}
                                                        type="button"
                                                        className="vol-activity-row"
                                                        onClick={() => openActivity(act.id)}
                                                    >
                                                        <div className="vol-activity-info">
                                                            <div className="vol-activity-title">{act.title}</div>
                                                            <div className="cell-muted" style={{ fontSize: 13, marginTop: 3 }}>
                                                                {act.recurrenceNote || act.recurrenceType}
                                                                {' '}<span className="vol-status vol-status--inactive" style={{ fontSize: '0.68rem' }}>No sessions yet</span>
                                                            </div>
                                                        </div>
                                                        <span className="vol-arrow">›</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        );
                    })()}

                    {/* History toggle */}
                    {volShowHistory && (
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                        <button
                            type="button"
                            className="btn btn--ghost"
                            style={{ fontSize: 13, padding: '7px 14px' }}
                            onClick={toggleHistory}
                        >
                            {showHistory ? ui.hideHistory : ui.showHistory}
                        </button>
                    </div>
                    )}

                    {volShowHistory && showHistory && (
                        <div style={{ marginTop: 16 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>
                                {ui.historyTitle}
                            </p>
                            {historyLoading ? (
                                <div className="empty-state" style={{ padding: '22px 20px' }}>
                                    <VolIcon size={32} />
                                    <p style={{ fontSize: 14 }}>{ui.loading}</p>
                                </div>
                            ) : history.length === 0 ? (
                                <div className="empty-state" style={{ padding: '22px 20px' }}>
                                    <VolIcon size={32} />
                                    <p style={{ fontSize: 14 }}>{ui.noHistory}</p>
                                </div>
                            ) : (
                                <div className="vol-activity-list">
                                    {history.map((act) => (
                                        <button
                                            key={act.id}
                                            type="button"
                                            className="vol-activity-row vol-activity-row--history"
                                            onClick={() => openActivity(act.id, true)}
                                        >
                                            <div className="vol-activity-info">
                                                <div className="vol-activity-title">{act.title}</div>
                                                <div className="cell-muted" style={{ fontSize: 13, marginTop: 3 }}>
                                                    {act.recurrenceNote || act.recurrenceType}
                                                    {' '}
                                                    <span className="vol-status vol-status--inactive" style={{ fontSize: '0.69rem' }}>Past</span>
                                                </div>
                                            </div>
                                            <span className="vol-arrow">›</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {view === 'mySignups' && (
                <>
                    {mySignupsLoading ? (
                        <div className="empty-state">
                            <VolIcon size={40} />
                            <p>{ui.loading}</p>
                        </div>
                    ) : mySignups.length === 0 ? (
                        <div className="empty-state">
                            <VolIcon size={48} />
                            <p>{ui.noSignups}</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {mySignups.map((s) => {
                                const statusColor = s.status === 'signed_up' ? '#48c78e' : s.status === 'cancelled' ? '#f14668' : 'rgba(160,170,200,.3)';
                                return (
                                    <div
                                        key={s.id}
                                        role="button" tabIndex={0}
                                        onClick={() => openActivity(s.activity?.id)}
                                        onKeyDown={(e) => e.key === 'Enter' && openActivity(s.activity?.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '12px 16px', borderRadius: 12,
                                            background: 'var(--bg-card)',
                                            borderLeft: `3px solid ${statusColor}`,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {s.activity?.title}
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <CalIcon size={11} />{fmtDate(s.schedule?.scheduledAt)}
                                                </span>
                                                {s.schedule?.location && (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <PinIcon size={11} />{s.schedule.location}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`vol-status vol-status--${s.status}`} style={{ flexShrink: 0 }}>
                                            {s.status.replace('_', ' ')}
                                        </span>
                                        <span style={{ color: 'var(--text-muted)', fontSize: 18, flexShrink: 0 }}>›</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
