import { Gift, Trophy } from 'lucide-react';
import { challengeStatusLabels } from '../../constants/access';
import EmptyState from '../EmptyState';

const contactHref = (contact) => {
  if (contact.includes('@')) return `mailto:${contact}`;
  if (/^[+\d\s().-]+$/.test(contact)) return `tel:${contact.replace(/[^\d+]/g, '')}`;
  return null;
};

export default function ChallengePassportsTable({ passports, query, onRedeem }) {
  if (!passports.length) {
    return <EmptyState icon={Trophy} title="Aucun participant" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Les parcours commencés apparaîtront ici.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Participant</th><th>Contact</th><th>Code</th><th>Progression</th><th>Occupants validés</th><th>État</th><th className="actions-heading">Action</th></tr></thead>
        <tbody>{passports.map((passport) => {
          const occupants = (passport.passages || []).map((passage) => passage.occupant?.name).filter(Boolean).join(', ');
          return <tr key={passport.id} className={`challenge-row is-${passport.status}`}>
            <td><strong>{passport.displayName}</strong></td>
            <td>{passport.contact && contactHref(passport.contact) ? <a className="challenge-table-contact" href={contactHref(passport.contact)}>{passport.contact}</a> : <span className={passport.contact ? '' : 'challenge-table-empty'}>{passport.contact || '—'}</span>}</td>
            <td><code className="challenge-table-code">{passport.code}</code></td>
            <td>{passport.passageCount} / {passport.requiredPassages}</td>
            <td><span className="challenge-table-occupants" title={occupants}>{occupants || '—'}</span></td>
            <td className="challenge-table-status">{challengeStatusLabels[passport.status]}</td>
            <td><div className="row-actions">{passport.status === 'completed' && <button className="table-action" type="button" onClick={() => onRedeem(passport)}><Gift size={15} /> Remettre</button>}</div></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}
