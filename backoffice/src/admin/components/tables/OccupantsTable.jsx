import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { resolveAssetUrl } from '../../lib/api';
import EmptyState from '../EmptyState';
import { SelectAllHeader, SelectCell } from '../RowSelection';

// Liste des stands : un clic sur une ligne ouvre sa fiche complète dans l'administration.
export default function OccupantsTable({ selection, occupants, contactStats, query, onEdit, onDelete }) {
  const navigate = useNavigate();
  if (!occupants.length) {
    return <EmptyState title="Aucun stand" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Créez la première fiche du Hub.'} />;
  }

  // Les boutons de la ligne agissent sans ouvrir la fiche.
  const act = (handler) => (event) => { event.stopPropagation(); handler(); };

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} /><th>Structure</th><th>Emplacement</th><th>Contacts</th><th className="actions-heading">Actions</th></tr></thead>
        <tbody>{occupants.map((occupant) => (
          <tr className={`occupant-row is-link ${occupant.status === 'active' ? 'is-active' : 'is-inactive'}`} key={occupant.id} onClick={() => navigate(`/stands/${occupant.id}`)}><SelectCell selection={selection} id={occupant.id} />
            <td><div className="structure-cell">{occupant.coverImageUrl ? <img src={resolveAssetUrl(occupant.coverImageUrl)} alt="" /> : <span className="structure-cover-placeholder" aria-hidden="true" />}<Link to={`/stands/${occupant.id}`} onClick={(event) => event.stopPropagation()}><strong>{occupant.name}</strong></Link><span className="sr-only">{occupant.status === 'active' ? 'Actif' : 'Inactif'}</span></div></td>
            <td>{occupant.standLabel || '—'}</td>
            <td className="contact-count">{contactStats.byOccupant[occupant.id] || 0}</td>
            <td><div className="row-actions">
              <button className="table-action is-icon" type="button" aria-label={`Modifier ${occupant.name}`} title="Modifier" onClick={act(() => onEdit(occupant))}><Pencil size={16} /></button>
              <button className="table-action is-icon is-danger" type="button" aria-label={`Supprimer ${occupant.name}`} title="Supprimer" onClick={act(() => onDelete(occupant))}><Trash2 size={16} /></button>
            </div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
