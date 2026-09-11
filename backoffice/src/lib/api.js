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
    const error = new Error(payload.message || 'La requete a echoue.');
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
  login: (values) => request('/auth/login', { method: 'POST', body: JSON.stringify(values) }),
  occupants: (token) => request('/occupants', authorized(token)),
  createOccupant: (token, values) =>
    request('/occupants', authorized(token, { method: 'POST', body: JSON.stringify(values) })),
  users: (token) => request('/users', authorized(token)),
  createUser: (token, values) =>
    request('/users', authorized(token, { method: 'POST', body: JSON.stringify(values) })),
};
