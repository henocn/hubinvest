export const roleLabels = {
  'super-admin': 'Super administrateur',
  admin: 'Administrateur',
  occupant: 'Occupant',
  animateur: 'Animateur',
};

export const backofficeRoles = new Set(['super-admin', 'admin']);
export const availableRoles = new Set(['super-admin', 'admin', 'occupant', 'animateur']);
export const investorStatusLabels = { new: 'Nouvelle', in_progress: 'En cours', closed: 'Clôturée' };
export const studioStatusLabels = { pending: 'En attente', confirmed: 'Confirmée', declined: 'Refusée' };
export const programTypeLabels = { spotlight: 'À l’affiche', highlight: 'Temps fort', animation: 'Animation', studio: 'Studio', talk: 'Prise de parole' };
export const challengeStatusLabels = { active: 'En cours', completed: 'Terminé', redeemed: 'Récompensé(e)' };
// Site public (QR codes, liens des fiches et des invitations Studio) : jamais l'adresse de l'espace équipe.
export const publicBaseUrl = (import.meta.env.VITE_PUBLIC_URL || 'https://hub.investir.tg').replace(/\/$/, '');
