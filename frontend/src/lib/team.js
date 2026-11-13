// Adresse de l'espace équipe (administration, occupants, animateurs).
export const TEAM_URL = (import.meta.env.VITE_BACKOFFICE_URL || 'https://adminhub.investir.tg').replace(/\/$/, '');
export const teamUrl = (path = '/') => `${TEAM_URL}${path}`;
