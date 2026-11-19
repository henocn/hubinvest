import { useEffect, useState } from 'react';
import { api } from './api';

// Réglages publics décidés dans l'administration (modules ouverts, nombre de stands des Défis).
// Chargés une fois par visite et partagés par toutes les pages ; tout est ouvert tant que la réponse n'est pas arrivée.
const DEFAULTS = {
  contactRequestsOpen: true,
  investorDeskOpen: true,
  b2bOpen: true,
  challengeOpen: true,
  wheelOpen: true,
};

let cached = null;
let pending = null;

const loadSettings = () => {
  if (!pending) {
    pending = api.publicSettings()
      .then((data) => { cached = { ...DEFAULTS, ...data }; return cached; })
      .catch(() => { pending = null; return cached || DEFAULTS; });
  }
  return pending;
};

export function useSiteSettings() {
  const [settings, setSettings] = useState(cached || DEFAULTS);
  useEffect(() => {
    let active = true;
    loadSettings().then((data) => { if (active) setSettings(data); });
    return () => { active = false; };
  }, []);
  return settings;
}
