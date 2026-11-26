import i18n from '../i18n';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept-Language': i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'fr',
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

export const api = {
  publicSettings: () => request('/settings/public'),
  publicToday: () => request('/program-events/public/today'),
  screen: () => request('/screen/public'),
  publicWheel: () => request('/wheel/public'),
  // wheel : les cases affichées (dans l'ordre), pour que le tirage se fasse sur cette roue-là.
  // Vérifie le code de jeu avant d'afficher la roue (rien n'est joué).
  checkWheelCode: (code, player) => request('/wheel/public/check', { method: 'POST', body: JSON.stringify({ code, player }) }),
  spinWheel: (code, player, wheel) => request('/wheel/public/spin', { method: 'POST', body: JSON.stringify({ code, player, wheel }) }),
  publicOccupants: () => request('/occupants/public'),
  publicOccupant: (slug) => request(`/occupants/public/${encodeURIComponent(slug)}`),
  requestContact: (slug, values) => request(`/contacts/public/${encodeURIComponent(slug)}`, { method: 'POST', body: JSON.stringify(values) }),
  guichetSlots: (guichet) => request(`/investor-requests/public/slots?guichet=${encodeURIComponent(guichet)}`),
  bookGuichet: (values) => request('/investor-requests/public/booking', { method: 'POST', body: JSON.stringify(values) }),
  createInvestorRequest: (values) => request('/investor-requests/public', { method: 'POST', body: JSON.stringify(values) }),
  publicB2bNeeds: () => request('/b2b-needs/public'),
  publicB2bNeed: (id) => request(`/b2b-needs/public/${encodeURIComponent(id)}`),
  createB2bProposal: (needId, values) => request(`/b2b-proposals/public/${encodeURIComponent(needId)}`, { method: 'POST', body: JSON.stringify(values) }),
  publicStudioInvitation: (token) => request(`/studio-invitations/public/${encodeURIComponent(token)}`),
  studioSlots: (token) => request(`/studio-invitations/public/${encodeURIComponent(token)}/slots`),
  bookStudio: (token, startsAt) => request(`/studio-invitations/public/${encodeURIComponent(token)}/booking`, { method: 'POST', body: JSON.stringify({ startsAt }) }),
  declineStudio: (token) => request(`/studio-invitations/public/${encodeURIComponent(token)}/decline`, { method: 'POST' }),
  createChallengePassport: (values) => request('/challenge-passports/public', { method: 'POST', body: JSON.stringify(values) }),
  publicChallengePassport: (token) => request(`/challenge-passports/public/${encodeURIComponent(token)}`),
  askLiveQuestion: (eventId, values) => request(`/live-questions/public/${encodeURIComponent(eventId)}`, { method: 'POST', body: JSON.stringify(values) }),
  screenStreamUrl: () => `${API_URL}/realtime/screen`,
  challengePassportStreamUrl: (personalToken) => `${API_URL}/realtime/passports/${encodeURIComponent(personalToken)}`,
};
