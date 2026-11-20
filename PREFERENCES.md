# Préférences de travail HubInvest

Ce fichier conserve les préférences durables exprimées pendant le projet. Il doit être relu avant toute décision d’interface, d’affichage ou d’architecture. Lorsqu’une nouvelle préférence claire est donnée, la consigner ici avant de modifier le code.

## UI et direction visuelle

- Interface sobre, propre, simple et directement compréhensible, inspirée de la clarté de Postman sans la copier.
- Éviter les signes de design généré par IA : textes de remplissage, cartes imbriquées, badges décoratifs, détails gratuits et grands espaces sans fonction.
- Suivre la charte graphique du Hub (couleurs, Sen pour les titres, Arial pour le texte, boutons arrondis à 10 px comme les champs, action principale rouge) sans alourdir l’UX : pas de supergraphie dans les écrans de travail. Le logo du Hub (`frontend/src/assets/brand/`, tiré de `assets/Logo Hub couleur.png` et `assets/Logo Hub blanc.png`) signe toutes les interfaces ; l’API-ZF apparaît uniquement en pied de page (« Une initiative de » + logo API-ZF), jamais dans l’en-tête. Le symbole seul sert au favicon, aux icônes de l’application et en filigrane léger (bandeaux, page de connexion), jamais comme signature principale. Icônes Lucide, aucun emoji.
- Site public façon application mobile : en-tête vert fixé en haut (bouton menu à gauche, logo blanc à droite), panneau latéral pour toutes les rubriques, la langue et l’espace équipe, barre d’onglets verte en bas avec l’onglet actif en pastille blanche.
- Employer des bordures horizontales et verticales légèrement noires pour structurer les tableaux sans les alourdir.
- Un défaut visible d’alignement, de proportion, de centrage, de hauteur ou d’espacement bloque la livraison, même si l’écran fonctionne.
- Ne jamais forcer un retour à la ligne (largeur maximale étroite sur un titre, `<br>`) : le texte occupe la largeur disponible et ne passe à la ligne que lorsque l'écran l'exige, ou quand un design particulier le justifie vraiment.
- Conserver les accents dans tous les textes français.
- Accueil : un bandeau vert (date en jaune, symbole en filigrane) annonce en grand ce qui se passe « En ce moment » ou « Ensuite », avec « Poser une question » pendant un direct. Le stand à l’affiche est un simple bandeau (vignette, nom, emplacement). Le programme est un rail : grande heure en Sen, tronçon coloré par type (Studio rouge, prise de parole vert, temps fort jaune, animation encre), rendez-vous passés repliés, ligne rouge « Il est … » entre deux rendez-vous. Pas de cartes imbriquées, pas de majuscules espacées, pas de pastilles décoratives.
- Fiche de stand : Activités, Produits, Services (une entrée par ligne dans l’administration), site web, et un carrousel de 5 photos au plus.
- Sur une carte de stand, séparer nettement l’image de couverture et les informations. Ne jamais poser le nom, l’activité ou l’action directement sur la photo.
- Une carte de stand s’arrête après sa description tronquée. Ne pas ajouter « Voir la fiche », « View profile », une flèche ou une autre action répétant que la carte entière est cliquable.

## UX et formulaires

- Commencer par l’intention de l’utilisateur, puis révéler les informations suivantes seulement lorsqu’elles deviennent nécessaires.
- Ne demander aucun champ qui ne change pas le traitement ou la suite donnée.
- Éviter les textes d’aide, sous-textes et placeholders lorsqu’un libellé clair suffit.
- Pas de surtitre (« API-ZF · Hub de l’Investissement », « Annuaire », « Prendre contact »…), d’intro ou de lien « Ouvrir » qui répète le titre ou la carte : chaque ligne de texte doit apporter une information.
- Logo du Hub à droite de l’en-tête, bouton menu à gauche.
- Ne pas afficher d’aperçu complet d’une fiche dans son formulaire d’édition.
- Ne pas répéter un contenu libre potentiellement long dans l’étape suivante d’un formulaire.
- Une image administrée se choisit comme fichier ; ne pas demander à l’utilisateur de saisir son URL.
- Le téléphone est obligatoire dans tous les formulaires de contact (sauf l’identification des Défis, qui accepte un téléphone ou un e-mail). Sa validité et sa mise en forme sont contrôlées uniquement au frontend avec une bibliothèque dédiée (libphonenumber-js), sans vérification supplémentaire au backend.
- Les cases à cocher gardent une taille fixe et restent correctement alignées avec leur texte.
- Les champs d’un même niveau ont la même hauteur.
- Tous les champs de mot de passe disposent d’une action pour afficher ou masquer la valeur. La modification du mot de passe ne demande pas de confirmation et un champ vide ne le modifie pas.
- La récupération d’un mot de passe reste un parcours court : adresse e-mail, code numérique à 5 chiffres reçu par e-mail, puis nouveau mot de passe avec l’action afficher/masquer. Ne pas envoyer de lien contenant un jeton de réinitialisation.

## Tableaux et listes de l’administration

- Afficher seulement les informations nécessaires pour reconnaître l’élément et décider de l’action suivante.
- Garder une ligne compacte par élément. Ne pas afficher dans une cellule un texte qui peut occuper plusieurs lignes, comme une longue activité.
- Ne pas répéter sous le nom un slug, un identifiant ou une information sans utilité immédiate.
- Utiliser l’image de couverture comme repère visuel au début d’une ligne plutôt qu’une icône générique.
- Lorsque le contexte suffit, les actions courantes utilisent seulement des icônes avec `aria-label` et infobulle.
- Pour le statut des stands, un fond vert ou rouge très léger sur la ligne suffit ; ne pas ajouter une colonne ou une pastille de statut.
- Le tableau des joueurs affiche dans cet ordre : Participant, Code, Scans, Récompense et Action. Le contact, les stands visités et le nom complet de la personne qui a validé chaque passage s’affichent dans le détail de la ligne. Une récompense déjà remise est signalée par une ligne vert très léger et une icône Oui verte ; un parcours terminé mais non récompensé par une ligne rouge très léger et une icône Non rouge ; les autres lignes restent neutres. Les icônes Oui/Non sont centrées, fortes et sans fond ni bordure pour ne pas ressembler à des boutons. Le fond et la bordure colorés appartiennent au bouton cadeau. L’action reste visible mais désactivée tant que le parcours n’est pas terminé ou lorsque la récompense a déjà été remise.

## Organisation du code

- Limiter les comptes à quatre rôles : super administrateur, administrateur, occupant et animateur.
- Un administrateur est rattaché à un stand, jamais à un « périmètre ». Dans l’administration, il accède à Investor Desk, B2B, Studio et Participants, avec des données strictement filtrées sur son stand. Le super administrateur conserve la vue globale et la gestion des stands et des accès.
- L’occupant utilise seulement Contacts, Défis et Profil. L’animateur utilise seulement Scan, Remises et Profil pour contrôler, remettre puis retrouver les récompenses.
- Remises de l'animateur : un tableau simple Participant, Contact, Remise le (date et heure), la plus récente en premier, alimenté en temps réel. Les lignes remises par l'animateur connecté ont un fond vert léger, sans colonne ni légende supplémentaire.
- Deux projets : le site public (`frontend/`, hub.investir.tg) et l’espace équipe (`backoffice/`, adminhub.investir.tg). Tous ceux qui se connectent (super administrateur, administrateur, occupant, animateur) passent par l’espace équipe, avec une seule page de connexion `/connexion` qui envoie chaque compte vers sa rubrique. Chaque rubrique est une vraie adresse (`/stands`, `/investor-desk`, `/contacts`, `/contacts/:id`, `/scan`…) : le lien change, le bouton Retour fonctionne et un lien peut être partagé. Les anciennes adresses du site public (`/administration`, `/espace-occupant`, `/connexion`…) renvoient vers l’espace équipe.
- L’espace équipe est une application mobile comme le site public : barre verte en haut (menu à gauche, logo blanc à droite), menu latéral avec toutes les rubriques, le stand, le compte, les notifications et la déconnexion, onglets verts en bas (quatre au plus, « Plus » ouvre le menu pour les autres). Sur ordinateur, une barre latérale fixe remplace la barre du haut et les onglets.
- Les notifications sont demandées par défaut à tous les comptes : le navigateur pose la question au clic sur « Se connecter », puis une petite fenêtre « Activer les notifications » (texte court, boutons Activer / Plus tard) revient à chaque ouverture de l’espace tant qu’elles ne sont pas activées.
- Chaque tableau de l'administration a un filtre, un tri (le plus récent d'abord par défaut), le nombre de lignes et un bouton « Exporter » en Excel (en-têtes verts, dates en français, fichier daté). Les administrateurs arrivent sur un tableau de bord : ce qui attend une action d'abord, puis les chiffres ; les rubriques portent une pastille rouge au nombre exact d'éléments à traiter (jamais « 99+ »).
- Les modules publics s'ouvrent et se ferment depuis Paramètres, sans redéploiement ; fermé, le site affiche un message court à la place du formulaire ou du jeu (jamais une erreur ou une 404).
- Un lot de la roue se remet en saisissant le code de jeu (4 caractères) ; il ne peut être remis qu'une fois. Un code de 6 caractères reste un code participant des Défis.
- Le B2B se gère dans l’administration et non dans l’espace occupant.
- Seule l’API-ZF administre et détient les données : elle seule a des comptes administrateur, et son référent est rattaché à son compte. Les organes rattachés (BRMN, INPIT, HAUQUE) sont traités comme les stands des entreprises. Le super administrateur est l’agence.
- Les demandes Investor Desk vont uniquement à l’API-ZF. Il n’y a pas de réservation de rendez-vous investisseur en ligne.
- Les réglages globaux du site (fichier de l’Investor Pack, nombre de stands requis pour les Défis, etc.) se gèrent dans l’administration par le super administrateur.
- INVEST TRACK n’existe pas encore : les dossiers investisseurs sont exportés en Excel.
- Les besoins B2B viennent des entreprises du Hub. Les rencontres express de la Journée API-ZF sont des rencontres B2B plus courtes : la durée des créneaux et les tables sont paramétrables.
- Le planning du Studio et l’envoi des invitations sont gérés par l’agence (DEKA Editions), c’est-à-dire le super administrateur.
- Investor Desk : l’API-ZF reçoit toujours la demande. Une fois qu’elle l’a acceptée, l’entreprise ou l’organe concerné reçoit une notification anonyme, visible dans son espace.
- B2B : c’est l’API-ZF qui accepte ou refuse une proposition de rencontre, pour le compte de l’entreprise.
- Roue des opportunités (dans les Défis, page `/roue`) : pour jouer, un administrateur génère dans l’administration un code à usage unique (4 caractères, chiffres et majuscules, valable 30 minutes) qu’il donne au visiteur. Le tirage se fait côté serveur, au hasard parmi les cases visibles : chaque lot avec sa quantité restante et des cases perdantes « fun ». Un lot épuisé, sans quantité ou masqué disparaît de la roue. Les quantités se règlent dans l’administration. Le visiteur gagnant montre son écran (lot, partenaire, code) au stand.
- Défis (`/defis`) : la page présente les deux jeux, le parcours des stands et la roue. Un bouton central en bas, « S’identifier pour jouer », ouvre une fenêtre à deux champs seulement, « Nom et prénom » et « Téléphone ou e-mail », pour ne pas donner l’impression de collecter des données ; cette identification vaut pour les deux jeux. La roue n’accepte un code que d’un joueur identifié, et chaque partie est rattachée au joueur dans l’administration. La roue s’ouvre dans une fenêtre (bouton « Jouer à la roue » ou lien `/roue`) : la roue, puis le champ du code ; elle tourne tant qu’on appuie dessus et ralentit jusqu’à la case tirée quand on relâche (un simple clic suffit aussi). Le bouton « Me scanner » ouvre une fenêtre avec le QR et, dessous, le code participant (6 caractères ; les anciens codes de 8 restent acceptés).
- Studio : L’invité reçoit son lien par copie manuelle et aussi par e-mail.
- Le classement A, B, C est conservé sur les passages des Défis. Le nombre de stands requis reste un paramètre (3 par défaut) ; les récompenses sont gérées sur le terrain.
- Le suivi des questions ouvertes pour la direction est tenu dans `QUESTIONS.md`.
- Frontend React réparti dans des dossiers `components/` et `pages/`. Une page ne doit pas contenir tous les composants du parcours.
- Backend JavaScript avec Node.js, Express, nodemon, Sequelize et migrations.
- Un module backend lié à un modèle contient ses routes, validations, repository, service et controller.
- Les paramètres sensibles et la connexion à la base utilisent les variables d’environnement.
- En production, un push ou merge sur `main` déclenche le déploiement automatique sur le VPS Hostinger par SSH. Le workflow installe séparément le backend, le site public (`frontend/`) et l’espace équipe (`backoffice/`), sans lancer les tests, exécute les migrations Sequelize, compile les interfaces puis recharge le backend avec PM2 et `--update-env`.
- Les tests se lancent en local avant la mise en ligne, jamais dans la CI ni au déploiement, pour garder un déploiement court. La CI (`.github/workflows/ci.yml`) ne tourne qu’au push sur `main` et aux pull requests de `dev` vers `main` : elle vérifie seulement que le site public et l’espace équipe se construisent. Ne plus mettre à jour le serveur à la main : le déploiement s’en charge.
- Après tout `npm install` fait sous Windows, vérifier que le `package-lock.json` installe aussi sous Linux (`npm ci`), sinon le CI et le déploiement échouent : un lock créé sous Windows peut omettre des paquets optionnels propres à Linux.
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
- Dans l’espace occupant, afficher uniquement le logo du Hub à gauche et le logo de l’institution à droite, assez grands pour être lisibles, sans nom répété au centre. La navigation basse contient Contacts, Défis et Profil ; la déconnexion appartient à la page Profil.
- Un lien public personnel inexistant ou deviné doit aboutir à un véritable état 404, sans révéler d’information sur les autres participants.
- Toute donnée collectée dans un parcours public doit être consultable dans l’espace de travail de l’équipe qui doit réellement l’utiliser.
- Un participant déjà inscrit aux défis doit retrouver automatiquement son parcours pendant 20 jours sur le même navigateur. Stocker localement uniquement le jeton et son expiration, jamais son nom ni son contact.
- Pour les Défis, montrer d’abord un QR contenant uniquement le code participant, puis le code lisible en dessous. Côté occupant, centrer le nombre de joueurs scannés, le bouton « Scanner » et, en dessous, la saisie du code avec « OK » juste à côté. Le dialogue de scan ne contient que la caméra. Chaque passage validé est rattaché à l’occupant et ce rattachement est visible à l’administration.
- Après le scan ou la saisie d’un code participant, afficher en bas trois boutons A, B et C de même importance. Le choix est obligatoire pour enregistrer le passage et reste rattaché à ce passage ; dans l’administration, la lettre apparaît avec le stand sans ajouter une colonne supplémentaire.
- Ne pas ajouter de bouton d’actualisation sous le code participant ; le suivi des passages se met à jour sans action dédiée.
- Vérifier chaque interface à 320 px, 375 px et sur ordinateur avant de la considérer terminée.
- Back office sobre, sur le modèle de la Semaine de l’Industrie : en-tête d’une ligne (titre à gauche, actions à droite) sans phrase descriptive, aucune tuile de résumé ni filtre au-dessus des tableaux (seulement recherche, tri et export ; un filtre ne s’ajoute que si un besoin réel apparaît), cadres à coins droits et bordures fines et claires (verticales comme horizontales dans les tableaux), lignes et marges resserrées, tableau vide sur une seule ligne.
- Chaque tableau du back office commence par une colonne de cases à cocher (case d’en-tête pour tout cocher, état intermédiaire si partiel) ; l’export prend les lignes cochées quand il y en a, sinon tout le tableau.
- Les lignes des tableaux restent courtes (l’essentiel en quelques colonnes) : un clic sur une ligne l’ouvre et affiche le reste (coordonnées, message, description…) juste en dessous, comme sur la Semaine de l’Industrie ; un second clic la referme, une seule ligne ouverte à la fois, les boutons de la ligne n’ouvrent pas le détail. Les stands, eux, ouvrent leur fiche complète.
- Les formulaires d’ajout et de modification du back office s’ouvrent dans une fenêtre au centre de l’écran (modale), jamais dans un panneau qui glisse depuis la droite.
