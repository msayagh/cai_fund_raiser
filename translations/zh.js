const zh = {
    locale: "zh_CN",
    centerName: "Centre Zad Al-Imane",
    title: "清真寺建立活动",
    raisedOfGoal: "已筹集",
    goal: "目标",
    bricks: "块砖",
    scanToDonate: "扫描捐款",
    openDonationFormNewTab: "在新标签页中打开",
    qrAlt: "捐款二维码",
    qrHelp: "将相机对准直接捐款",
    selectTier: "选择等级",
    perBrick: "每块砖",
    language: "语言",
    aboutCampaign: "关于此活动",
    aboutCampaignText:
        "每块点亮的砖块代表对清真寺建立的一项承诺贡献。四个贡献等级对应结构的不同部分，使支持者能够参与建造地基、墙壁、拱门和圆顶。",
    howToParticipate: "如何参与",
    howToParticipateText:
        "选择一个等级，查看剩余的砖块，然后扫描二维码或选择您的捐款方式。您的支持帮助将此视觉计划转变为祈祷、学习和社区服务的真实场所。",
    fullyFunded: "✦ 已完全筹集",
    brickCount: (funded, total) => `${funded} / ${total} 块砖`,
    legendLabel: (label, amount) => `${label} · ¥${amount.toLocaleString("zh-CN")}`,
    sideChip: (remaining) => `剩余 ${remaining} 块`,
    fundButton: (amount) => `资助一块砖 · ¥${amount.toLocaleString("zh-CN")}`,
    zeffyNote:
        "100% 的捐款直接用于清真寺。感谢 Zeffy 平台，无需处理费用。",
    address: "地址",
    phone: "电话",
    website: "网站",
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
                {`${totalBricksFunded}/${totalBricks} 块砖已筹集`}
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
            <span style={{ opacity: 0.8 }}>目标</span>
            <span>{`¥${totalRaised.toLocaleString("zh-CN")} 已筹集 / ¥${totalGoal.toLocaleString("zh-CN")}`}</span>
        </span>
    ),
    tierLabels: {
        foundation: "Mutasaddiq",
        walls: "Kareem",
        arches: "Jawaad",
        dome: "Sabbaq",
    },
    ramadanRaisedLabel: "斋月期间筹集",
    collectedFundsLabel: "已收集资金",
    remainingGoalLabel: "剩余目标",
    campaignOverview: "活动概览",
    statisticsModalLabel: "活动统计",
    closeStatistics: "关闭统计",
    statisticsGlobalGoal: "总目标",
    statisticsCurrentGoal: "当前目标",
    averageSupport: "平均支持额",
    currentTarget: "当前目标",
    tierBreakdown: "等级明细",
    campaignComparison: "活动对比",
    reached: "已达到",
    donorsList: "捐助者名单",
    prayerTimes: "祈祷时间",
    ramadanObjective: "活动参与",
    engagement: "参与承诺已收到",
    prepositionOf: "的",
    donationDialogTitle: "支持清真寺",
    hadithArabic:
        "مَنْ بَنَى مَسْجِدًا يَبْتَغِي بِهِ وَجْهَ اللَّهِ بَنَى اللَّهُ لَهُ مِثْلَهُ فِي الْجَنَّةِ",
    hadithTranslation:
        "任何为了真主的喜悦而建造清真寺的人，真主都会在天堂为他建造对等的奖赏。",
    hadithSource: "穆塔瓦提尔",
    loginTitle: "登录",
    loginMessage: "即将推出",
    loginDescription: "我们正在致力于为您提供安全的登录体验。敬请期待！",
    sitemap: "网站地图",
    sitemapDescription: "浏览此网站提供的主要内部页面。",
    sitemapHomeLabel: "首页",
    sitemapHomeDescription: "主要募捐页面和活动概览。",
    sitemapLoginDescription: "即将推出的安全登录入口。",
    accessibilityZoomControls: "无障碍缩放控件",
    accessibilityShortLabel: "无障碍",
    accessibilityZoomIn: "放大文字",
    accessibilityZoomInShort: "A+",
    accessibilityZoomOut: "缩小文字",
    accessibilityZoomOutShort: "A-",
    accessibilityResetZoom: "重置文字大小",
    accessibilityResetZoomShort: "100%",
    backToHome: "返回首页",
};

export default zh;
