const roles = require('../../shared/roles');

// Guide de l'espace équipe, découpé par rubrique. Le serveur n'envoie à l'assistant que les rubriques ouvertes au
// compte connecté : il ne peut donc ni expliquer ni laisser deviner un écran que la personne ne voit pas.
// Chaque texte décrit l'écran tel qu'il existe, avec ses libellés exacts ; un écran qui change se corrige ici.

// Rôle qui règle l'accès, comme dans le menu de l'espace équipe : l'occupant du Stand API-ZF a le sien.
const APIZF_OCCUPANT = 'occupant-apizf';
const accessRole = (user) => (user.role === roles.OCCUPANT && user.occupant?.space === 'apizf' ? APIZF_OCCUPANT : user.role);

const ROLE_LABELS = {
  [roles.SUPER_ADMIN]: 'super administrateur',
  [roles.ADMIN]: 'administrateur (équipe API-ZF)',
  [roles.OCCUPANT]: 'gérant de stand',
  [APIZF_OCCUPANT]: 'gérant du Stand API-ZF',
  [roles.ANIMATOR]: 'animateur',
};

// Menu de chaque rôle, dans l'ordre de l'écran ; « bas » : les onglets de la barre du bas sur téléphone.
const MENUS = {
  [roles.SUPER_ADMIN]: { menu: ['Tableau de bord', 'Stands', 'Relances', 'Programme', 'Studio', 'Rencontres B2B', 'Guichets', 'Jeux et défis', 'Questions', 'Utilisateurs', 'Journal', 'Paramètres'], bas: ['Accueil', 'Stands', 'Relances', 'Rencontres B2B'] },
  [roles.ADMIN]: { menu: ['Tableau de bord', 'Stands', 'Relances', 'Programme', 'Studio', 'Rencontres B2B', 'Guichets', 'Jeux et défis', 'Questions'], bas: ['Accueil', 'Stands', 'Relances', 'Rencontres B2B'] },
  [roles.OCCUPANT]: { menu: ['Tableau de bord', 'Mon stand', 'Mes contacts', 'Relances', 'Rencontres B2B'], bas: ['Accueil', 'Mes contacts', 'Relances', 'Rencontres B2B'] },
  [APIZF_OCCUPANT]: { menu: ['Tableau de bord', 'Mon stand', 'Mes contacts', 'Relances', 'Rencontres B2B', 'Guichets', 'Jeux et défis'], bas: ['Accueil', 'Mes contacts', 'Relances', 'Rencontres B2B'] },
  [roles.ANIMATOR]: { menu: ['Questions', 'Remises'], bas: ['Questions', 'Remises'] },
};

// Rubriques du guide ouvertes à chaque rôle.
const STAND = ['tableau-de-bord-stand', 'contacts', 'scan-stand', 'relances', 'mon-stand', 'b2b', 'studio-stand'];
const APIZF_DESK = ['tableau-de-bord-guichets', 'guichets', 'relances-guichets', 'jeux'];
const TEAM = ['tableau-de-bord-equipe', 'stands', 'relances', 'programme', 'studio', 'b2b', ...APIZF_DESK, 'jeux-equipe', 'questions'];
const ACCESS = {
  [roles.SUPER_ADMIN]: [...TEAM, 'jeux-super', 'utilisateurs', 'journal', 'parametres', 'compte'],
  [roles.ADMIN]: [...TEAM, 'compte'],
  [roles.OCCUPANT]: [...STAND, 'compte'],
  [APIZF_OCCUPANT]: [...STAND, ...APIZF_DESK, 'compte'],
  [roles.ANIMATOR]: ['scan-animateur', 'questions', 'remises', 'compte'],
};

const SECTIONS = {
  'tableau-de-bord-stand': `Tableau de bord (« Accueil » dans la barre du bas)
Page d'arrivée. « Aujourd'hui » liste les relances à faire et les rendez-vous du jour ; une relance en retard affiche « En retard ». Un clic ouvre la fiche concernée. « À traiter » montre les relances du jour et les demandes B2B à accepter ou refuser, seulement quand il y en a. « Le Hub en chiffres » donne les joueurs passés par le stand et les besoins B2B ouverts.`,

  contacts: `Mes contacts
En haut : le bouton « Nouveau » et quatre compteurs (Total, À qualifier, Prioritaires (A), À synchroniser). Un champ « Rechercher » (nom, téléphone, entreprise) et un bouton « Excel » qui exporte les contacts affichés.
Ajouter un contact : « Nouveau » → « Nouveau contact ». Champs : Nom complet (obligatoire), Téléphone (obligatoire), E-mail, « Ce que la personne recherche », « Quand la recontacter ? », Entreprise. Puis « Enregistrer le contact ».
« Quand la recontacter ? » fixe la classe du contact :
- « A · Rapidement » : à rappeler sous 48 heures. Une relance est créée automatiquement.
- « B · Plus tard » : à rappeler sous 7 jours. Une relance est créée automatiquement.
- « C · Opportunités API-ZF » : la personne veut seulement être informée. Pas de relance automatique. C'est le choix par défaut.
Numéro refusé : le message « Numéro invalide. Ajoutez l'indicatif pour un numéro étranger (ex. +33…). » demande d'ajouter l'indicatif du pays.
Fiche d'un contact (un clic sur sa ligne) : nom, classe, bouton « Appeler », coordonnées, ce que la personne recherche. « Modifier la classe » permet de choisir À qualifier, A, B ou C ; changer la classe remplace la relance automatique précédente. La classe est la seule chose modifiable : le nom et le téléphone ne se corrigent pas, et un contact ne se supprime pas. Le bloc « Relances » de la fiche permet d'« Ajouter » une relance ou de la « Marquer faite ».
« Demande du site » sur une ligne : la personne a écrit depuis la page publique du stand.
Sans réseau : un contact saisi est gardé sur le téléphone (« Enregistré sur ce téléphone · À synchroniser ») et part tout seul au retour du réseau ou quand on revient sur Mes contacts. Sans réseau, on ne peut ni modifier la classe ni ajouter de relance. Les autres rubriques demandent du réseau.`,

  'scan-stand': `Défi de passage sur le stand
Il n'y a plus de scan par le stand ni de « Scan de passage » dans le menu : le visiteur scanne lui-même le QR posé devant le stand et répond à deux questions automatiques sur les produits et services de la fiche du stand. Pour que les questions soient justes, la fiche (Mon stand) doit lister les produits et les services, un par ligne.
Le parcours compte cinq étapes : quatre stands de l'Espace Industrie, validés par le visiteur lui-même en scannant le QR posé devant le stand puis en répondant à deux questions automatiques sur les produits et services de la fiche (l'occupant n'a rien à faire : il n'y a plus de scan par le stand) ; la cinquième, au Stand API-ZF, où le joueur touche « Récupérer » et scanne le QR du comptoir : la récompense est marquée récupérée et son téléphone affiche un écran vert avec l'heure qui défile, que l'équipe regarde avant de donner le lot. Les affiches QR s'impriment depuis Paramètres → Affiches QR des stands.`,

  relances: `Relances
Onglets « Contacts » et « B2B ». Les relances à faire viennent d'abord, de la plus proche à la plus lointaine ; une relance en retard affiche « En retard ». Filtre : À faire, Faites, Toutes. « Exporter » exporte les lignes cochées, sinon tout le tableau. Sous la date, « Automatique (classe A) » ou « Automatique (classe B) » signale une relance créée par la classe du contact.
Marquer une relance faite : menu Actions de la ligne → « Marquer faite » → choisir la « Prochaine étape » : « Terminée » (note facultative), « Relancer » (nouvelle date et heure, et motif, obligatoires) ou « Autre » (texte obligatoire) → « Marquer faite ».
Ajouter une relance : depuis la fiche du contact ou de la demande B2B → « Ajouter » → Date et heure, Motif → « Ajouter ». À l'heure choisie, un rappel est envoyé. La date doit être à venir (« Choisissez une date et une heure à venir. »).
« Supprimer » retire une relance.`,

  'mon-stand': `Mon stand
En-tête : le nom du stand, son statut (Actif ou Inactif), un bouton « QR » quand le stand est actif, et « Modifier ». Deux onglets : « Besoins B2B » puis « Fiche ».
Publier un besoin B2B : « Besoin » → « Nouveau besoin B2B » → Titre (3 à 180 caractères) et Description (au moins 10 caractères), tous deux obligatoires → « Enregistrer ». Le besoin apparaît sur le site public, où des entreprises peuvent y répondre. Le crayon ouvre « Modifier le besoin », avec le statut Ouvert ou Fermé : fermer un besoin le retire du site. Un besoin ne se supprime pas, il se ferme.
Fiche du stand : « Modifier » → « Modifier le stand ». Le gérant modifie le site web, le logo (1200 × 1200 px et 2 Mo au plus), l'image de couverture, les activités, les produits et les services (un par ligne), et jusqu'à 5 photos des produits (5 Mo chacune). Puis « Enregistrer les modifications ». Le nom du stand, son emplacement et son statut sont fixés par l'API-ZF : pour les changer, s'adresser à l'équipe du Stand API-ZF. La fiche publique est masquée tant que le stand est inactif.
Dans les données, « ficheManquante » liste ce qui n'est pas encore rempli sur la fiche.`,

  b2b: `Rencontres B2B
Liste des demandes reçues sur les besoins publiés, avec leur statut : À traiter, Acceptée, Refusée. Outils : Rechercher, Trier, Exporter.
Répondre à une demande : icône Accepter ou Refuser sur la ligne (ou dans la fiche) → confirmer. La personne est prévenue par e-mail.
Fixer un rendez-vous : possible seulement une fois la demande acceptée. Ouvrir la demande → onglet « Rendez-vous » → « Rendez-vous » → Jour, Heure (seuls les créneaux libres sont proposés), Table → « Fixer le rendez-vous ». Le visiteur reçoit le rendez-vous par e-mail. Le crayon déplace un rendez-vous (impossible une fois le compte rendu fait) ; la corbeille l'annule, et le visiteur est prévenu.
Compte rendu : icône « Compte rendu » sur le rendez-vous, une fois qu'il a commencé → « Présent » ou « Absent » → « Prochaine étape », « À relancer le » (cette date crée une relance B2B) et « Note », facultatifs → « Enregistrer ». Si le visiteur est absent, la fenêtre d'un nouveau rendez-vous s'ouvre aussitôt, et un bouton « Reprogrammer » reste sur la ligne.`,

  'studio-stand': `Studio
Les invitations au Studio (interviews et capsules) sont gérées par l'équipe API-ZF, pas par les gérants de stand. Les données indiquent les invitations qui concernent le stand et leur créneau. Pour changer ou annuler un passage, s'adresser à l'équipe du Stand API-ZF.`,

  'tableau-de-bord-equipe': `Tableau de bord (« Accueil » dans la barre du bas)
Page d'arrivée. « Aujourd'hui » liste les relances à faire et les rendez-vous du jour ; un clic ouvre la fiche concernée. « À traiter » ne montre que ce qui attend une action : relances du jour, demandes B2B, « Questions du public », « Studio · invités sans créneau ». « Le Hub en chiffres » donne notamment « Stands actifs », « Contacts captés », « Passages au Studio » et « Joueurs des Défis ».`,

  'tableau-de-bord-guichets': `Tableau de bord : lignes des guichets et des jeux
« À traiter » montre aussi les contacts des guichets à traiter, les engagements en retard, les récompenses du Défi et les lots de la roue à remettre. Les chiffres ajoutent les parties de roue, les contacts aux guichets, les diagnostics réalisés et les sollicitations d'accompagnement.`,

  stands: `Stands
Liste des stands : Structure, Emplacement, Contacts, Actions (crayon « Modifier », corbeille « Supprimer »). « Rechercher » (nom, activité, emplacement), tri, « Exporter » (les lignes cochées, sinon tout). Un clic sur une ligne ouvre la fiche du stand.
Créer un stand : « + Stand » → « Créer un stand ». Obligatoires : Nom de la structure, Logo (1200 × 1200 px et 2 Mo au plus), Image de couverture. Autres champs : Espace (« Espace Industrie » ou « Stand API-ZF »), Emplacement du stand, Site web, Activités, Produits et Services (un par ligne), jusqu'à 5 photos des produits (5 Mo chacune), Statut du stand (Actif ou Inactif). Puis « Créer le stand ».
Fiche d'un stand : en-tête avec le nom, le statut, « QR » (stand actif seulement, avec « Télécharger »), « Modifier » et « Supprimer ». Onglets :
- « Contacts » (ouvert d'abord) : le carnet du stand en lecture seule, avec recherche et « Exporter ».
- « Comptes » : les comptes rattachés au stand, en lecture seule.
- « Programme » : les éléments du programme du stand.
- « Besoins B2B » : « + Besoin » publie un besoin au nom du stand.
- « Fiche » : emplacement, activités, produits, services, site web, fiche publique, images, chiffres du stand.
Statut : il se change dans « Modifier ». Un stand inactif n'a ni fiche publique ni QR.
Le compte d'un gérant ne se crée pas depuis la fiche du stand : il se crée dans Utilisateurs, rubrique réservée au super administrateur.
Supprimer un stand est définitif ; un stand encore utilisé par la plateforme ne peut pas être supprimé.`,

  programme: `Programme
Liste : Date (avec l'horaire ou « Toute la journée »), Type, Titre, Actions. Un clic sur une ligne montre le stand, le lieu, l'horaire et la description.
Ajouter : « + Ajouter au programme ». Types : « À l'affiche », « Temps fort », « Animation », « Studio », « Prise de parole ».
- Type ordinaire : Titre, Jour et Début obligatoires ; Stand (« Tout le Hub » par défaut), Fin, Lieu (vide = emplacement du stand), Description.
- « À l'affiche » : le stand présenté en tête de l'accueil toute la journée. Stand et Jour obligatoires, Accroche facultative (vide = activité du stand). Un seul stand à l'affiche par jour (« Un stand est déjà à l'affiche ce jour-là. »).
Erreur courante : « L'heure de fin doit suivre l'heure de début. »`,

  studio: `Studio
Invitations au Studio (interviews et capsules). Liste : Invité, Format, Créneau, Statut, Actions. Statuts : Créneau à choisir, Créneau réservé, Capsule livrée, Décliné (par l'invité), Annulé.
Inviter : « + Invitation » → « Inviter au Studio ». Obligatoires : Nom et prénom, E-mail. Autres : téléphone, Format, « Langue des e-mails », Stand (« Aucun (invité de l'API-ZF) » possible), Structure, Sujet. Puis « Envoyer l'invitation » : l'invité reçoit un lien pour choisir son créneau, puis des rappels la veille et une heure avant.
Menu d'une invitation :
- « Copier le lien de l'invité », « Renvoyer l'invitation ».
- « Fixer le créneau » ou « Modifier le créneau » : Jour puis Heure parmi les créneaux libres → « Fixer le passage » ou « Déplacer le passage ». L'invité est prévenu. Une fois son créneau réservé, l'invité ne peut plus le changer lui-même.
- « Livrer la capsule » (après la réservation) : « Lien de la capsule » → « Envoyer à l'invité ».
- « Modifier ».
- « Annuler le passage » : le créneau est libéré, l'invité est prévenu.
- « Supprimer » : l'invité n'est pas prévenu.
Les formats proposés et les horaires du Studio se règlent dans Paramètres (super administrateur).`,

  guichets: `Guichets
Registre des personnes reçues aux trois guichets (« Mon projet d'investissement », « Quel régime pour mon investissement ? », « Mon entreprise, mes difficultés »). Colonnes : Reçu le, Contact, Guichet, Classe (« À classer » si vide), Responsable, Échéance, Statut (À traiter, À relancer, Terminé, ou « Réponse à donner »). « Relances du jour » filtre ce qui est à faire aujourd'hui.
Ajouter : « + Contact » → « Nouveau contact » : Guichet, Nom et prénom, E-mail, Projet ou besoin (au moins 10 caractères), téléphone, Entreprise ou structure → « Ajouter le contact ».
Fiche, onglet « Détails » : le contact, le « Responsable » (à désigner dans l'équipe) et la « Classe » :
- A · Projet prioritaire : relance automatique dans 48 h.
- B · Potentiel à suivre : relance dans 7 jours.
- C · Contact à nourrir : lettre d'information, sans relance.
- Accompagnement : engagement de suivi écrit.
Changer de classe retire la relance automatique de l'ancienne classe si elle n'est pas faite.
Onglet « Diagnostic » :
- Guichets Projet et Régime : Structure, Projet ou besoin, informations de qualification, « Service vers lequel la personne est orientée », « Étape suivante » (obligatoire) → « Enregistrer le diagnostic ». « Fiche PDF » apparaît ensuite.
- Guichet « Mon entreprise » ou classe Accompagnement : Entreprise, Nature de la difficulté, Description (obligatoires), Régime ; puis « Engagement de suivi écrit » : Service concerné, « Réponse au plus tard le » et l'engagement pris (la date et le texte vont ensemble). Une relance est créée pour la date promise. « Réponse donnée » → « Confirmer » verrouille l'engagement et passe le contact à « Terminé » ; « Rouvrir » le déverrouille.
Onglet « Rendez-vous » : « Rendez-vous » → Date et heure, au guichet ou dans un autre lieu. La personne reçoit un e-mail et des rappels. Menu : « Valider » (une fois l'heure passée), « Modifier », « Annuler » (la personne est prévenue), « Supprimer » (sans prévenir).
Onglet « Relances » : « Ajouter » (Date et heure, Motif), « Marquer faite », « Supprimer ».`,

  'relances-guichets': `Relances, onglet « Guichets »
En plus des onglets Contacts et B2B : les relances des contacts des guichets, avec une colonne « Guichet ». Les relances automatiques sont marquées « Automatique (classe A) », « (classe B) » ou « (engagement) ». Un clic ouvre la fiche du contact dans Guichets.`,

  jeux: `Jeux et défis
Deux onglets.
« Défi de passage » : tous les joueurs du parcours. Colonnes : Participant, Code, Étapes, Récompense, Actions. Un clic montre les stands visités et qui les a validés. « QR des Défis » affiche le QR à montrer aux visiteurs. Remettre la récompense : bouton cadeau (actif seulement quand le parcours est terminé) → « Confirmer la remise ». Erreurs : « Le parcours n'est pas encore terminé. », « La récompense a déjà été remise. », « Il ne reste plus de récompense en stock. »
« Roue des opportunités » : les parties jouées. Colonnes : Jouée le, Code, Joueur, Résultat, Statut (Perdu, Lot à remettre, Lot remis). Il n'y a plus de code à donner : le visiteur identifié (même compte que les Défis) joue directement, autant de tours que le réglage « Tours de roue par joueur » ; s'il gagne, la roue lui affiche un code de 4 caractères à montrer pour recevoir son lot. Remettre un lot : bouton cadeau → « Confirmer la remise ».`,

  'jeux-equipe': `Jeux et défis : supprimer un participant
L'équipe API-ZF (super administrateur et administrateur) peut supprimer un participant du Défi depuis sa ligne.`,

  'jeux-super': `Jeux et défis : supprimer une partie de roue
Seul le super administrateur peut supprimer une partie de la roue.`,

  questions: `Questions du public
Questions posées par le public pendant les directs, regroupées par direct (« En direct » pour celui en cours). Onglets : « À poser », « Posées », « Écartées ». Actions : « Posée », « Écarter », et « Remettre à poser » pour une question déjà traitée.`,

  utilisateurs: `Utilisateurs
Liste des comptes : Utilisateur, Rôle, Stand, Présence (« En ligne », « Il y a … », « Jamais connecté »), Statut, Actions. Un clic montre l'e-mail, le téléphone, la dernière connexion et la date de création.
Créer un compte : « + Nouvel utilisateur » → « Créer un accès » : Prénom, Nom, Adresse e-mail, téléphone (facultatif), Rôle (Super administrateur, Administrateur, Occupant, Animateur), « Mot de passe temporaire » (8 caractères au moins) → « Créer l'utilisateur ». Pour un gérant de stand, choisir le rôle Occupant puis le « Stand rattaché », obligatoire. Un gérant du Stand API-ZF est un Occupant rattaché au stand dont l'espace est « Stand API-ZF ».
Modifier : crayon → « Modifier le compte » : en plus, Statut (Actif ou Inactif) et « Nouveau mot de passe » (vide = inchangé). Désactiver un compte se fait par le Statut « Inactif ».
Règles : on ne peut ni désactiver son propre compte, ni changer son propre rôle, ni le supprimer. « Ce compte doit être rattaché à un stand. » (Occupant sans stand) ; « Ce rôle ne peut pas être rattaché à un stand. »`,

  journal: `Journal des actions
Qui a fait quoi et quand : Date et heure, Compte (avec le rôle), Rubrique, Action, Élément. « Rechercher », « Exporter », « Actualiser ». Seules les 1 000 dernières actions sont chargées. Lecture seule.`,

  parametres: `Paramètres
Chaque réglage s'applique aussitôt.
- Modules ouverts au public : six interrupteurs (demandes de contact aux stands, Guichets, propositions B2B, Défi de passage, Roue, questions en direct).
- Trouvez les 5 étapes : « Récompenses en stock » (0 = stock non suivi).
- Studio : premier et dernier jour, premier créneau, fin des créneaux, durée d'un passage, formats (un format encore utilisé ne peut pas être retiré).
- Grand écran : affichage « En direct » ou « Boucle vidéo (repli) », service du jour, vidéo de repli, « Ouvrir l'écran ».
- Rendez-vous B2B : nombre de tables, durée, premier et dernier rendez-vous.
- Guichets : jours, heures et durée des rendez-vous, délais de relance des classes A (heures) et B (jours), informations de qualification du diagnostic.
- Roue des opportunités : tours de roue par joueur, et les cases de la roue (« + Case » : type, texte sur la roue, quantité totale, affichée ou masquée).`,

  'scan-animateur': `Remise des récompenses et des lots
Il n'y a plus de scan dans l'espace équipe. Le joueur touche « Récupérer » sur la page des jeux et scanne le QR du comptoir du Stand API-ZF : sa récompense du Défi (4 stands trouvés) et ses lots de la roue sont marqués récupérés d'un coup. Son écran devient vert, à son nom, avec ce qui lui revient et l'heure qui défile à la seconde : on remet ce qui est listé. Écran rouge « Déjà récupéré » : tout a déjà été pris.`,

  remises: `Remises (animateur)
« Récompenses remises » : Participant, Contact, Remise le, la plus récente d'abord ; les remises de l'animateur connecté sont surlignées. Bouton « Excel ». Cette liste ne contient que les récompenses du Défi, pas les lots de la roue.`,

  compte: `Compte et appareil
Il n'y a pas d'entrée Profil dans le menu : le nom en bas du menu ouvre le profil. À côté, une cloche (notifications) et l'icône « Se déconnecter ». Sur téléphone, « Plus » dans la barre du bas ouvre le menu complet. Une pastille avec un nombre sur une rubrique indique ce qui attend une action.
Connexion : adresse e-mail et mot de passe, puis « Se connecter ». La session reste ouverte tant que l'application l'est.
Mot de passe oublié : « Mot de passe oublié ? » sur la page de connexion → adresse e-mail → « Envoyer le code » → saisir le code à 5 chiffres reçu par e-mail et le nouveau mot de passe → « Modifier le mot de passe ».
Changer son mot de passe : profil → « Modifier le mot de passe » → mot de passe actuel et nouveau mot de passe (8 caractères au moins) → « Enregistrer ».
Notifications : à l'ouverture, la fenêtre « Activer les notifications » propose « Activer » ; sinon, la cloche du menu ou le bloc « Notifications » du profil. Si elles sont bloquées par le navigateur, les autoriser depuis le cadenas à côté de l'adresse du site. Sur iPhone, il faut d'abord installer HubInvest sur l'écran d'accueil (Partager, puis « Sur l'écran d'accueil »).
Se déconnecter : l'icône du menu ou le bouton « Se déconnecter » du profil. Les notifications de l'appareil sont coupées en même temps.`,
};

// Guide remis à l'assistant pour un compte : son menu, puis les rubriques qui lui sont ouvertes.
const guideFor = (user) => {
  const role = accessRole(user);
  const { menu = [], bas = [] } = MENUS[role] || {};
  const sections = (ACCESS[role] || []).map((key) => SECTIONS[key]).filter(Boolean);
  return [
    `Menu de ce compte, dans l'ordre : ${menu.join(', ')}. Barre du bas sur téléphone : ${bas.join(', ')}. Ce compte n'a accès à aucune autre rubrique.`,
    ...sections,
  ].join('\n\n');
};

module.exports = { accessRole, guideFor, ROLE_LABELS, ACCESS, SECTIONS };
