// Rendez-vous de l'Investor Desk avec un investisseur : date, heure et lieu, envoyés par e-mail.
module.exports = (sequelize, DataTypes) =>
  sequelize.define(
    'InvestorMeeting',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      investorRequestId: { type: DataTypes.UUID, allowNull: false, field: 'investor_request_id' },
      startsAt: { type: DataTypes.DATE, allowNull: false, field: 'starts_at' },
      location: { type: DataTypes.STRING(160), allowNull: false },
      createdByUserId: { type: DataTypes.UUID, allowNull: true, field: 'created_by_user_id' },
    },
    { tableName: 'investor_meetings', underscored: true },
  );
