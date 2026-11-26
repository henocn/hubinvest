const crypto = require('node:crypto');
const roles = require('../../shared/roles');

// Outils de l'agent de l'espace équipe. Chaque outil appelle l'API de HubInvest avec la session du compte connecté :
// les droits, les validations et le journal des actions s'appliquent exactement comme si la personne avait cliqué.
// - Un outil de lecture s'exécute aussitôt.
// - Un outil d'écriture ne fait rien : il prépare l'action, que la personne confirme ou non dans la fenêtre.
// - Aucun outil ne supprime : la méthode DELETE n'existe pas ici, et l'exécution la refuse (assistant.actions.js).
// « roles » : rôles d'accès (assistant.guide.js) à qui l'outil est proposé ; la route décide de toute façon.

const S = roles.SUPER_ADMIN;
const A = roles.ADMIN;
const O = roles.OCCUPANT;
const P = 'occupant-apizf';
const N = roles.ANIMATOR;
const TEAM = [S, A];
const DESK = [S, A, P];
const STANDS = [O, P];
const MANAGERS = [S, A, O, P];

// ——— Paramètres ———

const text = (description) => ({ type: 'string', description });
const choice = (values, description) => ({ type: 'string', enum: values, description });
const id = (description) => ({ type: 'string', description: `${description} (identifiant renvoyé par un outil de lecture)` });
const when = (description) => ({ type: 'string', description: `${description}. Format ISO 8601 en UTC, qui est l'heure de Lomé, par exemple 2026-11-27T10:00:00Z` });
const day = (description) => ({ type: 'string', description: `${description}. Format AAAA-MM-JJ` });
const label = () => text('Nom de la personne ou de l’élément concerné, tel qu’il apparaît à l’écran : il est montré à la personne qui confirme');
const search = () => text('Mots à chercher (nom, entreprise, téléphone…). Vide : tout');
const schema = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });

// Un identifiant ou un code placé dans une adresse : seulement des lettres, chiffres et tirets.
const segment = (value, name = 'identifiant') => {
  const clean = String(value || '').trim();
  if (!/^[A-Za-z0-9-]{1,64}$/.test(clean)) throw new Error(`${name} invalide`);
  return encodeURIComponent(clean);
};

// Retire d'un objet les champs vides (l'API garde alors la valeur actuelle).
const defined = (values) => Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== ''));

const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// Garde les éléments d'une liste qui contiennent tous les mots cherchés.
const matching = (items, query) => {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const list = Array.isArray(items) ? items : [];
  return words.length ? list.filter((item) => { const haystack = normalize(JSON.stringify(item)); return words.every((word) => haystack.includes(word)); }) : list;
};
const isDone = (item) => Boolean(item?.doneAt);
const dateOf = (value) => (value ? new Date(value).toISOString().slice(0, 10) : null);

// Classes, statuts et issues : les mots de l'écran, traduits pour l'API.
const STATUS_B2B = { accepter: 'accepted', refuser: 'declined' };
const OUTCOMES = { terminee: 'closed', relancer: 'again', autre: 'other' };
const SPACES = { actif: 'active', inactif: 'inactive' };

const followUpPath = (type, input) => {
  if (type === 'contact') return `/follow-ups/contacts/${segment(input.id)}`;
  if (type === 'b2b') return `/follow-ups/b2b/${segment(input.id)}`;
  if (type === 'guichet') return `/investor-requests/${segment(input.id)}/follow-ups`;
  throw new Error('type de relance inconnu');
};

const donePath = (input) => {
  if (input.type === 'contact') return `/follow-ups/contacts/${segment(input.relanceId)}`;
  if (input.type === 'b2b') return `/follow-ups/b2b/${segment(input.relanceId)}`;
  if (input.type === 'guichet') return `/investor-requests/${segment(input.contactGuichetId, 'contactGuichetId')}/follow-ups/${segment(input.relanceId)}`;
  throw new Error('type de relance inconnu');
};

// Mot de passe temporaire d'un compte créé ou réinitialisé : tiré par le serveur au moment de la confirmation, montré
// à la seule personne qui confirme, jamais transmis au modèle.
const temporaryPassword = () => crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 10) + '7a';

// ——— Lecture ———

const READ = [
  {
    name: 'tableau_de_bord', roles: [...MANAGERS, N],
    description: 'Ce qui attend une action, l’agenda du jour et les chiffres, tels que le tableau de bord les montre.',
    input: schema({}),
    request: () => ({ method: 'GET', path: '/dashboard' }),
  },
  {
    name: 'chercher_contacts', roles: STANDS,
    description: 'Cherche dans le carnet de contacts du stand (nom, téléphone, entreprise), avec leurs coordonnées et leur classe.',
    input: schema({ recherche: search(), classe: choice(['A', 'B', 'C'], 'Seulement cette classe') }),
    request: (input) => ({ method: 'GET', path: '/contacts', query: defined({ search: input.recherche, qualification: input.classe, limit: 30 }) }),
    view: (data) => data?.items ?? data,
  },
  {
    name: 'voir_contact', roles: STANDS,
    description: 'Fiche complète d’un contact du stand, avec ses relances.',
    input: schema({ contactId: id('Contact') }, ['contactId']),
    request: (input) => ({ method: 'GET', path: `/contacts/${segment(input.contactId)}` }),
  },
  {
    name: 'carnet_d_un_stand', roles: TEAM,
    description: 'Contacts enregistrés par un stand donné, avec recherche.',
    input: schema({ standId: id('Stand'), recherche: search() }, ['standId']),
    request: (input) => ({ method: 'GET', path: `/contacts/admin/stands/${segment(input.standId)}` }),
    view: (data, input) => matching(data, input.recherche),
  },
  {
    name: 'lister_relances', roles: MANAGERS,
    description: 'Relances d’un onglet de la page Relances : contacts, B2B, ou guichets (équipe API-ZF et Stand API-ZF).',
    input: schema({
      onglet: choice(['contacts', 'b2b', 'guichets'], 'Onglet'),
      etat: choice(['a_faire', 'faites', 'toutes'], 'À faire par défaut'),
      recherche: search(),
    }, ['onglet']),
    request: (input) => ({ method: 'GET', path: `/follow-ups/${segment(input.onglet, 'onglet')}` }),
    view: (data, input) => {
      const state = input.etat || 'a_faire';
      const list = (data || []).filter((item) => (state === 'toutes' ? true : state === 'faites' ? isDone(item) : !isDone(item)));
      return matching(list, input.recherche);
    },
  },
  {
    name: 'lister_besoins_b2b', roles: MANAGERS,
    description: 'Besoins B2B publiés (ceux du stand, ou de tous les stands pour l’équipe API-ZF), avec le nombre de demandes reçues.',
    input: schema({ recherche: search() }),
    request: () => ({ method: 'GET', path: '/b2b-needs' }),
    view: (data, input) => matching(data, input.recherche),
  },
  {
    name: 'lister_demandes_b2b', roles: MANAGERS,
    description: 'Demandes B2B reçues sur les besoins publiés, avec leur statut et leur rendez-vous.',
    input: schema({ statut: choice(['pending', 'accepted', 'declined'], 'pending = à traiter'), recherche: search() }),
    request: () => ({ method: 'GET', path: '/b2b-proposals' }),
    view: (data, input) => matching((data || []).filter((item) => !input.statut || item.status === input.statut), input.recherche),
  },
  {
    name: 'voir_demande_b2b', roles: MANAGERS,
    description: 'Détail d’une demande B2B : la personne, son message, ses rendez-vous et comptes rendus.',
    input: schema({ demandeId: id('Demande B2B') }, ['demandeId']),
    request: (input) => ({ method: 'GET', path: `/b2b-proposals/${segment(input.demandeId)}` }),
  },
  {
    name: 'creneaux_b2b', roles: MANAGERS,
    description: 'Créneaux libres pour un rendez-vous B2B un jour donné, avec les tables disponibles.',
    input: schema({ demandeId: id('Demande B2B'), jour: day('Jour') }, ['demandeId', 'jour']),
    request: (input) => ({ method: 'GET', path: `/b2b-proposals/${segment(input.demandeId)}/slots`, query: { date: input.jour } }),
  },
  {
    name: 'lister_stands', roles: TEAM,
    description: 'Stands du Hub : nom, emplacement, espace, statut, nombre de contacts.',
    input: schema({ recherche: search() }),
    request: () => ({ method: 'GET', path: '/occupants' }),
    view: (data, input) => matching(data, input.recherche),
  },
  {
    name: 'voir_stand', roles: MANAGERS,
    description: 'Fiche d’un stand. Sans standId : le stand du compte connecté.',
    input: schema({ standId: id('Stand') }),
    request: (input, user) => ({ method: 'GET', path: `/occupants/${segment(input.standId || user.occupantId)}` }),
  },
  {
    name: 'programme_du_jour', roles: [O, P, N],
    description: 'Programme public du jour et des jours suivants, avec le stand à l’affiche.',
    input: schema({}),
    request: () => ({ method: 'GET', path: '/program-events/public/today' }),
  },
  {
    name: 'programme', roles: TEAM,
    description: 'Programme complet du Hub (tous les jours), filtrable par jour.',
    input: schema({ jour: day('Seulement ce jour'), recherche: search() }),
    request: () => ({ method: 'GET', path: '/program-events' }),
    view: (data, input) => matching((data || []).filter((item) => !input.jour || dateOf(item.startsAt) === input.jour), input.recherche),
  },
  {
    name: 'lister_invitations_studio', roles: TEAM,
    description: 'Invitations au Studio : invité, format, créneau, statut.',
    input: schema({ recherche: search() }),
    request: () => ({ method: 'GET', path: '/studio-invitations' }),
    view: (data, input) => matching(data, input.recherche),
  },
  {
    name: 'creneaux_studio', roles: TEAM,
    description: 'Créneaux libres du Studio pour une invitation.',
    input: schema({ invitationId: id('Invitation au Studio') }, ['invitationId']),
    request: (input) => ({ method: 'GET', path: `/studio-invitations/${segment(input.invitationId)}/slots` }),
  },
  {
    name: 'formats_studio', roles: TEAM,
    description: 'Formats proposés pour une invitation au Studio (leur clé sert à inviter).',
    input: schema({}),
    request: () => ({ method: 'GET', path: '/studio-invitations/formats' }),
  },
  {
    name: 'chercher_contacts_guichets', roles: DESK,
    description: 'Registre des guichets : personnes reçues, classe, responsable, échéance, statut.',
    input: schema({
      recherche: search(),
      statut: choice(['new', 'in_progress', 'closed'], 'new = à traiter, in_progress = à relancer, closed = terminé'),
      guichet: choice(['project', 'regime', 'company'], 'project = Mon projet, regime = Quel régime, company = Mon entreprise'),
    }),
    request: (input) => ({ method: 'GET', path: '/investor-requests', query: defined({ search: input.recherche, status: input.statut, guichet: input.guichet, limit: 30 }) }),
    view: (data) => data?.items ?? data,
  },
  {
    name: 'voir_contact_guichet', roles: DESK,
    description: 'Fiche d’un contact des guichets : détails, diagnostic, engagement, rendez-vous, relances.',
    input: schema({ contactId: id('Contact des guichets') }, ['contactId']),
    request: (input) => ({ method: 'GET', path: `/investor-requests/${segment(input.contactId)}` }),
  },
  {
    name: 'lister_joueurs_defi', roles: MANAGERS,
    description: 'Joueurs du Défi de passage : étapes validées, récompense remise ou non.',
    input: schema({ recherche: search() }),
    request: () => ({ method: 'GET', path: '/challenge-passports' }),
    view: (data, input) => matching(data, input.recherche),
  },
  {
    name: 'retrouver_joueur', roles: [S, A, O, P, N],
    description: 'Retrouve un joueur du Défi qui a perdu son code, par nom, téléphone ou e-mail.',
    input: schema({ recherche: text('Au moins 2 caractères') }, ['recherche']),
    request: (input) => ({ method: 'GET', path: '/challenge-passports/search', query: { q: input.recherche } }),
  },
  {
    name: 'recompense_par_code', roles: [...DESK, N],
    description: 'État d’un joueur du Défi à partir de son code participant (6 caractères) : étapes, récompense.',
    input: schema({ code: text('Code participant') }, ['code']),
    request: (input) => ({ method: 'GET', path: `/challenge-passports/code/${segment(input.code, 'code')}` }),
  },
  {
    name: 'historique_roue', roles: DESK,
    description: 'Roue des opportunités : parties jouées (lot gagné, remis ou non) et codes de jeu délivrés.',
    input: schema({ recherche: search() }),
    request: () => ({ method: 'GET', path: '/wheel' }),
    view: (data, input) => ({ ...data, plays: matching(data?.plays, input.recherche), codes: matching(data?.codes, input.recherche) }),
  },
  {
    name: 'lot_par_code', roles: [...DESK, N],
    description: 'Lot gagné avec un code de jeu de la roue (4 caractères) et s’il a été remis.',
    input: schema({ code: text('Code de jeu') }, ['code']),
    request: (input) => ({ method: 'GET', path: `/wheel/prizes/${segment(input.code, 'code')}` }),
  },
  {
    name: 'statistiques_scan', roles: STANDS,
    description: 'Joueurs du Défi scannés par le stand.',
    input: schema({}),
    request: () => ({ method: 'GET', path: '/challenge-passages/stats' }),
  },
  {
    name: 'questions_du_public', roles: [S, A, N],
    description: 'Questions du public posées pendant les directs.',
    input: schema({ statut: choice(['new', 'asked', 'dismissed'], 'new = à poser') }),
    request: () => ({ method: 'GET', path: '/live-questions' }),
    view: (data, input) => (Array.isArray(data) ? data.filter((item) => !input.statut || item.status === input.statut) : data),
  },
  {
    name: 'lister_utilisateurs', roles: [S],
    description: 'Comptes de l’espace équipe : rôle, stand, statut, dernière connexion.',
    input: schema({ recherche: search() }),
    request: () => ({ method: 'GET', path: '/users' }),
    view: (data, input) => matching(data, input.recherche),
  },
  {
    name: 'parametres', roles: [S],
    description: 'Réglages de la plateforme (modules ouverts, Studio, B2B, guichets, roue, grand écran).',
    input: schema({}),
    request: () => ({ method: 'GET', path: '/settings' }),
  },
  {
    name: 'journal_des_actions', roles: [S],
    description: 'Dernières actions faites dans l’espace équipe : qui, quoi, quand.',
    input: schema({ recherche: search() }),
    request: () => ({ method: 'GET', path: '/audit-logs' }),
    view: (data, input) => matching(data?.items ?? data, input.recherche).slice(0, 40),
  },
];

// ——— Écriture (préparée, puis confirmée par la personne) ———

const WRITE = [
  {
    name: 'creer_contact', roles: STANDS,
    description: 'Enregistre un nouveau contact dans le carnet du stand. Classe A : à rappeler sous 48 h, B : sous 7 jours, C : informé des opportunités (par défaut).',
    input: schema({
      nom: text('Nom complet'), telephone: text('Téléphone, avec l’indicatif pour un numéro étranger'), email: text('E-mail'),
      entreprise: text('Entreprise'), besoin: text('Ce que la personne recherche'), classe: choice(['A', 'B', 'C'], 'Classe'),
    }, ['nom', 'telephone']),
    request: (input) => ({ method: 'POST', path: '/contacts', body: defined({ id: crypto.randomUUID(), fullName: input.nom, phone: input.telephone, email: input.email, company: input.entreprise, need: input.besoin, qualification: input.classe || 'C', consentOccupant: true }) }),
    summary: (input) => `Enregistrer le contact ${input.nom} (${input.telephone}${input.entreprise ? `, ${input.entreprise}` : ''}), classe ${input.classe || 'C'}`,
    done: (data, input) => `Contact ${input.nom} enregistré.`,
  },
  {
    name: 'classer_contact', roles: STANDS,
    description: 'Change la classe d’un contact du stand (remplace sa relance automatique).',
    input: schema({ contactId: id('Contact'), nom: label(), classe: choice(['A', 'B', 'C'], 'Nouvelle classe') }, ['contactId', 'nom', 'classe']),
    request: (input) => ({ method: 'PATCH', path: `/contacts/${segment(input.contactId)}`, body: { qualification: input.classe } }),
    summary: (input) => `Passer ${input.nom} en classe ${input.classe}`,
    done: (data, input) => `${input.nom} est en classe ${input.classe}.`,
  },
  {
    name: 'ajouter_relance', roles: MANAGERS,
    description: 'Ajoute une relance à un contact du stand, à une demande B2B, ou à un contact des guichets.',
    input: schema({
      type: choice(['contact', 'b2b', 'guichet'], 'À quoi se rattache la relance'),
      id: id('Contact, demande B2B ou contact des guichets'), nom: label(),
      echeance: when('Date et heure de la relance, à venir'), motif: text('Motif'),
    }, ['type', 'id', 'nom', 'echeance', 'motif']),
    request: (input) => ({ method: 'POST', path: followUpPath(input.type, input), body: { dueAt: input.echeance, reason: input.motif } }),
    summary: (input) => `Ajouter une relance pour ${input.nom}, le ${input.echeance} : ${input.motif}`,
    done: (data, input) => `Relance ajoutée pour ${input.nom}.`,
  },
  {
    name: 'marquer_relance_faite', roles: MANAGERS,
    description: 'Marque une relance faite, avec la prochaine étape : terminée, relancer (nouvelle date et motif) ou autre (texte).',
    input: schema({
      type: choice(['contact', 'b2b', 'guichet'], 'Onglet de la relance'),
      relanceId: id('Relance'), contactGuichetId: id('Contact des guichets, seulement pour une relance de type guichet'), nom: label(),
      issue: choice(['terminee', 'relancer', 'autre'], 'Prochaine étape'),
      note: text('Note (obligatoire si issue = autre)'),
      prochaineEcheance: when('Seulement si issue = relancer'), prochainMotif: text('Seulement si issue = relancer'),
    }, ['type', 'relanceId', 'nom', 'issue']),
    request: (input) => ({
      method: 'PATCH', path: donePath(input),
      body: defined({ outcome: OUTCOMES[input.issue], note: input.note, next: input.issue === 'relancer' ? { dueAt: input.prochaineEcheance, reason: input.prochainMotif } : undefined }),
    }),
    summary: (input) => `Marquer faite la relance de ${input.nom}${input.issue === 'relancer' ? `, et relancer le ${input.prochaineEcheance} : ${input.prochainMotif}` : input.issue === 'autre' ? ` : ${input.note}` : ''}`,
    done: (data, input) => `Relance de ${input.nom} marquée faite.`,
  },
  {
    name: 'publier_besoin_b2b', roles: MANAGERS,
    description: 'Publie un besoin B2B sur le site (au nom du stand du compte ; l’équipe API-ZF choisit le stand).',
    input: schema({ titre: text('Titre, 3 à 180 caractères'), description: text('Description, au moins 10 caractères'), standId: id('Stand, seulement pour l’équipe API-ZF') }, ['titre', 'description']),
    request: (input) => ({ method: 'POST', path: '/b2b-needs', body: defined({ title: input.titre, description: input.description, occupantId: input.standId }) }),
    summary: (input) => `Publier le besoin B2B « ${input.titre} »`,
    done: (data, input) => `Besoin « ${input.titre} » publié.`,
  },
  {
    name: 'modifier_besoin_b2b', roles: MANAGERS,
    description: 'Modifie un besoin B2B, ou le ferme (il quitte le site) ou le rouvre.',
    input: schema({ besoinId: id('Besoin B2B'), nom: label(), titre: text('Nouveau titre'), description: text('Nouvelle description'), statut: choice(['open', 'closed'], 'open = ouvert, closed = fermé') }, ['besoinId', 'nom']),
    request: (input) => ({ method: 'PATCH', path: `/b2b-needs/${segment(input.besoinId)}`, body: defined({ title: input.titre, description: input.description, status: input.statut }) }),
    summary: (input) => `Modifier le besoin « ${input.nom} »${input.statut ? (input.statut === 'closed' ? ' : le fermer' : ' : le rouvrir') : ''}`,
    done: (data, input) => `Besoin « ${input.nom} » mis à jour.`,
  },
  {
    name: 'repondre_demande_b2b', roles: MANAGERS,
    description: 'Accepte ou refuse une demande B2B. La personne est prévenue par e-mail.',
    input: schema({ demandeId: id('Demande B2B'), nom: label(), decision: choice(['accepter', 'refuser'], 'Décision') }, ['demandeId', 'nom', 'decision']),
    request: (input) => ({ method: 'PATCH', path: `/b2b-proposals/${segment(input.demandeId)}`, body: { status: STATUS_B2B[input.decision] } }),
    summary: (input) => `${input.decision === 'accepter' ? 'Accepter' : 'Refuser'} la demande B2B de ${input.nom} (elle recevra un e-mail)`,
    done: (data, input) => `Demande de ${input.nom} ${input.decision === 'accepter' ? 'acceptée' : 'refusée'}.`,
  },
  {
    name: 'fixer_rdv_b2b', roles: MANAGERS,
    description: 'Fixe le rendez-vous d’une demande B2B acceptée, sur un créneau libre (voir creneaux_b2b). Le visiteur le reçoit par e-mail.',
    input: schema({ demandeId: id('Demande B2B'), nom: label(), debut: when('Début du rendez-vous'), table: { type: 'integer', description: 'Numéro de table' } }, ['demandeId', 'nom', 'debut', 'table']),
    request: (input) => ({ method: 'POST', path: `/b2b-proposals/${segment(input.demandeId)}/meetings`, body: { startsAt: input.debut, tableNumber: input.table } }),
    summary: (input) => `Fixer le rendez-vous B2B de ${input.nom} le ${input.debut}, table ${input.table}`,
    done: (data, input) => `Rendez-vous de ${input.nom} fixé.`,
  },
  {
    name: 'deplacer_rdv_b2b', roles: MANAGERS,
    description: 'Déplace un rendez-vous B2B (impossible une fois le compte rendu fait).',
    input: schema({ demandeId: id('Demande B2B'), rdvId: id('Rendez-vous'), nom: label(), debut: when('Nouveau début'), table: { type: 'integer', description: 'Numéro de table' } }, ['demandeId', 'rdvId', 'nom', 'debut', 'table']),
    request: (input) => ({ method: 'PUT', path: `/b2b-proposals/${segment(input.demandeId)}/meetings/${segment(input.rdvId)}`, body: { startsAt: input.debut, tableNumber: input.table } }),
    summary: (input) => `Déplacer le rendez-vous B2B de ${input.nom} au ${input.debut}, table ${input.table}`,
    done: (data, input) => `Rendez-vous de ${input.nom} déplacé.`,
  },
  {
    name: 'compte_rendu_rdv_b2b', roles: MANAGERS,
    description: 'Compte rendu d’un rendez-vous B2B commencé : présent ou absent, prochaine étape, date de relance (crée une relance B2B), note.',
    input: schema({
      demandeId: id('Demande B2B'), rdvId: id('Rendez-vous'), nom: label(),
      presence: choice(['present', 'absent'], 'Le visiteur était'), prochaineEtape: text('Prochaine étape'),
      aRelancerLe: when('Date de relance'), note: text('Note'),
    }, ['demandeId', 'rdvId', 'nom', 'presence']),
    request: (input) => ({ method: 'PATCH', path: `/b2b-proposals/${segment(input.demandeId)}/meetings/${segment(input.rdvId)}`, body: defined({ outcome: input.presence, nextStep: input.prochaineEtape, nextStepAt: input.aRelancerLe, note: input.note }) }),
    summary: (input) => `Compte rendu du rendez-vous de ${input.nom} : ${input.presence === 'present' ? 'présent' : 'absent'}${input.prochaineEtape ? `, prochaine étape : ${input.prochaineEtape}` : ''}`,
    done: (data, input) => `Compte rendu enregistré pour ${input.nom}.`,
  },
  {
    name: 'modifier_fiche_stand', roles: MANAGERS,
    description: 'Modifie la fiche d’un stand (sans standId : celui du compte). Un gérant modifie activités, produits, services et site web ; l’équipe API-ZF aussi le nom, l’emplacement et le statut. Les images se changent à l’écran.',
    input: schema({
      standId: id('Stand'), nom: label(), activites: text('Activités, une par ligne'), produits: text('Produits, un par ligne'),
      services: text('Services, un par ligne'), siteWeb: text('Adresse du site, en http ou https'),
      nouveauNom: text('Équipe API-ZF seulement'), emplacement: text('Équipe API-ZF seulement'), statut: choice(['actif', 'inactif'], 'Équipe API-ZF seulement'),
    }, ['nom']),
    request: (input, user) => ({
      method: 'PATCH', path: `/occupants/${segment(input.standId || user.occupantId)}`,
      body: defined({ activity: input.activites, products: input.produits, services: input.services, website: input.siteWeb, name: input.nouveauNom, standLabel: input.emplacement, status: SPACES[input.statut] }),
    }),
    summary: (input) => `Modifier la fiche du stand ${input.nom} (${['activites', 'produits', 'services', 'siteWeb', 'nouveauNom', 'emplacement', 'statut'].filter((key) => input[key]).map((key) => ({ activites: 'activités', siteWeb: 'site web', nouveauNom: 'nom' }[key] || key)).join(', ')})`,
    done: (data, input) => `Fiche du stand ${input.nom} mise à jour.`,
  },
  {
    name: 'valider_passage', roles: STANDS,
    description: 'Valide le passage d’un joueur du Défi sur le stand, avec son code participant (6 caractères).',
    input: schema({ code: text('Code participant') }, ['code']),
    request: (input) => ({ method: 'POST', path: '/challenge-passages', body: { code: input.code } }),
    summary: (input) => `Valider le passage du joueur ${input.code} sur le stand`,
    done: (data) => `Passage validé${data?.passport?.fullName ? ` pour ${data.passport.fullName}` : ''}.`,
  },
  {
    name: 'remettre_recompense', roles: [...DESK, N],
    description: 'Enregistre la remise de la récompense du Défi à un joueur qui a terminé le parcours (code participant).',
    input: schema({ code: text('Code participant'), nom: label() }, ['code', 'nom']),
    request: (input) => ({ method: 'POST', path: '/challenge-passports/redeem-by-code', body: { code: input.code } }),
    summary: (input) => `Remettre la récompense du Défi à ${input.nom} (code ${input.code})`,
    done: (data, input) => `Récompense remise à ${input.nom}.`,
  },
  {
    name: 'creer_code_roue', roles: DESK,
    description: 'Crée un nouveau code de jeu pour la Roue des opportunités, à donner à un visiteur.',
    input: schema({}),
    request: () => ({ method: 'POST', path: '/wheel/codes' }),
    summary: () => 'Créer un nouveau code de jeu pour la Roue des opportunités',
    done: (data) => `Code de jeu créé : ${data?.code}${data?.spinsAllowed ? ` (${data.spinsAllowed} tour${data.spinsAllowed > 1 ? 's' : ''})` : ''}.`,
  },
  {
    name: 'remettre_lot', roles: [...DESK, N],
    description: 'Enregistre la remise du lot gagné avec un code de jeu de la roue (4 caractères).',
    input: schema({ code: text('Code de jeu') }, ['code']),
    request: (input) => ({ method: 'POST', path: `/wheel/prizes/${segment(input.code, 'code')}/claim` }),
    summary: (input) => `Remettre le lot gagné avec le code ${input.code}`,
    done: (data, input) => `Lot du code ${input.code} remis.`,
  },
  {
    name: 'ajouter_au_programme', roles: TEAM,
    description: 'Ajoute un élément au programme. Type spotlight = « À l’affiche » (un seul stand par jour, standId obligatoire).',
    input: schema({
      type: choice(['spotlight', 'highlight', 'animation', 'studio', 'talk'], 'spotlight = À l’affiche, highlight = Temps fort, talk = Prise de parole'),
      titre: text('Titre'), debut: when('Début'), fin: when('Fin'), lieu: text('Lieu (vide : emplacement du stand)'),
      description: text('Description ou accroche'), standId: id('Stand (vide : tout le Hub)'),
    }, ['type', 'titre', 'debut']),
    request: (input) => ({ method: 'POST', path: '/program-events', body: defined({ type: input.type, title: input.titre, startsAt: input.debut, endsAt: input.fin, location: input.lieu, description: input.description, occupantId: input.standId }) }),
    summary: (input) => `Ajouter au programme : « ${input.titre} », le ${input.debut}`,
    done: (data, input) => `« ${input.titre} » ajouté au programme.`,
  },
  {
    name: 'modifier_element_programme', roles: TEAM,
    description: 'Modifie un élément du programme.',
    input: schema({
      elementId: id('Élément du programme'), nom: label(), titre: text('Nouveau titre'), debut: when('Nouveau début'), fin: when('Nouvelle fin'),
      lieu: text('Lieu'), description: text('Description'), standId: id('Stand'),
      type: choice(['spotlight', 'highlight', 'animation', 'studio', 'talk'], 'Type'),
    }, ['elementId', 'nom']),
    request: (input) => ({ method: 'PATCH', path: `/program-events/${segment(input.elementId)}`, body: defined({ title: input.titre, startsAt: input.debut, endsAt: input.fin, location: input.lieu, description: input.description, occupantId: input.standId, type: input.type }) }),
    summary: (input) => `Modifier l’élément du programme « ${input.nom} »`,
    done: (data, input) => `« ${input.nom} » mis à jour.`,
  },
  {
    name: 'inviter_au_studio', roles: TEAM,
    description: 'Invite quelqu’un au Studio : il reçoit un lien pour choisir son créneau (formats : voir formats_studio).',
    input: schema({
      nom: text('Nom et prénom'), email: text('E-mail'), format: text('Clé du format'), telephone: text('Téléphone'),
      structure: text('Structure'), sujet: text('Sujet'), langue: choice(['fr', 'en'], 'Langue des e-mails'), standId: id('Stand (vide : invité de l’API-ZF)'),
    }, ['nom', 'email', 'format']),
    request: (input) => ({ method: 'POST', path: '/studio-invitations', body: defined({ guestName: input.nom, email: input.email, format: input.format, phone: input.telephone, organization: input.structure, subject: input.sujet, language: input.langue, occupantId: input.standId }) }),
    summary: (input) => `Inviter ${input.nom} (${input.email}) au Studio`,
    done: (data, input) => `Invitation envoyée à ${input.nom}.`,
  },
  {
    name: 'modifier_invitation_studio', roles: TEAM,
    description: 'Modifie une invitation au Studio (coordonnées, format, sujet, stand).',
    input: schema({
      invitationId: id('Invitation au Studio'), nom: label(), nouveauNom: text('Nom et prénom'), email: text('E-mail'), telephone: text('Téléphone'),
      structure: text('Structure'), format: text('Clé du format'), sujet: text('Sujet'), langue: choice(['fr', 'en'], 'Langue'), standId: id('Stand'),
    }, ['invitationId', 'nom']),
    request: (input) => ({ method: 'PATCH', path: `/studio-invitations/${segment(input.invitationId)}`, body: defined({ guestName: input.nouveauNom, email: input.email, phone: input.telephone, organization: input.structure, format: input.format, subject: input.sujet, language: input.langue, occupantId: input.standId }) }),
    summary: (input) => `Modifier l’invitation au Studio de ${input.nom}`,
    done: (data, input) => `Invitation de ${input.nom} mise à jour.`,
  },
  {
    name: 'fixer_creneau_studio', roles: TEAM,
    description: 'Fixe ou déplace le créneau d’un invité du Studio, sur un créneau libre (voir creneaux_studio). L’invité est prévenu.',
    input: schema({ invitationId: id('Invitation au Studio'), nom: label(), debut: when('Début du créneau') }, ['invitationId', 'nom', 'debut']),
    request: (input) => ({ method: 'POST', path: `/studio-invitations/${segment(input.invitationId)}/schedule`, body: { startsAt: input.debut } }),
    summary: (input) => `Fixer le passage au Studio de ${input.nom} le ${input.debut}`,
    done: (data, input) => `Passage de ${input.nom} fixé.`,
  },
  {
    name: 'renvoyer_invitation_studio', roles: TEAM,
    description: 'Renvoie l’e-mail d’invitation au Studio.',
    input: schema({ invitationId: id('Invitation au Studio'), nom: label() }, ['invitationId', 'nom']),
    request: (input) => ({ method: 'POST', path: `/studio-invitations/${segment(input.invitationId)}/resend` }),
    summary: (input) => `Renvoyer l’invitation au Studio à ${input.nom}`,
    done: (data, input) => `Invitation renvoyée à ${input.nom}.`,
  },
  {
    name: 'annuler_passage_studio', roles: TEAM,
    description: 'Annule le passage d’un invité au Studio : le créneau est libéré, l’invité prévenu.',
    input: schema({ invitationId: id('Invitation au Studio'), nom: label() }, ['invitationId', 'nom']),
    request: (input) => ({ method: 'POST', path: `/studio-invitations/${segment(input.invitationId)}/cancel` }),
    summary: (input) => `Annuler le passage au Studio de ${input.nom} (il sera prévenu)`,
    done: (data, input) => `Passage de ${input.nom} annulé.`,
  },
  {
    name: 'livrer_capsule', roles: TEAM,
    description: 'Envoie à l’invité le lien de sa capsule (après la réservation de son créneau).',
    input: schema({ invitationId: id('Invitation au Studio'), nom: label(), lien: text('Lien de la capsule, en https') }, ['invitationId', 'nom', 'lien']),
    request: (input) => ({ method: 'POST', path: `/studio-invitations/${segment(input.invitationId)}/deliver`, body: { capsuleUrl: input.lien } }),
    summary: (input) => `Envoyer à ${input.nom} sa capsule : ${input.lien}`,
    done: (data, input) => `Capsule envoyée à ${input.nom}.`,
  },
  {
    name: 'ajouter_contact_guichet', roles: DESK,
    description: 'Ajoute une personne au registre des guichets.',
    input: schema({
      nom: text('Nom et prénom'), email: text('E-mail'), besoin: text('Projet ou besoin, au moins 10 caractères'),
      guichet: choice(['project', 'regime', 'company'], 'project = Mon projet, regime = Quel régime, company = Mon entreprise'),
      telephone: text('Téléphone'), structure: text('Entreprise ou structure'),
    }, ['nom', 'email', 'besoin']),
    request: (input) => ({ method: 'POST', path: '/investor-requests', body: defined({ fullName: input.nom, email: input.email, projectSummary: input.besoin, guichet: input.guichet, phone: input.telephone, organization: input.structure }) }),
    summary: (input) => `Ajouter ${input.nom} (${input.email}) au registre des guichets`,
    done: (data, input) => `${input.nom} ajouté au registre des guichets.`,
  },
  {
    name: 'modifier_contact_guichet', roles: DESK,
    description: 'Modifie un contact des guichets : classe (A, B, C, support = Accompagnement), responsable, coordonnées, guichet.',
    input: schema({
      contactId: id('Contact des guichets'), nom: label(), classe: choice(['A', 'B', 'C', 'support'], 'support = Accompagnement'),
      responsableId: id('Compte responsable dans l’équipe'), nouveauNom: text('Nom et prénom'), email: text('E-mail'), telephone: text('Téléphone'),
      structure: text('Structure'), guichet: choice(['project', 'regime', 'company'], 'Guichet'),
    }, ['contactId', 'nom']),
    request: (input) => ({ method: 'PATCH', path: `/investor-requests/${segment(input.contactId)}`, body: defined({ classification: input.classe, contactUserId: input.responsableId, fullName: input.nouveauNom, email: input.email, phone: input.telephone, organization: input.structure, guichet: input.guichet }) }),
    summary: (input) => `Modifier le contact des guichets ${input.nom}${input.classe ? ` : classe ${input.classe === 'support' ? 'Accompagnement' : input.classe}` : ''}`,
    done: (data, input) => `Contact ${input.nom} mis à jour.`,
  },
  {
    name: 'enregistrer_diagnostic', roles: DESK,
    description: 'Enregistre le diagnostic d’un contact des guichets Projet ou Régime. Les informations de qualification déjà saisies sont gardées.',
    input: schema({
      contactId: id('Contact des guichets'), nom: label(), etapeSuivante: text('Étape suivante'), structure: text('Structure'),
      projet: text('Projet ou besoin'),
      service: choice(['orientation', 'regimes', 'facilitation', 'industrial_site', 'aftercare', 'partnerships'], 'Service vers lequel la personne est orientée'),
    }, ['contactId', 'nom', 'etapeSuivante']),
    // Le diagnostic remplace toute la fiche : la qualification déjà saisie est relue et renvoyée telle quelle.
    prepare: async (input, read) => ({ qualification: (await read(`/investor-requests/${segment(input.contactId)}`))?.qualification || {} }),
    request: (input, user, prepared = {}) => ({ method: 'PUT', path: `/investor-requests/${segment(input.contactId)}/diagnosis`, body: defined({ nextAction: input.etapeSuivante, organization: input.structure, projectSummary: input.projet, recommendedService: input.service, qualification: prepared.qualification || {} }) }),
    summary: (input) => `Enregistrer le diagnostic de ${input.nom} (étape suivante : ${input.etapeSuivante})`,
    done: (data, input) => `Diagnostic de ${input.nom} enregistré.`,
  },
  {
    name: 'fiche_difficulte', roles: DESK,
    description: '« Mon entreprise, mes difficultés » et l’engagement de suivi écrit (la date de réponse crée une relance).',
    input: schema({
      contactId: id('Contact des guichets'), nom: label(), entreprise: text('Entreprise'),
      regime: choice(['free_zone', 'investment_code', 'none'], 'free_zone = Zone Franche, investment_code = Code des investissements, none = aucun'),
      nature: text('Nature de la difficulté'), description: text('Description'),
      serviceEngagement: choice(['orientation', 'regimes', 'facilitation', 'industrial_site', 'aftercare', 'partnerships'], 'Service concerné'),
      reponseAuPlusTardLe: when('Réponse promise au plus tard'), engagement: text('Engagement pris (avec la date)'),
    }, ['contactId', 'nom', 'entreprise', 'regime', 'nature', 'description']),
    request: (input) => ({ method: 'PUT', path: `/investor-requests/${segment(input.contactId)}/difficulty`, body: defined({ difficulty: { company: input.entreprise, regime: input.regime, nature: input.nature, description: input.description }, commitmentService: input.serviceEngagement, commitmentDueAt: input.reponseAuPlusTardLe, commitmentNote: input.engagement }) }),
    summary: (input) => `Enregistrer la fiche des difficultés de ${input.nom}${input.reponseAuPlusTardLe ? `, réponse promise le ${input.reponseAuPlusTardLe}` : ''}`,
    done: (data, input) => `Fiche des difficultés de ${input.nom} enregistrée.`,
  },
  {
    name: 'reponse_donnee', roles: DESK,
    description: 'Marque la réponse de l’engagement de suivi comme donnée (verrouille l’engagement), ou rouvre l’engagement.',
    input: schema({ contactId: id('Contact des guichets'), nom: label(), donnee: { type: 'boolean', description: 'true : réponse donnée ; false : rouvrir' } }, ['contactId', 'nom', 'donnee']),
    request: (input) => ({ method: 'PATCH', path: `/investor-requests/${segment(input.contactId)}/resolution`, body: { resolved: Boolean(input.donnee) } }),
    summary: (input) => (input.donnee ? `Marquer la réponse donnée à ${input.nom} (l’engagement sera verrouillé)` : `Rouvrir l’engagement de ${input.nom}`),
    done: (data, input) => (input.donnee ? `Réponse à ${input.nom} marquée donnée.` : `Engagement de ${input.nom} rouvert.`),
  },
  {
    name: 'fixer_rdv_guichet', roles: DESK,
    description: 'Fixe un rendez-vous à un contact des guichets, au guichet ou dans un autre lieu. La personne reçoit un e-mail et des rappels.',
    input: schema({ contactId: id('Contact des guichets'), nom: label(), debut: when('Date et heure'), auGuichet: { type: 'boolean', description: 'true : au guichet de la personne' }, lieu: text('Lieu, si pas au guichet') }, ['contactId', 'nom', 'debut']),
    request: (input) => ({ method: 'POST', path: `/investor-requests/${segment(input.contactId)}/meetings`, body: defined({ startsAt: input.debut, atGuichet: Boolean(input.auGuichet), location: input.auGuichet ? undefined : input.lieu }) }),
    summary: (input) => `Fixer un rendez-vous à ${input.nom} le ${input.debut}${input.auGuichet ? ', au guichet' : input.lieu ? `, ${input.lieu}` : ''}`,
    done: (data, input) => `Rendez-vous de ${input.nom} fixé.`,
  },
  {
    name: 'modifier_rdv_guichet', roles: DESK,
    description: 'Déplace un rendez-vous des guichets.',
    input: schema({ contactId: id('Contact des guichets'), rdvId: id('Rendez-vous'), nom: label(), debut: when('Nouvelle date et heure'), auGuichet: { type: 'boolean', description: 'true : au guichet' }, lieu: text('Lieu, si pas au guichet') }, ['contactId', 'rdvId', 'nom', 'debut']),
    request: (input) => ({ method: 'PUT', path: `/investor-requests/${segment(input.contactId)}/meetings/${segment(input.rdvId)}`, body: defined({ startsAt: input.debut, atGuichet: Boolean(input.auGuichet), location: input.auGuichet ? undefined : input.lieu }) }),
    summary: (input) => `Déplacer le rendez-vous de ${input.nom} au ${input.debut}`,
    done: (data, input) => `Rendez-vous de ${input.nom} déplacé.`,
  },
  {
    name: 'statut_rdv_guichet', roles: DESK,
    description: 'Valide (tenu, une fois l’heure passée) ou annule un rendez-vous des guichets ; une annulation prévient la personne.',
    input: schema({ contactId: id('Contact des guichets'), rdvId: id('Rendez-vous'), nom: label(), statut: choice(['held', 'cancelled'], 'held = tenu, cancelled = annulé') }, ['contactId', 'rdvId', 'nom', 'statut']),
    request: (input) => ({ method: 'PATCH', path: `/investor-requests/${segment(input.contactId)}/meetings/${segment(input.rdvId)}`, body: { status: input.statut } }),
    summary: (input) => (input.statut === 'held' ? `Valider le rendez-vous de ${input.nom} (tenu)` : `Annuler le rendez-vous de ${input.nom} (la personne sera prévenue)`),
    done: (data, input) => (input.statut === 'held' ? `Rendez-vous de ${input.nom} validé.` : `Rendez-vous de ${input.nom} annulé.`),
  },
  {
    name: 'statut_question_public', roles: [S, A, N],
    description: 'Change le statut d’une question du public : posée, écartée, ou à poser de nouveau.',
    input: schema({ questionId: id('Question'), nom: text('Début de la question'), statut: choice(['new', 'asked', 'dismissed'], 'new = à poser, asked = posée, dismissed = écartée') }, ['questionId', 'nom', 'statut']),
    request: (input) => ({ method: 'PATCH', path: `/live-questions/${segment(input.questionId)}`, body: { status: input.statut } }),
    summary: (input) => `Marquer la question « ${input.nom} » comme ${{ new: 'à poser', asked: 'posée', dismissed: 'écartée' }[input.statut]}`,
    done: () => 'Question mise à jour.',
  },
  {
    name: 'creer_utilisateur', roles: [S],
    description: 'Crée un compte de l’espace équipe. Un gérant de stand a le rôle occupant et un stand rattaché. Le mot de passe temporaire est tiré par le serveur et montré à la seule personne qui confirme.',
    input: schema({
      prenom: text('Prénom'), nom: text('Nom'), email: text('E-mail'), role: choice(['super-admin', 'admin', 'occupant', 'animateur'], 'Rôle'),
      telephone: text('Téléphone'), standId: id('Stand rattaché, obligatoire pour un occupant'),
    }, ['prenom', 'nom', 'email', 'role']),
    request: (input) => ({ method: 'POST', path: '/users', body: defined({ firstName: input.prenom, lastName: input.nom, email: input.email, role: input.role, phone: input.telephone, occupantId: input.standId }) }),
    secret: (body) => { const password = temporaryPassword(); return { body: { ...body, password }, reveal: `Mot de passe temporaire : ${password}` }; },
    summary: (input) => `Créer le compte de ${input.prenom} ${input.nom} (${input.email}), rôle ${input.role}`,
    done: (data, input) => `Compte de ${input.prenom} ${input.nom} créé.`,
  },
  {
    name: 'modifier_utilisateur', roles: [S],
    description: 'Modifie un compte : nom, e-mail, téléphone, rôle, stand, actif ou inactif (désactiver un compte), ou nouveau mot de passe temporaire.',
    input: schema({
      utilisateurId: id('Compte'), nomAffiche: label(), prenom: text('Prénom'), nom: text('Nom'), email: text('E-mail'), telephone: text('Téléphone'),
      role: choice(['super-admin', 'admin', 'occupant', 'animateur'], 'Rôle'), standId: id('Stand rattaché'),
      actif: { type: 'boolean', description: 'false : désactiver le compte' }, nouveauMotDePasse: { type: 'boolean', description: 'true : tirer un nouveau mot de passe temporaire' },
    }, ['utilisateurId', 'nomAffiche']),
    request: (input) => ({ method: 'PATCH', path: `/users/${segment(input.utilisateurId)}`, body: defined({ firstName: input.prenom, lastName: input.nom, email: input.email, phone: input.telephone, role: input.role, occupantId: input.standId, isActive: input.actif }) }),
    secret: (body, input) => {
      if (!input.nouveauMotDePasse) return { body };
      const password = temporaryPassword();
      return { body: { ...body, password }, reveal: `Nouveau mot de passe temporaire : ${password}` };
    },
    summary: (input) => `Modifier le compte de ${input.nomAffiche}${input.actif === false ? ' : le désactiver' : ''}${input.nouveauMotDePasse ? ', avec un nouveau mot de passe' : ''}`,
    done: (data, input) => `Compte de ${input.nomAffiche} mis à jour.`,
  },
];

const ALL = [...READ.map((tool) => ({ ...tool, write: false })), ...WRITE.map((tool) => ({ ...tool, write: true }))];
const BY_NAME = new Map(ALL.map((tool) => [tool.name, tool]));

// Outils proposés à un rôle, toujours dans le même ordre (le début de la requête reste en cache).
const toolsFor = (role) => ALL.filter((tool) => tool.roles.includes(role));
const findTool = (name) => BY_NAME.get(name) || null;
// Définitions envoyées au modèle.
const definitions = (tools) => tools.map((tool) => ({
  name: tool.name,
  description: tool.write ? `${tool.description} Prépare l’action : la personne la confirme ensuite.` : tool.description,
  input_schema: tool.input,
}));

module.exports = { toolsFor, findTool, definitions, matching, segment, ALL };
