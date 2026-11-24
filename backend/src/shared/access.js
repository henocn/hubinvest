const { Op } = require('sequelize');
const roles = require('./roles');

// Équipe de l'API-ZF, avec la vue de tous les stands : super administrateurs et administrateurs.
const GLOBAL_ROLES = Object.freeze([roles.SUPER_ADMIN, roles.ADMIN]);
// Comptes qui gèrent B2B, Défis et tableau de bord : l'équipe API-ZF et l'occupant pour son stand (le Studio reste à l'API-ZF).
const MANAGER_ROLES = Object.freeze([roles.SUPER_ADMIN, roles.ADMIN, roles.OCCUPANT]);

const isGlobal = (user) => GLOBAL_ROLES.includes(user?.role);

// Équipe API-ZF élargie : super administrateurs, administrateurs et occupants du Stand API-ZF.
// Elle seule tient les Guichets et la Roue des opportunités (codes de jeu, lots).
const isApizfOccupant = (user) => user?.role === roles.OCCUPANT && user.occupant?.space === 'apizf';
const isApizfTeam = (user) => isGlobal(user) || isApizfOccupant(user);

// Les mêmes comptes, actifs, pour une requête sur les utilisateurs (User.findAll / findOne).
const apizfTeamQuery = (where = {}) => ({
  where: { ...where, isActive: true, [Op.or]: [{ role: { [Op.in]: GLOBAL_ROLES } }, { role: roles.OCCUPANT, '$occupant.space$': 'apizf' }] },
  include: [{ association: 'occupant', attributes: [], required: false }],
});

// Stand auquel limiter les données d'un compte : aucun pour l'équipe API-ZF (tout voir), le sien pour un occupant.
const standScope = (user) => (isGlobal(user) ? null : user.occupantId || null);

module.exports = { GLOBAL_ROLES, MANAGER_ROLES, isGlobal, isApizfOccupant, isApizfTeam, apizfTeamQuery, standScope };
