'use client';

import './admin.scss';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SitePreloader from '@/components/SitePreloader.jsx';
import AdminSidebar from '@/components/AdminSidebar.jsx';
import { useTranslation, useThemeMode } from '@/hooks/index.js';
import { useFirstVisitPreloader } from '@/hooks/useFirstVisitPreloader.js';
import { THEMES } from '@/constants/config.js';
import { setupSEOMetaTags } from '@/lib/seoUtils.js';
import { getAbsoluteUrl, getSiteUrl, truncateText } from '@/lib/translationUtils.js';
import {
    approveRequest,
    createDonor,
    createAdmin,
    deleteDonorPayment,
    declineRequest,
    getDonor,
    getDonorPayments,
    getLogs,
    getStats,
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
import { clearStoredSession, getStoredSession } from '@/lib/session.js';
import { startTokenRefreshManager, stopTokenRefreshManager } from '@/lib/tokenRefreshManager.js';
import PaymentPanel from './PaymentPanel.jsx';

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
    const [stats, setStats] = useState({ totalDonors: 0, totalRaised: 0, activeEngagements: 0, pendingRequests: 0 });
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

            if (results.every(r => r.status === 'rejected')) {
                throw new Error('Unable to load dashboard data.');
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
                        setError('Your session has expired. Please log in again.');
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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTab = localStorage.getItem('adminActiveTab');
            if (savedTab && ['overview', 'requests', 'imports', 'admins', 'logs', 'accounts'].includes(savedTab)) {
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
    const paginatedAdmins = useMemo(() => {
        const start = (adminsPage - 1) * 12;
        return filteredAdmins.slice(start, start + 12);
    }, [filteredAdmins, adminsPage]);
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
            setMessage(`Request ${status}.`);
        } catch (err) {
            setError(err?.message || 'Unable to update request.');
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
                setError('Could not parse amount. Use "To Review" to approve manually.');
                if (inModal) setModalError('Could not parse amount. Use "To Review" to approve manually.');
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
            setError('Select a donor first.');
            setModalError('Select a donor first.');
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
                throw new Error('Password must be at least 8 characters.');
            }
                if (hasPasswordChange && nextPassword !== selectedDonorPasswordConfirm.trim()) {
                    throw new Error('Passwords do not match.');
                }
            if (isActivatingAccount && !hasPasswordChange) {
                throw new Error('Set a password when activating an account.');
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
                setModalMessage('Donor profile and password updated.');
                setMessage('Donor profile and password updated.');
            } else if (hasPasswordChange) {
                setModalMessage('Donor password updated.');
                setMessage('Donor password updated.');
            } else {
                setModalMessage('Donor profile/account status updated.');
                setMessage('Donor profile/account status updated.');
            }
        } catch (err) {
            setModalError(err?.message || 'Unable to update donor.');
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

    function closeProfileModal() {
        setIsProfileModalOpen(false);
        setModalError('');
        setModalMessage('');
        setSelectedDonorPassword('');
            setSelectedDonorPasswordConfirm('');
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
            setModalError(err?.message || 'Unable to load donor details.');
            setError(err?.message || 'Unable to load donor details.');
            return null;
        } finally {
            setSelectedDonorLoading(false);
        }
    }

    async function openProfileModal(donorId) {
        setIsPaymentsModalOpen(false);
        setIsProfileModalOpen(true);
        await loadSelectedDonorData(donorId);
    }

    async function openPaymentsModal(donorId) {
        setIsProfileModalOpen(false);
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
            setError('Amount, method, and date are required.');
            setModalError('Amount, method, and date are required.');
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

            setModalMessage('Payment recorded successfully.');
            setMessage('Payment recorded successfully.');

            // Reload all data with error handling
            try {
                await loadAllData();
            } catch (err) {
                console.error('Error reloading dashboard data:', err);
                // Don't throw - allow UI to remain responsive
            }
        } catch (err) {
            setModalError(err?.message || 'Unable to record payment.');
            setError(err?.message || 'Unable to record payment.');
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
            setModalMessage('Payment updated successfully.');
            setMessage('Payment updated successfully.');
            await loadAllData();
        } catch (err) {
            const isMissingRoute = err?.status === 404 && String(err?.message || '').toLowerCase().includes('route put');
            const modalErr =
                isMissingRoute
                    ? 'Payment update route is missing on the running backend. Restart/redeploy backend so latest admin payment routes are loaded.'
                    : (err?.message || 'Unable to update payment.');
            setModalError(modalErr);
            setError(
                isMissingRoute
                    ? 'Payment update route is missing on the running backend. Restart/redeploy backend so latest admin payment routes are loaded.'
                    : (err?.message || 'Unable to update payment.')
            );
            throw err;
        } finally {
            setSelectedDonorSaving(false);
        }
    }

    async function handleDeletePayment(paymentId) {
        if (!selectedDonorId) return;
        if (typeof window !== 'undefined' && !window.confirm('Delete this payment record?')) {
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
            setModalMessage('Payment removed successfully.');
            setMessage('Payment removed successfully.');
            await loadAllData();
        } catch (err) {
            const isMissingRoute = err?.status === 404 && String(err?.message || '').toLowerCase().includes('route delete');
            const modalErr =
                isMissingRoute
                    ? 'Payment delete route is missing on the running backend. Restart/redeploy backend so latest admin payment routes are loaded.'
                    : (err?.message || 'Unable to remove payment.');
            setModalError(modalErr);
            setError(
                isMissingRoute
                    ? 'Payment delete route is missing on the running backend. Restart/redeploy backend so latest admin payment routes are loaded.'
                    : (err?.message || 'Unable to remove payment.')
            );
            throw err;
        } finally {
            setSelectedDonorSaving(false);
        }
    }

    async function handleAddNewDonor(event) {
        event.preventDefault();
        const creatingActiveAccount = Boolean(newDonorForm.accountCreated);

        if (creatingActiveAccount && !newDonorForm.password.trim()) {
            setError('Password is required for an active donor account.');
            setModalError('Password is required for an active donor account.');
            return;
        }

        if (creatingActiveAccount && newDonorForm.password.length < 8) {
            setError('Password must be at least 8 characters.');
            setModalError('Password must be at least 8 characters.');
            return;
        }

        if (creatingActiveAccount && newDonorForm.password !== newDonorForm.passwordConfirm) {
            setError('Passwords do not match.');
            setModalError('Passwords do not match.');
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
                ...(creatingActiveAccount && { password: newDonorForm.password }),
                ...(newDonorForm.pledgeAmount && { pledgeAmount: Number(newDonorForm.pledgeAmount) }),
            });
            setNewDonorForm({ name: '', email: '', password: '', passwordConfirm: '', pledgeAmount: '', accountCreated: true });
            setIsAddDonorModalOpen(false);
            await loadAllData();
            setMessage(
                creatingActiveAccount
                    ? '✅ Donor account created. A welcome email has been sent.'
                    : '✅ Placeholder donor created. The donor can activate their account later.'
            );
        } catch (err) {
            setModalError(err?.message || 'Unable to create donor.');
            setError(err?.message || 'Unable to create donor.');
        } finally {
            setNewDonorSaving(false);
        }
    }

    async function handleUpdateEngagement() {
        if (!selectedDonorId) return;
        const pledge = Number(selectedDonorEngagementForm.totalPledge);
        if (!pledge || pledge <= 0) {
            setError('Enter a valid pledge amount greater than 0.');
            setModalError('Enter a valid pledge amount greater than 0.');
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
            setModalMessage('Engagement updated successfully.');
            setMessage('Engagement updated successfully.');
        } catch (err) {
            setModalError(err?.message || 'Unable to update engagement.');
            setError(err?.message || 'Unable to update engagement.');
        } finally {
            setSelectedDonorSaving(false);
        }
    }

    async function handleImportCsv(event) {
        event.preventDefault();
        setError('');
        setMessage('');

        if (!csvFile) {
            setError('Please choose a CSV file first.');
            return;
        }

        setCsvImportLoading(true);
        setCsvUploadProgress(0);
        try {
            const summary = await importDonationsCsv(csvFile, {
                onProgress: (pct) => setCsvUploadProgress(pct),
            });
            setCsvImportSummary(summary);
            setMessage(
                `CSV import completed: ${summary.importedPayments} payment(s) imported, ${summary.createdDonors} donor(s) created, ${summary.failedRows} failed row(s).`
            );
            await loadAllData();
        } catch (err) {
            setError(err?.message || 'CSV import failed.');
        } finally {
            setCsvImportLoading(false);
            setCsvUploadProgress(null);
        }
    }

    if (!appReady && shouldShowPreloader && preloaderResolved) {
        return (
            <div className="mosque-donation admin-preloader-shell" data-theme="dark">
                <SitePreloader title="Centre Zad Al-Imane" subtitle="Loading admin dashboard" />
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
                            <div className="admin-loading-title">
                                Loading dashboard...
                            </div>
                        </div>
                    </div>
                ) : null}
                <>
                    {error ? <div className="admin-alert error">{error}</div> : null}
                    {message ? <div className="admin-alert success">{message}</div> : null}
                    {isAddDonorModalOpen ? (
                        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label="Add new donor">
                            <div className="admin-modal admin-modal--sm">
                                <div className="admin-modal-header">
                                    <div>
                                        <div className="admin-section-title admin-section-title--lg">➕ Add New Donor</div>
                                        <div className="admin-muted">
                                            Choose whether to create an active donor account or a placeholder donor record.
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
                                        ✕ Close
                                    </button>
                                </div>
                                {modalError ? <div className="admin-alert error">{modalError}</div> : null}
                                {modalMessage ? <div className="admin-alert success">{modalMessage}</div> : null}
                                <form className="admin-form" onSubmit={handleAddNewDonor}>
                                    <div>
                                        <label className="admin-label">👤 Full Name *</label>
                                        <input
                                            className="admin-input"
                                            placeholder="Full name"
                                            value={newDonorForm.name}
                                            onChange={(e) => setNewDonorForm((p) => ({ ...p, name: e.target.value }))}
                                            required
                                            disabled={newDonorSaving}
                                            minLength={2}
                                        />
                                    </div>
                                    <div>
                                        <label className="admin-label">📧 Email Address *</label>
                                        <input
                                            className="admin-input"
                                            type="email"
                                            placeholder="donor@example.com"
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
                                            Create active account (donor can log in immediately)
                                        </label>
                                    </div>
                                    <div>
                                        <label className="admin-label">🔒 Password * (min 8 characters)</label>
                                        <input
                                            className="admin-input"
                                            type="password"
                                            placeholder={newDonorForm.accountCreated ? 'Password' : 'Not required for placeholder donor'}
                                            value={newDonorForm.password}
                                            onChange={(e) => setNewDonorForm((p) => ({ ...p, password: e.target.value }))}
                                            required={Boolean(newDonorForm.accountCreated)}
                                            disabled={newDonorSaving}
                                            minLength={8}
                                        />
                                    </div>
                                    <div>
                                        <label className="admin-label">🔒 Confirm Password *</label>
                                        <input
                                            className="admin-input"
                                            type="password"
                                            placeholder={newDonorForm.accountCreated ? 'Confirm password' : 'Not required for placeholder donor'}
                                            value={newDonorForm.passwordConfirm}
                                            onChange={(e) => setNewDonorForm((p) => ({ ...p, passwordConfirm: e.target.value }))}
                                            required={Boolean(newDonorForm.accountCreated)}
                                            disabled={newDonorSaving}
                                            minLength={8}
                                        />
                                    </div>
                                    <div>
                                        <label className="admin-label">🤝 Pledge Amount (optional)</label>
                                        <input
                                            className="admin-input"
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            placeholder="e.g. 1000"
                                            value={newDonorForm.pledgeAmount}
                                            onChange={(e) => setNewDonorForm((p) => ({ ...p, pledgeAmount: e.target.value }))}
                                            disabled={newDonorSaving}
                                        />
                                    </div>
                                    <button type="submit" className="admin-button" disabled={newDonorSaving}>
                                        {newDonorSaving
                                            ? 'Creating donor...'
                                            : (newDonorForm.accountCreated ? '➕ Create Donor & Send Welcome Email' : '➕ Create Placeholder Donor')}
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : null}
                    {isProfileModalOpen ? (
                        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit donor profile">
                            <div className="admin-modal admin-modal--profile">
                                <div className="admin-modal-header">
                                    <div>
                                        <div className="admin-section-title admin-section-title--lg">
                                            ✏️ {selectedDonor ? selectedDonor.name : 'Edit profile'}
                                        </div>
                                        <div className="admin-muted">
                                            Update donor profile, engagement and password.
                                        </div>
                                    </div>
                                    <button type="button" className="admin-button secondary" onClick={closeProfileModal}>
                                        ✕ Close
                                    </button>
                                </div>
                                {modalError ? <div className="admin-alert error">{modalError}</div> : null}
                                {modalMessage ? <div className="admin-alert success">{modalMessage}</div> : null}
                                <div>
                                    {selectedDonorLoading ? <div>Loading donor details...</div> : null}
                                    {!selectedDonorLoading && !selectedDonor ? (
                                        <div className="admin-muted">We could not load this donor. Please try again.</div>
                                    ) : null}
                                    {!selectedDonorLoading && selectedDonor ? (
                                        <div className="admin-stack admin-stack--lg">
                                            <form className="admin-form" onSubmit={handleUpdateSelectedDonor}>
                                                <div className="admin-section-title admin-section-title--sm">👤 Profile</div>
                                                <div>
                                                    <label className="admin-label">Full Name</label>
                                                    <input
                                                        className="admin-input"
                                                        placeholder="Full name"
                                                        value={selectedDonorForm.name}
                                                        onChange={(e) => setSelectedDonorForm((prev) => ({ ...prev, name: e.target.value }))}
                                                        disabled={selectedDonorSaving}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="admin-label">📧 Email</label>
                                                    <input
                                                        className="admin-input"
                                                        type="email"
                                                        placeholder="Email address"
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
                                                        Active donor account (login enabled)
                                                    </label>
                                                    <div className="admin-field-help">
                                                        If enabling this for a placeholder donor, set a password below.
                                                    </div>
                                                </div>
                                                <div className="admin-divider-top">
                                                    <div className="admin-section-title admin-section-title--sm">🔒 Change Password (optional)</div>
                                                    <div className="admin-stack">
                                                        <input
                                                            className="admin-input"
                                                            type="password"
                                                            placeholder="New password (min 8 chars)"
                                                            value={selectedDonorPassword}
                                                            onChange={(e) => setSelectedDonorPassword(e.target.value)}
                                                            disabled={selectedDonorSaving}
                                                            minLength={8}
                                                        />
                                                        <input
                                                            className="admin-input"
                                                            type="password"
                                                            placeholder="Confirm new password"
                                                            value={selectedDonorPasswordConfirm}
                                                            onChange={(e) => setSelectedDonorPasswordConfirm(e.target.value)}
                                                            disabled={selectedDonorSaving}
                                                        />
                                                    </div>
                                                </div>
                                                <button type="submit" className="admin-button" disabled={selectedDonorSaving}>
                                                    {selectedDonorSaving ? 'Saving...' : '✅ Save Profile Changes'}
                                                </button>
                                            </form>
                                            <div className="admin-divider-top">
                                                <div className="admin-section-title admin-section-title--sm">🤝 Engagement (Pledge Amount)</div>
                                                <div className="admin-stack">
                                                    <div>
                                                        <label className="admin-label">
                                                            Current pledge: ${Number(selectedDonor.engagement?.totalPledge || 0).toLocaleString()}
                                                        </label>
                                                        <input
                                                            className="admin-input"
                                                            type="number"
                                                            min="1"
                                                            step="0.01"
                                                            placeholder="New pledge amount"
                                                            value={selectedDonorEngagementForm.totalPledge}
                                                            onChange={(e) => setSelectedDonorEngagementForm({ totalPledge: e.target.value })}
                                                            disabled={selectedDonorSaving}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="admin-button secondary"
                                                        disabled={selectedDonorSaving || !selectedDonorEngagementForm.totalPledge}
                                                        onClick={handleUpdateEngagement}
                                                    >
                                                        {selectedDonorSaving ? 'Saving...' : '🤝 Update Engagement'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ) : null}
                    {isPaymentsModalOpen ? (
                        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label="Payment history">
                            <div className="admin-modal admin-modal--lg">
                                <div className="admin-modal-header">
                                    <div>
                                        <div className="admin-section-title admin-section-title--lg">
                                            {selectedDonor ? `${selectedDonor.name} payment history` : 'Payment history'}
                                        </div>
                                        <div className="admin-muted mt-sm">
                                            Add, edit, and remove donor payments.
                                        </div>
                                    </div>
                                    <button type="button" className="admin-button secondary" onClick={closePaymentsModal}>
                                        Close
                                    </button>
                                </div>
                                {modalError ? <div className="admin-alert error">{modalError}</div> : null}
                                {modalMessage ? <div className="admin-alert success">{modalMessage}</div> : null}
                                {selectedDonorLoading ? <div>Loading donor payments...</div> : null}
                                {!selectedDonorLoading && !selectedDonor ? (
                                    <div className="admin-muted">
                                        We could not load this donor yet. Please try again.
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
                        <div className="admin-modal-backdrop" role="dialog" aria-modal="true" aria-label="Review request">
                            <div className="admin-modal admin-modal--md">
                                <div className="admin-modal-header">
                                    <div>
                                        <div className="admin-section-title">
                                            👁️ Review Request
                                        </div>
                                        <div className="admin-muted mt-sm admin-text-capitalize">
                                            {requestDecisionModal.request?.type?.replace(/_/g, ' ') || ''}
                                        </div>
                                    </div>
                                    <button type="button" className="admin-button secondary" onClick={closeRequestDecision}>
                                        ✕ Close
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
                                    Status: <span className="admin-text-capitalize">{requestDecisionModal.request?.status?.replace(/_/g, ' ')}</span>
                                </div>
                                {requestDecisionModal.request?.message ? (
                                    <div className="admin-surface admin-surface--message">
                                        {requestDecisionModal.request.message}
                                    </div>
                                ) : null}

                                {/* Type-specific info panels */}
                                {requestDecisionModal.request?.type === 'payment_upload' && (
                                    <div className="admin-surface admin-surface--warn">
                                        <div className="admin-field-help admin-field-help--spaced admin-field-help--strong">💵 Payment that will be recorded on approval:</div>
                                        <div>
                                            <strong>Amount:</strong>{' '}
                                            {parsePaymentAmount(requestDecisionModal.request?.message)
                                                ? `$${parsePaymentAmount(requestDecisionModal.request?.message).toLocaleString()}`
                                                : <span className="admin-error-text">⚠️ Could not parse — please check the message</span>}
                                        </div>
                                        <div><strong>Method:</strong> Cash</div>
                                        <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
                                    </div>
                                )}
                                {requestDecisionModal.request?.type === 'account_creation' && (
                                    <div className="admin-surface admin-surface--success admin-muted admin-muted--md">
                                        <strong>👤 Approval will:</strong> create a donor account, generate a temporary password, and email it to the donor with instructions to change it on first login.
                                    </div>
                                )}
                                {requestDecisionModal.request?.type === 'engagement_change' && (
                                    <div className="admin-surface admin-surface--info admin-muted admin-muted--md">
                                        <strong>🔔 This is a notification of an engagement/pledge change.</strong> Clicking "Received" logs the acknowledgement. Update the pledge amount from the donor's profile if needed.
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
                                            {requestDecisionModal.approving ? 'Processing…' : '✓ Received notification'}
                                        </button>
                                            ) : null}
                                            {request?.type !== 'engagement_change' && canApprove ? (
                                                <button
                                                    type="button"
                                                    className="admin-button"
                                                    disabled={requestDecisionModal.approving || requestDecisionModal.declining || requestDecisionModal.holding}
                                                    onClick={handleApproveFromModal}
                                                >
                                                    {requestDecisionModal.approving ? 'Approving…' : (request?.type === 'account_creation' ? '✅ Approve & Create Account' : '✅ Approve')}
                                                </button>
                                            ) : null}
                                            {canHold ? (
                                                <button
                                                    type="button"
                                                    className="admin-button secondary"
                                                    disabled={requestDecisionModal.approving || requestDecisionModal.declining || requestDecisionModal.holding}
                                                    onClick={handleHoldFromModal}
                                                >
                                                    {requestDecisionModal.holding ? 'Holding…' : '⏸️ On Hold'}
                                                </button>
                                            ) : null}
                                            {canDecline ? (
                                                <button
                                                    type="button"
                                                    className="admin-button danger"
                                                    disabled={requestDecisionModal.approving || requestDecisionModal.declining || requestDecisionModal.holding}
                                                    onClick={handleDeclineFromModal}
                                                >
                                                    {requestDecisionModal.declining ? 'Declining…' : '❌ Decline'}
                                                </button>
                                            ) : null}
                                            {!canApprove && !canHold && !canDecline ? (
                                                <div className="admin-muted admin-muted--md">
                                                    This request has no further available actions.
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
                        />

                        <section className="admin-page-section">
                            {activeTab === 'overview' ? (
                                <>
                                    <div className="admin-card">
                                        <div className="admin-section-title">📊 Overview</div>
                                        <div className="admin-grid admin-grid--4cols">
                                            <div className="admin-stat"><div className="admin-muted">Total Donors</div><div className="admin-value-lg">{stats.totalDonors}</div></div>
                                            <div className="admin-stat"><div className="admin-muted">Total Raised</div><div className="admin-value-lg">${Number(stats.totalRaised || 0).toLocaleString()}</div></div>
                                            <div className="admin-stat"><div className="admin-muted">Active Engagements</div><div className="admin-value-lg">{stats.activeEngagements}</div></div>
                                            <div className="admin-stat"><div className="admin-muted">Pending Requests</div><div className="admin-value-lg">{stats.pendingRequests}</div></div>
                                        </div>
                                    </div>

                                    <div className="admin-card">
                                        <div className="admin-section-title">👥 Donors Progress</div>
                                        <div className="admin-search-row">
                                            <button
                                                type="button"
                                                className="admin-button"
                                                onClick={() => setIsAddDonorModalOpen(true)}
                                            >
                                                ➕ Add New Donor
                                            </button>
                                            <input
                                                className="admin-input admin-input--max-280"
                                                placeholder="🔎 Search by name"
                                                value={donorFilter.nameQuery}
                                                onChange={(e) => setDonorFilter((prev) => ({ ...prev, nameQuery: e.target.value }))}
                                            />
                                            <input
                                                className="admin-input admin-input--max-280"
                                                placeholder="📧 Search by email"
                                                value={donorFilter.emailQuery}
                                                onChange={(e) => setDonorFilter((prev) => ({ ...prev, emailQuery: e.target.value }))}
                                            />
                                            <input
                                                className="admin-input admin-input--max-220"
                                                placeholder="🤝 Search by pledge"
                                                value={donorFilter.engagementQuery}
                                                onChange={(e) => setDonorFilter((prev) => ({ ...prev, engagementQuery: e.target.value }))}
                                            />
                                        </div>
                                        <div className="admin-table-wrap">
                                            <table className="admin-table">
                                                <thead>
                                                    <tr>
                                                        <th>Full Name</th>
                                                        <th>Email</th>
                                                        <th>Engagement</th>
                                                        <th>Paid</th>
                                                        <th>Progress</th>
                                                        <th>Edit Profile</th>
                                                        <th>Payment History</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paginatedTopDonors.map((donor) => {
                                                        const pledge = Number(donor.engagement?.totalPledge || 0);
                                                        const paid = Number(donor.paidAmount || 0);
                                                        const progress = pledge > 0 ? Math.min(100, Math.round((paid / pledge) * 100)) : 0;
                                                        return (
                                                            <tr key={donor.id}>
                                                                <td className="admin-item-title">👤 {donor.name || 'Unknown donor'}</td>
                                                                <td className="admin-table-cell-muted">📧 {donor.email || '-'}</td>
                                                                <td>${pledge.toLocaleString()}</td>
                                                                <td>${paid.toLocaleString()}</td>
                                                                <td>
                                                                    <div className="admin-table-progress">
                                                                        <div className="admin-chart-track">
                                                                            <div className="admin-chart-fill" style={{ width: `${progress}%` }}></div>
                                                                        </div>
                                                                        <span className="admin-table-cell-muted">{progress}%</span>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div className="admin-table-actions">
                                                                        <button
                                                                            type="button"
                                                                            className="admin-button"
                                                                            onClick={() => openProfileModal(donor.id)}
                                                                        >
                                                                            ✏️ Edit
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div className="admin-table-actions">
                                                                        <button
                                                                            type="button"
                                                                            className="admin-button secondary"
                                                                            onClick={() => openPaymentsModal(donor.id)}
                                                                        >
                                                                            🧾 Payment history
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                    {paginatedTopDonors.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={7} className="admin-table-cell-muted">
                                                                No donors found.
                                                            </td>
                                                        </tr>
                                                    ) : null}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="admin-pagination">
                                            <div className="admin-per-page">
                                                <span>Rows per page:</span>
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
                                                <button type="button" className="admin-button secondary" disabled={topDonorsPage <= 1} onClick={() => setTopDonorsPage((page) => Math.max(1, page - 1))}>⬅️ Previous</button>
                                                <span>Page {topDonorsPage} of {topDonorsTotalPages}</span>
                                                <button type="button" className="admin-button secondary" disabled={topDonorsPage >= topDonorsTotalPages} onClick={() => setTopDonorsPage((page) => Math.min(topDonorsTotalPages, page + 1))}>Next ➡️</button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : null}

                            {activeTab === 'requests' ? (
                                <div className="admin-card">
                                    <div className="admin-section-title">📨 Requests</div>
                                    <div className="admin-grid admin-grid--4cols mb-md">
                                        <div className="admin-stat">
                                            <div className="admin-muted">Open Requests</div>
                                            <div className="admin-value-lg">{requestStats.open}</div>
                                        </div>
                                        <div className="admin-stat">
                                            <div className="admin-muted">Payment Requests</div>
                                            <div className="admin-value-lg">{requestStats.paymentRequests}</div>
                                        </div>
                                        <div className="admin-stat">
                                            <div className="admin-muted">Account Requests</div>
                                            <div className="admin-value-lg">{requestStats.accountRequests}</div>
                                        </div>
                                        <div className="admin-stat">
                                            <div className="admin-muted">Reviewed</div>
                                            <div className="admin-value-lg">{requestStats.reviewed}</div>
                                        </div>
                                    </div>
                                    <div className="admin-search-row">
                                        <input
                                            className="admin-input admin-input--max-220"
                                            placeholder="🔎 Search requests"
                                            value={requestFilter.query}
                                            onChange={(e) => setRequestFilter((prev) => ({ ...prev, query: e.target.value }))}
                                        />
                                        <select
                                            className="admin-input admin-input--max-180"
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
                                            className="admin-input admin-input--max-180"
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
                                    <div className="admin-table-wrap">
                                        <table className="admin-table">
                                            <thead>
                                                <tr>
                                                    <th>Requester</th>
                                                    <th>Type</th>
                                                    <th>Status</th>
                                                    <th>Message</th>
                                                    <th>Attachment</th>
                                                    <th>Date</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paginatedRequests.map((request) => {
                                                    const isProcessing = processingRequestId === request.id;
                                                    const { canApprove, canHold, canDecline } = getRequestActionCapabilities(request);
                                                    return (
                                                        <tr key={request.id}>
                                                            <td>
                                                                <div className="admin-item-title">👤 {request.name || 'Unknown'}</div>
                                                                <div className="admin-table-cell-muted mt-sm">📧 {request.email}</div>
                                                            </td>
                                                            <td style={{ textTransform: 'capitalize' }}>{(request.type || '').replace(/_/g, ' ')}</td>
                                                            <td>
                                                                <span className={`admin-chip status-${request.status}`} style={{ textTransform: 'capitalize' }}>{(request.status || '').replace(/_/g, ' ')}</span>
                                                            </td>
                                                            <td className="admin-table-cell-muted">{truncateText(request.message || 'No note provided.', 90)}</td>
                                                            <td>
                                                                {request.attachments?.length ? (
                                                                    <a href={getRequestAttachmentUrl(request)} target="_blank" rel="noreferrer" className="login-inline-link">
                                                                        📎 View ({request.attachments.length})
                                                                    </a>
                                                                ) : (
                                                                    <span className="admin-table-cell-muted">No file</span>
                                                                )}
                                                            </td>
                                                            <td className="admin-table-cell-muted">{request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '-'}</td>
                                                            <td>
                                                                <div className="admin-table-actions">
                                                                    {canApprove ? (
                                                                        request.type === 'engagement_change' ? (
                                                                            <button
                                                                                type="button"
                                                                                className="admin-button secondary"
                                                                                disabled={isProcessing}
                                                                                onClick={() => handleRequestAction(request.id, 'approved')}
                                                                            >
                                                                                {isProcessing ? '…' : '✓ Received'}
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
                                                                                {isProcessing ? '…' : (request.type === 'account_creation' ? '✅ Approve & Create' : '✅ Approve')}
                                                                            </button>
                                                                        )
                                                                    ) : null}
                                                                    {canHold ? (
                                                                        <button type="button" className="admin-button secondary" disabled={isProcessing} onClick={() => handleRequestAction(request.id, 'on_hold')}>
                                                                            {isProcessing ? '…' : '⏸️ On Hold'}
                                                                        </button>
                                                                    ) : null}
                                                                    {canDecline ? (
                                                                        <button type="button" className="admin-button danger" disabled={isProcessing} onClick={() => handleRequestAction(request.id, 'declined')}>
                                                                            {isProcessing ? '…' : '❌ Decline'}
                                                                        </button>
                                                                    ) : null}
                                                                    <button type="button" className="admin-button secondary" disabled={isProcessing} onClick={() => openRequestDecision(request)}>
                                                                        👁️ To Review
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {paginatedRequests.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={7} className="admin-table-cell-muted">No requests match the current filters.</td>
                                                    </tr>
                                                ) : null}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="admin-pagination">
                                        <div className="admin-muted">Showing 12 items per page</div>
                                        <div className="admin-pagination-buttons">
                                            <button type="button" className="admin-button secondary" disabled={requestsPage <= 1} onClick={() => setRequestsPage((page) => Math.max(1, page - 1))}>Previous</button>
                                            <span>Page {requestsPage} of {requestsTotalPages}</span>
                                            <button type="button" className="admin-button secondary" disabled={requestsPage >= requestsTotalPages} onClick={() => setRequestsPage((page) => Math.min(requestsTotalPages, page + 1))}>Next</button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {activeTab === 'imports' ? (
                                <div className="admin-card">
                                    <div className="admin-section-title">📥 Import Existing Donations (CSV)</div>
                                    <div className="admin-muted mb-md">
                                        Required columns: <strong>email</strong>, <strong>amount</strong>, <strong>method</strong>.
                                        Optional columns: <strong>name</strong>, <strong>date</strong>, <strong>note</strong>, <strong>engagement</strong>.
                                        Method values must be: <strong>cash</strong>, <strong>card</strong>, or <strong>zeffy</strong>.
                                    </div>
                                    <form className="admin-form" onSubmit={handleImportCsv}>
                                        <input
                                            className="admin-input"
                                            type="file"
                                            accept=".csv,text/csv"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                setCsvFile(file);
                                            }}
                                            disabled={csvImportLoading}
                                        />
                                        <button type="submit" className="admin-button" disabled={csvImportLoading || !csvFile}>
                                            {csvImportLoading ? 'Importing...' : 'Import CSV Donations'}
                                        </button>
                                    </form>

                                    {csvImportLoading && csvUploadProgress !== null ? (
                                        <div className="admin-stack mt-md">
                                            <div className="admin-inline admin-inline--between admin-muted admin-muted--md">
                                                <span>{csvUploadProgress < 100 ? 'Uploading CSV…' : 'Upload complete, processing rows…'}</span>
                                                <span>{csvUploadProgress}%</span>
                                            </div>
                                            <div className="admin-chart-track" style={{ height: 10 }}>
                                                <div className="admin-chart-fill" style={{ width: `${csvUploadProgress}%` }}></div>
                                            </div>
                                        </div>
                                    ) : null}

                                    {csvImportSummary ? (
                                        <div className="admin-stack mt-lg">
                                            <div className="admin-grid admin-grid--4cols">
                                                <div className="admin-stat"><div className="admin-muted">Rows</div><div className="admin-value-lg">{csvImportSummary.totalRows}</div></div>
                                                <div className="admin-stat"><div className="admin-muted">Imported Payments</div><div className="admin-value-lg">{csvImportSummary.importedPayments}</div></div>
                                                <div className="admin-stat"><div className="admin-muted">Created Donors</div><div className="admin-value-lg">{csvImportSummary.createdDonors}</div></div>
                                                <div className="admin-stat"><div className="admin-muted">Failed Rows</div><div className="admin-value-lg">{csvImportSummary.failedRows}</div></div>
                                            </div>

                                            {Array.isArray(csvImportSummary.errors) && csvImportSummary.errors.length > 0 ? (
                                                <div className="admin-table-wrap">
                                                    <table className="admin-table admin-table--compact">
                                                        <thead>
                                                            <tr>
                                                                <th>Row</th>
                                                                <th>Error</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {csvImportSummary.errors.map((item, idx) => (
                                                                <tr key={`${item.row}-${idx}`}>
                                                                    <td>{item.row}</td>
                                                                    <td className="admin-table-cell-muted">{item.message}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="admin-alert success">No row-level errors detected.</div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                            {activeTab === 'admins' ? (
                                <>
                                    <div className="admin-card">
                                        <div className="admin-section-title">Create admin</div>
                                        <form className="admin-form" onSubmit={handleCreateAdmin}>
                                            <input className="admin-input" placeholder="Full name" value={newAdmin.name} onChange={(e) => setNewAdmin((prev) => ({ ...prev, name: e.target.value }))} />
                                            <input className="admin-input" type="email" placeholder="Email" value={newAdmin.email} onChange={(e) => setNewAdmin((prev) => ({ ...prev, email: e.target.value }))} />
                                            <input className="admin-input" type="password" placeholder="Password" value={newAdmin.password} onChange={(e) => setNewAdmin((prev) => ({ ...prev, password: e.target.value }))} />
                                            <button type="submit" className="admin-button">Create admin</button>
                                        </form>
                                    </div>
                                    <div className="admin-card">
                                        <div className="admin-section-title">Admins</div>
                                        <div className="admin-actions mb-md">
                                            <input
                                                className="admin-input admin-input--max-260"
                                                placeholder="Search admins"
                                                value={adminFilter.query}
                                                onChange={(e) => setAdminFilter({ query: e.target.value })}
                                            />
                                        </div>
                                        <div className="admin-list">
                                            {paginatedAdmins.map((admin) => (
                                                <div key={admin.id} className="admin-item">
                                                    <div className="admin-item-title">{admin.name}</div>
                                                    <div className="admin-muted mt-sm">{admin.email}</div>
                                                    {admin.addedBy?.name ? <div className="mt-sm">Added by {admin.addedBy.name}</div> : null}
                                                </div>
                                            ))}
                                            {paginatedAdmins.length === 0 ? <div className="admin-item">No admins match the current filter.</div> : null}
                                        </div>
                                        <div className="admin-pagination">
                                            <div className="admin-muted">Showing 12 items per page</div>
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
                                <div className="admin-card">
                                    <div className="admin-section-title">Activity logs</div>
                                    <div className="admin-actions mb-md">
                                        <input
                                            className="admin-input admin-input--max-220"
                                            placeholder="Search activity"
                                            value={logFilter.query}
                                            onChange={(e) => setLogFilter((prev) => ({ ...prev, query: e.target.value }))}
                                        />
                                        <input
                                            className="admin-input admin-input--max-220"
                                            placeholder="Filter by action"
                                            value={logFilter.action}
                                            onChange={(e) => setLogFilter((prev) => ({ ...prev, action: e.target.value }))}
                                        />
                                        <input
                                            className="admin-input admin-input--max-220"
                                            placeholder="Filter by actor"
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
                                            {paginatedLogs.length === 0 ? <div className="admin-item">No logs match the current filters.</div> : null}
                                        </div>
                                        <div className="admin-pagination">
                                            <div className="admin-muted">Showing 12 items per page</div>
                                            <div className="admin-pagination-buttons">
                                                <button type="button" className="admin-button secondary" disabled={logsPage <= 1} onClick={() => setLogsPage((page) => Math.max(1, page - 1))}>Previous</button>
                                                <span>Page {logsPage} of {logsTotalPages}</span>
                                            <button type="button" className="admin-button secondary" disabled={logsPage >= logsTotalPages} onClick={() => setLogsPage((page) => Math.min(logsTotalPages, page + 1))}>Next</button>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            {activeTab === 'accounts' ? (
                                <div className="admin-stack admin-stack--xl">
                                    <div className="admin-card">
                                        <div className="admin-section-title">👤 Your Account</div>
                                        <div className="admin-form">
                                            <div>
                                                <label className="admin-label">Full Name</label>
                                                <input className="admin-input" type="text" defaultValue={currentAdminAccount?.name || ''} />
                                            </div>
                                            <div>
                                                <label className="admin-label">Email Address</label>
                                                <input className="admin-input" type="email" defaultValue={currentAdminAccount?.email || ''} />
                                            </div>
                                            <div>
                                                <label className="admin-label">Phone Number</label>
                                                <input className="admin-input" type="tel" defaultValue={currentAdminAccount?.phoneNumber || ''} />
                                            </div>
                                            <div>
                                                <label className="admin-label">Role</label>
                                                <input className="admin-input admin-input--disabled" type="text" defaultValue={currentAdminAccount?.role || 'admin'} disabled />
                                            </div>
                                            <div>
                                                <label className="admin-label">Status</label>
                                                <select
                                                    className="admin-input admin-input--disabled"
                                                    defaultValue={currentAdminAccount?.status || 'active'}
                                                    disabled
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="inactive">Inactive</option>
                                                    <option value="suspended">Suspended</option>
                                                </select>
                                                <div className="admin-field-help">
                                                    Your own account status can only be changed by another administrator.
                                                </div>
                                            </div>
                                            <button type="button" className="admin-button">Update Profile</button>
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
