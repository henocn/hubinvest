import { Check, Handshake, Pencil, Trash2, X } from 'lucide-react';
import { b2bProposalLabels } from '../../constants/access';
import EmptyState from '../EmptyState';
import { ActionsCell } from '../RowDetails';
import { SelectAllHeader, SelectCell } from '../RowSelection';

const statusClass = { pending: ' is-new', accepted: ' is-active', declined: '' };

// Demandes reçues sur les besoins B2B, à accepter ou refuser ; la personne est prévenue par e-mail de la décision.
// La ligne : nom, contact (téléphone, sinon e-mail), entreprise du besoin, rendez-vous fixés ;
// un clic ouvre la fiche de la demande (détail, rendez-vous, comptes rendus).
export default function B2bProposalsTable({ selection, proposals, query, showStand = true, onOpen, onDecide, onEdit, onDelete }) {
  if (!proposals.length) {
    return <EmptyState icon={Handshake} title="Aucune demande B2B" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Les réponses aux besoins publiés sur le site apparaîtront ici.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} /><th>Nom et prénom</th><th>Contact</th>{showStand && <th>Entreprise</th>}<th>Statut</th><th>Rendez-vous</th><th className="actions-heading">Actions</th></tr></thead>
        <tbody>{proposals.map((proposal) => (
          <tr key={proposal.id} className="is-link" onClick={() => onOpen(proposal)}>
            <SelectCell selection={selection} id={proposal.id} />
            <td><strong>{proposal.fullName}</strong></td>
            <td className="stand-nowrap">{proposal.phone
              ? <a className="cell-link" href={`tel:${proposal.phone}`} onClick={(event) => event.stopPropagation()}>{proposal.phone}</a>
              : <a className="cell-link" href={`mailto:${proposal.email}`} onClick={(event) => event.stopPropagation()}>{proposal.email}</a>}</td>
            {showStand && <td>{proposal.need?.occupant?.name || '—'}</td>}
            <td><span className={`status-pill${statusClass[proposal.status] ?? ''}`}>{b2bProposalLabels[proposal.status] || proposal.status}</span></td>
            <td>{proposal.meetingCount || '—'}</td>
            <ActionsCell>{proposal.status === 'pending' && <>
              <button className="table-action is-icon is-accept" type="button" onClick={() => onDecide(proposal, 'accepted')} aria-label={`Accepter la demande de ${proposal.fullName}`} title="Accepter"><Check size={16} /></button>
              <button className="table-action is-icon is-decline" type="button" onClick={() => onDecide(proposal, 'declined')} aria-label={`Refuser la demande de ${proposal.fullName}`} title="Refuser"><X size={16} /></button>
              <span className="row-actions-divider" aria-hidden="true" />
            </>}
              <button className="table-action is-icon" type="button" onClick={() => onEdit(proposal)} aria-label={`Modifier la demande de ${proposal.fullName}`} title="Modifier"><Pencil size={16} /></button>
              <button className="table-action is-icon is-danger" type="button" onClick={() => onDelete(proposal)} aria-label={`Supprimer la demande de ${proposal.fullName}`} title="Supprimer"><Trash2 size={16} /></button>
            </ActionsCell>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
