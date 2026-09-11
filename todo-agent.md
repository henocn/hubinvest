# TODO-AGENT — Suivi d'exécution HubInvest

> Ce fichier est mon plan de travail opérationnel. Il découpe les phases de `TODO.md` en tâches
> concrètes, réparties entre les 3 dossiers vides (`backend/`, `backoffice/`, `frontend/`), et je
> le coche au fur et à mesure. Les règles qui pilotent chaque décision restent `README.md`
> (contraintes dures + stack), `SKILL.md` (UX/UI) et `NEEDS.md` (placeholders à centraliser).

---

## 0. Architecture retenue (à valider avec LIKSOFT si possible)

Trois dossiers vides = trois applications distinctes qui partagent une seule base Postgres via l'API :

- **`backend/`** — API unique (NestJS/TypeScript, cf. §3 README — choix par défaut car cohérent
  avec un frontend React ; à revoir si LIKSOFT maîtrise mieux Laravel/PHP). PostgreSQL + Row-Level
  Security, auth par rôles, files d'attente (WhatsApp/SMS/e-mail/IA), génération PDF, exports.
- **`frontend/`** — la PWA mobile-first (React + Vite) pour visiteurs, occupants (saisie
  contacts M2), invités Studio (M5), Défis (M6), vitrine (M1), Bourse des besoins + RDV (M4).
  C'est elle qui porte toute la contrainte hors-ligne.
- **`backoffice/`** — l'admin desktop (React + Vite, SPA classique, pas de contrainte hors-ligne)
  pour équipe API-ZF, Investor Desk (M3), équipe de campagne, Administration (M9), Tableau de
  bord + rapports (M8), Mur du Hub (M7, souhaitable).

Pas de monorepo lourd (pas de Nx/Turborepo) : 3 projets indépendants + éventuellement un
`package.json` racine avec workspaces npm pour lancer les 3 en dev. Un seul VPS, Docker Compose
(backend + Postgres + les 2 fronts buildés en statique servis par Nginx).

**Placeholders** : toute valeur en attente de `NEEDS.md` (couleurs, logos, textes) va dans un
fichier de thème/config central par app (`frontend/src/config/theme.ts`,
`backoffice/src/config/theme.ts`) — jamais en dur dans un composant.

---

## Phase 0 — Fondations

### backend/
- [ ] Init projet NestJS + TypeScript, structure modules (auth, occupants, contacts, etc.)
- [ ] Docker Compose : service `backend` + `postgres`
- [ ] Connexion PostgreSQL (TypeORM ou Prisma) + migrations initiales
- [ ] Auth (JWT) + les 8 rôles (`super-admin`, `admin-apizf`, `investor-desk`,
      `equipe-campagne`, `animateur`, `occupant-responsable`, `occupant-membre`, `visiteur`)
- [ ] Cloisonnement des données **côté serveur** : Row-Level Security Postgres par occupant
      (tester qu'un occupant ne peut jamais lire les contacts d'un autre)
- [ ] Endpoints de santé + config CORS pour `frontend` et `backoffice`

### frontend/
- [ ] Init React + Vite, PWA via `vite-plugin-pwa`/Workbox (manifest, service worker, app-shell
      en cache)
- [ ] i18n FR/EN (`i18next`) branché dès le départ, sélecteur de langue visible
- [ ] Tailwind CSS + tokens de design (`SKILL.md` : contrastes AAA, boutons ≥48px, une colonne)
- [ ] Brique hors-ligne transverse : Dexie.js (IndexedDB) + file de synchronisation maison
      + indicateur d'état réseau + bouton « Synchroniser » manuel (pas de Background Sync API,
      Safari ne la supporte pas)
- [ ] Connexion à l'API backend (client HTTP + gestion des tokens)

### backoffice/
- [ ] Init React + Vite (SPA, pas de PWA nécessaire)
- [ ] i18n FR/EN, Tailwind + mêmes tokens de design que le frontend (cohérence de marque)
- [ ] Connexion à l'API backend, auth par rôle admin

---

## Phase 1 — Socle QR & administration

### backend/
- [ ] Modèle de données `passeport`, `scan`, QR codes **typés** (occupant, action, invitation,
      passeport, récompense) avec identifiants uniques + suivi des scans
- [ ] Endpoints génération QR + résolution/routage d'un QR scanné

### backoffice/ (M9 Administration — priorité haute, conditionne tout le reste)
- [ ] Gestion occupants (CRUD, 19 stands)
- [ ] Gestion comptes/rôles
- [ ] Gestion contenus (programme, textes vitrine)
- [ ] Gestion agendas/créneaux
- [ ] Import Excel (occupants, contacts en masse)
- [ ] Journal d'accès (qui a fait quoi, quand)

---

## Phase 2 — Modules indispensables « avant la Foire »

### frontend/ — M1 Vitrine du Hub
- [ ] Fiches occupants (les 19 stands, placeholders tant que `NEEDS.md` §3 n'est pas fourni)
- [ ] Recherche « Que recherchez-vous ? »
- [ ] Programme + plan du Hub
- [ ] 3 boutons d'action principaux
- [ ] Versions avant/pendant/après Foire (contenu qui change selon la date)

### frontend/ — M4 Bourse des besoins + RDV B2B
- [ ] Publier besoin/offre (occupant connecté)
- [ ] Consulter la bourse
- [ ] Demander une rencontre (flux double-accord)
- [ ] Réservation de créneau **sans chevauchement** (contrainte de réception §13)
- [ ] Retour post-rencontre (formulaire court)

### backoffice/ — M3 Investor Desk
- [ ] Formulaire bilingue de qualification (9 infos, cf. cahier des charges)
- [ ] Réservation de créneau Investor Desk
- [ ] Classement A/B/C
- [ ] Alertes de relance

---

## Phase 3 — Modules indispensables « pendant la Foire »

### frontend/ — M2 Contacts des occupants (cœur hors-ligne)
- [ ] Formulaire de saisie < 1 min (5 champs obligatoires max, une colonne, bon clavier par champ)
- [ ] Auto-inscription visiteur par QR
- [ ] Scan passeport (BarcodeDetector natif, repli html5-qrcode)
- [ ] Qualification chaud/tiède/froid (couleur + texte/icône, jamais couleur seule)
- [ ] Prochaine action à mener
- [ ] Export Excel
- [ ] Tableau de résultats par occupant
- [ ] Tout testé en mode avion → sync au retour réseau

### frontend/ — M6 Défis de la preuve
- [ ] Ouverture de passeport (sans compte obligatoire)
- [ ] Parcours 3 preuves / 3 stands
- [ ] Validation humaine par scan (animateur)
- [ ] Quiz (questions en placeholder tant que `NEEDS.md` §4 n'est pas fourni)
- [ ] Badge de complétion
- [ ] Retrait de récompense **à usage unique** + suivi de stock (côté backend)

### frontend/ — M5 Studio et invités
- [ ] Invitation personnelle sans compte (lien unique)
- [ ] Choix de créneau
- [ ] Confirmation + rappels (branché sur la file de messages backend)
- [ ] Planning avec statuts (vue backoffice équipe de campagne)

---

## Phase 4 — Mesure & rapports

### backoffice/ — M8 Tableau de bord + rapports
- [ ] Écran du jour (chiffres **mesurés uniquement**, jamais d'estimation) pour API-ZF
- [ ] Écran de résultats par occupant (cloisonné, RLS vérifiée)
- [ ] Rapport du soir : génération IA à partir des chiffres agrégés, **file d'attente de
      validation humaine** avant diffusion (19h) — jamais d'envoi direct
- [ ] Génération PDF aux couleurs API-ZF (rapport final par occupant)
- [ ] Exports Excel/CSV
- [ ] Micro-enquêtes de satisfaction (occupants + visiteurs)

---

## Phase 5 — Intégrations & IA (garde-fou humain partout)

### backend/
- [ ] Intégration WhatsApp Business Platform via BSP agréé + repli SMS + e-mail
      (attente `NEEDS.md` §6 : compte, BSP, modèles validés)
- [ ] Export dossiers investisseurs vers INVEST TRACK (format à confirmer, `NEEDS.md` §6)
- [ ] Appel LLM côté serveur uniquement, sur données agrégées/pro, jamais de coordonnées
      personnelles de visiteur envoyées ; sortie toujours mise en file pour validation humaine
- [ ] Briques IA souhaitables : rapprochements B2B (M4), suggestions de questions d'interview (M5)
      — chacune avec écran de validation avant envoi (backoffice)

---

## Phase 6 — Souhaitable si le temps le permet

### frontend/ (ou écran dédié) — M7 Mur du Hub
- [ ] Grand écran temps réel : occupant du jour, compteurs mesurés, capsules
- [ ] Repli boucle vidéo si temps insuffisant

### backend/
- [ ] Livraison automatique des vidéos aux invités Studio (M5)

---

## Phase 7 — Durcissement & réception

- [ ] Checklist de tous les critères de réception du cahier des charges §13
- [ ] Tests réels : mode avion + synchro, réseau 3G, Android d'entrée de gamme **et** iPhone,
      plein soleil
- [ ] Sécurité : droits par profil testés, journal d'accès, limitation des tentatives (rate
      limiting login), sauvegarde quotidienne chiffrée, procédure papier de secours documentée
- [ ] Performance (Lighthouse PWA côté frontend), accessibilité (cibles tactiles, contraste,
      focus clavier — les deux apps)
- [ ] Contenus finaux chargés, 100% fiches occupants publiées, textes FR/EN complets

---

## Phase 8 — Gel & exploitation

- [ ] Gel le 20 nov. : plus que des corrections d'anomalie
- [ ] Support quotidien pendant la Foire, rapport chaque soir
- [ ] Après Foire : rapports finaux, transfert des dossiers, bilan/notes 2027

---

## Rappels transverses (à ne jamais oublier en cours de route)

- Ne jamais commencer M7 ou les briques IA de M4/M5 avant que les modules indispensables (I)
  ne soient prêts et testés.
- Centraliser tout placeholder (couleur, logo, texte) — jamais en dur dans un composant.
- Chiffres affichés = uniquement des chiffres mesurés, jamais d'estimation.
- Bilingue FR/EN dès la construction de chaque écran, pas en ajout final.
- Revoir `SKILL.md` avant de construire tout nouvel écran/formulaire/bouton.
- Revoir `NEEDS.md` avant d'assumer une valeur définitive (couleur, logo, texte légal).
