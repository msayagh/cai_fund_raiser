'use client';

import { useEffect, useState } from 'react';
import { FEATURES } from '@/constants/features.js';

const TOOL_TAB_KEYS = ['imports', 'exports', 'apiKeys', 'logs'];

function NavIcon({ kind }) {
    const common = {
        width: 17,
        height: 17,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
    };

    switch (kind) {
        case 'overview':
            return <svg {...common}><path d="M3 13h8V3H3z"/><path d="M13 21h8V11h-8z"/><path d="M13 3h8v4h-8z"/><path d="M3 17h8v4H3z"/></svg>;
        case 'requests':
            return <svg {...common}><path d="M4 5h16v14H4z"/><path d="M8 9h8"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>;
        case 'imports':
            return <svg {...common}><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/></svg>;
        case 'apiKeys':
            return <svg {...common}><circle cx="8.5" cy="15.5" r="2.5"/><path d="M14 15.5h7"/><path d="M18 12.5v6"/><path d="M11 15.5h3"/><path d="M8.5 13V5.5A2.5 2.5 0 0 1 11 3h2"/></svg>;
        case 'exports':
            return <svg {...common}><path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M5 3h14"/><path d="M5 21h14"/></svg>;
        case 'admins':
            return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="3"/><path d="M17 11l2 2 4-4"/></svg>;
        case 'settings':
            return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
        case 'logs':
            return <svg {...common}><path d="M8 7h12"/><path d="M8 12h12"/><path d="M8 17h12"/><path d="M4 7h.01"/><path d="M4 12h.01"/><path d="M4 17h.01"/></svg>;
        case 'volunteering':
            return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
        case 'accounts':
            return <svg {...common}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
        case 'tools':
            return <svg {...common}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.2 2.2-3-3z"/></svg>;
        case 'logout':
            return <svg {...common}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
        default:
            return null;
    }
}

function SidebarChevron({ isCollapsed, isRTL }) {
    const points = isRTL
        ? (isCollapsed ? '15 18 9 12 15 6' : '9 18 15 12 9 6')
        : (isCollapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6');

    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points={points} />
        </svg>
    );
}

function MobileChevron({ isOpen }) {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points={isOpen ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
        </svg>
    );
}

export default function AdminSidebar({ activeTab, setActiveTab, isRTL, onLogout, onTabSelect, adminText }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(true);
    const [isToolsOpen, setIsToolsOpen] = useState(TOOL_TAB_KEYS.includes(activeTab));
    const ui = {
        menu: adminText?.menu || 'Menu',
        other: adminText?.other || 'Other',
        tools: adminText?.tools || 'Tools',
        logout: adminText?.logout || 'Logout',
        collapseSidebar: adminText?.collapseSidebar || 'Collapse sidebar',
        expandSidebar: adminText?.expandSidebar || 'Expand sidebar',
        navigation: adminText?.adminNavigation || 'Admin navigation',
    };

    useEffect(() => {
        if (TOOL_TAB_KEYS.includes(activeTab)) {
            setIsToolsOpen(true);
        }
    }, [activeTab]);

    const mainTabs = [
        { key: 'overview', label: adminText?.overview || 'Overview', icon: 'overview' },
        { key: 'accounts', label: adminText?.donors || 'Donors', icon: 'accounts' },
        { key: 'requests', label: adminText?.requests || 'Requests', icon: 'requests' },
        ...(FEATURES.VOLUNTEERING ? [{ key: 'volunteering', label: adminText?.volunteering || 'Volunteering', icon: 'volunteering' }] : []),
    ];

    const toolTabs = [
        { key: 'imports', label: adminText?.importExistingDonations || 'Import Donations', icon: 'imports' },
        { key: 'exports', label: adminText?.exportDataTitle || 'Export Data', icon: 'exports' },
        { key: 'apiKeys', label: adminText?.apiKeys || 'API Keys', icon: 'apiKeys' },
        { key: 'logs', label: adminText?.activityLogs || 'Activity Logs', icon: 'logs' },
    ];
    const otherTabs = [
        { key: 'admins', label: adminText?.admins || 'Admins', icon: 'admins' },
        { key: 'settings', label: adminText?.settings || 'Settings', icon: 'settings' },
    ];

    const handleTabClick = (key) => {
        if (typeof onTabSelect === 'function') {
            onTabSelect(key);
            return;
        }

        setActiveTab(key);
    };

    return (
        <nav
            className={`sidenav admin-sidenav${isCollapsed ? ' sidenav--collapsed' : ''}${!isMobileNavOpen ? ' sidenav--mobile-closed' : ''}`}
            aria-label={ui.navigation}
        >
            <div className="sidenav-head">
                {!isCollapsed ? <p className="sidenav-label">{ui.menu}</p> : <span className="sidenav-spacer" aria-hidden="true"></span>}
                <button
                    type="button"
                    className="sidenav-toggle sidenav-toggle--desktop"
                    onClick={() => setIsCollapsed((value) => !value)}
                    title={isCollapsed ? ui.expandSidebar : ui.collapseSidebar}
                    aria-label={isCollapsed ? ui.expandSidebar : ui.collapseSidebar}
                >
                    <SidebarChevron isCollapsed={isCollapsed} isRTL={isRTL} />
                </button>
                <button
                    type="button"
                    className="sidenav-toggle sidenav-toggle--mobile"
                    onClick={() => setIsMobileNavOpen((value) => !value)}
                    title={isMobileNavOpen ? ui.collapseSidebar : ui.expandSidebar}
                    aria-label={isMobileNavOpen ? ui.collapseSidebar : ui.expandSidebar}
                >
                    <MobileChevron isOpen={isMobileNavOpen} />
                </button>
            </div>

            <div className="admin-sidenav-group">
                {mainTabs.map(({ key, label, icon }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => handleTabClick(key)}
                        title={isCollapsed ? label : undefined}
                        className={`sidenav-btn admin-sidenav-btn${activeTab === key ? ' is-active' : ''}`}
                    >
                        <span className="sidenav-icon admin-sidenav-icon"><NavIcon kind={icon} /></span>
                        {!isCollapsed ? <span>{label}</span> : null}
                    </button>
                ))}
            </div>

            <div className="admin-sidenav-section">
                {!isCollapsed ? <p className="sidenav-label admin-sidenav-label">{ui.other}</p> : null}
                <div className="admin-sidenav-group">
                    <div className={`admin-sidenav-submenu${isToolsOpen ? ' is-open' : ''}`}>
                        <button
                            type="button"
                            onClick={() => setIsToolsOpen((value) => !value)}
                            title={isCollapsed ? ui.tools : undefined}
                            className={`sidenav-btn admin-sidenav-btn${TOOL_TAB_KEYS.includes(activeTab) ? ' is-active' : ''}`}
                        >
                            <span className="sidenav-icon admin-sidenav-icon"><NavIcon kind="tools" /></span>
                            {!isCollapsed ? (
                                <>
                                    <span>{ui.tools}</span>
                                    <span className={`admin-sidenav-submenu__chevron${isToolsOpen ? ' is-open' : ''}`} aria-hidden="true">
                                        <MobileChevron isOpen={isToolsOpen} />
                                    </span>
                                </>
                            ) : null}
                        </button>

                        {(!isCollapsed && isToolsOpen) || isCollapsed ? (
                            <div className="admin-sidenav-submenu__items">
                                {toolTabs.map(({ key, label, icon }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => handleTabClick(key)}
                                        title={isCollapsed ? label : undefined}
                                        className={`sidenav-btn admin-sidenav-btn admin-sidenav-btn--nested${activeTab === key ? ' is-active' : ''}`}
                                    >
                                        <span className="sidenav-icon admin-sidenav-icon"><NavIcon kind={icon} /></span>
                                        {!isCollapsed ? <span>{label}</span> : null}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    {otherTabs.map(({ key, label, icon }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => handleTabClick(key)}
                            title={isCollapsed ? label : undefined}
                            className={`sidenav-btn admin-sidenav-btn${activeTab === key ? ' is-active' : ''}`}
                        >
                            <span className="sidenav-icon admin-sidenav-icon"><NavIcon kind={icon} /></span>
                            {!isCollapsed ? <span>{label}</span> : null}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={onLogout}
                        title={isCollapsed ? ui.logout : undefined}
                        className="sidenav-btn sidenav-btn--danger admin-sidenav-btn"
                    >
                        <span className="sidenav-icon admin-sidenav-icon"><NavIcon kind="logout" /></span>
                        {!isCollapsed ? <span>{ui.logout}</span> : null}
                    </button>
                </div>
            </div>
        </nav>
    );
}
