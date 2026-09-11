# NEEDS - Entrees necessaires au code

Ce fichier contient uniquement ce qui doit venir du porteur du projet ou d'un service externe pour coder une fonction avec de vraies valeurs. Un element n'est demande que lorsque le lot concerne commence.

Les informations absentes ne doivent pas etre inventees. Utiliser des donnees de demonstration centralisees, clairement remplacables, lorsque cela suffit pour avancer.

## Deja fourni

- [x] Cahier des charges fonctionnel : `Volume2_HubInvest_Cahier_des_charges_API-ZF_V1.docx`
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
```

Le code doit egalement fournir un `.env.example` sans secret. Les vraies valeurs de production ne seront demandees qu'au moment du deploiement.

## Pour les occupants et les contacts

- [ ] Liste des occupants avec un identifiant stable.
- [ ] Pour chaque occupant : nom, numero de preuve, activite et statut actif.
- [ ] Comptes initiaux : nom, e-mail ou telephone de connexion, role et occupant rattache.
- [ ] Les cinq champs obligatoires exacts du formulaire de contact.
- [ ] Confirmation de la possibilite ou non de noter une vente : produit, quantite et montant.
- [ ] Texte de consentement a afficher avant l'enregistrement d'un contact, en francais et en anglais si necessaire.

Format prefere pour les listes : fichier Excel ou CSV avec une ligne par element et des colonnes stables.

## Pour la vitrine

- [ ] Nom public definitif de la plateforme.
- [ ] Pour chaque occupant : description, produits ou services, marches servis, chiffre cle, contact public et photo.
- [ ] Categories de la recherche `Que recherchez-vous ?` et occupants associes.
- [ ] Programme date et heures de chaque activite.
- [ ] Plan du Hub avec les numeros de stands.
- [ ] Textes anglais valides pour les contenus publics.

## Pour l'Investor Desk

- [ ] Libelle et type exact des neuf informations de qualification.
- [ ] Regles definitives des classes A, B et C.
- [ ] Delais de relance definitifs par classe.
- [ ] Horaires et duree des creneaux disponibles.
- [ ] Format attendu par INVEST TRACK : modele Excel, CSV ou documentation API.

## Pour les besoins et rendez-vous B2B

- [ ] Categories de besoins et d'offres.
- [ ] Duree d'un rendez-vous.
- [ ] Horaires ouverts a la reservation.
- [ ] Nombre et noms ou numeros des tables.
- [ ] Regle d'annulation et delai limite eventuel.
- [ ] Personne ou role qui valide une mise en relation lorsque les deux parties ont accepte.

## Pour le Studio

- [ ] Types de contenus ou tournages reservables.
- [ ] Duree des creneaux par type.
- [ ] Horaires disponibles.
- [ ] Informations demandees a l'invite.
- [ ] Statuts du planning utilises par l'equipe.
- [ ] Textes de confirmation et de rappel.

## Pour les Defis de la preuve

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
- [ ] E-mail : fournisseur, domaine d'envoi, identifiants et adresse expediteur.
- [ ] Pour chaque message : evenement declencheur, destinataire, langue et texte valide.

Tous les secrets passent par des variables d'environnement et ne sont jamais ajoutes au depot.

## Pour les rapports et l'IA

- [ ] Indicateurs exacts a afficher dans le tableau de bord.
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
- [ ] Adresse et identifiants du service de sauvegarde.

## Hors de ce fichier

Le budget, l'achat de tablettes ou routeurs, la formation des equipes, les responsables administratifs, les supports d'impression et les validations contractuelles ne sont pas des entrees de code. Ils restent dans le cahier des charges ou dans les documents de gestion du projet.
