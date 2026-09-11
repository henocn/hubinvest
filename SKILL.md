---
name: hubinvest-ux-ui
description: >
  Règles UX/UI à appliquer sur TOUT le frontend HubInvest. À charger avant de
  construire ou modifier un écran, un formulaire, un bouton ou une vue. Couvre
  cibles tactiles, contraste plein soleil, formulaires < 1 minute, feedback
  hors-ligne, bilinguisme FR/EN, et sobriété visuelle. Contexte : PWA mobile
  utilisée debout, en extérieur, sur réseau faible, par des personnes non
  techniciennes formées en 30 minutes.
---

# HubInvest — UX/UI : pro mais simple

Chaque décision d'interface répond à une seule question : **une personne debout dans un pavillon bruyant, au soleil, sur un téléphone bas de gamme, réussit-elle du premier coup ?** Si non, simplifier.

Trois utilisateurs pilotent le design : l'**hôtesse de stand** qui saisit un contact entre deux visiteurs, le **visiteur** qui n'a jamais vu l'app, et l'**animateur** qui scanne des passeports toute la journée. Aucun d'eux ne lit de manuel.

---

## 1. Cibles tactiles (la règle la plus importante)

Les gens tapent debout, à une main, parfois en mouvement.

- **Boutons d'action : 48 px de haut minimum**, 56 px pour l'action principale d'un écran. (Material Design recommande 48 dp, Apple HIG 44 pt ; on prend le plus grand comme plancher.)
- **Minimum absolu WCAG 2.2 (2.5.8) : 24×24 px** — c'est un plancher légal, pas un objectif. Ne l'utiliser que pour des icônes secondaires, et toujours avec **≥ 24 px d'espacement** autour.
- La **zone tactile compte plus que la taille visible** : un bouton qui paraît petit peut avoir du padding invisible pour atteindre 48 px. Ne jamais coller deux actions destructrices/opposées côte à côte.
- Un seul **bouton principal par écran**, très visible. Les actions secondaires sont visuellement plus discrètes.

## 2. Lisible en plein soleil

Le Hub est un espace ouvert et lumineux.

- **Contraste élevé** : texte principal ≥ 7:1 sur le fond, jamais de gris clair sur blanc. Viser AAA sur les textes courts et les boutons.
- **Corps de texte ≥ 16 px** (jamais moins — évite aussi le zoom auto sur iOS). Titres et chiffres clés nettement plus gros.
- Fonds **unis et clairs**, pas de dégradés ni de photos derrière du texte. Les états (chaud/tiède/froid, A/B/C, créneau libre/pris) se lisent **par la couleur ET par un mot ou une icône** — jamais par la couleur seule (daltonisme + soleil).

## 3. Formulaires : réussis en moins d'une minute

C'est le cœur de M2 et M6. La recherche est claire : chaque champ en trop fait chuter le taux de complétion, et sur mobile ça décroche dès 4–6 champs.

- **Une seule colonne**, jamais deux champs côte à côte. Flux vertical, sans hésitation.
- **Le minimum de champs.** Pour un contact : les 5 champs obligatoires du cahier des charges, le reste plus tard. Pour un visiteur : prénom + numéro, point.
- **Label au-dessus du champ**, en toutes lettres et sans ambiguïté (« Numéro de téléphone », pas « Détails »). Jamais de label uniquement en placeholder : il disparaît dès la première frappe.
- **Le bon clavier par champ** : `type="tel"` pour un numéro, `inputmode="numeric"`, `type="email"` pour un e-mail. Réduit les erreurs et la fatigue.
- **Validation après chaque champ**, message clair et proche du champ, qui dit quoi corriger — pas un pavé d'erreurs en fin de formulaire.
- **Enregistrement optimiste** : dès qu'on valide, l'écran confirme immédiatement (l'envoi réseau se fait derrière). L'utilisateur ne doit jamais attendre le réseau pour continuer.
- Éviter le multi-étapes tant que le formulaire est court ; il n'aide qu'au-delà de ~7 champs, et jamais plus de 3 étapes.

## 4. Hors-ligne : l'app ne « casse » jamais

Contrainte critique du projet. L'utilisateur ne doit jamais perdre une saisie.

- **Écrire d'abord en local (IndexedDB), toujours.** Le serveur est une copie, pas la source de vérité pendant la saisie.
- **Indicateur d'état permanent et discret** : « En ligne » / « Hors ligne — X à synchroniser ». Plus un **bouton « Synchroniser »** manuel.
  ⚠️ La Background Sync API ne marche pas sur Safari (iPhone) : vider la file à l'ouverture de l'app, sur l'événement `online`, et à l'appui du bouton.
- **Feedback d'intention** : une saisie hors-ligne s'affiche aussitôt avec une petite marque « en attente d'envoi », puis « envoyé » une fois synchronisée. L'utilisateur voit que rien n'est perdu.
- **Résolution de conflit simple** : dernier écrivain gagne (timestamp), suffisant ici.
- Pages **légères** : app-shell précaché, images compressées et différées, pas de dépendance lourde au premier chargement (cible 3G).

## 5. Bilinguisme FR/EN

- Sélecteur de langue **visible dès le premier écran** de la vitrine, de l'Investor Desk et des invitations.
- Toutes les chaînes passent par i18n — **aucun texte en dur**. Prévoir que l'anglais est parfois plus long : les boutons ne doivent pas casser.

## 6. Sobriété visuelle (pro, pas « template »)

L'identité vient de la campagne « La preuve par le Togo » (voir `NEEDS.md`) — la respecter exactement quand elle est fournie. En attendant, tenir un plancher de qualité sans tomber dans les tics du design généré :

- **Dépenser l'audace à un seul endroit** par écran (un chiffre clé, une photo d'occupant, un badge). Le reste reste calme et discipliné.
- **Éviter les tics génériques** : eyebrow en MAJUSCULES au-dessus de chaque titre ; une seule couleur d'accent posée partout ; toutes les cartes avec le même rayon et la même ombre grise molle ; un `→` collé à la fin de chaque bouton ; dégradés décoratifs.
- **La structure porte du sens** : ne numéroter (01/02/03) que si le contenu est vraiment une séquence (parcours des Défis, étapes de réservation). Les numéros de « preuve » des occupants viennent du contenu, pas de la déco.
- **Mouvement rare et utile** : une animation répond à une action (envoi confirmé, étape validée). Pas d'entrées « fade-up » sur chaque section.
- **Typographie** : une famille, deux au maximum, bien distinctes. Échelle de tailles claire. Ne pas mettre un seul mot en couleur/italique dans un titre.

## 7. Écrit d'interface (les mots sont du design)

- Nommer par ce que l'utilisateur comprend, pas par la technique : « Mes contacts », pas « Enregistrements CRM ».
- **Voix active, l'action dit ce qui se passe** : le bouton « Enregistrer le contact » produit « Contact enregistré » — même verbe du début à la fin.
- **Erreurs sans excuse et sans flou** : dire ce qui a raté et comment corriger. Un écran vide est une invitation à agir (« Aucun contact aujourd'hui — appuyez sur + pour en ajouter »), pas un cul-de-sac.
- Ton simple, phrases courtes, casse de phrase (pas de MAJUSCULES criardes).

## 8. Accessibilité, plancher non négociable

- Focus clavier visible, ordre de tabulation logique, `aria-label` sur les boutons-icônes.
- `prefers-reduced-motion` respecté.
- Chaque information portée par la couleur est doublée par du texte ou une icône.
- Contraste vérifié sur les vrais écrans, pas seulement en maquette.

## 9. Auto-critique avant de livrer un écran

Avant de considérer un écran fini, se poser :
1. Une personne non formée réussit-elle l'action principale **du premier coup, en < 1 min** ?
2. Est-ce lisible **au soleil**, sur un **petit écran bas de gamme** ?
3. Que se passe-t-il **hors-ligne** ? La saisie est-elle sauvée et visible ?
4. Y a-t-il **un** seul bouton principal évident ?
5. Ai-je ajouté un tic générique (eyebrow majuscule, flèche sur bouton, carte molle) ? Si oui, l'enlever.

À la manière de Chanel : avant de livrer l'écran, enlever un élément décoratif de trop.
