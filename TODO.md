# TODO - Lots fonctionnels HubInvest

Le projet avance par petits parcours complets. Chaque lot doit etre utilisable et verifiable avant le suivant. Aucun ecran ou endpoint n'est cree uniquement parce qu'il pourrait servir plus tard.

## Lot 0 - Preparation

- [x] Lire le cahier des charges initial.
- [x] Refaire le contexte, les conventions, le skill d'interface et les besoins de code.
- [x] Faire valider cette preparation avant le premier code.

## Lot 1 - Premier socle executable

Objectif : lancer un backend minimal, verifier la base et afficher une premiere surface conforme a la marque.

- [x] Initialiser le backend Node.js et Express.
- [x] Ajouter `npm run dev` avec nodemon.
- [x] Configurer Sequelize avec les variables `DB_*`.
- [x] Ajouter la commande `npm run db:migrate`.
- [x] Creer une route de sante et verifier son fonctionnement.
- [x] Initialiser le frontend React et Vite sans ecrans metier anticipes.
- [x] Charger les couleurs, le logo, Inter et Lucide.
- [x] Afficher et verifier un premier shell mobile sobre.

Arret de validation : serveur demarrable, migration executable, route de sante joignable et premier ecran visible.

## Lot 2 - Ne plus perdre les contacts

Objectif : prouver le parcours le plus critique avec un occupant et un contact.

- [x] Creer les models et migrations minimaux pour occupant, utilisateur et contact.
- [x] Ajouter l'authentification minimale necessaire au parcours.
- [x] Garantir cote API qu'un occupant ne lit que ses contacts.
- [x] Creer le formulaire `Nouveau contact` avec les champs valides.
- [x] Enregistrer le contact localement avant l'appel API.
- [x] Afficher les etats a synchroniser, synchronisation et synchronise.
- [x] Synchroniser a l'ouverture, au retour du reseau et sur clic.
- [x] Afficher `Mes contacts` et la prochaine action.
- [x] Ouvrir une fiche contact locale avec le telephone et les informations de suivi.
- [x] Tester le cloisonnement des contacts, la resynchronisation sans doublon et l'acces refuse apres desactivation d'un occupant.
- [ ] Verifier sur appareil le cycle complet : saisie en mode avion, retour du reseau et synchronisation.
- [ ] Verifier visuellement sur mobile l'ouverture de la fiche contact depuis la liste.

Arret de validation : un contact est saisi en mode avion, reste visible, se synchronise et demeure inaccessible a un autre occupant.

## Lot 3 - Mesurer ce qui est enregistre

Objectif : rendre visibles les resultats reels sans inventer de chiffres.

- [ ] Ajouter les indicateurs de contacts utiles au responsable d'occupant.
- [x] Creer la premiere vue backoffice API-ZF.
- [x] Afficher le nombre de contacts enregistres, au total et par occupant, dans le backoffice API-ZF.
- [ ] Completer les totaux globaux et le detail autorise selon les indicateurs encore a preciser.
- [ ] Ajouter les filtres strictement necessaires.
- [ ] Ajouter l'export demande lorsque son format est connu.
- [ ] Verifier visuellement la vue des contacts dans le backoffice.

Arret de validation : les chiffres du backoffice correspondent aux donnees creees et les vues restent cloisonnees.

## Lot 4 - Provoquer les rencontres utiles

Objectif : publier un besoin et obtenir un rendez-vous sans chevauchement.

- [ ] Ajouter besoins et offres.
- [ ] Afficher la bourse avec les filtres utiles.
- [ ] Permettre une demande de rencontre puis le double accord.
- [ ] Ajouter creneaux, tables et reservations.
- [ ] Bloquer les reservations concurrentes sur le meme creneau et la meme table.
- [ ] Ajouter le retour apres rencontre.
- [ ] Ajouter ensuite le parcours Investor Desk et ses classes A, B et C.
- [ ] Tester uniquement la concurrence de reservation et les droits critiques.

Arret de validation : le parcours complet fonctionne et deux reservations ne peuvent jamais occuper la meme ressource.

## Lot 5 - Organiser le Studio

Objectif : inviter une personne, lui faire choisir un creneau et suivre son passage.

- [ ] Creer les invitations a lien unique.
- [ ] Afficher les creneaux reellement disponibles.
- [ ] Confirmer la reservation sans compte.
- [ ] Ajouter le planning et les statuts dans le backoffice.
- [ ] Brancher un premier canal de rappel seulement lorsque ses acces sont disponibles.

Arret de validation : invitation, reservation et changement de statut fonctionnent de bout en bout.

## Lot 6 - Faire decouvrir le Hub

Objectif : publier une vitrine utile a partir des vraies donnees disponibles.

- [ ] Afficher les occupants et leurs fiches.
- [ ] Ajouter la recherche `Que recherchez-vous ?`.
- [ ] Ajouter le programme et le plan lorsqu'ils sont fournis.
- [ ] Ajouter les versions francaise et anglaise.
- [ ] Ajouter uniquement des actions deja fonctionnelles.
- [ ] Mettre en cache les ressources indispensables.

Arret de validation : la vitrine est utile, rapide en connexion faible et aucun bouton ne mene vers une fonction vide.

## Lot 7 - Faire circuler le public

Objectif : terminer un parcours de trois preuves et remettre une recompense une seule fois.

- [ ] Creer le passeport et son QR code personnel.
- [ ] Generer un parcours de trois preuves valide.
- [ ] Permettre la validation humaine d'une etape par scan.
- [ ] Ajouter le quiz lorsque son contenu est fourni.
- [ ] Marquer le parcours termine.
- [ ] Enregistrer le retrait et decrementer le stock de facon atomique.
- [ ] Tester le double scan et la concurrence sur le retrait.

Arret de validation : le meme passeport ne permet jamais deux retraits.

## Lot 8 - Rapports et finitions indispensables

- [ ] Completer les ecrans d'administration exiges par les parcours existants.
- [ ] Produire les exports Excel ou CSV demandes.
- [ ] Produire le rapport quotidien avec validation humaine.
- [ ] Produire le rapport final PDF par occupant.
- [ ] Verifier les parcours FR et EN.
- [ ] Verifier les appareils, la connexion faible et le mode hors ligne.
- [ ] Corriger les alertes de securite et vulnerabilites de dependances pertinentes.
- [ ] Executer uniquement les tests de reception et tests critiques.

## Reportable

Ces fonctions ne commencent qu'apres validation des lots indispensables :

- [ ] Mur du Hub en temps reel.
- [ ] Suggestions de rapprochement par IA.
- [ ] Suggestions de sujets ou questions d'interview.
- [ ] Livraison automatique des videos.
- [ ] Bouton d'assistance et micro-enquetes souhaitables.
