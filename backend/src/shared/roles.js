// Quatre rôles (droits détaillés dans shared/access.js) :
// - super administrateur : tout (l'agence) ;
// - administrateur : l'API-ZF, tout sauf les utilisateurs, les paramètres et le journal des actions ;
// - occupant : l'administrateur d'un stand, limité aux données de son stand ;
// - animateur : scan des joueurs, remises, questions du public.
const roles = Object.freeze({
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  OCCUPANT: 'occupant',
  ANIMATOR: 'animateur',
});

module.exports = roles;
