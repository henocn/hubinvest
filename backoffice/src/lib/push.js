import { api } from './api';

// Convertit la clé publique VAPID au format attendu par le navigateur.
const toApplicationServerKey = (base64) => {
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(window.atob(padded), (character) => character.charCodeAt(0));
};

// Indique si ce navigateur sait recevoir des notifications push.
export const isPushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// Enregistre le service worker qui affiche les notifications du backoffice.
export const registerPushWorker = () => {
  if (isPushSupported()) navigator.serviceWorker.register('/push-sw.js').catch(() => {});
};

// Retrouve l'abonnement push actuel de cet appareil.
export const currentPushSubscription = async () => {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
};

// Demande l'autorisation puis abonne cet appareil au compte connecté.
export const enablePush = async (token) => {
  const { enabled, publicKey } = await api.pushPublicKey();
  if (!enabled) throw new Error('Les notifications ne sont pas encore disponibles.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Les notifications sont bloquées dans les réglages du navigateur.');

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription()
    || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toApplicationServerKey(publicKey) });
  await api.subscribePush(token, subscription.toJSON());
};

// Désabonne cet appareil, côté serveur puis côté navigateur.
export const disablePush = async (token) => {
  const subscription = await currentPushSubscription();
  if (!subscription) return;
  await api.unsubscribePush(token, subscription.endpoint).catch(() => {});
  await subscription.unsubscribe();
};
