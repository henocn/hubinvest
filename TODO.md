# TODO — Grandes phases HubInvest

> Ce fichier fixe **les phases et leur ordre**, pas les sous-étapes.
> L'agent découpe librement chaque phase en tâches et coche au fur et à mesure.
> Règle d'or : ne jamais entamer un module « souhaitable » (M7, et les briques IA de M4/M5) tant que les indispensables ne sont pas prêts et testés.

---

## Phase 0 — Fondations
- [ ] Squelette PWA (React + Vite, manifest, service worker, installable, app-shell en cache).
- [ ] i18n FR/EN branché dès le départ.
- [ ] Système de design appliqué (tokens de `SKILL.md` : couleurs, type, tailles de boutons).
- [ ] Backend + PostgreSQL + Docker qui tournent en local et en préprod.
- [ ] Auth, rôles, et **cloisonnement des données côté serveur** (à écrire et tester en premier — c'est structurant).
- [ ] Brique **hors-ligne** transverse : IndexedDB (Dexie) + file de synchronisation + indicateur d'état réseau + bouton « Synchroniser ». À valider avant tout module de saisie.

## Phase 1 — Socle QR & administration
- [ ] Génération et routage des **QR codes typés** (occupant, action, invitation, passeport, récompense) avec suivi des scans.
- [ ] **M9 Administration** : gérer occupants, comptes/rôles, contenus, agendas, import Excel, journal d'accès.
  *(Priorité haute : l'admin conditionne le remplissage de tous les autres modules.)*

## Phase 2 — Modules indispensables « avant la Foire »
*(Ce sont ceux qui doivent vivre dès le 12 nov. pour le pré-lancement et les réservations.)*
- [ ] **M1 Vitrine du Hub** : fiches occupants, recherche « Que recherchez-vous ? », programme, plan, 3 boutons d'action, versions avant/pendant/après.
- [ ] **M4 Bourse des besoins + RDV B2B** : publier besoins/offres, consulter, demander (double accord), réserver un créneau **sans chevauchement**, retour post-rencontre.
- [ ] **M3 Investor Desk** : formulaire bilingue, réservation, qualification 9 infos, classement A/B/C, alertes de relance.

## Phase 3 — Modules indispensables « pendant la Foire »
- [ ] **M2 Contacts des occupants** : saisie < 1 min, auto-inscription visiteur par QR, scan passeport, qualification, prochaine action, export Excel, tableau de résultats — **le tout hors-ligne**.
- [ ] **M6 Défis de la preuve** : ouverture de passeport, parcours 3 preuves, validation humaine par scan, quiz, badge, **retrait de récompense à usage unique** avec suivi de stock.
- [ ] **M5 Studio et invités** : invitation personnelle sans compte, choix de créneau, confirmation + rappels, planning avec statuts.

## Phase 4 — Mesure & rapports
- [ ] **M8 Tableau de bord** : écran du jour pour l'API-ZF, écran de résultats par occupant (cloisonné).
- [ ] **Rapport du soir** : synthèse rédigée par l'IA à partir des chiffres, **soumise à relecture** avant diffusion (19 h).
- [ ] Génération **PDF** aux couleurs API-ZF (rapport final par occupant) + **exports** Excel/CSV.
- [ ] Micro-enquêtes de satisfaction (occupants + visiteurs).

## Phase 5 — Intégrations & IA (avec garde-fou humain partout)
- [ ] Envoi **WhatsApp** (BSP agréé) + repli SMS + e-mail, avec modèles validés en amont.
- [ ] Export des dossiers investisseurs vers **INVEST TRACK**.
- [ ] Briques IA **souhaitables** : rapprochements B2B (M4), suggestions de sujets & questions d'interview (M5) — chacune avec validation avant envoi.

## Phase 6 — Souhaitable si le temps le permet
- [ ] **M7 Mur du Hub** (grand écran temps réel) + sa boucle vidéo de repli.
- [ ] Livraison automatique des vidéos aux invités (M5).

## Phase 7 — Durcissement & réception
- [ ] Passer **chaque critère de réception** du cahier des charges (§13) comme une checklist de tests.
- [ ] Tests réels : mode avion + synchro, réseau 3G, Android d'entrée de gamme **et** iPhone, plein soleil.
- [ ] Sécurité : droits par profil testés, journal d'accès, limitation des tentatives, sauvegarde quotidienne chiffrée, procédure papier de secours.
- [ ] Performance (Lighthouse PWA), accessibilité (cibles tactiles, contraste, focus clavier).
- [ ] Contenus finaux chargés, 100 % des fiches occupants publiées, textes FR/EN complets.

## Phase 8 — Gel & exploitation
- [ ] **Gel le 20 nov.** : plus que des corrections d'anomalie.
- [ ] Support quotidien pendant la Foire, rapport chaque soir.
- [ ] Après : rapports finaux, transfert des dossiers, bilan et notes pour 2027.
