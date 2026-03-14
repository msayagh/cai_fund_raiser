const en = {
  locale: "en_CA",
  centerName: "Centre Zad Al-Imane",
  title: "Masjid Establishment Campaign",
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
    "Each illuminated brick represents a pledged contribution toward the establishment of the masjid. The four contribution tiers correspond to different sections of the structure, allowing supporters to take part in building the foundation, walls, arches, and dome.",
  howToParticipate: "How to participate",
  howToParticipateText:
    "Select a tier, review the remaining bricks, then scan the QR code or proceed with your donation method. Your support helps transform this visual plan into a real place of prayer, learning, and community service.",
  fullyFunded: "✦ Fully Funded",
  brickCount: (funded, total) => `${funded} / ${total} bricks`,
  legendLabel: (label, amount) => `${label} · $${amount.toLocaleString()}`,
  sideChip: (remaining) => `${remaining} left`,
  fundButton: (amount) => `Fund One Brick · $${amount.toLocaleString()}`,
  zeffyNote:
    "100% of your donation goes directly to the mosque. Thanks to the Zeffy platform, no commissions are taken.",
  address: "Address",
  phone: "Phone",
  website: "Website",
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
        {`${totalBricksFunded}/${totalBricks} bricks funded`}
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
      <span style={{ opacity: 0.8 }}>Goal</span>
      <span>{`$${totalRaised.toLocaleString()} raised / $${totalGoal.toLocaleString()}`}</span>
    </span>
  ),
  tierLabels: {
    foundation: "Mutasaddiq",
    walls: "Kareem",
    arches: "Jawaad",
    dome: "Sabbaq",
  },
  ramadanRaisedLabel: "Ramadan raised",
  collectedFundsLabel: "Collected funds",
  remainingGoalLabel: "Remaining goal",
  campaignOverview: "Campaign overview",
  statisticsModalLabel: "Campaign statistics",
  closeStatistics: "Close statistics",
  statisticsGlobalGoal: "Global goal",
  statisticsCurrentGoal: "Current goal",
  averageSupport: "Avg. support",
  currentTarget: "Current target",
  tierBreakdown: "Tier breakdown",
  campaignComparison: "Campaign comparison",
  reached: "reached",
  donorsList: "List of donors",
  prayerTimes: "Prayer Times",
  ramadanObjective: "Campaign Engagement",
  engagement: "Engagement Received",
  prepositionOf: "of",
  donationDialogTitle: "Support the masjid",
  hadithArabic:
    "مَنْ بَنَى مَسْجِدًا يَبْتَغِي بِهِ وَجْهَ اللَّهِ بَنَى اللَّهُ لَهُ مِثْلَهُ فِي الْجَنَّةِ",
  hadithTranslation:
    "Whoever builds a mosque seeking the pleasure of Allah, Allah will build for him its equivalent in Paradise.",
  hadithSource: "Agreed upon",
  loginTitle: "Login",
  loginMessage: "Coming Soon",
  loginDescription: "We're working on bringing you a secure login experience. Stay tuned!",
  sitemap: "Sitemap",
  sitemapDescription: "Browse the main internal pages available on this site.",
  sitemapHomeLabel: "Home",
  sitemapHomeDescription: "Main fundraising page and campaign overview.",
  sitemapLoginDescription: "Upcoming secure login entry point.",
  accessibilityZoomControls: "Accessibility zoom controls",
  accessibilityShortLabel: "A11y",
  accessibilityZoomIn: "Zoom in text",
  accessibilityZoomInShort: "A+",
  accessibilityZoomOut: "Zoom out text",
  accessibilityZoomOutShort: "A-",
  accessibilityResetZoom: "Reset text size",
  accessibilityResetZoomShort: "100%",
  backToHome: "Back to Home",
};

export default en;
