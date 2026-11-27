// Parcours « Trouvez les 5 étapes » (document v4, M6) : les cinq étapes de l'investisseur. Les quatre premières se
// valident sur quatre stands différents de l'Espace Industrie (QR posé devant le stand et deux questions, ou scan par
// l'occupant en secours) ; la cinquième est la récompense récupérée au comptoir du Stand API-ZF (QR du comptoir).
const CHALLENGE_STEPS = 5;
const INDUSTRY_STEPS = CHALLENGE_STEPS - 1;
const OCCUPANT_SPACES = ['industry', 'apizf'];

module.exports = { CHALLENGE_STEPS, INDUSTRY_STEPS, OCCUPANT_SPACES };
