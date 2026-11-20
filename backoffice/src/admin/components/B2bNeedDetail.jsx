import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Pencil, X } from 'lucide-react';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';
import { SelectAllHeader, SelectCell, useRowSelection } from './RowSelection';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const day = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'long', year: 'numeric' });
const statusLabels = { pending: 'À traiter', accepted: 'Acceptée', declined: 'Refusée' };
const statusClass = { pending: ' is-new', accepted: ' is-active', declined: '' };
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');

function Field({ label, children }) {
  const empty = children === null || children === undefined || children === '';
  return <div className="stand-field"><dt>{label}</dt><dd>{empty ? <span className="stand-empty">—</span> : children}</dd></div>;
}

// Fiche d'un besoin B2B : sa description et toutes les demandes reçues, à accepter ou refuser.
// La personne reçoit un e-mail dès que sa demande est acceptée ou refusée.
export default function B2bNeedDetail({ need, token, showStand, onEdit }) {
  const [proposals, setProposals] = useState(null);
  const [error, setError] = useState('');
  const [deciding, setDeciding] = useState('');
  const selection = useRowSelection(proposals || []);
  const isOpen = need.status === 'open';

  const load = useCallback(() => api.b2bProposals(token, need.id).then(setProposals).catch((requestError) => setError(requestError.message)), [need.id, token]);
  useEffect(() => { void load(); }, [load]);
  // Une demande arrivée ou traitée ailleurs apparaît aussitôt.
  useRealtimeEvent('b2b', () => { void load(); });

  const decide = async (proposal, status) => {
    setDeciding(proposal.id);
    setError('');
    try {
      await api.updateB2bProposal(token, proposal.id, { status });
      await load();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDeciding('');
    }
  };

  const list = proposals || [];
  const handled = list.filter((item) => item.status !== 'pending').length;

  return (
    <main className="admin-workspace">
      <header className="workspace-header">
        <div className="stand-title">
          <Link className="admin-icon-button" to="/b2b" aria-label="Retour aux besoins B2B" title="Retour aux besoins B2B"><ArrowLeft size={16} /></Link>
          <h1>{need.title}</h1>
          <span className={`status-pill${isOpen ? ' is-active' : ''}`}>{isOpen ? 'Ouvert' : 'Fermé'}</span>
        </div>
        <div className="workspace-actions">
          <button className="button button-secondary" type="button" onClick={onEdit}><Pencil size={16} /> Modifier</button>
        </div>
      </header>

      <section className="data-panel stand-panel">
        <dl className="stand-fields">
          {showStand && <Field label="Stand">{need.occupant?.name}</Field>}
          <Field label="Description"><p className="stand-text">{need.description}</p></Field>
          <Field label="Demandes traitées">{proposals ? `${handled}/${list.length}` : '…'}</Field>
          <Field label="Publié par">{fullName(need.createdBy)}</Field>
          <Field label="Publié le">{need.createdAt && day.format(new Date(need.createdAt))}</Field>
        </dl>
      </section>

      <section className="data-panel stand-panel">
        <h2>Demandes <span>{handled}/{list.length}</span></h2>
        {error && <p className="panel-message is-error">{error}</p>}
        {!proposals && !error && <p className="panel-message">Chargement…</p>}
        {proposals && !list.length && <p className="admin-empty-state"><strong>Aucune demande.</strong> Les réponses envoyées depuis le site apparaîtront ici.</p>}
        {list.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead><tr><SelectAllHeader selection={selection} /><th>Reçue le</th><th>Personne</th><th>Message</th><th>Statut</th><th className="actions-heading">Actions</th></tr></thead>
              <tbody>{list.map((proposal) => (
                <tr key={proposal.id}><SelectCell selection={selection} id={proposal.id} />
                  <td className="stand-nowrap">{dateTime.format(new Date(proposal.createdAt))}</td>
                  <td>
                    <strong>{proposal.fullName}</strong>
                    <small><a href={`mailto:${proposal.email}`}>{proposal.email}</a></small>
                    {proposal.phone && <small><a href={`tel:${proposal.phone}`}>{proposal.phone}</a></small>}
                  </td>
                  <td className="b2b-message">{proposal.message}</td>
                  <td>
                    <span className={`status-pill${statusClass[proposal.status]}`}>{statusLabels[proposal.status] || proposal.status}</span>
                    {proposal.handledBy && proposal.status !== 'pending' && <small>par {fullName(proposal.handledBy)}</small>}
                  </td>
                  <td>{proposal.status === 'pending' && (
                    <div className="row-actions">
                      <button className="table-action" type="button" disabled={deciding === proposal.id} onClick={() => decide(proposal, 'accepted')}><Check size={15} /> Accepter</button>
                      <button className="table-action is-danger" type="button" disabled={deciding === proposal.id} onClick={() => decide(proposal, 'declined')}><X size={15} /> Refuser</button>
                    </div>
                  )}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
