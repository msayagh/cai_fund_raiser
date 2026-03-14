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

    return (
        <div className="donations-list">
            <div className="donations-list-title">
                {t.donorsList}
            </div>
            <div className="donations-list-scroll">
                {sortedDonors.map((d, idx) => {
                    // Try to match tier by name from donation data
                    const tier = d.tier ? tierByName[d.tier.toLowerCase()] : null;
                    const tierColor = (tier?.color ?? TIER_CONFIG[d.tier]?.color) ?? th.border;
                    const amount = tier ? tier.amount : 500;
                    const progressPct = amount > 0 ? Math.min(100, (d.totalDonated / amount) * 100) : 0;
                    const displayName = d.donorLabel.replace('"', '') || "Anonymous";
                    const tierLabel = tier ? tier.label : d.tier || "Unknown";
                    const donated = d.totalDonated;
                    console.log(`[DonationsList] Donor ${idx}:`, { displayName, donated, amount, progressPct, tierName: d.tier, tier: tier?.key });
                    return (
                        <div
                            key={`donation-${d.email}-${idx}`}
                            className="donation-item"
                            style={{ "--tier-color": tierColor }}
                        >
                            <div className="donation-item-top">
                                <div className="donation-item-copy">
                                    <div className="donation-item-name">{displayName}</div>
                                    <div className="donation-item-amount">
                                        {dollarFirst ? `$${donated.toLocaleString()}` : `${donated.toLocaleString()} $`}
                                    </div>
                                    <div className="donation-item-tier">
                                        {tierLabel}
                                    </div>
                                </div>
                                <div
                                    className="donation-item-progress-circle"
                                    aria-label={`${Math.round(progressPct)}% funded`}
                                >
                                    <svg viewBox="0 0 40 40" className="donation-item-progress-svg" aria-hidden="true">
                                        <circle className="donation-item-progress-track" cx="20" cy="20" r="16"></circle>
                                        <circle
                                            className="donation-item-progress-value"
                                            cx="20"
                                            cy="20"
                                            r="16"
                                            style={{ "--progress-pct": progressPct / 100 }}
                                        ></circle>
                                    </svg>
                                    <span className="donation-item-progress-label">{Math.round(progressPct)}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export const DonationsList = memo(DonationsListInner);
