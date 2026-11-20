import { Ticket } from 'lucide-react';
import { wheelCodeStatus } from '../../constants/access';
import EmptyState from '../EmptyState';
import PlayerContact from '../../../components/PlayerContact';
import { Detail, ExpandableRow, useOpenRow } from '../RowDetails';
import { SelectAllHeader, SelectCell } from '../RowSelection';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fullName = (person) => (person ? `${person.firstName} ${person.lastName}` : null);

const statusClass = (item) => {
  if (item.status !== 'used' || item.result?.kind !== 'prize') return '';
  return item.claimedAt ? 'is-active' : 'is-new';
};

// Historique de la roue : chaque code délivré et ce qu'il est devenu ; un clic sur la ligne affiche le détail.
export default function WheelCodesTable({ selection, codes, query }) {
  const openRow = useOpenRow();
  if (!codes.length) {
    return <EmptyState icon={Ticket} title="Aucune partie" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Générez un code pour chaque personne qui veut tourner la roue.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} /><th>Délivré le</th><th>Code</th><th>Joueur</th><th>Résultat</th><th>Statut</th></tr></thead>
        <tbody>{codes.map((item) => (
          <ExpandableRow
            key={item.id}
            id={item.id}
            openRow={openRow}
            className={`wheel-code-row is-${item.status}`}
            colSpan={6}
            details={<>
              <Detail label="Code délivré par">{fullName(item.createdBy)}</Detail>
              <Detail label={item.status === 'used' ? 'Jouée le' : 'Expire le'}>{dateTime.format(new Date(item.usedAt || item.expiresAt))}</Detail>
              <Detail label="Contact du joueur">{item.player && <PlayerContact player={item.player} />}</Detail>
              <Detail label="Partenaire">{item.result?.sponsor}</Detail>
              <Detail label="Lot remis le">{item.claimedAt && dateTime.format(new Date(item.claimedAt))}</Detail>
              <Detail label="Remis par">{fullName(item.claimedBy)}</Detail>
            </>}
          >
            <SelectCell selection={selection} id={item.id} />
            <td className="stand-nowrap">{dateTime.format(new Date(item.createdAt))}</td>
            <td className="challenge-table-code">{item.code}</td>
            <td>{item.player ? <strong>{item.player.displayName}</strong> : '—'}</td>
            <td>{item.result?.label || '—'}</td>
            <td><span className={`status-pill ${statusClass(item)}`}>{wheelCodeStatus(item)}</span></td>
          </ExpandableRow>
        ))}</tbody>
      </table>
    </div>
  );
}
