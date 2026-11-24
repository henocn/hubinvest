# Préférences UX/UI HubInvest

À relire avant toute décision d'interface ou d'affichage. Une nouvelle préférence claire s'ajoute ici avant de modifier le code ; une préférence remplacée est corrigée, pas empilée.

## Direction visuelle

- Design system de référence : « API-ZF · Hub de l'investissement » (https://claude.ai/artifact/UBNnyJ9R72xJx9zxbu1r4a), thème Clair : fond blanc, angles droits partout (seules les pastilles rondes restent rondes), proportion 60/30/10 (vert dominant, jaune et rouge en accents), filet jaune au-dessus du titre de page, Sen pour les titres, Arial pour le texte, un seul mot d'accroche en Aleo italique extra-gras (« Investir » sur l'accueil), mosaïque de la charte en bandeau de pied de page, jamais de texte dessus.
- Couleurs : vert `#156c53`, vert foncé `#005b3f`, jaune `#ffcf15`, rouge `#d31b34`, encre `#0f1822`. Action principale rouge.
- Interface sobre, propre et directement compréhensible. Pas de signes de design généré par IA : textes de remplissage, cartes imbriquées, badges ou pastilles décoratifs, majuscules espacées, détails gratuits, grands espaces sans fonction.
- Le logo du Hub signe toutes les interfaces ; l'API-ZF apparaît seulement en pied de page (« Une initiative de » + logo). Le symbole seul sert au favicon, aux icônes et en filigrane léger. Icônes Lucide, aucun emoji.
- Un défaut visible d'alignement, de proportion, de centrage, de hauteur ou d'espacement bloque la livraison.
- Ne jamais forcer un retour à la ligne (largeur maximale étroite, `<br>`) : le texte occupe la largeur disponible.
- Conserver les accents dans tous les textes français.
- Vérifier chaque écran à 320 px, 375 px et sur ordinateur, sans débordement horizontal.

## Textes

- Texte court ; l'information détaillée apparaît seulement là où elle sert.
- Pas de surtitre, d'intro, de texte d'aide ou de placeholder quand un libellé clair suffit ; chaque ligne apporte une information.
- Pas de lien « Voir », « Ouvrir » ou de flèche qui répète qu'un élément entier est cliquable.
- Jamais de texte qui promet un automatisme qui n'existe pas (ex. un rendez-vous réservé « vous attend le …, sauf e-mail de modification ou d'annulation »).

## Formulaires

- Partir de l'intention de l'utilisateur, révéler la suite seulement quand elle devient nécessaire.
- Ne demander aucun champ qui ne change pas le traitement. Pas de case de consentement : l'accord est implicite à l'envoi.
- Téléphone : champ de la Semaine de l'Industrie partout (drapeau, Togo par défaut, indicatif verrouillé, numéro mis en forme et refusé s'il n'existe pas pour le pays).
- Choix de créneau par listes déroulantes (Jour, puis Heure), sans afficher le nombre de créneaux libres.
- Une image se choisit comme fichier, jamais par URL.
- Champs d'un même niveau à la même hauteur ; cases à cocher de taille fixe, alignées avec leur texte.
- Mot de passe : action afficher/masquer, pas de confirmation ; récupération par code à 5 chiffres reçu par e-mail.
- Les formulaires d'ajout et de modification du back office s'ouvrent en fenêtre au centre de l'écran.

## Site public

- Façon application mobile : en-tête vert fixe (menu à gauche, logo blanc à droite), panneau latéral pour les rubriques, la langue et l'espace équipe, barre d'onglets verte en bas qui ne disparaît pas au défilement.
- FR/EN pour toutes les chaînes ; sélecteur compact (nom de la langue puis drapeau).
- Accueil : bandeau vert (signature, Prendre rendez-vous en rouge, Être recontacté), « En ce moment », « Nos services », démarches, programme.
- Rencontres : deux tuiles cliquables (titre et une phrase), centrées dans la page, côte à côte sur grand écran.
- Carte de stand : image et informations séparées, rien posé sur la photo, la carte s'arrête à la description. Fiche : carrousel (défilement toutes les 2 s, arrêt au survol), « Prendre contact » en haut et en fin de fiche.

## Back office

- Sobre, sur le modèle de la Semaine de l'Industrie : en-tête d'une ligne (titre à gauche, actions à droite), pas de tuile de résumé, coins droits, bordures fines verticales et horizontales, lignes resserrées.
- Application mobile comme le site public : barre verte en haut, menu latéral, onglets en bas (quatre au plus) ; barre latérale fixe sur ordinateur.
- Tableaux : case à cocher en première colonne, recherche, tri (le plus récent d'abord), nombre de lignes, export Excel (lignes cochées sinon tout). Une ligne compacte par élément ; un clic l'ouvre en dessous pour le détail.
- Actions courantes en icônes avec `aria-label` et infobulle.
- Une fiche détaillée (guichets, B2B) est découpée en onglets ; les listes liées (rendez-vous, relances) ont leur propre onglet.
- Listes datées (rendez-vous, relances) : ce qui est à venir ou à faire d'abord, puis le reste ; toujours du plus proche au plus lointain.
- Pastille ou nombre (menu, onglets) : seulement à partir de 1, jamais « 0 » ni « 99+ » ; il ne compte que ce qui reste à venir, à faire ou à traiter, jamais le terminé.
- Statut d'une ligne signalé par un fond très léger (vert ou rouge), pas par une colonne de plus.

## Écrans particuliers

- Guichets : fiche en onglets Détails, Diagnostic, Rendez-vous, Relances. L'onglet s'appelle toujours Diagnostic ; pour une entreprise installée (guichet 3 ou Accompagnement), il contient la fiche des difficultés et l'engagement de suivi, dont la date de réponse crée une relance automatique. « Réponse donnée » passe par une fenêtre de confirmation, puis l'engagement est verrouillé (cadenas) jusqu'à « Rouvrir ».
- Diagnostic d'un projet : structure, projet, informations de qualification, service, étape suivante ; PDF une fois enregistré.
- Fiche PDF du diagnostic : une page, format administratif (cases à cocher, lignes pointillées) ; classes A, B, C et Accompagnement sans explication, ni responsable, ni signatures.
- Relances : Ajouter (date et heure, motif obligatoire, jamais prérempli) ; Marquer faite avec la prochaine étape (Terminée avec note facultative, Relancer avec date et motif, Autre avec texte) ; Supprimer.
- Compte rendu B2B : bouton message du rendez-vous → Présent (vert) ou Absent (rouge), puis la prochaine étape (texte) et la note. Un visiteur absent se reprogramme en un clic (fenêtre de nouveau rendez-vous ouverte aussitôt, bouton « Reprogrammer » sur la ligne tant qu'aucun rendez-vous ne suit).
- Fiche d'un stand (administration) : onglets Contacts (ouvert par défaut ; carnet du stand en lecture, recherche, export), Comptes, Programme, Besoins B2B, puis Fiche en dernier. Règle générale : l'onglet le plus sollicité vient en premier et s'ouvre par défaut.
- Stands : seule l'équipe API-ZF voit la liste. L'occupant a « Mon stand », qui ouvre directement sa fiche (et /stands l'y mène) ; il en modifie le contenu et les images, pas le nom, l'espace, l'emplacement ni le statut.
- Studio : réservé à l'équipe API-ZF (super administrateur, administrateur), jamais aux occupants. L'invité choisit son créneau une seule fois (ou décline avant de choisir) ; ensuite, changer ou annuler passe uniquement par l'équipe dans le back office (« Fixer / Modifier le créneau », « Annuler le passage »).
- Défis : QR du code participant puis le code lisible ; cinq pastilles d'étapes ; côté stand, compteur, bouton Scanner et saisie du code avec « OK » à côté.
- Remises de l'animateur : Participant, Contact, Remise le, la plus récente d'abord ; ses propres remises sur fond vert léger.
