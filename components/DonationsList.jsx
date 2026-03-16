import { memo } from 'react';
import { THEMES, TIER_CONFIG } from '../constants/config.js';

function DonationsListInner({ tiers, language, theme, totalsByEmail, t, isLoading, error }) {
    const th = theme ?? THEMES.dark;
    const dollarFirst = language === "en";
    const tierByName = Object.fromEntries(tiers.map((t) => [t.name.toLowerCase(), t]));

    console.log('[DonationsList] totalsByEmail:', totalsByEmail);
    console.log('[DonationsList] tiers:', tiers);
    console.log('[DonationsList] tierByName:', tierByName);

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
    const renderDonationCard = (d, idx, keySuffix = 'primary') => {
        const tier = d.tier ? tierByName[d.tier.toLowerCase()] : null;
        const tierColor = (tier?.color ?? TIER_CONFIG[d.tier]?.color) ?? th.border;
        const amount = tier ? tier.amount : 500;
        const progressPct = amount > 0 ? Math.min(100, (d.totalDonated / amount) * 100) : 0;
        const displayName = d.donorLabel.replace('"', '') || "Anonymous";
        const tierLabel = tier ? tier.label : d.tier || "Unknown";
        const donated = d.totalDonated;
        const donatedLabel = dollarFirst ? `$${donated.toLocaleString()}` : `${donated.toLocaleString()} $`;

        console.log(`[DonationsList] Donor ${idx}:`, { displayName, donated, amount, progressPct, tierName: d.tier, tier: tier?.key });

        return (
            <div
                key={`donation-${keySuffix}-${d.email}-${idx}`}
                className="donation-item"
                style={{
                    "--tier-color": tierColor,
                    "--progress-angle": `${progressPct * 3.6}deg`,
                }}
            >
                <div className="donation-item-top">
                    <div className="donation-item-progress-badge" aria-label={`${Math.round(progressPct)}% funded`}>
                        {Math.round(progressPct)}%
                    </div>
                </div>
                <div className="donation-item-copy" title={displayName}>
                    <div className="donation-item-name" dir="auto">{displayName}</div>
                </div>
                <div className="donation-item-tier">
                    {tierLabel}
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
        <div className="donations-list">
            <div className="donations-list-title">
                {t.donorsList}
            </div>
            <div className="donations-list-scroll donations-list-scroll--marquee">
                {donorColumns.map((column, columnIndex) => (
                    <div
                        key={`donation-column-${columnIndex}`}
                        className={`donations-list-marquee-column donations-list-marquee-column--${columnIndex % 2 === 0 ? 'down' : 'up'}`}
                    >
                        <div className="donations-list-marquee-track">
                            {column.map((d, idx) => renderDonationCard(d, idx, `col-${columnIndex}`))}
                        </div>
                        <div className="donations-list-marquee-track" aria-hidden="true">
                            {column.map((d, idx) => renderDonationCard(d, idx, `col-${columnIndex}-clone`))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export const DonationsList = memo(DonationsListInner);
