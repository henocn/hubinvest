const STORAGE_KEY = 'hubinvest-challenge-passport';
const RETENTION_MS = 20 * 24 * 60 * 60 * 1000;

export const saveChallengePassportToken = (token) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      token,
      expiresAt: Date.now() + RETENTION_MS,
    }));
  } catch {
    return false;
  }
  return true;
};

export const clearChallengePassportToken = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    return false;
  }
  return true;
};

export const readChallengePassportToken = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (typeof stored?.token !== 'string' || !stored.token || !Number.isFinite(stored.expiresAt) || stored.expiresAt <= Date.now()) {
      clearChallengePassportToken();
      return '';
    }
    return stored.token;
  } catch {
    clearChallengePassportToken();
    return '';
  }
};
