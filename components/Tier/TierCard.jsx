import { memo } from 'react';
import { languageCurrency } from '../utils/translationUtils.js';

function TierCardInner({ tier, selected, onSelect, t, dollarFirst = true }) {
    const pct = Math.round((tier.funded / tier.total) * 100);

    return (
        <div
            onClick={() => onSelect(tier.id)}
            className={`tier-card ${selected ? 'selected' : ''}`}
            style={{ '--progress-pct': `${pct}%` }}
        >
            <div className="tier-card-header">
                <span className="tier-card-label">
                    {tier.label}
                </span>
                <span className="tier-card-amount">{languageCurrency(tier.amount, dollarFirst)}</span>
            </div>

            <div className="tier-card-progress">
                <div className="tier-card-progress-fill"></div>
            </div>

            <div className="tier-card-stats">
                <span className="tier-card-count">{t.brickCount(tier.funded, tier.total)}</span>
                <span className="tier-card-pct">{pct}%</span>
            </div>
        </div>
    );
}

export const TierCard = memo(TierCardInner);
