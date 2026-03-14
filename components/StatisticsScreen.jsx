import { CampaignPie } from '@/components/CampaignPie.jsx';
import { languageCurrency } from '@/lib/translationUtils.js';

function StatCard({ label, value, tone = 'default' }) {
    return (
        <div className={`statistics-card statistics-card--${tone}`}>
            <div className="statistics-card-label">{label}</div>
            <div className="statistics-card-value">{value}</div>
        </div>
    );
}

export default function StatisticsScreen({
    isOpen,
    onClose,
    t,
    theme,
    language,
    localizedTiers,
    selectedTier,
    totalRaised,
    totalGoal,
    campaignGoal,
    ramadanRaised,
    engagementAmount,
    totalsByEmail,
}) {
    if (!isOpen) return null;

    const currencyFirst = language === 'en';
    const donorCount = Object.keys(totalsByEmail || {}).length;
    const fundedBricks = localizedTiers.reduce((sum, tier) => sum + tier.funded, 0);
    const totalBricks = localizedTiers.reduce((sum, tier) => sum + tier.total, 0);
    const averageDonation = donorCount > 0 ? Math.round(totalRaised / donorCount) : 0;
    const selected = localizedTiers[selectedTier] ?? localizedTiers[0];
    const globalRemaining = Math.max(0, totalGoal - totalRaised);
    const globalCompletionPct = totalGoal > 0 ? Math.round((totalRaised / totalGoal) * 100) : 0;
    const campaignReceived = Math.min(campaignGoal, ramadanRaised);
    const campaignEngagement = Math.min(campaignGoal, engagementAmount);
    const campaignRemaining = Math.max(0, campaignGoal - campaignReceived);
    const campaignCompletionPct = campaignGoal > 0 ? Math.round((campaignReceived / campaignGoal) * 100) : 0;

    const overviewBars = [
        {
            key: 'engagement',
            label: t.ramadanObjective || 'Campaign Engagement',
            value: campaignEngagement,
            total: campaignGoal,
            color: theme.accentGold,
        },
        {
            key: 'received',
            label: t.engagement || 'Campaign Received',
            value: campaignReceived,
            total: campaignGoal,
            color: selected?.color || theme.accentGold,
        },
    ];

    return (
        <div className="statistics-screen-overlay" role="dialog" aria-modal="true" aria-label={t.campaignOverview || 'Campaign statistics'} onClick={onClose}>
            <div className="statistics-screen" onClick={(event) => event.stopPropagation()}>
                <button
                    type="button"
                    className="statistics-screen-close"
                    onClick={onClose}
                    aria-label="Close statistics"
                >
                    ×
                </button>

                <div className="statistics-screen-header">
                    <div className="statistics-screen-eyebrow">{t.campaignOverview || 'Campaign overview'}</div>
                    <h2 className="statistics-screen-title">{t.campaignOverview || 'Campaign overview'}</h2>
                    <p className="statistics-screen-description">
                        {t.aboutCampaignText}
                    </p>
                </div>

                <div className="statistics-screen-grid">
                    <section className="statistics-panel statistics-panel--metrics">
                        <div className="statistics-metrics-stack">
                            <div className="statistics-metrics-group">
                                <div className="statistics-section-title">Global goal</div>
                                <div className="statistics-metrics-grid">
                                    <StatCard
                                        label={t.collectedFundsLabel || 'Collected funds'}
                                        value={languageCurrency(totalRaised, currencyFirst)}
                                        tone="gold"
                                    />
                                    <StatCard
                                        label={t.remainingGoalLabel || 'Remaining goal'}
                                        value={languageCurrency(globalRemaining, currencyFirst)}
                                    />
                                    <StatCard
                                        label={t.donorsList || 'List of donors'}
                                        value={donorCount.toLocaleString(language)}
                                    />
                                    <StatCard
                                        label={t.goal || 'Goal'}
                                        value={`${globalCompletionPct}%`}
                                        tone="accent"
                                    />
                                    <StatCard
                                        label={t.bricks || 'Bricks'}
                                        value={`${fundedBricks}/${totalBricks}`}
                                    />
                                    <StatCard
                                        label={'Avg. support'}
                                        value={languageCurrency(averageDonation, currencyFirst)}
                                    />
                                </div>
                            </div>

                            <div className="statistics-metrics-group">
                                <div className="statistics-section-title">Current goal</div>
                                <div className="statistics-metrics-grid">
                                    <StatCard
                                        label={t.collectedFundsLabel || 'Collected funds'}
                                        value={languageCurrency(campaignReceived, currencyFirst)}
                                        tone="gold"
                                    />
                                    <StatCard
                                        label={t.remainingGoalLabel || 'Remaining goal'}
                                        value={languageCurrency(campaignRemaining, currencyFirst)}
                                    />
                                    <StatCard
                                        label={t.ramadanObjective || 'Campaign engagement'}
                                        value={languageCurrency(campaignEngagement, currencyFirst)}
                                    />
                                    <StatCard
                                        label={t.goal || 'Goal'}
                                        value={`${campaignCompletionPct}%`}
                                        tone="accent"
                                    />
                                    <StatCard
                                        label={'Current target'}
                                        value={languageCurrency(campaignGoal, currencyFirst)}
                                    />
                                    <StatCard
                                        label={t.engagement || 'Campaign received'}
                                        value={languageCurrency(campaignReceived, currencyFirst)}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="statistics-panel statistics-panel--pie">
                        <CampaignPie
                            totalGoal={campaignGoal}
                            totalRaised={campaignReceived}
                            ramadanRaised={campaignReceived}
                            theme={theme}
                            language={language}
                            t={t}
                            sel={selected}
                        />
                    </section>

                    <section className="statistics-panel statistics-panel--tier-breakdown">
                        <div className="statistics-section-title">Tier breakdown</div>
                        <div className="statistics-tier-list">
                            {localizedTiers.map((tier) => {
                                const pct = tier.total > 0 ? Math.round((tier.funded / tier.total) * 100) : 0;
                                return (
                                    <div key={tier.key} className="statistics-tier-row">
                                        <div className="statistics-tier-row-top">
                                            <span className="statistics-tier-name">{tier.label}</span>
                                            <span className="statistics-tier-meta">
                                                {languageCurrency(tier.amount, currencyFirst)} · {pct}%
                                            </span>
                                        </div>
                                        <div className="statistics-tier-bar">
                                            <div
                                                className="statistics-tier-bar-fill"
                                                style={{ width: `${pct}%`, background: tier.color }}
                                            ></div>
                                        </div>
                                        <div className="statistics-tier-row-bottom">
                                            <span>{t.brickCount(tier.funded, tier.total)}</span>
                                            <span>{languageCurrency(tier.funded * tier.amount, currencyFirst)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="statistics-panel statistics-panel--comparison">
                        <div className="statistics-section-title">Campaign comparison</div>
                        <div className="statistics-comparison-list">
                            {overviewBars.map((bar) => {
                                const pct = bar.total > 0 ? Math.min(100, Math.round((bar.value / bar.total) * 100)) : 0;
                                return (
                                    <div key={bar.key} className="statistics-comparison-row">
                                        <div className="statistics-comparison-top">
                                            <span>{bar.label}</span>
                                            <span>{languageCurrency(bar.value, currencyFirst)}</span>
                                        </div>
                                        <div className="statistics-comparison-track">
                                            <div
                                                className="statistics-comparison-fill"
                                                style={{ width: `${pct}%`, background: bar.color }}
                                            ></div>
                                        </div>
                                        <div className="statistics-comparison-bottom">
                                            <span>{pct}%</span>
                                            <span>{languageCurrency(bar.total, currencyFirst)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
