'use strict';

// Passages validés par QR et questions devant chaque stand : le Stand API-ZF ne valide plus d'étape, la cinquième étape
// est la récompense récupérée à son comptoir. Les joueurs qui avaient déjà leurs 4 stands de l'Espace Industrie, sans
// le passage au Stand API-ZF, passent donc « terminé » et peuvent récupérer leur récompense.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE challenge_passports AS passport
      SET status = 'completed', completed_at = NOW(), updated_at = NOW()
      WHERE passport.status = 'active'
        AND (
          SELECT COUNT(*) FROM challenge_passages AS passage
          JOIN occupants AS occupant ON occupant.id = passage.occupant_id
          WHERE passage.passport_id = passport.id AND occupant.space <> 'apizf'
        ) >= 4
    `);
  },

  // Rien à défaire : les passages ne sont pas modifiés.
  async down() {},
};
