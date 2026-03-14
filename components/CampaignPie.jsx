import { THEMES } from '@/constants/config.js';
import { languageCurrency } from '@/lib/translationUtils.js';

export function CampaignPie({ totalGoal, totalRaised, ramadanRaised, theme, language, t, sel }) {
    const th = theme ?? THEMES.dark;
    if (!totalGoal || totalGoal <= 0) return null;

    const safe = (v) => Math.max(0, Number.isFinite(v) ? v : 0);
    const ramadan = safe(ramadanRaised);
    const otherRaised = safe(totalRaised - ramadanRaised);
    const remaining = safe(totalGoal - totalRaised);

    const slices = [
        {
            key: "ramadan",
            label: t.ramadanRaisedLabel,
            value: ramadan,
            color: theme.accentGold,
        },
        {
            key: "other",
            label: t.collectedFundsLabel,
            value: otherRaised,
            color: sel?.color ?? "#4FB6B0",
        },
        {
            key: "remaining",
            label: t.remainingGoalLabel,
            value: remaining,
            color: "#5B627A",
        },
    ].filter((s) => s.value > 0);

    const total = slices.reduce((sum, s) => sum + s.value, 0);
    if (total <= 0) return null;

    let currentAngle = -90;
    const radius = 52;
    const cx = 60;
    const cy = 60;

    const arcs = slices.map((slice) => {
        const angle = (slice.value / total) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;

        const largeArc = angle > 180 ? 1 : 0;
        const startRad = (Math.PI / 180) * startAngle;
        const endRad = (Math.PI / 180) * endAngle;

        const x1 = cx + radius * Math.cos(startRad);
        const y1 = cy + radius * Math.sin(startRad);
        const x2 = cx + radius * Math.cos(endRad);
        const y2 = cy + radius * Math.sin(endRad);

        const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        return { slice, d };
    });

    const formatCurrency = (v) => languageCurrency(v, language === "en");
    const formatPct = (v) => Math.round((v / totalGoal) * 100);

    return (
        <div className="campaign-pie">
            <div className="campaign-pie-title">
                {t.campaignOverview}
            </div>
            <div className="campaign-pie-body">
                <svg
                    viewBox="0 0 120 120"
                    className="campaign-pie-svg"
                    role="img"
                    aria-label={`${t.campaignOverview}: ${formatPct(totalRaised)}% ${t.reached}`}
                >
                    {arcs.map(({ slice, d }) => (
                        <path key={slice.key} d={d} fill={slice.color} stroke={th.bgSidebar} strokeWidth="0.5" className={slice.key === "other" ? "campaign-pie-slice-glow" : ""} />
                    ))}
                    <circle cx={cx} cy={cy} r={26} fill={th.bgSidebar} />
                    <text x={cx} y={cy - 4} textAnchor="middle" fontSize="10" fill={th.textPrimary} fontWeight="700">
                        {formatPct(totalRaised)}
                        {"%"}
                    </text>
                    <text x={cx} y={cy + 9} textAnchor="middle" fontSize="7" fill={th.textMuted}>
                        {t.reached}
                    </text>
                </svg>
                <div className="campaign-pie-legend">
                    {slices.map((slice) => (
                        <div key={slice.key} className="campaign-pie-legend-row">
                            <span
                                className="campaign-pie-dot"
                                style={{ backgroundColor: slice.color }}
                            ></span>
                            <div className="campaign-pie-legend-text">
                                <span className="campaign-pie-legend-label">{slice.label}</span>
                                <span className="campaign-pie-legend-value">
                                    {formatCurrency(slice.value)} · {formatPct(slice.value)}%
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
