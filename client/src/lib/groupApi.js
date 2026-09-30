import { apiFetch } from './api';
import { getAuthToken } from './authApi';

export async function getGroups() {
  return apiFetch('/api/groups', { token: getAuthToken() });
}

export async function createGroup(name) {
  return apiFetch('/api/groups', {
    method: 'POST',
    body: JSON.stringify({ name }),
    token: getAuthToken(),
  });
}

export async function inviteMember(groupId, email) {
  return apiFetch(`/api/groups/${groupId}/invite`, {
    method: 'POST',
    body: JSON.stringify({ email }),
    token: getAuthToken(),
  });
}

export async function getGroupStreaks(groupId) {
  return apiFetch(`/api/groups/${groupId}/streaks`, { token: getAuthToken() });
}

export async function getNotifications() {
  return apiFetch('/api/notifications', { token: getAuthToken() });
}

export async function respondToInvite(notificationId, action) {
  return apiFetch(`/api/notifications/${notificationId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action }),
    token: getAuthToken(),
  });
}
