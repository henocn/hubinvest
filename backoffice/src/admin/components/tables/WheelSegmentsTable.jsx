import { Disc3, Pencil, Trash2 } from 'lucide-react';
import EmptyState from '../EmptyState';
import { SelectAllHeader, SelectCell } from '../RowSelection';

// Liste les cases de la roue : lots avec leur stock, cases perdantes, cases masquées.
export default function WheelSegmentsTable({ selection, segments, query, onEdit, onDelete }) {
  if (!segments.length) {
    return <EmptyState icon={Disc3} title="Aucune case" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Ajoutez les lots et les cases perdantes de la roue.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} /><th>Case</th><th>Restant</th><th>Gagnés</th><th className="actions-heading">Actions</th></tr></thead>
        <tbody>{segments.map((segment) => {
          const isPrize = segment.kind === 'prize';
          const notStocked = isPrize && !segment.quantity;
          const soldOut = isPrize && segment.isActive && !notStocked && segment.remaining === 0;
          const note = !segment.isActive ? ' · masquée' : notStocked ? ' · quantité à saisir' : soldOut ? ' · épuisé' : '';
          return (
            <tr key={segment.id} className={`wheel-row${!segment.isActive || notStocked ? ' is-hidden' : ''}${soldOut ? ' is-sold-out' : ''}`}><SelectCell selection={selection} id={segment.id} />
              <td className="activity-cell"><strong>{segment.label}</strong><small>{isPrize ? 'Lot' : 'Case perdante'}{note}</small></td>
              <td>{isPrize ? <strong>{segment.remaining}<span className="wheel-stock-total"> / {segment.quantity}</span></strong> : '—'}</td>
              <td>{isPrize ? segment.awarded : '—'}</td>
              <td><div className="row-actions">
                <button className="table-action is-icon" type="button" aria-label={`Modifier ${segment.label}`} title="Modifier" onClick={() => onEdit(segment)}><Pencil size={16} /></button>
                <button className="table-action is-icon is-danger" type="button" aria-label={`Supprimer ${segment.label}`} title="Supprimer" onClick={() => onDelete(segment)}><Trash2 size={16} /></button>
              </div></td>
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}
