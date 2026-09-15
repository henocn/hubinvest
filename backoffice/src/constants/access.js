export const roleLabels = {
  'super-admin': 'Super administrateur',
  'admin-apizf': 'Administrateur API-ZF',
  'investor-desk': 'Investor Desk',
  'equipe-campagne': 'Équipe campagne',
  animateur: 'Animateur',
  'occupant-responsable': 'Responsable occupant',
  'occupant-membre': 'Membre occupant',
  visiteur: 'Visiteur',
};

export const adminRoles = new Set(['super-admin', 'admin-apizf']);
export const backofficeRoles = new Set(['super-admin', 'admin-apizf', 'investor-desk', 'equipe-campagne', 'animateur']);
export const occupantRoles = new Set(['occupant-responsable', 'occupant-membre']);
export const availableRoles = new Set(['super-admin', 'admin-apizf', 'investor-desk', 'equipe-campagne', 'animateur', 'occupant-responsable', 'occupant-membre']);
export const investorStatusLabels = { new: 'Nouvelle', in_progress: 'En cours', closed: 'Clôturée' };
export const studioStatusLabels = { pending: 'En attente', confirmed: 'Confirmée', declined: 'Refusée' };
export const challengeStatusLabels = { active: 'En cours', completed: 'Terminé', redeemed: 'Récompensé(e)' };
export const publicBaseUrl = (import.meta.env.VITE_PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, '');
