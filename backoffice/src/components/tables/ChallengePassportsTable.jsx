import { Gift, Trophy } from 'lucide-react';
import { challengeStatusLabels } from '../../constants/access';
import EmptyState from '../EmptyState';

export default function ChallengePassportsTable({ passports, query, onRedeem }) {
  if (!passports.length) {
    return <EmptyState icon={Trophy} title="Aucun participant" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Les parcours commencés apparaîtront ici.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Participant</th><th>Code</th><th>Progression</th><th>État</th><th className="actions-heading">Action</th></tr></thead>
        <tbody>{passports.map((passport) => (
          <tr key={passport.id} className={`challenge-row is-${passport.status}`}>
            <td><strong>{passport.displayName}</strong></td>
            <td><code className="challenge-table-code">{passport.code}</code></td>
            <td>{passport.passageCount} / {passport.requiredPassages}</td>
            <td className="challenge-table-status">{challengeStatusLabels[passport.status]}</td>
            <td><div className="row-actions">{passport.status === 'completed' && <button className="table-action" type="button" onClick={() => onRedeem(passport)}><Gift size={15} /> Remettre</button>}</div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
