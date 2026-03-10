import React, { useMemo, useState, useEffect } from "react";

const LANGUAGES = {
  en: "English",
  fr: "Français",
  ar: "العربية",
};

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
    vizMoonBg: "#fffef5",
    vizMoonCrater: "#e8e6e0",
    vizHadith: "#3d3d3d",
  },
};

const TIER_LABELS = {
  foundation: {
    en: "Mutasaddiq",
    fr: "Bienfaiteur",
    ar: "متصدق",
  },
  walls: {
    en: "Karim",
    fr: "Généreux",
    ar: "كريم",
  },
  arches: {
    en: "Jawwad",
    fr: "Très généreux",
    ar: "جواد",
  },
  dome: {
    en: "Sabbaq",
    fr: "Précurseur",
    ar: "سبّاق",
  },
};

const TRANSLATIONS = {
  en: {
    centerName: "Centre Zad Al-Imane",
    title: "Masjid Construction Campaign",
    raisedOfGoal: "raised of",
    goal: "goal",
    bricks: "bricks",
    scanToDonate: "Scan to Donate",
    qrAlt: "Donation QR Code",
    qrHelp: "Point your camera to give directly",
    selectTier: "Select Tier",
    perBrick: "per brick",
    language: "Language",
    aboutCampaign: "About this campaign",
    aboutCampaignText:
      "Each illuminated brick represents a pledged contribution toward the construction of the masjid. The four contribution tiers correspond to different sections of the structure, allowing supporters to take part in building the foundation, walls, arches, and dome.",
    howToParticipate: "How to participate",
    howToParticipateText:
      "Select a tier, review the remaining bricks, then scan the QR code or proceed with your donation method. Your support helps transform this visual plan into a real place of prayer, learning, and community service.",
    fullyFunded: "✦ Fully Funded",
    brickCount: (funded, total) => `${funded} / ${total} bricks`,
    legendLabel: (label, amount) => `${label} · $${amount.toLocaleString()}`,
    sideChip: (remaining) => `${remaining} left`,
    fundButton: (amount) => `Fund One Brick · $${amount.toLocaleString()}`,
    zeffyNote: "100% of your donation goes directly to the mosque. Thanks to the Zeffy platform, no commissions are taken.",
    address: "Address",
    phone: "Phone",
    website: "Website",
    raisedLine: (totalRaised, totalGoal, totalBricksFunded, totalBricks, th) => (
      <>
        <span style={{ color: th.textPrimary, fontWeight: 700 }}>
          {`$${totalRaised.toLocaleString()} raised`}
        </span>
        <span style={{ color: th.textMuted }}> {` of $${totalGoal.toLocaleString()} goal`}</span>
        <span style={{ color: th.textMuted }}> {" · "} </span>
        <span style={{ color: th.textPrimary, fontWeight: 700 }}>
          {`${totalBricksFunded}/${totalBricks} bricks funded`}
        </span>
      </>
    ),
  },
  fr: {
    centerName: "Centre Zad Al-Imane",
    title: "Campagne de construction de la mosquée",
    raisedOfGoal: "collectés sur un objectif de",
    goal: "objectif",
    bricks: "briques",
    scanToDonate: "Scanner pour donner",
    qrAlt: "Code QR de don",
    qrHelp: "Scannez avec votre caméra pour donner directement",
    selectTier: "Choisir un palier",
    perBrick: "par brique",
    language: "Langue",
    aboutCampaign: "À propos de cette campagne",
    aboutCampaignText:
      "Chaque brique illuminée représente une contribution engagée pour la construction de la mosquée. Les quatre paliers de contribution correspondent à différentes parties de l’édifice, permettant aux donateurs de participer à la fondation, aux murs, aux arches et au dôme.",
    howToParticipate: "Comment participer",
    howToParticipateText:
      "Choisissez un palier, consultez le nombre de briques restantes, puis scannez le code QR ou utilisez votre moyen de don. Votre soutien aide à transformer ce plan visuel en un véritable lieu de prière, d’apprentissage et de service à la communauté.",
    fullyFunded: "✦ Entièrement financé",
    brickCount: (funded, total) => `${funded} / ${total} briques`,
    legendLabel: (label, amount) => `${label} · ${amount.toLocaleString()} $`,
    sideChip: (remaining) => `${remaining} restantes`,
    fundButton: (amount) => `Financer une brique · ${amount.toLocaleString()} $`,
    zeffyNote: "100 % de votre don va directement à la mosquée. Grâce à la plateforme Zeffy, aucune commission n’est prélevée.",
    address: "Adresse",
    phone: "Téléphone",
    website: "Site web",
    raisedLine: (totalRaised, totalGoal, totalBricksFunded, totalBricks, th) => (
      <>
        <span style={{ color: th.textPrimary, fontWeight: 700 }}>
          {`${totalRaised.toLocaleString()} $ collectés`}
        </span>
        <span style={{ color: th.textMuted }}> {` sur un objectif de ${totalGoal.toLocaleString()} $`}</span>
        <span style={{ color: th.textMuted }}> {" · "} </span>
        <span style={{ color: th.textPrimary, fontWeight: 700 }}>
          {`${totalBricksFunded}/${totalBricks} briques financées`}
        </span>
      </>
    ),
  },
  ar: {
    centerName: "مركز زاد الإيمان",
    title: "حملة بناء المسجد",
    raisedOfGoal: "تم جمع",
    goal: "الهدف",
    bricks: "طوبة",
    scanToDonate: "امسح للتبرع",
    qrAlt: "رمز QR للتبرع",
    qrHelp: "وجّه كاميرا هاتفك للتبرع مباشرة",
    selectTier: "اختر الفئة",
    perBrick: "لكل طوبة",
    language: "اللغة",
    aboutCampaign: "حول هذه الحملة",
    aboutCampaignText:
      "تمثل كل طوبة مضيئة مساهمةً متعهداً بها في بناء المسجد. وترتبط فئات التبرع الأربع بأجزاء مختلفة من المبنى، مما يتيح للمساهمين المشاركة في الأساس والجدران والأقواس والقبة.",
    howToParticipate: "كيفية المشاركة",
    howToParticipateText:
      "اختر الفئة، واطّلع على عدد الطوب المتبقي، ثم امسح رمز الاستجابة أو استخدم وسيلة التبرع المناسبة. دعمك يساعد على تحويل هذا التصور إلى مسجد حقيقي للصلاة والتعلم وخدمة المجتمع.",
    fullyFunded: "✦ اكتمل التمويل",
    brickCount: (funded, total) => `${funded} / ${total} طوبة`,
    legendLabel: (label, amount) => `${label} · ${amount.toLocaleString()} $`,
    sideChip: (remaining) => `${remaining} متبقية`,
    fundButton: (amount) => `موّل طوبة واحدة · ${amount.toLocaleString()} $`,
    zeffyNote: "تذهب 100٪ من تبرعاتكم مباشرةً إلى المسجد بفضل منصة Zeffy، من دون أي عمولات.",
    address: "العنوان",
    phone: "الهاتف",
    website: "الموقع",
    raisedLine: (totalRaised, totalGoal, totalBricksFunded, totalBricks, th) => (
      <>
        <span style={{ color: th.textPrimary, fontWeight: 700 }}>
          {`${totalRaised.toLocaleString()} $ تم جمعها`}
        </span>
        <span style={{ color: th.textMuted }}> {` من أصل هدف قدره ${totalGoal.toLocaleString()} $`}</span>
        <span style={{ color: th.textMuted }}> {" · "} </span>
        <span style={{ color: th.textPrimary, fontWeight: 700 }}>
          {`${totalBricksFunded}/${totalBricks} طوبة ممولة`}
        </span>
      </>
    ),
  },
};

// ── QR Code component — replace DONATION_URL with your real link ───────────────
const DONATION_URL = "https://your-donation-page.com";

function QRCode({ color, alt, theme }) {
  const encoded = encodeURIComponent(DONATION_URL);
  const bgHex = theme?.mode === "light" ? "f8f6f2" : "1e2238";
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encoded}&color=${color.replace("#", "")}&bgcolor=${bgHex}&margin=4`;

  return (
    <img
      src={src}
      alt={alt}
      width={140}
      height={140}
      style={{ borderRadius: "8px", border: `2px solid ${color}`, display: "block" }}
    />
  );
}

const TIER_CONFIG = {
  foundation: { key: "foundation", funded: 0, total: 320, amount: 500, color: "#C8935A" },
  walls: { key: "walls", funded: 0, total: 320, amount: 1000, color: "#7EB8A0" },
  arches: { key: "arches", funded: 0, total: 320, amount: 1500, color: "#8AAED4" },
  dome: { key: "dome", funded: 0, total: 320, amount: 2000, color: "#D4A96E" },
};

/** Google Apps Script Web App URL (from env). Returns JSON: { foundation, walls, arches, dome } with funded counts. */
function getGoogleSheetAppUrl() {
  return typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GOOGLE_SHEET_APP_URL;
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
  const exportUrl = url ? url.replace(/\/edit.*$/, "/export?format=csv") : null;
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
  return typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GOOGLE_DONATIONS_SHEET_URL;
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
  const exportUrl = url ? url.replace(/\/edit.*$/, "/export?format=csv") : null;
  if (!exportUrl) return [];
  try {
    const res = await fetch(exportUrl, { method: "GET", cache: "no-store" });
    if (!res.ok) return [];
    const text = await res.text();
    const rows = convertCsvToJson(text);
    if (!Array.isArray(rows) || rows.length === 0) return [];
    return rows;
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

function MosqueViz({ tiers, selectedTier, onSelectTier, theme }) {
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
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block" }}>
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

      <g clipPath="url(#mc)">
        <MosaicGrid tiers={tiers} gridTop={130} gridBottom={H} W={W} insideTest={insideTest} selectedTier={selectedTier} theme={th} />
      </g>

      <rect x="0" y="0" width={W} height={H} fill={th.vizMaskFill} opacity="1" mask="url(#outsideMask)" />

      <g mask="url(#outsideMask)">
        {[
          [0, 241, 0.8], [781, 236, 0.7], [206, 49, 0.9], [198, 87, 0.5], [676, 339, 0.4], [431, 60, 0.9], [795, 421, 0.9], [275, 173, 0.5],
          [363, 151, 0.4], [561, 86, 0.7], [796, 87, 0.8], [320, 202, 0.8], [142, 373, 0.9], [78, 14, 0.4], [510, 175, 0.5], [787, 160, 0.8],
          [246, 158, 0.5], [8, 322, 0.6], [343, 135, 0.6], [195, 168, 0.8], [748, 8, 0.6], [320, 59, 0.9], [313, 35, 0.7], [269, 117, 0.6],
          [529, 237, 0.8], [239, 77, 1.0], [581, 271, 0.7], [312, 188, 0.6], [583, 188, 0.3], [696, 420, 1.0], [636, 107, 0.7], [788, 158, 0.7],
          [434, 80, 0.7], [125, 365, 0.5], [173, 155, 0.8], [603, 70, 0.7], [485, 158, 0.6], [428, 20, 0.8], [586, 120, 0.7], [19, 215, 0.7],
          [703, 155, 0.9], [770, 208, 0.6], [497, 60, 0.8], [775, 186, 0.5], [793, 367, 0.6], [246, 33, 1.0], [680, 67, 0.6], [194, 197, 0.9],
          [649, 124, 0.5], [527, 107, 0.6], [427, 179, 0.6], [746, 13, 0.4], [420, 4, 0.9], [310, 17, 0.5], [697, 253, 0.7], [584, 132, 0.7],
          [532, 99, 0.6], [544, 161, 0.6], [404, 156, 0.8], [662, 289, 0.7], [4, 431, 0.7], [158, 342, 0.6], [175, 340, 0.8], [152, 82, 0.9],
          [213, 258, 0.8], [646, 391, 0.6], [52, 93, 0.5], [618, 124, 0.7], [215, 148, 1.0], [585, 183, 0.6], [672, 346, 0.5], [8, 7, 0.5],
          [213, 280, 0.9], [331, 207, 0.8], [396, 67, 0.9], [416, 133, 0.5], [658, 68, 0.8], [782, 33, 1.0], [778, 117, 0.6], [138, 64, 0.6],
          [176, 290, 0.8], [503, 189, 0.9], [481, 203, 0.9], [568, 0, 0.9], [204, 252, 0.9], [33, 297, 0.9], [583, 100, 0.7], [161, 49, 0.8],
          [595, 192, 0.5], [775, 103, 0.7], [677, 63, 0.6], [272, 129, 0.6], [697, 45, 0.6], [327, 41, 0.8], [122, 42, 0.5], [624, 186, 0.7],
          [108, 81, 0.9], [6, 187, 0.9], [153, 108, 0.8], [798, 85, 0.8], [607, 55, 0.9], [108, 247, 0.6], [136, 220, 0.8], [26, 357, 0.4],
          [257, 185, 0.9], [212, 268, 0.7], [328, 200, 0.5], [334, 159, 0.9], [5, 301, 0.4], [779, 364, 0.7], [491, 1, 0.9], [203, 247, 0.8],
          [607, 137, 0.7], [599, 8, 0.9], [703, 295, 0.9], [540, 95, 0.9], [785, 18, 0.4], [602, 200, 1.0], [549, 211, 0.8], [769, 7, 0.8],
          [608, 240, 0.5], [783, 353, 0.7], [740, 69, 0.7], [435, 13, 0.9], [180, 91, 0.8], [703, 391, 0.5], [768, 309, 0.8], [178, 48, 0.6],
          [148, 306, 0.7], [270, 111, 0.6], [257, 165, 0.8], [453, 62, 0.9], [216, 273, 1.0], [740, 22, 0.6], [617, 33, 0.9], [794, 448, 0.9],
          [779, 170, 0.9], [140, 390, 0.5], [730, 6, 0.9], [635, 342, 0.5], [626, 191, 0.5], [404, 73, 0.7], [335, 12, 0.9], [112, 317, 0.8],
          [14, 181, 1.0], [59, 67, 0.7], [688, 59, 0.8], [363, 5, 0.6], [103, 186, 0.4], [462, 192, 0.5], [498, 131, 0.4], [675, 365, 0.6],
          [587, 273, 0.9], [703, 209, 0.8], [166, 275, 0.7], [71, 37, 0.4], [699, 356, 0.6], [506, 116, 0.9], [437, 86, 0.9], [637, 177, 0.8],
          [672, 168, 0.7], [223, 119, 0.8], [158, 9, 0.7], [335, 193, 0.7], [11, 85, 0.6], [535, 52, 0.7], [646, 109, 0.5], [413, 112, 0.7],
          [379, 77, 0.6], [277, 54, 0.7], [105, 152, 0.6], [227, 28, 0.8], [194, 54, 0.5], [787, 107, 0.5], [6, 115, 0.5], [268, 93, 1.0],
          [488, 176, 0.5], [7, 53, 0.7], [372, 103, 0.7], [91, 18, 0.8], [442, 150, 0.8], [375, 20, 0.5], [159, 222, 0.9], [525, 155, 0.6],
          [138, 75, 0.8], [442, 177, 0.6], [3, 371, 0.6], [729, 108, 0.4], [320, 164, 0.9], [364, 162, 0.7], [342, 34, 0.9], [411, 172, 0.8],
          [276, 209, 0.7], [656, 96, 0.8], [340, 51, 1.0], [762, 69, 0.5], [513, 88, 0.8], [138, 134, 0.6], [162, 126, 0.8], [166, 68, 0.9],
          [152, 37, 0.8], [155, 215, 0.9], [537, 141, 1.0], [232, 92, 0.4], [126, 417, 0.7], [35, 112, 0.5], [30, 413, 0.8], [27, 341, 0.7],
          [9, 220, 0.5], [12, 288, 0.6], [9, 212, 1.0], [20, 440, 0.6], [20, 46, 0.4], [750, 65, 0.9], [738, 8, 0.7], [27, 91, 0.5], [7, 228, 0.9],
          [759, 155, 0.8], [7, 281, 1.0], [18, 384, 0.6], [24, 205, 0.8], [31, 125, 1.0], [38, 67, 0.9], [764, 99, 0.7], [772, 153, 0.9],
          [1, 360, 0.7], [10, 147, 0.4], [717, 36, 0.6], [24, 1, 0.7], [37, 195, 0.9], [719, 5, 0.9], [759, 417, 0.9], [796, 384, 0.6],
          [10, 32, 0.7], [6, 188, 1.0], [29, 57, 0.8], [40, 236, 0.8], [757, 104, 0.9], [762, 184, 0.5], [34, 6, 0.7], [26, 35, 0.8],
          [29, 257, 0.8], [31, 283, 0.5], [39, 36, 0.7], [797, 177, 0.8], [34, 374, 0.4], [33, 248, 0.9], [22, 32, 1.0], [27, 95, 0.9],
          [767, 310, 0.7], [792, 213, 0.5], [774, 316, 0.9], [4, 53, 0.9], [13, 62, 0.5], [792, 41, 0.7], [32, 377, 0.6], [36, 200, 0.6],
          [798, 189, 0.6], [30, 423, 0.7], [34, 17, 0.9], [38, 198, 0.9], [5, 215, 0.8], [39, 203, 0.6], [785, 148, 0.9], [25, 258, 0.8],
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

      <g clipPath="url(#mc)" style={{ pointerEvents: "none" }}>
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

      <g style={{ pointerEvents: "none" }}>
        <path d="M 400 25 Q 410 15 410 25 Q 410 36 400 36 Q 406 31 406 25 Q 406 20 400 25" fill={th.accentGold} opacity="0.9" />
      </g>

      {bands.map((b) => (
        <g key={`hit${b.tier}`} clipPath="url(#mc)">
          <rect x={0} y={b.y1} width={W} height={b.y2 - b.y1} fill="transparent" style={{ cursor: "pointer" }} onClick={() => onSelectTier(b.tier)} />
        </g>
      ))}
    </svg>
  );
}

function TierCard({ tier, selected, onSelect, t, theme }) {
  const th = theme ?? THEMES.dark;
  const pct = Math.round((tier.funded / tier.total) * 100);

  return (
    <div
      onClick={() => onSelect(tier.id)}
      style={{
        padding: "12px 14px",
        borderRadius: "9px",
        marginBottom: "8px",
        cursor: "pointer",
        border: `2px solid ${selected ? tier.color : th.border}`,
        background: selected ? th.bgCardSelected : th.bgCardAlt,
        transition: "all 0.18s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "7px" }}>
        <span style={{ fontSize: "15px", fontWeight: 700, color: selected ? tier.color : th.textPrimary, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {tier.label}
        </span>
        <span style={{ fontSize: "16px", fontWeight: 700, color: th.textPrimary }}>{languageCurrency(tier.amount, t === TRANSLATIONS.en)}</span>
      </div>

      <div style={{ background: th.vizProgressTrack, borderRadius: "4px", height: "6px", overflow: "hidden", marginBottom: "6px" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: tier.color, transition: "width 0.4s ease" }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: th.textMuted, fontWeight: 500 }}>
        <span>{t.brickCount(tier.funded, tier.total)}</span>
        <span style={{ color: tier.color, fontWeight: 700 }}>{pct}%</span>
      </div>
    </div>
  );
}

function languageCurrency(amount, dollarFirst = true) {
  return dollarFirst ? `$${amount.toLocaleString()}` : `${amount.toLocaleString()} $`;
}

/**
 * @param {{ donations: DonationRow[]; tiers: Array<{key: string; label: string; amount: number; color?: string}>; language: string; isRTL: boolean; theme?: object }} props
 */
function DonationsList({ donations, tiers, language, isRTL, theme }) {
  const th = theme ?? THEMES.dark;
  const dollarFirst = language === "en";
  const tierByKey = Object.fromEntries(tiers.map((t) => [t.key, t]));
  if (donations.length === 0) return null;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        width: "100%",
        overflow: "auto",
        maxHeight: "640px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.1em",
          color: th.textMuted,
          textTransform: "uppercase",
          marginBottom: "8px",
          flexShrink: 0,
        }}
      >
        Donations
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          width: "100%",
          paddingRight: isRTL ? "0" : "6px",
          paddingLeft: isRTL ? "6px" : "0",
        }}
      >
        {donations.map((d, idx) => {
          const tier = Object.values(tierByKey).find((value) => Number(value.id) === Number(d.tier));
          const tierColor = (tier?.color ?? TIER_CONFIG[d.tier]?.color) ?? th.border;
          const amount = tier ? tier.amount : 500;
          const progressPct = amount > 0 ? Math.min(100, (d.donated / amount) * 100) : 0;
          const displayName = d.donorName || d.donorname || d.donorLabel || d.donorlabel || "Anonymous";
          const tierLabel = tier ? tier.label : d.tier;
          return (
          <div
            key={`donation-${d.id}-${idx}`}
            style={{
              padding: "10px 12px",
              marginBottom: "8px",
              borderRadius: "8px",
              background: th.bgCard,
              border: `2px solid ${tierColor}`,
            }}
          >
            <div style={{ fontSize: "14px", fontWeight: 700, color: th.textPrimary, marginBottom: "4px" }}>{displayName}</div>
            <div style={{ fontSize: "13px", color: th.accentGold, marginBottom: "6px" }}>
              {dollarFirst ? `$${d.donated.toLocaleString()}` : `${d.donated.toLocaleString()} $`}
            </div>
            <div style={{ fontSize: "11px", color: th.textMuted, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {tierLabel}
            </div>
            <div style={{ background: th.vizProgressTrack, borderRadius: "4px", height: "5px", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: "100%",
                    background: (tier?.color ?? TIER_CONFIG[d.tier]?.color) ?? "#D4A96E",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MosqueDonation() {
  const [language, setLanguage] = useState("en");
  const [tiers, setTiers] = useState(INITIAL_TIERS);
  const [selectedTier, setSelectedTier] = useState(0);
  const [donations, setDonations] = useState([]);
  const [themeMode, setThemeMode] = useState("dark");
  const theme = THEMES[themeMode] ?? THEMES.dark;

  useEffect(() => {
    const applyFunded = (funded) => {
      if (!funded) return;
      setTiers((prev) =>
        prev.map((tier) => ({
          ...tier,
          funded: Math.min(tier.total, funded[tier.key] ?? tier.funded),
        }))
      );
    };
    const poll = () => fetchFundedFromSheet().then(applyFunded);
    poll();
    const intervalId = setInterval(poll, 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const poll = () => fetchDonationsFromSheet().then(setDonations);
    poll();
    const intervalId = setInterval(poll, 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  const t = TRANSLATIONS[language];
  const isRTL = language === "ar";
  const localizedTiers = tiers.map((tier) => ({
    ...tier,
    label: TIER_LABELS[tier.key]?.[language] || TIER_LABELS[tier.key]?.en || tier.key,
  }));
  const sel = localizedTiers[selectedTier];
  const pct = Math.round((sel.funded / sel.total) * 100);
  const remaining = sel.total - sel.funded;
  const totalRaised = localizedTiers.reduce((sum, tier) => sum + tier.funded * tier.amount, 0);
  const totalGoal = localizedTiers.reduce((sum, tier) => sum + tier.total * tier.amount, 0);
  const totalBricksFunded = localizedTiers.reduce((sum, tier) => sum + tier.funded, 0);
  const totalBricks = localizedTiers.reduce((sum, tier) => sum + tier.total, 0);
  const headerProgressPct = totalGoal > 0 ? Math.min(100, Math.round((totalRaised / totalGoal) * 100)) : 0;
  const currencyFirst = language === "en";

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
      style={{
        minHeight: "100vh",
        background: theme.bgPage,
        display: "flex",
        flexDirection: "column",
        fontFamily: isRTL ? "'Amiri','Cormorant Garamond',serif" : "'Cormorant Garamond',serif",
        color: theme.textSecondary,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Amiri:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:${theme.scrollbarThumb};border-radius:4px}
      `}</style>

      <header
        style={{
          padding: "14px 32px 16px",
          borderBottom: `1px solid ${theme.borderAccent}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
          flexShrink: 0,
          background: theme.bgHeader,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: "1 1 auto", minWidth: 0 }}>
          <img
            src="/logo-ccai.png"
            alt="CCAI logo, stylized geometric calligraphy"
            style={{ width: "44px", height: "44px", objectFit: "contain", flexShrink: 0 }}
          />
          <div>
            <div
              style={{
                fontFamily: isRTL ? "'Amiri',serif" : "'Cinzel',serif",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: isRTL ? "0.04em" : "0.2em",
                color: theme.accentGold,
                marginBottom: "2px",
                textTransform: isRTL ? "none" : "uppercase",
              }}
            >
              {t.centerName}
            </div>
            <h1 style={{ fontFamily: isRTL ? "'Amiri',serif" : "'Cinzel',serif", fontSize: "16px", fontWeight: 600, letterSpacing: isRTL ? "0" : "0.06em", color: theme.textPrimary, margin: 0 }}>
              {t.title}
            </h1>
          </div>
        </div>

        <div
          style={{
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            minWidth: 0,
          }}
        >
          <div style={{ fontSize: "28px", fontWeight: 800, color: theme.accentGold, lineHeight: 1 }}>
            {languageCurrency(totalRaised, currencyFirst)}
          </div>
          <div style={{ fontSize: "14px", color: theme.textMuted }}>
            {t.raisedLine(totalRaised, totalGoal, totalBricksFunded, totalBricks, theme)}
          </div>
          <div
            aria-hidden="true"
            style={{
              marginTop: "4px",
              width: "100%",
              maxWidth: "320px",
              height: "6px",
              borderRadius: "999px",
              background: theme.vizProgressTrack,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${headerProgressPct}%`,
                height: "100%",
                borderRadius: "999px",
                background: sel.color,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", flex: "1 1 auto", justifyContent: isRTL ? "flex-start" : "flex-end", minWidth: 0 }}>
          <button
            onClick={() => setThemeMode((m) => (m === "dark" ? "light" : "dark"))}
            title={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={{
              padding: "6px 10px",
              borderRadius: "6px",
              border: `1px solid ${theme.border}`,
              background: theme.bgCard,
              color: theme.textMuted,
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            {themeMode === "dark" ? "☀" : "☾"}
          </button>
          <span style={{ fontSize: "11px", color: theme.textMuted, letterSpacing: isRTL ? "0" : "0.08em", textTransform: isRTL ? "none" : "uppercase" }}>
            {t.language}
          </span>
          {Object.entries(LANGUAGES).map(([code, label]) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              style={{
                padding: "6px 10px",
                borderRadius: "999px",
                border: `1px solid ${language === code ? theme.accentGold : theme.border}`,
                background: language === code ? theme.bgCardSelected : theme.bgCard,
                color: language === code ? theme.accentGold : theme.textPrimary,
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 700,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div
          style={{
            width: "220px",
            flexShrink: 0,
            borderRight: isRTL ? "none" : `2px solid ${theme.border}`,
            borderLeft: isRTL ? `2px solid ${theme.border}` : "none",
            padding: "20px 12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "12px",
            background: theme.bgSidebar,
            minHeight: 0,
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: isRTL ? "0" : "0.12em",
                color: theme.textPrimary,
                textTransform: isRTL ? "none" : "uppercase",
                textAlign: "center",
              }}
            >
              {t.scanToDonate}
            </div>
            <QRCode color={sel.color} alt={t.qrAlt} theme={theme} />
            <div style={{ fontSize: "12px", color: theme.textMuted, textAlign: "center", lineHeight: 1.5 }}>{t.qrHelp}</div>
          </div>
          <DonationsList donations={donations} tiers={localizedTiers} language={language} isRTL={isRTL} theme={theme} />
        </div>

        <div
          style={{
            flex: "1 1 0",
            padding: isRTL ? "0px 24px 8px 100px" : "0px 100px 8px 24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <div style={{ width: "100%", maxWidth: "760px", margin: "0", textAlign: "center" }}>
            <div style={{ padding: "8px 20px" }}>
              <div>
                <p
                  style={{
                    fontFamily: "'Amiri','Scheherazade New',serif",
                    fontSize: "18px",
                    lineHeight: 1.8,
                    color: theme.vizHadith,
                    direction: "rtl",
                    margin: 0,
                  }}
                >
                  مَنْ بَنَى مَسْجِدًا يَبْتَغِي بِهِ وَجْهَ اللَّهِ بَنَى اللَّهُ لَهُ مِثْلَهُ فِي الْجَنَّةِ
                  <span style={{ fontSize: "14px", color: theme.accentGold, marginRight: "8px" }}> ― متفق عليه</span>
                </p>
                <p
                  style={{
                    fontFamily: "inherit",
                    fontSize: "15px",
                    color: theme.textPrimary,
                    textAlign: isRTL ? "right" : "left",
                    margin: "7px 0 0 0",
                    direction: isRTL ? "rtl" : "ltr"
                  }}
                >
                  {
                    language === "fr"
                      ? <>« Quiconque construit une mosquée en cherchant la Face d’Allah, Allah lui construira son équivalent au Paradis. »<span style={{ fontSize: "13px", color: theme.accentGold, marginLeft: "6px" }}>— Rapporté par al-Bukhari et Muslim</span></>
                      : <>“Whoever builds a mosque seeking the pleasure of Allah, Allah will build for him its equivalent in Paradise.”<span style={{ fontSize: "13px", color: theme.accentGold, marginLeft: "6px" }}>— Agreed upon</span></>
                  }
                </p>
              </div>
            </div>
          </div>

          <div style={{ position: "relative", width: "100%", maxWidth: "760px" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background: theme.mode === "light" ? "radial-gradient(ellipse at 50% 52%, rgba(154,123,79,0.06) 0%, transparent 65%)" : "radial-gradient(ellipse at 50% 52%, rgba(200,169,110,0.07) 0%, transparent 65%)",
              }}
            />

            {[
              { id: 3, centerPct: (0 + 394) / 2 / 740 },
              { id: 2, centerPct: (394 + 514) / 2 / 740 },
              { id: 1, centerPct: (514 + 624) / 2 / 740 },
              { id: 0, centerPct: (624 + 740) / 2 / 740 },
            ].map(({ id, centerPct }) => {
              const tier = localizedTiers[id];
              const tierRemaining = tier.total - tier.funded;
              const isSelected = selectedTier === id;

              return (
                <div
                  key={id}
                  onClick={() => setSelectedTier(id)}
                  style={{
                    position: "absolute",
                    right: isRTL ? "auto" : "-85px",
                    left: isRTL ? "-85px" : "auto",
                    top: `${centerPct * 100}%`,
                    transform: "translateY(-50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    padding: "10px 14px",
                    borderRadius: "10px",
                    cursor: "pointer",
                    background: isSelected ? tier.color : theme.bgCardAlt,
                    border: `2px solid ${isSelected ? tier.color : theme.border}`,
                    transition: "all 0.18s",
                    minWidth: "80px",
                    boxShadow: isSelected ? `0 0 16px ${tier.color}66` : (theme.mode === "light" ? "0 2px 8px rgba(0,0,0,0.08)" : "0 2px 8px rgba(0,0,0,0.5)"),
                    zIndex: 10,
                  }}
                >
                  <span style={{ fontSize: "22px", fontWeight: 800, color: isSelected ? "#000000" : theme.textPrimary, lineHeight: 1.2, whiteSpace: "nowrap" }}>
                    {languageCurrency(tier.amount, currencyFirst)}
                  </span>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: isSelected ? "#00000099" : tier.color, marginTop: "3px", whiteSpace: "nowrap" }}>
                    {t.sideChip(tierRemaining)}
                  </span>
                </div>
              );
            })}

            <MosqueViz tiers={localizedTiers} selectedTier={selectedTier} onSelectTier={setSelectedTier} theme={theme} />
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap", justifyContent: "center" }}>
            {[...localizedTiers].reverse().map((tier) => (
              <div
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 18px",
                  borderRadius: "20px",
                  cursor: "pointer",
                  transition: "all 0.18s",
                  border: `2px solid ${selectedTier === tier.id ? tier.color : theme.border}`,
                  background: selectedTier === tier.id ? theme.bgCardSelected : theme.bgCardAlt,
                  fontSize: "15px",
                  fontWeight: 700,
                  color: selectedTier === tier.id ? tier.color : theme.textPrimary,
                }}
              >
                <span style={{ width: 11, height: 11, borderRadius: "2px", background: tier.color, display: "inline-block", flexShrink: 0 }} />
                {t.legendLabel(tier.label, tier.amount)}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            width: "340px",
            flexShrink: 0,
            borderLeft: isRTL ? "none" : `2px solid ${theme.border}`,
            borderRight: isRTL ? `2px solid ${theme.border}` : "none",
            padding: "20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            overflowY: "auto",
            background: theme.bgCard,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 800,
                letterSpacing: isRTL ? "0" : "0.12em",
                color: theme.textMuted,
                marginBottom: "10px",
                textTransform: isRTL ? "none" : "uppercase",
              }}
            >
              {t.selectTier}
            </div>
            {[...localizedTiers].reverse().map((tier) => (
              <TierCard key={tier.id} tier={tier} selected={selectedTier === tier.id} onSelect={setSelectedTier} t={t} theme={theme} />
            ))}
          </div>

          <div style={{ padding: "20px", borderRadius: "12px", border: `2px solid ${sel.color}`, background: theme.mode === "light" ? theme.bgCardAlt : "#1e2238" }}>
            <div style={{ fontSize: "15px", fontWeight: 800, letterSpacing: isRTL ? "0" : "0.12em", color: sel.color, marginBottom: "6px", textTransform: isRTL ? "none" : "uppercase" }}>
              {sel.label}
            </div>
            <div style={{ fontFamily: isRTL ? "'Amiri',serif" : "'Cinzel',serif", fontSize: "36px", fontWeight: 700, color: theme.textPrimary, lineHeight: 1 }}>
              {languageCurrency(sel.amount, currencyFirst)}
            </div>
            <div style={{ fontSize: "16px", color: theme.textMuted, marginBottom: "16px" }}>{t.perBrick}</div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "15px", color: theme.textPrimary, marginBottom: "7px", fontWeight: 600 }}>
                <span>{t.brickCount(sel.funded, sel.total)}</span>
                <span style={{ color: sel.color, fontWeight: 800 }}>{pct}%</span>
              </div>
              <div style={{ background: theme.vizProgressTrack, borderRadius: "6px", height: "12px", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", borderRadius: "6px", background: sel.color, transition: "width 0.5s ease" }} />
              </div>
            </div>

            <button
              onClick={() => window.open("https://www.zeffy.com/en-CA/donation-form/nouveau-centre-al-imane", "_blank", "noopener,noreferrer")}
              disabled={remaining === 0}
              style={{
                width: "100%",
                padding: "16px",
                borderRadius: "8px",
                cursor: remaining > 0 ? "pointer" : "not-allowed",
                border: "none",
                background: remaining > 0 ? sel.color : "#2e3250",
                color: remaining > 0 ? "#000000" : "#888899",
                fontSize: "16px",
                fontWeight: 800,
                letterSpacing: isRTL ? "0" : "0.06em",
                textTransform: isRTL ? "none" : "uppercase",
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => {
                if (remaining > 0) e.currentTarget.style.opacity = "0.85";
              }}
              onMouseLeave={(e) => {
                if (remaining > 0) e.currentTarget.style.opacity = "1";
              }}
            >
              {remaining > 0 ? t.fundButton(sel.amount) : t.fullyFunded}
            </button>
            <p
              style={{
                marginTop: "10px",
                fontSize: "12px",
                color: theme.textMuted,
                lineHeight: 1.6,
                textAlign: isRTL ? "right" : "left",
              }}
            >
              {t.zeffyNote}
            </p>
          </div>
        </div>
      </div>

      <footer
        style={{
          borderTop: `1px solid ${theme.borderAccent}`,
          background: theme.bgHeader,
          padding: "18px 32px 22px",
          color: theme.textMutedAlt,
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "28px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "2 1 520px", display: "flex", alignItems: "flex-start", gap: "16px" }}>
            <img
              src="/logo-ccai.png"
              alt=""
              aria-hidden="true"
              style={{ width: "40px", height: "40px", objectFit: "contain", flexShrink: 0, marginTop: "2px" }}
            />
            <div>
              <div
                style={{
                  fontFamily: isRTL ? "'Amiri',serif" : "'Cinzel',serif",
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: isRTL ? "0" : "0.14em",
                  textTransform: isRTL ? "none" : "uppercase",
                  color: theme.accentGold,
                  marginBottom: "8px",
                }}
              >
                {t.aboutCampaign}
              </div>
              <p style={{ fontSize: "15px", lineHeight: 1.7, margin: 0, color: theme.textMutedAlt }}>{t.aboutCampaignText}</p>
            </div>
          </div>

          <div style={{ flex: "1 1 280px" }}>
            <div
              style={{
                fontFamily: isRTL ? "'Amiri',serif" : "'Cinzel',serif",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: isRTL ? "0" : "0.14em",
                textTransform: isRTL ? "none" : "uppercase",
                color: theme.accentGold,
                marginBottom: "8px",
              }}
            >
              {t.howToParticipate}
            </div>
            <p style={{ fontSize: "15px", lineHeight: 1.7, margin: 0, color: theme.textMutedAlt }}>{t.howToParticipateText}</p>
          </div>
        </div>

        <div
          style={{
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: `1px solid ${theme.borderAccent}`,
            width: "100%",
            display: "flex",
            flexWrap: "wrap",
            gap: "20px 32px",
            fontSize: "14px",
            lineHeight: 1.6,
            color: theme.textMutedAlt,
          }}
        >
          <div>
            <strong style={{ color: theme.accentGold, marginRight: "6px" }}>{t.address} :</strong>
            287 12e Avenue, Saint-Jean-sur-Richelieu, QC J2X 1E4
          </div>
          <div>
            <strong style={{ color: theme.accentGold, marginRight: "6px" }}>{t.phone} :</strong>
            <a href="tel:+14508004266" style={{ color: "inherit", textDecoration: "none" }}>(450) 800-4266</a>
          </div>
          <div>
            <strong style={{ color: theme.accentGold, marginRight: "6px" }}>{t.website} :</strong>
            <a href="https://ccai-stjean.org/" target="_blank" rel="noopener noreferrer" style={{ color: theme.accentGold, textDecoration: "underline" }}>
              https://ccai-stjean.org/
            </a>
          </div>
          <div>
            <strong style={{ color: theme.accentGold, marginRight: "6px" }}>Facebook :</strong>
            <a href="https://www.facebook.com/centre.alimane.sjsr/" target="_blank" rel="noopener noreferrer" style={{ color: theme.accentGold, textDecoration: "underline" }}>
              facebook.com/centre.alimane.sjsr
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
