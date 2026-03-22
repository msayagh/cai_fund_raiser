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

const POLL_INTERVAL_MS = 15000; // refresh discussion every 15 s

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

export default function VolunteeringTab({ donorId, donorName, ui: pageUi }) {
    if (!FEATURES.VOLUNTEERING) return null;

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
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    // ── Detail state ──
    const [selected, setSelected] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');

    // ── My signups ──
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

    // ── Load active activities ──
    const loadActivities = useCallback(async () => {
        setListLoading(true);
        setListError('');
        try {
            const res = await donorListActivities({ limit: 100 });
            setActivities(res?.items || []);
        } catch (err) {
            setListError(err.message || 'Failed to load');
        } finally {
            setListLoading(false);
        }
    }, []);

    useEffect(() => { loadActivities(); }, [loadActivities]);

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

    // ── My signups ──
    const loadMySignups = async () => {
        setMySignupsLoading(true);
        try {
            const res = await donorGetMySignups();
            setMySignups(res || []);
        } finally {
            setMySignupsLoading(false);
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
                            <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(160,170,200,.55)' }}>Sessions</span>
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

                                return (
                                    <div key={sch.id} className={`vol-sch-card vol-sch-card--${sch.status}`}>
                                        <div className="vol-sch-info">
                                            <div className="vol-sch-date">
                                                <CalIcon size={12} />
                                                {' '}{fmtDate(sch.scheduledAt)}
                                            </div>
                                            <div className="vol-sch-loc">
                                                <PinIcon size={11} />
                                                {' '}{sch.location
                                                    ? sch.location
                                                    : <span style={{ fontStyle: 'italic' }}>{ui.locationTbd}</span>
                                                }
                                            </div>
                                            <div className="vol-sch-capacity">
                                                <UsersIcon size={11} />
                                                {' '}{sch._count?.signups ?? 0} / {cap > 0 ? cap : ui.unlimited}
                                                {isFull && (
                                                    <span className="vol-status vol-status--cancelled" style={{ fontSize: '0.68rem', marginLeft: 6 }}>
                                                        {ui.schedulesFull}
                                                    </span>
                                                )}
                                            </div>
                                            {mySignup && (
                                                <span className={`vol-status vol-status--${mySignup.status}`} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                                                    {ui.myStatus}: {mySignup.status.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                        {isUpcoming && selected.isActive && (
                                            <div className="vol-sch-actions">
                                                {signedUp ? (
                                                    <button
                                                        type="button"
                                                        className="btn btn--ghost vol-btn-cancel"
                                                        disabled={busy}
                                                        onClick={() => handleCancel(sch.id)}
                                                    >
                                                        {busy ? '…' : ui.cancelSignup}
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn btn--cta"
                                                        style={{ padding: '8px 16px', fontSize: 14 }}
                                                        disabled={busy || isFull}
                                                        onClick={() => handleSignUp(sch.id)}
                                                    >
                                                        {busy ? '…' : isFull ? ui.schedulesFull : ui.signUp}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Discussion ── */}
                <div className="vol-discussion">
                    <div className="card-hd" style={{ marginBottom: 14 }}>
                        <div className="card-hd-left" style={{ gap: 8 }}>
                            <MsgIcon size={15} />
                            <span style={{ fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(160,170,200,.55)' }}>{ui.discussion}</span>
                        </div>
                        <span className="cell-muted" style={{ fontSize: 12 }}>
                            {selected.discussions?.length ?? 0} message{(selected.discussions?.length ?? 0) !== 1 ? 's' : ''}
                        </span>
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

                    {listLoading ? (
                        <div className="empty-state">
                            <VolIcon size={40} />
                            <p>{ui.loading}</p>
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="empty-state">
                            <VolIcon size={48} />
                            <p>{ui.noActivities}</p>
                        </div>
                    ) : (
                        <div className="vol-activity-list">
                            {activities.map((act) => {
                                const upcomingSessions = act.schedules?.filter((s) => s.status === 'upcoming').length ?? 0;
                                return (
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
                                                {' · '}
                                                <span className={`vol-status vol-status--${upcomingSessions > 0 ? 'upcoming' : 'inactive'}`} style={{ fontSize: '0.69rem', marginLeft: 2 }}>
                                                    {upcomingSessions} upcoming
                                                </span>
                                            </div>
                                        </div>
                                        <span className="vol-arrow">›</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* History toggle */}
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.06)' }}>
                        <button
                            type="button"
                            className="btn btn--ghost"
                            style={{ fontSize: 13, padding: '7px 14px' }}
                            onClick={toggleHistory}
                        >
                            {showHistory ? ui.hideHistory : ui.showHistory}
                        </button>
                    </div>

                    {showHistory && (
                        <div style={{ marginTop: 16 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(160,170,200,.55)', marginBottom: 12 }}>
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
                        <div className="table-wrap">
                            <div className="table-head" style={{ gridTemplateColumns: '2fr 1.4fr 1.1fr 1fr' }}>
                                <span>Activity</span>
                                <span>Session</span>
                                <span>Location</span>
                                <span>Status</span>
                            </div>
                            {mySignups.map((s) => (
                                <div
                                    key={s.id}
                                    className="table-row"
                                    style={{ gridTemplateColumns: '2fr 1.4fr 1.1fr 1fr', cursor: 'pointer' }}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => openActivity(s.activity?.id)}
                                    onKeyDown={(e) => e.key === 'Enter' && openActivity(s.activity?.id)}
                                >
                                    <span style={{ fontWeight: 600, color: '#f0f4ff' }}>{s.activity?.title}</span>
                                    <span className="cell-muted">{fmtDate(s.schedule?.scheduledAt)}</span>
                                    <span className="cell-muted">{s.schedule?.location || '—'}</span>
                                    <span>
                                        <span className={`vol-status vol-status--${s.status}`}>
                                            {s.status.replace('_', ' ')}
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </section>
    );
}
