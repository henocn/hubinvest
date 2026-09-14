import { Check, Mail, Phone, X } from 'lucide-react';

const statusLabels = { pending: 'À examiner', accepted: 'Acceptée', declined: 'Refusée' };

export default function B2bProposalList({ proposals, canManage, loadingId, onDecision }) {
  if (!proposals.length) return <div className="empty-state"><strong>Aucune proposition</strong></div>;

  return (
    <div className="b2b-proposal-list">
      {proposals.map((proposal) => (
        <article className={`b2b-proposal-item is-${proposal.status}`} key={proposal.id}>
          <header><div><strong>{proposal.fullName}</strong><span>{statusLabels[proposal.status]}</span></div></header>
          <p>{proposal.message}</p>
          <div className="b2b-proposal-contact"><a href={`mailto:${proposal.email}`}><Mail size={15} /> {proposal.email}</a>{proposal.phone && <a href={`tel:${proposal.phone}`}><Phone size={15} /> {proposal.phone}</a>}</div>
          {canManage && proposal.status === 'pending' && <footer><button className="button button-secondary" type="button" disabled={loadingId === proposal.id} onClick={() => onDecision(proposal.id, 'declined')}><X size={17} /> Refuser</button><button className="button button-primary" type="button" disabled={loadingId === proposal.id} onClick={() => onDecision(proposal.id, 'accepted')}><Check size={17} /> Accepter</button></footer>}
        </article>
      ))}
    </div>
  );
}
