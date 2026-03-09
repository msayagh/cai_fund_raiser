// ─── AppNav — top navigation strip shared by all pages ───────────────────────
// Renders a slim bar above each page's own header.
// Props: navigate (fn), currentPage (string), language (string), setLanguage (fn)

import React from "react";
import { PORTAL_T } from "../i18n/portalTranslations";

const LANGUAGES = { en: "EN", fr: "FR", ar: "AR" };

const NAV_PAGES = [
  { key: "home",   icon: "🕌" },
  { key: "donor",  icon: "👤" },
  { key: "setup",  icon: "⚙️" },
  { key: "admin",  icon: "🔑" },
];

const LABEL_KEYS = {
  home:  "navLanding",
  donor: "navMyAccount",
  setup: "navAdminSetup",
  admin: "navAdminPanel",
};

export default function AppNav({ navigate, currentPage, language, setLanguage }) {
  const t = PORTAL_T[language] || PORTAL_T.en;
  const isRTL = language === "ar";

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        background: "#07091a",
        borderBottom: "1px solid rgba(200,169,110,0.15)",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        height: "40px",
        flexShrink: 0,
        zIndex: 100,
      }}
    >
      {/* Page links */}
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        {NAV_PAGES.map(({ key, icon }) => {
          const isActive = currentPage === key;
          return (
            <button
              key={key}
              onClick={() => navigate(key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "4px 11px",
                borderRadius: "20px",
                border: `1px solid ${isActive ? "#D4A96E" : "transparent"}`,
                background: isActive ? "rgba(212,169,110,0.12)" : "transparent",
                color: isActive ? "#D4A96E" : "#8888aa",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: isActive ? 700 : 500,
                letterSpacing: "0.04em",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = "#c0c0d8";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = "#8888aa";
              }}
            >
              <span style={{ fontSize: "11px" }}>{icon}</span>
              {t[LABEL_KEYS[key]]}
            </button>
          );
        })}
      </div>

      {/* Language selector */}
      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
        <span style={{ fontSize: "11px", color: "#555577", letterSpacing: "0.06em", marginRight: "4px" }}>
          {t.language}
        </span>
        {Object.entries(LANGUAGES).map(([code, label]) => (
          <button
            key={code}
            onClick={() => setLanguage(code)}
            style={{
              padding: "2px 9px",
              borderRadius: "20px",
              border: `1px solid ${language === code ? "#D4A96E" : "#2e3250"}`,
              background: language === code ? "rgba(212,169,110,0.14)" : "transparent",
              color: language === code ? "#D4A96E" : "#666688",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: language === code ? 700 : 500,
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
