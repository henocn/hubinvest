# NEEDS — Ce que le client doit fournir (au fur et à mesure)

> Tout ce dont l'agent a besoin **de l'extérieur** pour personnaliser HubInvest.
> Sans ces éléments, le code avance avec des valeurs provisoires (placeholders) qu'il faudra remplacer. Chaque section indique **quand** c'est nécessaire pour ne pas bloquer le calendrier.
> Cases à cocher = fourni ✔.

Légende d'urgence : 🔴 bloquant tôt · 🟠 nécessaire avant la mise en ligne · 🟢 utile mais remplaçable par un placeholder au début.

---

## 1. Identité visuelle & marque 🔴
La base de tout le design. À obtenir en priorité (charte « La preuve par le Togo », voir Volume 1).

- [ ] **Charte graphique complète** de la campagne « La preuve par le Togo » (PDF ou fichier source).
- [ ] **Palette de couleurs** : valeurs **hex exactes** (primaire, secondaire, accent, fonds, couleurs d'état). Indispensable pour les tokens du `SKILL.md`.
- [ ] **Logos** en vectoriel (SVG/AI/PDF) **et** PNG transparent, en versions couleur / blanc / noir :
  - [ ] Logo **API-ZF**
  - [ ] Logo **HubInvest** (ou nom validé + éventuel logotype)
  - [ ] Logo **Hub de l'Investissement** / FIL si distinct
  - [ ] Logos **partenaires** et ministère (si à afficher)
- [ ] **Typographies** : noms des polices + fichiers (ou licences web). Une pour les titres, une pour le texte, avec les graisses autorisées.
- [ ] **Iconographie** : jeu d'icônes de la charte, ou feu vert pour utiliser une librairie libre (ex. style à valider).
- [ ] **Règles d'usage** : marges du logo, ce qui est interdit, ton visuel.

## 2. Favicon, PWA & installation 🟠
Pour l'« icône sur l'écran d'accueil » et l'onglet navigateur.

- [ ] **Icônes d'app** PNG carrées : 192×192, 512×512, + version « maskable ».
- [ ] **Favicon** (SVG + .ico).
- [ ] **Écran de démarrage / splash** (ou feu vert pour le générer à partir du logo).
- [ ] Nom court et nom long de l'app (pour le manifest), et couleur de thème.

## 3. Contenus des occupants (le carburant de M1, M2, M4) 🔴
Sans la liste, la vitrine et l'admin restent vides.

- [ ] **Liste définitive des 19 stands** avec, pour chacun : nom, **numéro de « preuve »**, activité, 3 à 5 produits/services, marchés servis, chiffre clé, contact.
- [ ] **Photos** de chaque occupant / produits (droit d'usage confirmé), format et poids maîtrisés.
- [ ] **Traductions EN** des fiches (ou source à traduire + qui valide).
- [ ] **Plan du Hub** (pavillon Oti) avec l'emplacement numéroté de chaque stand — image simple.
- [ ] Qui, côté occupant, est **référent** (nom + numéro) pour créer les comptes.

## 4. Programme & contenus éditoriaux 🟠
- [ ] **Programme** : temps forts, Journée API-ZF (3 déc.), animations, occupant « À l'affiche » par jour.
- [ ] Textes de la vitrine (accroches, « La preuve par le Togo »), FR + EN.
- [ ] **Questions des Défis** (quiz / vrai-faux) et les bonnes réponses, avec plusieurs versions de parcours.
- [ ] Textes des messages automatiques (confirmations, rappels, livraison vidéo), FR + EN.

## 5. Récompenses & jeu (M6) 🟠
- [ ] **Nature et quantité** des récompenses (goodies) et seuil d'alerte de stock.
- [ ] **Règlement des jeux validé par le juridique** (obligatoire avant publication ; recommandation : récompenses immédiates plutôt que tombola).
- [ ] Qui approvisionne et suit le stock physique pendant les 17 jours.

## 6. Intégrations techniques (à lancer TÔT — délais externes) 🔴
Ces éléments dépendent de tiers et peuvent bloquer plusieurs semaines.

- [ ] **WhatsApp Business Platform** : compte, numéro(s), **BSP agréé** choisi, et **modèles de messages soumis à validation** (Meta peut prendre du temps).
- [ ] **Agrégateur SMS** local (repli) : accès + numéro d'expéditeur.
- [ ] **E-mail transactionnel** : service + domaine + configuration d'envoi.
- [ ] **INVEST TRACK** : format d'import accepté (Excel/CSV ou API ?), champs exacts attendus, accès de test.
- [ ] **Service d'IA** : fournisseur/modèle retenu, clé d'accès, et confirmation du lieu de traitement des données.

## 7. Hébergement & sécurité 🟠
- [ ] **VPS / serveur** : fournisseur, accès, et **lieu d'hébergement validé par le juridique** (loi n° 2019-014).
- [ ] **Nom de domaine** + certificat HTTPS.
- [ ] Politique de **sauvegarde** validée (quotidienne, chiffrée).
- [ ] Liste des **comptes à créer** et rôles (qui est admin, Investor Desk, campagne…).

## 8. Données personnelles & juridique 🟠
- [ ] **Textes de consentement** (cases distinctes par usage), FR + EN, validés par le juridique.
- [ ] **Page d'information** sur l'usage des données et les droits (accès, rectification, suppression).
- [ ] **Durées de conservation** confirmées (12 mois contacts, 6 mois données de jeu, sauf exception).
- [ ] **Déclaration IPDCP** engagée / confirmée avant l'ouverture.
- [ ] **Convention d'utilisation des occupants** (leurs obligations sur leurs contacts).

## 9. Matériel physique (M6, M7, réseau) 🟢/🟠
- [ ] **Écran** du mur du Hub (M7) : modèle, taille, entrées, emplacement près de la scène « À l'affiche ».
- [ ] **2 tablettes** (quiz à la scène, animation).
- [ ] **2 routeurs 4G de deux opérateurs différents** (secours réseau).
- [ ] **Alimentation électrique** fiable confirmée pour écran + routeurs sur 17 jours.
- [ ] **Supports d'impression des QR codes** : totem d'entrée, chaque stand, Investor Desk, scène, invitations. (L'agent fournit les QR ; le client imprime et pose.)

## 10. Décisions API-ZF attendues (rappel du cahier des charges, annexe A)
À obtenir aux dates prévues — elles conditionnent le reste.

- [ ] Chef de projet API-ZF désigné (point de contact unique).
- [ ] Périmètre validé (modules indispensables/souhaitables).
- [ ] Nom « HubInvest » validé (ou alternative).
- [ ] Règles de partage des données occupants ↔ API-ZF.
- [ ] Maquettes d'écrans validées.

---

### Comment l'agent gère l'attente
Tant qu'un élément 🔴/🟠 manque, coder avec un **placeholder clairement identifié** (couleurs neutres, `logo_placeholder.svg`, données de test) et **centraliser** ces valeurs (fichier de thème + fichier de config) pour un remplacement en un seul endroit dès la livraison. Ne jamais disséminer une couleur ou un logo provisoire en dur dans plusieurs composants.
