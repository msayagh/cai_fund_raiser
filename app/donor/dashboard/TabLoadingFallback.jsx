import { useTranslation } from '@/hooks/index.js';
import { DEFAULT_TRANSLATION } from '@/lib/translationUtils.js';

export default function TabLoadingFallback() {
    const { t } = useTranslation();
    const donorText = { ...(DEFAULT_TRANSLATION.donor ?? {}), ...(t.donor ?? {}) };

    return (
        <div className="dashboard-card">
            <div className="dashboard-loading-row">
                <div className="dashboard-spinner-inline" />
                <span>{donorText.loadingTabContent}</span>
            </div>
        </div>
    );
}
