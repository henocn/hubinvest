export const roleLabels = {
  'super-admin': 'Super administrateur',
  admin: 'Administrateur',
  occupant: 'Occupant',
  animateur: 'Animateur',
};

export const adminScopeLabels = {
  'investor-desk': 'Investor Desk',
  campagne: 'Campagne',
  b2b: 'B2B',
};

export const backofficeRoles = new Set(['super-admin', 'admin']);
export const availableRoles = new Set(['super-admin', 'admin', 'occupant', 'animateur']);
export const investorStatusLabels = { new: 'Nouvelle', in_progress: 'En cours', closed: 'Clôturée' };
export const studioStatusLabels = { pending: 'En attente', confirmed: 'Confirmée', declined: 'Refusée' };
export const challengeStatusLabels = { active: 'En cours', completed: 'Terminé', redeemed: 'Récompensé(e)' };
export const publicBaseUrl = (import.meta.env.VITE_PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, '');
