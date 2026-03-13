import { memo } from 'react';
import { THEMES, TIER_CONFIG } from '../constants/config.js';

function DonationsListInner({ tiers, language, isRTL, theme, totalsByEmail, t }) {
    const th = theme ?? THEMES.dark;
    const dollarFirst = language === "en";
    const tierByKey = Object.fromEntries(tiers.map((t) => [t.key, t]));
    if (Object.keys(totalsByEmail).length === 0) return null;

    return (
        <div className="donations-list">
            <div className="donations-list-title">
                {t.donorsList}
            </div>
            <div className="donations-list-scroll">
                {Object.values(totalsByEmail).map((d, idx) => {
                    const block = String(d.details).split("1x ")[1];
                    const tier = Object.values(tierByKey).find((value) => value.name.toLowerCase() === block.toLowerCase());
                    const tierColor = (tier?.color ?? TIER_CONFIG[d.tier]?.color) ?? th.border;
                    const amount = tier ? tier.amount : 500;
                    const progressPct = amount > 0 ? Math.min(100, (d.totalDonated / amount) * 100) : 0;
                    const displayName = d.donorLabel.replace('"', '') || "Anonymous";
                    const tierLabel = tier ? tier.label : d.tier;
                    const donated = d.totalDonated;
                    return (
                        <div
                            key={`donation-${d.email}-${idx}`}
                            className="donation-item"
                            style={{ "--tier-color": tierColor }}
                        >
                            <div className="donation-item-name">{displayName}</div>
                            <div className="donation-item-amount">
                                {dollarFirst ? `$${donated.toLocaleString()}` : `${donated.toLocaleString()} $`}
                            </div>
                            <div className="donation-item-tier">
                                {tierLabel}
                            </div>
                            <div className="donation-item-progress" style={{ '--progress-pct': `${progressPct}%` }}>
                                <div className="donation-item-progress-fill"></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export const DonationsList = memo(DonationsListInner);
