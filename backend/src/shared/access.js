const roles = require('./roles');

// Équipe de l'API-ZF, avec la vue de tous les stands : super administrateurs et administrateurs.
const GLOBAL_ROLES = Object.freeze([roles.SUPER_ADMIN, roles.ADMIN]);
// Comptes qui gèrent B2B, Défis et tableau de bord : l'équipe API-ZF et l'occupant pour son stand (le Studio reste à l'API-ZF).
const MANAGER_ROLES = Object.freeze([roles.SUPER_ADMIN, roles.ADMIN, roles.OCCUPANT]);

const isGlobal = (user) => GLOBAL_ROLES.includes(user?.role);

// Stand auquel limiter les données d'un compte : aucun pour l'équipe API-ZF (tout voir), le sien pour un occupant.
const standScope = (user) => (isGlobal(user) ? null : user.occupantId || null);

module.exports = { GLOBAL_ROLES, MANAGER_ROLES, isGlobal, standScope };
