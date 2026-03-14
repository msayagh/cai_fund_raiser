'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/hooks/index.js';

const STORAGE_KEY = 'site-accessibility-zoom';
const MIN_ZOOM = 0.9;
const MAX_ZOOM = 1.3;
const STEP = 0.1;

function clampZoom(value) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(2))));
}

function applyZoom(zoom) {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--accessibility-zoom', String(zoom));
    document.body.style.zoom = String(zoom);
}

export default function AccessibilityWidget({ compact = false }) {
    const { t } = useTranslation();
    const [zoom, setZoom] = useState(() => {
        if (typeof window === 'undefined') return 1;

        const savedZoom = Number.parseFloat(window.localStorage.getItem(STORAGE_KEY) || '1');
        return Number.isFinite(savedZoom) ? clampZoom(savedZoom) : 1;
    });
    const [isOpen, setIsOpen] = useState(false);
    const widgetRef = useRef(null);

    useEffect(() => {
        applyZoom(zoom);
    }, [zoom]);

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (event) => {
            if (!widgetRef.current?.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [isOpen]);

    const labels = {
        group: t.accessibilityZoomControls || 'Accessibility zoom controls',
        short: t.accessibilityShortLabel || 'A11y',
        zoomIn: t.accessibilityZoomIn || 'Zoom in text',
        zoomInShort: t.accessibilityZoomInShort || 'A+',
        zoomOut: t.accessibilityZoomOut || 'Zoom out text',
        zoomOutShort: t.accessibilityZoomOutShort || 'A-',
        reset: t.accessibilityResetZoom || 'Reset text size',
        resetShort: t.accessibilityResetZoomShort || '100%',
    };

    const updateZoom = (nextZoom) => {
        const clampedZoom = clampZoom(nextZoom);
        setZoom(clampedZoom);
        applyZoom(clampedZoom);

        if (typeof window !== 'undefined') {
            if (clampedZoom === 1) {
                window.localStorage.removeItem(STORAGE_KEY);
            } else {
                window.localStorage.setItem(STORAGE_KEY, String(clampedZoom));
            }
        }
    };

    return (
        <div
            className={`accessibility-widget ${compact ? 'accessibility-widget--compact' : ''}`}
            role="group"
            aria-label={labels.group}
            suppressHydrationWarning
            ref={widgetRef}
        >
            <button
                type="button"
                className={`accessibility-widget-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-label={labels.group}
            >
                <span className="accessibility-widget-trigger-label">{labels.short}</span>
                <span className="accessibility-widget-trigger-value">{Math.round(zoom * 100)}%</span>
            </button>
            {isOpen && (
                <div className="accessibility-widget-menu" role="menu">
                    <div className="accessibility-widget-label">{labels.group}</div>
                    <div className="accessibility-widget-actions">
                        <button
                            type="button"
                            className="accessibility-widget-button"
                            onClick={() => updateZoom(zoom + STEP)}
                            aria-label={labels.zoomIn}
                            title={labels.zoomIn}
                            disabled={zoom >= MAX_ZOOM}
                        >
                            {labels.zoomInShort}
                        </button>
                        <button
                            type="button"
                            className="accessibility-widget-button"
                            onClick={() => updateZoom(zoom - STEP)}
                            aria-label={labels.zoomOut}
                            title={labels.zoomOut}
                            disabled={zoom <= MIN_ZOOM}
                        >
                            {labels.zoomOutShort}
                        </button>
                        <button
                            type="button"
                            className="accessibility-widget-button accessibility-widget-button--reset"
                            onClick={() => updateZoom(1)}
                            aria-label={labels.reset}
                            title={labels.reset}
                            disabled={zoom === 1}
                        >
                            {labels.resetShort}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
