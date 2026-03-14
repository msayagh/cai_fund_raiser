import { useMemo } from 'react';
import { THEMES, BOUNDARIES } from '../../constants/config.js';

export function MosaicGrid({ tiers, gridTop, gridBottom, W, insideTest, selectedTier, theme }) {
    const COLS = 32;
    const MORTAR = 2;
    const bH = 8;
    const bW = (W - MORTAR * (COLS + 1)) / COLS;
    const ROWS = Math.ceil((gridBottom - gridTop) / (bH + MORTAR));

    const { tierSlots, structural } = useMemo(() => {
        const all = [];

        for (let r = 0; r < ROWS; r += 1) {
            for (let c = 0; c < COLS; c += 1) {
                const stagger = r % 2 === 1 ? -(bW + MORTAR) / 2 : 0;
                const x = MORTAR + c * (bW + MORTAR) + stagger;
                const y = gridTop + r * (bH + MORTAR);
                const cx = x + bW / 2;
                const cy = y + bH / 2;

                if (!insideTest(cx, cy)) continue;

                const tier = cy >= BOUNDARIES[0] ? 0 : cy >= BOUNDARIES[1] ? 1 : cy >= BOUNDARIES[2] ? 2 : 3;
                all.push({ x, y, cy, tier });
            }
        }

        const byTier = { 0: [], 1: [], 2: [], 3: [] };
        all.forEach((brick) => byTier[brick.tier].push(brick));
        Object.values(byTier).forEach((arr) => arr.sort((a, b) => b.cy - a.cy));

        const nextStructural = [];
        const nextTierSlots = {};
        Object.keys(byTier).forEach((key) => {
            nextTierSlots[key] = byTier[key].slice(0, 320);
            if (+key === 3) nextStructural.push(...byTier[key].slice(320));
        });

        return { tierSlots: nextTierSlots, structural: nextStructural };
    }, [ROWS, COLS, MORTAR, bW, gridTop, bH, insideTest]);

    return (
        <g>
            {structural.map(({ x, y }, i) => (
                <rect
                    key={`st${i}`}
                    x={x + 0.6}
                    y={y + 0.6}
                    width={bW - 1.2}
                    height={bH - 1.2}
                    fill={theme?.vizBrickStructural ?? "rgba(0,0,0,0.55)"}
                    stroke={tiers[3].color}
                    strokeWidth="1.0"
                    opacity={0.2}
                    rx="0.8"
                />
            ))}

            {[0, 1, 2, 3].map((tid) => {
                const tier = tiers[tid];
                const slots = tierSlots[tid] || [];
                const isSelected = selectedTier === tid;

                return slots.map(({ x, y }, idx) => {
                    const paid = idx < tier.funded;
                    const color = tier.color;

                    if (!paid) {
                        return (
                            <rect
                                key={`${tid}-${idx}`}
                                x={x + 0.6}
                                y={y + 0.6}
                                width={bW - 1.2}
                                height={bH - 1.2}
                                fill={theme?.vizBrickUnfunded ?? "rgba(0,0,0,0.6)"}
                                stroke={color}
                                strokeWidth="1.2"
                                opacity={isSelected ? 0.65 : 0.45}
                                rx="0.8"
                            />
                        );
                    }

                    return (
                        <g key={`${tid}-${idx}`}>
                            <rect x={x} y={y} width={bW} height={bH} fill={color} rx="0.8" opacity={isSelected ? 1 : 0.85} />
                            <rect x={x + 0.5} y={y + 0.5} width={bW - 1} height={Math.min(3, bH * 0.28)} fill="rgba(255,255,255,0.36)" rx="0.4" />
                            <rect x={x + 0.5} y={y + 0.5} width={Math.min(2.5, bW * 0.14)} height={bH - 1} fill="rgba(255,255,255,0.20)" rx="0.3" />
                            <rect x={x + 0.5} y={y + bH - Math.min(3, bH * 0.28)} width={bW - 1} height={Math.min(3, bH * 0.28)} fill="rgba(0,0,0,0.42)" rx="0.4" />
                            <rect x={x + bW - Math.min(2.5, bW * 0.14)} y={y + 0.5} width={Math.min(2.5, bW * 0.14)} height={bH - 1} fill="rgba(0,0,0,0.30)" rx="0.3" />
                        </g>
                    );
                });
            })}
        </g>
    );
}
