import React from "react";

const es = {
  locale: "es_ES",
  centerName: "Centro Zad Al-Imane",
  title: "Campana de Establecimiento de la Mezquita",
  raisedOfGoal: "recaudado de",
  goal: "meta",
  bricks: "ladrillos",
  scanToDonate: "Escanear para donar",
  qrAlt: "Codigo QR de donacion",
  qrHelp: "Apunta tu camara para donar directamente",
  selectTier: "Selecciona una categoria",
  perBrick: "por ladrillo",
  language: "Idioma",
  aboutCampaign: "Sobre esta campana",
  aboutCampaignText:
    "Cada ladrillo iluminado representa una contribucion comprometida para el establecimiento de la mezquita. Las cuatro categorias de contribucion corresponden a distintas partes de la estructura, permitiendo a los donantes participar en los cimientos, los muros, los arcos y la cupula.",
  howToParticipate: "Como participar",
  howToParticipateText:
    "Selecciona una categoria, revisa los ladrillos restantes y luego escanea el codigo QR o utiliza tu metodo de donacion. Tu apoyo ayuda a convertir este plan visual en un verdadero lugar de oracion, aprendizaje y servicio comunitario.",
  fullyFunded: "✦ Financiado por completo",
  brickCount: (funded, total) => `${funded} / ${total} ladrillos`,
  legendLabel: (label, amount) => `${label} · ${amount.toLocaleString()} $`,
  sideChip: (remaining) => `${remaining} restantes`,
  fundButton: (amount) => `Financiar un ladrillo · ${amount.toLocaleString()} $`,
  zeffyNote:
    "El 100 % de tu donacion va directamente a la mezquita. Gracias a la plataforma Zeffy, no se cobran comisiones.",
  address: "Direccion",
  phone: "Telefono",
  website: "Sitio web",
  raisedLine: (totalRaised, totalGoal, totalBricksFunded, totalBricks, th) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        width: "100%",
      }}
    >
      <span style={{ color: th.textPrimary, fontWeight: 700 }}>
        {`${totalBricksFunded}/${totalBricks} ladrillos financiados`}
      </span>
    </div>
  ),
  raisedTag: (totalRaised, totalGoal, th) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 999,
        border: `1px solid ${th.borderAccent}`,
        background:
          th.mode === "light" ? "rgba(0,0,0,0.02)" : "rgba(255,255,255,0.03)",
        color: th.textMuted,
        fontSize: 11,
        fontWeight: 600,
        marginTop: "4px",
      }}
    >
      <span style={{ opacity: 0.8 }}>Meta</span>
      <span>{`${totalRaised.toLocaleString()} $ recaudados / ${totalGoal.toLocaleString()} $`}</span>
    </span>
  ),
  tierLabels: {
    foundation: "Benefactor",
    walls: "Generoso",
    arches: "Muy generoso",
    dome: "Pionero",
  },
  ramadanRaisedLabel: "Recaudado en Ramadan",
  collectedFundsLabel: "Fondos recaudados",
  remainingGoalLabel: "Meta restante",
  campaignOverview: "Resumen de la campana",
  reached: "alcanzado",
  donorsList: "Lista de donantes",
  ramadanObjective: "Objetivo de Ramadan",
  prepositionOf: "de",
  donationDialogTitle: "Apoya la mezquita",
  hadithArabic:
    "مَنْ بَنَى مَسْجِدًا يَبْتَغِي بِهِ وَجْهَ اللَّهِ بَنَى اللَّهُ لَهُ مِثْلَهُ فِي الْجَنَّةِ",
  hadithTranslation:
    "Quien construya una mezquita buscando la complacencia de Allah, Allah le construira su equivalente en el Paraiso.",
  hadithSource: "Acordado por consenso",
};

export default es;
