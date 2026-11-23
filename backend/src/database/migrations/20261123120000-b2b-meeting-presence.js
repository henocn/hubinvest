'use strict';

// Compte rendu B2B simplifié : le visiteur était présent ou absent, le reste va dans la note.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query("UPDATE b2b_meetings SET outcome = 'present' WHERE outcome IN ('held_follow_up', 'held_no_follow_up')");
    await queryInterface.sequelize.query("UPDATE b2b_meetings SET outcome = 'absent' WHERE outcome = 'no_show'");
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query("UPDATE b2b_meetings SET outcome = 'held_follow_up' WHERE outcome = 'present'");
    await queryInterface.sequelize.query("UPDATE b2b_meetings SET outcome = 'no_show' WHERE outcome = 'absent'");
  },
};
