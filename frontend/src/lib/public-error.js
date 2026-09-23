const errorKeys = {
  CONSENT_REQUIRED: 'common.consentRequired',
  VALIDATION_ERROR: 'common.validationFailed',
};

export const publicErrorMessage = (t, error) => t(errorKeys[error?.code] || 'common.requestFailed');
