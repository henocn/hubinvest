# TODO — HubInvest

Référence prioritaire : `APIZF - FIL2026 - DK.pdf` (dispositif complet, § 8 « HubInvest »). Le cahier des charges `Volume2_HubInvest_Cahier_des_charges_API-ZF_V1.docx` reste la description détaillée de chaque module ; en cas d’écart, le PDF l’emporte. Les deux restent des documents de travail : leurs objectifs chiffrés ne sont jamais affichés comme des résultats.

Principe directeur commun aux deux documents : **fiabilité avant sophistication**. Un module souhaitable non prêt est remplacé par une solution manuelle. Chaque parcours reste livré de bout en bout (données, API, écran, droits, vérification sur téléphone) avant d’ouvrir le suivant. Les dates des documents ne fixent pas l’ordre du travail.

Avant toute modification, relire `PREFERENCES.md`. Toute nouvelle préférence durable sur l’UI, l’UX, le code ou la stratégie d’affichage doit y être consignée avant l’implémentation.

## Écarts entre les deux documents à trancher

- [ ] Nom du jeu : « Défis de la preuve » et parcours « Trouvez les trois preuves » (CDC) devenus « Défis du Hub » et « Trouvez les trois étapes » (PDF). Aligner les libellés FR/EN.
- [ ] Le PDF ajoute une « roue des opportunités » alors que le CDC exclut la « roue de la chance en ligne ». Confirmer s’il s’agit d’une animation physique ou d’une fonction à coder.
- [ ] Le positionnement passe de « La preuve par le Togo » à « Avec vous, à chaque étape » et à la série « Ils avancent avec l’API-ZF » : la fiche occupant doit-elle porter la success story (parcours avec l’Agence) ?
- [ ] Formats du Studio : « 21 secondes avec… » (CDC) remplacé par « 2 min avec… », « API-ZF en 60 secondes » et Face-à-face (PDF).
- [ ] Rencontres B2B : tables de 20 minutes (CDC) et « Rencontres express » de 10 minutes pendant la Journée API-ZF (PDF).
- [ ] Classement A/B/C : le code l’applique aux passages Défis, alors que les documents le réservent aux investisseurs (M3). Confirmer l’usage voulu sur les Défis.
- [ ] Les deux documents disent « six modules indispensables » mais en étiquettent huit (M1 à M6, M8, M9). Faire confirmer la liste réelle.

## Déjà fait

- [x] Backend Node.js/Express, Sequelize, migrations, variables `DB_*`, déploiement automatique sur le VPS avec tests critiques.
- [x] Frontend React/Vite unique (public, espaces et administration), découpés en pages, composants, tiroirs et tableaux réutilisables.
- [x] Quatre rôles : super administrateur, administrateur rattaché à un stand, occupant et animateur.
- [x] Authentification, mot de passe oublié par code à cinq chiffres (hash, cinq essais, usage unique).
- [x] Cloisonnement des contacts par occupant vérifié côté API et couvert par les tests critiques.
- [x] Interface publique FR/EN avec détection de la langue et choix mémorisé ; traduction DeepL des contenus publics.
- [x] Accès occupant retiré de l’interface publique ; routes protégées et redirections de session.

## Notifications asynchrones (e-mail et push)

- [x] File `notification_jobs` en base, traitée en arrière-plan par un worker : lots réservés sans conflit entre processus, nouvelles tentatives espacées, abandon journalisé après la dernière.
- [x] SMTP partagé (`shared/mailer.js`) ; le code de mot de passe oublié part sans faire attendre la réponse.
- [x] Web Push VAPID : abonnement par appareil (`/api/push-subscriptions`), abonnements expirés oubliés automatiquement.
- [x] Membre d’équipe prévenu en push, ou par e-mail s’il n’a aucun appareil joignable ; visiteurs prévenus par e-mail dans leur langue.
- [x] Activation dans le Profil occupant et par la cloche de l’administration ; une déconnexion volontaire coupe les notifications de l’appareil.
- [x] Événements branchés : demande de recontact, relance de contact à sa date, Investor Desk, proposition B2B et décision, réponse d’un invité du Studio.
- [ ] Renseigner les clés VAPID et vérifier la réception sur Android, iPhone (site ajouté à l’écran d’accueil) et ordinateur.
- [ ] WhatsApp et SMS en canal supplémentaire lorsque le fournisseur et les modèles approuvés sont connus.

## Temps réel (SSE)

- [x] Flux SSE `/api/realtime/stream`, ouvert avec un jeton court à usage unique (`POST /api/realtime/ticket`) car `EventSource` ne transmet pas l'en-tête `Authorization` ; durée limitée à 50 minutes et à celle de la session, signal de maintien toutes les 25 s.
- [x] Canaux cloisonnés comme l'API : super administrateur, administrateur et occupant de son stand, animateurs, compte, et parcours Défis public (`/api/realtime/passports/:token`).
- [x] Le serveur n'envoie que le sujet modifié, jamais de données ; chaque écran recharge lui-même ce qu'il a le droit de voir.
- [x] Branché sur : contacts (dont demandes du site), passages et remises Défis, Investor Desk, B2B et propositions, Studio, stands, comptes, programme.
- [x] Écrans mis à jour sans actualiser : carnet et en-tête occupant, compteur Défis, fiche participant de l'animateur, passeport public, tous les tableaux de l’administration et les propositions d'un besoin B2B.
- [x] Reconnexion progressive, pause après 30 s d'onglet caché, resynchronisation complète au retour ; rafraîchissement de 30 s conservé seulement quand le flux est coupé.
- [x] Nginx : bloc `location /api/realtime/` sans mise en tampon, délai de 1 h, HTTP/2 déclaré sur les deux sites (sauvegardes dans `/root/nginx-backups/` du VPS).
- [ ] Vérifier après déploiement sur téléphone et à l’administration : un scan, une demande de recontact et une proposition B2B apparaissent sans actualiser.
- [ ] Si l'API passe un jour en mode cluster PM2, relayer les événements entre processus par PostgreSQL `LISTEN/NOTIFY`.

## M1 — La vitrine du Hub (indispensable)

- [x] Ouvrir le site public sans compte ; lister les stands actifs et ouvrir une fiche avec couverture et logo.
- [x] QR codes générés depuis l’administration : accueil vers `/stands`, stand vers `/stands/:slug`.
- [x] Recherche simple par structure ou activité.
- [x] Navigation basse : accueil, exploration, rencontres et défis.
- [ ] Recherche par intérêt « Que recherchez-vous ? » avec pastilles de catégories administrées.
- [ ] Enrichir la fiche : trois à cinq produits ou services, marchés servis, chiffre clé, success story « Ils avancent avec l’API-ZF ».
- [x] Programme administré : temps forts, Journée API-ZF, animations, occupant « À l’affiche » de chaque jour.
- [x] Accueil « Aujourd’hui au Hub » distinct d’Explorer : occupant du jour, programme du jour (en cours / terminé), prochains rendez-vous.
- [ ] Ajouter à l’accueil les chiffres mesurés du Hub, une fois les statistiques disponibles.
- [ ] Plan simple du Hub au pavillon Oti avec le numéro de chaque stand.
- [ ] Trois actions permanentes « Être recontacté », « Rencontrer l’API-ZF », « Jouer » ; aucune ne mène à une page vide.
- [ ] Phases de la vitrine : pré-lancement, complète, pendant la Foire, archive.
- [ ] Scanner les QR codes avec l’URL de production avant impression.

## M2 — Les contacts des occupants (indispensable)

- [x] Saisie d’un contact par l’équipe du stand, qualification Chaud/Tiède/Froid, prochaine action et date.
- [x] Saisie hors ligne stockée sur le téléphone puis synchronisée.
- [x] Demande « Être recontacté » depuis la fiche publique, reçue uniquement par l’occupant concerné.
- [x] Site installable (manifeste et service worker) avec réception des notifications push.
- [x] Rappel de la prochaine action à sa date, remplacé ou annulé quand elle change.
- [ ] Vérifier sur téléphone que l’espace occupant s’ouvre sans réseau.
- [ ] Réduire la saisie à cinq champs obligatoires (liste à confirmer) ; compléter le reste plus tard.
- [ ] Créer un contact en scannant le passeport Défis d’un visiteur, uniquement avec son accord explicite.
- [ ] Responsable nommé pour chaque prochaine action.
- [ ] Noter une vente facultative : produit, quantité, montant (à confirmer).
- [ ] Export Excel du carnet par l’occupant.
- [ ] Écran d’accueil occupant : contacts du jour, contacts chauds, relances en retard, triées par urgence.
- [ ] Vérifier sur un vrai téléphone : mode avion, synchronisation sans doublon, saisie en moins d’une minute.

## M3 — L’Investor Desk (indispensable, réservé à l’API-ZF)

- [x] Formulaire public « Parlez-nous de votre projet » ; demande attribuée à un membre de l’équipe avec statut et prochaine action.
- [x] Équipe du stand prévenue d’une nouvelle demande ; l’investisseur reçoit une confirmation par e-mail dans sa langue.
- [ ] Réservation d’un rendez-vous sur créneaux administrés, sans double réservation.
- [ ] Qualification en neuf informations : profil, entreprise, pays, secteur, nature du projet, stade, besoin, interlocuteur API-ZF, prochaine action datée.
- [ ] Classement A (relance sous 48 h), B (sous 7 jours), C (newsletter).
- [ ] Alerte au référent quand un contact A n’est pas relancé dans les délais.
- [ ] Investor Pack bilingue téléchargeable par QR code, avec comptage des téléchargements.
- [ ] Export des dossiers qualifiés vers INVEST TRACK (modèle Excel à recevoir).

## M4 — Bourse des besoins et rendez-vous B2B (indispensable)

- [x] L’administration publie et ferme un besoin pour un stand ; un professionnel propose une rencontre avec consentement ; l’administrateur accepte ou refuse.
- [x] Équipe du stand prévenue d’une proposition ; le professionnel reçoit une confirmation puis la décision par e-mail.
- [ ] Besoins structurés : catégorie, description, volume, délai ; filtre par catégorie et secteur.
- [ ] Offres des occupants : produits, services, capacités, marchés servis.
- [ ] Mise en relation à double accord, puis réservation d’une table sur un créneau de 20 minutes sans chevauchement.
- [ ] Compte rendu en un clic après la rencontre : intérêt faible, moyen, élevé, devis attendu, partenariat en discussion, sans suite.
- [ ] Rendez-vous de 10 minutes pré-organisés pour les « Rencontres express » de la Journée API-ZF (si confirmé).
- [ ] Souhaitable : suggestions de rapprochements préparées par l’IA, validées par l’équipe avant tout envoi.

## M5 — Le Studio et les invités (indispensable)

- [x] Invitation datée avec lien personnel ; l’invité confirme ou refuse sans compte ; réponse visible dans le planning.
- [ ] L’invité choisit lui-même son format, son jour et son créneau ; un créneau pris devient indisponible.
- [ ] Statuts de production : invité, confirmé, arrivé, tourné, monté, publié.
- [x] L’auteur de l’invitation et l’équipe du stand sont prévenus de la réponse de l’invité.
- [ ] Confirmation immédiate puis rappels la veille et deux heures avant : la file de notifications est prête, il manque le contact de l’invité dans l’invitation.
- [ ] Fiche de préparation de l’interview ; questions suggérées par l’IA en option, ajustées par le journaliste.
- [ ] Souhaitable : livraison de la capsule à l’invité dès publication ; sinon envoi manuel par WhatsApp.

## M6 — Les Défis du Hub (indispensable)

- [x] Passeport : nom et contact, QR personnel retrouvé pendant 20 jours sur le même navigateur.
- [x] Validation humaine par scan du stand, une seule fois par stand ; seuil configurable (trois stands).
- [x] Remise unique de la récompense par l’animateur ; lien participant inexistant en 404.
- [ ] Parcours « Trouvez les trois étapes » : trois produits de trois occupants différents affichés sur le passeport, plusieurs versions modifiables chaque jour.
- [ ] Quiz express et vrai ou faux (trois questions), sur téléphone ou tablette.
- [ ] Badge numérique partageable à la fin du parcours.
- [ ] Récompenses : types, stock suivi en temps réel, alerte à 20 % du stock restant.
- [ ] Souhaitable : micro-enquête de trois questions au retrait.
- [ ] Faire valider le règlement du jeu par le service juridique ; aucun consentement commercial implicite.

## M7 — Le mur du Hub (souhaitable)

- [ ] Écran en direct : occupant du jour, prochaine interview, compteurs mesurés, dernières capsules sans son.
- [ ] Repli prévu : boucle vidéo préparée chaque matin par l’équipe.

## M8 — Tableau de bord et rapports (indispensable)

- [ ] Tableau de bord API-ZF du jour : contacts, contacts A et B, rendez-vous, besoins publiés, participations aux Défis, scans, créneaux du Studio, récompenses distribuées.
- [ ] Comptage des scans par QR code typé (accueil, occupant, Investor Desk, Défis, invitation).
- [ ] Chiffres par occupant visibles par lui seul ; aucun classement entre occupants.
- [ ] Rapport du soir à 19 h : chiffres du jour, comparaison avec la veille ; synthèse rédigée par l’IA et relue avant diffusion.
- [ ] Rapport PDF par occupant aux couleurs de l’API-ZF.
- [ ] Bilan consolidé et alimentation de « Le Hub en chiffres ».
- [ ] Questionnaire de satisfaction des occupants le dernier jour.
- [ ] Souhaitable : bouton « Besoin d’aide » dans l’espace occupant.

## M9 — L’administration (indispensable)

- [x] Créer occupants et comptes, logos et couvertures, rattacher les administrateurs à leur stand.
- [x] Gérer le programme et les journées « À l’affiche » (section Programme, super administrateur).
- [ ] Gérer les autres contenus : questions des Défis, versions de parcours, récompenses.
- [x] Données de démonstration réversibles : `npm run db:demo` / `npm run db:demo:undo` (refusées en production).
- [ ] Régler les agendas : créneaux Investor Desk, tables B2B, créneaux Studio.
- [ ] Suspendre un compte sans le supprimer.
- [ ] Import depuis Excel ; exports Excel et PDF.
- [ ] Journal des actions : qui a consulté ou modifié quoi, et quand.

## Données personnelles et sécurité

- [ ] Faire valider les textes de consentement FR/EN (une case par usage, rien de précoché).
- [ ] Page d’information FR/EN sur l’usage des données et les droits d’accès, de rectification et de suppression.
- [ ] Durées de conservation : contacts douze mois après la Foire, données des jeux six mois.
- [ ] Sauvegarde quotidienne chiffrée de la base.
- [ ] Protéger les formulaires publics contre les abus sans bloquer les visiteurs partageant une connexion.
- [ ] Respecter le cloisonnement des occupants et la confidentialité des dossiers investisseurs sur chaque nouvelle route et chaque nouvel écran.
- [ ] Traiter les vulnérabilités des dépendances lors de la stabilisation.

## Critères de réception

- [ ] Un contact s’enregistre en moins d’une minute (cinq personnes non formées, chronométrées).
- [ ] La saisie fonctionne en mode avion puis se synchronise.
- [ ] Un occupant ne voit jamais les contacts d’un autre (test avec chaque profil).
- [ ] Les réservations simultanées sur un même créneau ne se chevauchent pas.
- [ ] Une récompense ne peut pas être retirée deux fois.
- [ ] La vitrine s’affiche correctement en français et en anglais sur Android d’entrée de gamme et sur iPhone, en 3G.
- [ ] Le rapport du soir est produit à 19 h sur trois journées simulées.
- [ ] 100 % des fiches occupants publiées avant l’ouverture de la vitrine complète.
- [ ] Garder les tests automatisés sur ces risques : droits d’accès, synchronisation, réservations concurrentes, retrait unique.

## Hors périmètre 2026

Vente en ligne, paiement, avis publics, classement public des occupants ou des visiteurs, assistant conversationnel, matching automatique sans validation humaine, score de probabilité d’achat, messagerie entre participants, montage ou diffusion vidéo automatique, points cumulables, coupons, application à télécharger et extension à toute la Foire. Aucune décision ni aucun message de l’IA sans validation humaine, et aucune coordonnée personnelle transmise au service d’IA.
