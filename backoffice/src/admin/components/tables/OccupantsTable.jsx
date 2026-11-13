import { Building2, ExternalLink, Pencil, QrCode, Trash2 } from 'lucide-react';
import { publicBaseUrl } from '../../constants/access';
import { resolveAssetUrl } from '../../lib/api';
import EmptyState from '../EmptyState';

export default function OccupantsTable({ occupants, contactStats, query, onQrCode, onEdit, onDelete }) {
  if (!occupants.length) {
    return <EmptyState icon={Building2} title="Aucun stand" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Créez la première fiche du Hub.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Structure</th><th>Emplacement</th><th>Contacts</th><th className="actions-heading">Actions</th></tr></thead>
        <tbody>{occupants.map((occupant) => (
          <tr className={`occupant-row ${occupant.status === 'active' ? 'is-active' : 'is-inactive'}`} key={occupant.id}>
            <td><div className="structure-cell">{occupant.coverImageUrl ? <img src={resolveAssetUrl(occupant.coverImageUrl)} alt="" /> : <span className="structure-cover-placeholder" aria-hidden="true" />}<strong>{occupant.name}</strong><span className="sr-only">{occupant.status === 'active' ? 'Actif' : 'Inactif'}</span></div></td>
            <td>{occupant.standLabel || '—'}</td>
            <td className="contact-count">{contactStats.byOccupant[occupant.id] || 0}</td>
            <td><div className="row-actions">
              {occupant.status === 'active' && <button className="table-action is-icon" type="button" aria-label={`QR code de ${occupant.name}`} title="QR code" onClick={() => onQrCode({ title: occupant.name, url: `${publicBaseUrl}/stands/${occupant.slug}`, fileName: `hubinvest-${occupant.slug}` })}><QrCode size={16} /></button>}
              {occupant.status === 'active' && <a className="table-action is-icon" href={`${publicBaseUrl}/stands/${occupant.slug}`} target="_blank" rel="noreferrer" aria-label={`Voir ${occupant.name}`} title="Voir la fiche"><ExternalLink size={16} /></a>}
              <button className="table-action is-icon" type="button" aria-label={`Modifier ${occupant.name}`} title="Modifier" onClick={() => onEdit(occupant)}><Pencil size={16} /></button>
              <button className="table-action is-icon is-danger" type="button" aria-label={`Supprimer ${occupant.name}`} title="Supprimer" onClick={() => onDelete(occupant)}><Trash2 size={16} /></button>
            </div></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
