import React from "react";

const fr = {
  locale: "fr_CA",
  centerName: "Centre Zad Al-Imane",
  title: "Campagne d’établissement de la mosquée",
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
    "Chaque brique illuminée représente une contribution engagée pour l’établissement de la mosquée. Les quatre paliers de contribution correspondent à différentes parties de l’édifice, permettant aux donateurs de participer à la fondation, aux murs, aux arches et au dôme.",
  howToParticipate: "Comment participer",
  howToParticipateText:
    "Choisissez un palier, consultez le nombre de briques restantes, puis scannez le code QR ou utilisez votre moyen de don. Votre soutien aide à transformer ce plan visuel en un véritable lieu de prière, d’apprentissage et de service à la communauté.",
  fullyFunded: "✦ Entièrement financé",
  brickCount: (funded, total) => `${funded} / ${total} briques`,
  legendLabel: (label, amount) => `${label} · ${amount.toLocaleString()} $`,
  sideChip: (remaining) => `${remaining} restantes`,
  fundButton: (amount) => `Financer une brique · ${amount.toLocaleString()} $`,
  zeffyNote:
    "100 % de votre don va directement à la mosquée. Grâce à la plateforme Zeffy, aucune commission n’est prélevée.",
  address: "Adresse",
  phone: "Téléphone",
  website: "Site web",
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
        {`${totalBricksFunded}/${totalBricks} briques financées`}
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
      <span style={{ opacity: 0.8 }}>Objectif</span>
      <span>{`${totalRaised.toLocaleString()} $ collectés / ${totalGoal.toLocaleString()} $`}</span>
    </span>
  ),
  tierLabels: {
    foundation: "Bienfaiteur",
    walls: "Généreux",
    arches: "Très généreux",
    dome: "Précurseur",
  },
  ramadanRaisedLabel: "Ramadan atteint",
  collectedFundsLabel: "Fonds collectés",
  remainingGoalLabel: "Reste",
  campaignOverview: "Vue d'ensemble de la campagne",
  reached: "atteint",
  donorsList: "Liste des donateurs",
  prayerTimes: "Heures de priere",
  ramadanObjective: "Objectif de Ramadan",
  prepositionOf: "de",
  donationDialogTitle: "Faire un don au centre",
  hadithArabic:
    "مَنْ بَنَى مَسْجِدًا يَبْتَغِي بِهِ وَجْهَ اللَّهِ بَنَى اللَّهُ لَهُ مِثْلَهُ فِي الْجَنَّةِ",
  hadithTranslation:
    "Quiconque construit une mosquée en recherchant l'agrément d'Allah, Allah lui construira son équivalent au Paradis.",
  hadithSource: "Rapporté par al-Bukhari et Muslim",
  loginTitle: "Connexion",
  loginMessage: "Bientôt disponible",
  loginDescription: "Nous travaillons sur une expérience de connexion sécurisée. Restez à l'écoute!",
  backToHome: "Retour à l'accueil",
};

export default fr;
