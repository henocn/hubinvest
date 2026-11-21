// Rendez-vous d'une demande B2B acceptée : créneau et table, puis compte rendu en un clic.
const B2B_MEETING_OUTCOMES = ['held_follow_up', 'held_no_follow_up', 'no_show'];

module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'B2bMeeting',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      b2bProposalId: { type: DataTypes.UUID, allowNull: false, field: 'b2b_proposal_id' },
      startsAt: { type: DataTypes.DATE, allowNull: false, field: 'starts_at' },
      durationMinutes: { type: DataTypes.INTEGER, allowNull: false, field: 'duration_minutes' },
      tableNumber: { type: DataTypes.INTEGER, allowNull: false, field: 'table_number' },
      outcome: { type: DataTypes.STRING(20), allowNull: true, validate: { isIn: [B2B_MEETING_OUTCOMES] } },
      note: { type: DataTypes.TEXT, allowNull: true },
      reportedAt: { type: DataTypes.DATE, allowNull: true, field: 'reported_at' },
      reportedByUserId: { type: DataTypes.UUID, allowNull: true, field: 'reported_by_user_id' },
      createdByUserId: { type: DataTypes.UUID, allowNull: true, field: 'created_by_user_id' },
    },
    { tableName: 'b2b_meetings', underscored: true },
  );

module.exports.B2B_MEETING_OUTCOMES = B2B_MEETING_OUTCOMES;
