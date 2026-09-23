const deepl = require('deepl-node');
const env = require('../config/env');

const cache = new Map();
const cacheLimit = 2000;
const client = env.translation.deeplAuthKey
  ? new deepl.DeepLClient(env.translation.deeplAuthKey, {
      appInfo: { appName: 'hubinvest', appVersion: '0.1.0' },
      maxRetries: 2,
      minTimeout: 2000,
      sendPlatformInfo: false,
    })
  : null;

const plain = (value) => (value?.toJSON ? value.toJSON() : value);

const getPath = (object, path) => path.split('.').reduce((value, key) => value?.[key], object);

const setPath = (object, path, value) => {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((current, key) => current?.[key], object);
  if (target) target[last] = value;
};

const remember = (key, value) => {
  if (cache.size >= cacheLimit) cache.delete(cache.keys().next().value);
  cache.set(key, value);
};

const translatePublicContent = async (data, paths, language) => {
  if (language !== 'en' || !client || !data) return data;

  const items = (Array.isArray(data) ? data : [data]).map((item) => plain(item));
  const copies = JSON.parse(JSON.stringify(items));
  const sourceTexts = [...new Set(copies.flatMap((item) => paths.map((path) => getPath(item, path)))
    .filter((value) => typeof value === 'string' && value.trim()))];
  const missing = sourceTexts.filter((text) => !cache.has(`en:${text}`));

  if (missing.length) {
    try {
      const results = await client.translateText(missing, 'fr', 'en-GB', { preserveFormatting: true });
      const translations = Array.isArray(results) ? results : [results];
      missing.forEach((text, index) => remember(`en:${text}`, translations[index]?.text || text));
    } catch {}
  }

  copies.forEach((item) => paths.forEach((path) => {
    const value = getPath(item, path);
    if (typeof value === 'string' && value.trim()) setPath(item, path, cache.get(`en:${value}`) || value);
  }));

  return Array.isArray(data) ? copies : copies[0];
};

module.exports = { translatePublicContent };
