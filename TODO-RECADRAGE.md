# Mini-TODO — recadrage avant `/stands`

Hypothèse de cette étape : une fiche publique correspond à un occupant présent au Hub. Si un même occupant doit avoir plusieurs fiches de stands distinctes, on réexaminera ce lien avant d’ajouter ces fiches.

- [x] Séparer le statut d’accès d’un occupant de la publication de sa fiche ; ajouter un libellé d’emplacement distinct du numéro de preuve, par une nouvelle migration.
- [x] Garder l’adresse publique (`slug`) stable quand le nom change et ne publier que les champs destinés aux visiteurs.
- [x] Mettre « Stands » au premier plan du backoffice : modifier la fiche, choisir sa publication, prévisualiser son lien public ; garder « Accès » pour les comptes.
- [x] Réserver `/`, `/stands` et `/stands/:slug` au public, et conserver l’espace de saisie de l’occupant derrière une adresse de connexion distincte.
- [x] Vérifier la migration de développement, les droits publics et les versions construites des interfaces.

Contrôle restant dans le parcours du `TODO.md` : ouvrir les pages sur un téléphone et scanner un QR réel. Aucun stand existant n’a été publié automatiquement.

Après ce recadrage, le parcours « le visiteur découvre le Hub » a été commencé. La demande de recontact a ensuite ajouté une origine publique, la date de capture du consentement et un contact sans utilisateur créateur. Les vérifications manuelles restantes sont suivies dans `TODO.md`.
