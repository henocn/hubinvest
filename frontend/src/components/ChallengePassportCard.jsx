import { Check, Gift, MapPin, RefreshCw } from 'lucide-react';

const statusCopy = {
  active: 'Présentez ce code dans chaque stand visité.',
  completed: 'Parcours terminé. Présentez ce code à l’accueil.',
  redeemed: 'Votre récompense a été remise.',
};

export default function ChallengePassportCard({ passport, refreshing, onRefresh }) {
  const completed = passport.status === 'completed' || passport.status === 'redeemed';
  const progress = Math.min(100, (passport.passageCount / passport.requiredPassages) * 100);

  return (
    <section className={`challenge-passport-card is-${passport.status}`}>
      <header><span>Parcours de {passport.displayName}</span><strong>{passport.passageCount} / {passport.requiredPassages}</strong></header>
      <div className="challenge-progress" aria-label={`${passport.passageCount} passages sur ${passport.requiredPassages}`}><i style={{ width: `${progress}%` }} /></div>
      <div className="challenge-code"><span>Code participant</span><strong>{passport.code}</strong></div>
      <p className="challenge-next-step">{completed ? <Gift size={19} /> : <MapPin size={19} />}{statusCopy[passport.status]}</p>
      <button className="button challenge-refresh-button" type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? 'Actualisation...' : 'Actualiser'}<RefreshCw size={17} /></button>
      {passport.passages?.length > 0 && <div className="challenge-passages"><h2>Passages validés</h2><ul>{passport.passages.map((passage) => <li key={`${passage.occupant.id}-${passage.validatedAt}`}><Check size={16} /><span>{passage.occupant.name}</span></li>)}</ul></div>}
    </section>
  );
}
