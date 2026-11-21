import { CheckCircle2, Gift, Trash2, Trophy, XCircle } from 'lucide-react';
import EmptyState from '../EmptyState';
import PlayerContact from '../../../components/PlayerContact';
import { ActionsCell, Detail, ExpandableRow, useOpenRow } from '../RowDetails';
import { SelectAllHeader, SelectCell } from '../RowSelection';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');

// Joueurs des Défis ; un clic sur la ligne affiche les coordonnées, les stands visités et qui les a validés.
// Réservé au super administrateur : remise de la récompense et suppression du participant.
export default function ChallengePassportsTable({ selection, passports, query, onRedeem, onDelete, allowReward = true }) {
  const openRow = useOpenRow();
  if (!passports.length) {
    return <EmptyState icon={Trophy} title="Aucun participant" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Les parcours commencés apparaîtront ici.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} /><th>Participant</th><th>Code</th><th>Scans</th><th className="reward-heading">Récompense</th>{allowReward && <th className="actions-heading">Actions</th>}</tr></thead>
        <tbody>{passports.map((passport) => {
          const passages = passport.passages || [];
          const rewardReceived = passport.status === 'redeemed';
          const canRedeem = passport.status === 'completed';
          const actionLabel = passport.status === 'redeemed' ? 'Récompense déjà remise' : canRedeem ? `Remettre la récompense à ${passport.displayName}` : 'Récompense indisponible';
          return (
            <ExpandableRow
              key={passport.id}
              id={passport.id}
              openRow={openRow}
              className={`challenge-row is-${passport.status}`}
              colSpan={allowReward ? 6 : 5}
              details={<>
                <Detail label="Contact"><PlayerContact player={passport} /></Detail>
                <Detail label="Parcours terminé le">{passport.completedAt && dateTime.format(new Date(passport.completedAt))}</Detail>
                <Detail label="Récompense remise le">{passport.redeemedAt && dateTime.format(new Date(passport.redeemedAt))}</Detail>
                <Detail label="Stands visités" wide>{passages.length > 0 && (
                  <ul className="row-detail-list">{passages.map((passage) => (
                    <li key={passage.id}>
                      <strong>{passage.occupant?.name || 'Stand'}</strong>
                      {passage.classification && ` · ${passage.classification}`}
                      {passage.createdAt && ` · ${dateTime.format(new Date(passage.createdAt))}`}
                      {passage.validatedBy && ` · validé par ${fullName(passage.validatedBy)}`}
                    </li>
                  ))}</ul>
                )}</Detail>
              </>}
            >
              <SelectCell selection={selection} id={passport.id} />
              <td><strong>{passport.displayName}</strong></td>
              <td><code className="challenge-table-code">{passport.code}</code></td>
              <td className="challenge-table-scans">{passport.passageCount}</td>
              <td className="challenge-table-reward"><span className={`challenge-reward-status ${rewardReceived ? 'is-received' : 'is-not-received'}`} aria-label={rewardReceived ? 'Oui' : 'Non'} title={rewardReceived ? 'Oui' : 'Non'}>{rewardReceived ? <CheckCircle2 size={19} strokeWidth={2.8} /> : <XCircle size={19} strokeWidth={2.8} />}</span></td>
              {allowReward && <ActionsCell><button className={`table-action is-icon challenge-reward-action ${canRedeem ? 'is-ready' : rewardReceived ? 'is-redeemed' : 'is-pending'}`} type="button" onClick={() => onRedeem(passport)} disabled={!canRedeem} aria-label={actionLabel} title={actionLabel}><Gift size={15} /></button>{onDelete && <button className="table-action is-icon is-danger" type="button" onClick={() => onDelete(passport)} title="Supprimer" aria-label={`Supprimer ${passport.displayName}`}><Trash2 size={16} /></button>}</ActionsCell>}
            </ExpandableRow>
          );
        })}</tbody>
      </table>
    </div>
  );
}
