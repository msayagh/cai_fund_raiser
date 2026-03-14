import React from "react";

const ur = {
  locale: "ur_PK",
  centerName: "مرکز زاد الایمان",
  title: "مسجد کے قیام کی مہم",
  raisedOfGoal: "جمع شدہ رقم",
  goal: "ہدف",
  bricks: "اینٹیں",
  scanToDonate: "عطیہ دینے کے لیے اسکین کریں",
  qrAlt: "عطیہ کے لیے QR کوڈ",
  qrHelp: "براہ راست عطیہ دینے کے لیے اپنے کیمرے کا رخ کریں",
  selectTier: "درجہ منتخب کریں",
  perBrick: "فی اینٹ",
  language: "زبان",
  aboutCampaign: "اس مہم کے بارے میں",
  aboutCampaignText:
    "ہر روشن اینٹ مسجد کے قیام کے لیے ایک وعدہ شدہ تعاون کی نمائندگی کرتی ہے۔ عطیہ کی چاروں سطحیں عمارت کے مختلف حصوں سے متعلق ہیں، تاکہ معاونین بنیاد، دیواروں، محرابوں اور گنبد کی تعمیر میں شریک ہو سکیں۔",
  howToParticipate: "حصہ لینے کا طریقہ",
  howToParticipateText:
    "ایک درجہ منتخب کریں، باقی اینٹوں کا جائزہ لیں، پھر QR کوڈ اسکین کریں یا اپنے پسندیدہ طریقے سے عطیہ دیں۔ آپ کا تعاون اس بصری منصوبے کو ایک حقیقی عبادت، تعلیم اور کمیونٹی خدمت کے مرکز میں بدلنے میں مدد دیتا ہے۔",
  fullyFunded: "✦ مکمل طور پر فنڈ ہو چکا",
  brickCount: (funded, total) => `${funded} / ${total} اینٹیں`,
  legendLabel: (label, amount) => `${label} · ${amount.toLocaleString()} $`,
  sideChip: (remaining) => `${remaining} باقی`,
  fundButton: (amount) => `ایک اینٹ کا خرچ اٹھائیں · ${amount.toLocaleString()} $`,
  zeffyNote:
    "آپ کے عطیے کا 100٪ براہ راست مسجد کو جاتا ہے۔ Zeffy پلیٹ فارم کی بدولت کوئی کمیشن نہیں لیا جاتا۔",
  address: "پتہ",
  phone: "فون",
  website: "ویب سائٹ",
  raisedLine: (totalRaised, totalGoal, totalBricksFunded, totalBricks, th) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        width: "100%",
        direction: "rtl",
      }}
    >
      <span style={{ color: th.textPrimary, fontWeight: 700 }}>
        {`${totalBricksFunded}/${totalBricks} اینٹیں فنڈ ہو چکی ہیں`}
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
        direction: "rtl",
      }}
    >
      <span style={{ opacity: 0.8 }}>ہدف</span>
      <span>{`${totalRaised.toLocaleString()} $ جمع / ${totalGoal.toLocaleString()} $`}</span>
    </span>
  ),
  tierLabels: {
    foundation: "متصدق",
    walls: "کریم",
    arches: "جواد",
    dome: "سباق",
  },
  ramadanRaisedLabel: "رمضان میں جمع شدہ رقم",
  collectedFundsLabel: "جمع شدہ فنڈز",
  remainingGoalLabel: "باقی ہدف",
  campaignOverview: "مہم کا جائزہ",
  reached: "حاصل شدہ",
  donorsList: "عطیہ دہندگان کی فہرست",
  prayerTimes: "اوقات نماز",
  ramadanObjective: "مہم کی شرکت",
  engagement: "موصول رقم",
  prepositionOf: "میں سے",
  donationDialogTitle: "مسجد کی معاونت کریں",
  hadithArabic:
    "مَنْ بَنَى مَسْجِدًا يَبْتَغِي بِهِ وَجْهَ اللَّهِ بَنَى اللَّهُ لَهُ مِثْلَهُ فِي الْجَنَّةِ",
  hadithTranslation:
    "جو شخص اللہ کی رضا کے لیے مسجد بنائے، اللہ اس کے لیے جنت میں اس جیسا گھر بناتا ہے۔",
  hadithSource: "متفق علیہ",
  loginTitle: "لاگ ان کریں",
  loginMessage: "جلد آ رہا ہے",
  loginDescription: "ہم ایک محفوظ لاگ ان کا تجربہ متعارف کرواتے ہیں۔ نظر رکھیں!",
  backToHome: "گھر واپس جائیں",
};

export default ur;
