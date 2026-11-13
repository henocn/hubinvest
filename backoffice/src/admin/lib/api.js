const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const request = async (path, options = {}) => {
  const hasFormData = options.body instanceof FormData;
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(!hasFormData && { 'Content-Type': 'application/json' }),
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
  login: (values) => request('/auth/login', { method: 'POST', body: JSON.stringify(values) }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email, code, password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code, password }) }),
  profile: (token) => request('/users/me', authorized(token)),
  realtimeTicket: (token) => request('/realtime/ticket', authorized(token, { method: 'POST' })),
  realtimeStreamUrl: (ticket) => `${API_URL}/realtime/stream?ticket=${encodeURIComponent(ticket)}`,
  occupants: (token) => request('/occupants', authorized(token)),
  createOccupant: (token, values) =>
    request('/occupants', authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  updateOccupant: (token, id, values) =>
    request(`/occupants/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  uploadOccupantCover: (token, id, file) => {
    const body = new FormData();
    body.append('coverImage', file);
    return request(`/occupants/${id}/cover`, authorized(token, { method: 'POST', body }));
  },
  uploadOccupantLogo: (token, id, file) => {
    const body = new FormData();
    body.append('logo', file);
    return request(`/occupants/${id}/logo`, authorized(token, { method: 'POST', body }));
  },
  deleteOccupant: (token, id) =>
    request(`/occupants/${id}`, authorized(token, { method: 'DELETE' })),
  investorRequests: (token) => request('/investor-requests', authorized(token)),
  updateInvestorRequest: (token, id, values) =>
    request(`/investor-requests/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  b2bNeeds: (token) => request('/b2b-needs', authorized(token)),
  createB2bNeed: (token, values) =>
    request('/b2b-needs', authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  updateB2bNeed: (token, id, values) =>
    request(`/b2b-needs/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  b2bProposals: (token, needId) => request(`/b2b-proposals/need/${needId}`, authorized(token)),
  updateB2bProposal: (token, id, values) =>
    request(`/b2b-proposals/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  studioInvitations: (token) => request('/studio-invitations', authorized(token)),
  createStudioInvitation: (token, values) =>
    request('/studio-invitations', authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  updateStudioInvitation: (token, id, values) =>
    request(`/studio-invitations/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  programEvents: (token) => request('/program-events', authorized(token)),
  createProgramEvent: (token, values) =>
    request('/program-events', authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  updateProgramEvent: (token, id, values) =>
    request(`/program-events/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  deleteProgramEvent: (token, id) =>
    request(`/program-events/${id}`, authorized(token, { method: 'DELETE' })),
  challengePassports: (token) => request('/challenge-passports', authorized(token)),
  redeemChallengePassport: (token, id) =>
    request(`/challenge-passports/${id}/redeem`, authorized(token, { method: 'PATCH' })),
  wheel: (token) => request('/wheel', authorized(token)),
  createWheelCode: (token) => request('/wheel/codes', authorized(token, { method: 'POST' })),
  createWheelSegment: (token, values) =>
    request('/wheel/segments', authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  updateWheelSegment: (token, id, values) =>
    request(`/wheel/segments/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  deleteWheelSegment: (token, id) =>
    request(`/wheel/segments/${id}`, authorized(token, { method: 'DELETE' })),
  users: (token) => request('/users', authorized(token)),
  contactStats: (token) => request('/contacts/admin/stats', authorized(token)),
  createUser: (token, values) =>
    request('/users', authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  updateUser: (token, id, values) =>
    request(`/users/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  deleteUser: (token, id) =>
    request(`/users/${id}`, authorized(token, { method: 'DELETE' })),
  pushPublicKey: () => request('/push-subscriptions/public-key'),
  subscribePush: (token, subscription) =>
    request('/push-subscriptions', authorized(token, { method: 'POST', body: JSON.stringify(subscription) })),
  unsubscribePush: (token, endpoint) =>
    request('/push-subscriptions', authorized(token, { method: 'DELETE', body: JSON.stringify({ endpoint }) })),
};
