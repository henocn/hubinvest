# Préférences de travail HubInvest

Ce fichier conserve les préférences durables exprimées pendant le projet. Il doit être relu avant toute décision d’interface, d’affichage ou d’architecture. Lorsqu’une nouvelle préférence claire est donnée, la consigner ici avant de modifier le code.

## UI et direction visuelle

- Interface sobre, propre, simple et directement compréhensible, inspirée de la clarté de Postman sans la copier.
- Éviter les signes de design généré par IA : textes de remplissage, cartes imbriquées, badges décoratifs, détails gratuits et grands espaces sans fonction.
- Utiliser les couleurs et logos du dossier `assets/`, la police Inter et les icônes Lucide. Aucun emoji.
- Employer des bordures horizontales et verticales légèrement noires pour structurer les tableaux sans les alourdir.
- Un défaut visible d’alignement, de proportion, de centrage, de hauteur ou d’espacement bloque la livraison, même si l’écran fonctionne.
- Conserver les accents dans tous les textes français.
- Sur une carte de stand, séparer nettement l’image de couverture et les informations. Ne jamais poser le nom, l’activité ou l’action directement sur la photo.

## UX et formulaires

- Commencer par l’intention de l’utilisateur, puis révéler les informations suivantes seulement lorsqu’elles deviennent nécessaires.
- Ne demander aucun champ qui ne change pas le traitement ou la suite donnée.
- Éviter les textes d’aide, sous-textes et placeholders lorsqu’un libellé clair suffit.
- Ne pas afficher d’aperçu complet d’une fiche dans son formulaire d’édition.
- Ne pas répéter un contenu libre potentiellement long dans l’étape suivante d’un formulaire.
- Une image administrée se choisit comme fichier ; ne pas demander à l’utilisateur de saisir son URL.
- Les cases à cocher gardent une taille fixe et restent correctement alignées avec leur texte.
- Les champs d’un même niveau ont la même hauteur.
- Tous les champs de mot de passe disposent d’une action pour afficher ou masquer la valeur. La modification du mot de passe ne demande pas de confirmation et un champ vide ne le modifie pas.

## Tableaux et listes du backoffice

- Afficher seulement les informations nécessaires pour reconnaître l’élément et décider de l’action suivante.
- Garder une ligne compacte par élément. Ne pas afficher dans une cellule un texte qui peut occuper plusieurs lignes, comme une longue activité.
- Ne pas répéter sous le nom un slug, un identifiant ou une information sans utilité immédiate.
- Utiliser l’image de couverture comme repère visuel au début d’une ligne plutôt qu’une icône générique.
- Lorsque le contexte suffit, les actions courantes utilisent seulement des icônes avec `aria-label` et infobulle.
- Pour le statut des stands, un fond vert ou rouge très léger sur la ligne suffit ; ne pas ajouter une colonne ou une pastille de statut.

## Organisation du code

- Frontend React réparti dans des dossiers `components/` et `pages/`. Une page ne doit pas contenir tous les composants du parcours.
- Backend JavaScript avec Node.js, Express, nodemon, Sequelize et migrations.
- Un module backend lié à un modèle contient ses routes, validations, repository, service et controller.
- Les paramètres sensibles et la connexion à la base utilisent les variables d’environnement.
- Avancer par petits parcours complets. Ne pas construire tous les cas futurs avant leur usage réel.
- Écrire uniquement les tests protégeant les risques essentiels.
- Les alertes de vulnérabilités des dépendances sont tolérées pendant la construction et traitées pendant la stabilisation finale.

## Affichage et contenu

- Aucun libellé « API disponible » dans les interfaces.
- Aucun commentaire de code ou texte d’interface qui répète une évidence.
- Le texte principal reste court. L’information détaillée apparaît seulement à l’endroit où elle est utile.
- Vérifier chaque interface à 320 px, 375 px et sur ordinateur avant de la considérer terminée.
