import { MOBILE_BREAKPOINT } from '../constants/config.js';

export function SidebarBackdrop({ isVisible, onClose }) {
    return (
        <div
            className={`sidebar-backdrop ${isVisible ? "visible" : ""}`}
            onClick={onClose}
        ></div>
    );
}

export function SidebarToggleButton({ position, onClick, ariaLabel, title, children }) {
    return (
        <button
            className={`sidebar-toggle-btn sidebar-toggle-${position}`}
            onClick={onClick}
            aria-label={ariaLabel}
            title={title}
        >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="sidebar-toggle-icon">
                {children}
            </svg>
        </button>
    );
}

export function PrayerSidebar({ isOpen, onClose, t, prayerIframeSrc }) {
    return (
        <aside className={`layout-prayer-sidebar ${isOpen ? "open" : ""}`} aria-label={t.prayerTimes}>
            <button
                className="close-button"
                onClick={onClose}
                aria-label="Close prayer times sidebar"
            >
                ×
            </button>
            <div className="prayer-sidebar-content">
                <div className="prayer-sidebar-title">{t.prayerTimes}</div>
                <iframe
                    className="prayer-sidebar-frame"
                    title={t.prayerTimes}
                    src={prayerIframeSrc}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                />
            </div>
        </aside>
    );
}

export function LeftSidebar({ isOpen, onClose, children }) {
    return (
        <div className={`layout-left--mobile ${isOpen ? "open" : ""}`}>
            <button
                className="close-button"
                onClick={onClose}
                aria-label="Close left sidebar"
            >
                ×
            </button>
            <div style={{ marginTop: "40px" }}>
                {children}
            </div>
        </div>
    );
}

export function RightSidebar({ isOpen, onClose, children }) {
    return (
        <div className={`layout-right--mobile ${isOpen ? "open" : ""}`}>
            <button
                className="close-button"
                onClick={onClose}
                aria-label="Close right sidebar"
            >
                ×
            </button>
            <div style={{ marginTop: "40px" }}>
                {children}
            </div>
        </div>
    );
}
