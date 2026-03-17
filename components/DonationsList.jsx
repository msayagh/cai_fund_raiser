'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { THEMES, TIER_CONFIG } from '../constants/config.js';

function DragScrollLane({ className, axis = 'x', children }) {
    const laneRef = useRef(null);
    const dragRef = useRef({ active: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });

    const endDrag = () => {
        dragRef.current.active = false;
        laneRef.current?.classList.remove('is-dragging');
    };

    const handlePointerDown = (event) => {
        const lane = laneRef.current;
        if (!lane) return;

        dragRef.current = {
            active: true,
            startX: event.clientX,
            startY: event.clientY,
            scrollLeft: lane.scrollLeft,
            scrollTop: lane.scrollTop,
        };

        lane.classList.add('is-dragging');

        if (lane.setPointerCapture) {
            lane.setPointerCapture(event.pointerId);
        }
    };

    const handlePointerMove = (event) => {
        const lane = laneRef.current;
        if (!lane || !dragRef.current.active) return;

        const deltaX = event.clientX - dragRef.current.startX;
        const deltaY = event.clientY - dragRef.current.startY;

        if (axis === 'y') {
            lane.scrollTop = dragRef.current.scrollTop - deltaY;
            return;
        }

        lane.scrollLeft = dragRef.current.scrollLeft - deltaX;
    };

    const handlePointerUp = (event) => {
        const lane = laneRef.current;
        if (lane?.releasePointerCapture && lane.hasPointerCapture?.(event.pointerId)) {
            lane.releasePointerCapture(event.pointerId);
        }
        endDrag();
    };

    return (
        <div
            ref={laneRef}
            className={className}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={endDrag}
            onPointerLeave={endDrag}
        >
            {children}
        </div>
    );
}

function DonationsListInner({ tiers, language, theme, totalsByEmail, t, isLoading, error, variant = 'sidebar' }) {
    const th = theme ?? THEMES.dark;
    const dollarFirst = language === "en";
    const tierByName = Object.fromEntries(tiers.map((t) => [t.name.toLowerCase(), t]));
    const [isSmallViewport, setIsSmallViewport] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia('(max-width: 640px)');
        const syncViewport = () => setIsSmallViewport(mediaQuery.matches);

        syncViewport();
        mediaQuery.addEventListener('change', syncViewport);

        return () => mediaQuery.removeEventListener('change', syncViewport);
    }, []);

    if (isLoading) {
        return (
            <div className="donations-list">
                <div className="donations-list-title">
                    {t.donorsList}
                </div>
                <div className="donations-list-scroll">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={`donation-skeleton-${idx}`} className="donation-item donation-item--skeleton" aria-hidden="true">
                            <div className="ui-skeleton ui-skeleton--text donation-skeleton-name"></div>
                            <div className="ui-skeleton ui-skeleton--text donation-skeleton-amount"></div>
                            <div className="ui-skeleton ui-skeleton--text donation-skeleton-tier"></div>
                            <div className="ui-skeleton ui-skeleton--bar"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="donations-list">
                <div className="donations-list-title">
                    {t.donorsList}
                </div>
                <div className="donations-list-status donations-list-status--error">
                    {error}
                </div>
            </div>
        );
    }

    if (Object.keys(totalsByEmail).length === 0) {
        console.log('[DonationsList] No donors to display');
        return null;
    }

    const sortedDonors = Object.values(totalsByEmail).sort((a, b) => b.totalDonated - a.totalDonated);
    const donorColumns = sortedDonors.reduce((columns, donor, index) => {
        columns[index % 2].push(donor);
        return columns;
    }, [[], []]);
    const mobileRows = isSmallViewport ? donorColumns : [sortedDonors];
    const renderDonationCard = (d, idx, keySuffix = 'primary') => {
        const tier = d.tier ? tierByName[d.tier.toLowerCase()] : null;
        const hasKnownTier = Boolean(tier || TIER_CONFIG[d.tier]);
        const tierColor = (tier?.color ?? TIER_CONFIG[d.tier]?.color) ?? th.border;
        const amount = tier ? tier.amount : 500;
        const progressPct = amount > 0 ? Math.min(100, (d.totalDonated / amount) * 100) : 0;
        const displayName = d.donorLabel.replace('"', '') || "Anonymous";
        const tierLabel = tier ? tier.label : d.tier || "Unknown";
        const donated = d.totalDonated;
        const donatedLabel = dollarFirst ? `$${donated.toLocaleString()}` : `${donated.toLocaleString()} $`;
        const quantity = d.ticketCount || 1;

        return (
            <div
                key={`donation-${keySuffix}-${d.email}-${idx}`}
                className="donation-item"
                style={{
                    "--tier-color": tierColor,
                    "--progress-angle": `${progressPct * 3.6}deg`,
                    "--amount-color": hasKnownTier ? tierColor : "var(--text-primary)",
                    "--item-opacity": hasKnownTier ? 1 : 0.72,
                }}
            >
                <div className="donation-item-top">
                    <div className="donation-item-progress-badge" aria-label={`${Math.round(progressPct)}% funded`}>
                        {Math.round(progressPct / quantity)}%
                    </div>
                </div>
                <div className="donation-item-copy" title={displayName}>
                    <div className="donation-item-name" dir="auto">{displayName}</div>
                </div>
                <div className="donation-item-tier">
                    {quantity > 1 ? `${tierLabel} x ${quantity}` : tierLabel}
                </div>
                <div className="donation-item-meta">
                    <div className="donation-item-amount">
                        {donatedLabel}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`donations-list donations-list--${variant}`}>
            <div className="donations-list-title">
                {t.donorsList}
            </div>
            {variant === 'sidebar' ? (
                <div className="donations-list-scroll donations-list-scroll--sidebar-marquee">
                    {donorColumns.map((column, columnIndex) => (
                        <DragScrollLane
                            key={`donation-column-${columnIndex}`}
                            className={`donations-list-marquee-column donations-list-marquee-column--${columnIndex % 2 === 0 ? 'down' : 'up'}`}
                            axis="y"
                        >
                            <div className="donations-list-marquee-track">
                                {column.map((d, idx) => renderDonationCard(d, idx, `col-${columnIndex}`))}
                            </div>
                            <div className="donations-list-marquee-track" aria-hidden="true">
                                {column.map((d, idx) => renderDonationCard(d, idx, `col-${columnIndex}-clone`))}
                            </div>
                        </DragScrollLane>
                    ))}
                </div>
            ) : variant === 'mobile' ? (
                <div className="donations-list-scroll donations-list-scroll--mobile-marquee">
                    {mobileRows.map((column, columnIndex) => (
                        <DragScrollLane
                            key={`donation-mobile-row-${columnIndex}`}
                            className={`donations-list-marquee-row donations-list-marquee-row--${columnIndex % 2 === 0 ? 'left' : 'right'}`}
                        >
                            <div
                                className={`donations-list-marquee-track donations-list-marquee-track--horizontal donations-list-marquee-track--${columnIndex % 2 === 0 ? 'left' : 'right'}`}
                            >
                                {column.map((d, idx) => renderDonationCard(d, idx, `mobile-row-${columnIndex}`))}
                            </div>
                            <div
                                className={`donations-list-marquee-track donations-list-marquee-track--horizontal donations-list-marquee-track--${columnIndex % 2 === 0 ? 'right' : 'left'}`}
                                aria-hidden="true"
                            >
                                {column.map((d, idx) => renderDonationCard(d, idx, `mobile-row-${columnIndex}-clone`))}
                            </div>
                        </DragScrollLane>
                    ))}
                </div>
            ) : (
                <div className="donations-list-scroll">
                    {sortedDonors.map((d, idx) => renderDonationCard(d, idx))}
                </div>
            )}
        </div>
    );
}

export const DonationsList = memo(DonationsListInner);
