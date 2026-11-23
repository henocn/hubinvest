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
// Classes des guichets (document v4 : A relancé sous 48 h, B sous 7 jours, C intégré à la lettre d'information,
// Accompagnement pour une entreprise installée qui signale une difficulté).
export const investorClassLabels = { A: 'A · Projet prioritaire', B: 'B · Potentiel à suivre', C: 'C · Contact à nourrir', support: 'Accompagnement' };
export const investorClassHints = { A: 'Relance sous 48 h par le responsable nommé', B: 'Relance sous 7 jours avec documentation adaptée', C: 'Intégré à la lettre d’information', support: 'Entreprise installée en difficulté : engagement de suivi écrit' };
export const investorClassShort = { A: 'A', B: 'B', C: 'C', support: 'Acc.' };
// Les trois guichets du Stand API-ZF et l'origine d'un contact.
export const guichetLabels = { project: 'Mon projet d’investissement', regime: 'Quel régime pour mon investissement ?', company: 'Mon entreprise, mes difficultés' };
export const guichetShortLabels = { project: 'Mon projet', regime: 'Quel régime', company: 'Mon entreprise' };
export const contactSourceLabels = { online_booking: 'Rendez-vous en ligne', callback: 'Demande de rappel', desk: 'Passage au guichet' };
export const companyRegimeLabels = { free_zone: 'Zone Franche', investment_code: 'Code des investissements', none: 'Aucun régime' };
// Statut calculé par le serveur : rien de fait, relance prévue, ou classée et relancée sans nouvelle relance.
// Studio : formats du document et suivi de chaque invité.
export const studioStatusLabels = { invited: 'Créneau à choisir', booked: 'Créneau réservé', delivered: 'Capsule livrée', declined: 'Décliné', cancelled: 'Annulé' };
export const investorStatusLabels = { new: 'À traiter', in_progress: 'À relancer', closed: 'Terminé' };
// Un contact Accompagnement en cours attend la réponse promise, pas une relance.
export const investorStatusLabel = (item) => (item.classification === 'support' && item.status === 'in_progress' ? 'Réponse à donner' : investorStatusLabels[item.status]);
export const programTypeLabels = { spotlight: 'À l’affiche', highlight: 'Temps fort', animation: 'Animation', studio: 'Studio', talk: 'Prise de parole' };
export const challengeStatusLabels = { active: 'En cours', completed: 'Terminé', redeemed: 'Récompensé(e)' };
// Site public (QR codes, liens des fiches) : jamais l'adresse de l'espace équipe.
// Les six services de l'API-ZF (contenu statique, même liste que backend/src/shared/services.js).
export const serviceTitles = { orientation: 'Accueil et orientation', regimes: 'Régimes d’investissement', facilitation: 'Facilitation administrative', industrial_site: 'Implantation industrielle', aftercare: 'Accompagnement après implantation', partnerships: 'Opportunités et partenariats' };
export const publicBaseUrl = (import.meta.env.VITE_PUBLIC_URL || 'https://hub.investir.tg').replace(/\/$/, '');

// Issue d'un tour de roue : perdu, lot à remettre ou lot remis.
export const wheelPlayStatus = (play) => {
  if (play.result?.kind !== 'prize') return 'Perdu';
  return play.claimedAt ? 'Lot remis' : 'Lot à remettre';
};
