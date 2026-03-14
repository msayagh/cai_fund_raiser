import { TIER_KEYS } from "../constants/config.js";

/** Base Google Sheet URL (from env). Used for stats and orders sheets. */
export function getGoogleSheetAppUrl() {
    return typeof import.meta !== "undefined" && import.meta.env && import.meta.env.GOOGLE_SHEET_APP_URL;
}

/** Sheet gid for funded tiers. Optional; if unset, exports first sheet. */
export function getFundedTiersGid() {
    const v = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.GOOGLE_SHEET_FUNDED_TIERS_GID;
    return v != null && String(v).trim() !== "" ? String(v).trim() : null;
}

/** Sheet gid for donations. Optional; if unset, exports first sheet. */
export function getDonationsGid() {
    const v = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.GOOGLE_SHEET_DONATIONS_GID;
    return v != null && String(v).trim() !== "" ? String(v).trim() : null;
}

/** Build CSV export URL from spreadsheet URL, optionally targeting a sheet by gid. */
export function buildCsvExportUrl(baseUrl, gid) {
    if (!baseUrl) return null;
    const exportUrl = baseUrl.replace(/\/edit.*$/, "/export?format=csv");
    return gid ? `${exportUrl}&gid=${gid}` : exportUrl;
}

export function convertCsvToJson(csv) {
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
export function parseFundedValue(value) {
    if (value == null || value === "") return 0;
    const str = String(value).trim().replace(/\s/g, "").replace('"', "");
    const n = parseInt(str, 10);
    return Number.isNaN(n) ? 0 : Math.max(0, Math.floor(n));
}

/**
 * Reduces CSV rows to { foundation, walls, arches, dome } with cleaned, integer funded values.
 * Expects rows with a tier identifier (column "tier", "key", or first column) and "funded" column.
 */
export function cleanAndParseFundedRows(rows) {
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
export async function fetchFundedFromSheet() {
    const url = getGoogleSheetAppUrl();
    const exportUrl = buildCsvExportUrl(url, getFundedTiersGid());
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

/** Parse donated amount to number. */
export function parseDonatedValue(value) {
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
export function cleanAndParseDonationRows(rows) {
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

export function getDonationsSheetUrl() {
    const donations = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_GOOGLE_DONATIONS_SHEET_URL;
    return donations || getGoogleSheetAppUrl();
}

/**
 * Fetches donations from a Google Sheet (CSV export).
 * @returns {Promise<DonationRow[]>}
 */
export async function fetchDonationsFromSheet() {
    const url = getDonationsSheetUrl();
    const exportUrl = buildCsvExportUrl(url, getDonationsGid());
    if (!exportUrl) return [];
    try {
        const res = await fetch(exportUrl, { method: "GET", cache: "no-store" });
        if (!res.ok) return [];
        const text = await res.text();
        const rows = convertCsvToJson(text);
        if (!Array.isArray(rows) || rows.length === 0) return [];
        // Filter out rows based on donation form
        const filteredRows = rows.filter((row) => row["détails"].startsWith("Levée de fonds ") || row["détails"].startsWith("Travaux d'aménagement dans le nouveau centr"));
        return filteredRows;
    } catch {
        return [];
    }
}
