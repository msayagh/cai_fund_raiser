export function createMosqueShapes(fill, stroke = "none") {
    return [
        <rect key="ml1" x="42" y="130" width="52" height="610" fill={fill} stroke={stroke} />,
        <ellipse key="ml2" cx="68" cy="130" rx="26" ry="20" fill={fill} stroke={stroke} />,
        <ellipse key="ml3" cx="68" cy="112" rx="20" ry="26" fill={fill} stroke={stroke} />,
        <rect key="ml4" x="60" y="86" width="16" height="36" fill={fill} stroke={stroke} />,
        <polygon key="ml5" points="58,90 78,90 68,15" fill={fill} stroke={stroke} />,
        <rect key="ml6" x="30" y="310" width="76" height="14" fill={fill} stroke={stroke} />,
        <rect key="ml7" x="34" y="195" width="68" height="11" fill={fill} stroke={stroke} />,

        <rect key="mr1" x="706" y="130" width="52" height="610" fill={fill} stroke={stroke} />,
        <ellipse key="mr2" cx="732" cy="130" rx="26" ry="20" fill={fill} stroke={stroke} />,
        <ellipse key="mr3" cx="732" cy="112" rx="20" ry="26" fill={fill} stroke={stroke} />,
        <rect key="mr4" x="724" y="86" width="16" height="36" fill={fill} stroke={stroke} />,
        <polygon key="mr5" points="722,90 742,90 732,15" fill={fill} stroke={stroke} />,
        <rect key="mr6" x="694" y="310" width="76" height="14" fill={fill} stroke={stroke} />,
        <rect key="mr7" x="698" y="195" width="68" height="11" fill={fill} stroke={stroke} />,

        <ellipse key="dome" cx="400" cy="430" rx="230" ry="230" fill={fill} stroke={stroke} />,
        <rect key="drum" x="170" y="380" width="460" height="380" fill={fill} stroke={stroke} />,
        <rect key="hall" x="94" y="460" width="612" height="280" fill={fill} stroke={stroke} />,

        <ellipse key="sd1" cx="182" cy="462" rx="74" ry="68" fill={fill} stroke={stroke} />,
        <rect key="sd1b" x="108" y="462" width="148" height="55" fill={fill} stroke={stroke} />,
        <rect key="sd1s" x="176" y="395" width="12" height="72" fill={fill} stroke={stroke} />,
        <polygon key="sd1p" points="170,401 194,401 182,345" fill={fill} stroke={stroke} />,

        <ellipse key="sd2" cx="618" cy="462" rx="74" ry="68" fill={fill} stroke={stroke} />,
        <rect key="sd2b" x="544" y="462" width="148" height="55" fill={fill} stroke={stroke} />,
        <rect key="sd2s" x="612" y="395" width="12" height="72" fill={fill} stroke={stroke} />,
        <polygon key="sd2p" points="606,401 630,401 618,345" fill={fill} stroke={stroke} />,

        <rect key="iw1" x="330" y="405" width="140" height="340" fill={fill} stroke={stroke} />,
        <ellipse key="iw2" cx="400" cy="407" rx="70" ry="58" fill={fill} stroke={stroke} />,

        <rect key="sp1" x="391" y="110" width="18" height="60" fill={fill} stroke={stroke} />,
        <ellipse key="sp2" cx="400" cy="112" rx="20" ry="14" fill={fill} stroke={stroke} />,
        <polygon key="sp3" points="388,118 412,118 400,30" fill={fill} stroke={stroke} />,
    ];
}

export function createInsideTest() {
    return (x, y) => {
        if (x >= 42 && x <= 94) return true;
        if (x >= 706 && x <= 758) return true;
        if (((x - 400) / 230) ** 2 + ((y - 430) / 230) ** 2 <= 1) return true;
        if (x >= 170 && x <= 630 && y >= 380) return true;
        if (x >= 94 && x <= 706 && y >= 460) return true;
        if (((x - 182) / 74) ** 2 + ((y - 462) / 68) ** 2 <= 1) return true;
        if (((x - 618) / 74) ** 2 + ((y - 462) / 68) ** 2 <= 1) return true;
        if (x >= 330 && x <= 470 && y >= 405) return true;
        if (((x - 400) / 70) ** 2 + ((y - 407) / 58) ** 2 <= 1) return true;
        return false;
    };
}
