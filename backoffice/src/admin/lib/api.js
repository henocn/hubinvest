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
  addOccupantGalleryImage: (token, id, file) => {
    const body = new FormData();
    body.append('image', file);
    return request(`/occupants/${id}/gallery`, authorized(token, { method: 'POST', body }));
  },
  removeOccupantGalleryImage: (token, id, url) =>
    request(`/occupants/${id}/gallery`, authorized(token, { method: 'DELETE', body: JSON.stringify({ url }) })),
  deleteOccupant: (token, id) =>
    request(`/occupants/${id}`, authorized(token, { method: 'DELETE' })),
  investorRequests: (token) => request('/investor-requests', authorized(token)),
  createInvestorRequest: (token, values) =>
    request('/investor-requests', authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  // Fiche d'un contact des guichets : diagnostic, difficulté, relances et rendez-vous.
  saveInvestorDiagnosis: (token, id, values) => request(`/investor-requests/${id}/diagnosis`, authorized(token, { method: 'PUT', body: JSON.stringify(values) })),
  saveInvestorDifficulty: (token, id, values) => request(`/investor-requests/${id}/difficulty`, authorized(token, { method: 'PUT', body: JSON.stringify(values) })),
  resolveInvestorCommitment: (token, id, resolved) => request(`/investor-requests/${id}/resolution`, authorized(token, { method: 'PATCH', body: JSON.stringify({ resolved }) })),
  investorRequest: (token, id) => request(`/investor-requests/${id}`, authorized(token)),
  addInvestorFollowUp: (token, id, values) => request(`/investor-requests/${id}/follow-ups`, authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  deleteInvestorFollowUp: (token, id, followUpId) => request(`/investor-requests/${id}/follow-ups/${followUpId}`, authorized(token, { method: 'DELETE' })),
  addInvestorMeeting: (token, id, values) => request(`/investor-requests/${id}/meetings`, authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  updateInvestorMeeting: (token, id, meetingId, values) => request(`/investor-requests/${id}/meetings/${meetingId}`, authorized(token, { method: 'PUT', body: JSON.stringify(values) })),
  setInvestorMeetingStatus: (token, id, meetingId, status) => request(`/investor-requests/${id}/meetings/${meetingId}`, authorized(token, { method: 'PATCH', body: JSON.stringify({ status }) })),
  deleteInvestorMeeting: (token, id, meetingId) => request(`/investor-requests/${id}/meetings/${meetingId}`, authorized(token, { method: 'DELETE' })),
  updateInvestorRequest: (token, id, values) =>
    request(`/investor-requests/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  b2bNeeds: (token) => request('/b2b-needs', authorized(token)),
  createB2bNeed: (token, values) =>
    request('/b2b-needs', authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  updateB2bNeed: (token, id, values) =>
    request(`/b2b-needs/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  // Studio : invitations, renvoi, annulation, livraison de la capsule.
  studioInvitations: (token) => request('/studio-invitations', authorized(token)),
  studioFormats: (token) => request('/studio-invitations/formats', authorized(token)),
  createStudioInvitation: (token, values) => request('/studio-invitations', authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  updateStudioInvitation: (token, id, values) => request(`/studio-invitations/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  resendStudioInvitation: (token, id) => request(`/studio-invitations/${id}/resend`, authorized(token, { method: 'POST' })),
  cancelStudioInvitation: (token, id) => request(`/studio-invitations/${id}/cancel`, authorized(token, { method: 'POST' })),
  deliverStudioCapsule: (token, id, capsuleUrl) => request(`/studio-invitations/${id}/deliver`, authorized(token, { method: 'POST', body: JSON.stringify({ capsuleUrl }) })),
  deleteStudioInvitation: (token, id) => request(`/studio-invitations/${id}`, authorized(token, { method: 'DELETE' })),
  b2bAllProposals: (token) => request('/b2b-proposals', authorized(token)),
  // Fiche d'une demande B2B : rendez-vous, créneaux libres, compte rendu.
  b2bProposal: (token, id) => request(`/b2b-proposals/${id}`, authorized(token)),
  b2bSlots: (token, id, date, exclude = null) => request(`/b2b-proposals/${id}/slots?date=${encodeURIComponent(date)}${exclude ? `&exclude=${exclude}` : ''}`, authorized(token)),
  rescheduleB2bMeeting: (token, id, meetingId, values) => request(`/b2b-proposals/${id}/meetings/${meetingId}`, authorized(token, { method: 'PUT', body: JSON.stringify(values) })),
  createB2bMeeting: (token, id, values) => request(`/b2b-proposals/${id}/meetings`, authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  updateB2bMeeting: (token, id, meetingId, values) => request(`/b2b-proposals/${id}/meetings/${meetingId}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  deleteB2bMeeting: (token, id, meetingId) => request(`/b2b-proposals/${id}/meetings/${meetingId}`, authorized(token, { method: 'DELETE' })),
  b2bProposals: (token, needId) => request(`/b2b-proposals/need/${needId}`, authorized(token)),
  deleteB2bProposal: (token, id) =>
    request(`/b2b-proposals/${id}`, authorized(token, { method: 'DELETE' })),
  updateB2bProposal: (token, id, values) =>
    request(`/b2b-proposals/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  services: (token) => request('/services', authorized(token)),
  // kind : 'services' ou 'procedures' (démarches en ligne).
  createServiceItem: (token, kind, values) => request(kind === 'services' ? '/services' : '/services/procedures', authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  updateServiceItem: (token, kind, id, values) => request(`${kind === 'services' ? '/services' : '/services/procedures'}/${id}`, authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  deleteServiceItem: (token, kind, id) => request(`${kind === 'services' ? '/services' : '/services/procedures'}/${id}`, authorized(token, { method: 'DELETE' })),
  reorderServiceItems: (token, kind, ids) => request(kind === 'services' ? '/services/order' : '/services/procedures/order', authorized(token, { method: 'PUT', body: JSON.stringify({ ids }) })),
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
  dashboard: (token) => request('/dashboard', authorized(token)),
  settings: (token) => request('/settings', authorized(token)),
  updateSettings: (token, values) => request('/settings', authorized(token, { method: 'PATCH', body: JSON.stringify(values) })),
  deleteWheelPlay: (token, id) => request(`/wheel/plays/${id}`, authorized(token, { method: 'DELETE' })),
  deleteChallengePassport: (token, id) => request(`/challenge-passports/${id}`, authorized(token, { method: 'DELETE' })),
  claimWheelPlay: (token, id) => request(`/wheel/plays/${id}/claim`, authorized(token, { method: 'POST' })),
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
