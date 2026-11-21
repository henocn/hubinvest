'use strict';

// Studio (document, module M5) : invitation personnelle, créneau réservé par l'invité, rappels automatiques,
// livraison de la capsule. L'invité a désormais un e-mail, un format, une langue ; le créneau est vide jusqu'à sa réservation.
// Statuts : invited (créneau à choisir), booked, declined, cancelled, delivered (capsule envoyée).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const add = (column, definition) => queryInterface.addColumn('studio_invitations', column, definition, { transaction });
      await add('email', { type: Sequelize.STRING(180), allowNull: true });
      await add('phone', { type: Sequelize.STRING(32), allowNull: true });
      await add('organization', { type: Sequelize.STRING(160), allowNull: true });
      await add('format', { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'two_minutes' });
      await add('language', { type: Sequelize.STRING(2), allowNull: false, defaultValue: 'fr' });
      await add('booked_at', { type: Sequelize.DATE, allowNull: true });
      await add('capsule_url', { type: Sequelize.STRING(500), allowNull: true });
      await add('delivered_at', { type: Sequelize.DATE, allowNull: true });
      await queryInterface.changeColumn('studio_invitations', 'scheduled_at', { type: Sequelize.DATE, allowNull: true }, { transaction });
      await queryInterface.changeColumn('studio_invitations', 'subject', { type: Sequelize.STRING(180), allowNull: true }, { transaction });
      await queryInterface.sequelize.query("UPDATE studio_invitations SET status = CASE status WHEN 'pending' THEN 'invited' WHEN 'confirmed' THEN 'booked' ELSE status END", { transaction });
      await queryInterface.sequelize.query("ALTER TABLE studio_invitations ALTER COLUMN status SET DEFAULT 'invited'", { transaction });
      // Un seul invité par créneau : la base refuse une double réservation, même simultanée.
      await queryInterface.addIndex('studio_invitations', ['scheduled_at'], {
        unique: true,
        where: { status: 'booked' },
        name: 'studio_invitations_booked_slot_unique',
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('studio_invitations', 'studio_invitations_booked_slot_unique', { transaction });
      await queryInterface.sequelize.query("ALTER TABLE studio_invitations ALTER COLUMN status SET DEFAULT 'pending'", { transaction });
      await queryInterface.sequelize.query("UPDATE studio_invitations SET status = CASE status WHEN 'invited' THEN 'pending' WHEN 'booked' THEN 'confirmed' WHEN 'delivered' THEN 'confirmed' WHEN 'cancelled' THEN 'declined' ELSE status END", { transaction });
      await queryInterface.sequelize.query("UPDATE studio_invitations SET scheduled_at = COALESCE(scheduled_at, created_at), subject = COALESCE(subject, 'Studio')", { transaction });
      await queryInterface.changeColumn('studio_invitations', 'scheduled_at', { type: Sequelize.DATE, allowNull: false }, { transaction });
      await queryInterface.changeColumn('studio_invitations', 'subject', { type: Sequelize.STRING(180), allowNull: false }, { transaction });
      for (const column of ['email', 'phone', 'organization', 'format', 'language', 'booked_at', 'capsule_url', 'delivered_at']) {
        await queryInterface.removeColumn('studio_invitations', column, { transaction });
      }
    });
  },
};
