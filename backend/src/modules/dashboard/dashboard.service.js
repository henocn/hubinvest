const { Op } = require('sequelize');
const AppError = require('../../shared/app-error');
const { isApizfTeam, isGlobal } = require('../../shared/access');
const settingsService = require('../settings/settings.service');
const {
  B2bMeeting, B2bNeed, B2bProposal, ChallengePassage, ChallengePassport, Contact, InvestorFollowUp, InvestorMeeting, InvestorRequest, Occupant,
  StudioInvitation, WheelPlay,
} = require('../../models');

// Début de la journée à Lomé (UTC, sans heure d'été).
const startOfToday = () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
};

// Fin de la journée à Lomé : une relance due avant cette heure est à faire aujourd'hui.
const endOfToday = () => {
  const end = startOfToday();
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
};

// Agenda du jour : relances en retard ou du jour (l'équipe API-ZF), rendez-vous des guichets et rencontres B2B du jour.
const agenda = async (isApizf, occupantId) => {
  const start = startOfToday();
  const end = endOfToday();
  const [requests, investorMeetings, b2bMeetings] = await Promise.all([
    isApizf ? InvestorRequest.findAll({
      where: { nextFollowUpAt: { [Op.lt]: end } },
      attributes: ['id', 'fullName', 'organization', 'nextFollowUpAt'],
      include: [{ model: InvestorFollowUp, as: 'followUps', attributes: ['dueAt', 'reason'], where: { doneAt: null }, required: false }],
      order: [['nextFollowUpAt', 'ASC']],
      limit: 12,
    }) : [],
    isApizf ? InvestorRequest.findAll({
      attributes: ['id', 'fullName', 'organization'],
      include: [{ model: InvestorMeeting, as: 'meetings', attributes: ['startsAt', 'location'], where: { status: 'scheduled', startsAt: { [Op.gte]: start, [Op.lt]: end } }, required: true }],
    }) : [],
    B2bMeeting.findAll({
      where: { outcome: null, startsAt: { [Op.gte]: start, [Op.lt]: end } },
      attributes: ['startsAt', 'tableNumber'],
      include: [{
        model: B2bProposal, as: 'proposal', attributes: ['id', 'fullName'], required: true,
        include: [{ model: B2bNeed, as: 'need', attributes: ['title'], where: occupantId ? { occupantId } : {}, required: true }],
      }],
    }),
  ]);
  const followUps = requests.map((request) => {
    const next = [...(request.followUps || [])].sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))[0];
    return { id: request.id, fullName: request.fullName, organization: request.organization, dueAt: request.nextFollowUpAt, reason: next?.reason || null };
  });
  const meetings = [
    ...investorMeetings.flatMap((request) => request.meetings.map((meeting) => ({
      kind: 'guichet', id: request.id, fullName: request.fullName, startsAt: meeting.startsAt, place: meeting.location,
    }))),
    ...b2bMeetings.map((meeting) => ({
      kind: 'b2b', id: meeting.proposal.id, fullName: meeting.proposal.fullName, startsAt: meeting.startsAt, place: `Table ${meeting.tableNumber} · ${meeting.proposal.need.title}`,
    })),
  ].sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  return { followUps, meetings };
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
  const isSuperAdmin = isGlobal(user);
  if (!isSuperAdmin && !user.occupantId) throw new AppError(403, 'STAND_REQUIRED', 'Ce compte n’est rattaché à aucun stand.');
  const occupantId = isSuperAdmin ? null : user.occupantId;
  // Guichets et roue : l'équipe API-ZF, dont les occupants du Stand API-ZF.
  const apizf = isApizfTeam(user);
  const byStand = occupantId ? { occupantId } : {};
  const today = startOfToday();

  const [
    investorNew, investorInProgress, investorTotal, investorOverdue, investorDueToday,
    b2bPending, b2bOpenNeeds,
    studioPending, studioConfirmed,
    players, rewardsToHand, rewardsHanded,
    wheelPlayed, wheelPlayedToday, wheelToHand,
  ] = await Promise.all([
    // Les guichets et le registre unique sont réservés à l'API-ZF : leurs chiffres ne concernent que le super administrateur.
    apizf ? InvestorRequest.count({ where: { status: 'new' } }) : 0,
    apizf ? InvestorRequest.count({ where: { status: 'in_progress' } }) : 0,
    apizf ? InvestorRequest.count() : 0,
    // Contacts dont une relance à faire a dépassé son heure (relance de classe, d'engagement ou ajoutée à la main).
    apizf ? InvestorRequest.count({ where: { nextFollowUpAt: { [Op.lt]: new Date() } } }) : 0,
    // Relances encore à l'heure, mais à faire avant la fin de la journée.
    apizf ? InvestorRequest.count({ where: { nextFollowUpAt: { [Op.gte]: new Date(), [Op.lt]: endOfToday() } } }) : 0,
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
    agenda: await agenda(apizf, occupantId),
  };

  if (apizf) {
    // Indicateurs du document v4 : diagnostics réalisés, sollicitations d'accompagnement prises en charge (avec un engagement
    // de suivi), et engagements dont la réponse promise n'est pas donnée à temps.
    const [diagnosed, supportTaken, commitmentsOverdue] = await Promise.all([
      InvestorRequest.count({ where: { diagnosedAt: { [Op.ne]: null } } }),
      InvestorRequest.count({ where: { classification: 'support', commitmentDueAt: { [Op.ne]: null } } }),
      InvestorRequest.count({ where: { classification: 'support', resolvedAt: null, commitmentDueAt: { [Op.lt]: new Date() } } }),
    ]);
    result.investor = { new: investorNew, inProgress: investorInProgress, total: investorTotal, overdue: investorOverdue, dueToday: investorDueToday, diagnosed, supportTaken, commitmentsOverdue };
  }

  if (isSuperAdmin) {
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
    // Guichets : contacts à traiter et relances à faire aujourd'hui (en retard comprises).
    ...(apizf && { 'investor-requests': investorNew + investorOverdue + investorDueToday, wheel: wheelToHand }),
    b2b: b2bPending,
    ...(isSuperAdmin && { challenges: rewardsToHand }),
  };
  return result;
};

module.exports = { overview };
