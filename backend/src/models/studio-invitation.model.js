// Invitation au Studio (document, module M5) : l'invité reçoit un lien personnel, réserve lui-même son créneau,
// reçoit des rappels, puis sa capsule prête à partager.
const STUDIO_STATUSES = ['invited', 'booked', 'declined', 'cancelled', 'delivered'];

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'StudioInvitation',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      createdByUserId: { type: DataTypes.UUID, allowNull: true, field: 'created_by_user_id' },
      // Stand de l'invité, s'il en a un (« 2 min avec… » : une capsule par occupant).
      occupantId: { type: DataTypes.UUID, allowNull: true, field: 'occupant_id' },
      token: { type: DataTypes.STRING(64), allowNull: false, unique: true },
      guestName: { type: DataTypes.STRING(160), allowNull: false, field: 'guest_name' },
      email: { type: DataTypes.STRING(180), allowNull: true },
      phone: { type: DataTypes.STRING(32), allowNull: true },
      organization: { type: DataTypes.STRING(160), allowNull: true },
      // Clé d'un des formats de tournage réglés dans Paramètres.
      format: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'two_minutes' },
      subject: { type: DataTypes.STRING(180), allowNull: true },
      language: { type: DataTypes.STRING(2), allowNull: false, defaultValue: 'fr', validate: { isIn: [['fr', 'en']] } },
      // Créneau choisi par l'invité (vide tant qu'il n'a pas réservé).
      scheduledAt: { type: DataTypes.DATE, allowNull: true, field: 'scheduled_at' },
      status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'invited', validate: { isIn: [STUDIO_STATUSES] } },
      respondedAt: { type: DataTypes.DATE, allowNull: true, field: 'responded_at' },
      bookedAt: { type: DataTypes.DATE, allowNull: true, field: 'booked_at' },
      capsuleUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'capsule_url' },
      deliveredAt: { type: DataTypes.DATE, allowNull: true, field: 'delivered_at' },
    },
    { tableName: 'studio_invitations', underscored: true },
  );

module.exports.STUDIO_STATUSES = STUDIO_STATUSES;
