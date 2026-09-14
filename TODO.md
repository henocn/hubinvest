# TODO — parcours HubInvest

On avance par gestes réels des utilisateurs, pas par une liste de neuf modules à remplir. Les dates et objectifs chiffrés des documents de travail ne fixent pas l’ordre du code. Chaque parcours doit être visible et utilisable de bout en bout avant d’ajouter le suivant.

Avant toute modification, relire `PREFERENCES.md`. Toute nouvelle préférence durable sur l’UI, l’UX, le code ou la stratégie d’affichage doit y être consignée avant l’implémentation.

## Cadrage à valider avant la suite

- [x] Faire valider la lecture des rôles et du noyau produit décrits dans `README.md`.
- [x] Retenir le prochain usage à montrer : « je scanne le QR code du Hub ou d’un stand, je découvre l’occupant, puis je peux demander à être recontacté ».
- [x] Faire arriver une demande de fiche uniquement dans les contacts de son occupant.
- [ ] Valider le texte définitif de consentement public avant la production ; les demandes directes sont reçues par l’Investor Desk.

## Déjà engagé

- [x] Initialiser le backend Node.js/Express avec nodemon, Sequelize, migrations et variables `DB_*`.
- [x] Créer le socle React/Vite et une première interface de marque.
- [x] Répartir les deux interfaces React entre pages, composants, tiroirs et tableaux réutilisables.
- [x] Créer occupants, utilisateurs, contacts et authentification nécessaires à la saisie par un stand.
- [x] Limiter côté API la lecture des contacts à l’occupant concerné.
- [x] Saisir un contact localement, afficher son état de synchronisation, puis le retrouver dans « Mes contacts ».
- [x] Créer la première vue backoffice API-ZF avec des comptes de contacts réels.
- [ ] Vérifier sur un vrai téléphone la saisie en mode avion puis la synchronisation sans doublon.
- [ ] Vérifier visuellement sur mobile l’ouverture d’une fiche contact depuis la liste.

## Prochain parcours — le visiteur découvre le Hub

La découverte est commencée. Le formulaire de recontact attend la confirmation de ses destinataires et de son texte de consentement.

- [x] Ouvrir le frontend public sans connexion obligatoire.
- [x] Afficher les stands actifs et une fiche courte avec leur couverture, à partir des données administrées.
- [x] Générer depuis le backoffice les QR codes du Hub vers `/stands` et de chaque stand vers `/stands/:slug`.
- [ ] Scanner les QR codes avec l’URL publique de production avant leur impression.
- [x] Retirer l’ancien « numéro de preuve » : l’emplacement administré du stand remplit ce besoin.
- [ ] Vérifier le parcours sur téléphone, connexion lente et écran étroit.
- [x] Ajouter une recherche simple par structure ou activité.
- [x] Ajouter une interface publique FR/EN avec détection automatique de la langue du navigateur et choix mémorisé.
- [x] Placer les cinq actions visiteur principales dans une navigation basse : accueil, exploration, rencontres, défis et espace occupant.
- [ ] Ajouter le programme et le plan lorsque leurs contenus sont disponibles ; ne pas bloquer la première fiche utile pour eux.

Validation : une personne qui n’a jamais vu HubInvest scanne, comprend où elle est et trouve un occupant, sans bouton mort ni compte imposé.

## Parcours suivant — exprimer puis suivre un intérêt

- [x] Depuis la fiche d’un occupant, permettre au visiteur de demander à être recontacté avec un formulaire court et un consentement propre à cet occupant.
- [x] Confirmer au visiteur que sa demande est enregistrée, sans promettre une réponse automatique non organisée.
- [x] Montrer cette demande uniquement à l’occupant concerné, qui peut la qualifier et noter sa prochaine action.
- [ ] Attribuer explicitement un responsable à une demande si l’équipe du stand compte plusieurs personnes et en a besoin.
- [x] Permettre une demande distincte adressée à l’API-ZF, reçue et suivie par l’Investor Desk.
- [ ] Afficher au responsable d’occupant les contacts et relances utiles ; ajouter l’export demandé lorsque ses colonnes sont connues.
- [x] Tester côté API le cloisonnement, le consentement obligatoire et l’origine d’une demande publique.
- [ ] Vérifier sur téléphone le formulaire, puis son arrivée dans l’espace occupant et sa modification.
- [ ] Avant l’ouverture publique, valider les textes et règles de données, puis protéger l’envoi anonyme contre les abus sans bloquer les visiteurs partageant une connexion.

Validation : une demande va au bon destinataire, et ce destinataire peut réellement la traiter.

## Parcours explicitement prévus par le CDC, à arbitrer un par un

Leur présence dans le CDC ne dit pas encore quelle version est utile en pratique. Pour chacun, confirmer l’équipe qui l’exploitera, puis définir un premier parcours complet avant de coder.

- [x] **Investor Desk — première version** : un professionnel expose son projet ou demande un échange ; l’équipe API-ZF reçoit la demande, se l’attribue au premier suivi et note sa prochaine action. La qualification détaillée et les rendez-vous attendent les règles réelles.
- [x] **Rencontres B2B — première version** : un responsable occupant publie et ferme ses besoins ; un professionnel propose une rencontre avec son consentement ; l’équipe du stand consulte les propositions et le responsable les accepte ou les refuse. Les créneaux et tables attendent un usage réel.
- [x] **Studio — première version** : l’équipe API-ZF crée une invitation datée, copie son lien personnel et suit la réponse dans un planning ; l’invité confirme ou refuse sans compte. Les rappels et la livraison vidéo restent manuels.
- [x] **Défis du public — première version** : le visiteur crée un parcours sans coordonnées, chaque stand valide une seule fois son code et l’accueil enregistre une remise unique après le nombre requis de passages. Le seuil provisoire de trois stands reste configurable et aucun consentement commercial n’est implicite.

## À faire au fil des parcours

- [ ] Donner à l’administrateur uniquement les écrans nécessaires pour gérer les données et accès des parcours ouverts.
- [ ] Afficher des totaux et rapports fondés sur des événements réellement enregistrés, avec périmètre et source compréhensibles.
- [ ] Respecter le cloisonnement des occupants et la confidentialité des dossiers investisseurs sur chaque nouvelle route et chaque nouvel écran.
- [ ] Vérifier le français, l’anglais quand requis, les erreurs, les états vides et la connexion faible.
- [ ] Garder les tests automatisés sur les risques essentiels : droits d’accès, synchronisation, réservations concurrentes si elles existent, retrait unique si le jeu existe.
- [ ] Traiter les vulnérabilités des dépendances pertinentes lors de la stabilisation finale.

## Pas au départ

Mur d’écran en direct, matching ou rédaction par IA, messagerie entre participants, automatisation des vidéos, notifications multicanales, chiffres de campagne non collectés par HubInvest et extension à toute la Foire. Une solution humaine simple reste possible tant que le besoin n’est pas observé et validé.
