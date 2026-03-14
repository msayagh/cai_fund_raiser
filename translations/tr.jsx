import React from "react";

const tr = {
    locale: "tr_TR",
    centerName: "Centre Zad Al-Imane",
    title: "Camii Kuruluş Kampanyası",
    raisedOfGoal: "toplanan",
    goal: "hedef",
    bricks: "tuğla",
    scanToDonate: "Bağış Vermek İçin Tara",
    qrAlt: "Bağış QR Kodu",
    qrHelp: "Doğrudan bağış vermek için kameranızı yönlendirin",
    selectTier: "Tier Seçin",
    perBrick: "tuğla başına",
    language: "Dil",
    aboutCampaign: "Bu kampanya hakkında",
    aboutCampaignText:
        "Aydınlanan her tuğla, caminin kurulmasına yönelik yapılmış bir katılım vaadini temsil eder. Dört katkı seviyesi yapının farklı bölümlerine karşılık gelir ve destekçilerin temel yapı, duvarlar, kemerler ve kubbe inşasında yer almalarına olanak tanır.",
    howToParticipate: "Nasıl katılabilirim",
    howToParticipateText:
        "Bir tier seçin, kalan tuğlaları gözden geçirin, ardından QR kodunu tarayın veya bağış yönteminizi seçin. Desteğiniz bu görsel planı dua, öğrenme ve toplum hizmeti için gerçek bir mekana dönüştürmeye yardımcı olur.",
    fullyFunded: "✦ Tamamen Finanse",
    brickCount: (funded, total) => `${funded} / ${total} tuğla`,
    legendLabel: (label, amount) => `${label} · $${amount.toLocaleString("tr-TR")}`,
    sideChip: (remaining) => `${remaining} kaldı`,
    fundButton: (amount) => `Bir Tuğla Finanse Et · $${amount.toLocaleString("tr-TR")}`,
    zeffyNote:
        "Bağışınızın %100'ü doğrudan camiye gider. Zeffy platformu sayesinde hiçbir komisyon alınmaz.",
    address: "Adres",
    phone: "Telefon",
    website: "Web Sitesi",
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
                {`${totalBricksFunded}/${totalBricks} tuğla finanse edildi`}
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
            <span style={{ opacity: 0.8 }}>Hedef</span>
            <span>{`$${totalRaised.toLocaleString("tr-TR")} toplanan / $${totalGoal.toLocaleString("tr-TR")}`}</span>
        </span>
    ),
    tierLabels: {
        foundation: "Mutasaddiq",
        walls: "Kareem",
        arches: "Jawaad",
        dome: "Sabbaq",
    },
    ramadanRaisedLabel: "Ramazan'da toplanan",
    collectedFundsLabel: "Toplanan fonlar",
    remainingGoalLabel: "Kalan hedef",
    campaignOverview: "Kampanyaya genel bakış",
    reached: "ulaşıldı",
    donorsList: "Bağışçılar listesi",
    prayerTimes: "Namaz Saatleri",
    ramadanObjective: "Ramazan hedefi",
    prepositionOf: "of",
    donationDialogTitle: "Camiye destek olun",
    hadithArabic:
        "مَنْ بَنَى مَسْجِدًا يَبْتَغِي بِهِ وَجْهَ اللَّهِ بَنَى اللَّهُ لَهُ مِثْلَهُ فِي الْجَنَّةِ",
    hadithTranslation:
        "Her kim Allah'ın rızasını kazanmak için bir cami inşa ederse, Allah ona cennette benzerini inşa eder.",
    hadithSource: "Müttefek Aleyh",
    loginTitle: "Giriş Yap",
    loginMessage: "Yakında",
    loginDescription: "Güvenli bir giriş deneyimi sunmak için çalışıyoruz. Yakında gelecek!",
    backToHome: "Ana Sayfaya Dön",
};

export default tr;
