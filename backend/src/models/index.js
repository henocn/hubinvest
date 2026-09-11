const { DataTypes } = require('sequelize');
const sequelize = require('../database/sequelize');
const defineOccupant = require('./occupant.model');
const defineUser = require('./user.model');
const defineContact = require('./contact.model');

const Occupant = defineOccupant(sequelize, DataTypes);
const User = defineUser(sequelize, DataTypes);
const Contact = defineContact(sequelize, DataTypes);

Occupant.hasMany(User, { foreignKey: 'occupantId', as: 'users' });
User.belongsTo(Occupant, { foreignKey: 'occupantId', as: 'occupant' });

Occupant.hasMany(Contact, { foreignKey: 'occupantId', as: 'contacts' });
Contact.belongsTo(Occupant, { foreignKey: 'occupantId', as: 'occupant' });

User.hasMany(Contact, { foreignKey: 'createdByUserId', as: 'createdContacts' });
Contact.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });

module.exports = { sequelize, Occupant, User, Contact };
