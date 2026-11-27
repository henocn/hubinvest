const errorKeys = {
  CONSENT_REQUIRED: 'common.consentRequired',
  VALIDATION_ERROR: 'common.validationFailed',
  RATE_LIMITED: 'common.rateLimited',
  STUDIO_SLOT_TAKEN: 'studio.errors.taken',
  GUICHET_SLOT_TAKEN: 'guichets.errors.taken',
  GUICHET_SLOT_INVALID: 'guichets.errors.invalid',
  STUDIO_ALREADY_BOOKED: 'studio.errors.alreadyBooked',
  STUDIO_INVITATION_CLOSED: 'studio.errors.closed',
  STUDIO_INVITATION_NOT_FOUND: 'studio.notFound',
  WHEEL_NO_SPINS_LEFT: 'wheel.noSpins',
  WHEEL_EMPTY: 'wheel.notReady',
  WHEEL_PLAYER_REQUIRED: 'play.identifyFirst',
  MODULE_CLOSED: 'closed.generic',
  WHEEL_DAILY_LIMIT: 'wheel.errors.dailyLimit',
  LIVE_NOT_OPEN: 'live.notOpen',
  LIVE_QUESTION_RATE_LIMITED: 'live.rateLimited',
};

export const publicErrorMessage = (t, error) => t(errorKeys[error?.code] || 'common.requestFailed');
