const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.message || 'La requête a échoué.');
    error.status = response.status;
    error.code = payload.code;
    error.details = payload.details;
    throw error;
  }

  return payload.data;
};

export const resolveAssetUrl = (value) => {
  if (!value || /^https?:\/\//i.test(value)) return value;
  return new URL(value, new URL(API_URL, window.location.origin).origin).toString();
};

const authorized = (token, options = {}) => ({
  ...options,
  headers: {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  },
});

export const api = {
  health: () => request('/health'),
  publicOccupants: () => request('/occupants/public'),
  publicOccupant: (slug) => request(`/occupants/public/${encodeURIComponent(slug)}`),
  requestContact: (slug, values) => request(`/contacts/public/${encodeURIComponent(slug)}`, { method: 'POST', body: JSON.stringify(values) }),
  createInvestorRequest: (values) => request('/investor-requests/public', { method: 'POST', body: JSON.stringify(values) }),
  publicB2bNeeds: () => request('/b2b-needs/public'),
  publicB2bNeed: (id) => request(`/b2b-needs/public/${encodeURIComponent(id)}`),
  createB2bProposal: (needId, values) => request(`/b2b-proposals/public/${encodeURIComponent(needId)}`, { method: 'POST', body: JSON.stringify(values) }),
  publicStudioInvitation: (token) => request(`/studio-invitations/public/${encodeURIComponent(token)}`),
  respondStudioInvitation: (token, status) => request(`/studio-invitations/public/${encodeURIComponent(token)}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  createChallengePassport: (values) => request('/challenge-passports/public', { method: 'POST', body: JSON.stringify(values) }),
  publicChallengePassport: (token) => request(`/challenge-passports/public/${encodeURIComponent(token)}`),
  login: (values) => request('/auth/login', { method: 'POST', body: JSON.stringify(values) }),
  profile: (token) => request('/users/me', authorized(token)),
  changeOwnPassword: (token, values) =>
    request('/users/me/password', authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  contacts: (token) => request('/contacts', authorized(token)),
  contactStats: (token) => request('/contacts/stats', authorized(token)),
  createContact: (token, values) =>
    request('/contacts', authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  updateContact: (token, id, values) =>
    request(`/contacts/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  b2bNeeds: (token) => request('/b2b-needs', authorized(token)),
  createB2bNeed: (token, values) => request('/b2b-needs', authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  updateB2bNeed: (token, id, values) => request(`/b2b-needs/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  b2bProposals: (token, needId) => request(`/b2b-proposals/need/${needId}`, authorized(token)),
  updateB2bProposal: (token, id, values) => request(`/b2b-proposals/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  validateChallengePassage: (token, code) => request('/challenge-passages', authorized(token, { method: 'POST', body: JSON.stringify({ code }) })),
  challengePassageStats: (token) => request('/challenge-passages/stats', authorized(token)),
};
