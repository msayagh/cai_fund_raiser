import { apiFetch } from '@/lib/apiClient.js';

// ─── Admin API ────────────────────────────────────────────────────────────────

export function adminListActivities(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/api/admin/volunteering/activities${query ? `?${query}` : ''}`);
}

export function adminGetActivity(id) {
    return apiFetch(`/api/admin/volunteering/activities/${id}`);
}

export function adminCreateActivity(body) {
    return apiFetch('/api/admin/volunteering/activities', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export function adminUpdateActivity(id, body) {
    return apiFetch(`/api/admin/volunteering/activities/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}

export function adminDeactivateActivity(id) {
    return apiFetch(`/api/admin/volunteering/activities/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
    });
}

export function adminReactivateActivity(id) {
    return apiFetch(`/api/admin/volunteering/activities/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: true }),
    });
}

export function adminDeleteActivity(id) {
    return apiFetch(`/api/admin/volunteering/activities/${id}`, { method: 'DELETE' });
}

export function adminAddSchedule(activityId, body) {
    return apiFetch(`/api/admin/volunteering/activities/${activityId}/schedules`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export function adminUpdateSchedule(activityId, scheduleId, body) {
    return apiFetch(`/api/admin/volunteering/activities/${activityId}/schedules/${scheduleId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
    });
}

export function adminDeleteSchedule(activityId, scheduleId) {
    return apiFetch(`/api/admin/volunteering/activities/${activityId}/schedules/${scheduleId}`, {
        method: 'DELETE',
    });
}

export function adminListSignups(activityId) {
    return apiFetch(`/api/admin/volunteering/activities/${activityId}/signups`);
}

export function adminRemoveSignup(activityId, scheduleId, signupId) {
    return apiFetch(`/api/admin/volunteering/activities/${activityId}/schedules/${scheduleId}/signups/${signupId}`, {
        method: 'DELETE',
    });
}

export function adminPreAssignVolunteer(activityId, scheduleId, body) {
    return apiFetch(`/api/admin/volunteering/activities/${activityId}/schedules/${scheduleId}/signups`, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export function adminPostDiscussion(activityId, message) {
    return apiFetch(`/api/admin/volunteering/activities/${activityId}/discussions`, {
        method: 'POST',
        body: JSON.stringify({ message }),
    });
}

// ─── Donor API ────────────────────────────────────────────────────────────────

export function donorListActivities(params = {}) {
    const query = new URLSearchParams(params).toString();
    return apiFetch(`/api/volunteering/activities${query ? `?${query}` : ''}`);
}

export function donorGetActivity(id, { includeInactive = false } = {}) {
    const query = includeInactive ? '?includeInactive=true' : '';
    return apiFetch(`/api/volunteering/activities/${id}${query}`);
}

export function donorGetMySignups() {
    return apiFetch('/api/volunteering/my-signups');
}

export function donorSignUp(activityId, scheduleId, note) {
    return apiFetch(`/api/volunteering/activities/${activityId}/schedules/${scheduleId}/signup`, {
        method: 'POST',
        body: JSON.stringify({ note }),
    });
}

export function donorCancelSignup(activityId, scheduleId) {
    return apiFetch(`/api/volunteering/activities/${activityId}/schedules/${scheduleId}/signup`, {
        method: 'DELETE',
    });
}

export function donorPostDiscussion(activityId, message) {
    return apiFetch(`/api/volunteering/activities/${activityId}/discussions`, {
        method: 'POST',
        body: JSON.stringify({ message }),
    });
}
