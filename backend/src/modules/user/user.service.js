const bcrypt = require('bcryptjs');
const AppError = require('../../shared/app-error');
const roles = require('../../shared/roles');
const userRepository = require('./user.repository');

const occupantRoles = [roles.OCCUPANT_MANAGER, roles.OCCUPANT_MEMBER];

const protectSuperAdmin = (actor, targetRole) => {
  if (actor.role !== roles.SUPER_ADMIN && targetRole === roles.SUPER_ADMIN) {
    throw new AppError(403, 'FORBIDDEN_ROLE', 'Seul un super administrateur peut gerer ce role.');
  }
};

const serialize = (user) => {
  const payload = user.toJSON();
  delete payload.passwordHash;
  return payload;
};

const validateOccupant = async (values) => {
  if (occupantRoles.includes(values.role) && !values.occupantId) {
    throw new AppError(422, 'OCCUPANT_REQUIRED', 'Un utilisateur occupant doit etre rattache a un occupant.');
  }

  if (values.occupantId) {
    const occupant = await userRepository.findOccupantById(values.occupantId);
    if (!occupant) {
      throw new AppError(422, 'OCCUPANT_NOT_FOUND', 'Occupant introuvable.');
    }
  }
};

const list = () => userRepository.findAll();

const get = async (id) => {
  const user = await userRepository.findById(id);
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
  }
  return user;
};

const create = async (actor, values) => {
  protectSuperAdmin(actor, values.role);
  const normalized = { ...values, email: values.email.toLowerCase() };
  await validateOccupant(normalized);
  normalized.passwordHash = await bcrypt.hash(normalized.password, 12);
  delete normalized.password;
  const user = await userRepository.create(normalized);
  return serialize(user);
};

const update = async (actor, id, values) => {
  const user = await get(id);
  protectSuperAdmin(actor, user.role);
  protectSuperAdmin(actor, values.role);
  const nextValues = { ...values };
  const resultingValues = {
    role: nextValues.role || user.role,
    occupantId: Object.prototype.hasOwnProperty.call(nextValues, 'occupantId')
      ? nextValues.occupantId
      : user.occupantId,
  };

  await validateOccupant(resultingValues);

  if (nextValues.email) {
    nextValues.email = nextValues.email.toLowerCase();
  }
  if (nextValues.password) {
    nextValues.passwordHash = await bcrypt.hash(nextValues.password, 12);
    delete nextValues.password;
  }

  const updated = await userRepository.update(user, nextValues);
  return serialize(updated);
};

module.exports = { list, get, create, update };
