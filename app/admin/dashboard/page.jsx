'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SitePreloader from '@/components/SitePreloader.jsx';
import AdminSidebar from '@/components/AdminSidebar.jsx';
import { useTranslation, useThemeMode } from '@/hooks/index.js';
import { useFirstVisitPreloader } from '@/hooks/useFirstVisitPreloader.js';
import { THEMES, MOBILE_BREAKPOINT } from '@/constants/config.js';
import { setupSEOMetaTags } from '@/lib/seoUtils.js';
import { getAbsoluteUrl, getSiteUrl, truncateText } from '@/lib/translationUtils.js';
import {
    approveRequest,
    createAdmin,
    createDonor,
    deactivateDonor,
    reactivateDonor,
    declineRequest,
    getDonor,
    getDonorPayments,
    getLogs,
    getStats,
    holdRequest,
    listAdmins,
    listDonors,
    listRequests,
    resetDonorPassword,
    updateDonor,
    addPayment,
    bulkUploadDonors,
} from '@/lib/adminApi.js';
import { clearTokens, logout, tryAutoLogin } from '@/lib/auth.js';
import { clearStoredSession, getStoredSession } from '@/lib/session.js';
import { startTokenRefreshManager, stopTokenRefreshManager } from '@/lib/tokenRefreshManager.js';
import { donorsToCSV, downloadCSV, parseCSV, validateDonors } from '@/lib/bulkDonorUtils.js';
import AddDonorModal from './AddDonorModal.jsx';
import PaymentPanel from './PaymentPanel.jsx';
import GlobalGoalSection from './GlobalGoalSection.jsx';
import CampaignsSection from './CampaignsSection.jsx';
import PillarsOverview from './PillarsOverview.jsx';

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

const getTranslation = (t, key, fallback) => {
    if (typeof t === 'function') {
        return t(key) || fallback;
    }
    return fallback;
};

export default function AdminDashboardPage() {
    const router = useRouter();
    const hydratedRef = useRef(false);
    const { language, setLanguage, t, isMounted: translationMounted } = useTranslation();
    const { themeMode, setThemeMode, isMounted: themeMounted } = useThemeMode();
    const theme = THEMES[themeMode] ?? THEMES.dark;
    const languageDropdownRef = useRef(null);
    const [showLanguageMenu, setShowLanguageMenu] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({ totalDonors: 0, totalRaised: 0, activeEngagements: 0, pendingRequests: 0 });
    const [donors, setDonors] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [selectedDonorId, setSelectedDonorId] = useState(null);
    const [selectedDonor, setSelectedDonor] = useState(null);
    const [selectedDonorForm, setSelectedDonorForm] = useState({ name: '', email: '' });
    const [selectedDonorLoading, setSelectedDonorLoading] = useState(false);
    const [selectedDonorSaving, setSelectedDonorSaving] = useState(false);
    const [isDonorModalOpen, setIsDonorModalOpen] = useState(false);
    const [isAddDonorModalOpen, setIsAddDonorModalOpen] = useState(false);
    const [addDonorForm, setAddDonorForm] = useState({ name: '', email: '', password: '' });
    const [addDonorLoading, setAddDonorLoading] = useState(false);
    const [donorPayments, setDonorPayments] = useState([]);
    const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
    const [bulkUploadProgress, setBulkUploadProgress] = useState('');
    const [requests, setRequests] = useState([]);
    const [logs, setLogs] = useState([]);
    const [activeTab, setActiveTabState] = useState('overview');
    const setActiveTab = (tab) => {
        setActiveTabState(tab);
        if (typeof window !== 'undefined') {
            localStorage.setItem('adminDashboardTab', tab);
        }
    };
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });
    const [resetPasswordByDonor, setResetPasswordByDonor] = useState({});
    const [requestDrafts, setRequestDrafts] = useState({});
    const [donorFilter, setDonorFilter] = useState({ query: '' });
    const [requestFilter, setRequestFilter] = useState({ query: '', status: '', type: '' });
    const [adminFilter, setAdminFilter] = useState({ query: '' });
    const [logFilter, setLogFilter] = useState({ action: '', actor: '', query: '' });
    const [pendingRequestsPage, setPendingRequestsPage] = useState(1);
    const [topDonorsPage, setTopDonorsPage] = useState(1);
    const [donorsPage, setDonorsPage] = useState(1);
    const [requestsPage, setRequestsPage] = useState(1);
    const [adminsPage, setAdminsPage] = useState(1);
    const [recentLogsPage, setRecentLogsPage] = useState(1);
    const [logsPage, setLogsPage] = useState(1);
    const [message, setMessage] = useState('');

    // New state for global goal, campaigns, and pillars
    const [globalGoal, setGlobalGoal] = useState({ amount: 50000, raised: 0 });
    const [campaigns, setCampaigns] = useState([]);
    const [pillars, setPillars] = useState({ foundation: 0, walls: 0, arches: 0, dome: 0 });
    const appReady = translationMounted && themeMounted;
    const { shouldShowPreloader, isResolved: preloaderResolved } = useFirstVisitPreloader(appReady);
    const isRTL = ['ar', 'ur'].includes(language);

    const siteUrl = getSiteUrl();
    const pageUrl = getAbsoluteUrl(`/admin/dashboard?lang=${language}`, siteUrl);
    const pageTitle = `Admin Dashboard | ${t.centerName || 'Centre Zad Al-Imane'}`;
    const pageDescription = truncateText('Manage donors, admins, requests, and activity logs.');

    useEffect(() => {
        if (!translationMounted) return;
        setupSEOMetaTags({
            language,
            isRTL,
            pageTitle,
            pageDescription,
            pageUrl,
            socialImageUrl: getAbsoluteUrl('/logo-ccai.png', siteUrl),
            logoAlt: `${t.centerName || 'Centre Zad Al-Imane'} logo`,
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
                getStats(),
                listDonors({ limit: 100 }),
                listRequests({ limit: 100 }),
                listAdmins(),
                getLogs({ limit: 200 }),
            ]);

            const [statsResult, donorsResult, requestsResult, adminsResult, logsResult] = results;

            if (statsResult.status === 'fulfilled') setStats(statsResult.value);
            if (donorsResult.status === 'fulfilled') setDonors(donorsResult.value.items ?? []);
            if (requestsResult.status === 'fulfilled') setRequests(requestsResult.value.items ?? []);
            if (adminsResult.status === 'fulfilled') setAdmins(adminsResult.value ?? []);
            if (logsResult.status === 'fulfilled') setLogs(logsResult.value.items ?? []);

            // If all failed, throw error; otherwise, silently continue with partial data
            if (results.every(r => r.status === 'rejected')) {
                throw new Error('Unable to load dashboard data.');
            }
        } catch (err) {
            console.error('Error loading dashboard data:', err);
            throw err;
        }
    }

    useEffect(() => {
        if (hydratedRef.current) return;
        hydratedRef.current = true;

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
                        setError('Your session has expired. Please log in again.');
                    }
                    router.replace('/login');
                    return;
                }

                // ✓ Start periodic token refresh to keep session alive
                startTokenRefreshManager();

                await loadAllData();
                if (!active) return;
                setError('');
            } catch (err) {
                if (!active) return;
                clearTokens();
                clearStoredSession();
                stopTokenRefreshManager();
                setError(err?.message || 'Unable to load admin dashboard.');
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

    // Restore active tab from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTab = localStorage.getItem('adminDashboardTab');
            if (savedTab && ['overview', 'donors', 'requests', 'admins', 'logs', 'settings', 'payment', 'accounts', 'help'].includes(savedTab)) {
                setActiveTabState(savedTab);
            }
        }
    }, []);

    const filteredDonors = useMemo(() => {
        const query = donorFilter.query.trim().toLowerCase();
        return donors.filter((donor) => {
            if (!query) return true;
            return [donor.name, donor.email]
                .filter(Boolean)
                .some((value) => value.toLowerCase().includes(query));
        });
    }, [donorFilter.query, donors]);
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
    const pendingRequests = useMemo(() => filteredRequests.filter((request) => request.status === 'pending'), [filteredRequests]);
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
    const recentLogsTotalPages = Math.max(1, Math.ceil(filteredLogs.length / 8));
    const logsTotalPages = Math.max(1, Math.ceil(filteredLogs.length / 12));
    const recentLogs = useMemo(() => {
        const start = (recentLogsPage - 1) * 8;
        return filteredLogs.slice(start, start + 8);
    }, [filteredLogs, recentLogsPage]);
    const paginatedLogs = useMemo(() => {
        const start = (logsPage - 1) * 12;
        return filteredLogs.slice(start, start + 12);
    }, [filteredLogs, logsPage]);
    const pendingRequestsTotalPages = Math.max(1, Math.ceil(pendingRequests.length / 8));
    const topDonorsTotalPages = Math.max(1, Math.ceil(topDonors.length / 8));
    const donorsTotalPages = Math.max(1, Math.ceil(filteredDonors.length / 12));
    const requestsTotalPages = Math.max(1, Math.ceil(filteredRequests.length / 12));
    const adminsTotalPages = Math.max(1, Math.ceil(filteredAdmins.length / 12));
    const paginatedPendingRequests = useMemo(() => {
        const start = (pendingRequestsPage - 1) * 8;
        return pendingRequests.slice(start, start + 8);
    }, [pendingRequests, pendingRequestsPage]);
    const paginatedTopDonors = useMemo(() => {
        const start = (topDonorsPage - 1) * 8;
        return topDonors.slice(start, start + 8);
    }, [topDonors, topDonorsPage]);
    const paginatedDonors = useMemo(() => {
        const start = (donorsPage - 1) * 12;
        return filteredDonors.slice(start, start + 12);
    }, [filteredDonors, donorsPage]);
    const paginatedRequests = useMemo(() => {
        const start = (requestsPage - 1) * 12;
        return filteredRequests.slice(start, start + 12);
    }, [filteredRequests, requestsPage]);
    const paginatedAdmins = useMemo(() => {
        const start = (adminsPage - 1) * 12;
        return filteredAdmins.slice(start, start + 12);
    }, [filteredAdmins, adminsPage]);
    const donorStats = useMemo(() => {
        const total = filteredDonors.length;
        const pledged = filteredDonors.reduce((sum, donor) => sum + Number(donor.engagement?.totalPledge || 0), 0);
        const paid = filteredDonors.reduce((sum, donor) => sum + Number(donor.paidAmount || 0), 0);
        const completed = filteredDonors.filter((donor) => {
            const target = Number(donor.engagement?.totalPledge || 0);
            const received = Number(donor.paidAmount || 0);
            return target > 0 && received >= target;
        }).length;

        return {
            total,
            pledged,
            paid,
            averagePledge: total > 0 ? Math.round(pledged / total) : 0,
            averagePaid: total > 0 ? Math.round(paid / total) : 0,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
    }, [filteredDonors]);
    const donorPledgeBands = useMemo(() => {
        const bands = [
            { key: 'under-1000', label: 'Under $1k', count: 0 },
            { key: 'under-2500', label: '$1k - $2.5k', count: 0 },
            { key: 'under-5000', label: '$2.5k - $5k', count: 0 },
            { key: 'over-5000', label: '$5k+', count: 0 },
        ];

        filteredDonors.forEach((donor) => {
            const pledge = Number(donor.engagement?.totalPledge || 0);
            if (pledge < 1000) bands[0].count += 1;
            else if (pledge < 2500) bands[1].count += 1;
            else if (pledge < 5000) bands[2].count += 1;
            else bands[3].count += 1;
        });

        return bands;
    }, [filteredDonors]);
    const donorProgressSegments = useMemo(() => {
        const segments = [
            { key: 'not-started', label: 'Not started', count: 0, color: '#7c8499' },
            { key: 'in-progress', label: 'In progress', count: 0, color: '#D4A96E' },
            { key: 'complete', label: 'Complete', count: 0, color: '#7EB8A0' },
        ];

        filteredDonors.forEach((donor) => {
            const target = Number(donor.engagement?.totalPledge || 0);
            const paid = Number(donor.paidAmount || 0);
            if (paid <= 0) {
                segments[0].count += 1;
            } else if (target > 0 && paid >= target) {
                segments[2].count += 1;
            } else {
                segments[1].count += 1;
            }
        });

        return segments;
    }, [filteredDonors]);

    useEffect(() => {
        setRecentLogsPage(1);
        setLogsPage(1);
    }, [logFilter.action, logFilter.actor, logFilter.query]);

    useEffect(() => {
        setPendingRequestsPage(1);
        setTopDonorsPage(1);
        setDonorsPage(1);
    }, [donorFilter.query, requestFilter.query, requestFilter.status, requestFilter.type]);

    useEffect(() => {
        setRequestsPage(1);
        setPendingRequestsPage(1);
    }, [requestFilter.query, requestFilter.status, requestFilter.type]);

    useEffect(() => {
        setAdminsPage(1);
    }, [adminFilter.query]);

    useEffect(() => {
        if (recentLogsPage > recentLogsTotalPages) {
            setRecentLogsPage(recentLogsTotalPages);
        }
    }, [recentLogsPage, recentLogsTotalPages]);

    useEffect(() => {
        if (logsPage > logsTotalPages) {
            setLogsPage(logsTotalPages);
        }
    }, [logsPage, logsTotalPages]);
    useEffect(() => {
        if (pendingRequestsPage > pendingRequestsTotalPages) {
            setPendingRequestsPage(pendingRequestsTotalPages);
        }
    }, [pendingRequestsPage, pendingRequestsTotalPages]);
    useEffect(() => {
        if (topDonorsPage > topDonorsTotalPages) {
            setTopDonorsPage(topDonorsTotalPages);
        }
    }, [topDonorsPage, topDonorsTotalPages]);
    useEffect(() => {
        if (donorsPage > donorsTotalPages) {
            setDonorsPage(donorsTotalPages);
        }
    }, [donorsPage, donorsTotalPages]);
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
        try {
            await createAdmin({
                name: newAdmin.name.trim(),
                email: newAdmin.email.trim().toLowerCase(),
                password: newAdmin.password,
            });
            setNewAdmin({ name: '', email: '', password: '' });

            try {
                await loadAllData();
            } catch (err) {
                console.error('Error reloading dashboard data:', err);
            }
            setMessage('Admin created.');
        } catch (err) {
            setError(err?.message || 'Unable to create admin.');
        }
    }

    async function handleRequestAction(id, status, body = {}) {
        setError('');
        setMessage('');
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
            setMessage(status === 'on_hold' ? 'Request placed on hold.' : `Request ${status}.`);
        } catch (err) {
            setError(err?.message || 'Unable to update request.');
        }
    }

    function getRequestDraft(request) {
        return requestDrafts[request.id] || {
            password: 'TempPass123!',
            pledgeAmount: '500',
            amount: '100',
            date: new Date().toISOString().slice(0, 10),
            method: 'cash',
        };
    }

    async function handleResetPassword(donorId) {
        const password = resetPasswordByDonor[donorId];
        if (!password) {
            setError('Enter a password first.');
            return;
        }

        try {
            await resetDonorPassword(donorId, { newPassword: password });
            setResetPasswordByDonor((prev) => ({ ...prev, [donorId]: '' }));
            setMessage('Donor password reset.');
        } catch (err) {
            setError(err?.message || 'Unable to reset donor password.');
        }
    }

    async function handleUpdateSelectedDonor(event) {
        event.preventDefault();
        if (!selectedDonorId) {
            setError('Select a donor first.');
            return;
        }

        setSelectedDonorSaving(true);
        setError('');
        setMessage('');

        try {
            const updated = await updateDonor(selectedDonorId, {
                name: selectedDonorForm.name.trim(),
                email: selectedDonorForm.email.trim().toLowerCase(),
            });

            setSelectedDonor((prev) => prev ? { ...prev, ...updated } : updated);
            setDonors((prev) => prev.map((donor) => (
                donor.id === selectedDonorId ? { ...donor, ...updated } : donor
            )));
            setMessage('Donor details updated.');
        } catch (err) {
            setError(err?.message || 'Unable to update donor.');
        } finally {
            setSelectedDonorSaving(false);
        }
    }

    async function handleLogout() {
        stopTokenRefreshManager();
        await logout();
        router.replace('/login');
    }

    function closeDonorModal() {
        setIsDonorModalOpen(false);
    }

    async function handleAddDonor() {
        if (!addDonorForm.name.trim() || !addDonorForm.email.trim() || !addDonorForm.password.trim()) {
            setError('All fields are required.');
            return;
        }

        setAddDonorLoading(true);
        setError('');
        setMessage('');

        try {
            const newDonor = await createDonor({
                name: addDonorForm.name.trim(),
                email: addDonorForm.email.trim().toLowerCase(),
                password: addDonorForm.password,
                engagement: addDonorForm.pledge ? { totalPledge: Number(addDonorForm.pledge) } : undefined,
            });

            setDonors((prev) => [newDonor, ...prev]);
            setAddDonorForm({ name: '', email: '', password: '' });
            setIsAddDonorModalOpen(false);
            setMessage(`Donor ${newDonor.name} added successfully.`);

            try {
                await loadAllData();
            } catch (err) {
                console.error('Error reloading dashboard data:', err);
            }
        } catch (err) {
            setError(err?.message || 'Unable to add donor.');
        } finally {
            setAddDonorLoading(false);
        }
    }

    async function handleSelectDonorWithPayments(donorId) {
        setSelectedDonorId(donorId);
        setIsDonorModalOpen(true);
        setSelectedDonorLoading(true);
        setError('');
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
            });
        } catch (err) {
            setSelectedDonor(null);
            setDonorPayments([]);
            setError(err?.message || 'Unable to load donor details.');
        } finally {
            setSelectedDonorLoading(false);
        }
    }

    async function handleAddPayment(event) {
        event.preventDefault();
        if (!selectedDonorId) return;

        const amountInput = document.getElementById('payment-amount');
        const methodSelect = document.getElementById('payment-method');
        const dateInput = document.getElementById('payment-date');
        const noteInput = document.getElementById('payment-note');

        if (!amountInput?.value || !methodSelect?.value || !dateInput?.value) {
            setError('Amount, method, and date are required.');
            return;
        }

        setSelectedDonorSaving(true);
        setError('');
        setMessage('');

        try {
            await addPayment(selectedDonorId, {
                amount: Number(amountInput.value),
                method: methodSelect.value,
                date: dateInput.value,
                note: noteInput?.value || '',
            });

            // Reload payments
            const updated = await getDonorPayments(selectedDonorId);
            setDonorPayments(updated || []);

            // Reset form
            amountInput.value = '';
            methodSelect.value = '';
            dateInput.value = '';
            noteInput.value = '';

            setMessage('Payment recorded successfully.');

            // Reload all data with error handling
            try {
                await loadAllData();
            } catch (err) {
                console.error('Error reloading dashboard data:', err);
                // Don't throw - allow UI to remain responsive
            }
        } catch (err) {
            setError(err?.message || 'Unable to record payment.');
        } finally {
            setSelectedDonorSaving(false);
        }
    }

    async function handleDeactivateDonor(donorId) {
        if (!confirm('Are you sure you want to deactivate this donor?')) return;

        setError('');
        setMessage('');

        try {
            await deactivateDonor(donorId);
            setDonors((prev) =>
                prev.map((d) => (d.id === donorId ? { ...d, isActive: false } : d))
            );
            setMessage('Donor deactivated.');
        } catch (err) {
            setError(err?.message || 'Unable to deactivate donor.');
        }
    }

    async function handleReactivateDonor(donorId) {
        if (!confirm('Are you sure you want to reactivate this donor?')) return;

        setError('');
        setMessage('');

        try {
            await reactivateDonor(donorId);
            setDonors((prev) =>
                prev.map((d) => (d.id === donorId ? { ...d, isActive: true } : d))
            );
            setMessage('Donor reactivated.');
        } catch (err) {
            setError(err?.message || 'Unable to reactivate donor.');
        }
    }

    async function handleBulkUpload(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            setError('Please upload a CSV file.');
            return;
        }

        setBulkUploadLoading(true);
        setBulkUploadProgress('Reading file...');
        setError('');
        setMessage('');

        try {
            const text = await file.text();
            setBulkUploadProgress('Parsing CSV...');
            const parsedDonors = parseCSV(text);

            setBulkUploadProgress('Validating...');
            const validationErrors = validateDonors(parsedDonors);
            if (validationErrors.length > 0) {
                throw new Error(validationErrors.join('\n'));
            }

            setBulkUploadProgress(`Uploading ${parsedDonors.length} donors...`);
            await bulkUploadDonors(file);

            setBulkUploadProgress('');
            setMessage(`Successfully uploaded ${parsedDonors.length} donors.`);

            try {
                await loadAllData();
            } catch (err) {
                console.error('Error reloading dashboard data:', err);
            }
            event.target.value = '';
        } catch (err) {
            setError(err?.message || 'Unable to upload donors.');
            setBulkUploadProgress('');
        } finally {
            setBulkUploadLoading(false);
        }
    }

    async function handleBulkDownload() {
        try {
            setMessage('Exporting donors...');
            const csv = donorsToCSV(filteredDonors);
            downloadCSV(csv, `donors-export-${new Date().toISOString().slice(0, 10)}.csv`);
            setMessage('Donors exported successfully.');
        } catch (err) {
            setError(err?.message || 'Unable to export donors.');
        }
    }

    if (!appReady && shouldShowPreloader && preloaderResolved) {
        return (
            <div className="mosque-donation" data-theme="dark" style={{ minHeight: '100vh', background: 'var(--bg-page)' }}>
                <SitePreloader title="Centre Zad Al-Imane" subtitle="Loading admin dashboard" />
            </div>
        );
    }

    return (
        <div dir={isRTL ? 'rtl' : 'ltr'} className="mosque-donation" data-theme={themeMode} suppressHydrationWarning>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:wght@400;600&family=Amiri:wght@400;700&display=swap');
                *{box-sizing:border-box}
                .admin-shell{width:100%;max-width:var(--page-max-width);margin:0 auto;padding:24px 20px 64px;display:grid;gap:24px;position:relative}
                .admin-layout{display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:start}
                .admin-tab-list{display:grid;gap:10px}
                .admin-tab{padding:12px 14px;border-radius:14px;border:1px solid var(--border);background:transparent;color:var(--text-primary);cursor:pointer;text-align:left}
                .admin-tab.active{background:var(--accent-gold);color:#111}
                .admin-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
                .admin-stat{padding:18px;border-radius:18px;border:1px solid var(--border);background:rgba(255,255,255,0.03);animation:pulse-skeleton 2s infinite}
                .admin-list{display:grid;gap:14px}
                .admin-item{padding:16px;border-radius:16px;border:1px solid var(--border);background:rgba(255,255,255,0.03)}
                .admin-button{padding:10px 14px;border-radius:12px;border:none;background:var(--accent-gold);color:#111;font-weight:700;cursor:pointer}
                .admin-button.secondary{background:rgba(255,255,255,0.06);color:var(--text-primary);border:1px solid var(--border)}
                .admin-actions{display:flex;gap:10px;flex-wrap:wrap}
                .admin-form{display:grid;gap:14px}
                .admin-alert{padding:14px 16px;border-radius:14px}
                .admin-alert.error{background:rgba(176,52,52,0.12);border:1px solid rgba(224,96,96,0.45);color:#ffb4b4}
                .admin-alert.success{background:rgba(82,154,106,0.12);border:1px solid rgba(126,184,160,0.45);color:#b5f0c4}
                .admin-two-col{display:grid;grid-template-columns:1.2fr .8fr;gap:24px}
                .admin-donor-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
                .admin-chart-card{padding:18px;border-radius:18px;border:1px solid var(--border);background:rgba(255,255,255,0.03)}
                .admin-chart-row{display:grid;grid-template-columns:120px 1fr 48px;gap:12px;align-items:center}
                .admin-chart-track{height:12px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden}
                .admin-chart-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,var(--accent-gold),#e6c86e)}
                .admin-donor-card{padding:18px;border-radius:20px;border:1px solid var(--border);background:linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02));display:grid;gap:14px}
                .admin-donor-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
                .admin-chip{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;border:1px solid var(--border);font-size:12px;color:var(--text-muted);background:rgba(255,255,255,0.03)}
                .admin-donor-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
                .admin-donor-metric{padding:12px;border-radius:14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05)}
                .admin-donor-progress{display:grid;gap:8px}
                .admin-detail-card{padding:18px;border-radius:20px;border:1px solid var(--border);background:rgba(255,255,255,0.03);display:grid;gap:16px}
                .admin-detail-list{display:grid;gap:12px}
                .admin-detail-row{display:flex;justify-content:space-between;gap:12px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.06)}
                .admin-detail-row:last-child{border-bottom:none;padding-bottom:0}
                .admin-subsection{display:grid;gap:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.08)}
                .admin-mini-list{display:grid;gap:10px}
                .admin-mini-item{padding:12px 14px;border-radius:14px;border:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.02)}
                .admin-modal-backdrop{position:fixed;inset:0;background:rgba(3,6,16,0.78);backdrop-filter:blur(8px);display:grid;place-items:center;padding:24px;z-index:60}
                .admin-modal{width:min(960px,100%);max-height:min(90vh,920px);overflow:auto;border-radius:24px;border:1px solid var(--border);background:linear-gradient(180deg,#14192e,#0b1020);box-shadow:0 24px 90px rgba(0,0,0,0.45);padding:24px;display:grid;gap:18px}
                .admin-modal-header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
                .admin-modal-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr);gap:18px}
                .admin-pagination{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px}
                .admin-pagination-buttons{display:flex;gap:10px;align-items:center}
                .admin-loading-overlay{position:fixed;inset:0;background:rgba(3,6,16,0.5);backdrop-filter:blur(4px);display:grid;place-items:center;z-index:50}
                .admin-spinner{width:48px;height:48px;border:3px solid rgba(255,255,255,0.1);border-top-color:var(--accent-gold);border-radius:50%;animation:spin 1s linear infinite}
                @keyframes spin{to{transform:rotate(360deg)}}
                @keyframes pulse-skeleton{0%,100%{opacity:1}50%{opacity:0.6}}
                @media (max-width:${MOBILE_BREAKPOINT}px){.admin-layout{grid-template-columns:1fr}.admin-grid{grid-template-columns:1fr 1fr}}
                @media (max-width:900px){.admin-two-col{grid-template-columns:1fr}}
                @media (max-width:720px){.admin-grid,.admin-donor-grid,.admin-donor-metrics,.admin-modal-grid{grid-template-columns:1fr}.admin-chart-row{grid-template-columns:1fr}}
            `}</style>
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
                        <div style={{ textAlign: 'center', display: 'grid', gap: 16, alignItems: 'center' }}>
                            <div className="admin-spinner"></div>
                            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: 'var(--text-primary)' }}>
                                Loading dashboard...
                            </div>
                        </div>
                    </div>
                ) : null}
                <>
                    {error ? <div className="admin-alert error">{error}</div> : null}
                    {message ? <div className="admin-alert success">{message}</div> : null}
                    {isDonorModalOpen ? (
                        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label="Donor details">
                            <div className="admin-modal">
                                <div className="admin-modal-header">
                                    <div>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 22 }}>
                                            {selectedDonor ? selectedDonor.name : 'Donor details'}
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>
                                            Review donor activity and update their profile.
                                        </div>
                                    </div>
                                    <button type="button" className="admin-button secondary" onClick={closeDonorModal}>
                                        Close
                                    </button>
                                </div>
                                <div className="admin-modal-grid">
                                    <div className="admin-detail-card">
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18 }}>Details</div>
                                        {selectedDonorLoading ? <div>Loading donor details...</div> : null}
                                        {!selectedDonorLoading && !selectedDonor ? (
                                            <div style={{ color: 'var(--text-muted)' }}>
                                                We could not load this donor yet. Try again from the donor card.
                                            </div>
                                        ) : null}
                                        {!selectedDonorLoading && selectedDonor ? (
                                            <div className="admin-detail-list">
                                                <div className="admin-detail-row">
                                                    <span style={{ color: 'var(--text-muted)' }}>Email</span>
                                                    <strong>{selectedDonor.email}</strong>
                                                </div>
                                                <div className="admin-detail-row">
                                                    <span style={{ color: 'var(--text-muted)' }}>Pledged</span>
                                                    <strong>${Number(selectedDonor.engagement?.totalPledge || 0).toLocaleString()}</strong>
                                                </div>
                                                <div className="admin-detail-row">
                                                    <span style={{ color: 'var(--text-muted)' }}>Payments recorded</span>
                                                    <strong>{selectedDonor.payments?.length ?? selectedDonor._count?.payments ?? 0}</strong>
                                                </div>
                                                <div className="admin-detail-row">
                                                    <span style={{ color: 'var(--text-muted)' }}>Requests submitted</span>
                                                    <strong>{selectedDonor.requests?.length ?? 0}</strong>
                                                </div>
                                                <div className="admin-detail-row">
                                                    <span style={{ color: 'var(--text-muted)' }}>Latest payment</span>
                                                    <strong>
                                                        {selectedDonor.payments?.[0]
                                                            ? `$${Number(selectedDonor.payments[0].amount || 0).toLocaleString()} on ${String(selectedDonor.payments[0].date).slice(0, 10)}`
                                                            : 'No payments yet'}
                                                    </strong>
                                                </div>
                                                <div className="admin-detail-row">
                                                    <span style={{ color: 'var(--text-muted)' }}>Latest request</span>
                                                    <strong style={{ textTransform: 'capitalize' }}>
                                                        {selectedDonor.requests?.[0]?.type ? selectedDonor.requests[0].type.replace(/_/g, ' ') : 'No requests yet'}
                                                    </strong>
                                                </div>
                                                <div className="admin-subsection">
                                                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16 }}>Recent payments</div>
                                                    {selectedDonor.payments?.length ? (
                                                        <div className="admin-mini-list">
                                                            {selectedDonor.payments.slice(0, 5).map((payment) => (
                                                                <div key={payment.id} className="admin-mini-item">
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                                                        <strong>${Number(payment.amount || 0).toLocaleString()}</strong>
                                                                        <span style={{ color: 'var(--text-muted)' }}>{String(payment.date).slice(0, 10)}</span>
                                                                    </div>
                                                                    <div style={{ marginTop: 6, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                                                                        {payment.method || 'other'}
                                                                        {payment.recordedByAdmin?.name ? ` · recorded by ${payment.recordedByAdmin.name}` : ''}
                                                                    </div>
                                                                    {payment.note ? <div style={{ marginTop: 6 }}>{payment.note}</div> : null}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div style={{ color: 'var(--text-muted)' }}>No payments recorded yet.</div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div className="admin-detail-card">
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18 }}>Edit donor</div>
                                        <form className="admin-form" onSubmit={handleUpdateSelectedDonor}>
                                            <input
                                                style={inputStyle}
                                                placeholder="Full name"
                                                value={selectedDonorForm.name}
                                                onChange={(e) => setSelectedDonorForm((prev) => ({ ...prev, name: e.target.value }))}
                                                disabled={!selectedDonor || selectedDonorSaving}
                                                required
                                            />
                                            <input
                                                style={inputStyle}
                                                type="email"
                                                placeholder="Email address"
                                                value={selectedDonorForm.email}
                                                onChange={(e) => setSelectedDonorForm((prev) => ({ ...prev, email: e.target.value }))}
                                                disabled={!selectedDonor || selectedDonorSaving}
                                                required
                                            />
                                            <button type="submit" className="admin-button" disabled={!selectedDonor || selectedDonorSaving}>
                                                {selectedDonorSaving ? 'Saving...' : 'Save donor changes'}
                                            </button>
                                        </form>
                                        <div className="admin-subsection">
                                            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16 }}>Reset password</div>
                                            <div className="admin-actions">
                                                <input
                                                    style={inputStyle}
                                                    type="password"
                                                    placeholder="New password"
                                                    value={resetPasswordByDonor[selectedDonorId] || ''}
                                                    onChange={(e) => setResetPasswordByDonor((prev) => ({ ...prev, [selectedDonorId]: e.target.value }))}
                                                    disabled={!selectedDonor}
                                                />
                                                <button
                                                    type="button"
                                                    className="admin-button secondary"
                                                    disabled={!selectedDonor}
                                                    onClick={() => handleResetPassword(selectedDonorId)}
                                                >
                                                    Reset donor password
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                                            The current backend supports editing donor name and email from admin tools.
                                        </div>
                                    </div>
                                    <PaymentPanel
                                        donor={selectedDonor}
                                        payments={donorPayments}
                                        onAddPayment={handleAddPayment}
                                        loading={selectedDonorSaving}
                                        inputStyle={inputStyle}
                                        cardStyle={cardStyle}
                                        t={t}
                                    />
                                </div>
                            </div>
                        </div>
                    ) : null}
                    <div className="admin-layout">
                        <AdminSidebar
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            isRTL={isRTL}
                            onLogout={handleLogout}
                        />

                        <section style={{ display: 'grid', gap: 24 }}>
                            {activeTab === 'overview' ? (
                                <>
                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 16 }}>📊 {getTranslation(t, 'admin.dashboard', 'Dashboard')}</div>
                                        <div className="admin-grid">
                                            <div className="admin-stat"><div style={{ color: 'var(--text-muted)' }}>{getTranslation(t, 'admin.totalDonors', 'Total Donors')}</div><div style={{ fontSize: 30, fontWeight: 700 }}>{stats.totalDonors}</div></div>
                                            <div className="admin-stat"><div style={{ color: 'var(--text-muted)' }}>{getTranslation(t, 'admin.totalRaised', 'Total Raised')}</div><div style={{ fontSize: 30, fontWeight: 700 }}>${Number(stats.totalRaised || 0).toLocaleString()}</div></div>
                                            <div className="admin-stat"><div style={{ color: 'var(--text-muted)' }}>{getTranslation(t, 'admin.activeEngagements', 'Active Engagements')}</div><div style={{ fontSize: 30, fontWeight: 700 }}>{stats.activeEngagements}</div></div>
                                            <div className="admin-stat"><div style={{ color: 'var(--text-muted)' }}>{getTranslation(t, 'admin.pendingRequests', 'Pending Requests')}</div><div style={{ fontSize: 30, fontWeight: 700 }}>{stats.pendingRequests}</div></div>
                                        </div>
                                    </div>

                                    {/* Global Goal Section */}
                                    <GlobalGoalSection
                                        t={t}
                                        cardStyle={cardStyle}
                                        inputStyle={inputStyle}
                                        goal={globalGoal}
                                        onGoalUpdate={(newGoal) => {
                                            setGlobalGoal(newGoal);
                                            return Promise.resolve();
                                        }}
                                    />

                                    {/* Pillars Overview */}
                                    <PillarsOverview
                                        t={t}
                                        pillars={pillars}
                                        totalRaised={stats.totalRaised}
                                    />

                                    {/* Campaigns Section */}
                                    <CampaignsSection
                                        t={t}
                                        cardStyle={cardStyle}
                                        inputStyle={inputStyle}
                                        campaigns={campaigns}
                                    />
                                    <div className="admin-two-col">
                                        <div style={cardStyle}>
                                            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 16 }}>Pending Queue</div>
                                            <div className="admin-actions" style={{ marginBottom: 16 }}>
                                                <input
                                                    style={{ ...inputStyle, maxWidth: 220 }}
                                                    placeholder="Search requests"
                                                    value={requestFilter.query}
                                                    onChange={(e) => setRequestFilter((prev) => ({ ...prev, query: e.target.value }))}
                                                />
                                                <select
                                                    style={{ ...inputStyle, maxWidth: 180 }}
                                                    value={requestFilter.type}
                                                    onChange={(e) => setRequestFilter((prev) => ({ ...prev, type: e.target.value }))}
                                                >
                                                    <option value="">All types</option>
                                                    <option value="account_creation">account_creation</option>
                                                    <option value="payment_upload">payment_upload</option>
                                                    <option value="engagement_change">engagement_change</option>
                                                    <option value="other">other</option>
                                                </select>
                                            </div>
                                            <div className="admin-list">
                                                {paginatedPendingRequests.map((request) => (
                                                    <div key={request.id} className="admin-item">
                                                        <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{request.type.replace(/_/g, ' ')}</div>
                                                        <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>{request.name} · {request.email}</div>
                                                        <div style={{ color: 'var(--accent-gold)', marginTop: 6 }}>{request.status}</div>
                                                    </div>
                                                ))}
                                                {paginatedPendingRequests.length === 0 ? <div className="admin-item">No pending requests.</div> : null}
                                            </div>
                                            <div className="admin-pagination">
                                                <div style={{ color: 'var(--text-muted)' }}>Showing up to 8 items per page</div>
                                                <div className="admin-pagination-buttons">
                                                    <button type="button" className="admin-button secondary" disabled={pendingRequestsPage <= 1} onClick={() => setPendingRequestsPage((page) => Math.max(1, page - 1))}>Previous</button>
                                                    <span>Page {pendingRequestsPage} of {pendingRequestsTotalPages}</span>
                                                    <button type="button" className="admin-button secondary" disabled={pendingRequestsPage >= pendingRequestsTotalPages} onClick={() => setPendingRequestsPage((page) => Math.min(pendingRequestsTotalPages, page + 1))}>Next</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={cardStyle}>
                                            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 16 }}>Top Donors</div>
                                            <div className="admin-actions" style={{ marginBottom: 16 }}>
                                                <input
                                                    style={{ ...inputStyle, maxWidth: 220 }}
                                                    placeholder="Search donors"
                                                    value={donorFilter.query}
                                                    onChange={(e) => setDonorFilter({ query: e.target.value })}
                                                />
                                            </div>
                                            <div className="admin-list">
                                                {paginatedTopDonors.map((donor) => (
                                                    <div key={donor.id} className="admin-item">
                                                        <div style={{ fontWeight: 700 }}>{donor.name}</div>
                                                        <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>{donor.email}</div>
                                                        <div style={{ marginTop: 8 }}>${Number(donor.paidAmount || 0).toLocaleString()} paid</div>
                                                    </div>
                                                ))}
                                                {paginatedTopDonors.length === 0 ? <div className="admin-item">No donors match the current filter.</div> : null}
                                            </div>
                                            <div className="admin-pagination">
                                                <div style={{ color: 'var(--text-muted)' }}>Showing up to 8 items per page</div>
                                                <div className="admin-pagination-buttons">
                                                    <button type="button" className="admin-button secondary" disabled={topDonorsPage <= 1} onClick={() => setTopDonorsPage((page) => Math.max(1, page - 1))}>Previous</button>
                                                    <span>Page {topDonorsPage} of {topDonorsTotalPages}</span>
                                                    <button type="button" className="admin-button secondary" disabled={topDonorsPage >= topDonorsTotalPages} onClick={() => setTopDonorsPage((page) => Math.min(topDonorsTotalPages, page + 1))}>Next</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 16 }}>Recent activity</div>
                                        <div className="admin-actions" style={{ marginBottom: 16 }}>
                                            <input
                                                style={{ ...inputStyle, maxWidth: 220 }}
                                                placeholder="Search activity"
                                                value={logFilter.query}
                                                onChange={(e) => setLogFilter((prev) => ({ ...prev, query: e.target.value }))}
                                            />
                                            <input
                                                style={{ ...inputStyle, maxWidth: 220 }}
                                                placeholder="Filter by action"
                                                value={logFilter.action}
                                                onChange={(e) => setLogFilter((prev) => ({ ...prev, action: e.target.value }))}
                                            />
                                            <input
                                                style={{ ...inputStyle, maxWidth: 220 }}
                                                placeholder="Filter by actor"
                                                value={logFilter.actor}
                                                onChange={(e) => setLogFilter((prev) => ({ ...prev, actor: e.target.value }))}
                                            />
                                        </div>
                                        <div className="admin-list">
                                            {recentLogs.map((log) => (
                                                <div key={log.id} className="admin-item">
                                                    <div style={{ fontWeight: 700 }}>{log.action}</div>
                                                    <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>{log.details}</div>
                                                    <div style={{ color: 'var(--accent-gold)', marginTop: 6 }}>{log.actor}</div>
                                                </div>
                                            ))}
                                            {recentLogs.length === 0 ? <div className="admin-item">No activity matches the current filters.</div> : null}
                                        </div>
                                        <div className="admin-pagination">
                                            <div style={{ color: 'var(--text-muted)' }}>Showing up to 8 items per page</div>
                                            <div className="admin-pagination-buttons">
                                                <button type="button" className="admin-button secondary" disabled={recentLogsPage <= 1} onClick={() => setRecentLogsPage((page) => Math.max(1, page - 1))}>Previous</button>
                                                <span>Page {recentLogsPage} of {recentLogsTotalPages}</span>
                                                <button type="button" className="admin-button secondary" disabled={recentLogsPage >= recentLogsTotalPages} onClick={() => setRecentLogsPage((page) => Math.min(recentLogsTotalPages, page + 1))}>Next</button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : null}

                            {activeTab === 'donors' ? (
                                <div style={cardStyle}>
                                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 16 }}>Donors</div>
                                    <div className="admin-actions" style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr auto auto auto auto auto', gap: 10, alignItems: 'center' }}>
                                        <input
                                            style={{ ...inputStyle, maxWidth: 'none' }}
                                            placeholder="Search donors"
                                            value={donorFilter.query}
                                            onChange={(e) => setDonorFilter({ query: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            className="admin-button"
                                            onClick={() => setIsAddDonorModalOpen(true)}
                                            style={{ whiteSpace: 'nowrap' }}
                                        >
                                            + Add Donor
                                        </button>
                                        <label style={{
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: 'var(--accent-gold)',
                                            color: '#111',
                                            fontWeight: 700,
                                            cursor: bulkUploadLoading ? 'not-allowed' : 'pointer',
                                            opacity: bulkUploadLoading ? 0.6 : 1,
                                            whiteSpace: 'nowrap',
                                        }}>
                                            <input
                                                type="file"
                                                accept=".csv"
                                                onChange={handleBulkUpload}
                                                disabled={bulkUploadLoading}
                                                style={{ display: 'none' }}
                                            />
                                            {bulkUploadLoading ? 'Uploading...' : 'Upload CSV'}
                                        </label>
                                        <button
                                            type="button"
                                            className="admin-button secondary"
                                            onClick={handleBulkDownload}
                                            style={{ whiteSpace: 'nowrap' }}
                                        >
                                            ↓ Export CSV
                                        </button>
                                    </div>
                                    {bulkUploadProgress && (
                                        <div style={{
                                            padding: '12px',
                                            borderRadius: '12px',
                                            background: 'rgba(212, 169, 110, 0.1)',
                                            border: '1px solid var(--accent-gold)',
                                            marginBottom: 16,
                                            color: 'var(--accent-gold)',
                                        }}>
                                            {bulkUploadProgress}
                                        </div>
                                    )}
                                    <div className="admin-grid" style={{ marginBottom: 18 }}>
                                        <div className="admin-stat"><div style={{ color: 'var(--text-muted)' }}>Visible donors</div><div style={{ fontSize: 30, fontWeight: 700 }}>{donorStats.total}</div></div>
                                        <div className="admin-stat"><div style={{ color: 'var(--text-muted)' }}>Avg pledge</div><div style={{ fontSize: 30, fontWeight: 700 }}>${donorStats.averagePledge.toLocaleString()}</div></div>
                                        <div className="admin-stat"><div style={{ color: 'var(--text-muted)' }}>Avg paid</div><div style={{ fontSize: 30, fontWeight: 700 }}>${donorStats.averagePaid.toLocaleString()}</div></div>
                                        <div className="admin-stat"><div style={{ color: 'var(--text-muted)' }}>Completion rate</div><div style={{ fontSize: 30, fontWeight: 700 }}>{donorStats.completionRate}%</div></div>
                                    </div>
                                    <div className="admin-two-col" style={{ marginBottom: 18 }}>
                                        <div className="admin-chart-card">
                                            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, marginBottom: 16 }}>Pledge Distribution</div>
                                            <div className="admin-list">
                                                {donorPledgeBands.map((band) => {
                                                    const pct = donorStats.total > 0 ? Math.round((band.count / donorStats.total) * 100) : 0;
                                                    return (
                                                        <div key={band.key} className="admin-chart-row">
                                                            <span>{band.label}</span>
                                                            <div className="admin-chart-track">
                                                                <div className="admin-chart-fill" style={{ width: `${pct}%` }}></div>
                                                            </div>
                                                            <strong>{band.count}</strong>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div className="admin-chart-card">
                                            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, marginBottom: 16 }}>Progress Snapshot</div>
                                            <div className="admin-list">
                                                {donorProgressSegments.map((segment) => {
                                                    const pct = donorStats.total > 0 ? Math.round((segment.count / donorStats.total) * 100) : 0;
                                                    return (
                                                        <div key={segment.key} className="admin-chart-row">
                                                            <span>{segment.label}</span>
                                                            <div className="admin-chart-track">
                                                                <div className="admin-chart-fill" style={{ width: `${pct}%`, background: segment.color }}></div>
                                                            </div>
                                                            <strong>{pct}%</strong>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="admin-donor-grid">
                                        {paginatedDonors.map((donor) => {
                                            const pledge = Number(donor.engagement?.totalPledge || 0);
                                            const paid = Number(donor.paidAmount || 0);
                                            const progress = pledge > 0 ? Math.min(100, Math.round((paid / pledge) * 100)) : 0;
                                            return (
                                                <div key={donor.id} className="admin-donor-card">
                                                    <div className="admin-donor-top">
                                                        <div>
                                                            <div style={{ fontWeight: 700, fontSize: 18 }}>{donor.name}</div>
                                                            <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{donor.email}</div>
                                                        </div>
                                                        <span className="admin-chip">{donor._count?.payments ?? 0} payments</span>
                                                    </div>

                                                    <div className="admin-donor-metrics">
                                                        <div className="admin-donor-metric">
                                                            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Pledged</div>
                                                            <div style={{ fontWeight: 700, marginTop: 6 }}>${pledge.toLocaleString()}</div>
                                                        </div>
                                                        <div className="admin-donor-metric">
                                                            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Paid</div>
                                                            <div style={{ fontWeight: 700, marginTop: 6 }}>${paid.toLocaleString()}</div>
                                                        </div>
                                                        <div className="admin-donor-metric">
                                                            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Remaining</div>
                                                            <div style={{ fontWeight: 700, marginTop: 6 }}>${Math.max(0, pledge - paid).toLocaleString()}</div>
                                                        </div>
                                                    </div>

                                                    <div className="admin-donor-progress">
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                                            <span style={{ color: 'var(--text-muted)' }}>Funding progress</span>
                                                            <strong>{progress}%</strong>
                                                        </div>
                                                        <div className="admin-chart-track">
                                                            <div className="admin-chart-fill" style={{ width: `${progress}%` }}></div>
                                                        </div>
                                                    </div>

                                                    <div className="admin-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                                        <button type="button" className="admin-button" onClick={() => handleSelectDonorWithPayments(donor.id)}>
                                                            View details
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="admin-button secondary"
                                                            onClick={() => donor.isActive !== false ? handleDeactivateDonor(donor.id) : handleReactivateDonor(donor.id)}
                                                            style={{
                                                                color: donor.isActive !== false ? '#ffb4b4' : '#b5f0c4',
                                                                borderColor: donor.isActive !== false ? 'rgba(224, 96, 96, 0.45)' : 'rgba(126, 184, 160, 0.45)',
                                                            }}
                                                        >
                                                            {donor.isActive !== false ? 'Deactivate' : 'Reactivate'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {paginatedDonors.length === 0 ? <div className="admin-item">No donors match the current filter.</div> : null}
                                    </div>
                                    <div className="admin-pagination">
                                        <div style={{ color: 'var(--text-muted)' }}>Showing 12 items per page</div>
                                        <div className="admin-pagination-buttons">
                                            <button type="button" className="admin-button secondary" disabled={donorsPage <= 1} onClick={() => setDonorsPage((page) => Math.max(1, page - 1))}>Previous</button>
                                            <span>Page {donorsPage} of {donorsTotalPages}</span>
                                            <button type="button" className="admin-button secondary" disabled={donorsPage >= donorsTotalPages} onClick={() => setDonorsPage((page) => Math.min(donorsTotalPages, page + 1))}>Next</button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {activeTab === 'requests' ? (
                                <div style={cardStyle}>
                                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 16 }}>Requests</div>
                                    <div className="admin-actions" style={{ marginBottom: 16 }}>
                                        <input
                                            style={{ ...inputStyle, maxWidth: 220 }}
                                            placeholder="Search requests"
                                            value={requestFilter.query}
                                            onChange={(e) => setRequestFilter((prev) => ({ ...prev, query: e.target.value }))}
                                        />
                                        <select
                                            style={{ ...inputStyle, maxWidth: 180 }}
                                            value={requestFilter.status}
                                            onChange={(e) => setRequestFilter((prev) => ({ ...prev, status: e.target.value }))}
                                        >
                                            <option value="">All statuses</option>
                                            <option value="pending">pending</option>
                                            <option value="on_hold">on_hold</option>
                                            <option value="approved">approved</option>
                                            <option value="declined">declined</option>
                                        </select>
                                        <select
                                            style={{ ...inputStyle, maxWidth: 180 }}
                                            value={requestFilter.type}
                                            onChange={(e) => setRequestFilter((prev) => ({ ...prev, type: e.target.value }))}
                                        >
                                            <option value="">All types</option>
                                            <option value="account_creation">account_creation</option>
                                            <option value="payment_upload">payment_upload</option>
                                            <option value="engagement_change">engagement_change</option>
                                            <option value="other">other</option>
                                        </select>
                                    </div>
                                    <div className="admin-list">
                                        {paginatedRequests.map((request) => (
                                            <div key={request.id} className="admin-item">
                                                <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{request.type.replace(/_/g, ' ')}</div>
                                                <div style={{ color: 'var(--accent-gold)', marginTop: 4 }}>{request.status}</div>
                                                <div style={{ marginTop: 8, color: 'var(--text-muted)' }}>{request.message}</div>
                                                {['pending', 'on_hold'].includes(request.status) ? (
                                                    <>
                                                        {request.type === 'account_creation' ? (
                                                            <div className="admin-actions" style={{ marginTop: 12 }}>
                                                                <input
                                                                    style={{ ...inputStyle, maxWidth: 220 }}
                                                                    type="password"
                                                                    placeholder="Temp password"
                                                                    value={getRequestDraft(request).password}
                                                                    onChange={(e) => setRequestDrafts((prev) => ({ ...prev, [request.id]: { ...getRequestDraft(request), password: e.target.value } }))}
                                                                />
                                                                <input
                                                                    style={{ ...inputStyle, maxWidth: 180 }}
                                                                    type="number"
                                                                    placeholder="Pledge amount"
                                                                    value={getRequestDraft(request).pledgeAmount}
                                                                    onChange={(e) => setRequestDrafts((prev) => ({ ...prev, [request.id]: { ...getRequestDraft(request), pledgeAmount: e.target.value } }))}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    className="admin-button"
                                                                    onClick={() => handleRequestAction(request.id, 'approved', {
                                                                        password: getRequestDraft(request).password,
                                                                        pledgeAmount: Number(getRequestDraft(request).pledgeAmount) || undefined,
                                                                    })}
                                                                >
                                                                    Approve account
                                                                </button>
                                                                {request.status === 'pending' ? (
                                                                    <button type="button" className="admin-button secondary" onClick={() => handleRequestAction(request.id, 'on_hold')}>
                                                                        Put on hold
                                                                    </button>
                                                                ) : null}
                                                            </div>
                                                        ) : null}
                                                        {request.type === 'payment_upload' ? (
                                                            <div className="admin-actions" style={{ marginTop: 12 }}>
                                                                <input
                                                                    style={{ ...inputStyle, maxWidth: 160 }}
                                                                    type="number"
                                                                    placeholder="Amount"
                                                                    value={getRequestDraft(request).amount}
                                                                    onChange={(e) => setRequestDrafts((prev) => ({ ...prev, [request.id]: { ...getRequestDraft(request), amount: e.target.value } }))}
                                                                />
                                                                <input
                                                                    style={{ ...inputStyle, maxWidth: 180 }}
                                                                    type="date"
                                                                    value={getRequestDraft(request).date}
                                                                    onChange={(e) => setRequestDrafts((prev) => ({ ...prev, [request.id]: { ...getRequestDraft(request), date: e.target.value } }))}
                                                                />
                                                                <select
                                                                    style={{ ...inputStyle, maxWidth: 160 }}
                                                                    value={getRequestDraft(request).method}
                                                                    onChange={(e) => setRequestDrafts((prev) => ({ ...prev, [request.id]: { ...getRequestDraft(request), method: e.target.value } }))}
                                                                >
                                                                    <option value="zeffy">zeffy</option>
                                                                    <option value="cash">cash</option>
                                                                    <option value="other">other</option>
                                                                </select>
                                                                <button
                                                                    type="button"
                                                                    className="admin-button"
                                                                    onClick={() => handleRequestAction(request.id, 'approved', {
                                                                        amount: Number(getRequestDraft(request).amount),
                                                                        date: new Date(getRequestDraft(request).date).toISOString(),
                                                                        method: getRequestDraft(request).method,
                                                                    })}
                                                                >
                                                                    Approve payment
                                                                </button>
                                                                {request.status === 'pending' ? (
                                                                    <button type="button" className="admin-button secondary" onClick={() => handleRequestAction(request.id, 'on_hold')}>
                                                                        Put on hold
                                                                    </button>
                                                                ) : null}
                                                            </div>
                                                        ) : null}
                                                        {!['account_creation', 'payment_upload'].includes(request.type) ? (
                                                            <div className="admin-actions" style={{ marginTop: 12 }}>
                                                                <button type="button" className="admin-button" onClick={() => handleRequestAction(request.id, 'approved')}>
                                                                    Approve
                                                                </button>
                                                                {request.status === 'pending' ? (
                                                                    <button type="button" className="admin-button secondary" onClick={() => handleRequestAction(request.id, 'on_hold')}>
                                                                        Put on hold
                                                                    </button>
                                                                ) : null}
                                                            </div>
                                                        ) : null}
                                                        <div className="admin-actions" style={{ marginTop: 12 }}>
                                                            <button type="button" className="admin-button secondary" onClick={() => handleRequestAction(request.id, 'declined')}>
                                                                Reject
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : null}
                                            </div>
                                        ))}
                                        {paginatedRequests.length === 0 ? <div className="admin-item">No requests match the current filters.</div> : null}
                                    </div>
                                    <div className="admin-pagination">
                                        <div style={{ color: 'var(--text-muted)' }}>Showing 12 items per page</div>
                                        <div className="admin-pagination-buttons">
                                            <button type="button" className="admin-button secondary" disabled={requestsPage <= 1} onClick={() => setRequestsPage((page) => Math.max(1, page - 1))}>Previous</button>
                                            <span>Page {requestsPage} of {requestsTotalPages}</span>
                                            <button type="button" className="admin-button secondary" disabled={requestsPage >= requestsTotalPages} onClick={() => setRequestsPage((page) => Math.min(requestsTotalPages, page + 1))}>Next</button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {activeTab === 'admins' ? (
                                <>
                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 16 }}>Create admin</div>
                                        <form className="admin-form" onSubmit={handleCreateAdmin}>
                                            <input style={inputStyle} placeholder="Full name" value={newAdmin.name} onChange={(e) => setNewAdmin((prev) => ({ ...prev, name: e.target.value }))} />
                                            <input style={inputStyle} type="email" placeholder="Email" value={newAdmin.email} onChange={(e) => setNewAdmin((prev) => ({ ...prev, email: e.target.value }))} />
                                            <input style={inputStyle} type="password" placeholder="Password" value={newAdmin.password} onChange={(e) => setNewAdmin((prev) => ({ ...prev, password: e.target.value }))} />
                                            <button type="submit" className="admin-button">Create admin</button>
                                        </form>
                                    </div>
                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 16 }}>Admins</div>
                                        <div className="admin-actions" style={{ marginBottom: 16 }}>
                                            <input
                                                style={{ ...inputStyle, maxWidth: 260 }}
                                                placeholder="Search admins"
                                                value={adminFilter.query}
                                                onChange={(e) => setAdminFilter({ query: e.target.value })}
                                            />
                                        </div>
                                        <div className="admin-list">
                                            {paginatedAdmins.map((admin) => (
                                                <div key={admin.id} className="admin-item">
                                                    <div style={{ fontWeight: 700 }}>{admin.name}</div>
                                                    <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{admin.email}</div>
                                                    {admin.addedBy?.name ? <div style={{ marginTop: 8 }}>Added by {admin.addedBy.name}</div> : null}
                                                </div>
                                            ))}
                                            {paginatedAdmins.length === 0 ? <div className="admin-item">No admins match the current filter.</div> : null}
                                        </div>
                                        <div className="admin-pagination">
                                            <div style={{ color: 'var(--text-muted)' }}>Showing 12 items per page</div>
                                            <div className="admin-pagination-buttons">
                                                <button type="button" className="admin-button secondary" disabled={adminsPage <= 1} onClick={() => setAdminsPage((page) => Math.max(1, page - 1))}>Previous</button>
                                                <span>Page {adminsPage} of {adminsTotalPages}</span>
                                                <button type="button" className="admin-button secondary" disabled={adminsPage >= adminsTotalPages} onClick={() => setAdminsPage((page) => Math.min(adminsTotalPages, page + 1))}>Next</button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : null}

                            {activeTab === 'logs' ? (
                                <div style={cardStyle}>
                                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 16 }}>Activity logs</div>
                                    <div className="admin-actions" style={{ marginBottom: 16 }}>
                                        <input
                                            style={{ ...inputStyle, maxWidth: 220 }}
                                            placeholder="Search activity"
                                            value={logFilter.query}
                                            onChange={(e) => setLogFilter((prev) => ({ ...prev, query: e.target.value }))}
                                        />
                                        <input
                                            style={{ ...inputStyle, maxWidth: 220 }}
                                            placeholder="Filter by action"
                                            value={logFilter.action}
                                            onChange={(e) => setLogFilter((prev) => ({ ...prev, action: e.target.value }))}
                                        />
                                        <input
                                            style={{ ...inputStyle, maxWidth: 220 }}
                                            placeholder="Filter by actor"
                                            value={logFilter.actor}
                                            onChange={(e) => setLogFilter((prev) => ({ ...prev, actor: e.target.value }))}
                                        />
                                    </div>
                                    <div className="admin-list">
                                        {paginatedLogs.map((log) => (
                                            <div key={log.id} className="admin-item">
                                                <div style={{ fontWeight: 700 }}>{log.action}</div>
                                                <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>{log.details}</div>
                                                <div style={{ color: 'var(--accent-gold)', marginTop: 6 }}>{log.actor}</div>
                                            </div>
                                        ))}
                                        {paginatedLogs.length === 0 ? <div className="admin-item">No logs match the current filters.</div> : null}
                                    </div>
                                    <div className="admin-pagination">
                                        <div style={{ color: 'var(--text-muted)' }}>Showing 12 items per page</div>
                                        <div className="admin-pagination-buttons">
                                            <button type="button" className="admin-button secondary" disabled={logsPage <= 1} onClick={() => setLogsPage((page) => Math.max(1, page - 1))}>Previous</button>
                                            <span>Page {logsPage} of {logsTotalPages}</span>
                                            <button type="button" className="admin-button secondary" disabled={logsPage >= logsTotalPages} onClick={() => setLogsPage((page) => Math.min(logsTotalPages, page + 1))}>Next</button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {activeTab === 'settings' ? (
                                <div style={{ display: 'grid', gap: 24 }}>
                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 24 }}>⚙️ {getTranslation(t, 'admin.generalSettings', 'General Settings')}</div>
                                        <div className="admin-form">
                                            <div>
                                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Organization Name</label>
                                                <input style={inputStyle} type="text" defaultValue="Centre Zad Al-Imane" />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Email</label>
                                                <input style={inputStyle} type="email" defaultValue="admin@masjid.com" />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Phone</label>
                                                <input style={inputStyle} type="tel" defaultValue="+1 (555) 000-0000" />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Address</label>
                                                <textarea style={{ ...inputStyle, minHeight: 80 }} defaultValue="123 Mosque Street, City, Country 12345" />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Website</label>
                                                <input style={inputStyle} type="url" defaultValue="https://masjid.example.com" />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Default Currency</label>
                                                <select style={inputStyle}>
                                                    <option>USD - US Dollar</option>
                                                    <option>EUR - Euro</option>
                                                    <option>GBP - British Pound</option>
                                                    <option>CAD - Canadian Dollar</option>
                                                    <option>AED - UAE Dirham</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Default Language</label>
                                                <select style={inputStyle}>
                                                    <option>English</option>
                                                    <option>العربية - Arabic</option>
                                                    <option>Français - French</option>
                                                    <option>Español - Spanish</option>
                                                </select>
                                            </div>
                                            <button type="button" className="admin-button">Save Changes</button>
                                        </div>
                                    </div>
                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 24 }}>🔐 Security</div>
                                        <div style={{ display: 'grid', gap: 16 }}>
                                            <div className="admin-item" style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>Two-Factor Authentication</div>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Protect your account with SMS or authenticator app</div>
                                                </div>
                                                <button type="button" className="admin-button secondary">Enable</button>
                                            </div>
                                            <div className="admin-item" style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>Session Timeout</div>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Auto-logout after 30 minutes of inactivity</div>
                                                </div>
                                                <select style={{ ...inputStyle, width: 120 }}>
                                                    <option>15 minutes</option>
                                                    <option selected>30 minutes</option>
                                                    <option>1 hour</option>
                                                    <option>2 hours</option>
                                                </select>
                                            </div>
                                            <div className="admin-item" style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>Login Activity</div>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Last login: Today at 2:30 PM from Chrome on macOS</div>
                                                </div>
                                                <button type="button" className="admin-button secondary">View All</button>
                                            </div>
                                            <div className="admin-item" style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>Active Sessions</div>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>3 active sessions across devices</div>
                                                </div>
                                                <button type="button" className="admin-button secondary">Manage</button>
                                            </div>
                                            <div className="admin-item" style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700 }}>Change Password</div>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Last changed 90 days ago</div>
                                                </div>
                                                <button type="button" className="admin-button secondary">Update</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 24 }}>📧 Email Notifications</div>
                                        <div style={{ display: 'grid', gap: 12 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                                                <span>New donor registrations</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                                                <span>New payments received</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                                                <span>Pending requests awaiting approval</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                <input type="checkbox" style={{ width: 18, height: 18 }} />
                                                <span>Daily activity digest</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                                                <span>System alerts and warnings</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {activeTab === 'payment' ? (
                                <div style={{ display: 'grid', gap: 24 }}>
                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 24 }}>💳 Payment Methods</div>
                                        <div style={{ display: 'grid', gap: 16 }}>
                                            <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 8, background: 'rgba(126, 184, 160, 0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: 16 }}>Stripe</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Stripe Inc. • Connected 3 days ago</div>
                                                        <div style={{ color: '#7EB8A0', fontSize: 14, marginTop: 8 }}>✓ Active and verified</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button type="button" className="admin-button secondary">Configure</button>
                                                        <button type="button" className="admin-button secondary">Disconnect</button>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                                                    <div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Account ID</div>
                                                        <div style={{ fontWeight: 700, marginTop: 4 }}>acct_1234567890</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Commission Rate</div>
                                                        <div style={{ fontWeight: 700, marginTop: 4 }}>2.9% + $0.30</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Volume (This Month)</div>
                                                        <div style={{ fontWeight: 700, marginTop: 4 }}>$12,450</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 8 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 16 }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: 16 }}>Bank Transfer</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Direct bank transfers • Configured</div>
                                                        <div style={{ color: '#7EB8A0', fontSize: 14, marginTop: 8 }}>✓ Active</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button type="button" className="admin-button secondary">Configure</button>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                                                    <div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Bank Account</div>
                                                        <div style={{ fontWeight: 700, marginTop: 4 }}>****1234</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Fees</div>
                                                        <div style={{ fontWeight: 700, marginTop: 4 }}>None</div>
                                                    </div>
                                                    <div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Volume (This Month)</div>
                                                        <div style={{ fontWeight: 700, marginTop: 4 }}>$8,230</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 8, opacity: 0.6 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: 16 }}>PayPal</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>PayPal Inc. • Not connected</div>
                                                    </div>
                                                    <button type="button" className="admin-button">Connect PayPal</button>
                                                </div>
                                            </div>

                                            <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 8, opacity: 0.6 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: 16 }}>Apple Pay</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Apple Inc. • Not connected</div>
                                                    </div>
                                                    <button type="button" className="admin-button">Connect Apple Pay</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 24 }}>📊 Payment Analytics</div>
                                        <div className="admin-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                                            <div style={{ padding: 16, background: 'rgba(126, 184, 160, 0.1)', borderRadius: 8 }}>
                                                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Total Volume</div>
                                                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>$45,230</div>
                                                <div style={{ color: '#7EB8A0', fontSize: 12, marginTop: 4 }}>↑ +12% from last month</div>
                                            </div>
                                            <div style={{ padding: 16, background: 'rgba(126, 184, 160, 0.1)', borderRadius: 8 }}>
                                                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Transactions</div>
                                                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>234</div>
                                                <div style={{ color: '#7EB8A0', fontSize: 12, marginTop: 4 }}>↑ +8 from yesterday</div>
                                            </div>
                                            <div style={{ padding: 16, background: 'rgba(126, 184, 160, 0.1)', borderRadius: 8 }}>
                                                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Avg Transaction</div>
                                                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>$193</div>
                                                <div style={{ color: '#7EB8A0', fontSize: 12, marginTop: 4 }}>Stable from last month</div>
                                            </div>
                                            <div style={{ padding: 16, background: 'rgba(126, 184, 160, 0.1)', borderRadius: 8 }}>
                                                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Success Rate</div>
                                                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>99.2%</div>
                                                <div style={{ color: '#7EB8A0', fontSize: 12, marginTop: 4 }}>↑ +0.5% from last month</div>
                                            </div>
                                        </div>

                                        <div style={{ paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                                            <div style={{ fontWeight: 700, marginBottom: 16 }}>Top Payment Methods (This Month)</div>
                                            <div style={{ display: 'grid', gap: 12 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                                    <span>Stripe Credit Card</span>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 700 }}>$28,450</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>149 transactions</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                                    <span>Bank Transfer</span>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 700 }}>$12,780</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>45 transactions</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12 }}>
                                                    <span>Stripe Other</span>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 700 }}>$4,000</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>40 transactions</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 24 }}>⚙️ Payment Settings</div>
                                        <div className="admin-form">
                                            <div>
                                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Minimum Donation Amount</label>
                                                <input style={inputStyle} type="number" defaultValue="5" />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Maximum Donation Amount</label>
                                                <input style={inputStyle} type="number" defaultValue="99999" />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Payment Confirmation Email</label>
                                                <select style={inputStyle}>
                                                    <option selected>Send to both donor and admins</option>
                                                    <option>Send only to donor</option>
                                                    <option>Send only to admins</option>
                                                    <option>Do not send</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                    <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                                                    <span>Allow recurring donations</span>
                                                </label>
                                            </div>
                                            <div>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                    <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                                                    <span>Require donor login for donations</span>
                                                </label>
                                            </div>
                                            <button type="button" className="admin-button">Save Settings</button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {activeTab === 'accounts' ? (
                                <div style={{ display: 'grid', gap: 24 }}>
                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 24 }}>👤 Your Account</div>
                                        <div className="admin-form">
                                            <div>
                                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Full Name</label>
                                                <input style={inputStyle} type="text" defaultValue="Administrator" />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Email Address</label>
                                                <input style={inputStyle} type="email" defaultValue="admin@masjid.com" />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Phone Number</label>
                                                <input style={inputStyle} type="tel" defaultValue="+1 (555) 000-0000" />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Role</label>
                                                <input style={{ ...inputStyle, background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }} type="text" defaultValue="Super Administrator" disabled />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>Status</label>
                                                <select style={inputStyle}>
                                                    <option selected>Active</option>
                                                    <option>Inactive</option>
                                                    <option>Suspended</option>
                                                </select>
                                            </div>
                                            <button type="button" className="admin-button">Update Profile</button>
                                        </div>
                                    </div>

                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 24 }}>🔐 Permission Settings</div>
                                        <div style={{ display: 'grid', gap: 16 }}>
                                            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                                                <div style={{ fontWeight: 700, marginBottom: 12 }}>Donor Management</div>
                                                <div style={{ display: 'grid', gap: 8, paddingLeft: 16 }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                        <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                                                        <span>View donor list</span>
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                        <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                                                        <span>Create/edit donors</span>
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                        <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                                                        <span>Delete donors</span>
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                        <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                                                        <span>View donor payments</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                                                <div style={{ fontWeight: 700, marginBottom: 12 }}>Financial Management</div>
                                                <div style={{ display: 'grid', gap: 8, paddingLeft: 16 }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                        <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                                                        <span>Record payments</span>
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                        <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                                                        <span>View payment reports</span>
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                        <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                                                        <span>Delete payments</span>
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                        <input type="checkbox" style={{ width: 18, height: 18 }} />
                                                        <span>Export financial data</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                                                <div style={{ fontWeight: 700, marginBottom: 12 }}>Admin Management</div>
                                                <div style={{ display: 'grid', gap: 8, paddingLeft: 16 }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                        <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                                                        <span>View admin list</span>
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                        <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                                                        <span>Create/edit admins</span>
                                                    </label>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                        <input type="checkbox" defaultChecked style={{ width: 18, height: 18 }} />
                                                        <span>Delete admins</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <button type="button" className="admin-button" style={{ marginTop: 20, width: '100%' }}>Save Permissions</button>
                                    </div>

                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 24 }}>📋 Active Sessions</div>
                                        <div style={{ display: 'grid', gap: 16 }}>
                                            <div style={{ padding: 16, border: '2px solid var(--accent-gold)', borderRadius: 8, background: 'rgba(218, 198, 118, 0.05)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700 }}>Current Session</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Chrome on macOS</div>
                                                    </div>
                                                    <span style={{ color: '#7EB8A0', fontSize: 12, fontWeight: 700 }}>ACTIVE</span>
                                                </div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                                    <div>IP Address: 192.168.1.100</div>
                                                    <div>Last active: Just now</div>
                                                </div>
                                            </div>

                                            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700 }}>Safari on iPhone</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>iOS 17.3</div>
                                                    </div>
                                                    <button type="button" className="admin-button secondary">Sign Out</button>
                                                </div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                                    <div>IP Address: 203.0.113.45</div>
                                                    <div>Last active: 2 hours ago</div>
                                                </div>
                                            </div>

                                            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
                                                    <div>
                                                        <div style={{ fontWeight: 700 }}>Firefox on Windows</div>
                                                        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Windows 11</div>
                                                    </div>
                                                    <button type="button" className="admin-button secondary">Sign Out</button>
                                                </div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                                    <div>IP Address: 198.51.100.42</div>
                                                    <div>Last active: Yesterday at 3:30 PM</div>
                                                </div>
                                            </div>
                                        </div>
                                        <button type="button" className="admin-button secondary" style={{ marginTop: 16, width: '100%' }}>Sign Out All Other Sessions</button>
                                    </div>
                                </div>
                            ) : null}

                            {activeTab === 'help' ? (
                                <div style={{ display: 'grid', gap: 24 }}>
                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 24 }}>❓ Frequently Asked Questions</div>
                                        <div style={{ display: 'grid', gap: 12 }}>
                                            <details style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                                <summary style={{ cursor: 'pointer', fontWeight: 700, paddingBottom: 8 }}>How do I add a new donor?</summary>
                                                <div style={{ color: 'var(--text-muted)', marginTop: 8, paddingLeft: 16 }}>
                                                    Go to the Donors tab and click the "Add Donor" button. Fill in the required information including name, email, and phone number. You can optionally set their pledge amount and add notes. Once saved, they'll receive a welcome email with login credentials.
                                                </div>
                                            </details>

                                            <details style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                                <summary style={{ cursor: 'pointer', fontWeight: 700, paddingBottom: 8 }}>How do I process a donation?</summary>
                                                <div style={{ color: 'var(--text-muted)', marginTop: 8, paddingLeft: 16 }}>
                                                    Select a donor from the Donors tab and click "View Details". In their profile, navigate to the Payment History section and click "Record Payment". Enter the donation amount, payment method, and payment date. You can also attach a receipt or confirmation document if available.
                                                </div>
                                            </details>

                                            <details style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                                <summary style={{ cursor: 'pointer', fontWeight: 700, paddingBottom: 8 }}>How do I manage admin accounts?</summary>
                                                <div style={{ color: 'var(--text-muted)', marginTop: 8, paddingLeft: 16 }}>
                                                    Go to the Admins tab to create, edit, or remove administrator accounts. You can assign different permission levels to each admin, controlling what they can see and modify. Super Administrators have full access to all features and settings.
                                                </div>
                                            </details>

                                            <details style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                                <summary style={{ cursor: 'pointer', fontWeight: 700, paddingBottom: 8 }}>How do I view activity logs?</summary>
                                                <div style={{ color: 'var(--text-muted)', marginTop: 8, paddingLeft: 16 }}>
                                                    Visit the Activity Logs tab to see all system activity including user logins, donor changes, payments, and admin actions. You can filter logs by action type, actor, date range, or specific donor to track specific changes.
                                                </div>
                                            </details>

                                            <details style={{ paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                                <summary style={{ cursor: 'pointer', fontWeight: 700, paddingBottom: 8 }}>Can I export donor data?</summary>
                                                <div style={{ color: 'var(--text-muted)', marginTop: 8, paddingLeft: 16 }}>
                                                    Yes! In the Donors tab, you'll find an "Export" button that allows you to download all donor information as a CSV or Excel file. This includes contact details, payment history, and engagement records.
                                                </div>
                                            </details>

                                            <details style={{ paddingBottom: 12 }}>
                                                <summary style={{ cursor: 'pointer', fontWeight: 700, paddingBottom: 8 }}>What payment methods are supported?</summary>
                                                <div style={{ color: 'var(--text-muted)', marginTop: 8, paddingLeft: 16 }}>
                                                    We currently support Stripe (credit/debit cards), direct bank transfers, and can be extended to support PayPal, Apple Pay, and other payment gateways. You can enable or disable payment methods from the Payment settings.
                                                </div>
                                            </details>
                                        </div>
                                    </div>

                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 24 }}>📚 Getting Started Guide</div>
                                        <div style={{ display: 'grid', gap: 16 }}>
                                            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                                                <div style={{ fontWeight: 700, marginBottom: 8 }}>Step 1: Set Up Your Organization</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Go to Settings and configure your organization details, payment methods, and email notifications.</div>
                                            </div>
                                            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                                                <div style={{ fontWeight: 700, marginBottom: 8 }}>Step 2: Invite Your Team</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>In the Accounts tab, create admin accounts for your team members with appropriate permission levels.</div>
                                            </div>
                                            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                                                <div style={{ fontWeight: 700, marginBottom: 8 }}>Step 3: Import Donors</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Add your donors individually or bulk import using CSV. Set their pledge amounts and engagement preferences.</div>
                                            </div>
                                            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                                                <div style={{ fontWeight: 700, marginBottom: 8 }}>Step 4: Start Tracking Payments</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Record incoming donations and track them against donors' pledges. Generate reports to monitor progress.</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 24 }}>📞 Contact & Support</div>
                                        <div style={{ display: 'grid', gap: 16 }}>
                                            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                                                <div style={{ fontWeight: 700, marginBottom: 8 }}>📧 Email Support</div>
                                                <div style={{ color: 'var(--accent-gold)', fontSize: 14 }}>support@masjid.com</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>Average response time: 24 hours</div>
                                            </div>
                                            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                                                <div style={{ fontWeight: 700, marginBottom: 8 }}>📱 Live Chat</div>
                                                <div style={{ color: 'var(--accent-gold)', fontSize: 14 }}>Available Monday-Friday, 9 AM - 5 PM</div>
                                                <button type="button" className="admin-button secondary" style={{ marginTop: 8, width: '100%' }}>Start Chat</button>
                                            </div>
                                            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                                                <div style={{ fontWeight: 700, marginBottom: 8 }}>📖 Documentation</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>Comprehensive guides and tutorials for all features</div>
                                                <button type="button" className="admin-button secondary" style={{ width: '100%' }}>Read Documentation →</button>
                                            </div>
                                            <div style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
                                                <div style={{ fontWeight: 700, marginBottom: 8 }}>🐛 Report an Issue</div>
                                                <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 8 }}>Found a bug? Let us know so we can fix it</div>
                                                <button type="button" className="admin-button" style={{ width: '100%' }}>Submit Bug Report</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div style={cardStyle}>
                                        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, marginBottom: 24 }}>ℹ️ System Information</div>
                                        <div style={{ display: 'grid', gap: 12 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Application Version</span>
                                                <strong>1.0.0 (Build 2026.03.15)</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Last Updated</span>
                                                <strong>March 15, 2026</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Database</span>
                                                <strong>Connected ✓</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>API Status</span>
                                                <strong style={{ color: '#7EB8A0' }}>Operational ✓</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Uptime (30 days)</span>
                                                <strong style={{ color: '#7EB8A0' }}>99.9%</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Total Donors</span>
                                                <strong>1,234</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Total Donations</span>
                                                <strong>$234,567.89</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>Overall System Status</span>
                                                <strong style={{ color: '#7EB8A0' }}>All Systems Online ✓</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </section>
                    </div>
                </>
            </main>

            <AddDonorModal
                isOpen={isAddDonorModalOpen}
                onClose={() => setIsAddDonorModalOpen(false)}
                onSubmit={handleAddDonor}
                formData={addDonorForm}
                setFormData={setAddDonorForm}
                loading={addDonorLoading}
                inputStyle={inputStyle}
                cardStyle={{
                    ...cardStyle,
                    position: 'relative',
                    zIndex: 1000,
                }}
            />

            <Footer t={t} />
        </div>
    );
}
