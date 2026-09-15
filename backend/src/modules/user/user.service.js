const bcrypt = require('bcryptjs');
const AppError = require('../../shared/app-error');
const roles = require('../../shared/roles');
const adminScopes = require('../../shared/admin-scopes');
const userRepository = require('./user.repository');

const protectSuperAdmin = (actor, targetRole) => {
  if (actor.role !== roles.SUPER_ADMIN && targetRole === roles.SUPER_ADMIN) {
    throw new AppError(403, 'FORBIDDEN_ROLE', 'Seul un super administrateur peut gérer ce rôle.');
  }
};

const serialize = (user) => {
  const payload = user.toJSON();
  delete payload.passwordHash;
  return payload;
};

const validateOccupant = async (values) => {
  if (values.role === roles.OCCUPANT && !values.occupantId) {
    throw new AppError(422, 'OCCUPANT_REQUIRED', 'Un utilisateur occupant doit être rattaché à un occupant.');
  }

  if (values.role !== roles.OCCUPANT && values.occupantId) {
    throw new AppError(422, 'OCCUPANT_FORBIDDEN', 'Seul un compte occupant peut être rattaché à un stand.');
  }

  if (values.role === roles.ADMIN && !Object.values(adminScopes).includes(values.adminScope)) {
    throw new AppError(422, 'ADMIN_SCOPE_REQUIRED', 'Choisissez le périmètre de cet administrateur.');
  }

  if (values.role !== roles.ADMIN && values.adminScope) {
    throw new AppError(422, 'ADMIN_SCOPE_FORBIDDEN', 'Ce rôle ne possède pas de périmètre administratif.');
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

const getProfile = async (actor) => serialize(await get(actor.id));

const changePassword = async (actor, values) => {
  const user = await userRepository.findByIdWithPassword(actor.id);
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable.');
  }

  const validPassword = await bcrypt.compare(values.currentPassword, user.passwordHash);
  if (!validPassword) {
    throw new AppError(422, 'INVALID_CURRENT_PASSWORD', 'Le mot de passe actuel est incorrect.');
  }

  await userRepository.update(user, { passwordHash: await bcrypt.hash(values.newPassword, 12) });
};

const create = async (actor, values) => {
  protectSuperAdmin(actor, values.role);
  const normalized = { ...values, email: values.email.toLowerCase() };
  normalized.occupantId = normalized.role === roles.OCCUPANT ? normalized.occupantId : null;
  normalized.adminScope = normalized.role === roles.ADMIN ? normalized.adminScope : null;
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

  if (actor.id === user.id && nextValues.isActive === false) {
    throw new AppError(409, 'SELF_DEACTIVATION_FORBIDDEN', 'Vous ne pouvez pas désactiver votre propre compte.');
  }

  if (actor.id === user.id && nextValues.role && nextValues.role !== user.role) {
    throw new AppError(409, 'SELF_ROLE_CHANGE_FORBIDDEN', 'Vous ne pouvez pas modifier votre propre rôle.');
  }

  const resultingValues = {
    role: nextValues.role || user.role,
    occupantId: Object.prototype.hasOwnProperty.call(nextValues, 'occupantId')
      ? nextValues.occupantId
      : user.occupantId,
    adminScope: Object.prototype.hasOwnProperty.call(nextValues, 'adminScope')
      ? nextValues.adminScope
      : user.adminScope,
  };

  if (resultingValues.role !== roles.OCCUPANT) resultingValues.occupantId = null;
  if (resultingValues.role !== roles.ADMIN) resultingValues.adminScope = null;

  await validateOccupant(resultingValues);

  nextValues.occupantId = resultingValues.occupantId;
  nextValues.adminScope = resultingValues.adminScope;

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

const remove = async (actor, id) => {
  const user = await get(id);
  protectSuperAdmin(actor, user.role);

  if (actor.id === user.id) {
    throw new AppError(409, 'SELF_DELETE_FORBIDDEN', 'Vous ne pouvez pas supprimer votre propre compte.');
  }

  await userRepository.remove(user);
};

module.exports = { list, get, getProfile, changePassword, create, update, remove };
