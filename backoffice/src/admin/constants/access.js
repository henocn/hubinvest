export const roleLabels = {
  'super-admin': 'Super administrateur',
  admin: 'Administrateur',
  occupant: 'Occupant',
  animateur: 'Animateur',
};

export const backofficeRoles = new Set(['super-admin', 'admin']);
export const availableRoles = new Set(['super-admin', 'admin', 'occupant', 'animateur']);
export const b2bProposalLabels = { pending: 'À traiter', accepted: 'Acceptée', declined: 'Refusée' };
export const investorStatusLabels = { new: 'Nouvelle', in_progress: 'En cours', closed: 'Clôturée' };
export const programTypeLabels = { spotlight: 'À l’affiche', highlight: 'Temps fort', animation: 'Animation', studio: 'Studio', talk: 'Prise de parole' };
export const challengeStatusLabels = { active: 'En cours', completed: 'Terminé', redeemed: 'Récompensé(e)' };
// Site public (QR codes, liens des fiches) : jamais l'adresse de l'espace équipe.
export const publicBaseUrl = (import.meta.env.VITE_PUBLIC_URL || 'https://hub.investir.tg').replace(/\/$/, '');

// Issue d'un tour de roue : perdu, lot à remettre ou lot remis.
export const wheelPlayStatus = (play) => {
  if (play.result?.kind !== 'prize') return 'Perdu';
  return play.claimedAt ? 'Lot remis' : 'Lot à remettre';
};
