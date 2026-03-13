import React, { useMemo, useState, useEffect, useRef, memo } from "react";
import "./mosque-donation.css";

const TRANSLATION_LOADERS = import.meta.glob("./translations/*.jsx");
const TRANSLATION_MODULES = import.meta.glob("./translations/*.jsx", { eager: true });
const DEFAULT_LANGUAGE = "en";

function getLanguageCodeFromPath(path) {
  const match = path.match(/\/([^/]+)\.jsx$/);
  return match ? match[1] : null;
}

function getLanguageLabel(code) {
  const capitalize = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

  try {
    return capitalize(new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code.toUpperCase());
  } catch {
    return code.toUpperCase();
  }
}

const AVAILABLE_LANGUAGE_CODES = Object.keys(TRANSLATION_LOADERS)
  .map(getLanguageCodeFromPath)
  .filter(Boolean)
  .sort((a, b) => {
    if (a === DEFAULT_LANGUAGE) return -1;
    if (b === DEFAULT_LANGUAGE) return 1;
    return a.localeCompare(b);
  });

const LANGUAGE_OPTIONS = AVAILABLE_LANGUAGE_CODES.map((code) => ({
  code,
  label: getLanguageLabel(code),
}));

const DEFAULT_TRANSLATION =
  TRANSLATION_MODULES[`./translations/${DEFAULT_LANGUAGE}.jsx`]?.default ??
  Object.values(TRANSLATION_MODULES)[0]?.default ??
  {};
const INITIAL_LANGUAGE = AVAILABLE_LANGUAGE_CODES.includes("fr") ? "fr" : DEFAULT_LANGUAGE;
const INITIAL_TRANSLATION =
  TRANSLATION_MODULES[`./translations/${INITIAL_LANGUAGE}.jsx`]?.default ??
  DEFAULT_TRANSLATION;

/** Light mode: WCAG-compliant, warm, spacious. Dark mode: original. */
const THEMES = {
  dark: {
    mode: "dark",
    bgPage: "#090c18",
    bgHeader: "#0e1020",
    bgSidebar: "#0e1020",
    bgCard: "#131628",
    bgCardAlt: "#181b30",
    bgCardSelected: "#1e2240",
    border: "#2e3250",
    borderAccent: "rgba(200,169,110,0.22)",
    textPrimary: "#ffffff",
    textSecondary: "#f0e8d8",
    textMuted: "#c0c0d8",
    textMutedAlt: "#d7d1c4",
    accentGold: "#D4A96E",
    scrollbarThumb: "rgba(200,169,110,0.22)",
    // Mosque viz
    vizGradientTop: "#12142a",
    vizGradientBottom: "#0a0c1c",
    vizInnerFill: "#161930",
    vizMaskFill: "#090c18",
    vizBrickUnfunded: "rgba(0,0,0,0.6)",
    vizBrickStructural: "rgba(0,0,0,0.55)",
    vizProgressTrack: "#2e3250",
    vizStarFill: "white",
    vizLineStroke: "rgba(255,255,255,0.18)",
    vizLineMuted: "rgba(255,255,255,0.10)",
    vizLineSubtle: "rgba(255,255,255,0.07)",
    vizAccentFill: "rgba(0,0,0,0.25)",
    vizMoonBg: "#fffde8",
    vizMoonCrater: "#090c18",
    vizHadith: "#e8e0d0",
  },
  light: {
    mode: "light",
    bgPage: "#f8f6f2",
    bgHeader: "#ffffff",
    bgSidebar: "#faf9f6",
    bgCard: "#ffffff",
    bgCardAlt: "#f5f3ef",
    bgCardSelected: "#f0ebe3",
    border: "#e5e2dc",
    borderAccent: "rgba(154,123,79,0.25)",
    textPrimary: "#1a1a1a",
    textSecondary: "#2d2d2d",
    textMuted: "#5c5c5c",
    textMutedAlt: "#6b6b6b",
    accentGold: "#9a7b4f",
    scrollbarThumb: "rgba(154,123,79,0.3)",
    // Mosque viz
    vizGradientTop: "#e8e6e0",
    vizGradientBottom: "#d8d4cc",
    vizInnerFill: "#e0ddd6",
    vizMaskFill: "#f8f6f2",
    vizBrickUnfunded: "rgba(0,0,0,0.12)",
    vizBrickStructural: "rgba(0,0,0,0.08)",
    vizProgressTrack: "#e5e2dc",
    vizStarFill: "#2d2d2d",
    vizLineStroke: "rgba(0,0,0,0.12)",
    vizLineMuted: "rgba(0,0,0,0.08)",
    vizLineSubtle: "rgba(0,0,0,0.06)",
    vizAccentFill: "rgba(0,0,0,0.06)",
    vizMoonBg: "rgba(51, 51, 51, 0.9)",
    vizMoonCrater: "rgba(225, 226, 228, 0.9)",
    vizHadith: "#3d3d3d",
  },
};

// ── Translation loader — imports are code-split per language ───────────────
const loadTranslation = async (lang) => {
  const loader = TRANSLATION_LOADERS[`./translations/${lang}.jsx`];
  if (!loader) return DEFAULT_TRANSLATION;
  const module = await loader();
  return module?.default ?? module ?? DEFAULT_TRANSLATION;
};

// ── QR Code component — replace DONATION_URL with your real link ───────────────
const DONATION_URL = "https://your-donation-page.com";

function QRCode({ color, alt, theme }) {
  const src = `qr-code.jpeg`;

  return (
    <img
      src={src}
      alt={alt}
      width={240}
      height={240}
      style={{ borderRadius: "8px", border: `2px solid ${color}` }}
    />
  );
}

const TIER_CONFIG = {
  foundation: { key: "foundation", name: "Mutasaddiq", funded: 0, total: 320, amount: 500, color: "#C8935A" },
  walls: { key: "walls", name: "Kareem", funded: 0, total: 320, amount: 1000, color: "#7EB8A0" },
  arches: { key: "arches", name: "Jawaad", funded: 0, total: 320, amount: 1500, color: "#8AAED4" },
  dome: { key: "dome", name: "Sabbaq", funded: 0, total: 320, amount: 2000, color: "#B87AD9" },
};

/** Base Google Sheet URL (from env). Used for stats and orders sheets. */
function getGoogleSheetAppUrl() {
  return typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GOOGLE_SHEET_APP_URL;
}

/** Sheet gid for "stats" (funded counts). Optional; if unset, exports first sheet. */
function getStatsGid() {
  const v = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GOOGLE_SHEET_STATS_GID;
  return v != null && String(v).trim() !== "" ? String(v).trim() : null;
}

/** Sheet gid for "orders" (donations). Optional; if unset, exports first sheet. */
function getOrdersGid() {
  const v = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GOOGLE_SHEET_ORDERS_GID;
  return v != null && String(v).trim() !== "" ? String(v).trim() : null;
}

/** Build CSV export URL from spreadsheet URL, optionally targeting a sheet by gid. */
function buildCsvExportUrl(baseUrl, gid) {
  if (!baseUrl) return null;
  const exportUrl = baseUrl.replace(/\/edit.*$/, "/export?format=csv");
  return gid ? `${exportUrl}&gid=${gid}` : exportUrl;
}

const TIER_KEYS = ["foundation", "walls", "arches", "dome"];

function convertCsvToJson(csv) {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const data = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index] ?? "";
      return acc;
    }, {});
  });
  return data;
}

/** Parse a value to a non‑negative integer for the funded column. */
function parseFundedValue(value) {
  if (value == null || value === "") return 0;
  const str = String(value).trim().replace(/\s/g, "").replace('"', "");
  const n = parseInt(str, 10);
  return Number.isNaN(n) ? 0 : Math.max(0, Math.floor(n));
}

/**
 * Reduces CSV rows to { foundation, walls, arches, dome } with cleaned, integer funded values.
 * Expects rows with a tier identifier (column "tier", "key", or first column) and "funded" column.
 */
function cleanAndParseFundedRows(rows) {
  const out = { foundation: 0, walls: 0, arches: 0, dome: 0 };
  const tierKeysSet = new Set(TIER_KEYS);
  for (const row of rows) {
    const keys = Object.keys(row);
    const tierCol = keys.find((k) => /^(tier|key|name)$/i.test(k)) || keys[0];
    const fundedCol = keys.find((k) => /^funded$/i.test(k)) || keys[1] || keys[0];
    const tierRaw = row[tierCol];
    const fundedRaw = row[fundedCol];
    const tier = tierRaw != null ? String(tierRaw).trim().toLowerCase() : "";
    if (!tier || !tierKeysSet.has(tier)) continue;
    out[tier] = parseFundedValue(fundedRaw);
  }
  return out;
}

/**
 * Fetches funded counts per tier from a private Google Sheet (CSV export).
 * Returns { foundation, walls, arches, dome } with cleaned integer values.
 * @returns {Promise<{ foundation: number, walls: number, arches: number, dome: number } | null>}
 */
async function fetchFundedFromSheet() {
  const url = getGoogleSheetAppUrl();
  const exportUrl = buildCsvExportUrl(url, getStatsGid());
  if (!exportUrl) return null;
  try {
    const res = await fetch(exportUrl, { method: "GET", cache: "no-store" });
    if (!res.ok) return null;
    const text = await res.text();
    const rows = convertCsvToJson(text);
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return cleanAndParseFundedRows(rows);
  } catch {
    return null;
  }
}

/** @typedef {"foundation"|"walls"|"arches"|"dome"} TierKey */

/**
 * @typedef {Object} DonationRow
 * @property {number} id - Row id
 * @property {TierKey} tier - Tier key
 * @property {number} donated - Amount donated
 * @property {string} donorName - Donor's name
 * @property {string} donorLabel - Donor label (e.g. "Anonymous")
 */

function getDonationsSheetUrl() {
  const donations = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GOOGLE_DONATIONS_SHEET_URL;
  return donations || getGoogleSheetAppUrl();
}

/** Parse donated amount to number. */
function parseDonatedValue(value) {
  if (value == null || value === "") return 0;
  const str = String(value).trim().replace(/[^\d.-]/g, "");
  const n = parseFloat(str);
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

/**
 * Parses CSV rows into DonationRow[]. Expects columns: id, tier, donated, donorName, donorLabel.
 * @param {Object[]} rows - Raw CSV row objects
 * @returns {DonationRow[]}
 */
function cleanAndParseDonationRows(rows) {
  const tierKeysSet = new Set(TIER_KEYS);
  const out = [];
  const normalize = (s) => String(s || "").toLowerCase().replace(/[\s_-]/g, "");
  for (const row of rows) {
    const keys = Object.keys(row);
    const get = (aliases) => {
      const norm = aliases.map(normalize);
      const k = keys.find((key) => norm.includes(normalize(key)));
      return k != null ? row[k] : "";
    };
    const idRaw = get(["id"]);
    const tierRaw = get(["tier", "key"]);
    const donatedRaw = get(["donated", "amount"]);
    const donorNameRaw = get(["donorname", "donor_name", "donor name", "name"]);
    const donorLabelRaw = get(["donorlabel", "donor_label", "donor label", "label"]);
    const id = parseInt(String(idRaw).trim(), 10);
    const tier = tierRaw != null ? String(tierRaw).trim().toLowerCase() : "";
    if (!tier || !tierKeysSet.has(tier)) continue;
    out.push({
      id: Number.isNaN(id) ? out.length : id,
      tier,
      donated: parseDonatedValue(donatedRaw),
      donorName: donorNameRaw != null ? String(donorNameRaw).trim() : "",
      donorLabel: donorLabelRaw != null ? String(donorLabelRaw).trim() : "",
    });
  }
  return out.sort((a, b) => b.id - a.id);
}

/**
 * Fetches donations from a Google Sheet (CSV export).
 * @returns {Promise<DonationRow[]>}
 */
async function fetchDonationsFromSheet() {
  const url = getDonationsSheetUrl();
  const exportUrl = buildCsvExportUrl(url, getOrdersGid());
  if (!exportUrl) return [];
  try {
    const res = await fetch(exportUrl, { method: "GET", cache: "no-store" });
    if (!res.ok) return [];
    const text = await res.text();
    const rows = convertCsvToJson(text);
    if (!Array.isArray(rows) || rows.length === 0) return [];
    // Filter out rows based on donation form
    const filteredRows = rows.filter((row) => row["détails"].startsWith("Levée de fonds ") || row["détails"].startsWith("Travaux d’aménagement dans le nouveau centr"));
    return filteredRows;
  } catch {
    return [];
  }
}

const INITIAL_TIERS = [
  { id: 0, ...TIER_CONFIG.foundation },
  { id: 1, ...TIER_CONFIG.walls },
  { id: 2, ...TIER_CONFIG.arches },
  { id: 3, ...TIER_CONFIG.dome },
];

const BOUNDARIES = [624, 514, 394];

function createMosqueShapes(fill, stroke = "none") {
  return [
    <rect key="ml1" x="42" y="130" width="52" height="610" fill={fill} stroke={stroke} />,
    <ellipse key="ml2" cx="68" cy="130" rx="26" ry="20" fill={fill} stroke={stroke} />,
    <ellipse key="ml3" cx="68" cy="112" rx="20" ry="26" fill={fill} stroke={stroke} />,
    <rect key="ml4" x="60" y="86" width="16" height="36" fill={fill} stroke={stroke} />,
    <polygon key="ml5" points="58,90 78,90 68,15" fill={fill} stroke={stroke} />,
    <rect key="ml6" x="30" y="310" width="76" height="14" fill={fill} stroke={stroke} />,
    <rect key="ml7" x="34" y="195" width="68" height="11" fill={fill} stroke={stroke} />,

    <rect key="mr1" x="706" y="130" width="52" height="610" fill={fill} stroke={stroke} />,
    <ellipse key="mr2" cx="732" cy="130" rx="26" ry="20" fill={fill} stroke={stroke} />,
    <ellipse key="mr3" cx="732" cy="112" rx="20" ry="26" fill={fill} stroke={stroke} />,
    <rect key="mr4" x="724" y="86" width="16" height="36" fill={fill} stroke={stroke} />,
    <polygon key="mr5" points="722,90 742,90 732,15" fill={fill} stroke={stroke} />,
    <rect key="mr6" x="694" y="310" width="76" height="14" fill={fill} stroke={stroke} />,
    <rect key="mr7" x="698" y="195" width="68" height="11" fill={fill} stroke={stroke} />,

    <ellipse key="dome" cx="400" cy="430" rx="230" ry="230" fill={fill} stroke={stroke} />,
    <rect key="drum" x="170" y="380" width="460" height="380" fill={fill} stroke={stroke} />,
    <rect key="hall" x="94" y="460" width="612" height="280" fill={fill} stroke={stroke} />,

    <ellipse key="sd1" cx="182" cy="462" rx="74" ry="68" fill={fill} stroke={stroke} />,
    <rect key="sd1b" x="108" y="462" width="148" height="55" fill={fill} stroke={stroke} />,
    <rect key="sd1s" x="176" y="395" width="12" height="72" fill={fill} stroke={stroke} />,
    <polygon key="sd1p" points="170,401 194,401 182,345" fill={fill} stroke={stroke} />,

    <ellipse key="sd2" cx="618" cy="462" rx="74" ry="68" fill={fill} stroke={stroke} />,
    <rect key="sd2b" x="544" y="462" width="148" height="55" fill={fill} stroke={stroke} />,
    <rect key="sd2s" x="612" y="395" width="12" height="72" fill={fill} stroke={stroke} />,
    <polygon key="sd2p" points="606,401 630,401 618,345" fill={fill} stroke={stroke} />,

    <rect key="iw1" x="330" y="405" width="140" height="340" fill={fill} stroke={stroke} />,
    <ellipse key="iw2" cx="400" cy="407" rx="70" ry="58" fill={fill} stroke={stroke} />,

    <rect key="sp1" x="391" y="110" width="18" height="60" fill={fill} stroke={stroke} />,
    <ellipse key="sp2" cx="400" cy="112" rx="20" ry="14" fill={fill} stroke={stroke} />,
    <polygon key="sp3" points="388,118 412,118 400,30" fill={fill} stroke={stroke} />,
  ];
}

function MosaicGrid({ tiers, gridTop, gridBottom, W, insideTest, selectedTier, theme }) {
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

  const insideTest = useMemo(
    () => (x, y) => {
      if (x >= 42 && x <= 94) return true;
      if (x >= 706 && x <= 758) return true;
      if (((x - 400) / 230) ** 2 + ((y - 430) / 230) ** 2 <= 1) return true;
      if (x >= 170 && x <= 630 && y >= 380) return true;
      if (x >= 94 && x <= 706 && y >= 460) return true;
      if (((x - 182) / 74) ** 2 + ((y - 462) / 68) ** 2 <= 1) return true;
      if (((x - 618) / 74) ** 2 + ((y - 462) / 68) ** 2 <= 1) return true;
      if (x >= 330 && x <= 470 && y >= 405) return true;
      if (((x - 400) / 70) ** 2 + ((y - 407) / 58) ** 2 <= 1) return true;
      return false;
    },
    []
  );

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
        <circle cx="680" cy="55" r="13" fill={th.vizMoonBg} opacity="0.92" />
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

const MosqueViz = memo(MosqueVizInner);

function TierCardInner({ tier, selected, onSelect, t, theme, dollarFirst = true }) {
  const th = theme ?? THEMES.dark;
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

const TierCard = memo(TierCardInner);

function languageCurrency(amount, dollarFirst = true) {
  return dollarFirst ? `$${amount.toLocaleString()}` : `${amount.toLocaleString()} $`;
}

function CampaignPie({ totalGoal, totalRaised, ramadanRaised, theme, language, t }) {
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
      color: "#4FB6B0",
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
        <svg viewBox="0 0 120 120" className="campaign-pie-svg" aria-hidden="true">
          {arcs.map(({ slice, d }) => (
            <path key={slice.key} d={d} fill={slice.color} stroke={th.bgSidebar} strokeWidth="0.5" />
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
              <span className="campaign-pie-dot"></span>
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

/**
 * @param {{ donations: DonationRow[]; tiers: Array<{key: string; label: string; amount: number; color?: string}>; language: string; isRTL: boolean; theme?: object }} props
 */
function DonationsListInner({ tiers, language, isRTL, theme, totalsByEmail }) {
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

const DonationsList = memo(DonationsListInner);

export default function MosqueDonation() {
  const [language, setLanguage] = useState(INITIAL_LANGUAGE);
  const [t, setT] = useState(INITIAL_TRANSLATION);
  const [tiers, setTiers] = useState(INITIAL_TIERS);
  const [selectedTier, setSelectedTier] = useState(0);
  const [donations, setDonations] = useState([]);
  const [ramadanRaised, setRamadanRaised] = useState(0);
  const [totalsByEmail, setTotalsByEmail] = useState({});
  const [themeMode, setThemeMode] = useState("dark");
  const [showDonationDialog, setShowDonationDialog] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [showLeftSidebar, setShowLeftSidebar] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const languageDropdownRef = useRef(null);
  const theme = THEMES[themeMode] ?? THEMES.dark;

  useEffect(() => {
    // --- Funded Tier Poll ---
    const applyFunded = (funded) => {
      if (!funded) return;
      setTiers((prev) => {
        const next = prev.map((tier) => ({
          ...tier,
          funded: Math.min(tier.total, funded[tier.key] ?? tier.funded),
        }));
        const unchanged = prev.every((tier, idx) => tier.funded === next[idx].funded);
        return unchanged ? prev : next;
      });
    };

    // --- Donations Poll ---
    const pollDonations = () =>
      fetchDonationsFromSheet().then((rows) => {
        if (!Array.isArray(rows)) return;
        setDonations((prev) => {
          if (prev.length === rows.length && prev.every((d, i) => d.id === rows[i].id && d.donated === rows[i].donated)) {
            return prev;
          }
          return rows;
        });
        setTotalsByEmail(getTotalsByEmail(rows));
        setRamadanRaised(getRamadanRaised(rows));
      });

    // --- Funded Poll Runner ---
    const pollFunded = () => fetchFundedFromSheet().then(applyFunded);

    // Initial poll
    pollFunded();
    pollDonations();

    // Set intervals
    const fundedIntervalId = setInterval(pollFunded, 60 * 1000);
    const donationsIntervalId = setInterval(pollDonations, 60 * 1000);

    // Cleanup
    return () => {
      clearInterval(fundedIntervalId);
      clearInterval(donationsIntervalId);
    };
  }, []);

  function getTotalsByEmail(donations) {
    const summary = {};

    donations.forEach((donation) => {
      const email = donation["courriel"];
      const tier = String(donation["tier"]);
      const price = parseInt(donation["montant total"]);
      const donorLabel = donation[Object.keys(donation)[23]];
      const details = String(donation["détails"]);

      if (!summary[email]) {
        summary[email] = {
          email: email,
          details: details,
          donorLabel: donorLabel,
          tier: tier,
          totalDonated: 0,
          ticketCount: 0,
        };
      }

      summary[email].totalDonated += price;
      summary[email].ticketCount += 1;

      // Update donor label if it's different from the previous one
      if (summary[email].donorLabel !== donorLabel) {
        summary[email].donorLabel = donorLabel;
      }
    });

    return summary;
  }

  function getRamadanRaised(donations) {
    return donations.reduce((sum, donation) => sum + parseInt(donation["montant total"]), 0);
  }

  useEffect(() => {
    let active = true;

    loadTranslation(language).then((loaded) => {
      if (active) setT(loaded);
    });

    return () => {
      active = false;
    };
  }, [language]);

  useEffect(() => {
    if (!showLanguageMenu) return undefined;

    const handlePointerDown = (event) => {
      if (!languageDropdownRef.current?.contains(event.target)) {
        setShowLanguageMenu(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [showLanguageMenu]);

  const isRTL = language === "ar";
  const localizedTiers = tiers.map((tier) => ({
    ...tier,
    label: t?.tierLabels?.[tier.key] ?? tier.key,
  }));
  const sel = localizedTiers[selectedTier];
  const pct = Math.round((sel.funded / sel.total) * 100);
  const remaining = sel.total - sel.funded;
  const PRE_RAISED = 692602;
  const totalRaised = donations.reduce((sum, donation) => sum + parseInt(donation["montant total"]), 0) + PRE_RAISED;
  const totalGoal = localizedTiers.reduce((sum, tier) => sum + tier.total * tier.amount, 0);
  const RAMADAN_TARGET = 200000;
  const headerRamadanPct = RAMADAN_TARGET > 0 ? Math.min(100, Math.round((ramadanRaised / RAMADAN_TARGET) * 100)) : 0;
  const currencyFirst = language === "en";

  function handleTierSelect(nextTier) {
    setSelectedTier(nextTier);

    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1200px)").matches) {
      setShowRightSidebar(true);
    }
  }

  function handleFund() {
    setTiers((prev) =>
      prev.map((tier) =>
        tier.id === selectedTier && tier.funded < tier.total ? { ...tier, funded: tier.funded + 1 } : tier
      )
    );
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`mosque-donation ${isRTL ? 'rtl' : ''}`}
      data-theme={themeMode}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Amiri:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${theme.scrollbarThumb};border-radius:4px}
      `}</style>

      <header className="mosque-donation-header">
        <div className="mosque-donation-header-inner">
          <div className="header-left">
            <img
              src="/logo-ccai.png"
              alt="CCAI logo, stylized geometric calligraphy"
              className="header-logo"
            />
            <div className="header-title">
              <div className="header-center-name">
                {t.centerName}
              </div>
              <h1 className="header-title-text">
                {t.title}
              </h1>
            </div>
          </div>

          <div className="header-center">
            {/* Unified Progress Bar */}
            <div className="progress-bar-container">
              {/* Centered Ramadan Objective Title */}
              <div className="progress-objective-title">
                <span className="progress-objective-text">
                  {t.ramadanObjective}
                </span>
              </div>

              {/* Large total raised line */}
              <div className="progress-raised-line">
                {languageCurrency(ramadanRaised, currencyFirst)}{" "}
                <span className="progress-raised-of">
                  {t.prepositionOf}
                </span>{" "}
                {languageCurrency(RAMADAN_TARGET, currencyFirst)}
              </div>

              <div className="progress-bar-row" style={{ '--progress-pct': `${headerRamadanPct}%` }}>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill"></div>
                </div>
                <span className="progress-bar-value">
                  {headerRamadanPct}%
                </span>
              </div>
            </div>
          </div>

          <div className="header-right">
            <button
              onClick={() => setThemeMode((m) => (m === "dark" ? "light" : "dark"))}
              title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="theme-toggle-button"
            >
              {themeMode === "dark" ? "☀" : "☾"}
            </button>
            <span className="language-label">
              {t.language}
            </span>
            <div className="language-button-group">
              {LANGUAGE_OPTIONS.map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => setLanguage(code)}
                  className={`language-button ${language === code ? 'active' : ''}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="language-dropdown" ref={languageDropdownRef}>
              <button
                type="button"
                className={`language-dropdown-trigger ${showLanguageMenu ? 'open' : ''}`}
                onClick={() => setShowLanguageMenu((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={showLanguageMenu}
              >
                {LANGUAGE_OPTIONS.find((option) => option.code === language)?.label ?? language.toUpperCase()}
              </button>
              {showLanguageMenu && (
                <div className="language-dropdown-menu" role="menu">
                  {LANGUAGE_OPTIONS.map(({ code, label }) => (
                    <button
                      key={code}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setLanguage(code);
                        setShowLanguageMenu(false);
                      }}
                      className={`language-dropdown-item ${language === code ? 'active' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="layout-main">
        {/* Sidebar Backdrop */}
        <div
          className={`sidebar-backdrop ${showLeftSidebar || showRightSidebar ? "visible" : ""}`}
          onClick={() => {
            setShowLeftSidebar(false);
            setShowRightSidebar(false);
          }}
        ></div>

        {/* Left Sidebar Toggle Button */}
        <button
          className="sidebar-toggle-btn sidebar-toggle-left"
          onClick={() => setShowLeftSidebar(!showLeftSidebar)}
          aria-label="Toggle left sidebar"
          title="Donations & QR"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="sidebar-toggle-icon">
            <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M15 15h2v2h-2zM18 15h2v5h-2zM15 18h2v2h-2z" fill="currentColor" />
          </svg>
        </button>

        {/* Right Sidebar Toggle Button */}
        <button
          className="sidebar-toggle-btn sidebar-toggle-right"
          onClick={() => setShowRightSidebar(!showRightSidebar)}
          aria-label="Toggle right sidebar"
          title="Tier Selection"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="sidebar-toggle-icon">
            <path d="M12 20s-6.5-3.9-6.5-9.1A3.9 3.9 0 0 1 9.4 7c1.1 0 2.1.5 2.6 1.4.5-.9 1.5-1.4 2.6-1.4a3.9 3.9 0 0 1 3.9 3.9C18.5 16.1 12 20 12 20Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9.2 12h5.6M12 9.2v5.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <div className="layout-main-inner">
          {/* Desktop Layout-Left */}
          <div className="layout-left">
            <div className="qr-section">
              <div className="qr-title">
                {t.scanToDonate}
              </div>
              <div className="qr-help">
                {t.qrHelp}
              </div>
              <div className="qr-code-container">
                <QRCode color={sel.color} alt={t.qrAlt} theme={theme} />
              </div>
            </div>
            <DonationsList donations={donations} tiers={localizedTiers} language={language} isRTL={isRTL} theme={theme} totalsByEmail={totalsByEmail} />
            <CampaignPie totalGoal={totalGoal} totalRaised={totalRaised} ramadanRaised={ramadanRaised} theme={theme} language={language} t={t} />
          </div>

          {/* Mobile Layout-Left Sidebar */}
          <div className={`layout-left--mobile ${showLeftSidebar ? "open" : ""}`}>
            <button
              className="close-button"
              onClick={() => setShowLeftSidebar(false)}
              aria-label="Close left sidebar"
            >
              ×
            </button>
            <div style={{ marginTop: "40px" }}>
              <div className="qr-section">
                <div className="qr-title">
                  {t.scanToDonate}
                </div>
                <div className="qr-help">
                  {t.qrHelp}
                </div>
                <div className="qr-code-container">
                  <QRCode color={sel.color} alt={t.qrAlt} theme={theme} />
                </div>
              </div>
              <DonationsList donations={donations} tiers={localizedTiers} language={language} isRTL={isRTL} theme={theme} totalsByEmail={totalsByEmail} />
              <CampaignPie totalGoal={totalGoal} totalRaised={totalRaised} ramadanRaised={ramadanRaised} theme={theme} language={language} t={t} />
            </div>
          </div>

          <div className="layout-center">
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

            <div className="mosque-viz-wrapper">
              <div className="mosque-viz-overlay"></div>

              <div className="mosque-viz-container">
                <MosqueViz tiers={localizedTiers} selectedTier={selectedTier} onSelectTier={handleTierSelect} theme={theme} />
              </div>

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
                        background: isSelected ? tier.color : theme.bgCardAlt,
                        border: `2px solid ${isSelected ? tier.color : theme.border}`,
                        boxShadow: isSelected
                          ? `0 0 16px ${tier.color}66`
                          : theme.mode === "light"
                            ? "0 2px 8px rgba(0,0,0,0.08)"
                            : "0 2px 8px rgba(0,0,0,0.5)",
                        zIndex: 10,
                      }}
                    >
                      <span className="mosque-side-chip-amount" style={{ color: isSelected ? "#000000" : theme.textPrimary }}>
                        {languageCurrency(tier.amount, currencyFirst)}
                      </span>
                      <span className="mosque-side-chip-remaining" style={{ color: isSelected ? "#00000099" : tier.color }}>
                        {t.sideChip(tierRemaining)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="tier-legend-wrapper">
              {[...localizedTiers].reverse().map((tier) => (
                <div
                  key={tier.id}
                  onClick={() => handleTierSelect(tier.id)}
                  className="tier-legend-item"
                  style={{
                    border: `2px solid ${selectedTier === tier.id ? tier.color : theme.border}`,
                    background: selectedTier === tier.id ? theme.bgCardSelected : theme.bgCardAlt,
                    color: selectedTier === tier.id ? tier.color : theme.textPrimary,
                  }}
                >
                  <span className="tier-legend-color-dot" style={{ background: tier.color }} />
                  {t.legendLabel(tier.label, tier.amount)}
                </div>
              ))}
            </div>
          </div>

          <div className="layout-right">
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
                      background: isSelected ? theme.bgCardSelected : undefined,
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
                onClick={() => {
                  if (remaining > 0) setShowDonationDialog(true);
                }}
                disabled={remaining === 0}
                className={`donate-button ${remaining === 0 ? 'disabled' : ''}`}
              >
                {remaining > 0 ? t.fundButton(sel.amount) : t.fullyFunded}
              </button>
              <p className="selected-tier-note">
                {t.zeffyNote}
              </p>
            </div>
          </div>

          {/* Mobile Layout-Right Sidebar */}
          <div className={`layout-right--mobile ${showRightSidebar ? "open" : ""}`}>
            <button
              className="close-button"
              onClick={() => setShowRightSidebar(false)}
              aria-label="Close right sidebar"
            >
              ×
            </button>
            <div style={{ marginTop: "40px" }}>
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
                        background: isSelected ? theme.bgCardSelected : undefined,
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
                  onClick={() => {
                    if (remaining > 0) setShowDonationDialog(true);
                  }}
                  disabled={remaining === 0}
                  className={`donate-button ${remaining === 0 ? 'disabled' : ''}`}
                >
                  {remaining > 0 ? t.fundButton(sel.amount) : t.fullyFunded}
                </button>
                <p className="selected-tier-note">
                  {t.zeffyNote}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDonationDialog && (
        <div className="donation-dialog-overlay">
          <div className="donation-dialog-content">
            <div className="donation-dialog-body">
              <button
                type="button"
                onClick={() => setShowDonationDialog(false)}
                aria-label="Close donation dialog"
                className="donation-dialog-close"
              >
                ×
              </button>
              <div className="donation-dialog-form-wrapper">
                <iframe
                  title="Donation form powered by Zeffy"
                  src="https://www.zeffy.com/embed/ticketing/travaux-damenagement-dans-le-nouveau-centre"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <div>
          <div className="footer-content">
            <img
              src="/logo-ccai.png"
              alt=""
              aria-hidden="true"
              className="footer-logo"
            />
            <div className="footer-text">
              <div className="footer-title">
                {t.aboutCampaign}
              </div>
              <p className="footer-description">
                {t.aboutCampaignText}
              </p>
            </div>
          </div>

          <div className="footer-participate">
            <div className="footer-participate-title">
              {t.howToParticipate}
            </div>
            <p className="footer-participate-text">{t.howToParticipateText}</p>
          </div>

          <div className="footer-contact">
            <div className="footer-contact-item">
              <i className="fa-solid fa-location-dot footer-contact-icon" aria-hidden="true"></i>
              287 12e Avenue, Saint-Jean-sur-Richelieu, QC J2X 1E4
            </div>
            <div className="footer-contact-item">
              <i className="fa-solid fa-phone footer-contact-icon" aria-hidden="true"></i>
              <a href="tel:+14508004266" className="footer-contact-link">(450) 800-4266</a>
            </div>
            <div className="footer-contact-item">
              <i className="fa-solid fa-globe footer-contact-icon" aria-hidden="true"></i>
              <a href="https://ccai-stjean.org/" target="_blank" rel="noopener noreferrer" className="footer-contact-link">
                https://ccai-stjean.org/
              </a>
            </div>
            <div className="footer-contact-item">
              <i className="fa-brands fa-facebook footer-contact-icon" aria-hidden="true"></i>
              <a href="https://www.facebook.com/centre.alimane.sjsr/" target="_blank" rel="noopener noreferrer" className="footer-contact-link">
                facebook.com/centre.alimane.sjsr
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
