const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': 'fr',
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

// Appels de l'espace équipe communs à tous les rôles ; ceux de l'administration sont dans admin/lib/api.js.
export const api = {
  health: () => request('/health'),
  login: (values) => request('/auth/login', { method: 'POST', body: JSON.stringify(values) }),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (email, code, password) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, code, password }) }),
  profile: (token) => request('/users/me', authorized(token)),
  changeOwnPassword: (token, values) =>
    request('/users/me/password', authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  contacts: (token) => request('/contacts', authorized(token)),
  createContact: (token, values) =>
    request('/contacts', authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  updateContact: (token, id, values) =>
    request(`/contacts/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  validateChallengePassage: (token, code) => request('/challenge-passages', authorized(token, { method: 'POST', body: JSON.stringify({ code }) })),
  challengePassageStats: (token) => request('/challenge-passages/stats', authorized(token)),
  searchPlayers: (token, query) => request(`/challenge-passports/search?q=${encodeURIComponent(query)}`, authorized(token)),
  challengeRewards: (token) => request('/challenge-passports/rewards', authorized(token)),
  challengeRewardByCode: (token, code) => request(`/challenge-passports/code/${encodeURIComponent(code)}`, authorized(token)),
  redeemChallengeReward: (token, code) => request('/challenge-passports/redeem-by-code', authorized(token, { method: 'POST', body: JSON.stringify({ code }) })),
  createWheelCode: (token) => request('/wheel/codes', authorized(token, { method: 'POST' })),
  wheelPrize: (token, code) => request(`/wheel/prizes/${encodeURIComponent(code)}`, authorized(token)),
  claimWheelPrize: (token, code) => request(`/wheel/prizes/${encodeURIComponent(code)}/claim`, authorized(token, { method: 'POST' })),
  liveQuestions: (token) => request('/live-questions', authorized(token)),
  updateLiveQuestion: (token, id, status) => request(`/live-questions/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify({ status }) })),
  realtimeTicket: (token) => request('/realtime/ticket', authorized(token, { method: 'POST' })),
  realtimeStreamUrl: (ticket) => `${API_URL}/realtime/stream?ticket=${encodeURIComponent(ticket)}`,
  pushPublicKey: () => request('/push-subscriptions/public-key'),
  subscribePush: (token, subscription) =>
    request('/push-subscriptions', authorized(token, { method: 'POST', body: JSON.stringify(subscription) })),
  unsubscribePush: (token, endpoint) =>
    request('/push-subscriptions', authorized(token, { method: 'DELETE', body: JSON.stringify({ endpoint }) })),
};
