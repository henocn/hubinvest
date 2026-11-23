const path = require('path');
const PDFDocument = require('pdfkit');
const { GUICHETS } = require('../../shared/guichets');
const { SERVICES } = require('../../shared/services');

// Fiche de diagnostic au format d'un formulaire administratif : rubriques numérotées, cases à cocher pour chaque choix
// (la réponse donnée est cochée, les autres restent visibles), lignes pour les réponses libres.

const ASSETS = path.resolve(__dirname, '..', '..', 'assets');
const LOGO = path.join(ASSETS, 'apizf-logo.png');
const BAND = path.join(ASSETS, 'pattern-bandeau.png');

const COLORS = { green: '#156c53', dark: '#005b3f', yellow: '#ffcf15', ink: '#0f1822', muted: '#5b6662', line: '#a9b3af', soft: '#eef4f1' };
const PAGE = { width: 595.28, height: 841.89, margin: 40 };
const WIDTH = PAGE.width - PAGE.margin * 2;
const BOTTOM = PAGE.height - 56;

const GUICHET_NUMBERS = { project: 1, regime: 2, company: 3 };
const CLASSES = [['A', 'A · Projet prioritaire'], ['B', 'B · Potentiel à suivre'], ['C', 'C · Contact à nourrir'], ['support', 'Accompagnement (entreprise installée en difficulté)']];

// Les polices standard du PDF ne couvrent que le jeu Windows-1252 : tout autre caractère est remplacé.
const WIN_ANSI_EXTRA = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
const clean = (value) => String(value ?? '')
  .replace(/[   ]/g, ' ')
  .replace(/[\r\t]/g, ' ')
  .replace(/[^\n -~¡-ÿ]/g, (char) => (WIN_ANSI_EXTRA.includes(char) ? char : '?'));

const lomeDate = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: '2-digit', month: '2-digit', year: 'numeric' });
const lomeTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const formatDate = (value) => (value ? lomeDate.format(new Date(value)) : '');
const formatDateTime = (value) => (value ? `${formatDate(value)} à ${lomeTime.format(new Date(value)).replace(':', ' h ')}` : '');
const fullName = (user) => (user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : '');

const reference = (request) => {
  const year = new Date(request.diagnosedAt || request.createdAt || Date.now()).getUTCFullYear().toString().slice(-2);
  return `DG-${year}-${String(request.id).replace(/-/g, '').slice(0, 6).toUpperCase()}`;
};

const createWriter = (doc) => {
  let y = PAGE.margin;

  const font = (name, size, color = COLORS.ink) => doc.font(name).fontSize(size).fillColor(color);
  const textHeight = (value, width, name, size) => {
    font(name, size);
    return doc.heightOfString(clean(value) || ' ', { width, lineGap: 1.5 });
  };
  const write = (value, x, top, width, options = {}) => {
    doc.text(clean(value), x, top, { width, lineGap: 1.5, ...options });
  };
  // Texte sur une seule ligne, sans retour automatique.
  const label = (value, x, top, options = {}) => doc.text(clean(value), x, top, { lineBreak: false, ...options });

  // Passe à la page suivante si le bloc à venir ne tient pas.
  const ensure = (height) => {
    if (y + height <= BOTTOM) return;
    doc.addPage();
    y = PAGE.margin;
  };

  const checkbox = (x, top, checked) => {
    doc.save().lineWidth(0.8).strokeColor(COLORS.ink).rect(x, top, 8.5, 8.5).stroke();
    if (checked) {
      doc.lineWidth(1.4).moveTo(x + 1.8, top + 1.8).lineTo(x + 6.7, top + 6.7).moveTo(x + 6.7, top + 1.8).lineTo(x + 1.8, top + 6.7).stroke();
    }
    doc.restore();
  };

  // Place les cases à cocher les unes après les autres, à la ligne quand la largeur est atteinte. La réponse cochée
  // est écrite en gras : elle est mesurée en gras.
  const layoutChoices = (choices, width, size = 8.5) => {
    const gap = 13;
    const lineHeight = 13.5;
    let cx = 0;
    let row = 0;
    const placed = choices.map((choice) => {
      font(choice.checked ? 'Helvetica-Bold' : 'Helvetica', size);
      const itemWidth = 13 + doc.widthOfString(clean(choice.label));
      if (cx > 0 && cx + itemWidth > width) { cx = 0; row += 1; }
      const item = { ...choice, dx: cx, dy: row * lineHeight };
      cx += itemWidth + gap;
      return item;
    });
    return { placed, height: (row + 1) * lineHeight };
  };
  const drawChoices = (layout, x, top, size = 8.5) => {
    layout.placed.forEach((item) => {
      checkbox(x + item.dx, top + item.dy + 0.5, item.checked);
      font(item.checked ? 'Helvetica-Bold' : 'Helvetica', size);
      label(item.label, x + item.dx + 13, top + item.dy + 0.8);
    });
  };

  const section = (number, title) => {
    ensure(56);
    y += 5;
    doc.save().rect(PAGE.margin, y, WIDTH, 16).fill(COLORS.dark).rect(PAGE.margin, y, 4, 16).fill(COLORS.yellow).restore();
    font('Helvetica-Bold', 9, '#ffffff');
    label(`${number}. ${title.toUpperCase()}`, PAGE.margin + 11, y + 4.2, { characterSpacing: 0.4 });
    y += 22;
  };

  // Une réponse libre écrite sur une ligne pointillée, précédée de son libellé.
  const lineField = (name, value, x, width, labelWidth) => {
    const valueWidth = width - labelWidth;
    const height = Math.max(13, textHeight(value, valueWidth - 4, 'Helvetica-Bold', 9.5) + 2);
    font('Helvetica', 8.5, COLORS.muted);
    label(`${name} :`, x, y + 1.5);
    font('Helvetica-Bold', 9.5);
    write(value, x + labelWidth, y, valueWidth - 4);
    doc.save().lineWidth(0.6).strokeColor(COLORS.line).dash(1.2, { space: 1.8 })
      .moveTo(x + labelWidth, y + height).lineTo(x + width, y + height).stroke().undash().restore();
    return height + 6;
  };
  const lineRow = (name, value) => { ensure(22); y += lineField(name, value, PAGE.margin, WIDTH, 118); };
  const lineRowPair = ([nameA, valueA], [nameB, valueB]) => {
    ensure(22);
    const half = (WIDTH - 16) / 2;
    const a = lineField(nameA, valueA, PAGE.margin, half, 118);
    const b = lineField(nameB, valueB, PAGE.margin + half + 16, half, 92);
    y += Math.max(a, b);
  };

  const choiceRow = (name, choices) => {
    const labelWidth = 118;
    const layout = layoutChoices(choices, WIDTH - labelWidth);
    ensure(layout.height + 4);
    font('Helvetica', 8.5, COLORS.muted);
    label(`${name} :`, PAGE.margin, y + 1);
    drawChoices(layout, PAGE.margin + labelWidth, y);
    y += layout.height + 4;
  };

  // Zone de texte encadrée (projet, étape suivante).
  const box = (value, { minHeight = 32, placeholder = '' } = {}) => {
    const text = clean(value).trim();
    const height = Math.max(minHeight, textHeight(text || placeholder, WIDTH - 16, 'Helvetica', 9.5) + 12);
    ensure(height + 5);
    doc.save().lineWidth(0.8).strokeColor(COLORS.line).rect(PAGE.margin, y, WIDTH, height).stroke().restore();
    font('Helvetica', 9.5, text ? COLORS.ink : COLORS.muted);
    write(text || placeholder, PAGE.margin + 8, y + 6, WIDTH - 16);
    y += height + 5;
  };

  return {
    doc, font, write, label, ensure, checkbox, layoutChoices, drawChoices, section, lineRow, lineRowPair, choiceRow, box, textHeight,
    get y() { return y; },
    set y(value) { y = value; },
  };
};

const header = (w, request) => {
  const { doc } = w;
  const top = PAGE.margin - 8;
  doc.image(LOGO, PAGE.margin, top, { height: 40 });
  w.font('Helvetica', 7.5, COLORS.muted);
  w.label('Agence de Promotion des Investissements et de la Zone Franche', PAGE.margin, top + 44);

  const right = PAGE.margin + WIDTH - 210;
  w.font('Helvetica-Bold', 10);
  doc.text('RÉPUBLIQUE TOGOLAISE', right, top + 4, { width: 210, align: 'center', characterSpacing: 0.6 });
  w.font('Helvetica-Oblique', 8.5, COLORS.muted);
  doc.text('Travail – Liberté – Patrie', right, top + 18, { width: 210, align: 'center' });
  doc.save().lineWidth(0.8).strokeColor(COLORS.ink).moveTo(right + 80, top + 33).lineTo(right + 130, top + 33).stroke().restore();

  let y = top + 58;
  doc.save().rect(PAGE.margin, y, WIDTH, 3).fill(COLORS.yellow).restore();
  y += 10;

  const refWidth = 160;
  w.font('Helvetica-Bold', 17);
  w.label('FICHE DE DIAGNOSTIC', PAGE.margin, y + 3, { characterSpacing: 0.5 });
  w.font('Helvetica', 9, COLORS.muted);
  w.label('Guichets du Stand API-ZF · Foire internationale de Lomé 2026', PAGE.margin, y + 24);

  const refX = PAGE.margin + WIDTH - refWidth;
  doc.save().lineWidth(1).strokeColor(COLORS.ink).rect(refX, y, refWidth, 38).stroke().restore();
  w.font('Helvetica', 7.2, COLORS.muted);
  w.label('N° DE FICHE', refX + 8, y + 5, { characterSpacing: 0.4 });
  w.font('Helvetica-Bold', 11);
  w.label(reference(request), refX + 8, y + 14);
  w.font('Helvetica', 7.5, COLORS.muted);
  w.label(`Diagnostic du ${formatDateTime(request.diagnosedAt)}`, refX + 8, y + 27);

  w.y = y + 42;
};

const answerChoices = (field, value) => {
  if (field.type === 'yesno') {
    return [{ label: 'Oui', checked: value === true }, { label: 'Non', checked: value === false }];
  }
  const options = (field.options || []).map((option) => ({ label: option, checked: value === option }));
  if (value !== undefined && value !== null && value !== '' && !options.some((option) => option.checked)) {
    options.push({ label: `Autre : ${value}`, checked: true });
  }
  return options;
};

// Les informations de qualification, en tableau : numéro, libellé, réponse (cases à cocher ou ligne).
const qualificationTable = (w, fields, answers) => {
  const { doc } = w;
  const numberWidth = 22;
  const labelWidth = 168;
  const answerWidth = WIDTH - numberWidth - labelWidth;
  const pad = 4.5;

  if (!fields.length) {
    w.box('', { placeholder: 'Aucune information de qualification n’est réglée.' });
    return;
  }

  fields.forEach((field, index) => {
    const value = answers?.[field.key];
    const choiceBased = field.type === 'select' || field.type === 'yesno';
    const layout = choiceBased ? w.layoutChoices(answerChoices(field, value), answerWidth - pad * 2) : null;
    const labelHeight = w.textHeight(field.label, labelWidth - pad * 2, 'Helvetica-Bold', 8.5);
    const answerHeight = choiceBased ? layout.height - 3 : Math.max(11, w.textHeight(value, answerWidth - pad * 2, 'Helvetica-Bold', 9.5));
    const height = Math.max(labelHeight, answerHeight) + pad * 2;
    w.ensure(height);
    const top = w.y;
    const x = PAGE.margin;

    doc.save().rect(x, top, numberWidth, height).fill(COLORS.soft).restore();
    doc.save().lineWidth(0.6).strokeColor(COLORS.line)
      .rect(x, top, WIDTH, height).stroke()
      .moveTo(x + numberWidth, top).lineTo(x + numberWidth, top + height).stroke()
      .moveTo(x + numberWidth + labelWidth, top).lineTo(x + numberWidth + labelWidth, top + height).stroke()
      .restore();

    w.font('Helvetica-Bold', 9, COLORS.green);
    doc.text(String(index + 1), x, top + pad + 0.5, { width: numberWidth, align: 'center', lineBreak: false });
    w.font('Helvetica-Bold', 8.5);
    w.write(field.label, x + numberWidth + pad + 2, top + pad + 0.5, labelWidth - pad * 2 - 2);

    const answerX = x + numberWidth + labelWidth + pad + 2;
    if (choiceBased) {
      w.drawChoices(layout, answerX, top + pad);
    } else {
      w.font('Helvetica-Bold', 9.5);
      w.write(value ?? '', answerX, top + pad, answerWidth - pad * 2 - 2);
    }
    w.y = top + height;
  });
  w.y += 4;
};

// Pied de chaque page : mention de confidentialité, numéro de page, bandeau de motifs.
const footers = (doc, request) => {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    const margins = doc.page.margins;
    doc.page.margins = { ...margins, bottom: 0 };
    const top = PAGE.height - 44;
    doc.save().lineWidth(0.6).strokeColor(COLORS.line).moveTo(PAGE.margin, top).lineTo(PAGE.margin + WIDTH, top).stroke().restore();
    doc.font('Helvetica').fontSize(7.2).fillColor(COLORS.muted);
    doc.text(clean(`API-ZF · HubInvest · FIL 2026 · Fiche ${reference(request)} · Document confidentiel, à usage interne`), PAGE.margin, top + 6, { lineBreak: false });
    doc.text(`Page ${index - range.start + 1} / ${range.count}`, PAGE.margin + WIDTH - 70, top + 6, { width: 70, align: 'right', lineBreak: false });
    doc.image(BAND, 0, PAGE.height - 16, { width: PAGE.width, height: 16 });
    doc.page.margins = margins;
  }
};

// Produit la fiche en PDF (Buffer) à partir de la fiche complète du contact.
const renderDiagnosisPdf = ({ request, fields }) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: PAGE.margin, bottom: PAGE.margin, left: PAGE.margin, right: PAGE.margin },
    bufferPages: true,
    info: { Title: `Fiche de diagnostic ${reference(request)}`, Author: 'API-ZF', Subject: 'Guichets du Stand API-ZF · FIL 2026' },
  });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  try {
    const w = createWriter(doc);
    header(w, request);

    w.section(1, 'Contact');
    w.lineRow('Nom et prénom', request.fullName);
    w.lineRow('Reçu le', formatDateTime(request.createdAt));
    w.lineRow('Structure', request.organization);
    w.lineRowPair(['Téléphone', request.phone], ['E-mail', request.email]);

    w.section(2, 'Projet ou besoin exprimé');
    w.box(request.projectSummary, { placeholder: 'Non renseigné.' });

    // Le cœur de la fiche : les informations recueillies pendant les 15 minutes.
    w.section(3, `Diagnostic (${fields.length} information${fields.length > 1 ? 's' : ''})`);
    qualificationTable(w, fields, request.qualification || {});

    // Guichet, classe et service : où la personne a été reçue et la suite que l'API-ZF lui donne.
    w.section(4, 'Orientation');
    w.choiceRow('Guichet', Object.entries(GUICHETS).map(([key, labels]) => ({ label: `${GUICHET_NUMBERS[key]} · ${labels.fr}`, checked: request.guichet === key })));
    w.choiceRow('Classe', CLASSES.map(([key, name]) => ({ label: name, checked: request.classification === key })));
    w.choiceRow('Service', SERVICES.map((service) => ({ label: service.title, checked: request.recommendedService === service.key })));
    w.lineRow('Responsable', fullName(request.contactUser));

    footers(doc, request);
    doc.end();
  } catch (error) {
    reject(error);
  }
});

module.exports = { renderDiagnosisPdf, reference };
