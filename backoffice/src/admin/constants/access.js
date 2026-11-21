export const roleLabels = {
  'super-admin': 'Super administrateur',
  admin: 'Administrateur',
  occupant: 'Occupant',
  animateur: 'Animateur',
};

export const backofficeRoles = new Set(['super-admin', 'admin']);
export const availableRoles = new Set(['super-admin', 'admin', 'occupant', 'animateur']);
// Compte rendu en un clic d'un rendez-vous B2B.
export const b2bMeetingOutcomeLabels = { held_follow_up: 'Tenue · suite à donner', held_no_follow_up: 'Tenue · sans suite', no_show: 'Visiteur absent' };
export const b2bProposalLabels = { pending: 'À traiter', accepted: 'Acceptée', declined: 'Refusée' };
// Classes de l'Investor Desk (document : A relancé sous 48 h, B sous 7 jours, C intégré à la newsletter).
export const investorClassLabels = { A: 'A · Projet prioritaire', B: 'B · Potentiel à suivre', C: 'C · Contact à nourrir' };
export const investorClassHints = { A: 'Relance sous 48 h par l’interlocuteur', B: 'Relance sous 7 jours', C: 'Intégré à la newsletter, sans relance individuelle' };
export const investorChannelLabels = { call: 'Appel', email: 'E-mail', meeting: 'Rendez-vous' };
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
