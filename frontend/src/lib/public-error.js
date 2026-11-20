const errorKeys = {
  CONSENT_REQUIRED: 'common.consentRequired',
  VALIDATION_ERROR: 'common.validationFailed',
  WHEEL_CODE_INVALID: 'wheel.errors.invalid',
  WHEEL_CODE_USED: 'wheel.errors.used',
  WHEEL_CODE_TAKEN: 'wheel.errors.taken',
  WHEEL_EMPTY: 'wheel.notReady',
  WHEEL_RATE_LIMITED: 'wheel.errors.rateLimited',
  WHEEL_PLAYER_REQUIRED: 'play.identifyFirst',
  MODULE_CLOSED: 'closed.generic',
  WHEEL_DAILY_LIMIT: 'wheel.errors.dailyLimit',
  LIVE_NOT_OPEN: 'live.notOpen',
  LIVE_QUESTION_RATE_LIMITED: 'live.rateLimited',
};

export const publicErrorMessage = (t, error) => t(errorKeys[error?.code] || 'common.requestFailed');
