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
    donorCheckItem,
    donorUncheckItem,
} from '@/lib/volunteeringApi.js';

const POLL_INTERVAL_MS = 5000; // refresh discussion every 5 s

const fmtDate = (iso) =>
    iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const fmtDuration = (mins) => {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

const fmtDateShort = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    return d.toLocaleDateString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
        ...(sameYear ? {} : { year: 'numeric' }),
    });
};

const fmtTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';

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

function ClockIcon({ size = 13 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    );
}

function CheckIcon({ size = 13 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

function RefreshIcon({ size = 14 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.5" />
        </svg>
    );
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return (parts[0][0] || '?').toUpperCase();
    return ((parts[0][0] || '') + (parts[parts.length - 1][0] || '')).toUpperCase();
}

function SpotsBar({ filled, cap, tSpots }) {
    const isUnlimited = !(cap > 0);
    const pct = isUnlimited ? 0 : Math.min(100, Math.round((filled / cap) * 100));
    const isFull = !isUnlimited && filled >= cap;
    const barColor = isFull ? '#f14668' : pct > 70 ? '#e8a44a' : 'var(--accent, #3273dc)';
    return (
        <div className="vol-spots">
            <span className="vol-spots-label">
                {isUnlimited
                    ? (filled > 0 ? `${filled} ${tSpots?.spotsJoinedOpen || 'joined · Open'}` : (tSpots?.spotsOpen || 'Open · Unlimited spots'))
                    : <><strong className={isFull ? 'vol-spots-full' : ''}>{filled}</strong> / {cap} {tSpots?.spotsLabel || 'spots'}{isFull ? (tSpots?.spotsFull || ' · Full') : ''}</>
                }
            </span>
            {!isUnlimited && (
                <div className="vol-spots-track">
                    <div className="vol-spots-fill" style={{ width: `${pct}%`, background: barColor }} />
                </div>
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

    const t = {
        title:             pageUi?.volunteeringTab           || 'Volunteering',
        browse:            pageUi?.volBrowseTitle            || 'Discover',
        mySignups:         pageUi?.volMySignupsTitle         || 'My Sign-ups',
        signUp:            pageUi?.volSignUp                 || 'Join',
        cancelSignup:      pageUi?.volCancelSignup           || 'Leave',
        discussion:        pageUi?.volDiscussion             || 'Discussion',
        postMessage:       pageUi?.volPostMessage            || 'Send',
        msgPlaceholder:    pageUi?.volMsgPlaceholder         || 'Write a message…',
        back:              pageUi?.volBackToList             || '← Back',
        noActivities:      pageUi?.volNoActivities           || 'No activities available right now.',
        noSignups:         pageUi?.volNoSignups              || "You haven't signed up for any activities yet.",
        full:              pageUi?.volSchedulesFull          || 'Full',
        loading:           pageUi?.loading                   || 'Loading…',
        showHistory:       pageUi?.volShowHistory            || 'Show past activities',
        hideHistory:       pageUi?.volHideHistory            || 'Hide past activities',
        noHistory:         pageUi?.volNoHistory              || 'No past activities found.',
        closed:            pageUi?.volClosed                 || 'Closed',
        tabSessions:       pageUi?.volTabSessions            || 'Sessions',
        tabAbout:          pageUi?.volTabAbout               || 'About',
        activityClosed:    pageUi?.volActivityClosedBanner   || 'This activity is no longer accepting new registrations.',
        noSessions:        pageUi?.volNoSessionsYet          || 'No sessions scheduled yet.',
        upcomingLabel:     pageUi?.volUpcomingLabel          || 'Upcoming',
        pastSessions:      pageUi?.volPastSessionsPrefix     || 'Past sessions',
        attended:          pageUi?.volAttended               || 'Attended',
        noDescription:     pageUi?.volNoDescription          || 'No description provided.',
        noMessages:        pageUi?.volNoMessages             || 'No messages yet — be the first to post.',
        myTasks:           pageUi?.volMyTasksLabel           || 'My Tasks',
        youreIn:           pageUi?.volYoureIn                || "You're in",
        joined:            pageUi?.volJoinedBadge            || 'Joined',
        leave:             pageUi?.volLeaveBtn               || 'Leave',
        comingSoon:        pageUi?.volComingSoon             || 'Coming Soon',
        tbd:               pageUi?.volTBD                    || 'TBD',
        pastLabel:         pageUi?.volPastLabel              || 'Past',
        spotsOpen:         pageUi?.volSpotsOpen              || 'Open · Unlimited spots',
        spotsJoinedOpen:   pageUi?.volSpotsJoinedOpen        || 'joined · Open',
        spotsLabel:        pageUi?.volSpotsLabel             || 'spots',
        spotsFull:         pageUi?.volSpotsFull              || ' · Full',
        moreSchedules:     pageUi?.volMoreSchedules          || 'more',
        errorLoad:         pageUi?.volErrorLoad              || 'Failed to load',
        errorSignup:       pageUi?.volErrorSignup            || 'Sign-up failed',
        errorCancel:       pageUi?.volErrorCancel            || 'Cancel failed',
        errorLoadActivity: pageUi?.volErrorLoadActivity      || 'Failed to load activity',
        errorPost:         pageUi?.volErrorPost              || 'Failed to post',
        volEstPrefix:      pageUi?.volEstPrefix              || 'Est. ',
        volTaskSingular:   pageUi?.volTaskSingular           || 'task',
        volTaskPlural:     pageUi?.volTaskPlural             || 'tasks',
        volMessageSingular: pageUi?.volMessageSingular       || 'message',
        volMessagePlural:  pageUi?.volMessagePlural          || 'messages',
        volRefreshTitle:   pageUi?.volRefreshTitle           || 'Refresh',
        volAuthorDonor:    pageUi?.volAuthorDonor            || 'Donor',
        volAuthorAdmin:    pageUi?.volAuthorAdmin            || 'Staff',
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

    // ── Checklist ──
    const [checklistLoading, setChecklistLoading] = useState({}); // { [itemId]: bool }
    const [detailTab, setDetailTab] = useState('sessions'); // 'sessions' | 'about' | 'discussion'

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
            setListError(err.message || t.errorLoad);
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
            setListError(err.message || t.errorSignup);
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
            setListError(err.message || t.errorCancel);
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
            setDetailError(err.message || t.errorLoadActivity);
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

    // ── Checklist toggle ──
    const handleToggleChecklistItem = async (scheduleId, itemId, isChecked) => {
        setChecklistLoading((prev) => ({ ...prev, [itemId]: true }));
        try {
            if (isChecked) {
                await donorUncheckItem(selected.id, scheduleId, itemId);
            } else {
                await donorCheckItem(selected.id, scheduleId, itemId);
            }
            await refreshSelected();
        } catch { /* silent — UI will revert on next refresh */ }
        finally {
            setChecklistLoading((prev) => ({ ...prev, [itemId]: false }));
        }
    };

    // ── Discussion post ──
    const handlePostDiscussion = async (e) => {        e.preventDefault();
        if (!discussionMsg.trim()) return;
        setDiscussionSending(true);
        setDiscussionError('');
        try {
            await donorPostDiscussion(selected.id, discussionMsg.trim());
            setDiscussionMsg('');
            await refreshSelected();
            setTimeout(() => discussionEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (err) {
            setDiscussionError(err.message || t.errorPost);
        } finally {
            setDiscussionSending(false);
        }
    };

    // ── Detail view ──
    if (selected || detailLoading) {
        if (detailLoading) return (
            <section className="card vol-detail-loading">
                <div className="vol-back-row">
                    <button type="button" className="vol-back-btn" onClick={() => { setSelected(null); selectedIdRef.current = null; }}>{t.back}</button>
                </div>
                <div className="vol-skeleton vol-skeleton--title" />
                <div className="vol-skeleton vol-skeleton--body" />
                <div className="vol-skeleton vol-skeleton--body vol-skeleton--short" />
                <div className="vol-skeleton vol-skeleton--card" style={{ marginTop: 20 }} />
                <div className="vol-skeleton vol-skeleton--card" />
            </section>
        );

        const upcomingSchedules = selected.schedules?.filter((s) => s.status === 'upcoming') ?? [];
        const pastSchedules = selected.schedules?.filter((s) => s.status !== 'upcoming') ?? [];
        const hasChecklist = (selected.checklistItems?.length ?? 0) > 0;

        const msgCount = selected.discussions?.length ?? 0;

        return (
            <section className="card">
                {/* ── Back row ── */}
                <div className="vol-back-row">
                    <button type="button" className="vol-back-btn" onClick={() => { setSelected(null); selectedIdRef.current = null; }}>
                        {t.back}
                    </button>
                    {!selected.isActive && <span className="vol-closed-badge">{t.closed}</span>}
                </div>

                {detailError && <div className="banner banner--error mb-md">{detailError}</div>}

                {/* ── Compact header: title + meta chips only ── */}
                <div className="vol-detail-header">
                    <h2 className="vol-hero-title">{selected.title}</h2>
                    {(selected.estimatedMinutes || selected.recurrenceNote || hasChecklist) && (
                        <div className="vol-meta-row">
                            {selected.estimatedMinutes > 0 && (
                                <span className="vol-meta-chip"><ClockIcon size={12} />{t.volEstPrefix}{fmtDuration(selected.estimatedMinutes)}</span>
                            )}
                            {selected.recurrenceNote && (
                                <span className="vol-meta-chip"><RefreshIcon size={12} />{selected.recurrenceNote}</span>
                            )}
                            {hasChecklist && (
                                <span className="vol-meta-chip"><CheckIcon size={12} />{selected.checklistItems.length} {selected.checklistItems.length !== 1 ? t.volTaskPlural : t.volTaskSingular}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Sub-tab nav ── */}
                <div className="vol-detail-tabs">
                    <button
                        type="button"
                        className={`vol-dtab${detailTab === 'sessions' ? ' vol-dtab--active' : ''}`}
                        onClick={() => setDetailTab('sessions')}
                    >
                        {t.tabSessions}
                        {upcomingSchedules.length > 0 && (
                            <span className="vol-dtab-badge">{upcomingSchedules.length}</span>
                        )}
                    </button>
                    <button
                        type="button"
                        className={`vol-dtab${detailTab === 'about' ? ' vol-dtab--active' : ''}`}
                        onClick={() => setDetailTab('about')}
                    >
                        {t.tabAbout}
                    </button>
                    {volShowDiscussion && (
                        <button
                            type="button"
                            className={`vol-dtab${detailTab === 'discussion' ? ' vol-dtab--active' : ''}`}
                            onClick={() => setDetailTab('discussion')}
                        >
                            {t.discussion}
                            {msgCount > 0 && <span className="vol-dtab-badge">{msgCount}</span>}
                        </button>
                    )}
                </div>

                {/* ── Tab: Sessions ── */}
                {detailTab === 'sessions' && (
                    <div className="vol-tab-panel">
                        {!selected.isActive && (
                            <div className="banner banner--warn mb-md">
                                {t.activityClosed}
                            </div>
                        )}
                        {(selected.schedules?.length ?? 0) === 0 ? (
                            <div className="vol-empty-section">
                                <CalIcon size={30} />
                                <p>{t.noSessions}</p>
                            </div>
                        ) : (
                            <div className="vol-sessions">
                                {upcomingSchedules.length > 0 && (
                                    <div className="vol-section-label">
                                        <CalIcon size={12} />
                                        {t.upcomingLabel}
                                        <span className="vol-section-count">{upcomingSchedules.length}</span>
                                    </div>
                                )}

                                {upcomingSchedules.map((sch) => {
                                    const mySignup = sch.signups?.[0];
                                    const signedUp = mySignup?.status === 'signed_up';
                                    const cap = sch.maxVolunteers || selected.maxVolunteers;
                                    const filled = sch._count?.signups ?? 0;
                                    const isFull = cap > 0 && filled >= cap;
                                    const busy = signupLoading === sch.id;
                                    const checkedIds = signedUp
                                        ? new Set((mySignup?.checklistProgress ?? []).map((p) => p.checklistItemId))
                                        : null;
                                    const checkTotal = hasChecklist ? selected.checklistItems.length : 0;
                                    const checkDone = checkedIds ? selected.checklistItems.filter((i) => checkedIds.has(i.id)).length : 0;
                                    const checkPct = checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0;

                                    return (
                                        <div key={sch.id} className={`vol-session-card${signedUp ? ' vol-session-card--joined' : ''}`}>
                                            <div className="vol-session-top">
                                                <div className="vol-session-datetime">
                                                    <span className="vol-session-date">{fmtDateShort(sch.scheduledAt)}</span>
                                                    <span className="vol-session-time">{fmtTime(sch.scheduledAt)}</span>
                                                </div>
                                                {signedUp && (
                                                    <span className="vol-joined-badge">
                                                        <CheckIcon size={11} /> {t.youreIn}
                                                    </span>
                                                )}
                                            </div>

                                            {sch.location && (
                                                <div className="vol-session-loc"><PinIcon size={12} />{sch.location}</div>
                                            )}

                                            {sch.notes && <p className="vol-session-notes">{sch.notes}</p>}

                                            <SpotsBar filled={filled} cap={cap} tSpots={t} />

                                            {selected.isActive && (
                                                <div className="vol-session-cta">
                                                    {signedUp ? (
                                                        <button type="button" className="vol-btn-leave" disabled={busy} onClick={() => handleCancel(sch.id)}>
                                                            {busy ? '\u2026' : t.cancelSignup}
                                                        </button>
                                                    ) : (
                                                        <button type="button" className="vol-btn-join" disabled={busy || isFull} onClick={() => handleSignUp(sch.id)}>
                                                            {busy ? '\u2026' : isFull ? t.full : `${t.signUp} \u2192`}
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {signedUp && hasChecklist && (
                                                <div className="vol-task-section">
                                                    <div className="vol-task-header">
                                                        <span className="vol-task-label">{t.myTasks}</span>
                                                        <span className={`vol-task-count${checkDone === checkTotal ? ' vol-task-count--done' : ''}`}>
                                                            {checkDone} / {checkTotal}
                                                        </span>
                                                    </div>
                                                    <div className="vol-task-track">
                                                        <div
                                                            className="vol-task-fill"
                                                            style={{ width: `${checkPct}%`, background: checkPct === 100 ? '#48c78e' : 'var(--accent, #3273dc)' }}
                                                        />
                                                    </div>
                                                    <div className="vol-task-items">
                                                        {selected.checklistItems.map((item) => {
                                                            const checked = checkedIds.has(item.id);
                                                            const loading = !!checklistLoading[item.id];
                                                            return (
                                                                <label key={item.id} className={`vol-task-item${checked ? ' vol-task-item--done' : ''}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={checked}
                                                                        disabled={loading}
                                                                        onChange={() => handleToggleChecklistItem(sch.id, item.id, checked)}
                                                                        className="vol-task-checkbox"
                                                                    />
                                                                    <span className="vol-task-text">{item.title}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {pastSchedules.length > 0 && (
                                    <details className="vol-past-sessions">
                                        <summary className="vol-past-summary">{t.pastSessions} ({pastSchedules.length})</summary>
                                        <div className="vol-past-list">
                                            {pastSchedules.map((sch) => {
                                                const attended = sch.signups?.[0]?.status === 'signed_up';
                                                return (
                                                    <div key={sch.id} className="vol-past-row">
                                                        <span className="vol-past-date">{fmtDateShort(sch.scheduledAt)}</span>
                                                        {sch.location && <span className="vol-past-loc"><PinIcon size={11} />{sch.location}</span>}
                                                        <span className={`vol-status vol-status--${sch.status}`}>{sch.status}</span>
                                                        {attended && <span className="vol-past-attended"><CheckIcon size={11} /> {t.attended}</span>}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </details>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: About ── */}
                {detailTab === 'about' && (
                    <div className="vol-tab-panel vol-about">
                        {selected.description ? (
                            <p className="vol-hero-desc">{selected.description}</p>
                        ) : (
                        <p className="vol-about-empty">{t.noDescription}</p>
                        )}
                        {selected.skills && (
                            <div className="vol-tags" style={{ marginTop: 12 }}>
                                {selected.skills.split(',').map((s) => s.trim()).filter(Boolean).map((tag) => (
                                    <span key={tag} className="vol-tag">{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Tab: Discussion ── */}
                {volShowDiscussion && detailTab === 'discussion' && (
                    <div className="vol-tab-panel">
                        <div className="vol-discussion-hd">
                            <div className="vol-section-label" style={{ marginBottom: 0 }}>
                                <MsgIcon size={13} />
                                {msgCount} {msgCount !== 1 ? t.volMessagePlural : t.volMessageSingular}
                            </div>
                            <button type="button" className="vol-refresh-btn" onClick={refreshSelected} title={t.volRefreshTitle}>
                                <RefreshIcon size={13} />
                            </button>
                        </div>

                        <div className="vol-chat-list">
                            {msgCount === 0 ? (
                                <div className="vol-chat-empty">
                                    <MsgIcon size={28} />
                                    <p>{t.noMessages}</p>
                                </div>
                            ) : (
                                selected.discussions.map((msg) => (
                                    <div key={msg.id} className={`vol-chat-msg vol-chat-msg--${msg.authorType}`}>
                                        <div className="vol-chat-avatar" aria-hidden="true">{getInitials(msg.authorName)}</div>
                                        <div className="vol-chat-body">
                                            <div className="vol-chat-meta">
                                                <strong>{msg.authorName}</strong>
                                                <span className={`vol-badge vol-badge--${msg.authorType}`}>{msg.authorType === 'admin' ? t.volAuthorAdmin : t.volAuthorDonor}</span>
                                                <span className="vol-chat-time">{fmtDate(msg.createdAt)}</span>
                                            </div>
                                            <p className="vol-chat-text">{msg.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={discussionEndRef} />
                        </div>

                        {discussionError && <div className="banner banner--error mb-sm">{discussionError}</div>}
                        {selected.isActive && (
                            <form onSubmit={handlePostDiscussion} className="vol-chat-form">
                                <input
                                    className="vol-chat-input"
                                    value={discussionMsg}
                                    onChange={(e) => setDiscussionMsg(e.target.value)}
                                    placeholder={t.msgPlaceholder}
                                />
                                <button type="submit" className="vol-chat-send" disabled={discussionSending || !discussionMsg.trim()}>
                                    {t.postMessage}
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
                    <h2 className="card-title">{t.title}</h2>
                </div>
                <div className="card-hd-right">
                    <div className="vol-tabs">
                        <button
                            type="button"
                            className={`vol-tab-pill${view === 'browse' ? ' vol-tab-pill--active' : ''}`}
                            onClick={() => setView('browse')}
                        >
                            {t.browse}
                        </button>
                        <button
                            type="button"
                            className={`vol-tab-pill${view === 'mySignups' ? ' vol-tab-pill--active' : ''}`}
                            onClick={() => { setView('mySignups'); loadMySignups(); }}
                        >
                            {t.mySignups}
                        </button>
                    </div>
                </div>
            </div>

            {view === 'browse' && (
                <div className="vol-browse">
                    {listError && <div className="banner banner--error mb-md">{listError}</div>}

                    {listLoading ? (
                        <div className="vol-skeleton-list">
                            <div className="vol-skeleton vol-skeleton--card" />
                            <div className="vol-skeleton vol-skeleton--card" />
                            <div className="vol-skeleton vol-skeleton--card" />
                        </div>
                    ) : (() => {
                        const withUpcoming = activities.filter((a) => (a.schedules?.length ?? 0) > 0);
                        const withoutUpcoming = activities.filter((a) => (a.schedules?.length ?? 0) === 0);

                        if (withUpcoming.length === 0 && withoutUpcoming.length === 0) {
                            return (
                                <div className="empty-state">
                                    <VolIcon size={48} />
                                    <p>{t.noActivities}</p>
                                </div>
                            );
                        }

                        return (
                            <>
                                <div className="vol-browse-list">
                                    {withUpcoming.map((act) => {
                                        const firstSch = act.schedules[0];
                                        const mySignup = signupMap[firstSch.id];
                                        const isSignedUp = mySignup?.status === 'signed_up';
                                        const cap = firstSch.maxVolunteers || act.maxVolunteers;
                                        const filled = firstSch._count?.signups ?? 0;
                                        const isFull = cap > 0 && filled >= cap;
                                        const busy = signupLoading === firstSch.id;

                                        return (
                                            <div key={act.id} className={`vol-browse-card${isSignedUp ? ' vol-browse-card--joined' : isFull ? ' vol-browse-card--full' : ''}`}>
                                                <div className="vol-browse-info" role="button" tabIndex={0} onClick={() => openActivity(act.id)} onKeyDown={(e) => e.key === 'Enter' && openActivity(act.id)}>
                                                    <div className="vol-browse-title">{act.title}</div>
                                                    <div className="vol-browse-meta">
                                                        <span className="vol-browse-metaitem">
                                                            <CalIcon size={11} />
                                                            {fmtDateShort(firstSch.scheduledAt)}, {fmtTime(firstSch.scheduledAt)}
                                                        </span>
                                                        {firstSch.location && (
                                                            <span className="vol-browse-metaitem">
                                                                <PinIcon size={11} />{firstSch.location}
                                                            </span>
                                                        )}
                                                        {(cap > 0 || filled > 0) && (
                                                            <span className={`vol-browse-metaitem${isFull ? ' vol-browse-metaitem--full' : ''}`}>
                                                                <UsersIcon size={11} />
                                                                {cap > 0 ? `${filled}/${cap} spots` : `${filled} joined`}
                                                            </span>
                                                        )}
                                                        {act.schedules.length > 1 && (
                                                            <span className="vol-browse-more">+{act.schedules.length - 1} {t.moreSchedules}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="vol-browse-cta">
                                                    {isSignedUp ? (
                                                        <>
                                                            <span className="vol-joined-badge vol-joined-badge--sm"><CheckIcon size={10} /> {t.joined}</span>
                                                            <button type="button" className="vol-btn-leave vol-btn-leave--sm" disabled={busy} onClick={() => quickCancel(act.id, firstSch.id)}>
                                                                {busy ? '\u2026' : t.leave}
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button type="button" className="vol-btn-join" disabled={busy || isFull} onClick={() => quickSignUp(act.id, firstSch.id)}>
                                                            {busy ? '\u2026' : isFull ? t.full : `${t.signUp} \u2192`}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {volShowUnscheduled && withoutUpcoming.length > 0 && (
                                    <div className="vol-unscheduled">
                                        <button type="button" className="vol-unscheduled-toggle" onClick={() => setShowUnscheduled((v) => !v)}>
                                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ transition: 'transform .2s', transform: showUnscheduled ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }} aria-hidden="true">
                                                <path d="M4 2L8 6L4 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            Coming Soon
                                            <span className="vol-unscheduled-count">{withoutUpcoming.length}</span>
                                        </button>
                                        {showUnscheduled && (
                                            <div className="vol-unscheduled-list">
                                                {withoutUpcoming.map((act) => (
                                                    <button key={act.id} type="button" className="vol-unscheduled-row" onClick={() => openActivity(act.id)}>
                                                        <span className="vol-unscheduled-title">{act.title}</span>
                                                        <span className="vol-status vol-status--inactive" style={{ fontSize: '0.68rem' }}>{t.tbd}</span>
                                                        <span className="vol-arrow">›</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {volShowHistory && (
                                    <div className="vol-history-wrap">
                                        <button type="button" className="vol-history-toggle" onClick={toggleHistory}>
                                            {showHistory ? t.hideHistory : t.showHistory}
                                        </button>
                                        {showHistory && (
                                            historyLoading ? (
                                                <div className="empty-state" style={{ padding: '20px' }}>
                                                    <VolIcon size={28} /><p style={{ fontSize: 13 }}>{t.loading}</p>
                                                </div>
                                            ) : history.length === 0 ? (
                                                <p className="vol-history-empty">{t.noHistory}</p>
                                            ) : (
                                                <div className="vol-history-list">
                                                    {history.map((act) => (
                                                        <button key={act.id} type="button" className="vol-history-row" onClick={() => openActivity(act.id, true)}>
                                                            <span className="vol-history-title">{act.title}</span>
                                                            <span className="vol-status vol-status--inactive" style={{ fontSize: '0.69rem' }}>{t.pastLabel}</span>
                                                            <span className="vol-arrow">›</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            )}

            {view === 'mySignups' && (
                <div className="vol-mysignups">
                    {mySignupsLoading ? (
                        <div className="vol-skeleton-list">
                            <div className="vol-skeleton vol-skeleton--card" />
                            <div className="vol-skeleton vol-skeleton--card" />
                        </div>
                    ) : mySignups.length === 0 ? (
                        <div className="empty-state">
                            <VolIcon size={48} />
                            <p>{t.noSignups}</p>
                        </div>
                    ) : (
                        <div className="vol-mysignups-list">
                            {mySignups.map((s) => (
                                <button key={s.id} type="button" className={`vol-mysignup-row vol-mysignup-row--${s.status}`} onClick={() => openActivity(s.activity?.id)}>
                                    <div className="vol-mysignup-body">
                                        <div className="vol-mysignup-title">{s.activity?.title}</div>
                                        <div className="vol-mysignup-meta">
                                            {s.schedule?.scheduledAt && (
                                                <span><CalIcon size={11} />{fmtDateShort(s.schedule.scheduledAt)}</span>
                                            )}
                                            {s.schedule?.location && (
                                                <span><PinIcon size={11} />{s.schedule.location}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="vol-mysignup-right">
                                        <span className={`vol-status vol-status--${s.status}`}>{s.status.replace('_', ' ')}</span>
                                        <span className="vol-arrow">›</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
