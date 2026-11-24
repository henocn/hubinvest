import { useEffect, useRef, useSyncExternalStore } from 'react';

// Connexion unique en temps réel (SSE) pour la page, partagée par tous les écrans qui l'écoutent.
// Le serveur n'envoie que le nom du sujet modifié ; chaque écran recharge lui-même ses données.

const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000];
const HIDDEN_GRACE = 30000;
const DEBOUNCE = 250;

const listeners = new Map();
const statusListeners = new Set();
const connection = {
  key: null,
  connect: null,
  onUnauthorized: null,
  topics: new Set(),
  source: null,
  retryTimer: null,
  hiddenTimer: null,
  attempt: 0,
  connected: false,
  opened: false,
  generation: 0,
};

const isSupported = () => typeof window !== 'undefined' && 'EventSource' in window;

const setConnected = (value) => {
  if (connection.connected === value) return;
  connection.connected = value;
  statusListeners.forEach((listener) => listener());
};

// Transmet un sujet à ses écrans ; « resync » prévient tous les écrans après une coupure.
const dispatch = (topic) => {
  const handlers = new Set();
  if (topic === 'resync') listeners.forEach((set) => set.forEach((handler) => handlers.add(handler)));
  else listeners.get(topic)?.forEach((handler) => handlers.add(handler));
  handlers.forEach((handler) => {
    try {
      handler(topic);
    } catch (error) {
      console.error('Mise à jour en temps réel impossible.', error);
    }
  });
};

const closeSource = () => {
  if (connection.source) {
    connection.source.close();
    connection.source = null;
  }
  setConnected(false);
};

const clearRetry = () => {
  window.clearTimeout(connection.retryTimer);
  connection.retryTimer = null;
};

// Programme une reconnexion progressive, avec un léger décalage aléatoire.
const scheduleReconnect = (delay) => {
  clearRetry();
  if (!connection.connect || document.hidden) return;
  const base = delay ?? RETRY_DELAYS[Math.min(connection.attempt, RETRY_DELAYS.length - 1)];
  connection.attempt += 1;
  connection.retryTimer = window.setTimeout(() => { void open(); }, base + Math.random() * 500);
};

// Ouvre le flux ; après une coupure, l'ouverture suivante demande à tous les écrans de se resynchroniser.
const open = async () => {
  clearRetry();
  if (!connection.connect || connection.source || document.hidden) return;
  if (!navigator.onLine) return;
  const generation = connection.generation;

  let url;
  try {
    url = await connection.connect();
  } catch (error) {
    if (generation !== connection.generation) return;
    if (error?.status === 401) {
      connection.onUnauthorized?.();
      return;
    }
    scheduleReconnect();
    return;
  }
  if (generation !== connection.generation || connection.source || !url) return;

  const source = new EventSource(url);
  connection.source = source;

  source.addEventListener('ready', () => {
    const reconnected = connection.opened;
    connection.opened = true;
    connection.attempt = 0;
    setConnected(true);
    if (reconnected) dispatch('resync');
  });
  source.addEventListener('reconnect', () => {
    if (connection.source !== source) return;
    closeSource();
    scheduleReconnect(0);
  });
  connection.topics.forEach((topic) => {
    source.addEventListener(topic, () => dispatch(topic));
  });
  source.onerror = () => {
    if (connection.source !== source) return;
    closeSource();
    scheduleReconnect();
  };
};

const onVisibilityChange = () => {
  window.clearTimeout(connection.hiddenTimer);
  if (document.hidden) {
    // Un onglet caché garde son flux un moment, puis le libère pour économiser la batterie.
    connection.hiddenTimer = window.setTimeout(() => { clearRetry(); closeSource(); }, HIDDEN_GRACE);
    return;
  }
  if (!connection.source) {
    connection.attempt = 0;
    void open();
  }
};

const onOnline = () => {
  connection.attempt = 0;
  if (!connection.source) void open();
};

const onOffline = () => {
  clearRetry();
  closeSource();
};

// Arrête la connexion de la page.
export const stopRealtime = () => {
  connection.generation += 1;
  clearRetry();
  window.clearTimeout(connection.hiddenTimer);
  closeSource();
  connection.key = null;
  connection.connect = null;
  connection.onUnauthorized = null;
  connection.opened = false;
  connection.attempt = 0;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('online', onOnline);
  window.removeEventListener('offline', onOffline);
};

// Démarre la connexion de la page ; `connect` renvoie l'adresse du flux (après avoir obtenu un jeton si besoin).
export const startRealtime = (key, connect, { topics = [], onUnauthorized } = {}) => {
  if (!isSupported()) return stopRealtime;
  if (connection.key === key) return stopRealtime;
  stopRealtime();
  connection.key = key;
  connection.connect = connect;
  connection.onUnauthorized = onUnauthorized;
  connection.topics = new Set(topics);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  void open();
  return stopRealtime;
};

// Ouvre la connexion de la page tant que le composant est affiché.
export function useRealtimeConnection(key, connect, options = {}) {
  const connectRef = useRef(connect);
  const optionsRef = useRef(options);
  connectRef.current = connect;
  optionsRef.current = options;
  const topicsKey = (options.topics || []).join(',');

  useEffect(() => {
    if (!key) return undefined;
    startRealtime(key, () => connectRef.current(), {
      topics: topicsKey ? topicsKey.split(',') : [],
      onUnauthorized: () => optionsRef.current.onUnauthorized?.(),
    });
    return () => { if (connection.key === key) stopRealtime(); };
  }, [key, topicsKey]);
}

// Appelle `handler` quand l'un des sujets change, ou après une reconnexion ; les rafales sont regroupées.
export function useRealtimeEvent(topics, handler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const topicsKey = [].concat(topics).join(',');

  useEffect(() => {
    let timer = null;
    const debounced = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => handlerRef.current(), DEBOUNCE);
    };
    const subscribed = topicsKey.split(',').filter(Boolean);
    subscribed.forEach((topic) => {
      if (!listeners.has(topic)) listeners.set(topic, new Set());
      listeners.get(topic).add(debounced);
    });
    return () => {
      window.clearTimeout(timer);
      subscribed.forEach((topic) => listeners.get(topic)?.delete(debounced));
    };
  }, [topicsKey]);
}

const subscribeStatus = (listener) => {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
};

// Indique si le flux est ouvert : sinon, les écrans gardent leur rafraîchissement périodique de secours.
export function useRealtimeConnected() {
  return useSyncExternalStore(subscribeStatus, () => connection.connected, () => false);
}
