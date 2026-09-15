# HubInvest

HubInvest est le site mobile du **Hub de l’Investissement de l’API-ZF**. Son rôle est simple : faire découvrir les acteurs présents au Hub, transformer une rencontre en contact consenti, puis aider les personnes concernées à donner une suite à ce contact. Ce n’est ni la plateforme de toute la Foire, ni une boutique, ni un réseau social.

Ce cadrage est une **interprétation de travail à valider**, issue du cahier des charges propre à HubInvest (`Volume2_HubInvest_Cahier_des_charges_API-ZF_V1.docx`) et du document plus large de campagne (`APIZF - FIL2026 - DK.pdf`). Les deux sont des documents de travail rédigés avec l’aide de l’IA : leurs scénarios, chiffres et automatisations ne valent pas décision métier. Le cahier des charges annonce d’ailleurs six modules indispensables, alors que son tableau en étiquette huit ainsi. On retient donc d’abord l’intention et les gestes des personnes, pas la liste brute des modules.

## Qui fait quoi

| Personne | Ce qu’elle fait elle-même dans HubInvest | Ce qu’elle doit obtenir |
| --- | --- | --- |
| Visiteur | Scanne un QR code, découvre le Hub et les occupants, consulte une fiche. S’il le souhaite, laisse une demande de contact. | Une information compréhensible sur téléphone, sans compte obligatoire. |
| Visiteur professionnel, acheteur ou investisseur | Cherche une entreprise ou une information, expose son besoin, demande à rencontrer un occupant ou l’API-ZF. | Un interlocuteur identifié et une suite claire, pas une simple collecte de coordonnées. |
| Membre d’un stand | Enregistre avec accord les personnes réellement rencontrées, précise leur besoin et prévoit une relance. | Son propre carnet de contacts et ses actions à faire. |
| Responsable d’un occupant | Tient la fiche de son stand à jour, suit les contacts de son équipe et leurs suites. | Une vue limitée à son occupant, avec des résultats utiles et exportables. |
| Équipe API-ZF | Reçoit les demandes qui lui sont adressées, qualifie les projets d’investissement, attribue un responsable et suit les prochaines actions. | Une vue d’ensemble fiable, sans exposer les contacts privés d’un stand aux autres. |
| Administrateur API-ZF | Crée les occupants et les accès, publie ou corrige les informations, ouvre seulement les parcours réellement utilisés. | Un backoffice sobre qui permet de garder la main sans développeur. |

L’invité du Studio et l’animateur des Défis sont des profils supplémentaires **si ces opérations sont confirmées**. Le public n’a pas à se connecter pour simplement consulter. Un formulaire ponctuel n’équivaut pas automatiquement à un compte utilisateur.

## Les parcours à rendre vrais en premier

1. **Découvrir.** Depuis un QR code ou un lien, le visiteur arrive sur une page publique du Hub, voit les occupants et ouvre leur fiche. Un QR code de stand mène directement à la bonne fiche. Une action n’apparaît que si sa destination fonctionne.
2. **Exprimer un intérêt.** Le visiteur choisit de demander à être recontacté par un occupant ou de s’adresser à l’API-ZF. Il indique seulement les informations nécessaires et donne un accord explicite pour l’usage annoncé. Il voit une confirmation et sait qui doit reprendre contact.
3. **Saisir une rencontre.** Un membre de stand peut lui-même créer un contact après un échange réel, le qualifier simplement et noter la prochaine action. Le responsable retrouve les contacts de son stand, y compris ceux saisis sans réseau puis synchronisés.
4. **Faire le suivi.** La personne responsable consulte ses demandes, effectue la relance et met à jour l’avancement. L’API-ZF suit séparément ses dossiers investisseurs. Les chiffres affichés proviennent des actions enregistrées, pas de prévisions.

Le QR code est une **porte d’entrée**, pas la promesse d’un parcours complexe. Scanner pour consulter, scanner pour laisser ses coordonnées et scanner pour jouer sont trois intentions différentes. Participer à un jeu ne doit pas inscrire quelqu’un automatiquement comme prospect commercial.

## Ce que les documents envisagent au-delà de ce noyau

Le cahier des charges propose aussi une bourse de besoins et des rendez-vous B2B, une réservation d’entretiens avec l’API-ZF, un planning du Studio avec lien personnel pour les invités, un jeu de visite entre plusieurs stands, ainsi que des rapports. Ces parcours ont un sens pour l’événement, mais chacun dépend d’une organisation réelle : qui accepte les rendez-vous, qui anime le Studio, qui valide les étapes du jeu, qui remet les récompenses et qui exploite les rapports. Ils seront développés **un par un après validation de leur usage**, avec une solution manuelle possible lorsque cela suffit.

Le document de campagne décrit également la presse, les vidéos, la scénographie, les invitations et les objectifs de communication. Ce sont des activités humaines autour du Hub, pas automatiquement des fonctionnalités à coder. Le mur d’écran, les suggestions par IA, les messages automatiques, les badges partageables et les tableaux de bord élaborés sont des améliorations possibles, non le point de départ.

## Règles de produit

- Chaque occupant ne voit que ses contacts et ses résultats. L’API-ZF voit les chiffres globaux ; elle n’accède au détail d’un contact de stand que si la personne l’a accepté. Les dossiers investisseurs restent réservés à l’équipe API-ZF autorisée.
- Le consentement est demandé pour chaque finalité utile ; rien n’est précoché. Les règles et textes définitifs doivent être validés par l’API-ZF compétente.
- Le suivi d’un contact appartient à une personne identifiable : une demande reçue sans responsable ni prochaine action ne résout pas le problème initial.
- La saisie essentielle doit rester utilisable sur un téléphone modeste et avec une connexion faible. La synchronisation hors ligne est vérifiée sur appareil avant d’être annoncée comme fiable.
- Le français est la langue de base. Les parcours publics ou investisseurs nécessitant l’anglais sont traduits et vérifiés avant publication.
- Aucun chiffre fictif, aucune estimation présentée comme un résultat, aucune décision ou communication de l’IA sans validation humaine.
- Aucun paiement, vente en ligne, classement public des occupants ou extension automatique à toute la Foire.

## Où en est le projet

L’accès occupant n’est pas proposé dans l’interface publique : son lien est transmis directement aux équipes. Sans session, toute route de cet espace renvoie à la connexion ; avec une session active, la connexion renvoie à l’espace. Le responsable retrouve dans Profil ses informations et peut changer son mot de passe ou se déconnecter. L’en-tête affiche le logo API-ZF à gauche et le logo du stand à droite, ce dernier étant chargé depuis le backoffice avec une limite de 2 Mo et 1200 × 1200 pixels. Un lien personnel de participant inexistant aboutit à une page 404.

Les connexions occupant et backoffice proposent la récupération du mot de passe par e-mail. Un code numérique à cinq chiffres est envoyé par le serveur SMTP ; il expire après la durée configurée, accepte au maximum cinq essais et ne fonctionne qu’une fois. Seul un hash protégé du code temporaire est conservé en base.

Dans les Défis, le participant présente un QR contenant uniquement son code, également lisible dessous. L’espace occupant affiche le nombre de joueurs scannés : le bouton « Scanner » ouvre seulement la caméra, tandis que la saisie manuelle du code et « OK » restent sur la page. Chaque passage est lié à l’occupant qui le valide ; les occupants validés sont visibles dans le tableau « Participants » du backoffice.

Le socle Node.js, PostgreSQL/Sequelize, le frontend React et le backoffice existent. Le public peut ouvrir `/stands` et une fiche `/stands/:slug` sans compte ; seules les fiches dont le statut est actif sont visibles. Chaque stand peut avoir un emplacement, une activité et une image de couverture. Depuis cette fiche, une personne peut envoyer une demande de recontact au stand. L’équipe de ce stand la retrouve sans qualification imposée, puis peut modifier sa qualification et sa prochaine action. Un professionnel peut aussi ouvrir `/investor-desk`, présenter son projet à l’API-ZF et laisser ses coordonnées. L’Investor Desk retrouve cette demande dans le backoffice, la prend en charge et note sa prochaine action. Le premier parcours B2B est également disponible : un responsable occupant publie un besoin, un professionnel propose une rencontre depuis `/b2b`, puis le responsable accepte ou refuse cette proposition dans son espace. Pour le Studio, l’équipe API-ZF crée une invitation datée dans le backoffice et partage son lien personnel ; l’invité confirme ou refuse sans compte et la réponse apparaît dans le planning. Le parcours `/defis` permet enfin au visiteur de s’inscrire avec son nom et un contact, d’obtenir un code, puis aux stands de valider un passage unique et à l’accueil d’enregistrer une seule remise de récompense. Le navigateur conserve uniquement le jeton de ce parcours pendant 20 jours afin que le participant le retrouve sans se réinscrire. Les participants et leurs contacts sont consultables par l’administration et l’animateur autorisé dans le tableau « Participants ». L’interface publique détecte le français ou l’anglais, mémorise le choix manuel et rassemble ses quatre destinations principales dans une navigation basse. L’espace occupant utilise également une navigation basse pour Contacts, B2B, Défis et Profil. **Les textes de consentement public doivent être validés avant la production, et les parcours doivent encore être vérifiés sur téléphone.**

Le travail continue par petits parcours complets : données, API, écran, vérification des clics et des droits, puis retour utilisateur. `TODO.md` distingue le travail déjà fait, la prochaine étape et les parcours à confirmer. `NEEDS.md` ne demande les données externes qu’au moment où elles sont nécessaires au code. `SKILL.md` fixe la direction visuelle du frontend et du backoffice : sobre, claire, facile à utiliser, fondée sur les couleurs et logos de `assets/`.
