'use client';

import './admin.scss';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SitePreloader from '@/components/SitePreloader.jsx';
import AdminSidebar from '@/components/AdminSidebar.jsx';
import { useTranslation, useThemeMode } from '@/hooks/index.js';
import { useFirstVisitPreloader } from '@/hooks/useFirstVisitPreloader.js';
import { THEMES } from '@/constants/config.js';
import { setupSEOMetaTags } from '@/lib/seoUtils.js';
import { DEFAULT_TRANSLATION, getAbsoluteUrl, getSiteUrl, truncateText } from '@/lib/translationUtils.js';
import {
    approveRequest,
    createDonor,
    createAdmin,
    updateAdmin,
    deleteDonorPayment,
    declineRequest,
    getDonor,
    getDonorPayments,
    getLogs,
    holdRequest,
    importDonationsCsv,
    listAdmins,
    listDonors,
    listRequests,
    resetDonorPassword,
    setDonorEngagement,
    updateDonor,
    addPayment,
    updateDonorPayment,
} from '@/lib/adminApi.js';
import { clearTokens, logout, tryAutoLogin } from '@/lib/auth.js';
import { clearStoredSession, getStoredSession, setStoredSession } from '@/lib/session.js';
import { startTokenRefreshManager, stopTokenRefreshManager } from '@/lib/tokenRefreshManager.js';
import PaymentPanel from './PaymentPanel.jsx';
import ApiKeysSection from './ApiKeysSection.jsx';
import VolunteeringSection from './VolunteeringSection.jsx';
import { FEATURES } from '@/constants/features.js';
const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '24px',
    padding: '24px',
};

const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.03)',
    color: 'var(--text-primary)',
};

const CSV_IMPORT_FIELDS = [
    { key: 'email', required: true },
    { key: 'amount', required: true },
    { key: 'method', required: true },
    { key: 'name', required: true },
    { key: 'date', required: false },
    { key: 'note', required: false },
    { key: 'engagement', required: false },
];

const CSV_PROTECTED_COLUMNS = ['name', 'email'];

const CSV_IMPORT_DEMO_ROWS = [
    ['email', 'amount', 'method', 'name', 'date', 'note', 'engagement'],
    ['donor1@example.com', '250', 'cash', 'Ahmed Ali', '2026-03-01', 'Friday collection', '1200'],
    ['donor2@example.com', '500', 'card', 'Fatima Noor', '2026-03-05', 'Ramadan contribution', '3000'],
    ['donor3@example.com', '100', 'zeffy', 'Yusuf Karim', '2026-03-08', 'Online payment', '800'],
];

const EXPORT_DATASETS = {
    donors: {
        defaultColumns: ['name', 'email', 'accountStatus', 'engagementAmount', 'paidAmount', 'paymentCount'],
        columns: [
            { key: 'name', labelKey: 'csvFieldName' },
            { key: 'email', labelKey: 'csvFieldEmail' },
            { key: 'accountStatus', labelKey: 'exportColumnAccountStatus' },
            { key: 'engagementAmount', labelKey: 'exportColumnEngagement' },
            { key: 'paidAmount', labelKey: 'exportColumnPaidAmount' },
            { key: 'outstandingAmount', labelKey: 'exportColumnOutstandingAmount' },
            { key: 'paymentCount', labelKey: 'exportColumnPaymentCount' },
            { key: 'createdAt', labelKey: 'exportColumnCreatedAt' },
        ],
    },
    payments: {
        defaultColumns: ['donorName', 'donorEmail', 'amount', 'method', 'date', 'note'],
        columns: [
            { key: 'donorName', labelKey: 'exportColumnDonorName' },
            { key: 'donorEmail', labelKey: 'exportColumnDonorEmail' },
            { key: 'amount', labelKey: 'csvFieldAmount' },
            { key: 'method', labelKey: 'csvFieldMethod' },
            { key: 'date', labelKey: 'csvFieldDate' },
            { key: 'note', labelKey: 'csvFieldNote' },
            { key: 'recordedByAdminId', labelKey: 'exportColumnRecordedBy' },
            { key: 'paymentId', labelKey: 'exportColumnPaymentId' },
        ],
    },
    donorsWithPayments: {
        defaultColumns: ['donorName', 'donorEmail', 'accountStatus', 'engagementAmount', 'amount', 'method', 'date'],
        columns: [
            { key: 'donorName', labelKey: 'exportColumnDonorName' },
            { key: 'donorEmail', labelKey: 'exportColumnDonorEmail' },
            { key: 'accountStatus', labelKey: 'exportColumnAccountStatus' },
            { key: 'engagementAmount', labelKey: 'exportColumnEngagement' },
            { key: 'amount', labelKey: 'csvFieldAmount' },
            { key: 'method', labelKey: 'csvFieldMethod' },
            { key: 'date', labelKey: 'csvFieldDate' },
            { key: 'note', labelKey: 'csvFieldNote' },
            { key: 'paymentId', labelKey: 'exportColumnPaymentId' },
        ],
    },
};

function AdminPageIcon({ kind }) {
    const common = {
        width: 16,
        height: 16,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.8,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
    };

    switch (kind) {
        case 'accounts':
            return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
        case 'requests':
            return <svg {...common}><path d="M4 5h16v14H4z" /><path d="M8 9h8" /><path d="M8 13h8" /><path d="M8 17h5" /></svg>;
        case 'imports':
            return <svg {...common}><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 21h16" /></svg>;
        case 'payments':
            return <svg {...common}><path d="M3 7h18" /><path d="M6 3h12v18H6z" /><path d="M9 12h6" /><path d="M9 16h4" /></svg>;
        case 'engagement':
            return <svg {...common}><path d="M8 12h8" /><path d="M12 8v8" /><circle cx="12" cy="12" r="9" /></svg>;
        case 'edit':
            return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;
        case 'add':
            return <svg {...common}><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
        case 'review':
            return <svg {...common}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
        case 'approve':
            return <svg {...common}><path d="M20 6 9 17l-5-5" /></svg>;
        case 'hold':
            return <svg {...common}><path d="M10 5H6v14h4z" /><path d="M18 5h-4v14h4z" /></svg>;
        case 'decline':
            return <svg {...common}><path d="m18 6-12 12" /><path d="m6 6 12 12" /></svg>;
        case 'attachment':
            return <svg {...common}><path d="M21.44 11.05 12.25 20.2a6 6 0 0 1-8.49-8.49l9.2-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.2a2 2 0 1 1-2.83-2.83l8.49-8.48" /></svg>;
        default:
            return null;
    }
}

function parseCsvText(csvText) {
    const rows = [];
    let current = '';
    let row = [];
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i += 1) {
        const char = csvText[i];
        const next = csvText[i + 1];

        if (char === '"') {
            if (inQuotes && next === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ',' && !inQuotes) {
            row.push(current);
            current = '';
            continue;
        }

        if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && next === '\n') {
                i += 1;
            }
            row.push(current);
            rows.push(row);
            row = [];
            current = '';
            continue;
        }

        current += char;
    }

    if (current.length > 0 || row.length > 0) {
        row.push(current);
        rows.push(row);
    }

    return rows.filter((cells) => cells.some((cell) => String(cell || '').trim() !== ''));
}

function serializeCsvRow(cells) {
    return cells.map((cell) => {
        const value = String(cell ?? '');
        if (/[",\n\r]/.test(value)) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }).join(',');
}

function buildCsvFileFromSelection(rows, columnMapping) {
    const mappedFields = CSV_IMPORT_FIELDS.filter(({ key }) => columnMapping[key]);
    const headers = mappedFields.map(({ key }) => key);
    const csvRows = [serializeCsvRow(headers)];

    rows.forEach((row) => {
        const values = mappedFields.map(({ key }) => row.values[columnMapping[key]] || '');
        csvRows.push(serializeCsvRow(values));
    });

    return new File([csvRows.join('\n')], 'reviewed-import.csv', { type: 'text/csv;charset=utf-8' });
}

function downloadCsvFile(filename, rows) {
    if (typeof window === 'undefined') return;
    const content = rows.map(serializeCsvRow).join('\n');
    downloadCsvContent(filename, content);
}

function downloadCsvContent(filename, content) {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function isProtectedCsvColumn(columnName) {
    return CSV_PROTECTED_COLUMNS.includes(String(columnName || '').trim().toLowerCase());
}

function formatIsoDate(value) {
    if (!value) return '';
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function buildPaymentExportRows(donors, paymentsByDonor) {
    return donors.flatMap((donor) => {
        const payments = paymentsByDonor[donor.id] || [];
        return payments.map((payment) => ({
            donorId: donor.id,
            donorName: donor.name || '',
            donorEmail: donor.email || '',
            accountStatus: donor.accountCreated === false ? 'placeholder' : 'active',
            engagementAmount: Number(donor.engagement?.totalPledge || 0),
            amount: Number(payment.amount || 0),
            method: payment.method || '',
            date: formatIsoDate(payment.date || payment.createdAt),
            note: payment.note || '',
            recordedByAdminId: payment.recordedByAdminId || '',
            paymentId: payment.id || '',
        }));
    });
}

export default function AdminDashboardPage() {
    const router = useRouter();
    // hydratedRef removed — Next.js router cache keeps component instances alive across
    // navigations, so a useRef guard would stay true and prevent boot from re-running
    // after login → redirect → login again. Use only the `alive` closure pattern.
    const { language, setLanguage, t, isMounted: translationMounted } = useTranslation();
    const { themeMode, setThemeMode, isMounted: themeMounted } = useThemeMode();
    const theme = THEMES[themeMode] ?? THEMES.dark;
    const languageDropdownRef = useRef(null);
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalError, setModalError] = useState('');
    const [modalMessage, setModalMessage] = useState('');
    const [donors, setDonors] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [selectedDonorId, setSelectedDonorId] = useState(null);
    const [selectedDonor, setSelectedDonor] = useState(null);
    const [selectedDonorForm, setSelectedDonorForm] = useState({ name: '', email: '', accountCreated: true });
    const [selectedDonorPassword, setSelectedDonorPassword] = useState('');
    const [selectedDonorPasswordConfirm, setSelectedDonorPasswordConfirm] = useState('');
    const [selectedDonorEngagementForm, setSelectedDonorEngagementForm] = useState({ totalPledge: '' });
    const [selectedDonorLoading, setSelectedDonorLoading] = useState(false);
    const [selectedDonorSaving, setSelectedDonorSaving] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isEngagementModalOpen, setIsEngagementModalOpen] = useState(false);
    const [isPaymentsModalOpen, setIsPaymentsModalOpen] = useState(false);
    const [donorPayments, setDonorPayments] = useState([]);
    const [requests, setRequests] = useState([]);
    const [logs, setLogs] = useState([]);
    const [activeTab, setActiveTabState] = useState('overview');
    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        if (typeof window !== 'undefined') {
            localStorage.setItem('adminActiveTab', tab);
        }
    };
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
    const [requestDecisionModal, setRequestDecisionModal] = useState({ open: false, request: null, approving: false, declining: false, holding: false });
    const [donorFilter, setDonorFilter] = useState({ nameQuery: '', emailQuery: '', engagementQuery: '' });
    const [requestFilter, setRequestFilter] = useState({ query: '', status: '', type: '' });
    const [adminFilter, setAdminFilter] = useState({ query: '' });
    const [logFilter, setLogFilter] = useState({ action: '', actor: '', query: '' });
    const [topDonorsPage, setTopDonorsPage] = useState(1);
    const [requestsPage, setRequestsPage] = useState(1);
    const [adminsPage, setAdminsPage] = useState(1);
    const [logsPage, setLogsPage] = useState(1);
    const [message, setMessage] = useState('');
    const [isAddDonorModalOpen, setIsAddDonorModalOpen] = useState(false);
    const [newDonorForm, setNewDonorForm] = useState({ name: '', email: '', password: '', passwordConfirm: '', pledgeAmount: '', accountCreated: true });
    const [newDonorSaving, setNewDonorSaving] = useState(false);
    const [topDonorsPerPage, setTopDonorsPerPage] = useState(8);
    const [processingRequestId, setProcessingRequestId] = useState(null);
    const [csvFile, setCsvFile] = useState(null);
    const [csvImportLoading, setCsvImportLoading] = useState(false);
    const [csvImportSummary, setCsvImportSummary] = useState(null);
    const [csvUploadProgress, setCsvUploadProgress] = useState(null);
    const [csvImportMessage, setCsvImportMessage] = useState('');
    const [isCsvDragActive, setIsCsvDragActive] = useState(false);
    const [csvPreviewColumns, setCsvPreviewColumns] = useState([]);
    const [csvPreviewRows, setCsvPreviewRows] = useState([]);
    const [csvSelectedRowIds, setCsvSelectedRowIds] = useState([]);
    const [csvColumnMapping, setCsvColumnMapping] = useState({
        email: '',
        amount: '',
        method: '',
        name: '',
        date: '',
        note: '',
        engagement: '',
    });
    const [exportType, setExportType] = useState('donors');
    const [exportSelectedColumns, setExportSelectedColumns] = useState(EXPORT_DATASETS.donors.defaultColumns);
    const [exportFilters, setExportFilters] = useState({
        query: '',
        dateFrom: '',
        dateTo: '',
        method: '',
        accountStatus: '',
        hasEngagement: '',
        minAmount: '',
        maxAmount: '',
    });
    const [exportPaymentsByDonor, setExportPaymentsByDonor] = useState({});
    const [exportLoading, setExportLoading] = useState(false);
    const [exportMessage, setExportMessage] = useState('');
    const [showNewDonorPassword, setShowNewDonorPassword] = useState(false);
    const [showNewDonorConfirmPassword, setShowNewDonorConfirmPassword] = useState(false);
    const [showSelectedDonorPassword, setShowSelectedDonorPassword] = useState(false);
    const [showSelectedDonorConfirmPassword, setShowSelectedDonorConfirmPassword] = useState(false);
    const [showNewAdminPassword, setShowNewAdminPassword] = useState(false);
    const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
    const [isCurrentAdminProfileModalOpen, setIsCurrentAdminProfileModalOpen] = useState(false);
    const [currentAdminTarget, setCurrentAdminTarget] = useState(null);
    const [currentAdminForm, setCurrentAdminForm] = useState({ name: '', email: '', password: '' });
    const [currentAdminSaving, setCurrentAdminSaving] = useState(false);
    const [showCurrentAdminPassword, setShowCurrentAdminPassword] = useState(false);
    const [creatingAdmin, setCreatingAdmin] = useState(false);
    const hasOpenModal =
        isAddDonorModalOpen
        || isProfileModalOpen
        || isEngagementModalOpen
        || isPaymentsModalOpen
        || requestDecisionModal.open
        || isCreateAdminModalOpen
        || isCurrentAdminProfileModalOpen;

    const appReady = translationMounted && themeMounted;
    const { shouldShowPreloader, isResolved: preloaderResolved } = useFirstVisitPreloader(appReady);
    const isRTL = ['ar', 'ur'].includes(language);

    const siteUrl = getSiteUrl();
    const pageUrl = getAbsoluteUrl(`/admin/dashboard?lang=${language}`, siteUrl);
    const pageTitle = `Admin Dashboard | ${t.centerName || DEFAULT_TRANSLATION.centerName}`;
    const pageDescription = truncateText('Manage donors, admins, requests, and activity logs.');
    const adminText = { ...(DEFAULT_TRANSLATION.admin ?? {}), ...(t.admin ?? {}) };
    const requestStatusLabel = (status) => ({
        pending: adminText.pendingOption,
        on_hold: adminText.onHoldOption,
        approved: adminText.approvedOption,
        declined: adminText.declinedOption,
    }[status] || status || '');
    const requestTypeLabel = (type) => ({
        account_creation: adminText.accountCreationOption,
        payment_upload: adminText.paymentUploadOption,
        engagement_change: adminText.engagementChangeOption,
        other: adminText.otherOption,
    }[type] || type || '');

    useEffect(() => {
        if (!translationMounted) return;
        setupSEOMetaTags({
            language,
            isRTL,
            pageTitle,
            pageDescription,
            pageUrl,
            socialImageUrl: getAbsoluteUrl('/logo-ccai.png', siteUrl),
            logoAlt: `${t.centerName || DEFAULT_TRANSLATION.centerName} logo`,
            locale: t.locale ?? language,
            siteUrl,
            t,
            pagePath: '/admin/dashboard',
            pageType: 'profile',
        });
    }, [translationMounted, language, isRTL, pageTitle, pageDescription, pageUrl, siteUrl, t]);

    async function loadAllData() {
        try {
            const results = await Promise.allSettled([
                listDonors({ limit: 100 }),
                listRequests({ limit: 100 }),
                listAdmins(),
                getLogs({ limit: 200 }),
            ]);

            const [donorsResult, requestsResult, adminsResult, logsResult] = results;

            if (donorsResult.status === 'fulfilled') setDonors(donorsResult.value.items ?? []);
            if (requestsResult.status === 'fulfilled') setRequests(requestsResult.value.items ?? []);
            if (adminsResult.status === 'fulfilled') setAdmins(adminsResult.value ?? []);
            if (logsResult.status === 'fulfilled') setLogs(logsResult.value.items ?? []);

            if (results.every(r => r.status === 'rejected')) {
                throw new Error(adminText.unableLoadAdminDashboard);
            }
        } catch (err) {
            console.error('Error loading dashboard data:', err);
            throw err;
        }
    }

    useEffect(() => {
        let active = true;

        async function loadDashboard() {
            const session = getStoredSession();
            if (!session || session.role !== 'admin') {
                if (active) {
                    setLoading(false);
                }
                stopTokenRefreshManager();
                router.replace('/login');
                return;
            }

            try {
                const refreshed = await tryAutoLogin();
                if (!refreshed) {
                    clearTokens();
                    clearStoredSession();
                    stopTokenRefreshManager();
                    if (active) {
                        setError(adminText.sessionExpired);
                    }
                    router.replace('/login');
                    return;
                }

                startTokenRefreshManager();

                await loadAllData();
                if (!active) return;
                setError('');
            } catch (err) {
                if (!active) return;
                clearTokens();
                clearStoredSession();
                stopTokenRefreshManager();
                setError(err?.message || adminText.unableLoadAdminDashboard);
                router.replace('/login');
                return;
            } finally {
                if (active) setLoading(false);
            }
        }

        loadDashboard();
        return () => {
            active = false;
            stopTokenRefreshManager();
        };
    }, [router]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTab = localStorage.getItem('adminActiveTab');
            if (savedTab && ['overview', 'requests', 'imports', 'exports', 'apiKeys', 'admins', 'logs', 'accounts', 'volunteering'].includes(savedTab)) {
                setActiveTabState(savedTab);
            }
        }
    }, []);

    const filteredDonors = useMemo(() => {
        const nameQ = donorFilter.nameQuery.trim().toLowerCase();
        const emailQ = donorFilter.emailQuery.trim().toLowerCase();
        const engagementQ = donorFilter.engagementQuery.trim().toLowerCase();
        return donors.filter((donor) => {
            const nameMatch = !nameQ || (donor.name || '').toLowerCase().includes(nameQ);
            const emailMatch = !emailQ || (donor.email || '').toLowerCase().includes(emailQ);
            const engagementText = String(donor.engagement?.totalPledge || '');
            const engagementMatch = !engagementQ || engagementText.toLowerCase().includes(engagementQ);
            return nameMatch && emailMatch && engagementMatch;
        });
    }, [donorFilter.nameQuery, donorFilter.emailQuery, donorFilter.engagementQuery, donors]);
    const filteredRequests = useMemo(() => {
        const query = requestFilter.query.trim().toLowerCase();
        return requests.filter((request) => {
            const queryMatch = !query || [request.name, request.email, request.message, request.type]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query));
            const statusMatch = !requestFilter.status || request.status === requestFilter.status;
            const typeMatch = !requestFilter.type || request.type === requestFilter.type;
            return queryMatch && statusMatch && typeMatch;
        });
    }, [requestFilter.query, requestFilter.status, requestFilter.type, requests]);
    const filteredAdmins = useMemo(() => {
        const query = adminFilter.query.trim().toLowerCase();
        return admins.filter((admin) => {
            if (!query) return true;
            return [admin.name, admin.email, admin.addedBy?.name]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [adminFilter.query, admins]);
    const donorWorkspaceStats = useMemo(() => {
        const visibleDonors = filteredDonors.length;
        const visiblePaid = filteredDonors.reduce((sum, donor) => sum + Number(donor.paidAmount || 0), 0);
        const visiblePledged = filteredDonors.reduce((sum, donor) => sum + Number(donor.engagement?.totalPledge || 0), 0);
        const visibleEngaged = filteredDonors.filter((donor) => Number(donor.engagement?.totalPledge || 0) > 0).length;
        return {
            visibleDonors,
            visiblePaid,
            visiblePledged,
            visibleOutstanding: Math.max(0, visiblePledged - visiblePaid),
            visibleEngaged,
        };
    }, [filteredDonors]);
    const topDonors = useMemo(
        () => [...filteredDonors].sort((a, b) => Number(b.paidAmount || 0) - Number(a.paidAmount || 0)),
        [filteredDonors]
    );
    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            const actionMatch = !logFilter.action || log.action?.includes(logFilter.action);
            const actorMatch = !logFilter.actor || log.actor?.toLowerCase().includes(logFilter.actor.toLowerCase());
            const query = logFilter.query.trim().toLowerCase();
            const queryMatch = !query || [log.action, log.actor, log.details]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query));
            return actionMatch && actorMatch && queryMatch;
        });
    }, [logFilter.action, logFilter.actor, logFilter.query, logs]);
    const currentAdminAccount = getStoredSession();
    const logsTotalPages = Math.max(1, Math.ceil(filteredLogs.length / 12));
    const paginatedLogs = useMemo(() => {
        const start = (logsPage - 1) * 12;
        return filteredLogs.slice(start, start + 12);
    }, [filteredLogs, logsPage]);
    const topDonorsTotalPages = Math.max(1, Math.ceil(topDonors.length / topDonorsPerPage));
    const requestsTotalPages = Math.max(1, Math.ceil(filteredRequests.length / 12));
    const adminsTotalPages = Math.max(1, Math.ceil(filteredAdmins.length / 12));
    const paginatedTopDonors = useMemo(() => {
        const start = (topDonorsPage - 1) * topDonorsPerPage;
        return topDonors.slice(start, start + topDonorsPerPage);
    }, [topDonors, topDonorsPage, topDonorsPerPage]);
    const paginatedRequests = useMemo(() => {
        const start = (requestsPage - 1) * 12;
        return filteredRequests.slice(start, start + 12);
    }, [filteredRequests, requestsPage]);
    const requestStats = useMemo(() => {
        const open = requests.filter((req) => ['pending', 'on_hold'].includes(req.status)).length;
        const paymentRequests = requests.filter((req) => req.type === 'payment_upload').length;
        const accountRequests = requests.filter((req) => req.type === 'account_creation').length;
        const reviewed = requests.filter((req) => ['approved', 'declined'].includes(req.status)).length;
        return { open, paymentRequests, accountRequests, reviewed };
    }, [requests]);
    const filteredRequestStats = useMemo(() => {
        const open = filteredRequests.filter((req) => ['pending', 'on_hold'].includes(req.status)).length;
        const paymentRequests = filteredRequests.filter((req) => req.type === 'payment_upload').length;
        const accountRequests = filteredRequests.filter((req) => req.type === 'account_creation').length;
        const reviewed = filteredRequests.filter((req) => ['approved', 'declined'].includes(req.status)).length;
        return { total: filteredRequests.length, open, paymentRequests, accountRequests, reviewed };
    }, [filteredRequests]);
    const exportPaymentRows = useMemo(
        () => buildPaymentExportRows(donors, exportPaymentsByDonor),
        [donors, exportPaymentsByDonor]
    );
    const exportDonorRows = useMemo(
        () => donors.map((donor) => {
            const engagementAmount = Number(donor.engagement?.totalPledge || 0);
            const paidAmount = Number(donor.paidAmount || 0);
            return {
                donorId: donor.id,
                name: donor.name || '',
                email: donor.email || '',
                accountStatus: donor.accountCreated === false ? 'placeholder' : 'active',
                engagementAmount,
                paidAmount,
                outstandingAmount: Math.max(0, engagementAmount - paidAmount),
                paymentCount: Number(donor._count?.payments || 0),
                createdAt: formatIsoDate(donor.createdAt),
            };
        }),
        [donors]
    );
    const exportBaseRows = useMemo(() => {
        if (exportType === 'payments') return exportPaymentRows;
        if (exportType === 'donorsWithPayments') return exportPaymentRows;
        return exportDonorRows;
    }, [exportType, exportPaymentRows, exportDonorRows]);
    const filteredExportRows = useMemo(() => {
        const query = exportFilters.query.trim().toLowerCase();
        const minAmount = exportFilters.minAmount ? Number(exportFilters.minAmount) : null;
        const maxAmount = exportFilters.maxAmount ? Number(exportFilters.maxAmount) : null;
        return exportBaseRows.filter((row) => {
            const searchableValues = [row.name, row.email, row.donorName, row.donorEmail, row.note, row.method]
                .filter(Boolean)
                .map((value) => String(value).toLowerCase());
            if (query && !searchableValues.some((value) => value.includes(query))) return false;

            if (exportFilters.accountStatus && row.accountStatus !== exportFilters.accountStatus) return false;
            if (exportFilters.method && row.method !== exportFilters.method) return false;
            if (exportFilters.hasEngagement) {
                const hasEngagement = Number(row.engagementAmount || 0) > 0;
                if (exportFilters.hasEngagement === 'yes' && !hasEngagement) return false;
                if (exportFilters.hasEngagement === 'no' && hasEngagement) return false;
            }

            const rowAmount = row.amount ?? row.paidAmount ?? row.engagementAmount ?? null;
            if (minAmount !== null && !(Number(rowAmount || 0) >= minAmount)) return false;
            if (maxAmount !== null && !(Number(rowAmount || 0) <= maxAmount)) return false;

            const rowDate = row.date || row.createdAt || '';
            if (exportFilters.dateFrom && (!rowDate || rowDate < exportFilters.dateFrom)) return false;
            if (exportFilters.dateTo && (!rowDate || rowDate > exportFilters.dateTo)) return false;

            return true;
        });
    }, [exportBaseRows, exportFilters]);
    const overviewMetrics = useMemo(() => {
        const donorCount = donors.length;
        const engagedDonors = donors.filter((donor) => Number(donor.engagement?.totalPledge || 0) > 0);
        const totalPledged = engagedDonors.reduce((sum, donor) => sum + Number(donor.engagement?.totalPledge || 0), 0);
        const totalPaid = donors.reduce((sum, donor) => sum + Number(donor.paidAmount || 0), 0);
        const averagePledge = engagedDonors.length ? totalPledged / engagedDonors.length : 0;
        const averagePaid = donorCount ? totalPaid / donorCount : 0;
        const completedEngagements = engagedDonors.filter((donor) => {
            const pledge = Number(donor.engagement?.totalPledge || 0);
            const paid = Number(donor.paidAmount || 0);
            return pledge > 0 && paid >= pledge;
        }).length;
        const completionRate = engagedDonors.length ? Math.round((completedEngagements / engagedDonors.length) * 100) : 0;
        const donorCoverage = donorCount ? Math.round((engagedDonors.length / donorCount) * 100) : 0;
        const totalRequests = requests.length || 1;

        return {
            totalPledged,
            averagePledge,
            averagePaid,
            completedEngagements,
            completionRate,
            donorCoverage,
            engagedDonors: engagedDonors.length,
            paymentRequestShare: Math.round((requestStats.paymentRequests / totalRequests) * 100),
            accountRequestShare: Math.round((requestStats.accountRequests / totalRequests) * 100),
        };
    }, [donors, requests, requestStats.accountRequests, requestStats.paymentRequests]);
    const formatCurrency = (value) => `$${Number(value || 0).toLocaleString()}`;
    const overviewBreakdown = useMemo(() => {
        const totalPaid = donors.reduce((sum, donor) => sum + Number(donor.paidAmount || 0), 0);
        const totalPledged = donors.reduce((sum, donor) => sum + Number(donor.engagement?.totalPledge || 0), 0);
        const outstanding = Math.max(0, totalPledged - totalPaid);
        const paymentCollectionRate = totalPledged > 0 ? Math.min(100, Math.round((totalPaid / totalPledged) * 100)) : 0;
        const totalTrackedAmount = totalPaid + outstanding;
        const collectedShare = totalTrackedAmount > 0 ? Math.round((totalPaid / totalTrackedAmount) * 100) : 0;
        const outstandingShare = totalTrackedAmount > 0 ? Math.round((outstanding / totalTrackedAmount) * 100) : 0;

        return {
            totalPaid,
            outstanding,
            paymentCollectionRate,
            collectedShare,
            outstandingShare,
        };
    }, [donors]);
    const paginatedAdmins = useMemo(() => {
        const start = (adminsPage - 1) * 12;
        return filteredAdmins.slice(start, start + 12);
    }, [filteredAdmins, adminsPage]);
    const csvSelectedRows = useMemo(
        () => csvPreviewRows.filter((row) => csvSelectedRowIds.includes(row.id)),
        [csvPreviewRows, csvSelectedRowIds]
    );
    useEffect(() => {
        setLogsPage(1);
    }, [logFilter.action, logFilter.actor, logFilter.query]);

    useEffect(() => {
        setTopDonorsPage(1);
    }, [donorFilter.nameQuery, donorFilter.emailQuery, donorFilter.engagementQuery]);

    useEffect(() => {
        setRequestsPage(1);
    }, [requestFilter.query, requestFilter.status, requestFilter.type]);

    useEffect(() => {
        setAdminsPage(1);
    }, [adminFilter.query]);

    useEffect(() => {
        if (logsPage > logsTotalPages) {
            setLogsPage(logsTotalPages);
        }
    }, [logsPage, logsTotalPages]);
    useEffect(() => {
        if (topDonorsPage > topDonorsTotalPages) {
            setTopDonorsPage(topDonorsTotalPages);
        }
    }, [topDonorsPage, topDonorsTotalPages]);
    useEffect(() => {
        setExportSelectedColumns(EXPORT_DATASETS[exportType].defaultColumns);
        setExportMessage('');
    }, [exportType]);
    useEffect(() => {
        setTopDonorsPage(1);
    }, [topDonorsPerPage]);
    useEffect(() => {
        if (requestsPage > requestsTotalPages) {
            setRequestsPage(requestsTotalPages);
        }
    }, [requestsPage, requestsTotalPages]);
    useEffect(() => {
        if (adminsPage > adminsTotalPages) {
            setAdminsPage(adminsTotalPages);
        }
    }, [adminsPage, adminsTotalPages]);

    async function handleCreateAdmin(event) {
        event.preventDefault();
        setError('');
        setMessage('');
        setModalError('');
        setModalMessage('');

        const name = newAdmin.name.trim();
        const email = newAdmin.email.trim().toLowerCase();
        const password = newAdmin.password.trim();

        if (!name || !email) {
            const errMsg = adminText.errorSaving || 'Error saving';
            setError(errMsg);
            setModalError(errMsg);
            return;
        }

        setCreatingAdmin(true);
        try {
            await createAdmin({
                name,
                email,
                ...(password && { password }),
            });
            setNewAdmin({ name: '', email: '', password: '' });

            try {
                await loadAllData();
            } catch (err) {
                console.error('Error reloading dashboard data:', err);
            }
            setMessage(adminText.adminCreated);
            setModalMessage(adminText.adminCreated);
            setIsCreateAdminModalOpen(false);
        } catch (err) {
            setError(err?.message || adminText.unableCreateAdmin);
            setModalError(err?.message || adminText.unableCreateAdmin);
        } finally {
            setCreatingAdmin(false);
        }
    }

    function openCurrentAdminProfileModal() {
        const currentAdmin = getStoredSession();
        setCurrentAdminTarget(currentAdmin);
        setCurrentAdminForm({
            name: currentAdmin?.name || '',
            email: currentAdmin?.email || '',
            password: '',
        });
        setShowCurrentAdminPassword(false);
        setModalError('');
        setModalMessage('');
        setIsCurrentAdminProfileModalOpen(true);
    }

    function openAdminProfileModal(admin) {
        setCurrentAdminTarget(admin);
        setCurrentAdminForm({
            name: admin?.name || '',
            email: admin?.email || '',
            password: '',
        });
        setShowCurrentAdminPassword(false);
        setModalError('');
        setModalMessage('');
        setIsCurrentAdminProfileModalOpen(true);
    }

    async function handleUpdateCurrentAdmin(event) {
        event.preventDefault();

        const targetAdmin = currentAdminTarget || getStoredSession();
        if (!targetAdmin?.id) {
            const errMsg = adminText.errorSaving || 'Error saving';
            setError(errMsg);
            setModalError(errMsg);
            return;
        }

        const nextName = currentAdminForm.name.trim();
        const nextEmail = currentAdminForm.email.trim().toLowerCase();
        const nextPassword = currentAdminForm.password.trim();
        const payload = {};

        if (nextName && nextName !== targetAdmin.name) payload.name = nextName;
        if (nextEmail && nextEmail !== targetAdmin.email) payload.email = nextEmail;
        if (nextPassword) payload.password = nextPassword;

        if (Object.keys(payload).length === 0) {
            const msg = adminText.savedSuccessfully || 'Saved successfully';
            setModalMessage(msg);
            setMessage(msg);
            setIsCurrentAdminProfileModalOpen(false);
            return;
        }

        setCurrentAdminSaving(true);
        setModalError('');
        setModalMessage('');
        setError('');
        setMessage('');

        try {
            const updated = await updateAdmin(targetAdmin.id, payload);
            const normalizedUpdated = updated?.data || updated;
            const activeSession = getStoredSession();
            if (activeSession?.id && activeSession.id === targetAdmin.id) {
                const nextSession = {
                    ...activeSession,
                    ...(normalizedUpdated || {}),
                };
                setStoredSession(nextSession);
            }

            try {
                await loadAllData();
            } catch (err) {
                console.error('Error reloading dashboard data:', err);
            }

            const successMessage = adminText.savedSuccessfully || 'Saved successfully';
            setModalMessage(successMessage);
            setMessage(successMessage);
            setIsCurrentAdminProfileModalOpen(false);
            setCurrentAdminTarget(null);
        } catch (err) {
            const errMsg = err?.message || adminText.errorSaving || 'Error saving';
            setModalError(errMsg);
            setError(errMsg);
        } finally {
            setCurrentAdminSaving(false);
        }
    }

    async function handleRemoveAdmin(admin) {
        if (!admin?.id) return;

        const activeSession = getStoredSession();
        if (activeSession?.id && activeSession.id === admin.id) {
            const errMsg = adminText.yourOwnStatusManagedByAnotherAdmin || 'Your own account can only be managed by another administrator.';
            setError(errMsg);
            setModalError(errMsg);
            return;
        }

        const confirmed = typeof window === 'undefined'
            ? true
            : window.confirm(`Remove admin ${admin.name || admin.email}? This cannot be undone.`);

        if (!confirmed) return;

        setError('');
        setMessage('');
        setModalError('');
        setModalMessage('');

        try {
            await deleteAdmin(admin.id);
            if (currentAdminTarget?.id === admin.id) {
                setIsCurrentAdminProfileModalOpen(false);
                setCurrentAdminTarget(null);
            }

            try {
                await loadAllData();
            } catch (err) {
                console.error('Error reloading dashboard data:', err);
            }

            const successMessage = 'Admin removed successfully.';
            setMessage(successMessage);
            setModalMessage(successMessage);
        } catch (err) {
            const errMsg = err?.message || 'Unable to remove admin.';
            setError(errMsg);
            setModalError(errMsg);
        }
    }

    async function handleRequestAction(id, status, body = {}) {
        setError('');
        setMessage('');
        setProcessingRequestId(id);
        try {
            if (status === 'approved') {
                await approveRequest(id, body);
            } else if (status === 'on_hold') {
                await holdRequest(id);
            } else {
                await declineRequest(id);
            }

            try {
                await loadAllData();
            } catch (err) {
                console.error('Error reloading dashboard data:', err);
            }
            setMessage(adminText.requestUpdated(status));
        } catch (err) {
            setError(err?.message || adminText.unableUpdateRequest);
        } finally {
            setProcessingRequestId(null);
        }
    }

    function openRequestDecision(request) {
        setRequestDecisionModal({
            open: true,
            request,
            approving: false,
            declining: false,
            holding: false,
        });
    }

    function closeRequestDecision() {
        setModalError('');
        setModalMessage('');
        setRequestDecisionModal((prev) => ({ ...prev, open: false, request: null, approving: false, declining: false, holding: false }));
    }

    function generateTempPassword() {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
        let pwd = '';
        for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
        return pwd;
    }

    function parsePaymentAmount(message) {
        const match = (message || '').match(/Amount:\s*\$?([\d,]+(?:\.\d{1,2})?)/i);
        return match ? parseFloat(match[1].replace(/,/g, '')) : null;
    }

    function getRequestActionCapabilities(request) {
        const status = request?.status;
        const type = request?.type;
        const canApprove = ['pending', 'on_hold'].includes(status) || (type === 'payment_upload' && status === 'declined');
        const canHold = status === 'pending' && type !== 'engagement_change';
        const canDecline =
            (['pending', 'on_hold'].includes(status) || (type === 'payment_upload' && status === 'approved'))
            && type !== 'engagement_change';
        return { canApprove, canHold, canDecline };
    }

    function buildApproveBody(request, inModal = false) {
        if (request?.type === 'payment_upload') {
            const amount = parsePaymentAmount(request.message);
            if (!amount) {
                setError(adminText.parsePaymentApproveError);
                if (inModal) setModalError(adminText.parsePaymentApproveError);
                return null;
            }
            return { amount, method: 'cash', date: new Date().toISOString().split('T')[0] };
        }

        if (request?.type === 'account_creation') {
            return { password: generateTempPassword() };
        }

        return {};
    }

    async function handleApproveFromModal() {
        const request = requestDecisionModal.request;
        if (!request) return;

        setModalError('');
        setModalMessage('');
        const body = buildApproveBody(request, true);
        if (body === null) return;

        setRequestDecisionModal((prev) => ({ ...prev, approving: true }));
        try {
            await handleRequestAction(request.id, 'approved', body);
            closeRequestDecision();
        } finally {
            setRequestDecisionModal((prev) => ({ ...prev, approving: false }));
        }
    }

    async function handleDeclineFromModal() {
        const request = requestDecisionModal.request;
        if (!request) return;

        setModalError('');
        setModalMessage('');
        setRequestDecisionModal((prev) => ({ ...prev, declining: true }));
        try {
            await handleRequestAction(request.id, 'declined');
            closeRequestDecision();
        } finally {
            setRequestDecisionModal((prev) => ({ ...prev, declining: false }));
        }
    }

    async function handleHoldFromModal() {
        const request = requestDecisionModal.request;
        if (!request) return;

        setModalError('');
        setModalMessage('');
        setRequestDecisionModal((prev) => ({ ...prev, holding: true }));
        try {
            await handleRequestAction(request.id, 'on_hold');
            closeRequestDecision();
        } finally {
            setRequestDecisionModal((prev) => ({ ...prev, holding: false }));
        }
    }

    function getRequestAttachmentUrl(request) {
        const firstAttachment = request?.attachments?.[0];
        if (!firstAttachment) return '';
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        return `${base}/api/requests/${request.id}/attachments/${firstAttachment.id}`;
    }

    async function handleUpdateSelectedDonor(event) {
        event.preventDefault();
        if (!selectedDonorId) {
            setError(adminText.selectDonorFirst);
            setModalError(adminText.selectDonorFirst);
            return;
        }

        setSelectedDonorSaving(true);
        setError('');
        setMessage('');
        setModalError('');
        setModalMessage('');

        try {
            const updatePayload = {
                name: selectedDonorForm.name.trim(),
                email: selectedDonorForm.email.trim().toLowerCase(),
                accountCreated: Boolean(selectedDonorForm.accountCreated),
            };
            const nextPassword = selectedDonorPassword.trim();
            const hasProfileChanges = Boolean(updatePayload.name) && Boolean(updatePayload.email);
            const hasPasswordChange = nextPassword.length > 0;
            const isActivatingAccount = selectedDonor?.accountCreated === false && updatePayload.accountCreated === true;

            if (hasPasswordChange && nextPassword.length < 8) {
                throw new Error(adminText.passwordMinEight);
            }
            if (hasPasswordChange && nextPassword !== selectedDonorPasswordConfirm.trim()) {
                throw new Error(adminText.passwordsDoNotMatch);
            }
            if (isActivatingAccount && !hasPasswordChange) {
                throw new Error(adminText.setPasswordWhenActivating);
            }

            let updated = selectedDonor;
            if (hasProfileChanges) {
                updated = await updateDonor(selectedDonorId, updatePayload);
                setSelectedDonor((prev) => prev ? { ...prev, ...updated } : updated);
                setDonors((prev) => prev.map((donor) => (
                    donor.id === selectedDonorId ? { ...donor, ...updated } : donor
                )));
            }

            if (hasPasswordChange) {
                await resetDonorPassword(selectedDonorId, { newPassword: nextPassword });
                setSelectedDonorPassword('');
                setSelectedDonorPasswordConfirm('');
            }

            if (hasProfileChanges && hasPasswordChange) {
                setModalMessage(adminText.donorProfilePasswordUpdated);
                setMessage(adminText.donorProfilePasswordUpdated);
            } else if (hasPasswordChange) {
                setModalMessage(adminText.donorPasswordUpdated);
                setMessage(adminText.donorPasswordUpdated);
            } else {
                setModalMessage(adminText.donorProfileUpdated);
                setMessage(adminText.donorProfileUpdated);
            }
        } catch (err) {
            setModalError(err?.message || adminText.unableUpdateDonor);
            setError(err?.message || adminText.unableUpdateDonor);
        } finally {
            setSelectedDonorSaving(false);
        }
    }

    async function handleLogout() {
        stopTokenRefreshManager();
        await logout();
        router.replace('/login');
    }

    function closeProfileModal() {
        setIsProfileModalOpen(false);
        setModalError('');
        setModalMessage('');
        setSelectedDonorPassword('');
        setSelectedDonorPasswordConfirm('');
    }

    function closeEngagementModal() {
        setIsEngagementModalOpen(false);
        setModalError('');
        setModalMessage('');
        setSelectedDonorEngagementForm({ totalPledge: '' });
    }

    function closePaymentsModal() {
        setIsPaymentsModalOpen(false);
        setModalError('');
        setModalMessage('');
    }

    async function loadSelectedDonorData(donorId) {
        setSelectedDonorId(donorId);
        setSelectedDonorLoading(true);
        setError('');
        setModalError('');
        setModalMessage('');
        try {
            const [donor, payments] = await Promise.all([
                getDonor(donorId),
                getDonorPayments(donorId),
            ]);
            setSelectedDonor(donor);
            setDonorPayments(payments || []);
            setSelectedDonorForm({
                name: donor.name || '',
                email: donor.email || '',
                accountCreated: donor.accountCreated !== false,
            });
            setSelectedDonorPassword('');
            setSelectedDonorPasswordConfirm('');
            setSelectedDonorEngagementForm({ totalPledge: String(donor.engagement?.totalPledge || '') });
            return { donor, payments };
        } catch (err) {
            setSelectedDonor(null);
            setDonorPayments([]);
            setModalError(err?.message || adminText.unableLoadDonorDetails);
            setError(err?.message || adminText.unableLoadDonorDetails);
            return null;
        } finally {
            setSelectedDonorLoading(false);
        }
    }

    async function openProfileModal(donorId) {
        setIsEngagementModalOpen(false);
        setIsPaymentsModalOpen(false);
        setIsProfileModalOpen(true);
        await loadSelectedDonorData(donorId);
    }

    async function openEngagementModal(donorId) {
        setIsProfileModalOpen(false);
        setIsPaymentsModalOpen(false);
        setIsEngagementModalOpen(true);
        await loadSelectedDonorData(donorId);
    }

    async function openPaymentsModal(donorId) {
        setIsProfileModalOpen(false);
        setIsEngagementModalOpen(false);
        setIsPaymentsModalOpen(true);
        await loadSelectedDonorData(donorId);
    }

    async function reloadSelectedDonorPayments() {
        if (!selectedDonorId) return;
        const [donor, payments] = await Promise.all([
            getDonor(selectedDonorId),
            getDonorPayments(selectedDonorId),
        ]);
        setSelectedDonor(donor);
        setDonorPayments(payments || []);
    }

    async function handleAddPayment(event) {
        event.preventDefault();
        if (!selectedDonorId) return;

        const amountInput = document.getElementById('payment-amount');
        const methodSelect = document.getElementById('payment-method');
        const dateInput = document.getElementById('payment-date');
        const noteInput = document.getElementById('payment-note');

        if (!amountInput?.value || !methodSelect?.value || !dateInput?.value) {
            setError(adminText.amountMethodDateRequired);
            setModalError(adminText.amountMethodDateRequired);
            return;
        }

        setSelectedDonorSaving(true);
        setError('');
        setMessage('');
        setModalError('');
        setModalMessage('');

        try {
            await addPayment(selectedDonorId, {
                amount: Number(amountInput.value),
                method: methodSelect.value,
                date: dateInput.value,
                note: noteInput?.value || '',
            });

            await reloadSelectedDonorPayments();

            // Reset form
            amountInput.value = '';
            methodSelect.value = '';
            dateInput.value = '';
            noteInput.value = '';

            setModalMessage(adminText.paymentRecordedSuccessfully);
            setMessage(adminText.paymentRecordedSuccessfully);

            // Reload all data with error handling
            try {
                await loadAllData();
            } catch (err) {
                console.error('Error reloading dashboard data:', err);
                // Don't throw - allow UI to remain responsive
            }
        } catch (err) {
            setModalError(err?.message || adminText.unableRecordPayment);
            setError(err?.message || adminText.unableRecordPayment);
        } finally {
            setSelectedDonorSaving(false);
        }
    }

    async function handleUpdatePayment(paymentId, payload) {
        if (!selectedDonorId) return;

        setSelectedDonorSaving(true);
        setError('');
        setMessage('');
        setModalError('');
        setModalMessage('');

        try {
            await updateDonorPayment(selectedDonorId, paymentId, payload);
            await reloadSelectedDonorPayments();
            setModalMessage(adminText.paymentUpdatedSuccessfully);
            setMessage(adminText.paymentUpdatedSuccessfully);
            await loadAllData();
        } catch (err) {
            const isMissingRoute = err?.status === 404 && String(err?.message || '').toLowerCase().includes('route put');
            const modalErr =
                isMissingRoute
                    ? adminText.paymentUpdateRouteMissing
                    : (err?.message || adminText.unableUpdatePayment);
            setModalError(modalErr);
            setError(
                isMissingRoute
                    ? adminText.paymentUpdateRouteMissing
                    : (err?.message || adminText.unableUpdatePayment)
            );
            throw err;
        } finally {
            setSelectedDonorSaving(false);
        }
    }

    async function handleDeletePayment(paymentId) {
        if (!selectedDonorId) return;
        if (typeof window !== 'undefined' && !window.confirm(adminText.deletePaymentRecordConfirm)) {
            return;
        }

        setSelectedDonorSaving(true);
        setError('');
        setMessage('');
        setModalError('');
        setModalMessage('');

        try {
            await deleteDonorPayment(selectedDonorId, paymentId);
            await reloadSelectedDonorPayments();
            setModalMessage(adminText.paymentRemovedSuccessfully);
            setMessage(adminText.paymentRemovedSuccessfully);
            await loadAllData();
        } catch (err) {
            const isMissingRoute = err?.status === 404 && String(err?.message || '').toLowerCase().includes('route delete');
            const modalErr =
                isMissingRoute
                    ? adminText.paymentDeleteRouteMissing
                    : (err?.message || adminText.unableRemovePayment);
            setModalError(modalErr);
            setError(
                isMissingRoute
                    ? adminText.paymentDeleteRouteMissing
                    : (err?.message || adminText.unableRemovePayment)
            );
            throw err;
        } finally {
            setSelectedDonorSaving(false);
        }
    }

    async function handleAddNewDonor(event) {
        event.preventDefault();
        const creatingActiveAccount = Boolean(newDonorForm.accountCreated);
        const hasManualPassword = Boolean(newDonorForm.password.trim() || newDonorForm.passwordConfirm.trim());

        if (hasManualPassword && newDonorForm.password.length < 8) {
            setError(adminText.passwordMinEight);
            setModalError(adminText.passwordMinEight);
            return;
        }

        if (hasManualPassword && newDonorForm.password !== newDonorForm.passwordConfirm) {
            setError(adminText.passwordsDoNotMatch);
            setModalError(adminText.passwordsDoNotMatch);
            return;
        }

        setNewDonorSaving(true);
        setError('');
        setMessage('');
        setModalError('');
        setModalMessage('');

        try {
            await createDonor({
                name: newDonorForm.name.trim(),
                email: newDonorForm.email.trim().toLowerCase(),
                accountCreated: creatingActiveAccount,
                ...(newDonorForm.password.trim() && { password: newDonorForm.password }),
                ...(newDonorForm.pledgeAmount && { pledgeAmount: Number(newDonorForm.pledgeAmount) }),
            });
            setNewDonorForm({ name: '', email: '', password: '', passwordConfirm: '', pledgeAmount: '', accountCreated: true });
            setIsAddDonorModalOpen(false);
            await loadAllData();
            setMessage(
                creatingActiveAccount
                    ? adminText.donorAccountCreatedWelcome
                    : adminText.placeholderDonorCreated
            );
        } catch (err) {
            setModalError(err?.message || adminText.unableCreateDonor);
            setError(err?.message || adminText.unableCreateDonor);
        } finally {
            setNewDonorSaving(false);
        }
    }

    async function handleUpdateEngagement() {
        if (!selectedDonorId) return;
        const pledge = Number(selectedDonorEngagementForm.totalPledge);
        if (!pledge || pledge <= 0) {
            setError(adminText.validPledgeGreaterThanZero);
            setModalError(adminText.validPledgeGreaterThanZero);
            return;
        }

        setSelectedDonorSaving(true);
        setError('');
        setMessage('');
        setModalError('');
        setModalMessage('');

        try {
            await setDonorEngagement(selectedDonorId, { totalPledge: pledge });
            await reloadSelectedDonorPayments();
            setSelectedDonorEngagementForm({ totalPledge: String(pledge) });
            setModalMessage(adminText.engagementUpdatedSuccessfully);
            setMessage(adminText.engagementUpdatedSuccessfully);
        } catch (err) {
            setModalError(err?.message || adminText.unableUpdateEngagement);
            setError(err?.message || adminText.unableUpdateEngagement);
        } finally {
            setSelectedDonorSaving(false);
        }
    }

    async function handleImportCsv(event) {
        event.preventDefault();
        setError('');
        setCsvImportMessage('');

        if (!csvPreviewRows.length) {
            setError(adminText.chooseCsvFirst);
            return;
        }

        if (!csvSelectedRows.length) {
            setError(adminText.selectAtLeastOneCsvRow || 'Select at least one row to import.');
            return;
        }

        const missingRequiredColumns = CSV_IMPORT_FIELDS
            .filter(({ required }) => required)
            .filter(({ key }) => !csvColumnMapping[key])
            .map(({ key }) => key);

        if (missingRequiredColumns.length) {
            setError(adminText.mapRequiredColumns || 'Map all required columns before importing.');
            return;
        }

        setCsvImportLoading(true);
        setCsvUploadProgress(0);
        try {
            const importFile = buildCsvFileFromSelection(csvSelectedRows, csvColumnMapping);
            const summary = await importDonationsCsv(importFile, {
                onProgress: (pct) => setCsvUploadProgress(pct),
            });
            setCsvImportSummary(summary);
            setCsvImportMessage(adminText.csvImportCompleted(summary.importedPayments, summary.createdDonors, summary.failedRows));
            await loadAllData();
        } catch (err) {
            setError(err?.message || adminText.csvImportFailed);
        } finally {
            setCsvImportLoading(false);
            setCsvUploadProgress(null);
        }
    }

    async function processCsvFile(file) {
        setCsvFile(file);
        setCsvImportSummary(null);
        setCsvImportMessage('');
        setError('');
        setMessage('');

        if (!file) {
            setCsvPreviewColumns([]);
            setCsvPreviewRows([]);
            setCsvSelectedRowIds([]);
            return;
        }

        try {
            const text = await file.text();
            const [headerRow = [], ...dataRows] = parseCsvText(text);
            const normalizedHeaders = headerRow.map((header, index) => {
                const trimmed = String(header || '').trim();
                return trimmed || `Column ${index + 1}`;
            });
            CSV_PROTECTED_COLUMNS.forEach((requiredColumn) => {
                if (!normalizedHeaders.some((header) => header.trim().toLowerCase() === requiredColumn)) {
                    normalizedHeaders.push(requiredColumn);
                }
            });
            const previewRows = dataRows.map((cells, rowIndex) => ({
                id: `${rowIndex}-${Date.now()}`,
                values: normalizedHeaders.reduce((acc, header, headerIndex) => {
                    acc[header] = cells[headerIndex] || '';
                    return acc;
                }, {}),
            }));

            const nextMapping = CSV_IMPORT_FIELDS.reduce((acc, field) => {
                const matchedHeader = normalizedHeaders.find((header) => header.trim().toLowerCase() === field.key);
                acc[field.key] = matchedHeader || '';
                return acc;
            }, {});

            setCsvPreviewColumns(normalizedHeaders);
            setCsvPreviewRows(previewRows);
            setCsvSelectedRowIds(previewRows.map((row) => row.id));
            setCsvColumnMapping(nextMapping);
        } catch (err) {
            setCsvPreviewColumns([]);
            setCsvPreviewRows([]);
            setCsvSelectedRowIds([]);
            setError(err?.message || adminText.unableReadCsvPreview || 'Unable to read CSV preview.');
        }
    }

    async function handleCsvFileChange(event) {
        const file = event.target.files?.[0] || null;
        await processCsvFile(file);
    }

    async function handleCsvDrop(event) {
        event.preventDefault();
        setIsCsvDragActive(false);
        if (csvImportLoading) return;
        const file = event.dataTransfer?.files?.[0] || null;
        await processCsvFile(file);
    }

    function handleCsvCellChange(rowId, column, value) {
        setCsvPreviewRows((rows) => rows.map((row) => (
            row.id === rowId
                ? { ...row, values: { ...row.values, [column]: value } }
                : row
        )));
    }

    function handleCsvRowSelection(rowId) {
        setCsvSelectedRowIds((rowIds) => (
            rowIds.includes(rowId)
                ? rowIds.filter((id) => id !== rowId)
                : [...rowIds, rowId]
        ));
    }

    function handleCsvSelectAll(checked) {
        setCsvSelectedRowIds(checked ? csvPreviewRows.map((row) => row.id) : []);
    }

    const ensureExportPaymentsLoaded = useCallback(async () => {
        const donorIdsToLoad = donors
            .map((donor) => donor.id)
            .filter((donorId) => donorId && !exportPaymentsByDonor[donorId]);

        if (!donorIdsToLoad.length) return exportPaymentsByDonor;

        const paymentEntries = await Promise.all(
            donorIdsToLoad.map(async (donorId) => [donorId, await getDonorPayments(donorId)]),
        );

        const nextMap = {
            ...exportPaymentsByDonor,
            ...Object.fromEntries(paymentEntries.map(([donorId, payments]) => [donorId, payments || []])),
        };

        setExportPaymentsByDonor((current) => ({
            ...current,
            ...Object.fromEntries(paymentEntries.map(([donorId, payments]) => [donorId, payments || []])),
        }));

        return nextMap;
    }, [donors, exportPaymentsByDonor]);

    useEffect(() => {
        if (activeTab !== 'exports') return;
        if (exportType !== 'payments' && exportType !== 'donorsWithPayments') return;

        let alive = true;
        (async () => {
            try {
                await ensureExportPaymentsLoaded();
            } catch (err) {
                if (alive) {
                    setError(err?.message || adminText.unableExportData || 'Unable to export data.');
                }
            }
        })();

        return () => {
            alive = false;
        };
    }, [activeTab, exportType, adminText.unableExportData, ensureExportPaymentsLoaded]);

    function handleAddCsvColumn() {
        let nextColumnName = `${adminText.newColumnLabel || 'New Column'} ${csvPreviewColumns.length + 1}`;
        let suffix = csvPreviewColumns.length + 1;

        while (csvPreviewColumns.includes(nextColumnName)) {
            suffix += 1;
            nextColumnName = `${adminText.newColumnLabel || 'New Column'} ${suffix}`;
        }

        setCsvPreviewColumns((columns) => [...columns, nextColumnName]);
        setCsvPreviewRows((rows) => rows.map((row) => ({
            ...row,
            values: {
                ...row.values,
                [nextColumnName]: '',
            },
        })));
    }

    function handleRemoveCsvColumn(columnName) {
        if (isProtectedCsvColumn(columnName)) return;

        setCsvPreviewColumns((columns) => columns.filter((column) => column !== columnName));
        setCsvPreviewRows((rows) => rows.map((row) => {
            const nextValues = { ...row.values };
            delete nextValues[columnName];
            return { ...row, values: nextValues };
        }));
        setCsvColumnMapping((mapping) => Object.fromEntries(
            Object.entries(mapping).map(([key, value]) => [key, value === columnName ? '' : value])
        ));
    }

    function getMappedFieldForColumn(columnName) {
        const entry = Object.entries(csvColumnMapping).find(([, value]) => value === columnName);
        return entry?.[0] || '';
    }

    function handleCsvColumnFieldMapping(columnName, fieldKey) {
        setCsvColumnMapping((mapping) => {
            const nextMapping = { ...mapping };

            Object.keys(nextMapping).forEach((key) => {
                if (nextMapping[key] === columnName) {
                    nextMapping[key] = '';
                }
            });

            if (fieldKey) {
                nextMapping[fieldKey] = columnName;
            }

            return nextMapping;
        });
    }

    async function handleExportDownload() {
        setError('');
        setExportMessage('');
        setExportLoading(true);

        try {
            let rowsSource = exportBaseRows;
            if (exportType === 'payments' || exportType === 'donorsWithPayments') {
                const paymentsMap = await ensureExportPaymentsLoaded();
                rowsSource = buildPaymentExportRows(donors, paymentsMap);
            }

            const rowsToExport = rowsSource.filter((row) => {
                const query = exportFilters.query.trim().toLowerCase();
                const minAmount = exportFilters.minAmount ? Number(exportFilters.minAmount) : null;
                const maxAmount = exportFilters.maxAmount ? Number(exportFilters.maxAmount) : null;
                const searchableValues = [row.name, row.email, row.donorName, row.donorEmail, row.note, row.method]
                    .filter(Boolean)
                    .map((value) => String(value).toLowerCase());
                if (query && !searchableValues.some((value) => value.includes(query))) return false;
                if (exportFilters.accountStatus && row.accountStatus !== exportFilters.accountStatus) return false;
                if (exportFilters.method && row.method !== exportFilters.method) return false;
                if (exportFilters.hasEngagement) {
                    const hasEngagement = Number(row.engagementAmount || 0) > 0;
                    if (exportFilters.hasEngagement === 'yes' && !hasEngagement) return false;
                    if (exportFilters.hasEngagement === 'no' && hasEngagement) return false;
                }
                const rowAmount = row.amount ?? row.paidAmount ?? row.engagementAmount ?? null;
                if (minAmount !== null && !(Number(rowAmount || 0) >= minAmount)) return false;
                if (maxAmount !== null && !(Number(rowAmount || 0) <= maxAmount)) return false;
                const rowDate = row.date || row.createdAt || '';
                if (exportFilters.dateFrom && (!rowDate || rowDate < exportFilters.dateFrom)) return false;
                if (exportFilters.dateTo && (!rowDate || rowDate > exportFilters.dateTo)) return false;
                return true;
            }).map((row) => Object.fromEntries(
                exportSelectedColumns.map((columnKey) => [columnKey, row[columnKey] ?? ''])
            ));

            if (!rowsToExport.length) {
                throw new Error(adminText.noExportRows || 'No rows match the current export filters.');
            }

            const selectedDefinitions = EXPORT_DATASETS[exportType].columns.filter(({ key }) => exportSelectedColumns.includes(key));
            const csvRows = [
                serializeCsvRow(selectedDefinitions.map(({ labelKey }) => adminText[labelKey] || labelKey)),
                ...rowsToExport.map((row) => serializeCsvRow(selectedDefinitions.map(({ key }) => row[key]))),
            ];
            downloadCsvContent(`${exportType}-export.csv`, csvRows.join('\n'));
            setExportMessage(adminText.exportReadyMessage || 'Export downloaded successfully.');
        } catch (err) {
            setError(err?.message || adminText.unableExportData || 'Unable to export data.');
        } finally {
            setExportLoading(false);
        }
    }

    if (!appReady && shouldShowPreloader && preloaderResolved) {
        return (
            <div className="mosque-donation admin-preloader-shell" data-theme="dark">
                <SitePreloader title={t.centerName || DEFAULT_TRANSLATION.centerName} subtitle={adminText.loadingAdminDashboard} />
            </div>
        );
    }

    return (
        <div dir={isRTL ? 'rtl' : 'ltr'} className="mosque-donation" data-theme={themeMode} suppressHydrationWarning>
            <Header
                language={language}
                setLanguage={setLanguage}
                t={t}
                theme={theme}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                showLanguageMenu={showLanguageMenu}
                setShowLanguageMenu={setShowLanguageMenu}
                languageDropdownRef={languageDropdownRef}
                isLoginPage={false}
                showHeaderCenter={false}
            />
            <main className="admin-shell">
                {loading ? (
                    <div className="admin-loading-overlay">
                        <div className="admin-loading-content">
                            <div className="admin-spinner"></div>
                            <div className="admin-loading-title">{adminText.loadingDashboard}</div>
                        </div>
                    </div>
                ) : null}
                <>
                    {!hasOpenModal && error ? <div className="admin-alert error">{error}</div> : null}
                    {!hasOpenModal && message ? <div className="admin-alert success">{message}</div> : null}
                    {isAddDonorModalOpen ? (
                        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label={adminText.addNewDonorTitle}>
                            <div className="admin-modal admin-modal--sm">
                                <div className="admin-modal-header">
                                    <div>
                                        <div className="admin-section-title admin-section-title--lg admin-title-with-icon"><AdminPageIcon kind="add" /> {adminText.addNewDonorTitle}</div>
                                        <div className="admin-muted">
                                            {adminText.addNewDonorDescription}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="admin-button secondary"
                                        onClick={() => {
                                            setIsAddDonorModalOpen(false);
                                            setNewDonorForm({ name: '', email: '', password: '', passwordConfirm: '', pledgeAmount: '', accountCreated: true });
                                        }}
                                    >
                                        ✕ {adminText.close}
                                    </button>
                                </div>
                                {modalError ? <div className="admin-alert error">{modalError}</div> : null}
                                {modalMessage ? <div className="admin-alert success">{modalMessage}</div> : null}
                                <form className="admin-form" onSubmit={handleAddNewDonor}>
                                    <div>
                                        <label className="admin-label">{adminText.fullNameLabel} *</label>
                                        <input
                                            className="admin-input"
                                            placeholder={adminText.donorFullNamePlaceholder}
                                            value={newDonorForm.name}
                                            onChange={(e) => setNewDonorForm((p) => ({ ...p, name: e.target.value }))}
                                            required
                                            disabled={newDonorSaving}
                                            minLength={2}
                                        />
                                    </div>
                                    <div>
                                        <label className="admin-label">{adminText.emailAddressLabel} *</label>
                                        <input
                                            className="admin-input"
                                            type="email"
                                            placeholder={adminText.donorEmailPlaceholder}
                                            value={newDonorForm.email}
                                            onChange={(e) => setNewDonorForm((p) => ({ ...p, email: e.target.value }))}
                                            required
                                            disabled={newDonorSaving}
                                        />
                                    </div>
                                    <div>
                                        <label className="admin-inline admin-inline--wrap">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(newDonorForm.accountCreated)}
                                                onChange={(e) => setNewDonorForm((p) => ({ ...p, accountCreated: e.target.checked }))}
                                                disabled={newDonorSaving}
                                            />
                                            {adminText.createActiveAccount}
                                        </label>
                                    </div>
                                    <div>
                                        <label className="admin-label">🔒 {adminText.passwordMinChars}</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                className="admin-input"
                                                type={showNewDonorPassword ? 'text' : 'password'}
                                                placeholder={newDonorForm.accountCreated ? adminText.donorPasswordPlaceholder : adminText.donorPasswordPlaceholderInactive}
                                                value={newDonorForm.password}
                                                onChange={(e) => setNewDonorForm((p) => ({ ...p, password: e.target.value }))}
                                                disabled={newDonorSaving}
                                                minLength={8}
                                                style={{ paddingRight: '42px' }}
                                            />
                                            <button type="button" onClick={() => setShowNewDonorPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label={showNewDonorPassword ? 'Hide password' : 'Show password'}>
                                                {showNewDonorPassword ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="admin-label">🔒 {adminText.confirmPasswordLabel}</label>
                                        <div style={{ position: 'relative' }}>
                                            <input
                                                className="admin-input"
                                                type={showNewDonorConfirmPassword ? 'text' : 'password'}
                                                placeholder={newDonorForm.accountCreated ? adminText.donorConfirmPasswordPlaceholder : adminText.donorPasswordPlaceholderInactive}
                                                value={newDonorForm.passwordConfirm}
                                                onChange={(e) => setNewDonorForm((p) => ({ ...p, passwordConfirm: e.target.value }))}
                                                disabled={newDonorSaving}
                                                minLength={8}
                                                style={{ paddingRight: '42px' }}
                                            />
                                            <button type="button" onClick={() => setShowNewDonorConfirmPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label={showNewDonorConfirmPassword ? 'Hide password' : 'Show password'}>
                                                {showNewDonorConfirmPassword ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="admin-label">{adminText.pledgeAmountOptional}</label>
                                        <input
                                            className="admin-input"
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            placeholder={adminText.donorPledgePlaceholder}
                                            value={newDonorForm.pledgeAmount}
                                            onChange={(e) => setNewDonorForm((p) => ({ ...p, pledgeAmount: e.target.value }))}
                                            disabled={newDonorSaving}
                                        />
                                    </div>
                                    <button type="submit" className="admin-button" disabled={newDonorSaving}>
                                        {newDonorSaving
                                            ? adminText.creatingDonor
                                            : (newDonorForm.accountCreated ? adminText.createDonorWelcome : adminText.createPlaceholderDonor)}
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : null}

                    {isCreateAdminModalOpen ? (
                        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label={adminText.createAdminTitle}>
                            <div className="admin-modal admin-modal--sm">
                                <div className="admin-modal-header">
                                    <div>
                                        <div className="admin-section-title admin-title-with-icon"><AdminPageIcon kind="add" /> {adminText.createAdminTitle}</div>
                                    </div>
                                    <button
                                        type="button"
                                        className="admin-button secondary"
                                        onClick={() => {
                                            setIsCreateAdminModalOpen(false);
                                            setModalError('');
                                            setModalMessage('');
                                        }}
                                    >
                                        ✕ {adminText.close}
                                    </button>
                                </div>

                                {modalError ? <div className="admin-alert error">{modalError}</div> : null}
                                {modalMessage ? <div className="admin-alert success">{modalMessage}</div> : null}

                                <form className="admin-form" onSubmit={handleCreateAdmin}>
                                    <input
                                        className="admin-input"
                                        placeholder={adminText.fullNamePlaceholder}
                                        value={newAdmin.name}
                                        onChange={(e) => setNewAdmin((prev) => ({ ...prev, name: e.target.value }))}
                                    />
                                    <input
                                        className="admin-input"
                                        type="email"
                                        placeholder={adminText.emailPlaceholder}
                                        value={newAdmin.email}
                                        onChange={(e) => setNewAdmin((prev) => ({ ...prev, email: e.target.value }))}
                                    />
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className="admin-input"
                                            type={showNewAdminPassword ? 'text' : 'password'}
                                            placeholder={adminText.passwordPlaceholder}
                                            value={newAdmin.password}
                                            onChange={(e) => setNewAdmin((prev) => ({ ...prev, password: e.target.value }))}
                                            style={{ paddingRight: '42px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewAdminPassword((v) => !v)}
                                            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 0 }}
                                            aria-label={showNewAdminPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showNewAdminPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                            )}
                                        </button>
                                    </div>
                                    <button type="submit" className="admin-button" disabled={creatingAdmin}>
                                        {creatingAdmin ? (adminText.creating || 'Creating...') : adminText.createAdminButton}
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : null}

                    {isCurrentAdminProfileModalOpen ? (
                        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label={adminText.adminProfileTitle}>
                            <div className="admin-modal admin-modal--sm">
                                <div className="admin-modal-header">
                                    <div>
                                        <div className="admin-section-title admin-title-with-icon"><AdminPageIcon kind="accounts" /> {adminText.adminProfileTitle}</div>
                                        <div className="admin-muted">
                                            {currentAdminTarget?.name || currentAdminTarget?.email || ''}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="admin-button secondary"
                                        onClick={() => {
                                            setIsCurrentAdminProfileModalOpen(false);
                                            setCurrentAdminTarget(null);
                                            setModalError('');
                                            setModalMessage('');
                                        }}
                                    >
                                        ✕ {adminText.close}
                                    </button>
                                </div>

                                {modalError ? <div className="admin-alert error">{modalError}</div> : null}
                                {modalMessage ? <div className="admin-alert success">{modalMessage}</div> : null}

                                <form className="admin-form" onSubmit={handleUpdateCurrentAdmin}>
                                    <div>
                                        <label className="admin-label">{adminText.fullNameLabel}</label>
                                        <input
                                            className="admin-input"
                                            type="text"
                                            value={currentAdminForm.name}
                                            onChange={(e) => setCurrentAdminForm((prev) => ({ ...prev, name: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="admin-label">{adminText.emailAddressLabel}</label>
                                        <input
                                            className="admin-input"
                                            type="email"
                                            value={currentAdminForm.email}
                                            onChange={(e) => setCurrentAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                                        />
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <label className="admin-label">{adminText.passwordPlaceholder}</label>
                                        <input
                                            className="admin-input"
                                            type={showCurrentAdminPassword ? 'text' : 'password'}
                                            value={currentAdminForm.password}
                                            onChange={(e) => setCurrentAdminForm((prev) => ({ ...prev, password: e.target.value }))}
                                            placeholder={adminText.passwordPlaceholder}
                                            style={{ paddingRight: '42px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentAdminPassword((v) => !v)}
                                            style={{ position: 'absolute', right: '12px', top: '70%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 0 }}
                                            aria-label={showCurrentAdminPassword ? 'Hide password' : 'Show password'}
                                        >
                                            {showCurrentAdminPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                            )}
                                        </button>
                                    </div>
                                    <button type="submit" className="admin-button" disabled={currentAdminSaving}>
                                        {currentAdminSaving ? (adminText.saving || 'Saving...') : (adminText.saveChanges || 'Save Changes')}
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : null}
                    {isProfileModalOpen ? (
                        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label={adminText.editDonorProfileLabel}>
                            <div className="admin-modal admin-modal--profile">
                                <div className="admin-modal-header">
                                    <div>
                                        <div className="admin-section-title admin-section-title--lg">
                                            <span className="admin-button__content"><AdminPageIcon kind="edit" /> {selectedDonor ? selectedDonor.name : adminText.editProfileTitle}</span>
                                        </div>
                                        <div className="admin-muted">
                                            {adminText.updateDonorProfileDescription}
                                        </div>
                                    </div>
                                    <button type="button" className="admin-button secondary" onClick={closeProfileModal}>
                                        ✕ {adminText.close}
                                    </button>
                                </div>
                                {modalError ? <div className="admin-alert error">{modalError}</div> : null}
                                {modalMessage ? <div className="admin-alert success">{modalMessage}</div> : null}
                                <div>
                                    {selectedDonorLoading ? <div>{adminText.loadingDonorDetails}</div> : null}
                                    {!selectedDonorLoading && !selectedDonor ? (
                                        <div className="admin-muted">{adminText.unableLoadThisDonor}</div>
                                    ) : null}
                                    {!selectedDonorLoading && selectedDonor ? (
                                        <div className="admin-stack admin-stack--lg">
                                            <form className="admin-form" onSubmit={handleUpdateSelectedDonor}>
                                                <div className="admin-section-title admin-section-title--sm admin-title-with-icon"><AdminPageIcon kind="accounts" /> {adminText.profileTitle}</div>
                                                <div>
                                                    <label className="admin-label">{adminText.fullNameLabel}</label>
                                                    <input
                                                        className="admin-input"
                                                        placeholder={adminText.donorFullNamePlaceholder}
                                                        value={selectedDonorForm.name}
                                                        onChange={(e) => setSelectedDonorForm((prev) => ({ ...prev, name: e.target.value }))}
                                                        disabled={selectedDonorSaving}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="admin-label">{adminText.emailLabel}</label>
                                                    <input
                                                        className="admin-input"
                                                        type="email"
                                                        placeholder={adminText.emailAddressLabel}
                                                        value={selectedDonorForm.email}
                                                        onChange={(e) => setSelectedDonorForm((prev) => ({ ...prev, email: e.target.value }))}
                                                        disabled={selectedDonorSaving}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="admin-inline admin-inline--wrap">
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(selectedDonorForm.accountCreated)}
                                                            onChange={(e) => setSelectedDonorForm((prev) => ({ ...prev, accountCreated: e.target.checked }))}
                                                            disabled={selectedDonorSaving}
                                                        />
                                                        {adminText.activeDonorAccount}
                                                    </label>
                                                    <div className="admin-field-help">
                                                        {adminText.enablingPlaceholderHelp}
                                                    </div>
                                                </div>
                                                <div className="admin-divider-top">
                                                    <div className="admin-section-title admin-section-title--sm">🔒 {adminText.changePasswordOptional}</div>
                                                    <div className="admin-stack">
                                                        <div style={{ position: 'relative' }}>
                                                            <input
                                                                className="admin-input"
                                                                type={showSelectedDonorPassword ? 'text' : 'password'}
                                                                placeholder={`${adminText.newPassword} (min 8 chars)`}
                                                                value={selectedDonorPassword}
                                                                onChange={(e) => setSelectedDonorPassword(e.target.value)}
                                                                disabled={selectedDonorSaving}
                                                                minLength={8}
                                                                style={{ paddingRight: '42px' }}
                                                            />
                                                            <button type="button" onClick={() => setShowSelectedDonorPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label={showSelectedDonorPassword ? 'Hide password' : 'Show password'}>
                                                                {showSelectedDonorPassword ? (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                                                ) : (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                        <div style={{ position: 'relative' }}>
                                                            <input
                                                                className="admin-input"
                                                                type={showSelectedDonorConfirmPassword ? 'text' : 'password'}
                                                                placeholder={adminText.confirmNewPassword}
                                                                value={selectedDonorPasswordConfirm}
                                                                onChange={(e) => setSelectedDonorPasswordConfirm(e.target.value)}
                                                                disabled={selectedDonorSaving}
                                                                style={{ paddingRight: '42px' }}
                                                            />
                                                            <button type="button" onClick={() => setShowSelectedDonorConfirmPassword(v => !v)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', lineHeight: 0 }} aria-label={showSelectedDonorConfirmPassword ? 'Hide password' : 'Show password'}>
                                                                {showSelectedDonorConfirmPassword ? (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                                                ) : (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button type="submit" className="admin-button" disabled={selectedDonorSaving}>
                                                    {selectedDonorSaving ? `${adminText.saveChanges}...` : adminText.saveProfileChanges}
                                                </button>
                                            </form>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ) : null}
                    {isEngagementModalOpen ? (
                        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label={adminText.engagementPledgeAmount}>
                            <div className="admin-modal">
                                <div className="admin-modal-header">
                                    <div>
                                        <div className="admin-section-title admin-section-title--lg">
                                            {selectedDonor ? `${selectedDonor.name} ${adminText.engagementPledgeAmount.toLowerCase()}` : adminText.engagementPledgeAmount}
                                        </div>
                                        <div className="admin-muted">
                                            {adminText.currentPledge}: ${Number(selectedDonor?.engagement?.totalPledge || 0).toLocaleString()}
                                        </div>
                                    </div>
                                    <button type="button" className="admin-button secondary" onClick={closeEngagementModal}>{adminText.close}</button>
                                </div>
                                <div className="admin-modal-body">
                                    {selectedDonorLoading ? (
                                        <div className="admin-empty">{adminText.loading || 'Loading...'}</div>
                                    ) : selectedDonor ? (
                                        <div className="admin-card admin-card--flat">
                                            <div className="admin-stack">
                                                <div>
                                                    <label className="admin-label">{adminText.newPledgeAmount}</label>
                                                    <input
                                                        className="admin-input"
                                                        type="number"
                                                        min="1"
                                                        step="0.01"
                                                        placeholder={adminText.newPledgeAmount}
                                                        value={selectedDonorEngagementForm.totalPledge}
                                                        onChange={(e) => setSelectedDonorEngagementForm({ totalPledge: e.target.value })}
                                                        disabled={selectedDonorSaving}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    className="admin-button"
                                                    disabled={selectedDonorSaving || !selectedDonorEngagementForm.totalPledge}
                                                    onClick={handleUpdateEngagement}
                                                >
                                                    {selectedDonorSaving ? `${adminText.saveChanges}...` : adminText.updateEngagement}
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ) : null}
                    {isPaymentsModalOpen ? (
                        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label={adminText.paymentHistoryTitle}>
                            <div className="admin-modal admin-modal--lg">
                                <div className="admin-modal-header">
                                    <div>
                                        <div className="admin-section-title admin-section-title--lg">
                                            {selectedDonor ? `${selectedDonor.name} ${adminText.paymentHistoryTitle.toLowerCase()}` : adminText.paymentHistoryTitle}
                                        </div>
                                        <div className="admin-muted mt-sm">
                                            {adminText.paymentHistoryDescription}
                                        </div>
                                    </div>
                                    <button type="button" className="admin-button secondary" onClick={closePaymentsModal}>
                                        {adminText.close}
                                    </button>
                                </div>
                                {modalError ? <div className="admin-alert error">{modalError}</div> : null}
                                {modalMessage ? <div className="admin-alert success">{modalMessage}</div> : null}
                                {selectedDonorLoading ? <div>{adminText.loadingDonorPayments}</div> : null}
                                {!selectedDonorLoading && !selectedDonor ? (
                                    <div className="admin-muted">
                                        {adminText.unableLoadDonor}
                                    </div>
                                ) : null}
                                {!selectedDonorLoading && selectedDonor ? (
                                    <PaymentPanel
                                        donor={selectedDonor}
                                        payments={donorPayments}
                                        onAddPayment={handleAddPayment}
                                        onUpdatePayment={handleUpdatePayment}
                                        onDeletePayment={handleDeletePayment}
                                        loading={selectedDonorSaving}
                                        t={t}
                                    />
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                    {requestDecisionModal.open ? (
                        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label={adminText.reviewRequest}>
                            <div className="admin-modal admin-modal--md">
                                <div className="admin-modal-header">
                                    <div>
                                        <div className="admin-section-title">
                                            <span className="admin-button__content"><AdminPageIcon kind="review" /> {adminText.reviewRequest}</span>
                                        </div>
                                        <div className="admin-muted mt-sm admin-text-capitalize">
                                            {requestDecisionModal.request?.type?.replace(/_/g, ' ') || ''}
                                        </div>
                                    </div>
                                    <button type="button" className="admin-button secondary" onClick={closeRequestDecision}>
                                        ✕ {adminText.close}
                                    </button>
                                </div>
                                {modalError ? <div className="admin-alert error">{modalError}</div> : null}
                                {modalMessage ? <div className="admin-alert success">{modalMessage}</div> : null}
                                <div className="admin-muted">
                                    {requestDecisionModal.request?.name
                                        ? <div><strong>{requestDecisionModal.request.name}</strong> &middot; {requestDecisionModal.request.email}</div>
                                        : <div>{requestDecisionModal.request?.email}</div>
                                    }
                                </div>
                                <div className="admin-muted admin-muted--md">
                                    {adminText.statusLabel}: <span className="admin-text-capitalize">{requestDecisionModal.request?.status?.replace(/_/g, ' ')}</span>
                                </div>
                                {requestDecisionModal.request?.message ? (
                                    <div className="admin-surface admin-surface--message">
                                        {requestDecisionModal.request.message}
                                    </div>
                                ) : null}

                                {/* Type-specific info panels */}
                                {requestDecisionModal.request?.type === 'payment_upload' && (
                                    <div className="admin-surface admin-surface--warn">
                                        <div className="admin-field-help admin-field-help--spaced admin-field-help--strong">💵 {adminText.paymentRecordedOnApproval}</div>
                                        <div>
                                            <strong>{adminText.amount}:</strong>{' '}
                                            {parsePaymentAmount(requestDecisionModal.request?.message)
                                                ? `$${parsePaymentAmount(requestDecisionModal.request?.message).toLocaleString()}`
                                                : <span className="admin-error-text">⚠️ {adminText.parsePaymentWarning}</span>}
                                        </div>
                                        <div><strong>{adminText.method}:</strong> {adminText.methodCashStatic}</div>
                                        <div><strong>{adminText.date}:</strong> {new Date().toLocaleDateString()}</div>
                                    </div>
                                )}
                                {requestDecisionModal.request?.type === 'account_creation' && (
                                    <div className="admin-surface admin-surface--success admin-muted admin-muted--md">
                                        <strong>{adminText.approve}:</strong> {adminText.accountApprovalHelp}
                                    </div>
                                )}
                                {requestDecisionModal.request?.type === 'engagement_change' && (
                                    <div className="admin-surface admin-surface--info admin-muted admin-muted--md">
                                        <strong>{adminText.engagementChangeHelp}</strong>
                                    </div>
                                )}

                                {/* Type-aware action buttons */}
                                {(() => {
                                    const request = requestDecisionModal.request;
                                    const { canApprove, canHold, canDecline } = getRequestActionCapabilities(request || {});
                                    return (
                                        <div className="admin-actions">
                                            {request?.type === 'engagement_change' && canApprove ? (
                                                <button
                                                    type="button"
                                                    className="admin-button"
                                                    disabled={requestDecisionModal.approving || requestDecisionModal.declining || requestDecisionModal.holding}
                                                    onClick={handleApproveFromModal}
                                                >
                                                    {requestDecisionModal.approving ? 'Processing…' : adminText.receivedNotification}
                                                </button>
                                            ) : null}
                                            {request?.type !== 'engagement_change' && canApprove ? (
                                                <button
                                                    type="button"
                                                    className="admin-button"
                                                    disabled={requestDecisionModal.approving || requestDecisionModal.declining || requestDecisionModal.holding}
                                                    onClick={handleApproveFromModal}
                                                >
                                                    {requestDecisionModal.approving ? 'Approving…' : (request?.type === 'account_creation' ? adminText.approveCreateAccount : adminText.approve)}
                                                </button>
                                            ) : null}
                                            {canHold ? (
                                                <button
                                                    type="button"
                                                    className="admin-button secondary"
                                                    disabled={requestDecisionModal.approving || requestDecisionModal.declining || requestDecisionModal.holding}
                                                    onClick={handleHoldFromModal}
                                                >
                                                    {requestDecisionModal.holding ? 'Holding…' : adminText.onHold}
                                                </button>
                                            ) : null}
                                            {canDecline ? (
                                                <button
                                                    type="button"
                                                    className="admin-button danger"
                                                    disabled={requestDecisionModal.approving || requestDecisionModal.declining || requestDecisionModal.holding}
                                                    onClick={handleDeclineFromModal}
                                                >
                                                    {requestDecisionModal.declining ? 'Declining…' : adminText.decline}
                                                </button>
                                            ) : null}
                                            {!canApprove && !canHold && !canDecline ? (
                                                <div className="admin-muted admin-muted--md">
                                                    {adminText.noFurtherActions}
                                                </div>
                                            ) : null}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    ) : null}
                    <div className="admin-layout">
                        <AdminSidebar
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            isRTL={isRTL}
                            onLogout={handleLogout}
                            adminText={adminText}
                        />

                        <section className="admin-page-section">
                            {activeTab === 'overview' ? (
                                <>
                                    <div className="admin-overview-hero">
                                        <div className="admin-overview-hero__content">
                                            <div className="admin-overview-hero__kicker">{adminText.overviewHeroKicker}</div>
                                            <h1 className="admin-overview-hero__title">{adminText.overviewHeroTitle}</h1>
                                            <p className="admin-overview-hero__description">{adminText.overviewHeroDescription}</p>
                                        </div>
                                        <div className="admin-overview-hero__meta">
                                            <div className="admin-overview-hero__meta-label">{adminText.overviewTitle}</div>
                                            <div className="admin-overview-hero__meta-value">{adminText.overviewSubtitle}</div>
                                        </div>
                                    </div>

                                    <div className="admin-grid admin-grid--4cols">
                                        <div className="admin-stat admin-stat--spotlight"><div className="admin-muted">{adminText.totalRaised}</div><div className="admin-value-lg">{formatCurrency(overviewBreakdown.totalPaid)}</div></div>
                                        <div className="admin-stat admin-stat--spotlight"><div className="admin-muted">{adminText.totalPledgedLabel}</div><div className="admin-value-lg">{formatCurrency(overviewMetrics.totalPledged)}</div></div>
                                        <div className="admin-stat admin-stat--spotlight"><div className="admin-muted">{adminText.outstandingAmountLabel}</div><div className="admin-value-lg">{formatCurrency(overviewBreakdown.outstanding)}</div></div>
                                        <div className="admin-stat admin-stat--spotlight"><div className="admin-muted">{adminText.collectionRateLabel}</div><div className="admin-value-lg">{overviewBreakdown.paymentCollectionRate}%</div></div>
                                    </div>

                                    <div className="admin-grid admin-grid--2cols">
                                        <div className="admin-card admin-analytics-card">
                                            <div className="admin-section-title">{adminText.analyticsSnapshot}</div>
                                            <div className="admin-analytics-list">
                                                <div className="admin-analytics-list__row"><span>{adminText.totalRaised}</span><strong>{formatCurrency(overviewBreakdown.totalPaid)}</strong></div>
                                                <div className="admin-analytics-list__row"><span>{adminText.totalPledgedLabel}</span><strong>{formatCurrency(overviewMetrics.totalPledged)}</strong></div>
                                                <div className="admin-analytics-list__row"><span>{adminText.outstandingAmountLabel}</span><strong>{formatCurrency(overviewBreakdown.outstanding)}</strong></div>
                                                <div className="admin-analytics-list__row"><span>{adminText.averagePledgeLabel}</span><strong>{formatCurrency(overviewMetrics.averagePledge)}</strong></div>
                                                <div className="admin-analytics-list__row"><span>{adminText.averagePaidLabel}</span><strong>{formatCurrency(overviewMetrics.averagePaid)}</strong></div>
                                            </div>
                                        </div>

                                        <div className="admin-card admin-analytics-card">
                                            <div className="admin-section-title">{adminText.paymentsOverviewTitle}</div>
                                            <div className="admin-analytics-list">
                                                <div className="admin-analytics-list__row"><span>{adminText.collectionRateLabel}</span><strong>{overviewBreakdown.paymentCollectionRate}%</strong></div>
                                                <div className="admin-analytics-list__row"><span>{adminText.collectedAmountLabel}</span><strong>{formatCurrency(overviewBreakdown.totalPaid)}</strong></div>
                                                <div className="admin-analytics-list__row"><span>{adminText.outstandingAmountLabel}</span><strong>{formatCurrency(overviewBreakdown.outstanding)}</strong></div>
                                                <div className="admin-analytics-list__row"><span>{adminText.completedEngagements}</span><strong>{overviewMetrics.completedEngagements}</strong></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="admin-grid">
                                        <div className="admin-card admin-overview-card">
                                            <div className="admin-inline admin-inline--between admin-inline--wrap mb-md">
                                                <div>
                                                    <div className="admin-section-title">{adminText.paymentsOverviewTitle}</div>
                                                    <div className="admin-muted admin-muted--md">{adminText.paymentsOverviewSubtitle}</div>
                                                </div>
                                                <span className="admin-badge admin-badge--success">{overviewBreakdown.paymentCollectionRate}%</span>
                                            </div>
                                            <div className="admin-stack admin-stack--md">
                                                <div className="admin-overview-meter">
                                                    <div className="admin-overview-meter__label">
                                                        <span>{adminText.collectedAmountLabel}</span>
                                                        <strong>{formatCurrency(overviewBreakdown.totalPaid)}</strong>
                                                    </div>
                                                    <div className="admin-chart-track">
                                                        <div className="admin-chart-fill" style={{ width: `${overviewBreakdown.collectedShare}%` }}></div>
                                                    </div>
                                                </div>
                                                <div className="admin-overview-meter">
                                                    <div className="admin-overview-meter__label">
                                                        <span>{adminText.outstandingAmountLabel}</span>
                                                        <strong>{formatCurrency(overviewBreakdown.outstanding)}</strong>
                                                    </div>
                                                    <div className="admin-chart-track">
                                                        <div className="admin-chart-fill admin-chart-fill--warning" style={{ width: `${overviewBreakdown.outstandingShare}%` }}></div>
                                                    </div>
                                                </div>
                                                <div className="admin-grid admin-grid--2cols">
                                                    <div className="admin-stat">
                                                        <div className="admin-muted">{adminText.averagePledgeLabel}</div>
                                                        <div className="admin-value-md">{formatCurrency(overviewMetrics.averagePledge)}</div>
                                                    </div>
                                                    <div className="admin-stat">
                                                        <div className="admin-muted">{adminText.averagePaidLabel}</div>
                                                        <div className="admin-value-md">{formatCurrency(overviewMetrics.averagePaid)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : null}

                            {activeTab === 'requests' ? (
                                <div className="admin-card">
                                    <div className="admin-section-title admin-title-with-icon"><AdminPageIcon kind="requests" /> {adminText.requestsTitle}</div>
                                    <div className="admin-grid admin-grid--4cols mb-md">
                                        <div className="admin-stat">
                                            <div className="admin-muted">{adminText.requestsTitle}</div>
                                            <div className="admin-value-lg">{filteredRequestStats.total}</div>
                                        </div>
                                        <div className="admin-stat">
                                            <div className="admin-muted">{adminText.openRequests}</div>
                                            <div className="admin-value-lg">{filteredRequestStats.open}</div>
                                        </div>
                                        <div className="admin-stat">
                                            <div className="admin-muted">{adminText.paymentRequests}</div>
                                            <div className="admin-value-lg">{filteredRequestStats.paymentRequests}</div>
                                        </div>
                                        <div className="admin-stat">
                                            <div className="admin-muted">{adminText.accountRequests}</div>
                                            <div className="admin-value-lg">{filteredRequestStats.accountRequests}</div>
                                        </div>
                                    </div>
                                    <div className="admin-grid admin-grid--2cols mb-md">
                                        <div className="admin-stat">
                                            <div className="admin-muted">{adminText.reviewed}</div>
                                            <div className="admin-value-md">{filteredRequestStats.reviewed}</div>
                                        </div>
                                        <div className="admin-stat">
                                            <div className="admin-muted">{adminText.reviewQueueFocus}</div>
                                            <div className="admin-value-md">{filteredRequestStats.open}</div>
                                        </div>
                                    </div>
                                    <div className="admin-search-row">
                                        <input
                                            className="admin-input admin-input--max-220"
                                            placeholder={adminText.searchRequests}
                                            value={requestFilter.query}
                                            onChange={(e) => setRequestFilter((prev) => ({ ...prev, query: e.target.value }))}
                                        />
                                        <select
                                            className="admin-input admin-input--max-180"
                                            value={requestFilter.status}
                                            onChange={(e) => setRequestFilter((prev) => ({ ...prev, status: e.target.value }))}
                                        >
                                            <option value="">{adminText.allStatuses}</option>
                                            <option value="pending">{adminText.pendingOption}</option>
                                            <option value="on_hold">{adminText.onHoldOption}</option>
                                            <option value="approved">{adminText.approvedOption}</option>
                                            <option value="declined">{adminText.declinedOption}</option>
                                        </select>
                                        <select
                                            className="admin-input admin-input--max-180"
                                            value={requestFilter.type}
                                            onChange={(e) => setRequestFilter((prev) => ({ ...prev, type: e.target.value }))}
                                        >
                                            <option value="">{adminText.allTypes}</option>
                                            <option value="account_creation">{adminText.accountCreationOption}</option>
                                            <option value="payment_upload">{adminText.paymentUploadOption}</option>
                                            <option value="engagement_change">{adminText.engagementChangeOption}</option>
                                            <option value="other">{adminText.otherOption}</option>
                                        </select>
                                    </div>
                                    <div className="admin-table-wrap">
                                        <table className="admin-table admin-table--stackable">
                                            <thead>
                                                <tr>
                                                    <th>{adminText.requester}</th>
                                                    <th>{adminText.typeLabel}</th>
                                                    <th>{adminText.statusLabel}</th>
                                                    <th>{adminText.messageLabel}</th>
                                                    <th>{adminText.attachment}</th>
                                                    <th>{adminText.dateLabel}</th>
                                                    <th>{adminText.actionsLabel}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedRequests.map((request) => {
                                                    const isProcessing = processingRequestId === request.id;
                                                    const { canApprove, canHold, canDecline } = getRequestActionCapabilities(request);
                                                    return (
                                                        <tr key={request.id}>
                                                            <td data-label={adminText.requester}>
                                                                <div className="admin-item-title">{request.name || adminText.unknown}</div>
                                                                <div className="admin-table-cell-muted mt-sm">{request.email}</div>
                                                            </td>
                                                            <td data-label={adminText.typeLabel} style={{ textTransform: 'capitalize' }}>{requestTypeLabel(request.type).replace(/_/g, ' ')}</td>
                                                            <td data-label={adminText.statusLabel}>
                                                                <span className={`admin-chip status-${request.status}`} style={{ textTransform: 'capitalize' }}>{requestStatusLabel(request.status).replace(/_/g, ' ')}</span>
                                                            </td>
                                                            <td className="admin-table-cell-muted" data-label={adminText.messageLabel}>{truncateText(request.message || adminText.noNoteProvided, 90)}</td>
                                                            <td data-label={adminText.attachment}>
                                                                {request.attachments?.length ? (
                                                                    <a href={getRequestAttachmentUrl(request)} target="_blank" rel="noreferrer" className="login-inline-link">
                                                                        {adminText.attachmentViewCount(request.attachments.length)}
                                                                    </a>
                                                                ) : (
                                                                    <span className="admin-table-cell-muted">{adminText.noFile}</span>
                                                                )}
                                                            </td>
                                                            <td className="admin-table-cell-muted" data-label={adminText.dateLabel}>{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '-'}</td>
                                                            <td data-label={adminText.actionsLabel}>
                                                                <div className="admin-table-actions">
                                                                    {canApprove ? (
                                                                        request.type === 'engagement_change' ? (
                                                                            <button
                                                                                type="button"
                                                                                className="admin-button secondary"
                                                                                disabled={isProcessing}
                                                                                onClick={() => handleRequestAction(request.id, 'approved')}
                                                                            >
                                                                                {isProcessing ? '…' : adminText.received}
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                type="button"
                                                                                className="admin-button"
                                                                                disabled={isProcessing}
                                                                                onClick={() => {
                                                                                    const body = buildApproveBody(request);
                                                                                    if (body === null) return;
                                                                                    handleRequestAction(request.id, 'approved', body);
                                                                                }}
                                                                            >
                                                                                {isProcessing ? '…' : (request.type === 'account_creation' ? adminText.approveCreateAccount : adminText.approve)}
                                                                            </button>
                                                                        )
                                                                    ) : null}
                                                                    {canHold ? (
                                                                        <button type="button" className="admin-button secondary" disabled={isProcessing} onClick={() => handleRequestAction(request.id, 'on_hold')}>
                                                                            {isProcessing ? '…' : adminText.onHold}
                                                                        </button>
                                                                    ) : null}
                                                                    {canDecline ? (
                                                                        <button type="button" className="admin-button danger" disabled={isProcessing} onClick={() => handleRequestAction(request.id, 'declined')}>
                                                                            {isProcessing ? '…' : adminText.decline}
                                                                        </button>
                                                                    ) : null}
                                                                    <button type="button" className="admin-button secondary" disabled={isProcessing} onClick={() => openRequestDecision(request)}>
                                                                        <span className="admin-button__content"><AdminPageIcon kind="review" /> {adminText.toReview}</span>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {paginatedRequests.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="admin-table-cell-muted">{adminText.noRequestsMatch}</td>
                                                    </tr>
                                                ) : null}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="admin-pagination">
                                        <div className="admin-muted">{adminText.showingItemsPerPage}</div>
                                        <div className="admin-pagination-buttons">
                                            <button type="button" className="admin-button secondary" disabled={requestsPage <= 1} onClick={() => setRequestsPage((page) => Math.max(1, page - 1))}>{adminText.previous}</button>
                                            <span>{adminText.pageLabel(requestsPage, requestsTotalPages)}</span>
                                            <button type="button" className="admin-button secondary" disabled={requestsPage >= requestsTotalPages} onClick={() => setRequestsPage((page) => Math.min(requestsTotalPages, page + 1))}>{adminText.next}</button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {activeTab === 'imports' ? (
                                <div className="admin-card">
                                    <div className="admin-inline admin-inline--between admin-inline--wrap mb-md">
                                        <div>
                                            <div className="admin-section-title admin-title-with-icon"><AdminPageIcon kind="imports" /> {adminText.importExistingDonations}</div>
                                            <div className="admin-muted">
                                                {adminText.importRequiredColumns} {adminText.importMethodValues}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="admin-button secondary"
                                            onClick={() => downloadCsvFile('donation-import-demo.csv', CSV_IMPORT_DEMO_ROWS)}
                                            disabled={csvImportLoading}
                                        >
                                            {adminText.downloadDemoImportFile || 'Download Demo CSV'}
                                        </button>
                                    </div>
                                    <form className="admin-form" onSubmit={handleImportCsv}>
                                        <div className="admin-import-toolbar">
                                            <div className="admin-import-toolbar__top">
                                                <label
                                                    className={`admin-upload-label${csvImportLoading ? ' is-disabled' : ''}${isCsvDragActive ? ' is-drag-active' : ''}`}
                                                    onDragOver={(event) => {
                                                        event.preventDefault();
                                                        if (!csvImportLoading) setIsCsvDragActive(true);
                                                    }}
                                                    onDragEnter={(event) => {
                                                        event.preventDefault();
                                                        if (!csvImportLoading) setIsCsvDragActive(true);
                                                    }}
                                                    onDragLeave={(event) => {
                                                        if (event.currentTarget.contains(event.relatedTarget)) return;
                                                        setIsCsvDragActive(false);
                                                    }}
                                                    onDrop={handleCsvDrop}
                                                >
                                                    <input
                                                        className="admin-import-file-input"
                                                        type="file"
                                                        accept=".csv,text/csv"
                                                        onChange={handleCsvFileChange}
                                                        disabled={csvImportLoading}
                                                    />
                                                    <span>
                                                        {csvFile ? `${adminText.selectedCsvFile || 'Selected file'}: ${csvFile.name}` : (adminText.chooseCsvFileLabel || 'Choose CSV file')}
                                                    </span>
                                                    <span className="admin-upload-label__hint">
                                                        {adminText.dragAndDropCsvHint || 'or drag and drop your CSV here'}
                                                    </span>
                                                </label>
                                            </div>
                                            <div className="admin-inline admin-inline--wrap">
                                                <button
                                                    type="button"
                                                    className="admin-button secondary"
                                                    onClick={handleAddCsvColumn}
                                                    disabled={csvImportLoading || !csvPreviewColumns.length}
                                                >
                                                    {adminText.addColumnButton || 'Add Column'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admin-button secondary"
                                                    onClick={() => handleCsvSelectAll(true)}
                                                    disabled={!csvPreviewRows.length || csvImportLoading}
                                                >
                                                    {adminText.selectAllRows || 'Select all'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admin-button secondary"
                                                    onClick={() => handleCsvSelectAll(false)}
                                                    disabled={!csvPreviewRows.length || csvImportLoading}
                                                >
                                                    {adminText.clearSelectedRows || 'Clear selected'}
                                                </button>
                                                <button type="submit" className="admin-button" disabled={csvImportLoading || !csvPreviewRows.length}>
                                                    {csvImportLoading ? adminText.importing : (adminText.importSelectedRows || 'Import selected rows')}
                                                </button>
                                            </div>
                                        </div>

                                        {csvPreviewColumns.length ? (
                                            <>
                                                <div className="admin-inline admin-inline--between admin-inline--wrap">
                                                    <div className="admin-muted admin-muted--md">
                                                        {(adminText.csvRowsSelectedLabel || 'Rows selected')}: {csvSelectedRows.length} / {csvPreviewRows.length}
                                                    </div>
                                                    <div className="admin-muted admin-muted--md">
                                                        {adminText.csvPreviewHint || 'Edit cells directly before importing. Only selected rows will be sent.'}
                                                    </div>
                                                </div>

                                                <div className="admin-import-sheet-wrap">
                                                    <table className="admin-table admin-table--compact admin-import-sheet">
                                                        <thead>
                                                            <tr>
                                                                <th>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={csvPreviewRows.length > 0 && csvSelectedRows.length === csvPreviewRows.length}
                                                                        onChange={(e) => handleCsvSelectAll(e.target.checked)}
                                                                        disabled={!csvPreviewRows.length || csvImportLoading}
                                                                    />
                                                                </th>
                                                                <th>#</th>
                                                                {csvPreviewColumns.map((column) => (
                                                                    <th key={column}>
                                                                        <div className="admin-import-sheet__header">
                                                                            <div className="admin-import-sheet__header-main">
                                                                                <div className="admin-import-sheet__header-top">
                                                                                    <span>{column}</span>
                                                                                    {!isProtectedCsvColumn(column) ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            className="admin-import-sheet__remove"
                                                                                            onClick={() => handleRemoveCsvColumn(column)}
                                                                                            disabled={csvImportLoading}
                                                                                            aria-label={`${adminText.removeColumnButton || 'Remove column'} ${column}`}
                                                                                        >
                                                                                            ×
                                                                                        </button>
                                                                                    ) : null}
                                                                                </div>
                                                                                <select
                                                                                    className="admin-input admin-import-sheet__select"
                                                                                    value={getMappedFieldForColumn(column)}
                                                                                    onChange={(e) => handleCsvColumnFieldMapping(column, e.target.value)}
                                                                                    disabled={csvImportLoading}
                                                                                >
                                                                                    <option value="">{adminText.ignoreColumnOption || 'Ignore column'}</option>
                                                                                    {CSV_IMPORT_FIELDS.map(({ key }) => (
                                                                                        <option key={key} value={key}>
                                                                                            {adminText[`csvField${key.charAt(0).toUpperCase()}${key.slice(1)}`] || key}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            </div>
                                                                        </div>
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {csvPreviewRows.map((row, index) => (
                                                                <tr key={row.id}>
                                                                    <td>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={csvSelectedRowIds.includes(row.id)}
                                                                            onChange={() => handleCsvRowSelection(row.id)}
                                                                            disabled={csvImportLoading}
                                                                        />
                                                                    </td>
                                                                    <td>{index + 1}</td>
                                                                    {csvPreviewColumns.map((column) => (
                                                                        <td key={`${row.id}-${column}`}>
                                                                            <input
                                                                                className="admin-input admin-import-sheet__input"
                                                                                value={row.values[column] || ''}
                                                                                onChange={(e) => handleCsvCellChange(row.id, column, e.target.value)}
                                                                                disabled={csvImportLoading}
                                                                            />
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </>
                                        ) : null}
                                    </form>

                                    {csvImportLoading && csvUploadProgress !== null ? (
                                        <div className="admin-stack mt-md">
                                            <div className="admin-inline admin-inline--between admin-muted admin-muted--md">
                                                <span>{csvUploadProgress < 100 ? adminText.uploadingCsv : adminText.uploadCompleteProcessing}</span>
                                                <span>{csvUploadProgress}%</span>
                                            </div>
                                            <div className="admin-chart-track" style={{ height: 10 }}>
                                                <div className="admin-chart-fill" style={{ width: `${csvUploadProgress}%` }}></div>
                                            </div>
                                        </div>
                                    ) : null}

                                    {csvImportMessage ? (
                                        <div className="admin-alert success mt-md">{csvImportMessage}</div>
                                    ) : null}

                                    {csvImportSummary ? (
                                        <div className="admin-stack mt-lg">
                                            <div className="admin-grid admin-grid--4cols">
                                                <div className="admin-stat"><div className="admin-muted">{adminText.rows}</div><div className="admin-value-lg">{csvImportSummary.totalRows}</div></div>
                                                <div className="admin-stat"><div className="admin-muted">{adminText.importedPayments}</div><div className="admin-value-lg">{csvImportSummary.importedPayments}</div></div>
                                                <div className="admin-stat"><div className="admin-muted">{adminText.createdDonors}</div><div className="admin-value-lg">{csvImportSummary.createdDonors}</div></div>
                                                <div className="admin-stat"><div className="admin-muted">{adminText.failedRows}</div><div className="admin-value-lg">{csvImportSummary.failedRows}</div></div>
                                            </div>

                                            {Array.isArray(csvImportSummary.errors) && csvImportSummary.errors.length > 0 ? (
                                                <div className="admin-table-wrap">
                                                    <table className="admin-table admin-table--compact admin-table--stackable">
                                                        <thead>
                                                            <tr>
                                                                <th>{adminText.rows}</th>
                                                                <th>{adminText.errorLabel}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {csvImportSummary.errors.map((item, idx) => (
                                                                <tr key={`${item.row}-${idx}`}>
                                                                    <td data-label={adminText.rows}>{item.row}</td>
                                                                    <td className="admin-table-cell-muted" data-label={adminText.errorLabel}>{item.message}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="admin-alert success">{adminText.noRowErrors}</div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                            {activeTab === 'exports' ? (
                                <div className="admin-stack admin-stack--xl">
                                    <div className="admin-card">
                                        <div className="admin-inline admin-inline--between admin-inline--wrap mb-md">
                                            <div>
                                                <div className="admin-section-title">{adminText.exportDataTitle || 'Export Data'}</div>
                                                <div className="admin-muted admin-muted--md">{adminText.exportDataSubtitle || 'Choose a dataset, apply filters, and download a tailored CSV export.'}</div>
                                            </div>
                                            <button
                                                type="button"
                                                className="admin-button"
                                                onClick={handleExportDownload}
                                                disabled={exportLoading || !exportSelectedColumns.length}
                                            >
                                                {exportLoading ? (adminText.preparingExport || 'Preparing export...') : (adminText.downloadExportButton || 'Download Export')}
                                            </button>
                                        </div>

                                        <div className="admin-grid admin-grid--3cols mb-md">
                                            <div>
                                                <label className="admin-label">{adminText.exportDatasetLabel || 'Dataset'}</label>
                                                <select className="admin-input" value={exportType} onChange={(e) => setExportType(e.target.value)}>
                                                    <option value="donors">{adminText.exportDatasetDonors || 'Donors'}</option>
                                                    <option value="payments">{adminText.exportDatasetPayments || 'Payments'}</option>
                                                    <option value="donorsWithPayments">{adminText.exportDatasetDonorsWithPayments || 'Donors with Payments'}</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="admin-label">{adminText.rows || 'Rows'}</label>
                                                <div className="admin-stat">
                                                    <div className="admin-muted">{adminText.exportRowsReady || 'Rows ready'}</div>
                                                    <div className="admin-value-md">{filteredExportRows.length}</div>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="admin-label">{adminText.exportColumnsLabel || 'Selected Columns'}</label>
                                                <div className="admin-stat">
                                                    <div className="admin-muted">{adminText.exportColumnsSelected || 'Columns selected'}</div>
                                                    <div className="admin-value-md">{exportSelectedColumns.length}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="admin-stack admin-stack--md">
                                            <div>
                                                <div className="admin-section-title admin-section-title--sm">{adminText.exportColumnsLabel || 'Columns'}</div>
                                                <div className="admin-actions">
                                                    {EXPORT_DATASETS[exportType].columns.map(({ key, labelKey }) => (
                                                        <label key={key} className="admin-checkbox-card">
                                                            <input
                                                                type="checkbox"
                                                                checked={exportSelectedColumns.includes(key)}
                                                                onChange={(e) => setExportSelectedColumns((current) => (
                                                                    e.target.checked
                                                                        ? [...current, key]
                                                                        : current.filter((column) => column !== key)
                                                                ))}
                                                            />
                                                            <span>{adminText[labelKey] || key}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="admin-section-title admin-section-title--sm">{adminText.advancedFiltersTitle || 'Advanced Filters'}</div>
                                                <div className="admin-grid admin-grid--4cols">
                                                    <input
                                                        className="admin-input"
                                                        placeholder={adminText.exportSearchPlaceholder || 'Search name, email, note, or method'}
                                                        value={exportFilters.query}
                                                        onChange={(e) => setExportFilters((prev) => ({ ...prev, query: e.target.value }))}
                                                    />
                                                    <input
                                                        className="admin-input"
                                                        type="date"
                                                        value={exportFilters.dateFrom}
                                                        onChange={(e) => setExportFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                                                    />
                                                    <input
                                                        className="admin-input"
                                                        type="date"
                                                        value={exportFilters.dateTo}
                                                        onChange={(e) => setExportFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                                                    />
                                                    <select
                                                        className="admin-input"
                                                        value={exportFilters.method}
                                                        onChange={(e) => setExportFilters((prev) => ({ ...prev, method: e.target.value }))}
                                                    >
                                                        <option value="">{adminText.allMethodsOption || 'All methods'}</option>
                                                        <option value="cash">{adminText.cashMethod}</option>
                                                        <option value="card">{adminText.cardMethod}</option>
                                                        <option value="zeffy">{adminText.zeffyMethod}</option>
                                                    </select>
                                                    <select
                                                        className="admin-input"
                                                        value={exportFilters.accountStatus}
                                                        onChange={(e) => setExportFilters((prev) => ({ ...prev, accountStatus: e.target.value }))}
                                                    >
                                                        <option value="">{adminText.allStatuses || 'All statuses'}</option>
                                                        <option value="active">{adminText.activeStatus}</option>
                                                        <option value="placeholder">{adminText.exportPlaceholderStatus || 'Placeholder'}</option>
                                                    </select>
                                                    <select
                                                        className="admin-input"
                                                        value={exportFilters.hasEngagement}
                                                        onChange={(e) => setExportFilters((prev) => ({ ...prev, hasEngagement: e.target.value }))}
                                                    >
                                                        <option value="">{adminText.exportEngagementFilterAll || 'All engagement states'}</option>
                                                        <option value="yes">{adminText.exportHasEngagement || 'Has engagement'}</option>
                                                        <option value="no">{adminText.exportNoEngagement || 'No engagement'}</option>
                                                    </select>
                                                    <input
                                                        className="admin-input"
                                                        type="number"
                                                        placeholder={adminText.exportMinAmount || 'Min amount'}
                                                        value={exportFilters.minAmount}
                                                        onChange={(e) => setExportFilters((prev) => ({ ...prev, minAmount: e.target.value }))}
                                                    />
                                                    <input
                                                        className="admin-input"
                                                        type="number"
                                                        placeholder={adminText.exportMaxAmount || 'Max amount'}
                                                        value={exportFilters.maxAmount}
                                                        onChange={(e) => setExportFilters((prev) => ({ ...prev, maxAmount: e.target.value }))}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {exportMessage ? <div className="admin-alert success mt-md">{exportMessage}</div> : null}
                                    </div>
                                </div>
                            ) : null}

                            {activeTab === 'admins' ? (
                                <div className="admin-stack admin-stack--xl">
                                    <div className="admin-card">
                                        <div className="admin-inline admin-inline--between admin-inline--wrap">
                                            <div>
                                                <div className="admin-section-title">{adminText.adminsTitle}</div>
                                                <div className="admin-muted admin-muted--md">{adminText.adminProfileTitle}</div>
                                            </div>
                                            <div className="admin-actions">
                                                <button
                                                    type="button"
                                                    className="admin-button"
                                                    onClick={() => {
                                                        setModalError('');
                                                        setModalMessage('');
                                                        setIsCreateAdminModalOpen(true);
                                                    }}
                                                >
                                                    {adminText.createAdminButton}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="admin-button secondary"
                                                    onClick={openCurrentAdminProfileModal}
                                                >
                                                    {adminText.updateProfileButton}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="admin-card">
                                        <div className="admin-section-title">{adminText.adminsTitle}</div>
                                        <div className="admin-actions mb-md">
                                            <input
                                                className="admin-input admin-input--max-260"
                                                placeholder={adminText.searchAdmins}
                                                value={adminFilter.query}
                                                onChange={(e) => setAdminFilter({ query: e.target.value })}
                                            />
                                        </div>
                                        <div className="admin-list">
                                            {paginatedAdmins.map((admin) => (
                                                <div key={admin.id} className="admin-item">
                                                    <div className="admin-item-title">{admin.name}</div>
                                                    <div className="admin-muted mt-sm">{admin.email}</div>
                                                    {admin.addedBy?.name ? <div className="mt-sm">{adminText.addedBy} {admin.addedBy.name}</div> : null}
                                                    <div className="admin-actions mt-sm">
                                                        <button
                                                            type="button"
                                                            className="admin-button secondary"
                                                            onClick={() => openAdminProfileModal(admin)}
                                                        >
                                                            {adminText.editButton || 'Edit'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="admin-button danger"
                                                            onClick={() => handleRemoveAdmin(admin)}
                                                        >
                                                            {adminText.removeButton || 'Remove'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {paginatedAdmins.length === 0 ? <div className="admin-item">{adminText.noAdminsMatch}</div> : null}
                                        </div>
                                        <div className="admin-pagination">
                                            <div className="admin-muted">{adminText.showingItemsPerPage}</div>
                                            <div className="admin-pagination-buttons">
                                                <button type="button" className="admin-button secondary" disabled={adminsPage <= 1} onClick={() => setAdminsPage((page) => Math.max(1, page - 1))}>{adminText.previous}</button>
                                                <span>{adminText.pageLabel(adminsPage, adminsTotalPages)}</span>
                                                <button type="button" className="admin-button secondary" disabled={adminsPage >= adminsTotalPages} onClick={() => setAdminsPage((page) => Math.min(adminsTotalPages, page + 1))}>{adminText.next}</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="admin-card">
                                        <div className="admin-inline admin-inline--between admin-inline--wrap mb-md">
                                            <div className="admin-section-title admin-title-with-icon"><AdminPageIcon kind="accounts" /> {adminText.adminProfileTitle}</div>
                                            <button
                                                type="button"
                                                className="admin-button secondary"
                                                onClick={openCurrentAdminProfileModal}
                                            >
                                                {adminText.updateProfileButton}
                                            </button>
                                        </div>
                                        <div className="admin-form">
                                            <div>
                                                <label className="admin-label">{adminText.fullNameLabel}</label>
                                                <input className="admin-input" type="text" defaultValue={currentAdminAccount?.name || ''} />
                                            </div>
                                            <div>
                                                <label className="admin-label">{adminText.emailAddressLabel}</label>
                                                <input className="admin-input" type="email" defaultValue={currentAdminAccount?.email || ''} />
                                            </div>
                                            <div>
                                                <label className="admin-label">{adminText.phoneNumberLabel}</label>
                                                <input className="admin-input" type="tel" defaultValue={currentAdminAccount?.phoneNumber || ''} />
                                            </div>
                                            <div>
                                                <label className="admin-label">{adminText.roleLabel}</label>
                                                <input className="admin-input admin-input--disabled" type="text" defaultValue={currentAdminAccount?.role || 'admin'} disabled />
                                            </div>
                                            <div>
                                                <label className="admin-label">{adminText.statusLabel}</label>
                                                <select
                                                    className="admin-input admin-input--disabled"
                                                    defaultValue={currentAdminAccount?.status || 'active'}
                                                    disabled
                                                >
                                                    <option value="active">{adminText.activeStatus}</option>
                                                    <option value="inactive">{adminText.inactiveStatus}</option>
                                                    <option value="suspended">{adminText.suspendedStatus}</option>
                                                </select>
                                                <div className="admin-field-help">{adminText.yourOwnStatusManagedByAnotherAdmin}</div>
                                            </div>
                                            <button type="button" className="admin-button" onClick={openCurrentAdminProfileModal}>{adminText.updateProfileButton}</button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {activeTab === 'apiKeys' ? (
                                <ApiKeysSection
                                    cardStyle={cardStyle}
                                    inputStyle={inputStyle}
                                    isActive={activeTab === 'apiKeys'}
                                />
                            ) : null}

                            {activeTab === 'logs' ? (
                                <div className="admin-card">
                                    <div className="admin-section-title">{adminText.activityLogs}</div>
                                    <div className="admin-actions mb-md">
                                        <input
                                            className="admin-input admin-input--max-220"
                                            placeholder={adminText.searchActivity}
                                            value={logFilter.query}
                                            onChange={(e) => setLogFilter((prev) => ({ ...prev, query: e.target.value }))}
                                        />
                                        <input
                                            className="admin-input admin-input--max-220"
                                            placeholder={adminText.filterByAction}
                                            value={logFilter.action}
                                            onChange={(e) => setLogFilter((prev) => ({ ...prev, action: e.target.value }))}
                                        />
                                        <input
                                            className="admin-input admin-input--max-220"
                                            placeholder={adminText.filterByActor}
                                            value={logFilter.actor}
                                            onChange={(e) => setLogFilter((prev) => ({ ...prev, actor: e.target.value }))}
                                        />
                                    </div>
                                    <div className="admin-list">
                                        {paginatedLogs.map((log) => (
                                            <div key={log.id} className="admin-item">
                                                <div className="admin-item-title">{log.action}</div>
                                                <div className="admin-muted mt-sm">{log.details}</div>
                                                <div className="admin-accent mt-sm">{log.actor}</div>
                                            </div>
                                        ))}
                                        {paginatedLogs.length === 0 ? <div className="admin-item">{adminText.noLogsMatch}</div> : null}
                                    </div>
                                    <div className="admin-pagination">
                                        <div className="admin-muted">{adminText.showingItemsPerPage}</div>
                                        <div className="admin-pagination-buttons">
                                            <button type="button" className="admin-button secondary" disabled={logsPage <= 1} onClick={() => setLogsPage((page) => Math.max(1, page - 1))}>{adminText.previous}</button>
                                            <span>{adminText.pageLabel(logsPage, logsTotalPages)}</span>
                                            <button type="button" className="admin-button secondary" disabled={logsPage >= logsTotalPages} onClick={() => setLogsPage((page) => Math.min(logsTotalPages, page + 1))}>{adminText.next}</button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {activeTab === 'volunteering' && FEATURES.VOLUNTEERING ? (
                                <VolunteeringSection
                                    cardStyle={cardStyle}
                                    inputStyle={inputStyle}
                                    adminText={adminText}
                                />
                            ) : null}

                            {activeTab === 'accounts' ? (
                                <div className="admin-stack admin-stack--xl">
                                    <div className="admin-card">
                                        <div className="admin-inline admin-inline--between admin-inline--wrap mb-md">
                                            <div>
                                                <div className="admin-section-title">{adminText.donorsWorkspaceTitle}</div>
                                                <div className="admin-muted admin-muted--md">{adminText.donorsWorkspaceSubtitle}</div>
                                            </div>
                                            <button
                                                type="button"
                                                className="admin-button"
                                                onClick={() => setIsAddDonorModalOpen(true)}
                                            >
                                                <span className="admin-button__content"><AdminPageIcon kind="add" /> {adminText.addNewDonor}</span>
                                            </button>
                                        </div>
                                        <div className="admin-grid admin-grid--4cols mb-md">
                                            <div className="admin-stat">
                                                <div className="admin-muted">{adminText.totalDonors}</div>
                                                <div className="admin-value-lg">{donorWorkspaceStats.visibleDonors}</div>
                                            </div>
                                            <div className="admin-stat">
                                                <div className="admin-muted">{adminText.totalRaised}</div>
                                                <div className="admin-value-lg">{formatCurrency(donorWorkspaceStats.visiblePaid)}</div>
                                            </div>
                                            <div className="admin-stat">
                                                <div className="admin-muted">{adminText.totalPledgedLabel}</div>
                                                <div className="admin-value-lg">{formatCurrency(donorWorkspaceStats.visiblePledged)}</div>
                                            </div>
                                            <div className="admin-stat">
                                                <div className="admin-muted">{adminText.outstandingAmountLabel}</div>
                                                <div className="admin-value-lg">{formatCurrency(donorWorkspaceStats.visibleOutstanding)}</div>
                                            </div>
                                        </div>
                                        <div className="admin-grid admin-grid--2cols mb-md">
                                            <div className="admin-stat">
                                                <div className="admin-muted">{adminText.donorsWithEngagements}</div>
                                                <div className="admin-value-md">{donorWorkspaceStats.visibleEngaged}</div>
                                            </div>
                                            <div className="admin-stat">
                                                <div className="admin-muted">{adminText.collectionRateLabel}</div>
                                                <div className="admin-value-md">
                                                    {donorWorkspaceStats.visiblePledged > 0
                                                        ? `${Math.min(100, Math.round((donorWorkspaceStats.visiblePaid / donorWorkspaceStats.visiblePledged) * 100))}%`
                                                        : '0%'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="admin-search-row">
                                            <input
                                                className="admin-input admin-input--max-280"
                                                placeholder={adminText.searchByName}
                                                value={donorFilter.nameQuery}
                                                onChange={(e) => setDonorFilter((prev) => ({ ...prev, nameQuery: e.target.value }))}
                                            />
                                            <input
                                                className="admin-input admin-input--max-280"
                                                placeholder={adminText.searchByEmail}
                                                value={donorFilter.emailQuery}
                                                onChange={(e) => setDonorFilter((prev) => ({ ...prev, emailQuery: e.target.value }))}
                                            />
                                            <input
                                                className="admin-input admin-input--max-220"
                                                placeholder={adminText.searchByPledge}
                                                value={donorFilter.engagementQuery}
                                                onChange={(e) => setDonorFilter((prev) => ({ ...prev, engagementQuery: e.target.value }))}
                                            />
                                        </div>
                                        <div className="admin-table-wrap">
                                            <table className="admin-table admin-table--stackable admin-table--donors">
                                                <colgroup>
                                                    <col className="admin-table-col admin-table-col--name" />
                                                    <col className="admin-table-col admin-table-col--email" />
                                                    <col className="admin-table-col admin-table-col--amount" />
                                                    <col className="admin-table-col admin-table-col--amount" />
                                                    <col className="admin-table-col admin-table-col--progress" />
                                                    <col className="admin-table-col admin-table-col--action" />
                                                    <col className="admin-table-col admin-table-col--action" />
                                                    <col className="admin-table-col admin-table-col--action" />
                                                </colgroup>
                                                <thead>
                                                    <tr>
                                                        <th>{adminText.fullNameColumn}</th>
                                                        <th>{adminText.emailColumn}</th>
                                                        <th>{adminText.engagementColumn}</th>
                                                        <th>{adminText.paidColumn}</th>
                                                        <th>{adminText.progressColumn}</th>
                                                        <th>{adminText.editProfileColumn}</th>
                                                        <th>{adminText.engagementActionsColumn || adminText.engagementColumn}</th>
                                                        <th>{adminText.paymentHistoryColumn}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paginatedTopDonors.map((donor) => {
                                                        const pledge = Number(donor.engagement?.totalPledge || 0);
                                                        const paid = Number(donor.paidAmount || 0);
                                                        const progress = pledge > 0 ? Math.min(100, Math.round((paid / pledge) * 100)) : 0;
                                                        return (
                                                            <tr key={donor.id}>
                                                                <td className="admin-item-title" data-label={adminText.fullNameColumn}>{donor.name || adminText.unknownDonor}</td>
                                                                <td className="admin-table-cell-muted" data-label={adminText.emailColumn}>{donor.email || '-'}</td>
                                                                <td data-label={adminText.engagementColumn}>${pledge.toLocaleString()}</td>
                                                                <td data-label={adminText.paidColumn}>${paid.toLocaleString()}</td>
                                                                <td data-label={adminText.progressColumn}>
                                                                    <div className="admin-table-progress">
                                                                        <div className="admin-chart-track">
                                                                            <div className="admin-chart-fill" style={{ width: `${progress}%` }}></div>
                                                                        </div>
                                                                        <span className="admin-table-cell-muted">{progress}%</span>
                                                                    </div>
                                                                </td>
                                                                <td data-label={adminText.editProfileColumn}>
                                                                    <div className="admin-table-actions">
                                                                        <button
                                                                            type="button"
                                                                            className="admin-button"
                                                                            onClick={() => openProfileModal(donor.id)}
                                                                        >
                                                                            <span className="admin-button__content"><AdminPageIcon kind="edit" /> {adminText.editShort}</span>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                                <td data-label={adminText.engagementActionsColumn || adminText.engagementColumn}>
                                                                    <div className="admin-table-actions">
                                                                        <button
                                                                            type="button"
                                                                            className="admin-button secondary"
                                                                            onClick={() => openEngagementModal(donor.id)}
                                                                        >
                                                                            <span className="admin-button__content"><AdminPageIcon kind="engagement" /> {adminText.engagementShort || adminText.updateEngagement}</span>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                                <td data-label={adminText.paymentHistoryColumn}>
                                                                    <div className="admin-table-actions">
                                                                        <button
                                                                            type="button"
                                                                            className="admin-button secondary"
                                                                            onClick={() => openPaymentsModal(donor.id)}
                                                                        >
                                                                            <span className="admin-button__content"><AdminPageIcon kind="payments" /> {adminText.paymentHistoryShort || adminText.paymentHistoryLabel}</span>
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {paginatedTopDonors.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={8} className="admin-table-cell-muted">
                                                                {adminText.noDonorsFound}
                                                            </td>
                                                        </tr>
                                                    ) : null}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="admin-pagination">
                                            <div className="admin-per-page">
                                                <span>{adminText.rowsPerPage}</span>
                                                <select
                                                    className="admin-input admin-input--width-90"
                                                    value={topDonorsPerPage}
                                                    onChange={(e) => setTopDonorsPerPage(Number(e.target.value))}
                                                >
                                                    <option value={4}>4</option>
                                                    <option value={8}>8</option>
                                                    <option value={12}>12</option>
                                                    <option value={20}>20</option>
                                                </select>
                                            </div>
                                            <div className="admin-pagination-buttons">
                                                <button type="button" className="admin-button secondary" disabled={topDonorsPage <= 1} onClick={() => setTopDonorsPage((page) => Math.max(1, page - 1))}>⬅️ {adminText.previous}</button>
                                                <span>{adminText.pageLabel(topDonorsPage, topDonorsTotalPages)}</span>
                                                <button type="button" className="admin-button secondary" disabled={topDonorsPage >= topDonorsTotalPages} onClick={() => setTopDonorsPage((page) => Math.min(topDonorsTotalPages, page + 1))}>{adminText.next} ➡️</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                        </section>
                    </div>
                </>
            </main>

            <Footer t={t} />
        </div>
    );
}
