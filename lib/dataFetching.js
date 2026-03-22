import { TIER_KEYS } from "../constants/config.js";
import { captureException, captureMessage } from "./monitoring.js";
import { fetchCampaignSnapshotFromApi } from "./campaignApi.js";

/** Base Google Sheet URL (from env). Used for stats and orders sheets. */
export function getGoogleSheetAppUrl() {
    return typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_GOOGLE_SHEET_APP_URL;
}

export function hasFundedSheetConfig() {
    return Boolean(buildCsvExportUrl(getGoogleSheetAppUrl(), getFundedTiersGid()));
}

export async function fetchCampaignSnapshot() {
    try {
        const snapshot = await fetchCampaignSnapshotFromApi();
        return snapshot;
    } catch (error) {
        captureException(error, { source: 'fetchCampaignSnapshot' });
        return null;
    }
}

/** Sheet gid for funded tiers. Optional; if unset, exports first sheet. */
export function getFundedTiersGid() {
    const v = typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_GOOGLE_SHEET_FUNDED_TIERS_GID;
    return v != null && String(v).trim() !== "" ? String(v).trim() : null;
}

/** Sheet gid for donations. Optional; if unset, exports first sheet. */
export function getDonationsGid() {
    const v = typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_GOOGLE_SHEET_DONATIONS_GID;
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

    // Parse CSV with proper quoted field handling
    const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let insideQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (insideQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    insideQuotes = !insideQuotes;
                }
            } else if (char === ',' && !insideQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
    const data = lines.slice(1).map((line) => {
        const values = parseCSVLine(line);
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
    if (!exportUrl) {
        console.warn('[fetchFundedFromSheet] Missing NEXT_PUBLIC_GOOGLE_SHEET_APP_URL environment variable');
        captureMessage('Funded sheet sync skipped because configuration is missing', { level: 'warning', source: 'fetchFundedFromSheet' });
        return null;
    }
    try {
        const res = await fetch(exportUrl, { method: "GET", cache: "no-store" });
        if (!res.ok) {
            console.warn(`[fetchFundedFromSheet] HTTP ${res.status}`);
            captureMessage(`Funded sheet request failed with status ${res.status}`, { level: 'error', source: 'fetchFundedFromSheet' });
            return null;
        }
        const text = await res.text();
        const rows = convertCsvToJson(text);
        if (!Array.isArray(rows) || rows.length === 0) {
            console.warn('[fetchFundedFromSheet] No rows found in sheet');
            captureMessage('No funded rows found in sheet export', { level: 'error', source: 'fetchFundedFromSheet' });
            return null;
        }
        const result = cleanAndParseFundedRows(rows);
        return result;
    } catch (err) {
        console.error('[fetchFundedFromSheet] Error:', err.message);
        captureException(err, { source: 'fetchFundedFromSheet' });
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

export function getDonationsSheetUrl() {
    const donations = typeof process !== "undefined" && process.env && process.env.NEXT_PUBLIC_GOOGLE_DONATIONS_SHEET_URL;
    return donations || getGoogleSheetAppUrl();
}

function normalizeColumnName(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function getMemorialDonorLabel(row) {
    const targetColumn = Object.keys(row).find((key) => {
        const normalized = normalizeColumnName(key);
        return normalized.includes("nom a accompagner votre don");
    });

    if (!targetColumn) return "";
    return String(row[targetColumn] || "").trim();
}

/**
 * Fetches donations from a Google Sheet (CSV export).
 * @returns {Promise<DonationRow[]>}
 */
export async function fetchDonationsFromSheet() {
    const url = getDonationsSheetUrl();
    const exportUrl = buildCsvExportUrl(url, getDonationsGid());
    if (!exportUrl) {
        console.warn('[fetchDonationsFromSheet] Missing sheet URL');
        captureMessage('Missing donations sheet URL configuration', { level: 'error', source: 'fetchDonationsFromSheet' });
        return [];
    }

    try {
        const res = await fetch(exportUrl, { method: "GET", cache: "no-store" });
        if (!res.ok) {
            console.warn(`[fetchDonationsFromSheet] HTTP ${res.status}`);
            captureMessage(`Donations sheet request failed with status ${res.status}`, { level: 'error', source: 'fetchDonationsFromSheet' });
            return [];
        }
        const text = await res.text();
        const rows = convertCsvToJson(text);
        if (!Array.isArray(rows) || rows.length === 0) {
            console.warn('[fetchDonationsFromSheet] No rows found in sheet');
            captureMessage('No donation rows found in sheet export', { level: 'error', source: 'fetchDonationsFromSheet' });
            return [];
        }
        // Filter out rows based on donation form
        const filteredRows = rows.filter((row) => row["détails"] && (row["détails"].startsWith("Levée de fonds ") || row["détails"].startsWith("Travaux d'aménagement dans le nouveau centre de culte") || row["détails"].startsWith("Development work in the new center")));

        // Enrich rows with tier and donor info
        const enrichedRows = filteredRows.map((row) => {
            const details = row["détails"] || "";
            const tierMatch = details.match(/1x\s+([^\n]+?)(?:\s+[^\s]+)?$/);
            const tierName = tierMatch ? tierMatch[1].trim() : "";
            const donorLabel = getMemorialDonorLabel(row);

            return {
                ...row,
                tier: tierName,
                donorLabel: donorLabel,
            };
        });

        return enrichedRows;
    } catch (err) {
        console.error('[fetchDonationsFromSheet] Error:', err.message);
        captureException(err, { source: 'fetchDonationsFromSheet' });
        return [];
    }
}
