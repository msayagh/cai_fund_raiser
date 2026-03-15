'use client';

import { useState } from 'react';

export default function AdminSidebar({ activeTab, setActiveTab, isRTL, onLogout }) {
    const [isExpanded, setIsExpanded] = useState(true);

    const mainTabs = [
        { key: 'overview', label: 'Overview', icon: '📊' },
        { key: 'donors', label: 'Donors', icon: '👥' },
        { key: 'requests', label: 'Requests', icon: '📋' },
    ];

    const otherTabs = [
        { key: 'admins', label: 'Admins', icon: '🔐' },
        { key: 'logs', label: 'Activity Logs', icon: '📝' },
        { key: 'settings', label: 'Settings', icon: '⚙️' },
        { key: 'payment', label: 'Payment', icon: '💳' },
        { key: 'accounts', label: 'Accounts', icon: '👤' },
        { key: 'help', label: 'Help', icon: 'ℹ️' },
    ];

    return (
        <aside style={{
            background: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            minHeight: 'auto',
            transition: 'width 0.3s ease',
            width: isExpanded ? '200px' : '70px',
        }}>
            {/* Header with Expand/Collapse Button */}
            <div style={{
                display: 'flex',
                justifyContent: isExpanded ? 'space-between' : 'center',
                alignItems: 'center',
                paddingBottom: 16,
                borderBottom: '1px solid var(--border)',
            }}>
                {isExpanded && (
                    <div style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                        MENU
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                    style={{
                        padding: '6px 8px',
                        background: 'transparent',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                    }}
                    aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        {isExpanded ? (
                            <polyline points={isRTL ? "9 18 15 12 9 6" : "15 18 9 12 15 6"} />
                        ) : (
                            <polyline points={isRTL ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
                        )}
                    </svg>
                </button>
            </div>

            {/* Main Navigation */}
            <nav style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
            }}>
                {mainTabs.map(({ key, label, icon }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setActiveTab(key)}
                        title={!isExpanded ? label : undefined}
                        style={{
                            padding: isExpanded ? '10px 12px' : '10px',
                            borderRadius: '8px',
                            border: 'none',
                            background: activeTab === key ? 'rgba(186, 158, 58, 0.2)' : 'transparent',
                            color: activeTab === key ? 'var(--accent-gold)' : 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            fontWeight: activeTab === key ? 600 : 500,
                            fontSize: 14,
                            transition: 'all 0.2s ease',
                        }}>
                        <span style={{ fontSize: 16, minWidth: '20px', display: 'flex', justifyContent: 'center' }}>
                            {icon}
                        </span>
                        {isExpanded && <span>{label}</span>}
                    </button>
                ))}
            </nav>

            {/* Others Section */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                borderTop: '1px solid var(--border)',
                paddingTop: 16,
            }}>
                {isExpanded && (
                    <div style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                        OTHERS
                    </div>
                )}
                <nav style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                }}>
                    {otherTabs.map(({ key, label, icon }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setActiveTab(key)}
                            title={!isExpanded ? label : undefined}
                            style={{
                                padding: isExpanded ? '10px 12px' : '10px',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeTab === key ? 'rgba(186, 158, 58, 0.2)' : 'transparent',
                                color: activeTab === key ? 'var(--accent-gold)' : 'var(--text-primary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                fontWeight: activeTab === key ? 600 : 500,
                                fontSize: 14,
                                transition: 'all 0.2s ease',
                            }}>
                            <span style={{ fontSize: 16, minWidth: '20px', display: 'flex', justifyContent: 'center' }}>
                                {icon}
                            </span>
                            {isExpanded && <span>{label}</span>}
                        </button>
                    ))}
                    <button
                        type="button"
                        onClick={onLogout}
                        title={!isExpanded ? 'Logout' : undefined}
                        style={{
                            padding: isExpanded ? '10px 12px' : '10px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            fontWeight: 500,
                            fontSize: 14,
                            transition: 'all 0.2s ease',
                        }}>
                        <span style={{ fontSize: 16, minWidth: '20px', display: 'flex', justifyContent: 'center' }}>
                            🚪
                        </span>
                        {isExpanded && <span>Logout</span>}
                    </button>
                </nav>
            </div>
        </aside>
    );
}
