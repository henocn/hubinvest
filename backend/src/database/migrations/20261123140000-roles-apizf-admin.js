'use strict';

// Nouveaux rôles : l'administrateur devient le compte de l'API-ZF (vue globale, sans stand) et l'occupant devient
// l'administrateur de son stand. Un ancien administrateur rattaché à un stand passe donc occupant de ce stand.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query("UPDATE users SET role = 'occupant' WHERE role = 'admin' AND occupant_id IS NOT NULL");
  },

  // Sans retour possible : on ne sait plus quels occupants étaient administrateurs de stand.
  async down() {},
};
