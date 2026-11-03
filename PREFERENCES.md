# Préférences de travail HubInvest

Ce fichier conserve les préférences durables exprimées pendant le projet. Il doit être relu avant toute décision d’interface, d’affichage ou d’architecture. Lorsqu’une nouvelle préférence claire est donnée, la consigner ici avant de modifier le code.

## UI et direction visuelle

- Interface sobre, propre, simple et directement compréhensible, inspirée de la clarté de Postman sans la copier.
- Éviter les signes de design généré par IA : textes de remplissage, cartes imbriquées, badges décoratifs, détails gratuits et grands espaces sans fonction.
- Utiliser les couleurs et logos du dossier `assets/`, la police Inter et les icônes Lucide. Aucun emoji.
- Employer des bordures horizontales et verticales légèrement noires pour structurer les tableaux sans les alourdir.
- Un défaut visible d’alignement, de proportion, de centrage, de hauteur ou d’espacement bloque la livraison, même si l’écran fonctionne.
- Ne jamais forcer un retour à la ligne (largeur maximale étroite sur un titre, `<br>`) : le texte occupe la largeur disponible et ne passe à la ligne que lorsque l'écran l'exige, ou quand un design particulier le justifie vraiment.
- Conserver les accents dans tous les textes français.
- Sur une carte de stand, séparer nettement l’image de couverture et les informations. Ne jamais poser le nom, l’activité ou l’action directement sur la photo.
- Une carte de stand s’arrête après sa description tronquée. Ne pas ajouter « Voir la fiche », « View profile », une flèche ou une autre action répétant que la carte entière est cliquable.

## UX et formulaires

- Commencer par l’intention de l’utilisateur, puis révéler les informations suivantes seulement lorsqu’elles deviennent nécessaires.
- Ne demander aucun champ qui ne change pas le traitement ou la suite donnée.
- Éviter les textes d’aide, sous-textes et placeholders lorsqu’un libellé clair suffit.
- Ne pas afficher d’aperçu complet d’une fiche dans son formulaire d’édition.
- Ne pas répéter un contenu libre potentiellement long dans l’étape suivante d’un formulaire.
- Une image administrée se choisit comme fichier ; ne pas demander à l’utilisateur de saisir son URL.
- Le téléphone est obligatoire dans tous les formulaires de contact. Sa validité et sa mise en forme sont contrôlées uniquement au frontend avec une bibliothèque dédiée (libphonenumber-js), sans vérification supplémentaire au backend.
- Les cases à cocher gardent une taille fixe et restent correctement alignées avec leur texte.
- Les champs d’un même niveau ont la même hauteur.
- Tous les champs de mot de passe disposent d’une action pour afficher ou masquer la valeur. La modification du mot de passe ne demande pas de confirmation et un champ vide ne le modifie pas.
- La récupération d’un mot de passe reste un parcours court : adresse e-mail, code numérique à 5 chiffres reçu par e-mail, puis nouveau mot de passe avec l’action afficher/masquer. Ne pas envoyer de lien contenant un jeton de réinitialisation.

## Tableaux et listes du backoffice

- Afficher seulement les informations nécessaires pour reconnaître l’élément et décider de l’action suivante.
- Garder une ligne compacte par élément. Ne pas afficher dans une cellule un texte qui peut occuper plusieurs lignes, comme une longue activité.
- Ne pas répéter sous le nom un slug, un identifiant ou une information sans utilité immédiate.
- Utiliser l’image de couverture comme repère visuel au début d’une ligne plutôt qu’une icône générique.
- Lorsque le contexte suffit, les actions courantes utilisent seulement des icônes avec `aria-label` et infobulle.
- Pour le statut des stands, un fond vert ou rouge très léger sur la ligne suffit ; ne pas ajouter une colonne ou une pastille de statut.
- Le tableau des joueurs affiche dans cet ordre : Participant, Contact, Code, Scans, Par, Stand, Récompense et Action. « Par » contient le nom complet de la personne ayant scanné et « Stand » l’occupant correspondant. Une récompense déjà remise est signalée par une ligne vert très léger et une icône Oui verte ; un parcours terminé mais non récompensé par une ligne rouge très léger et une icône Non rouge ; les autres lignes restent neutres. Les icônes Oui/Non sont centrées, fortes et sans fond ni bordure pour ne pas ressembler à des boutons. Le fond et la bordure colorés appartiennent au bouton cadeau. L’action reste visible mais désactivée tant que le parcours n’est pas terminé ou lorsque la récompense a déjà été remise.

## Organisation du code

- Limiter les comptes à quatre rôles : super administrateur, administrateur, occupant et animateur.
- Un administrateur est rattaché à un stand, jamais à un « périmètre ». Dans le backoffice, il accède à Investor Desk, B2B, Studio et Participants, avec des données strictement filtrées sur son stand. Le super administrateur conserve la vue globale et la gestion des stands et des accès.
- L’occupant utilise seulement Contacts, Défis et Profil. L’animateur utilise seulement Scan, Remises et Profil pour contrôler, remettre puis retrouver les récompenses.
- Remises de l'animateur : un tableau simple Participant, Contact, Remise le (date et heure), la plus récente en premier, alimenté en temps réel. Les lignes remises par l'animateur connecté ont un fond vert léger, sans colonne ni légende supplémentaire.
- Le B2B se gère dans le backoffice et non dans l’espace occupant.
- Seule l’API-ZF administre et détient les données : elle seule a des comptes administrateur, et son référent est rattaché à son compte. Les organes rattachés (BRMN, INPIT, HAUQUE) sont traités comme les stands des entreprises. Le super administrateur est l’agence.
- Les demandes Investor Desk vont uniquement à l’API-ZF. Il n’y a pas de réservation de rendez-vous investisseur en ligne.
- Les réglages globaux du site (fichier de l’Investor Pack, nombre de stands requis pour les Défis, etc.) se gèrent dans le backoffice par le super administrateur.
- INVEST TRACK n’existe pas encore : les dossiers investisseurs sont exportés en Excel.
- Les besoins B2B viennent des entreprises du Hub. Les rencontres express de la Journée API-ZF sont des rencontres B2B plus courtes : la durée des créneaux et les tables sont paramétrables.
- Le planning du Studio est tenu par l’API-ZF (à confirmer par la direction). L’invité reçoit son lien par copie manuelle et aussi par e-mail.
- Le classement A, B, C est conservé sur les passages des Défis. Le nombre de stands requis reste un paramètre (3 par défaut) ; les récompenses sont gérées sur le terrain.
- Le suivi des questions ouvertes pour la direction est tenu dans `QUESTIONS.md`.
- Frontend React réparti dans des dossiers `components/` et `pages/`. Une page ne doit pas contenir tous les composants du parcours.
- Backend JavaScript avec Node.js, Express, nodemon, Sequelize et migrations.
- Un module backend lié à un modèle contient ses routes, validations, repository, service et controller.
- Les paramètres sensibles et la connexion à la base utilisent les variables d’environnement.
- En production, un push ou merge sur `main` déclenche le déploiement automatique sur le VPS Hostinger par SSH. Le workflow installe séparément le backend, le frontend et le backoffice, exécute les migrations Sequelize, compile les interfaces puis recharge le backend avec PM2 et `--update-env`.
- Les envois externes sont asynchrones. Une notification e-mail ou push est d’abord ajoutée à la file `notification_jobs`, puis envoyée en arrière-plan par le worker avec nouvelles tentatives. Une action métier n’attend jamais un envoi et n’échoue jamais à cause d’une notification.
- Un membre d’équipe est prévenu en push sur ses appareils abonnés, et par e-mail seulement lorsqu’aucun appareil n’est joignable. Un visiteur sans compte reçoit uniquement des e-mails, dans la langue de sa demande.
- Une notification d’équipe ne contient pas les coordonnées du visiteur : elle indique l’événement et mène à l’écran où la donnée est consultable.
- Une déconnexion volontaire coupe les notifications de l’appareil ; une session expirée ne les coupe pas.
- Les dates et jalons des documents de travail ne fixent pas l’ordre du travail.
- Avancer par petits parcours complets. Ne pas construire tous les cas futurs avant leur usage réel.
- Écrire uniquement les tests protégeant les risques essentiels.
- Les alertes de vulnérabilités des dépendances sont tolérées pendant la construction et traitées pendant la stabilisation finale.

## Affichage et contenu

- Aucun libellé « API disponible » dans les interfaces.
- Aucun commentaire de code ou texte d’interface qui répète une évidence.
- Le texte principal reste court. L’information détaillée apparaît seulement à l’endroit où elle est utile.
- Sur l’interface visiteur, réserver l’en-tête à l’identité et aux réglages globaux. Placer les actions principales dans une navigation basse fixe, adaptée en priorité au mobile.
- L’interface visiteur est disponible en français et en anglais. Détecter automatiquement la langue du navigateur, mémoriser le choix manuel et ne pas transmettre les contenus à un service tiers sans validation explicite.
- Toutes les chaînes fixes de l’interface visiteur passent par la traduction FR/EN ; aucun libellé public ne reste codé en dur dans une seule langue.
- Le choix FR/EN traduit aussi les contenus éditoriaux publics provenant de la base de données, notamment l’activité des stands et les titres ou descriptions B2B. Les noms propres, coordonnées, codes et données personnelles ne sont jamais envoyés au service de traduction.
- Présenter le choix de langue dans un sélecteur compact avec le nom de la langue puis son drapeau, plutôt que deux boutons séparés.
- Dans l’espace occupant, placer également les destinations principales dans une navigation basse ; conserver en haut uniquement l’identité visuelle.
- Ne pas afficher l’accès occupant dans la navigation publique : les occupants reçoivent leur lien directement et toute route protégée les envoie vers la connexion si leur session est absente.
- Dans l’espace occupant, afficher uniquement le logo API-ZF à gauche et le logo de l’institution à droite, assez grands pour être lisibles, sans nom répété au centre. La navigation basse contient Contacts, Défis et Profil ; la déconnexion appartient à la page Profil.
- Un lien public personnel inexistant ou deviné doit aboutir à un véritable état 404, sans révéler d’information sur les autres participants.
- Toute donnée collectée dans un parcours public doit être consultable dans l’espace de travail de l’équipe qui doit réellement l’utiliser.
- Un participant déjà inscrit aux défis doit retrouver automatiquement son parcours pendant 20 jours sur le même navigateur. Stocker localement uniquement le jeton et son expiration, jamais son nom ni son contact.
- Pour les Défis, montrer d’abord un QR contenant uniquement le code participant, puis le code lisible en dessous. Côté occupant, centrer le nombre de joueurs scannés, le bouton « Scanner » et, en dessous, la saisie du code avec « OK » juste à côté. Le dialogue de scan ne contient que la caméra. Chaque passage validé est rattaché à l’occupant et ce rattachement est visible au backoffice.
- Après le scan ou la saisie d’un code participant, afficher en bas trois boutons A, B et C de même importance. Le choix est obligatoire pour enregistrer le passage et reste rattaché à ce passage ; dans le backoffice, la lettre apparaît avec le stand sans ajouter une colonne supplémentaire.
- Ne pas ajouter de bouton d’actualisation sous le code participant ; le suivi des passages se met à jour sans action dédiée.
- Vérifier chaque interface à 320 px, 375 px et sur ordinateur avant de la considérer terminée.
