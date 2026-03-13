import { THEMES } from '../constants/config.js';
import { languageCurrency } from '../utils/translationUtils.js';

export function HadithSection({ t, isRTL, theme }) {
    return (
        <div className="center-content">
            <div className="hadith-section">
                <div className="hadith-text">
                    <p className="hadith-arabic">
                        {t.hadithArabic}
                        <span className="hadith-reference"> ― {t.hadithSource}</span>
                    </p>
                    <p
                        style={{
                            direction: isRTL ? "rtl" : "ltr"
                        }}
                        className="hadith-translation"
                    >
                        {t.hadithTranslation}
                    </p>
                </div>
            </div>
        </div>
    );
}

export function MosqueSideChips({ localizedTiers, selectedTier, setSelectedTier, setShowRightSidebar, isRTL, theme, currencyFirst, t }) {
    const th = theme ?? THEMES.dark;

    return (
        <div className="mosque-side-chips">
            {[
                { id: 3, centerPct: 195 / 740 },
                { id: 2, centerPct: 446.5 / 740 },
                { id: 1, centerPct: 561.5 / 740 },
                { id: 0, centerPct: 676.5 / 740 },
            ].map(({ id, centerPct }) => {
                const tier = localizedTiers[id];
                const tierRemaining = tier.total - tier.funded;
                const isSelected = selectedTier === id;

                return (
                    <div
                        key={id}
                        onClick={() => {
                            setSelectedTier(id);
                            setShowRightSidebar(true);
                        }}
                        className={`mosque-side-chip ${isSelected ? "selected" : ""}`}
                        style={{
                            right: isRTL ? "auto" : "8px",
                            left: isRTL ? "8px" : "auto",
                            top: `${centerPct * 100}%`,
                            background: isSelected ? tier.color : th.bgCardAlt,
                            border: `2px solid ${isSelected ? tier.color : th.border}`,
                            boxShadow: isSelected
                                ? `0 0 16px ${tier.color}66`
                                : th.mode === "light"
                                    ? "0 2px 8px rgba(0,0,0,0.08)"
                                    : "0 2px 8px rgba(0,0,0,0.5)",
                            zIndex: 10,
                        }}
                    >
                        <span className="mosque-side-chip-amount" style={{ color: isSelected ? "#000000" : th.textPrimary }}>
                            {languageCurrency(tier.amount, currencyFirst)}
                        </span>
                        <span className="mosque-side-chip-remaining" style={{ color: isSelected ? "#00000099" : tier.color }}>
                            {t.sideChip(tierRemaining)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export function TierLegend({ localizedTiers, selectedTier, handleTierSelect, theme, t }) {
    const th = theme ?? THEMES.dark;

    return (
        <div className="tier-legend-wrapper">
            {[...localizedTiers].reverse().map((tier) => (
                <div
                    key={tier.id}
                    onClick={() => handleTierSelect(tier.id)}
                    className="tier-legend-item"
                    style={{
                        border: `2px solid ${selectedTier === tier.id ? tier.color : th.border}`,
                        background: selectedTier === tier.id ? th.bgCardSelected : th.bgCardAlt,
                        color: selectedTier === tier.id ? tier.color : th.textPrimary,
                    }}
                >
                    <span className="tier-legend-color-dot" style={{ background: tier.color }} />
                    {t.legendLabel(tier.label, tier.amount)}
                </div>
            ))}
        </div>
    );
}
