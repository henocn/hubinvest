const { Op } = require('sequelize');
const { User, Occupant } = require('../../models');

const findUserByEmail = (email) =>
  User.unscoped().findOne({
    where: { email },
    include: [{ model: Occupant, as: 'occupant', attributes: ['id', 'name', 'slug', 'standLabel', 'activity', 'logoUrl', 'status'] }],
  });

const savePasswordReset = (user, passwordResetCodeHash, passwordResetExpiresAt) => user.update({
  passwordResetCodeHash,
  passwordResetExpiresAt,
  passwordResetAttempts: 0,
});

const clearPasswordReset = (user) => user.update({
  passwordResetCodeHash: null,
  passwordResetExpiresAt: null,
  passwordResetAttempts: 0,
});

const resetPassword = async (email, passwordResetCodeHash, passwordHash) => {
  const [updated] = await User.unscoped().update({
    passwordHash,
    passwordResetCodeHash: null,
    passwordResetExpiresAt: null,
    passwordResetAttempts: 0,
  }, {
    where: {
      email,
      passwordResetCodeHash,
      passwordResetExpiresAt: { [Op.gt]: new Date() },
      passwordResetAttempts: { [Op.lt]: 5 },
      isActive: true,
    },
  });
  return updated === 1;
};

const recordFailedReset = (email) => User.unscoped().increment('passwordResetAttempts', {
  by: 1,
  where: {
    email,
    passwordResetCodeHash: { [Op.ne]: null },
    passwordResetExpiresAt: { [Op.gt]: new Date() },
    passwordResetAttempts: { [Op.lt]: 5 },
    isActive: true,
  },
});

module.exports = { findUserByEmail, savePasswordReset, clearPasswordReset, resetPassword, recordFailedReset };
