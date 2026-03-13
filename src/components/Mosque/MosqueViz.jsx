import { useMemo, memo } from 'react';
import { THEMES, BOUNDARIES } from '../../constants/config.js';
import { MosaicGrid } from './MosaicGrid.jsx';
import { createMosqueShapes, createInsideTest } from './mosqueShapes.jsx';

function MosqueVizInner({ tiers, selectedTier, onSelectTier, theme }) {
    const th = theme ?? THEMES.dark;
    const W = 800;
    const H = 740;
    const mosqueShapes = useMemo(() => createMosqueShapes(undefined), []);
    const maskShapes = useMemo(() => createMosqueShapes("black", "none"), []);

    const BH = 8;
    const NUDGE = 7;
    const TOP = BH / 2 + NUDGE;
    const BOT = BH / 2;

    const bands = [
        { tier: 3, y1: 0, y2: BOUNDARIES[2] - BOT },
        { tier: 2, y1: BOUNDARIES[2] - TOP, y2: BOUNDARIES[1] - BOT },
        { tier: 1, y1: BOUNDARIES[1] - TOP, y2: BOUNDARIES[0] - BOT },
        { tier: 0, y1: BOUNDARIES[0] - TOP, y2: 740 },
    ];

    const insideTest = useMemo(() => createInsideTest(), []);

    const gradId = `mg-${th.mode}`;
    const moonId = `moonGlow-${th.mode}`;
    return (
        <svg
            className="mosque-viz-svg"
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
        >
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={th.vizGradientTop} />
                    <stop offset="100%" stopColor={th.vizGradientBottom} />
                </linearGradient>
                <radialGradient id={moonId} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={th.vizMoonBg} stopOpacity={th.mode === "light" ? 0.5 : 0.22} />
                    <stop offset="100%" stopColor={th.vizMoonBg} stopOpacity="0" />
                </radialGradient>

                <clipPath id="mc">{mosqueShapes}</clipPath>

                {bands.map((b) => (
                    <clipPath key={`bc${b.tier}`} id={`bc${b.tier}`}>
                        <rect x="0" y={b.y1} width={W} height={b.y2 - b.y1} />
                    </clipPath>
                ))}

                <mask id="outsideMask">
                    <rect x="0" y="0" width={W} height={H} fill="white" />
                    {maskShapes}
                </mask>
            </defs>

            <rect x="0" y="0" width={W} height={H} fill={`url(#${gradId})`} />

            <g clipPath="url(#mc)">
                <rect x="0" y="0" width={W} height={H} fill={th.vizInnerFill} />
            </g>

            <g clipPath="url(#mc)" className="mosque-viz-grid-layer">
                <MosaicGrid tiers={tiers} gridTop={130} gridBottom={H} W={W} insideTest={insideTest} selectedTier={selectedTier} theme={th} />
            </g>

            <rect x="0" y="0" width={W} height={H} fill={th.vizMaskFill} opacity="1" mask="url(#outsideMask)" />

            <g mask="url(#outsideMask)" className="mosque-viz-sky-layer">
                {[
                    [0, 241, 0.8], [781, 236, 0.7], [206, 49, 0.9], [198, 87, 0.5],
                    [431, 60, 0.9], [320, 202, 0.8], [142, 373, 0.9], [78, 14, 0.4],
                    [636, 107, 0.7], [503, 189, 0.9], [581, 271, 0.7], [246, 33, 1.0],
                    [194, 197, 0.9], [649, 124, 0.5], [427, 179, 0.6], [404, 73, 0.7],
                    [112, 317, 0.8], [703, 209, 0.8], [340, 51, 1.0], [762, 69, 0.5],
                    [513, 88, 0.8], [138, 134, 0.6], [335, 193, 0.7], [537, 141, 1.0],
                    [126, 417, 0.7], [30, 413, 0.8], [759, 417, 0.9], [320, 164, 0.9],
                    [592, 200, 0.7], [215, 148, 1.0],
                ].map(([cx, cy, op], i) => (
                    <circle key={`star${i}`} cx={cx} cy={cy} r="1.2" fill={th.vizStarFill} opacity={th.mode === "light" ? op * 0.6 : op} />
                ))}

                <circle cx="680" cy="55" r="25" fill={`url(#${moonId})`} />
                <circle cx="680" cy="55" r="13" fill={th.vizMoonBg} opacity="0.92" className="moon-glow" />
                <circle cx="675" cy="54" r="12" fill={th.vizMoonCrater} />
            </g>

            {selectedTier !== null && (() => {
                const band = bands.find((item) => item.tier === selectedTier);
                const col = tiers[selectedTier].color;

                if (!band) return null;

                return (
                    <g clipPath="url(#mc)" style={{ pointerEvents: "none" }}>
                        <rect x={0} y={band.y1} width={W} height={band.y2 - band.y1} fill={`${col}28`} />
                        <rect x={0} y={band.y1} width={W} height={band.y2 - band.y1} fill="none" stroke={col} strokeWidth="3" opacity="0.75" />
                    </g>
                );
            })()}

            <g clipPath="url(#mc)" className="mosque-viz-band-lines">
                {bands.slice(0, 3).map((b) => (
                    <line key={`s${b.tier}`} x1="0" y1={b.y2} x2={W} y2={b.y2} stroke={th.vizLineStroke} strokeWidth="1.5" strokeDasharray="6 5" />
                ))}

                <g stroke={th.vizLineStroke} fill={th.vizAccentFill} strokeWidth="1.5">
                    <path d="M 138 735 L 138 648 Q 138 615 163 615 Q 188 615 188 648 L 188 735 Z" />
                    <path d="M 238 735 L 238 648 Q 238 615 263 615 Q 288 615 288 648 L 288 735 Z" />
                    <path d="M 512 735 L 512 648 Q 512 615 537 615 Q 562 615 562 648 L 562 735 Z" />
                    <path d="M 612 735 L 612 648 Q 612 615 637 615 Q 662 615 662 648 L 662 735 Z" />
                </g>

                <line x1="94" y1="600" x2="706" y2="600" stroke={th.vizLineMuted} strokeWidth="1" />

                {[-180, -110, -50, 50, 110, 180].map((dx) => {
                    const cy = 430;
                    const ry = 230;
                    const topY = cy - ry;

                    return (
                        <line
                            key={dx}
                            x1={400 + dx}
                            y1={cy - Math.sqrt(Math.max(0, ry * ry - dx * dx))}
                            x2={400}
                            y2={topY + 2}
                            stroke={th.vizLineSubtle}
                            strokeWidth="1"
                        />
                    );
                })}
            </g>

            {bands.map((b) => (
                <g key={`hit${b.tier}`} clipPath="url(#mc)">
                    <rect x={0} y={b.y1} width={W} height={b.y2 - b.y1} fill="transparent" style={{ cursor: "pointer", pointerEvents: "auto" }} onClick={() => onSelectTier(b.tier)} />
                </g>
            ))}
        </svg>
    );
}

export const MosqueViz = memo(MosqueVizInner);
