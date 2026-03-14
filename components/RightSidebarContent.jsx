import { THEMES } from '@/constants/config.js';
import { languageCurrency } from '@/lib/translationUtils.js';

function TierCardSkeleton() {
    return (
        <div className="tier-card tier-card--skeleton" aria-hidden="true">
            <div className="tier-card-header">
                <span className="ui-skeleton ui-skeleton--text tier-card-skeleton-label"></span>
                <span className="ui-skeleton ui-skeleton--text tier-card-skeleton-amount"></span>
            </div>
            <div className="ui-skeleton ui-skeleton--bar"></div>
            <div className="tier-card-stats">
                <span className="ui-skeleton ui-skeleton--text tier-card-skeleton-meta"></span>
                <span className="ui-skeleton ui-skeleton--text tier-card-skeleton-pct"></span>
            </div>
        </div>
    );
}

export function TierSelection({ localizedTiers, selectedTier, setSelectedTier, theme, currencyFirst, t, isLoading, error }) {
    const th = theme ?? THEMES.dark;

    return (
        <div className="tier-selection">
            <div className="tier-selection-title">
                {t.selectTier}
            </div>
            {isLoading ? Array.from({ length: 4 }).map((_, idx) => (
                <TierCardSkeleton key={`tier-skeleton-${idx}`} />
            )) : [...localizedTiers].reverse().map((tier) => {
                const pct = tier.total > 0 ? Math.round((tier.funded / tier.total) * 100) : 0;
                const isSelected = selectedTier === tier.id;
                return (
                    <button
                        type="button"
                        key={tier.id}
                        onClick={() => setSelectedTier(tier.id)}
                        className={`tier-card ${isSelected ? 'selected' : ''}`}
                        aria-pressed={isSelected}
                        aria-label={`${tier.label}, ${languageCurrency(tier.amount, currencyFirst)}, ${t.brickCount(tier.funded, tier.total)}, ${pct}% funded`}
                        style={{
                            borderColor: isSelected ? tier.color : undefined,
                            background: isSelected ? th.bgCardSelected : undefined,
                            '--tier-color': tier.color,
                        }}
                    >
                        <div className="tier-card-header">
                            <span className="tier-name" style={{ color: isSelected ? tier.color : undefined }}>
                                {tier.label}
                            </span>
                            <span className="tier-amount">
                                {languageCurrency(tier.amount, currencyFirst)}
                            </span>
                        </div>
                        <div className="tier-card-progress" style={{ '--tier-color': tier.color }}>
                            <div className="tier-card-progress-fill" style={{ width: `${pct}%` }}></div>
                        </div>
                        <div className="tier-card-stats">
                            <span>{t.brickCount(tier.funded, tier.total)}</span>
                            <span className="tier-percentage" style={{ color: tier.color }}>
                                {pct}%
                            </span>
                        </div>
                    </button>
                );
            })}
            {error ? (
                <div className="tier-selection-status tier-selection-status--error">
                    {error}
                </div>
            ) : null}
        </div>
    );
}

export function SelectedTierCard({ sel, pct, remaining, currencyFirst, t, onDonate, isLoading, statusMessage, statusTone }) {
    const handleDonateClick = () => {
        if (onDonate) {
            onDonate();
        }
    };

    if (isLoading) {
        return (
            <div className="selected-tier-card selected-tier-card--loading" aria-hidden="true">
                <div className="ui-skeleton ui-skeleton--text selected-tier-skeleton-label"></div>
                <div className="ui-skeleton ui-skeleton--text selected-tier-skeleton-amount"></div>
                <div className="ui-skeleton ui-skeleton--text selected-tier-skeleton-note"></div>
                <div className="ui-skeleton ui-skeleton--bar selected-tier-skeleton-progress"></div>
                <div className="ui-skeleton ui-skeleton--button"></div>
            </div>
        );
    }

    return (
        <div className="selected-tier-card" style={{ '--sel-color': sel.color }}>
            <div className="selected-tier-label">
                {sel.label}
            </div>
            <div className="selected-tier-amount">
                {languageCurrency(sel.amount, currencyFirst)}
            </div>
            <div className="selected-tier-per-brick">
                {t.perBrick}
            </div>

            <div className="selected-tier-progress" style={{ '--progress-pct': `${pct}%` }}>
                <div className="selected-tier-progress-stats">
                    <span className="selected-tier-progress-count">
                        {t.brickCount(sel.funded, sel.total)}
                    </span>
                    <span className="selected-tier-progress-pct">
                        {pct}%
                    </span>
                </div>
                <div className="selected-tier-progress-bar">
                    <div className="selected-tier-progress-fill"></div>
                </div>
            </div>

            <button
                type="button"
                disabled={remaining === 0}
                onClick={handleDonateClick}
                className={`donate-button splash ${remaining === 0 ? 'disabled' : ''}`}
            >
                {remaining > 0 ? t.fundButton(sel.amount) : t.fullyFunded}
            </button>
            <p className="selected-tier-note">
                {t.zeffyNote}
            </p>
            {statusMessage ? (
                <div className={`selected-tier-status selected-tier-status--${statusTone || 'info'}`}>
                    {statusMessage}
                </div>
            ) : null}
        </div>
    );
}
