import React from "react";

const ar = {
  locale: "ar",
  centerName: "مركز زاد الإيمان",
  title: "حملة تأسيس المسجد",
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
    "تمثل كل طوبة مضيئة مساهمةً متعهداً بها في تأسيس المسجد. وترتبط فئات التبرع الأربع بأجزاء مختلفة من المبنى، مما يتيح للمساهمين المشاركة في الأساس والجدران والأقواس والقبة.",
  howToParticipate: "كيفية المشاركة",
  howToParticipateText:
    "اختر الفئة، واطّلع على عدد الطوب المتبقي، ثم امسح رمز الاستجابة أو استخدم وسيلة التبرع المناسبة. دعمك يساعد على تحويل هذا التصور إلى مسجد حقيقي للصلاة والتعلم وخدمة المجتمع.",
  fullyFunded: "✦ اكتمل التمويل",
  brickCount: (funded, total) => `${funded} / ${total} طوبة`,
  legendLabel: (label, amount) => `${label} · ${amount.toLocaleString()} $`,
  sideChip: (remaining) => `${remaining} متبقية`,
  fundButton: (amount) => `موّل طوبة واحدة · ${amount.toLocaleString()} $`,
  zeffyNote:
    "تذهب 100٪ من تبرعاتكم مباشرةً إلى المسجد بفضل منصة Zeffy، من دون أي عمولات.",
  address: "العنوان",
  phone: "الهاتف",
  website: "الموقع",
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
        {`${totalBricksFunded}/${totalBricks} طوبة ممولة`}
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
      <span style={{ opacity: 0.8 }}>الهدف</span>
      <span>{`${totalRaised.toLocaleString()} $ محققة / ${totalGoal.toLocaleString()} $`}</span>
    </span>
  ),
  tierLabels: {
    foundation: "متصدق",
    walls: "كريم",
    arches: "جواد",
    dome: "سبّاق",
  },
  ramadanRaisedLabel: "تم تحقيق رمضان",
  collectedFundsLabel: "الأموال المجمعة",
  remainingGoalLabel: "المتبقي من الهدف",
  campaignOverview: "نظرة عامة على الحملة",
  statisticsModalLabel: "إحصاءات الحملة",
  closeStatistics: "إغلاق الإحصاءات",
  statisticsGlobalGoal: "الهدف العام",
  statisticsCurrentGoal: "الهدف الحالي",
  averageSupport: "متوسط الدعم",
  currentTarget: "الهدف الحالي",
  tierBreakdown: "تفصيل الفئات",
  campaignComparison: "مقارنة الحملة",
  reached: "محقق",
  donorsList: "قائمة المتبرعين",
  prayerTimes: "أوقات الصلاة",
  ramadanObjective: "مشاركة الحملة",
  engagement: "الالتزام المحقق",
  prepositionOf: "من",
  donationDialogTitle: "التبرع للمسجد",
  hadithArabic:
    "مَنْ بَنَى مَسْجِدًا يَبْتَغِي بِهِ وَجْهَ اللَّهِ بَنَى اللَّهُ لَهُ مِثْلَهُ فِي الْجَنَّةِ",
  hadithTranslation:
    "من بنى مسجدًا ابتغاء وجه الله بنى الله له مثله في الجنة.",
  hadithSource: "متفق عليه",
  loginTitle: "تسجيل الدخول",
  loginMessage: "قريباً",
  loginDescription: "نحن نعمل على تجربة تسجيل دخول آمنة. ترقبوا المزيد!",
  sitemap: "خريطة الموقع",
  sitemapDescription: "تصفح الصفحات الداخلية الرئيسية المتاحة على هذا الموقع.",
  sitemapHomeLabel: "الرئيسية",
  sitemapHomeDescription: "الصفحة الرئيسية للحملة ونظرة عامة عليها.",
  sitemapLoginDescription: "بوابة تسجيل الدخول الآمنة القادمة.",
  accessibilityZoomControls: "عناصر التحكم في تكبير إمكانية الوصول",
  accessibilityShortLabel: "وصول",
  accessibilityZoomIn: "تكبير النص",
  accessibilityZoomInShort: "A+",
  accessibilityZoomOut: "تصغير النص",
  accessibilityZoomOutShort: "A-",
  accessibilityResetZoom: "إعادة ضبط حجم النص",
  accessibilityResetZoomShort: "100%",
  backToHome: "العودة إلى الرئيسية",
};

export default ar;
