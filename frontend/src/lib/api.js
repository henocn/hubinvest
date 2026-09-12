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
  login: (values) => request('/auth/login', { method: 'POST', body: JSON.stringify(values) }),
  contacts: (token) => request('/contacts', authorized(token)),
  contactStats: (token) => request('/contacts/stats', authorized(token)),
  createContact: (token, values) =>
    request('/contacts', authorized(token, { method: 'POST', body: JSON.stringify(values) })),
};
