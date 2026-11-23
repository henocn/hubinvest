const { Op } = require('sequelize');
const { InvestorRequest, InvestorFollowUp, InvestorMeeting, User, sequelize } = require('../../models');
const roles = require('../../shared/roles');

const person = ['id', 'firstName', 'lastName'];
const contactUserInclude = { model: User, as: 'contactUser', attributes: person, required: false };

const findAll = ({ status, guichet, search, limit, offset }) => {
  const where = {};
  if (status) where.status = status;
  if (guichet) where.guichet = guichet;
  if (search) {
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { organization: { [Op.iLike]: `%${search}%` } },
      { projectSummary: { [Op.iLike]: `%${search}%` } },
    ];
  }

  return InvestorRequest.findAndCountAll({
    where,
    include: [contactUserInclude],
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });
};

const findById = (id) => InvestorRequest.findByPk(id, { include: [contactUserInclude] });

// La fiche complète : interlocuteur, relances (la plus récente d'abord) et rendez-vous (dans l'ordre).
const findDetail = (id) => InvestorRequest.findByPk(id, {
  include: [
    contactUserInclude,
    { model: InvestorFollowUp, as: 'followUps', required: false, include: [{ model: User, as: 'createdBy', attributes: person }] },
    { model: InvestorMeeting, as: 'meetings', required: false, include: [{ model: User, as: 'createdBy', attributes: person }] },
  ],
  order: [
    [{ model: InvestorFollowUp, as: 'followUps' }, 'dueAt', 'DESC'],
    [{ model: InvestorMeeting, as: 'meetings' }, 'startsAt', 'ASC'],
  ],
});

const create = (values) => InvestorRequest.create(values);

// Rendez-vous réservé en ligne : le contact et son rendez-vous sont créés ensemble, ou pas du tout.
const createWithMeeting = (values, meetingValues) => sequelize.transaction(async (transaction) => {
  const investorRequest = await InvestorRequest.create(values, { transaction });
  const meeting = await InvestorMeeting.create({ ...meetingValues, investorRequestId: investorRequest.id, status: 'scheduled' }, { transaction });
  return { investorRequest, meeting };
});

// Rendez-vous prévus à un guichet entre deux instants (créneaux déjà pris).
const findGuichetMeetingsBetween = (guichet, from, to) => InvestorMeeting.findAll({
  where: { guichet, status: 'scheduled', startsAt: { [Op.gte]: from, [Op.lt]: to } },
  attributes: ['id', 'startsAt'],
});

const update = (request, values) => request.update(values);

// L'interlocuteur nommé est un membre actif de l'équipe API-ZF (super administrateur).
const findTeamMember = (id) => User.findOne({ where: { id, role: roles.SUPER_ADMIN, isActive: true }, attributes: person });
const findTeam = () => User.findAll({ where: { role: roles.SUPER_ADMIN, isActive: true }, attributes: person, order: [['firstName', 'ASC']] });

const countFollowUps = (investorRequestId) => InvestorFollowUp.count({ where: { investorRequestId } });
const createFollowUp = (values) => InvestorFollowUp.create(values);
const findFollowUp = (id, investorRequestId) => InvestorFollowUp.findOne({ where: { id, investorRequestId } });
const updateFollowUp = (followUp, values) => followUp.update(values);
const destroyFollowUp = (followUp) => followUp.destroy();
// Relances encore à faire d'un contact ; « sources » : seulement les relances automatiques de ces origines
// ('A', 'B' pour la classe, 'commitment' pour l'engagement de suivi).
const findPendingFollowUps = (investorRequestId, { sources = null } = {}) => InvestorFollowUp.findAll({
  where: { investorRequestId, doneAt: null, ...(sources && { autoSource: { [Op.in]: sources } }) },
  order: [['dueAt', 'ASC']],
});

const createMeeting = (values) => InvestorMeeting.create(values);
const findMeeting = (id, investorRequestId) => InvestorMeeting.findOne({ where: { id, investorRequestId } });
const updateMeeting = (meeting, values) => meeting.update(values);
const destroyMeeting = (meeting) => meeting.destroy();

// Contacts A dont la relance est dépassée, pour l'alerte du tableau de bord.
const countOverdue = (classification = 'A') => InvestorRequest.count({
  where: { classification, status: { [Op.ne]: 'closed' }, nextFollowUpAt: { [Op.lt]: new Date() } },
});

module.exports = {
  findAll,
  findById,
  findDetail,
  create,
  createWithMeeting,
  findGuichetMeetingsBetween,
  update,
  findTeamMember,
  findTeam,
  countFollowUps,
  createFollowUp,
  findFollowUp,
  updateFollowUp,
  destroyFollowUp,
  findPendingFollowUps,
  createMeeting,
  findMeeting,
  updateMeeting,
  destroyMeeting,
  countOverdue,
};
