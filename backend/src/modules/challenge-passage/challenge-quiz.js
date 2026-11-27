const crypto = require('node:crypto');

// Questions du passage, fabriquées automatiquement à partir des fiches des stands (rien à saisir pour les occupants) :
// « Lequel de ces produits trouve-t-on sur ce stand ? », puis la même chose pour les services. La bonne réponse vient
// de la fiche du stand, les autres choix des fiches des autres stands. Chaque question finit par « Aucune de ces
// réponses » (valeur vide) : c'est la bonne réponse quand le stand n'a ni produit ni service sur sa fiche.
const KINDS = ['products', 'services'];
const NONE = '';
const MAX_LENGTH = 90;
const DISTRACTORS = 2;

// Une entrée par ligne sur la fiche, avec ou sans tiret ; les lignes trop longues ne font pas de bons choix.
const itemsOf = (text) => String(text || '')
  .split(/\r?\n/)
  .map((line) => line.replace(/^\s*[-•*]\s*/, '').replace(/[.;]\s*$/, '').trim())
  .filter((line) => line.length > 1);

const usable = (items) => {
  const short = items.filter((item) => item.length <= MAX_LENGTH);
  return short.length ? short : items.map((item) => `${item.slice(0, MAX_LENGTH - 1)}…`);
};

const normalize = (value) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

const pick = (list, count, randomIndex) => {
  const pool = [...list];
  const chosen = [];
  while (pool.length && chosen.length < count) chosen.push(pool.splice(randomIndex(pool.length), 1)[0]);
  return chosen;
};

// Deux questions pour un stand. `stands` : tous les stands (pour les mauvais choix).
const buildQuiz = (stand, stands, randomIndex = crypto.randomInt) => KINDS.map((kind) => {
  const own = usable(itemsOf(stand[kind]));
  const ownKeys = new Set(itemsOf(stand[kind]).map(normalize));
  const others = (sameKind) => [...new Map(stands
    .filter((other) => other.id !== stand.id)
    .flatMap((other) => usable(itemsOf(other[sameKind])))
    .filter((item) => !ownKeys.has(normalize(item)))
    .map((item) => [normalize(item), item])).values()];

  const correct = own.length ? own[randomIndex(own.length)] : NONE;
  const needed = correct === NONE ? DISTRACTORS + 1 : DISTRACTORS;
  // Pas assez de choix du même genre chez les autres stands : on complète avec l'autre genre.
  let pool = others(kind);
  if (pool.length < needed) pool = [...pool, ...others(kind === 'products' ? 'services' : 'products')];
  const wrong = pick(pool, needed, randomIndex);
  const choices = pick(correct === NONE ? wrong : [correct, ...wrong], Infinity, randomIndex);
  const options = [...choices, NONE];
  return { kind, options, answer: options.indexOf(correct) };
});

module.exports = { buildQuiz, itemsOf, NONE };
