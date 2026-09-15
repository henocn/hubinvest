import { CheckCircle2, Gift, Trophy, XCircle } from 'lucide-react';
import EmptyState from '../EmptyState';

const contactHref = (contact) => {
  if (contact.includes('@')) return `mailto:${contact}`;
  if (/^[+\d\s().-]+$/.test(contact)) return `tel:${contact.replace(/[^\d+]/g, '')}`;
  return null;
};

export default function ChallengePassportsTable({ passports, query, onRedeem, allowReward = true }) {
  if (!passports.length) {
    return <EmptyState icon={Trophy} title="Aucun participant" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Les parcours commencés apparaîtront ici.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Participant</th><th>Contact</th><th>Code</th><th>Scans</th><th>Par</th><th>Stand</th><th className="reward-heading">Récompense</th>{allowReward && <th className="actions-heading">Action</th>}</tr></thead>
        <tbody>{passports.map((passport) => {
          const validators = (passport.passages || []).map((passage) => [passage.validatedBy?.firstName, passage.validatedBy?.lastName].filter(Boolean).join(' ')).filter(Boolean).join(', ');
          const stands = (passport.passages || []).map((passage) => passage.occupant?.name).filter(Boolean).join(', ');
          const rewardReceived = passport.status === 'redeemed';
          const canRedeem = passport.status === 'completed';
          const actionLabel = passport.status === 'redeemed' ? 'Récompense déjà remise' : canRedeem ? `Remettre la récompense à ${passport.displayName}` : 'Récompense indisponible';
          return <tr key={passport.id} className={`challenge-row is-${passport.status}`}>
            <td><strong>{passport.displayName}</strong></td>
            <td>{passport.contact && contactHref(passport.contact) ? <a className="challenge-table-contact" href={contactHref(passport.contact)}>{passport.contact}</a> : <span className={passport.contact ? '' : 'challenge-table-empty'}>{passport.contact || '—'}</span>}</td>
            <td><code className="challenge-table-code">{passport.code}</code></td>
            <td className="challenge-table-scans">{passport.passageCount}</td>
            <td><span className="challenge-table-people" title={validators}>{validators || '—'}</span></td>
            <td><span className="challenge-table-stands" title={stands}>{stands || '—'}</span></td>
            <td className="challenge-table-reward"><span className={`challenge-reward-status ${rewardReceived ? 'is-received' : 'is-not-received'}`} aria-label={rewardReceived ? 'Oui' : 'Non'} title={rewardReceived ? 'Oui' : 'Non'}>{rewardReceived ? <CheckCircle2 size={19} strokeWidth={2.8} /> : <XCircle size={19} strokeWidth={2.8} />}</span></td>
            {allowReward && <td><div className="row-actions"><button className={`table-action is-icon challenge-reward-action ${canRedeem ? 'is-ready' : rewardReceived ? 'is-redeemed' : 'is-pending'}`} type="button" onClick={() => onRedeem(passport)} disabled={!canRedeem} aria-label={actionLabel} title={actionLabel}><Gift size={15} /></button></div></td>}
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}
