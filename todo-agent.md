# TODO Agent - Execution pas a pas

Ce document fixe la facon de coder HubInvest. `README.md` porte le besoin, `TODO.md` l'ordre des lots, `SKILL.md` l'interface et `NEEDS.md` les donnees externes.

## Regles de travail

- Avancer sur un seul petit parcours a la fois.
- Ne pas creer un ecran, une table ou une abstraction pour un besoin futur non commence.
- Tout bouton visible doit avoir un comportement reel.
- Montrer et verifier le resultat actuel avant d'elargir le lot.
- Preferer du code direct et lisible aux couches generiques.
- Ne pas ajouter de commentaires qui repetent le nom d'une fonction ou d'une variable.
- Ne pas ajouter de texte d'interface pour remplir l'espace.
- Accepter les alertes de vulnerabilites des packages pendant la construction.
- Ne pas lancer de refonte automatique des dependances en cours de lot.
- Traiter les vulnerabilites pertinentes pendant la stabilisation finale.
- Ecrire seulement les tests qui protegent un risque metier critique.

## Backend retenu

Le backend utilise JavaScript, Node.js, Express, PostgreSQL et Sequelize. Il n'utilise pas TypeScript, NestJS, Prisma ou une architecture microservices.

### Commandes attendues

```json
{
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "db:migrate": "sequelize-cli db:migrate",
    "db:migrate:undo": "sequelize-cli db:migrate:undo"
  }
}
```

Ajouter d'autres scripts seulement lorsqu'un lot les utilise reellement.

### Variables d'environnement

La connexion ne contient aucune valeur sensible en dur.

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hubinvest
DB_USER=
DB_PASSWORD=
DB_DIALECT=postgres
```

Les variables suivantes seront ajoutees uniquement au moment ou leur fonction existe : secret d'authentification, duree de session, origines CORS, services de messages, stockage et IA.

### Arborescence backend

```text
backend/
|-- .env
|-- .env.example
|-- .sequelizerc
|-- package.json
`-- src/
    |-- app.js
    |-- server.js
    |-- config/
    |   |-- database.js
    |   `-- env.js
    |-- database/
    |   |-- migrations/
    |   `-- seeders/
    |-- models/
    |   |-- index.js
    |   |-- occupant.model.js
    |   |-- user.model.js
    |   `-- contact.model.js
    |-- modules/
    |   |-- health/
    |   |   |-- health.route.js
    |   |   `-- health.controller.js
    |   |-- occupant/
    |   |   |-- occupant.route.js
    |   |   |-- occupant.validation.js
    |   |   |-- occupant.repository.js
    |   |   |-- occupant.service.js
    |   |   `-- occupant.controller.js
    |   `-- contact/
    |       |-- contact.route.js
    |       |-- contact.validation.js
    |       |-- contact.repository.js
    |       |-- contact.service.js
    |       `-- contact.controller.js
    |-- middlewares/
    `-- shared/
```

Les dossiers et fichiers d'exemple ne sont crees que lorsque leur lot commence. Le premier socle ne cree que `health`.

### Responsabilite des fichiers

- `models/*.model.js` declare les attributs, associations et options Sequelize du model.
- `database/migrations/*` modifie le schema et reste la source de l'historique de base.
- `*.route.js` declare les chemins, middlewares et controller appele.
- `*.validation.js` valide et normalise les entrees HTTP du module.
- `*.repository.js` contient les lectures et ecritures Sequelize.
- `*.service.js` porte les regles metier et les transactions.
- `*.controller.js` transforme la requete HTTP en appel metier et retourne la reponse.

Un controller ne contient pas de requete Sequelize. Une route ne contient pas de logique metier. Un repository ne decide pas des droits de l'utilisateur. La verification du contexte utilisateur et les regles de cloisonnement sont appliquees avant toute lecture ou ecriture.

### Conventions de base de donnees

- noms de tables et colonnes en `snake_case` ;
- noms de fichiers et modules au singulier ;
- identifiants stables et non devinables pour les objets exposes ;
- dates `created_at` et `updated_at` ;
- suppression logique seulement lorsqu'une fonction en a besoin ;
- contrainte unique en base pour toute unicite metier ;
- transaction pour reservation concurrente, synchronisation sensible et retrait de recompense ;
- migration creee avec chaque changement de schema ;
- ne jamais utiliser `sequelize.sync({ alter: true })` comme mecanisme de migration.

Les attributs d'un model sont ecrits explicitement dans son fichier. La migration correspondante porte les contraintes de base, index et cles etrangeres utiles au parcours actuel.

### Reponses API

Garder un format court et stable.

```json
{
  "data": {},
  "message": ""
}
```

En erreur, retourner un statut HTTP correct, un code exploitable par le frontend et un message clair. Ne pas exposer une stack ou un detail de connexion.

### Journalisation locale

- journaliser les requetes HTTP avec methode, route, statut et duree ;
- garder les requetes SQL Sequelize silencieuses par defaut ;
- ne jamais journaliser les corps, mots de passe, jetons ou donnees personnelles.

## Frontend et backoffice

Utiliser React et Vite. Le frontend mobile devient une PWA lorsque commence le premier parcours hors ligne. Le backoffice reste une application web classique sauf besoin contraire.

### Arborescence indicative

```text
frontend/src/
|-- app/
|-- assets/
|-- components/
|-- features/
|-- lib/
|-- styles/
`-- main.jsx

backoffice/src/
|-- app/
|-- assets/
|-- components/
|-- features/
|-- lib/
|-- styles/
`-- main.jsx
```

Une feature contient uniquement le parcours en cours. Les composants partages apparaissent apres une reutilisation reelle, pas par anticipation.

### Choix d'interface

- `Inter Variable` pour la typographie ;
- `lucide-react` pour les icones ;
- tokens CSS communs issus de `assets/Couleurs.png` ;
- primitives Radix au cas par cas pour les interactions complexes ;
- IndexedDB avec Dexie lorsque commence la saisie hors ligne ;
- i18n lorsque commence le premier parcours bilingue.

Ne pas installer une grande bibliotheque de composants pre-styles qui imposerait son apparence. Construire les composants HubInvest a partir des tokens et des comportements necessaires.

## Tests essentiels uniquement

Ne pas mettre en place une couverture generale ou des tests de rendu qui recopient l'implementation.

Ajouter un test automatise uniquement pour :

- prouver qu'un occupant ne peut pas lire ou modifier les donnees d'un autre ;
- prouver qu'une operation synchronisee deux fois ne cree pas de doublon ;
- prouver que deux reservations concurrentes ne prennent pas la meme ressource ;
- prouver qu'une recompense ne peut pas etre retiree deux fois ;
- proteger un calcul de rapport dont une erreur changerait les chiffres affiches.

Les parcours visuels et les clics sont verifies dans le navigateur. Les appareils et le mode hors ligne sont testes manuellement aux etapes prevues.

## Deroulement du premier lot de code

Ne pas executer cette section avant validation de `TODO1.md`.

### Etape 1 - Backend minimal

- [x] Initialiser `backend/package.json`.
- [x] Installer Express, Sequelize, le pilote PostgreSQL, dotenv et nodemon.
- [x] Ajouter Sequelize CLI pour les migrations.
- [x] Creer `.env.example`, `.sequelizerc` et la configuration `DB_*`.
- [x] Creer `app.js`, `server.js` et le module `health`.
- [x] Ajouter les migrations initiales utiles au premier parcours.
- [ ] Lancer `npm run db:migrate`.
- [x] Lancer le serveur et appeler la route de sante.
- [x] S'arreter et montrer le resultat.

### Etape 2 - Premier ecran

- [ ] Initialiser `frontend` avec React et Vite.
- [ ] Ajouter les tokens, la police, les icones et le logo.
- [ ] Construire un seul shell mobile utile.
- [ ] Brancher l'etat de disponibilite de l'API si celui-ci est visible.
- [ ] Ouvrir l'ecran dans le navigateur, cliquer et examiner une capture.
- [ ] S'arreter et demander le retour sur le design.

### Etape 3 - Premiere tranche metier

Commencer ensuite le lot Contacts de `TODO.md` : un occupant, un utilisateur, un contact, un formulaire, un enregistrement local et une synchronisation. Ne pas construire les autres modules pendant cette tranche.

## Controle avant chaque arret

- Le serveur ou l'ecran demarre avec la commande documentee.
- Les clics visibles fonctionnent.
- Les erreurs sont compréhensibles.
- Aucun secret n'est versionne.
- Aucun fichier sans usage actuel n'a ete ajoute.
- Le resultat correspond au lot et peut etre montre en quelques minutes.
