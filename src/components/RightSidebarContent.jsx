import { THEMES } from '../constants/config.js';
import { languageCurrency } from '../utils/translationUtils.js';

export function TierSelection({ localizedTiers, selectedTier, setSelectedTier, theme, currencyFirst, t }) {
    const th = theme ?? THEMES.dark;

    return (
        <div className="tier-selection">
            <div className="tier-selection-title">
                {t.selectTier}
            </div>
            {[...localizedTiers].reverse().map((tier) => {
                const remaining = tier.total - tier.funded;
                const pct = tier.total > 0 ? Math.round((tier.funded / tier.total) * 100) : 0;
                const isSelected = selectedTier === tier.id;
                return (
                    <div
                        key={tier.id}
                        onClick={() => setSelectedTier(tier.id)}
                        className={`tier-card ${isSelected ? 'selected' : ''}`}
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
                    </div>
                );
            })}
        </div>
    );
}

export function SelectedTierCard({ sel, pct, remaining, currencyFirst, t, onDonate }) {
    const handleDonateClick = () => {
        if (onDonate) {
            onDonate();
        }
    };

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
        </div>
    );
}
