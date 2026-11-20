import { Check, Handshake, Pencil, Trash2, X } from 'lucide-react';
import { b2bProposalLabels } from '../../constants/access';
import EmptyState from '../EmptyState';
import { ActionsCell, Detail, ExpandableRow, useOpenRow } from '../RowDetails';
import { SelectAllHeader, SelectCell } from '../RowSelection';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const statusClass = { pending: ' is-new', accepted: ' is-active', declined: '' };
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');

// Demandes reçues sur les besoins B2B, à accepter ou refuser ; la personne est prévenue par e-mail de la décision.
// La ligne : nom, contact (téléphone, sinon e-mail), entreprise du besoin ; un clic affiche le besoin, la date et le message.
export default function B2bProposalsTable({ selection, proposals, query, showStand = true, onDecide, onEdit, onDelete }) {
  const openRow = useOpenRow();
  if (!proposals.length) {
    return <EmptyState icon={Handshake} title="Aucune demande B2B" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Les réponses aux besoins publiés sur le site apparaîtront ici.'} />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} /><th>Nom et prénom</th><th>Contact</th>{showStand && <th>Entreprise</th>}<th>Statut</th><th className="actions-heading">Actions</th></tr></thead>
        <tbody>{proposals.map((proposal) => (
          <ExpandableRow
            key={proposal.id}
            id={proposal.id}
            openRow={openRow}
            colSpan={showStand ? 6 : 5}
            details={<>
              <Detail label="Besoin">{proposal.need?.title}</Detail>
              <Detail label="Reçue le">{dateTime.format(new Date(proposal.createdAt))}</Detail>
              <Detail label="E-mail"><a href={`mailto:${proposal.email}`}>{proposal.email}</a></Detail>
              <Detail label="Téléphone">{proposal.phone && <a href={`tel:${proposal.phone}`}>{proposal.phone}</a>}</Detail>
              <Detail label="Traitée par">{proposal.status !== 'pending' && fullName(proposal.handledBy)}</Detail>
              <Detail label="Message" wide>{proposal.message}</Detail>
            </>}
          >
            <SelectCell selection={selection} id={proposal.id} />
            <td><strong>{proposal.fullName}</strong></td>
            <td className="stand-nowrap">{proposal.phone
              ? <a className="cell-link" href={`tel:${proposal.phone}`} onClick={(event) => event.stopPropagation()}>{proposal.phone}</a>
              : <a className="cell-link" href={`mailto:${proposal.email}`} onClick={(event) => event.stopPropagation()}>{proposal.email}</a>}</td>
            {showStand && <td>{proposal.need?.occupant?.name || '—'}</td>}
            <td><span className={`status-pill${statusClass[proposal.status] ?? ''}`}>{b2bProposalLabels[proposal.status] || proposal.status}</span></td>
            <ActionsCell>{proposal.status === 'pending' && <>
              <button className="table-action is-icon is-accept" type="button" onClick={() => onDecide(proposal, 'accepted')} aria-label={`Accepter la demande de ${proposal.fullName}`} title="Accepter"><Check size={16} /></button>
              <button className="table-action is-icon is-decline" type="button" onClick={() => onDecide(proposal, 'declined')} aria-label={`Refuser la demande de ${proposal.fullName}`} title="Refuser"><X size={16} /></button>
              <span className="row-actions-divider" aria-hidden="true" />
            </>}
              <button className="table-action is-icon" type="button" onClick={() => onEdit(proposal)} aria-label={`Modifier la demande de ${proposal.fullName}`} title="Modifier"><Pencil size={16} /></button>
              <button className="table-action is-icon is-danger" type="button" onClick={() => onDelete(proposal)} aria-label={`Supprimer la demande de ${proposal.fullName}`} title="Supprimer"><Trash2 size={16} /></button>
            </ActionsCell>
          </ExpandableRow>
        ))}</tbody>
      </table>
    </div>
  );
}
