# HubInvest

HubInvest est la plateforme digitale du Hub de l'Investissement de la 21e Foire internationale de Lome. Elle doit transformer les echanges realises pendant la Foire en contacts suivis, rendez-vous, donnees mesurables et actions concretes.

La source fonctionnelle du projet est le cahier des charges initial :
`Volume2_HubInvest_Cahier_des_charges_API-ZF_V1.docx`.

Ce README en est la synthese de travail. En cas de doute sur une regle metier, relire le cahier des charges avant d'inventer un comportement.

## Les problemes a resoudre

Le produit existe pour traiter cinq problemes precis.

1. Les contacts pris sur les stands se perdent et sont peu relances.
2. Les resultats du Hub ne sont pas mesures de facon fiable.
3. Les rencontres utiles entre entreprises, acheteurs et investisseurs dependent du hasard.
4. Les invitations, reservations et rappels du Studio sont difficiles a organiser manuellement.
5. Le public manque de raisons de s'arreter et de circuler entre les stands.

Une fonctionnalite n'est prioritaire que si elle resout directement l'un de ces problemes ou si elle est indispensable au fonctionnement d'une fonctionnalite prioritaire.

## Le produit

HubInvest est une application web progressive concue d'abord pour le telephone. Elle s'ouvre depuis un lien ou un QR code et ne demande aucun telechargement obligatoire.

Elle s'adresse a six profils fonctionnels :

- le visiteur ;
- le visiteur professionnel ;
- l'occupant du Hub et son equipe ;
- l'invite du Studio ;
- l'equipe API-ZF ;
- l'equipe de campagne.

Les roles techniques seront plus precis que ces profils, notamment pour distinguer l'administration, l'Investor Desk, l'animation et les membres d'un occupant.

## Les fonctions retenues

### Ne plus perdre les contacts

- carnet de contacts propre a chaque occupant ;
- saisie d'un contact en moins d'une minute ;
- qualification chaud, tiede ou froid ;
- prochaine action datee et attribuee ;
- saisie hors ligne puis synchronisation ;
- export et indicateurs propres a l'occupant.

### Mesurer les resultats

- chiffres du jour fondes uniquement sur les donnees enregistrees ;
- tableau de bord global pour l'API-ZF ;
- vue confidentielle pour chaque occupant ;
- rapport quotidien relu avant diffusion ;
- rapports finaux et exports.

### Provoquer les rencontres utiles

- publication des besoins et des offres ;
- demande de mise en relation ;
- accord des deux parties ;
- reservation d'un creneau et d'une table sans chevauchement ;
- qualification et suivi des investisseurs par l'Investor Desk ;
- prochaine action obligatoire pour les dossiers utiles.

### Organiser le Studio

- invitation personnelle sans creation de compte ;
- choix d'un creneau disponible ;
- confirmation et rappels ;
- planning de tournage et statuts ;
- livraison de la video si cette fonction peut etre terminee sans fragiliser le reste.

### Faire venir et circuler le public

- vitrine publique du Hub et des occupants ;
- recherche par besoin ;
- programme et plan ;
- passeport personnel des Defis de la preuve ;
- parcours dans trois stands avec validation humaine ;
- recompense retirable une seule fois.

### Administrer ce qui doit changer

L'administration est construite au fur et a mesure des fonctions. Elle permet de gerer les occupants, utilisateurs, contenus, agendas, questions, recompenses et acces utiles aux parcours deja implementes. Elle n'est pas un logiciel separe rempli d'ecrans anticipes.

## Priorite reelle

Le tableau des modules du cahier des charges marque M1, M2, M3, M4, M5, M6, M8 et M9 comme indispensables. M7, les rapprochements par IA et la livraison automatique des videos sont reportables.

L'ordre de developpement ne suit pas obligatoirement les numeros des modules. Il suit les risques et les problemes a resoudre. La premiere preuve technique doit couvrir le risque principal : enregistrer un contact hors ligne, le synchroniser et garantir qu'un autre occupant ne peut pas le lire.

## Regles non negociables

- Aucun occupant ne voit les contacts ou les resultats detailles d'un autre occupant.
- Les controles d'acces sont appliques par l'API, jamais uniquement par l'interface.
- Une saisie critique est conservee localement avant toute tentative d'envoi.
- La synchronisation ne depend pas de Background Sync, absent ou limite sur iPhone.
- Une reservation ne peut pas creer de chevauchement.
- Une recompense ne peut pas etre retiree deux fois.
- Les chiffres affiches sont mesures, jamais estimes.
- Les coordonnees personnelles ne sont pas envoyees a un service d'IA.
- Une sortie d'IA est toujours validee par une personne avant diffusion.
- Le francais et l'anglais sont prevus des la creation des ecrans concernes.
- L'interface reste utilisable sur petit telephone, en 3G et en pleine lumiere.

## Direction technique validee

### Backend

- JavaScript sur Node.js ;
- API REST avec Express ;
- `nodemon` pour `npm run dev` ;
- PostgreSQL ;
- Sequelize avec models et migrations ;
- `npm run db:migrate` pour appliquer les migrations ;
- variables d'environnement pour toute la connexion a la base ;
- modules organises en route, validation, repository, service et controller.

### Frontend et backoffice

- React avec Vite ;
- PWA pour l'interface mobile ;
- stockage local IndexedDB pour les actions hors ligne ;
- interface bilingue lorsque le parcours l'exige ;
- design system commun fonde sur les couleurs et logos du dossier `assets/` ;
- composants accessibles et bibliotheque d'icones coherente.

Le detail d'architecture se trouve dans `todo-agent.md`. Les regles visuelles se trouvent dans `SKILL.md`.

## Methode de developpement

Le projet avance par petits lots utilisables.

1. Choisir un probleme et le plus petit parcours qui le resout.
2. Implementer uniquement les donnees, l'API et l'ecran necessaires a ce parcours.
3. Ouvrir l'interface et verifier les clics, les erreurs et les etats vides.
4. Montrer le resultat avant d'etendre le parcours.
5. Modifier a partir du retour reel, puis passer au lot suivant.

Un bouton visible doit fonctionner. Un ecran non necessaire n'est pas cree. Les commentaires evidents et les textes de remplissage ne sont pas ajoutes.

Les tests automatiques se limitent aux risques critiques : droits d'acces, synchronisation, absence de chevauchement, unicite du retrait d'une recompense et calculs importants. Les alertes de vulnerabilites de dependances sont acceptees pendant la construction et traitees lors de la stabilisation finale.

## Documents de travail

- `TODO1.md` : preparation avant le premier code ;
- `TODO.md` : ordre des lots fonctionnels ;
- `todo-agent.md` : conventions et execution pas a pas ;
- `SKILL.md` : direction frontend et backoffice ;
- `NEEDS.md` : entrees externes strictement necessaires au code.

## Calendrier du cahier des charges

- validation du perimetre : 25 septembre 2026 ;
- gel des nouvelles fonctions : 16 octobre 2026 ;
- vitrine en ligne : 12 novembre 2026 ;
- tests de reception : du 9 au 18 novembre 2026 ;
- gel de la plateforme : 20 novembre 2026 ;
- exploitation : du 27 novembre au 13 decembre 2026 ;
- rapports par occupant : du 14 au 18 decembre 2026.
