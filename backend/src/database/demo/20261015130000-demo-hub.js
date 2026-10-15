'use strict';

const crypto = require('node:crypto');

const DAY_MS = 24 * 60 * 60 * 1000;

// Construit un identifiant de démonstration stable pour pouvoir retirer les données sans toucher au reste.
const demoId = (group, index) => `de30${group}000-0000-4000-8000-${String(index).padStart(12, '0')}`;

const demoOccupants = [
  {
    name: 'Togo Agro Export',
    slug: 'togo-agro-export',
    standLabel: 'Pavillon 1 · Stand A04',
    activity: 'Transformation et export de produits agricoles togolais : soja, cajou, karité et ananas séché, du producteur jusqu’au port de Lomé.',
  },
  {
    name: 'Lomé Logistics Hub',
    slug: 'lome-logistics-hub',
    standLabel: 'Pavillon 1 · Stand A11',
    activity: 'Entreposage sous douane, transit et distribution régionale depuis la zone franche vers les pays de l’hinterland.',
  },
  {
    name: 'Kara Textile Industries',
    slug: 'kara-textile-industries',
    standLabel: 'Pavillon 2 · Stand B03',
    activity: 'Confection textile pour l’export, de l’égrenage du coton à la pièce finie. Recherche de partenaires de sous-traitance.',
  },
  {
    name: 'Solaris Énergie Togo',
    slug: 'solaris-energie-togo',
    standLabel: 'Pavillon 2 · Stand B09',
    activity: 'Installation de centrales solaires pour les sites industriels et accompagnement des entreprises vers l’autonomie énergétique.',
  },
];

const dailyPrograms = [
  [
    ['talk', 9, 30, 10, 15, 'Les avantages de la zone franche pour les nouveaux investisseurs', 'Régimes fiscaux, formalités et accompagnement de l’API-ZF.', 'Espace conférences'],
    ['studio', 11, 0, 11, 45, 'Face-à-face au Studio : produire au Togo pour exporter', 'Entretien filmé avec un occupant du Hub.', 'Studio du Hub'],
    ['animation', 14, 0, 15, 0, 'Démonstration sur le stand', 'Présentation des produits et échanges avec l’équipe.', null],
    ['animation', 16, 30, 17, 30, 'Défis du Hub : la chasse aux tampons', 'Faites valider votre passeport auprès des stands participants.', 'Tout le Hub'],
  ],
  [
    ['highlight', 10, 0, 11, 30, 'Rencontres B2B : sous-traitance industrielle', 'Rendez-vous courts entre donneurs d’ordre et fournisseurs.', 'Salle des rencontres'],
    ['studio', 12, 0, 12, 30, 'Interview : le parcours d’un exportateur togolais', 'Retour d’expérience et conseils pratiques.', 'Studio du Hub'],
    ['talk', 15, 0, 16, 0, 'Atelier : formalités douanières simplifiées', 'Les étapes clés pour importer et exporter depuis la zone franche.', 'Espace conférences'],
    ['animation', 17, 0, 17, 30, 'Tirage au sort des Défis du Hub', 'Annonce des gagnants du jour.', 'Accueil du Hub'],
  ],
];

// Calcule une date du Hub à partir d'un décalage en jours et d'une heure locale (Lomé = UTC+0).
const at = (dayOffset, hours, minutes) => {
  const date = new Date(Date.now() + dayOffset * DAY_MS);
  date.setUTCHours(hours, minutes, 0, 0);
  return date;
};

// Retire toutes les données de démonstration identifiées par leurs identifiants stables.
const removeDemo = async (queryInterface) => {
  const ids = (group, count) => Array.from({ length: count }, (_, index) => demoId(group, index + 1));
  await queryInterface.bulkDelete('studio_invitations', { id: ids(4, 20) });
  await queryInterface.bulkDelete('b2b_needs', { id: ids(3, 20) });
  await queryInterface.bulkDelete('program_events', { id: ids(2, 200) });
  await queryInterface.bulkDelete('occupants', { id: ids(1, 20) });
};

module.exports = {
  // Ajoute des stands, un programme sur une semaine, des besoins B2B et des invitations Studio fictifs.
  async up(queryInterface) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Les données de démonstration ne doivent pas être chargées en production.');
    }

    await removeDemo(queryInterface);
    const now = new Date();

    await queryInterface.bulkInsert('occupants', demoOccupants.map((occupant, index) => ({
      id: demoId(1, index + 1),
      name: occupant.name,
      slug: occupant.slug,
      stand_label: occupant.standLabel,
      cover_image_url: null,
      logo_url: null,
      activity: occupant.activity,
      status: 'active',
      created_at: now,
      updated_at: now,
    })));

    const [occupants] = await queryInterface.sequelize.query(
      "SELECT id, stand_label FROM occupants WHERE status = 'active' ORDER BY created_at ASC",
    );

    const events = [];
    let eventIndex = 0;
    for (let dayOffset = -1; dayOffset <= 5; dayOffset += 1) {
      const dayNumber = dayOffset + 1;
      const spotlight = occupants[dayNumber % occupants.length];
      events.push({
        id: demoId(2, (eventIndex += 1)),
        occupant_id: spotlight.id,
        type: 'spotlight',
        title: 'À l’affiche aujourd’hui',
        description: null,
        location: spotlight.stand_label,
        starts_at: at(dayOffset, 0, 0),
        ends_at: null,
        created_at: now,
        updated_at: now,
      });

      dailyPrograms[dayNumber % dailyPrograms.length].forEach(([type, startH, startM, endH, endM, title, description, location], index) => {
        const occupant = type === 'animation' && index === 2 ? spotlight : occupants[(dayNumber + index) % occupants.length];
        events.push({
          id: demoId(2, (eventIndex += 1)),
          occupant_id: location === 'Tout le Hub' || location === 'Accueil du Hub' ? null : occupant.id,
          type,
          title,
          description,
          location: location || occupant.stand_label,
          starts_at: at(dayOffset, startH, startM),
          ends_at: at(dayOffset, endH, endM),
          created_at: now,
          updated_at: now,
        });
      });
    }

    events.push({
      id: demoId(2, (eventIndex += 1)),
      occupant_id: null,
      type: 'highlight',
      title: 'Journée Investisseurs API-ZF',
      description: 'Présentation des projets du Hub aux investisseurs, suivie de rendez-vous individuels.',
      location: 'Espace conférences',
      starts_at: at(2, 8, 30),
      ends_at: at(2, 9, 15),
      created_at: now,
      updated_at: now,
    });
    await queryInterface.bulkInsert('program_events', events);

    await queryInterface.bulkInsert('b2b_needs', [
      ['Fournisseur d’emballages alimentaires certifiés', 'Nous recherchons un fournisseur local de sachets et cartons alimentaires pour 20 000 unités par mois.'],
      ['Transporteur frigorifique vers Ouagadougou', 'Besoin d’un partenaire pour deux départs hebdomadaires en camion frigorifique.'],
      ['Atelier de broderie en sous-traitance', 'Recherche d’un atelier capable de broder des logos sur 5 000 polos par trimestre.'],
    ].map(([title, description], index) => ({
      id: demoId(3, index + 1),
      occupant_id: demoId(1, index + 1),
      created_by_user_id: null,
      title,
      description,
      status: 'open',
      created_at: now,
      updated_at: now,
    })));

    await queryInterface.bulkInsert('studio_invitations', [
      ['Directrice d’un fonds d’investissement régional', 'Investir dans l’agro-industrie togolaise', 0, 11, 0, 'confirmed'],
      ['Chef d’entreprise logistique', 'Le corridor Lomé–Sahel', 1, 12, 0, 'pending'],
      ['Responsable export textile', 'Produire au Togo pour le marché européen', 3, 11, 0, 'declined'],
    ].map(([guestName, subject, dayOffset, hours, minutes, status], index) => ({
      id: demoId(4, index + 1),
      created_by_user_id: null,
      occupant_id: demoId(1, index + 1),
      token: crypto.randomBytes(32).toString('hex'),
      guest_name: guestName,
      subject,
      scheduled_at: at(dayOffset, hours, minutes),
      status,
      responded_at: status === 'pending' ? null : now,
      created_at: now,
      updated_at: now,
    })));
  },

  // Retire uniquement les données de démonstration.
  async down(queryInterface) {
    await removeDemo(queryInterface);
  },
};
