const it = {
    locale: "it_IT",
    centerName: "Centro Zad Al-Imane",
    title: "Campagna di Fondazione della Moschea",
    raisedOfGoal: "raccolto su",
    goal: "obiettivo",
    bricks: "mattoni",
    scanToDonate: "Scansiona per Donare",
    qrAlt: "Codice QR per la Donazione",
    qrHelp: "Punta la fotocamera per donare direttamente",
    selectTier: "Seleziona Livello",
    perBrick: "per mattone",
    language: "Lingua",
    aboutCampaign: "Informazioni su questa campagna",
    aboutCampaignText:
        "Ogni mattone illuminato rappresenta un contributo promesso verso la fondazione della moschea. I quattro livelli di contribuzione corrispondono a diverse sezioni della struttura, permettendo ai sostenitori di partecipare alla costruzione della fondazione, dei muri, degli archi e della cupola.",
    howToParticipate: "Come partecipare",
    howToParticipateText:
        "Seleziona un livello, rivedi i mattoni rimasti, quindi scansiona il codice QR o procedi con il tuo metodo di donazione. Il tuo supporto aiuta a trasformare questo piano visivo in un vero luogo di preghiera, apprendimento e servizio comunitario.",
    fullyFunded: "✦ Completamente Finanziato",
    brickCount: (funded, total) => `${funded} / ${total} mattoni`,
    legendLabel: (label, amount) => `${label} · €${amount.toLocaleString("it-IT")}`,
    sideChip: (remaining) => `${remaining} rimasti`,
    fundButton: (amount) => `Finanzia Un Mattone · €${amount.toLocaleString("it-IT")}`,
    zeffyNote:
        "Il 100% della tua donazione va direttamente alla moschea. Grazie alla piattaforma Zeffy, non vengono addebitati costi.",
    address: "Indirizzo",
    phone: "Telefono",
    website: "Sito Web",
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
                {`${totalBricksFunded}/${totalBricks} mattoni finanziati`}
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
            <span style={{ opacity: 0.8 }}>Obiettivo</span>
            <span>{`€${totalRaised.toLocaleString("it-IT")} raccolto / €${totalGoal.toLocaleString("it-IT")}`}</span>
        </span>
    ),
    tierLabels: {
        foundation: "Mutasaddiq",
        walls: "Kareem",
        arches: "Jawaad",
        dome: "Sabbaq",
    },
    ramadanRaisedLabel: "Raccolto nel Ramadan",
    collectedFundsLabel: "Fondi raccolti",
    remainingGoalLabel: "Obiettivo rimanente",
    campaignOverview: "Panoramica della campagna",
    statisticsModalLabel: "Statistiche della campagna",
    closeStatistics: "Chiudi statistiche",
    statisticsGlobalGoal: "Obiettivo globale",
    statisticsCurrentGoal: "Obiettivo attuale",
    averageSupport: "Supporto medio",
    currentTarget: "Obiettivo attuale",
    tierBreakdown: "Ripartizione per livello",
    campaignComparison: "Confronto della campagna",
    reached: "raggiunto",
    donorsList: "Elenco dei donatori",
    prayerTimes: "Orari di Preghiera",
    ramadanObjective: "Impegno della Campagna",
    engagement: "Impegno Ricevuto",
    prepositionOf: "di",
    donationDialogTitle: "Sostieni la moschea",
    hadithArabic:
        "مَنْ بَنَى مَسْجِدًا يَبْتَغِي بِهِ وَجْهَ اللَّهِ بَنَى اللَّهُ لَهُ مِثْلَهُ فِي الْجَنَّةِ",
    hadithTranslation:
        "Chiunque costruisce una moschea cercando il piacere di Allah, Allah costruirà per lui il suo equivalente in Paradiso.",
    hadithSource: "Concordato",
    loginTitle: "Accedi",
    loginMessage: "Prossimamente",
    loginDescription: "Stiamo lavorando per offrirti un'esperienza di accesso sicura. Rimani sintonizzato!",
    sitemap: "Mappa del Sito",
    sitemapDescription: "Consulta le pagine interne principali disponibili su questo sito.",
    sitemapHomeLabel: "Home",
    sitemapHomeDescription: "Pagina principale di raccolta fondi e panoramica della campagna.",
    sitemapLoginDescription: "Punto di ingresso per l'accesso sicuro in arrivo.",
    accessibilityZoomControls: "Controlli dello zoom di accessibilità",
    accessibilityShortLabel: "A11y",
    accessibilityZoomIn: "Ingrandisci testo",
    accessibilityZoomInShort: "A+",
    accessibilityZoomOut: "Riduci testo",
    accessibilityZoomOutShort: "A-",
    accessibilityResetZoom: "Ripristina dimensione testo",
    accessibilityResetZoomShort: "100%",
    backToHome: "Torna a Home",
};

export default it;
