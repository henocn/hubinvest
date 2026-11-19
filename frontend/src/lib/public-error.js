const errorKeys = {
  CONSENT_REQUIRED: 'common.consentRequired',
  VALIDATION_ERROR: 'common.validationFailed',
  WHEEL_CODE_INVALID: 'wheel.errors.invalid',
  WHEEL_CODE_USED: 'wheel.errors.used',
  WHEEL_CODE_EXPIRED: 'wheel.errors.expired',
  WHEEL_EMPTY: 'wheel.notReady',
  WHEEL_RATE_LIMITED: 'wheel.errors.rateLimited',
  WHEEL_PLAYER_REQUIRED: 'play.identifyFirst',
  MODULE_CLOSED: 'closed.generic',
};

export const publicErrorMessage = (t, error) => t(errorKeys[error?.code] || 'common.requestFailed');
