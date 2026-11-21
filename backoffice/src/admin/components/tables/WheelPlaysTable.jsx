import { Disc3, Gift, Trash2 } from 'lucide-react';
import { wheelPlayStatus } from '../../constants/access';
import EmptyState from '../EmptyState';
import PlayerContact from '../../../components/PlayerContact';
import { ActionsCell, Detail, ExpandableRow, useOpenRow } from '../RowDetails';
import { SelectAllHeader, SelectCell } from '../RowSelection';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fullName = (person) => (person ? `${person.firstName} ${person.lastName}` : null);

const statusClass = (play) => {
  if (play.result.kind !== 'prize') return 'is-lost';
  return play.claimedAt ? 'is-done' : 'is-new';
};

function ClaimButton({ play, onClaim }) {
  const canClaim = play.result.kind === 'prize' && !play.claimedAt;
  const title = play.result.kind !== 'prize' ? 'Partie perdue : aucun lot à remettre' : play.claimedAt ? 'Lot déjà remis' : 'Marquer le lot comme remis';
  return (
    <button className={`table-action is-icon challenge-reward-action ${canClaim ? 'is-ready' : play.claimedAt ? 'is-redeemed' : 'is-pending'}`} type="button" onClick={() => onClaim(play)} disabled={!canClaim} title={title} aria-label={`${title} · ${play.code}`}>
      <Gift size={15} />
    </button>
  );
}

// Historique de la roue : une ligne par tour joué ; un clic sur la ligne affiche le contact du joueur et la remise du lot.
// Le bouton « Remis » (cadeau, comme la remise des Défis) n'est actif que pour un lot gagné pas encore remis ; grisé pour un tour perdu ou un lot déjà remis.
// La suppression d'une partie est réservée au super administrateur (onDelete absent pour les autres).
export default function WheelPlaysTable({ selection, plays, query, onClaim, onDelete }) {
  const openRow = useOpenRow();
  if (!plays.length) {
    return <EmptyState icon={Disc3} title="Aucune partie" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Chaque tour joué à la roue apparaîtra ici.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} /><th>Jouée le</th><th>Code</th><th>Joueur</th><th>Résultat</th><th>Statut</th><th className="actions-heading">Actions</th></tr></thead>
        <tbody>{plays.map((play) => (
          <ExpandableRow
            key={play.id}
            id={play.id}
            openRow={openRow}
            colSpan={7}
            details={<>
              <Detail label="Contact du joueur">{play.player && <PlayerContact player={play.player} />}</Detail>
              <Detail label="Lot remis le">{play.claimedAt && dateTime.format(new Date(play.claimedAt))}</Detail>
              <Detail label="Remis par">{fullName(play.claimedBy)}</Detail>
            </>}
          >
            <SelectCell selection={selection} id={play.id} />
            <td className="stand-nowrap">{dateTime.format(new Date(play.playedAt))}</td>
            <td className="challenge-table-code">{play.code}</td>
            <td>{play.player ? <strong>{play.player.displayName}</strong> : '—'}</td>
            <td>{play.result.label}</td>
            <td><span className={`status-pill ${statusClass(play)}`}>{wheelPlayStatus(play)}</span></td>
            <ActionsCell>
              <ClaimButton play={play} onClaim={onClaim} />
              {onDelete && <button className="table-action is-icon is-danger" type="button" onClick={() => onDelete(play)} title="Supprimer" aria-label={`Supprimer la partie ${play.code}`}><Trash2 size={16} /></button>}
            </ActionsCell>
          </ExpandableRow>
        ))}</tbody>
      </table>
    </div>
  );
}
