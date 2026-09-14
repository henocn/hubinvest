---
name: hubinvest-interface
description: Concevoir ou modifier un écran, un composant, un formulaire ou un parcours du frontend mobile ou du backoffice HubInvest. Appliquer une direction sobre inspirée des outils de travail comme Postman, avec une hiérarchie, des espacements, des alignements et des contrôles visuellement vérifiés. Ne pas utiliser pour le backend seul.
---

# Interface HubInvest

Construire une interface sobre, nette et fonctionnelle. Elle doit ressembler a un produit de travail concu par une equipe humaine, pas a une demonstration d'IA.

Le frontend mobile et le backoffice partagent la meme identite, mais pas la meme densite. Le mobile favorise une action evidente a la fois. Le backoffice peut etre plus compact, avec une navigation stable et un espace de travail clair.

## Avant de toucher au code

1. Relire `PREFERENCES.md` et y consigner d’abord toute nouvelle préférence durable donnée par l’utilisateur.
2. Relire le parcours concerne dans `README.md` et, si une regle manque, dans le cahier des charges `.docx`.
3. Verifier `NEEDS.md` avant d'inventer un contenu, une option ou une valeur metier.
4. Definir l'action principale, les informations necessaires et les etats reellement utiles.
5. Faire un wireframe court du seul ecran en cours. Ne pas concevoir toute l'application d'avance.
6. Reutiliser les composants et tokens existants avant d'en creer de nouveaux.

Si la direction de l'ecran est encore incertaine, proposer ou produire un seul concept visuel pour cet ecran. Ne pas generer une serie de maquettes non validees.

## Règle de qualité UI/UX : un écran visuellement maladroit n’est pas terminé

Le fonctionnement technique ne suffit pas. Avant de livrer un écran, sa composition, ses proportions et chaque contrôle doivent être examinés dans le navigateur. Une case déplacée, un champ d’une hauteur différente, un bloc non centré, un texte comprimé ou un grand vide inexpliqué sont des défauts bloquants.

### Composition et hiérarchie

- Définir un axe visuel principal. Une tâche unique utilise un bloc centré ; un écran de travail suit la grille et les alignements du shell.
- Aligner entre eux le titre, le contenu, les champs et les actions. Aucun bloc ne flotte sans relation claire avec les autres.
- Adapter la largeur du contenu à sa nature : un formulaire court ne doit pas occuper tout l’écran et un texte ne doit pas former une colonne trop étroite.
- Éliminer les grands espaces vides, les décorations isolées et les marges qui repoussent l’action sous le premier écran visible.
- Construire une hiérarchie courte. Ne pas répéter la même idée dans le titre, le sous-titre, le panneau et le champ.
- Vérifier l’équilibre réel de la page à l’œil, pas seulement les valeurs CSS ou la présence des composants.

### Contrôles et formulaires

- Donner la même hauteur, le même rayon et le même alignement aux champs placés au même niveau.
- Une case à cocher ou un bouton radio garde une taille fixe, ne grandit jamais avec `width: 100%` et reste aligné en haut du texte associé.
- Le texte d’un consentement reste dans le même bloc que son contrôle, avec une largeur lisible. Toute la ligne doit être cliquable.
- Exclure explicitement `checkbox`, `radio` et les boutons des sélecteurs CSS génériques destinés aux champs de texte.
- Tester les libellés longs, les erreurs et les contenus saisis très longs. Ne pas afficher en aperçu un texte libre qui peut contenir des dizaines de lignes ; permettre plutôt de revenir le modifier.
- Vérifier les états normal, focus, erreur, chargement et désactivé sans variation de taille qui déplace la page.

### Parcours et densité

- Partir du geste que la personne est venue accomplir, pas des colonnes disponibles dans la base de données.
- Demander le minimum nécessaire au moment utile. Si le parcours commence par une intention et se termine par des coordonnées, révéler les coordonnées seulement au moment de poursuivre ou d’envoyer.
- Supprimer tout champ, texte ou étape qui ne change ni le traitement, ni la décision, ni la suite donnée par l’équipe.
- Dans un formulaire progressif, montrer seulement l’étape actuelle, conserver silencieusement les valeurs et fournir un retour simple vers l’étape précédente.

### Contrôle visuel obligatoire

Avant de considérer l’écran prêt, l’ouvrir et l’examiner au minimum à 320 px, 375 px et en largeur de bureau. Contrôler le premier écran visible, les alignements, les espacements, les débordements, la hauteur des champs, les cases à cocher, les textes longs et les boutons. Corriger ce qui paraît étrange avant de présenter le résultat ; un build réussi ne remplace jamais cette vérification visuelle.

## Direction visuelle

S'inspirer de la clarte de Postman sans le copier : navigation constante, barres d'outils discretes, panneaux bien delimites, onglets seulement lorsqu'ils servent le travail, etat de synchronisation visible et espace principal dominant.

Utiliser :

- des fonds blancs ou gris neutres tres legers ;
- des bordures fines pour separer les zones ;
- peu d'ombres, reservees aux menus, dialogues et elements flottants ;
- des rayons moderes et coherents ;
- une grille d'espacement reguliere ;
- une densite confortable sur mobile et maitrisee dans le backoffice ;
- une seule zone visuellement forte par ecran.

Eviter :

- les degradés decoratifs ;
- les grandes cartes arrondies imbriquees ;
- les ombres grises sur chaque bloc ;
- les badges et pastilles utilises comme decoration ;
- les titres surdimensionnes sans utilite ;
- les textes en capitales avec espacement artificiel ;
- les fleches ajoutees automatiquement aux boutons ;
- les animations d'entree repetees ;
- les chiffres, graphiques ou activites fictifs ;
- les emojis ;
- les textes d'explication et commentaires de code evidents.

## Couleurs

Les fichiers du dossier `assets/` sont la source de marque actuelle.

- Rouge API-ZF : `#D11135`
- Vert API-ZF : `#006A4F`
- Jaune API-ZF : `#FFCF11`
- Noir : `#000000`
- Blanc : `#FFFFFF`

Centraliser ces valeurs dans des tokens. Les surfaces neutres proviennent du noir et du blanc avec des niveaux controles ; ne pas ajouter une autre couleur chromatique sans raison metier.

Le jaune fonctionne comme accent ou signal avec du texte noir. Le rouge sert avec mesure aux actions de marque ou aux erreurs. Le vert porte la marque et les confirmations, mais un succes doit aussi etre nomme par du texte ou une icone. Verifier le contraste reel avant usage ; la presence d'une couleur dans la charte ne garantit pas qu'elle convienne a un petit texte.

Ne pas utiliser le logo comme motif decoratif. Choisir `Logo sans fond.png` lorsque le fond le permet et conserver ses proportions.

## Typographie

Utiliser `Inter Variable`, auto-hebergee dans le projet avec Fontsource ou des fichiers locaux. Garder une pile systeme en repli.

- une seule famille pour l'interface ;
- texte courant de 16 px minimum sur mobile ;
- libelles et donnees secondaires de 13 a 14 px minimum dans le backoffice ;
- interligne lisible ;
- titres courts, alignes a gauche ;
- deux ou trois graisses suffisent ;
- aucun mot colore ou italique au milieu d'un titre pour faire joli.

## Icones

Utiliser `lucide-react` et importer seulement les icones affichees.

- taille et epaisseur de trait coherentes dans une meme zone ;
- icone + texte pour une action importante ou inhabituelle ;
- icone seule uniquement pour une action universellement comprise ;
- `aria-label` obligatoire pour un bouton sans texte ;
- infobulle dans le backoffice lorsqu'une icone seule peut etre ambigue ;
- aucun caractere Unicode ou emoji a la place d'une icone.

## Composants

Construire quelques primitives propres au projet : bouton, champ, selecteur, dialogue, panneau, tableau, onglets, message d'etat et navigation. Utiliser les primitives Radix lorsque leur comportement complexe apporte une vraie valeur, notamment pour les dialogues, menus, selects, onglets et infobulles. Ne pas installer une bibliotheque complete pour un seul composant simple.

### Actions

- un bouton principal visible par ecran ou par panneau de travail ;
- hauteur minimale de 48 px sur mobile et 40 px dans le backoffice ;
- etats normal, survol, focus, chargement, desactive, succes et erreur si necessaires ;
- le libelle decrit le resultat : `Enregistrer le contact`, pas `Valider` ;
- une action destructive demande confirmation lorsque l'annulation n'est pas simple.

### Formulaires

- une colonne sur mobile ;
- label toujours visible au-dessus du champ ;
- bon type de clavier pour telephone, nombre et e-mail ;
- erreur pres du champ concerne ;
- valeurs conservees apres une erreur ;
- pas d'etape supplementaire si le formulaire tient naturellement sur un ecran ;
- confirmation immediate lorsque l'enregistrement local a reussi.

### Donnees et tableaux

- afficher d'abord les donnees necessaires a une decision ;
- utiliser une liste sur petit ecran et un tableau seulement lorsque la comparaison en colonnes est utile ;
- garder les filtres visibles et courts ;
- eviter les tableaux remplis d'actions en icones ;
- prevoir les etats vide, chargement, erreur et resultat ;
- ne jamais afficher une metrique non mesuree.

## Structures d'ecran

### Frontend mobile

- largeur principale limitee et une seule colonne ;
- en-tete court avec marque, langue et etat utile ;
- navigation basse seulement si trois a cinq destinations sont utilisees regulierement ;
- action principale atteignable au pouce ;
- aucun menu profond ;
- contenu critique disponible en connexion faible.

### Backoffice

- barre laterale gauche stable pour les fonctions disponibles au role connecte ;
- barre haute contextuelle courte ;
- espace de travail central prioritaire ;
- panneau lateral droit uniquement pour un detail temporaire ou contextuel ;
- onglets reserves a plusieurs vues du meme objet ;
- masquer les modules non autorises au lieu de les afficher desactives.

## Hors ligne et synchronisation

L'utilisateur ne doit jamais se demander si sa saisie est perdue.

- enregistrer localement avant l'appel reseau pour les actions concernees ;
- afficher `Hors ligne` et le nombre d'elements en attente ;
- afficher `Enregistre sur ce telephone` apres une saisie locale ;
- distinguer clairement `A synchroniser`, `Synchronisation` et `Synchronise` ;
- fournir un bouton `Synchroniser` ;
- tenter la synchronisation a l'ouverture, au retour de l'evenement `online` et sur action manuelle ;
- expliquer une erreur de synchronisation sans bloquer une nouvelle saisie.

## Texte d'interface

Chaque texte doit aider a comprendre ou agir.

- phrases courtes et actives ;
- vocabulaire utilisateur, jamais architecture technique ;
- aucun slogan dans une interface de travail ;
- aucun paragraphe si un libelle clair suffit ;
- un ecran vide propose l'action suivante ;
- une erreur dit ce qui n'a pas fonctionne et ce que l'utilisateur peut faire ;
- toutes les chaines des parcours bilingues passent par i18n.

## Accessibilite et appareils

- focus visible ;
- ordre clavier logique ;
- labels accessibles ;
- information jamais transmise par la couleur seule ;
- `prefers-reduced-motion` respecte ;
- zones tactiles suffisantes ;
- verification sur largeur mobile et bureau ;
- controle du contraste avec les couleurs finales ;
- aucune dependance critique au survol.

## Methode de livraison d'un ecran

1. Implementer le plus petit ecran complet qui permet l'action demandee.
2. Brancher les clics visibles ; ne pas livrer de bouton factice.
3. Ouvrir l'ecran dans le navigateur et exercer le parcours principal.
4. Verifier mobile, bureau si pertinent, et les etats vide, erreur et chargement.
5. Examiner une capture d'ecran et retirer le bruit visuel restant.
6. Presenter cet ecran avant de construire le suivant.

Un ecran n'est termine que si son action principale fonctionne, son retour est visible et aucun element n'annonce une fonction absente.

## References adaptees

Ce skill est une adaptation propre a HubInvest, nourrie par les principes du skill [Frontend Design d'Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design), publie sous licence Apache 2.0, du skill [Frontend App Builder d'OpenAI](https://github.com/openai/plugins/tree/main/plugins/build-web-apps/skills/frontend-app-builder), de la structure de travail documentee par [Postman](https://learning.postman.com/docs/getting-started/basics/navigating-postman), des primitives accessibles de [Radix UI](https://www.radix-ui.com/primitives/docs/overview/accessibility) et des icones [Lucide](https://lucide.dev/).
