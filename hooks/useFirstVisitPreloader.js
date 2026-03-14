import { useEffect, useState } from 'react';

const PRELOADER_SESSION_KEY = 'site-preloader-shown';

export function useFirstVisitPreloader(isReady) {
    const [shouldShowPreloader, setShouldShowPreloader] = useState(false);
    const [isResolved, setIsResolved] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const alreadyShown = window.sessionStorage.getItem(PRELOADER_SESSION_KEY) === 'true';
        setShouldShowPreloader(!alreadyShown);
        setIsResolved(true);
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!isReady || !shouldShowPreloader) return;

        window.sessionStorage.setItem(PRELOADER_SESSION_KEY, 'true');
    }, [isReady, shouldShowPreloader]);

    return { shouldShowPreloader, isResolved };
}
