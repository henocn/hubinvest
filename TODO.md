# TODO — parcours HubInvest

On avance par gestes réels des utilisateurs, pas par une liste de neuf modules à remplir. Les dates et objectifs chiffrés des documents de travail ne fixent pas l’ordre du code. Chaque parcours doit être visible et utilisable de bout en bout avant d’ajouter le suivant.

## Cadrage à valider avant la suite

- [x] Faire valider la lecture des rôles et du noyau produit décrits dans `README.md`.
- [x] Retenir le prochain usage à montrer : « je scanne le QR code du Hub ou d’un stand, je découvre l’occupant, puis je peux demander à être recontacté ».
- [x] Faire arriver une demande de fiche uniquement dans les contacts de son occupant.
- [ ] Confirmer qui reçoit une demande adressée directement à l’API-ZF et valider le texte de consentement public avant la production.

## Déjà engagé

- [x] Initialiser le backend Node.js/Express avec nodemon, Sequelize, migrations et variables `DB_*`.
- [x] Créer le socle React/Vite et une première interface de marque.
- [x] Créer occupants, utilisateurs, contacts et authentification nécessaires à la saisie par un stand.
- [x] Limiter côté API la lecture des contacts à l’occupant concerné.
- [x] Saisir un contact localement, afficher son état de synchronisation, puis le retrouver dans « Mes contacts ».
- [x] Créer la première vue backoffice API-ZF avec des comptes de contacts réels.
- [ ] Vérifier sur un vrai téléphone la saisie en mode avion puis la synchronisation sans doublon.
- [ ] Vérifier visuellement sur mobile l’ouverture d’une fiche contact depuis la liste.

## Prochain parcours — le visiteur découvre le Hub

La découverte est commencée. Le formulaire de recontact attend la confirmation de ses destinataires et de son texte de consentement.

- [x] Ouvrir le frontend public sans connexion obligatoire.
- [x] Afficher les occupants publiés et une fiche de stand courte, à partir des données administrées.
- [ ] Générer et tester les QR codes réels : accueil vers `/stands`, stand vers `/stands/:slug`.
- [ ] Vérifier les anciennes valeurs de « numéro de preuve » : ce champ était auparavant présenté comme numéro de stand dans le backoffice et n’est pas affiché au public tant qu’il n’est pas clarifié.
- [ ] Vérifier le parcours sur téléphone, connexion lente et écran étroit.
- [x] Ajouter une recherche simple par structure ou activité.
- [ ] Ajouter le programme, le plan et l’anglais lorsque leurs contenus sont disponibles ; ne pas bloquer la première fiche utile pour eux.

Validation : une personne qui n’a jamais vu HubInvest scanne, comprend où elle est et trouve un occupant, sans bouton mort ni compte imposé.

## Parcours suivant — exprimer puis suivre un intérêt

- [x] Depuis la fiche d’un occupant, permettre au visiteur de demander à être recontacté avec un formulaire court et un consentement propre à cet occupant.
- [x] Confirmer au visiteur que sa demande est enregistrée, sans promettre une réponse automatique non organisée.
- [x] Montrer cette demande uniquement à l’occupant concerné, qui peut la qualifier et noter sa prochaine action.
- [ ] Attribuer explicitement un responsable à une demande si l’équipe du stand compte plusieurs personnes et en a besoin.
- [ ] Permettre une demande distincte adressée à l’API-ZF ; son contenu et son destinataire sont à confirmer avant codage.
- [ ] Afficher au responsable d’occupant les contacts et relances utiles ; ajouter l’export demandé lorsque ses colonnes sont connues.
- [x] Tester côté API le cloisonnement, le consentement obligatoire et l’origine d’une demande publique.
- [ ] Vérifier sur téléphone le formulaire, puis son arrivée dans l’espace occupant et sa modification.
- [ ] Avant l’ouverture publique, valider les textes et règles de données, puis protéger l’envoi anonyme contre les abus sans bloquer les visiteurs partageant une connexion.

Validation : une demande va au bon destinataire, et ce destinataire peut réellement la traiter.

## Parcours explicitement prévus par le CDC, à arbitrer un par un

Leur présence dans le CDC ne dit pas encore quelle version est utile en pratique. Pour chacun, confirmer l’équipe qui l’exploitera, puis définir un premier parcours complet avant de coder.

- [ ] **Investor Desk** : un professionnel expose son projet ou demande un échange ; l’équipe API-ZF reçoit, qualifie et suit le dossier sans accès pour les occupants. Réservation de créneau seulement si l’agenda réel est géré.
- [ ] **Rencontres B2B** : un occupant publie ce qu’il cherche ; un professionnel propose une rencontre ; les deux acceptent et un responsable organise la suite. Tables et créneaux uniquement si nécessaires sur place.
- [ ] **Studio** : un invité ouvre son lien personnel et confirme sa venue ; l’équipe de campagne tient un planning. Rappels et livraison vidéo peuvent rester manuels au début.
- [ ] **Défis du public** : un visiteur choisit de jouer ; les stands valident humainement ses passages ; l’accueil remet une récompense une seule fois. Aucun consentement commercial implicite.

## À faire au fil des parcours

- [ ] Donner à l’administrateur uniquement les écrans nécessaires pour gérer les données et accès des parcours ouverts.
- [ ] Afficher des totaux et rapports fondés sur des événements réellement enregistrés, avec périmètre et source compréhensibles.
- [ ] Respecter le cloisonnement des occupants et la confidentialité des dossiers investisseurs sur chaque nouvelle route et chaque nouvel écran.
- [ ] Vérifier le français, l’anglais quand requis, les erreurs, les états vides et la connexion faible.
- [ ] Garder les tests automatisés sur les risques essentiels : droits d’accès, synchronisation, réservations concurrentes si elles existent, retrait unique si le jeu existe.
- [ ] Traiter les vulnérabilités des dépendances pertinentes lors de la stabilisation finale.

## Pas au départ

Mur d’écran en direct, matching ou rédaction par IA, messagerie entre participants, automatisation des vidéos, notifications multicanales, chiffres de campagne non collectés par HubInvest et extension à toute la Foire. Une solution humaine simple reste possible tant que le besoin n’est pas observé et validé.
