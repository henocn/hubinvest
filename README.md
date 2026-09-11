# HubInvest — Cadrage projet (pour l'agent Claude Code)

> Plateforme digitale du **Hub de l'Investissement**, 21e Foire internationale de Lomé (FIL 2026).
> Commanditaire : **API-ZF** (Agence de Promotion des Investissements et de la Zone Franche).
> Réalisation : **DEKA Éditions** (conception, contenus, UX) + **LIKSOFT** (développement, hébergement, support).

Ce dépôt est cadré par 4 fichiers. **Lis-les dans cet ordre avant de coder :**
1. `README.md` — ce fichier : quoi, pour qui, avec quelles règles.
2. `TODO.md` — les grandes phases (tu décides toi-même des sous-étapes).
3. `SKILL.md` — les règles UX/UI à appliquer sur tout le frontend.
4. `NEEDS.md` — ce que le client fournit au fur et à mesure (identité, contenus, accès).

---

## 1. Ce qu'on construit, en une phrase

Un **site mobile (PWA) qui s'ouvre par QR code, sans téléchargement**, qui relie en un seul outil : visiteurs, entreprises exposantes (« occupants »), investisseurs, invités du Studio et l'équipe API-ZF, pendant les 17 jours de la Foire.

**Philosophie non négociable : fiabilité avant sophistication.** 6 modules indispensables parfaitement exécutés valent mieux que 30 fonctions bancales. Tout ce qui n'est pas prêt et **testé le 20 novembre** est reporté.

---

## 2. Contraintes dures (elles pilotent l'architecture)

Ces contraintes priment sur toute élégance technique.

| Contrainte | Conséquence directe |
|---|---|
| **Hors-ligne qui se synchronise** | La saisie de contacts (M2) et les scans (M6) doivent fonctionner **sans réseau** et se synchroniser au retour. IndexedDB = source de vérité locale + file d'attente d'écritures. C'est le point le plus risqué du projet. |
| **iPhone + Android d'entrée de gamme** | ⚠️ La **Background Sync API n'est pas supportée par Safari** (début 2026). Ne pas en dépendre : vider la file à l'ouverture de l'app, sur l'événement `online`, et via un **bouton « Synchroniser » manuel**. |
| **Réseau faible (3G)** | Pages légères, peu d'images lourdes, app-shell en cache, chargement progressif. |
| **Aucun téléchargement obligatoire** | PWA installable (manifest + service worker), mais 100 % utilisable dans le navigateur sans installation. |
| **Cloisonnement strict des données** | Un occupant ne voit **jamais** les données d'un autre. À imposer **côté serveur** (ex. PostgreSQL Row-Level Security), jamais seulement côté client. |
| **Bilingue FR/EN** | Vitrine, Investor Desk et invitations en français **et** anglais dès le départ (i18n, pas un ajout tardif). |
| **Lisible en plein soleil** | Fort contraste, gros boutons, testé en extérieur (voir `SKILL.md`). |
| **L'IA ne décide jamais seule** | Toute sortie d'IA (rapport du soir, rapprochements B2B, questions d'interview) passe par une validation humaine avant diffusion. Aucune coordonnée personnelle de visiteur n'est envoyée au service d'IA. |
| **Chiffres mesurés uniquement** | Jamais d'estimations de fréquentation ou de chiffres invérifiables affichés. |

---

## 3. Stack recommandée

Choix guidé par le hors-ligne et par un délai court — pile éprouvée, un seul serveur, zéro sur-ingénierie.

**Frontend (la PWA)**
- **React + Vite** (mobile-first), PWA via **vite-plugin-pwa / Workbox**.
- **Dexie.js** (IndexedDB) pour le stockage local + une **file de synchronisation** maison.
- **Tailwind CSS** (voir tokens dans `SKILL.md`), **i18next** (FR/EN).
- Scan QR : `BarcodeDetector` natif avec repli `html5-qrcode`.

**Backend (l'API)**
- **NestJS (Node)** si l'équipe est JavaScript, **sinon Laravel (PHP)**. Un seul vrai arbitrage : **choisir selon ce que LIKSOFT maîtrise déjà** — le délai interdit d'apprendre une techno.
- API REST, auth par rôles, files d'attente (messages, IA), génération PDF, exports.

**Base de données**
- **PostgreSQL.** Row-Level Security pour le cloisonnement par occupant, vérifié côté serveur.

**Intégrations (des services, pas de la pile)**
- **WhatsApp Business Platform** via un BSP agréé (repli SMS + e-mail).
- **LLM** appelé côté serveur, sur données agrégées/professionnelles, sortie mise en file pour validation humaine.
- **PDF** aux couleurs API-ZF (Puppeteer ou DomPDF) ; **exports** Excel/CSV.

**Hébergement**
- Un **VPS unique** suffit (charge modeste : quelques milliers de visiteurs / 17 jours). **Docker**, HTTPS, mots de passe hachés, **sauvegarde quotidienne chiffrée**. Vérifier le lieu d'hébergement avec le juridique (loi n° 2019-014).

**À éviter absolument :** microservices, Kubernetes, plusieurs bases. Un monolithe bien structuré + Postgres + un serveur avec sauvegardes = livrable à temps.

---

## 4. Les 9 modules

Priorité : **I** = indispensable (prêt le 20 nov.), **S** = souhaitable (livré si les I sont prêts, sinon repli manuel).

| # | Module | Rôle | Prio |
|---|---|---|---|
| M1 | Vitrine du Hub | Site public : occupants, programme, recherche « Que recherchez-vous ? », plan, FR/EN | I |
| M2 | Contacts des occupants | CRM par stand : saisie < 1 min, scan passeport, qualification chaud/tiède/froid, export Excel, **hors-ligne** | I |
| M3 | Investor Desk | Réservé API-ZF : qualification en 9 infos, classement A/B/C, alertes de relance, export vers INVEST TRACK | I |
| M4 | Bourse des besoins + RDV B2B | Publier besoins/offres, demander une rencontre (double accord), réserver un créneau/table | I |
| M5 | Studio et invités | Invitation personnelle (sans compte), réservation de créneau, rappels, livraison vidéo | I |
| M6 | Défis de la preuve | Jeu : passeport QR, parcours 3 preuves/3 stands, validation humaine par scan, badge, retrait de récompense à usage unique | I |
| M7 | Mur du Hub | Grand écran : occupant du jour, compteurs mesurés, capsules. Repli : boucle vidéo | S |
| M8 | Tableau de bord + rapports | Chiffres du jour, rapport du soir (19 h, IA + relecture), rapport final PDF par occupant | I (rapports finaux en déc.) |
| M9 | Administration | Gérer occupants, contenus, agendas, comptes/rôles ; import/export ; journal d'accès | I |

---

## 5. Les 6 rôles et ce qu'ils voient

Chaque rôle ne voit **que ce qui le concerne**. Rôles techniques : `super-admin`, `admin-apizf`, `investor-desk`, `equipe-campagne`, `animateur`, `occupant-responsable`, `occupant-membre`, `visiteur`.

- **Visiteur** — compte facultatif (prénom + tél). Joue aux Défis, retire ses récompenses.
- **Visiteur professionnel** — compte léger. Consulte les besoins, demande une mise en relation, réserve un RDV.
- **Occupant** — compte créé par l'API-ZF. Tient sa fiche, saisit/qualifie ses contacts (les siens seulement), publie ses besoins, suit ses résultats.
- **Invité du Studio** — aucun compte, lien personnel. Réserve son créneau, reçoit rappels puis vidéo.
- **Équipe API-ZF** — compte admin. Qualifie les investisseurs, valide les rencontres/rapports, distribue les récompenses, pilote.
- **Équipe de campagne** — compte admin. Planning Studio, publication des vidéos, alimentation du mur du Hub.

Le détail des parcours utilisateur est dans le cahier des charges (section 07) ; ne pas ajouter d'écran hors périmètre.

---

## 6. Objets de données principaux

`occupant`, `utilisateur`, `visiteur`, `contact`, `dossier_investisseur`, `besoin`, `offre`, `mise_en_relation`, `creneau`, `reservation`, `invite`, `contenu`, `passeport`, `etape`, `recompense`, `scan`, `rapport`.

QR codes : identifiants **uniques et typés** (`occupant`, `action`, `invitation`, `passeport`, `recompense`) avec suivi des scans ; codes de récompense **à usage unique**.

---

## 7. Jalons clés (voir cahier des charges §10)

`16 oct.` gel du périmètre (aucune fonction ajoutée après) · `12 nov.` vitrine en ligne · `9–18 nov.` tests de réception · `20 nov.` **gel total** · `27 nov.–13 déc.` exploitation · `14–18 déc.` rapports finaux.

**Critères de réception à garder en tête pendant tout le dev** (§13) : contact saisi en < 1 min par une personne non formée ; saisie qui marche en mode avion puis se synchronise ; un occupant ne voit jamais les contacts d'un autre ; pas de chevauchement de réservations ; récompense non retirable deux fois ; vitrine correcte FR/EN sur Android d'entrée de gamme et iPhone ; rapport du soir produit à 19 h.

---

## 8. Ce que le projet n'est PAS (hors périmètre 2026)

Pas de vente / paiement / commission. Pas de classement public d'occupants ou de visiteurs. Pas de matching B2B automatique sans validation. Pas de messagerie instantanée entre participants. Pas d'assistant conversationnel. Pas de score de probabilité d'achat par l'IA. Pas de comptage de fréquentation par capteurs. Ces pistes sont documentées pour 2027 (§15) — ne pas les commencer.
