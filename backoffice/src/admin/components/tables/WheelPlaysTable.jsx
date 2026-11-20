import { Disc3 } from 'lucide-react';
import { wheelPlayStatus } from '../../constants/access';
import EmptyState from '../EmptyState';
import PlayerContact from '../../../components/PlayerContact';
import { Detail, ExpandableRow, useOpenRow } from '../RowDetails';
import { SelectAllHeader, SelectCell } from '../RowSelection';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fullName = (person) => (person ? `${person.firstName} ${person.lastName}` : null);

const statusClass = (play) => {
  if (play.result.kind !== 'prize') return '';
  return play.claimedAt ? 'is-active' : 'is-new';
};

// Historique de la roue : une ligne par tour joué ; un clic sur la ligne affiche le contact du joueur et la remise du lot.
export default function WheelPlaysTable({ selection, plays, query }) {
  const openRow = useOpenRow();
  if (!plays.length) {
    return <EmptyState icon={Disc3} title="Aucune partie" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Chaque tour joué à la roue apparaîtra ici.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} /><th>Jouée le</th><th>Code</th><th>Joueur</th><th>Résultat</th><th>Statut</th></tr></thead>
        <tbody>{plays.map((play) => (
          <ExpandableRow
            key={play.id}
            id={play.id}
            openRow={openRow}
            colSpan={6}
            details={<>
              <Detail label="Contact du joueur">{play.player && <PlayerContact player={play.player} />}</Detail>
              <Detail label="Partenaire">{play.result.sponsor}</Detail>
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
          </ExpandableRow>
        ))}</tbody>
      </table>
    </div>
  );
}
