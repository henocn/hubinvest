# NEEDS - Entrees necessaires au code

Ce fichier contient uniquement ce qui doit venir du porteur du projet ou d'un service externe pour coder une fonction avec de vraies valeurs. Un element n'est demande que lorsque le lot concerne commence.

Les informations absentes ne doivent pas etre inventees. Utiliser des donnees de demonstration centralisees, clairement remplacables, lorsque cela suffit pour avancer.

## Deja fourni

- [x] Cahier des charges fonctionnel : `Volume2_HubInvest_Cahier_des_charges_API-ZF_V1.docx`
- [x] Cadrage global complémentaire : `APIZF - FIL2026 - DK.pdf` (document de travail à diffusion restreinte ; ses jalons et objectifs indicatifs restent à confirmer)
- [x] Logo API-ZF sur fond blanc : `assets/Logo fond blanc.jpeg`
- [x] Logo API-ZF en PNG avec transparence : `assets/Logo sans fond.png`
- [x] Palette de couleurs : `assets/Couleurs.png`
- [x] Couleurs numeriques lisibles dans la palette : rouge `#D11135`, vert `#006A4F`, jaune `#FFCF11`, noir et blanc

Le logo vectoriel reste souhaitable pour la qualite, mais son absence ne bloque pas le premier ecran.

## Pour demarrer le backend

Valeurs locales a placer dans un fichier `.env` non versionne :

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hubinvest
DB_USER=
DB_PASSWORD=
DB_DIALECT=postgres
JWT_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_FIRST_NAME=
ADMIN_LAST_NAME=
```

Le code doit egalement fournir un `.env.example` sans secret. Les vraies valeurs de production ne seront demandees qu'au moment du deploiement.

Ne pas déduire l'état actuel de `.env` de ce document : vérifier uniquement la présence des variables nécessaires au moment d'exécuter la fonction concernée, sans afficher leurs valeurs.

## Pour les occupants et les contacts

- [x] Les occupants sont créés dans le backoffice avec un identifiant stable généré par la plateforme.
- [x] Une fiche occupant contient le nom, l’emplacement, l’activité, le statut et une image de couverture. Aucun numéro de preuve distinct.
- [x] Chaque stand peut recevoir un logo JPG, PNG ou WebP dans le backoffice, limité à 2 Mo et 1200 × 1200 pixels.
- [x] Les comptes occupants sont créés dans le backoffice et rattachés à leur occupant ; seul le premier compte administrateur dépend des variables `ADMIN_*`.
- [ ] Les cinq champs obligatoires exacts du formulaire de contact.
- [ ] Confirmation de la possibilite ou non de noter une vente : produit, quantite et montant.
- [ ] Texte de consentement a afficher avant l'enregistrement d'un contact, en francais et en anglais si necessaire.
- [ ] Parcours exact de l'auto-inscription par QR code de stand : champs, consentement, rattachement à l'occupant, confirmation et gestion des doublons.
- [ ] Colonnes et périmètre de l'export Excel du carnet de contacts de l'occupant.

Format prefere pour les listes : fichier Excel ou CSV avec une ligne par element et des colonnes stables.

## Pour la vitrine

- [x] Nom public definitif de la plateforme : HubInvest.
- [x] Les contenus des occupants sont dynamiques et administrables depuis le backoffice ; aucun jeu de donnees fixe n'est necessaire au code.
- [ ] Categories de la recherche `Que recherchez-vous ?` et occupants associes.
- [ ] Destinations des QR codes d'accueil, de fiche occupant, de l'Investor Desk et des Défis ; n'imprimer que les parcours réellement prêts.
- [x] Le programme, ses dates et ses heures seront geres depuis le backoffice.
- [x] Le plan et les numeros de stands seront geres depuis le backoffice.
- [x] L’interface statique du frontend public est disponible en français et en anglais, avec détection automatique de la langue du navigateur et choix mémorisé.
- [ ] Si les contenus libres des occupants doivent aussi être traduits automatiquement, choisir le fournisseur et confirmer que ces contenus peuvent lui être transmis.

## Pour l'Investor Desk

- [ ] Libelle et type exact des neuf informations de qualification.
- [ ] Regles definitives des classes A, B et C.
- [ ] Delais de relance definitifs par classe.
- [x] Les horaires et la duree des creneaux seront dynamiques.
- [ ] Fichier modele Excel reel attendu par INVEST TRACK.
- [ ] Contenu et fichier approuvé de l'Investor Pack bilingue, ainsi que sa règle d'accès par QR code.
- [ ] Règles de réservation et personne responsable des relances, si le parcours Investor Desk est retenu.

## Pour les besoins et rendez-vous B2B

Aucune valeur fixe n'est demandee a ce stade. Le parcours sera adapte aux cas d'utilisation observes avant de figer ses categories ou ses regles.

## Pour le Studio

- [x] Les horaires disponibles seront geres depuis le backoffice.
- [x] Les textes de confirmation et de rappel peuvent etre proposes lors de l'implementation.

Les types de contenus, durees, informations invite et statuts ne sont pas des entrees necessaires au code pour le moment.

- [ ] Lieu de stockage des capsules validées, responsable de validation et règle de mise à disposition à l'invité.

## Pour les Defis de la preuve

La première version utilise provisoirement trois passages dans des stands distincts. Ce seuil est configurable avec `CHALLENGE_REQUIRED_PASSAGES` et devra être confirmé avant l’ouverture publique.

- [x] Un nouveau participant renseigne son prénom ou nom et un contact sous la forme d’un téléphone ou d’une adresse e-mail.

- [ ] Regles exactes d'ouverture d'un passeport.
- [ ] Liste des preuves et occupant associe.
- [ ] Regles de composition des parcours de trois preuves.
- [ ] Questions, choix et bonnes reponses des quiz.
- [ ] Types de recompenses, quantites et seuils d'alerte.
- [ ] Condition exacte de validation et de retrait.
- [ ] Texte de consentement lie au jeu.

## Pour les messages externes

Ces informations ne sont necessaires qu'au branchement du canal concerne.

- [ ] WhatsApp : fournisseur, identifiants, numero et modeles approuves.
- [ ] SMS : fournisseur, identifiants et nom d'expediteur.
- [ ] E-mail et récupération de mot de passe : renseigner `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, `SMTP_FROM_NAME` et `SMTP_FROM_EMAIL`.
- [ ] Pour chaque message : evenement declencheur, destinataire, langue et texte valide.

Tous les secrets passent par des variables d'environnement et ne sont jamais ajoutes au depot.

## Pour les rapports et l'IA

- [ ] Indicateurs exacts a afficher dans le tableau de bord.
- [ ] Définition et source de chaque indicateur demandé pour un parcours effectivement développé ; les objectifs chiffrés ne sont pas des résultats à afficher.
- [ ] Structure attendue du rapport quotidien.
- [ ] Structure du rapport final par occupant.
- [ ] Fournisseur et modele d'IA, uniquement lorsque la redaction assistee est implementee.
- [ ] Role charge de relire et valider chaque sortie avant diffusion.

Aucune coordonnee personnelle de visiteur ne doit etre envoyee au fournisseur d'IA.

## Pour la production

- [ ] URL publique du frontend.
- [ ] URL publique du backoffice.
- [ ] URL publique de l'API.
- [ ] Origines autorisees par CORS.
- [ ] Valeurs de connexion PostgreSQL de production.
- [ ] Secret de signature des sessions ou jetons.
- [ ] Emplacement de stockage des fichiers envoyes ou generes.
- [ ] Accès FTP si le déploiement l’utilise : `FTP_HOST`, `FTP_PORT`, `FTP_USER`, `FTP_PASSWORD`, `FTP_SECURE` et `FTP_BASE_PATH`.
- [ ] Adresse et identifiants du service de sauvegarde.

## Hors de ce fichier

Le budget, l'achat de tablettes ou routeurs, la formation des equipes, les responsables administratifs, les supports d'impression et les validations contractuelles ne sont pas des entrees de code. Ils restent dans le cahier des charges ou dans les documents de gestion du projet.
