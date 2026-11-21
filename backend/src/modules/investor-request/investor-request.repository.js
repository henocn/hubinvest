const { Op } = require('sequelize');
const { InvestorRequest, InvestorFollowUp, InvestorMeeting, User } = require('../../models');
const roles = require('../../shared/roles');

const person = ['id', 'firstName', 'lastName'];
const contactUserInclude = { model: User, as: 'contactUser', attributes: person, required: false };

const findAll = ({ status, search, limit, offset }) => {
  const where = {};
  if (status) where.status = status;
  if (search) {
    where[Op.or] = [
      { fullName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
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
    [{ model: InvestorFollowUp, as: 'followUps' }, 'doneAt', 'DESC'],
    [{ model: InvestorMeeting, as: 'meetings' }, 'startsAt', 'ASC'],
  ],
});

const create = (values) => InvestorRequest.create(values);
const update = (request, values) => request.update(values);

// L'interlocuteur nommé est un membre actif de l'équipe API-ZF (super administrateur).
const findTeamMember = (id) => User.findOne({ where: { id, role: roles.SUPER_ADMIN, isActive: true }, attributes: person });
const findTeam = () => User.findAll({ where: { role: roles.SUPER_ADMIN, isActive: true }, attributes: person, order: [['firstName', 'ASC']] });

const countFollowUps = (investorRequestId) => InvestorFollowUp.count({ where: { investorRequestId } });
const createFollowUp = (values) => InvestorFollowUp.create(values);
const findFollowUp = (id, investorRequestId) => InvestorFollowUp.findOne({ where: { id, investorRequestId } });
const destroyFollowUp = (followUp) => followUp.destroy();

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
  update,
  findTeamMember,
  findTeam,
  countFollowUps,
  createFollowUp,
  findFollowUp,
  destroyFollowUp,
  createMeeting,
  findMeeting,
  updateMeeting,
  destroyMeeting,
  countOverdue,
};
