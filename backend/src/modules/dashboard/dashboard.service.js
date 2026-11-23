const { Op } = require('sequelize');
const AppError = require('../../shared/app-error');
const roles = require('../../shared/roles');
const settingsService = require('../settings/settings.service');
const {
  B2bNeed, B2bProposal, ChallengePassage, ChallengePassport, Contact, InvestorRequest, Occupant, StudioInvitation, WheelPlay,
} = require('../../models');

// Début de la journée à Lomé (UTC, sans heure d'été).
const startOfToday = () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
};

// Joueurs passés par un stand (ou tous pour le super administrateur), avec un statut éventuel.
const countPassports = (occupantId, where = {}) => ChallengePassport.count({
  where,
  distinct: true,
  col: 'id',
  ...(occupantId && { include: [{ model: ChallengePassage, as: 'passages', attributes: [], where: { occupantId }, required: true }] }),
});

// Stock de récompenses du parcours, commun à tout le salon (null quand il n'est pas suivi).
const rewardStock = async () => {
  const stock = settingsService.challengeRewardStock();
  if (!stock) return { rewardStock: null, rewardsLeft: null };
  return { rewardStock: stock, rewardsLeft: Math.max(0, stock - await ChallengePassport.count({ where: { status: 'redeemed' } })) };
};

/**
 * Chiffres du tableau de bord et compteurs « à traiter » du menu.
 * L'administrateur ne voit que son stand ; la roue est commune à tout le Hub.
 */
const overview = async (user) => {
  const isSuperAdmin = user.role === roles.SUPER_ADMIN;
  if (!isSuperAdmin && !user.occupantId) throw new AppError(403, 'STAND_REQUIRED', 'Cet administrateur n’est rattaché à aucun stand.');
  const occupantId = isSuperAdmin ? null : user.occupantId;
  const byStand = occupantId ? { occupantId } : {};
  const today = startOfToday();

  const [
    investorNew, investorInProgress, investorTotal, investorOverdue,
    b2bPending, b2bOpenNeeds,
    studioPending, studioConfirmed,
    players, rewardsToHand, rewardsHanded,
    wheelPlayed, wheelPlayedToday, wheelToHand,
  ] = await Promise.all([
    // Les guichets et le registre unique sont réservés à l'API-ZF : leurs chiffres ne concernent que le super administrateur.
    isSuperAdmin ? InvestorRequest.count({ where: { status: 'new' } }) : 0,
    isSuperAdmin ? InvestorRequest.count({ where: { status: 'in_progress' } }) : 0,
    isSuperAdmin ? InvestorRequest.count() : 0,
    // Contacts dont une relance à faire a dépassé son heure (relance de classe, d'engagement ou ajoutée à la main).
    isSuperAdmin ? InvestorRequest.count({ where: { nextFollowUpAt: { [Op.lt]: new Date() } } }) : 0,
    B2bProposal.count({ where: { status: 'pending' }, include: [{ model: B2bNeed, as: 'need', attributes: [], where: byStand, required: true }] }),
    B2bNeed.count({ where: { ...byStand, status: 'open' } }),
    // Studio : invités qui n'ont pas encore choisi leur créneau, passages réservés à venir.
    StudioInvitation.count({ where: { ...byStand, status: 'invited' } }),
    StudioInvitation.count({ where: { ...byStand, status: 'booked', scheduledAt: { [Op.gte]: new Date() } } }),
    countPassports(occupantId),
    countPassports(occupantId, { status: 'completed' }),
    countPassports(occupantId, { status: 'redeemed' }),
    WheelPlay.count(),
    WheelPlay.count({ where: { playedAt: { [Op.gte]: today } } }),
    WheelPlay.count({ where: { resultKind: 'prize', claimedAt: null } }),
  ]);

  const result = {
    b2b: { pendingProposals: b2bPending, openNeeds: b2bOpenNeeds },
    studio: { pending: studioPending, confirmed: studioConfirmed },
    challenges: { players, rewardsToHand, rewardsHanded, ...(await rewardStock()) },
    wheel: { played: wheelPlayed, playedToday: wheelPlayedToday, prizesToHand: wheelToHand },
  };

  if (isSuperAdmin) {
    // Indicateurs du document v4 : diagnostics réalisés, sollicitations d'accompagnement prises en charge (avec un engagement
    // de suivi), et engagements dont la réponse promise n'est pas donnée à temps.
    const [diagnosed, supportTaken, commitmentsOverdue] = await Promise.all([
      InvestorRequest.count({ where: { diagnosedAt: { [Op.ne]: null } } }),
      InvestorRequest.count({ where: { classification: 'support', commitmentDueAt: { [Op.ne]: null } } }),
      InvestorRequest.count({ where: { classification: 'support', resolvedAt: null, commitmentDueAt: { [Op.lt]: new Date() } } }),
    ]);
    result.investor = { new: investorNew, inProgress: investorInProgress, total: investorTotal, overdue: investorOverdue, diagnosed, supportTaken, commitmentsOverdue };
    const [activeStands, contacts, contactsToday, siteRequests] = await Promise.all([
      Occupant.count({ where: { status: 'active' } }),
      Contact.count(),
      Contact.count({ where: { createdAt: { [Op.gte]: today } } }),
      Contact.count({ where: { source: 'public' } }),
    ]);
    result.stands = { active: activeStands };
    result.contacts = { total: contacts, today: contactsToday, fromSite: siteRequests };
  }

  // Ce qui attend une action : affiché en pastille dans le menu, au nombre exact.
  result.todo = {
    ...(isSuperAdmin && { 'investor-requests': investorNew + investorOverdue }),
    b2b: b2bPending,
    challenges: rewardsToHand,
    wheel: wheelToHand,
  };
  return result;
};

module.exports = { overview };
