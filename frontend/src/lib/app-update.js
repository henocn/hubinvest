import { registerSW } from 'virtual:pwa-register';

// Mise à jour quasi instantanée après un déploiement. Chaque compilation produit un nouveau sw.js (empreinte de chaque
// fichier) : l'application compare le sien à celui du serveur dès l'ouverture, à chaque retour sur l'application
// (onglet réaffiché, téléphone déverrouillé, réseau revenu) et toutes les 20 secondes. Une nouvelle version prend la main
// aussitôt et la page se recharge seule — sauf pendant une saisie : le rechargement attend que le champ soit quitté.
const CHECK_EVERY = 20 * 1000;

// Date et heure de la compilation, affichées dans le menu pour vérifier qu'un appareil est à jour.
// eslint-disable-next-line no-undef
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '';
export const appVersionLabel = () => {
  if (!APP_VERSION) return '';
  const date = new Date(APP_VERSION);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
};

const typing = () => {
  const element = document.activeElement;
  return Boolean(element && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)));
};

let started = false;

export function startAppUpdates() {
  if (started || !('serviceWorker' in navigator)) return;
  started = true;
  let registration = null;
  let waiting = false;

  const check = () => {
    if (registration && navigator.onLine) registration.update().catch(() => {});
  };

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_url, value) {
      registration = value || null;
      check();
    },
    // Nouvelle version téléchargée : elle s'applique tout de suite (rechargement), ou dès la fin de la saisie en cours.
    onNeedRefresh() {
      waiting = true;
      apply();
    },
  });

  function apply() {
    if (!waiting || typing()) return;
    waiting = false;
    updateSW(true);
  }

  window.setInterval(check, CHECK_EVERY);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  window.addEventListener('focus', check);
  window.addEventListener('online', check);
  document.addEventListener('focusout', () => window.setTimeout(apply, 300));
}
