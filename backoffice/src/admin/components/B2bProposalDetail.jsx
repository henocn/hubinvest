import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Check, MessageSquareText, Pencil, RotateCcw, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';
import { b2bMeetingOutcomeLabels, b2bProposalLabels } from '../constants/access';
import B2bMeetingDialog from './B2bMeetingDialog';
import B2bProposalDrawer from './drawers/B2bProposalDrawer';
import ConfirmDecision from './ConfirmDecision';
import ConfirmDelete from './ConfirmDelete';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const received = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const statusClass = { pending: ' is-new', accepted: ' is-active', declined: '' };
const outcomeClass = { held_follow_up: ' is-done', held_no_follow_up: ' is-active', no_show: ' is-lost' };
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');

function Field({ label, children }) {
  const empty = children === null || children === undefined || children === '';
  return <div className="stand-field"><dt>{label}</dt><dd>{empty ? <span className="stand-empty">—</span> : children}</dd></div>;
}

// Note facultative d'un rendez-vous, modifiable à tout moment.
function NoteDialog({ meeting, loading, error, onCancel, onSave }) {
  const [note, setNote] = useState(meeting.note || '');
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onCancel}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="note-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div><span className="eyebrow">{dateTime.format(new Date(meeting.startsAt))} · table {meeting.tableNumber}</span><h2 id="note-title">Note du rendez-vous</h2></div>
          <button className="admin-icon-button" type="button" onClick={onCancel} aria-label="Fermer"><X size={18} /></button>
        </header>
        <form className="drawer-form" onSubmit={(event) => { event.preventDefault(); onSave(note); }}>
          <label>Note<textarea rows="6" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} autoFocus /></label>
          {error && <p className="admin-form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onCancel}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement…' : 'Enregistrer'}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

// Compte rendu en un clic : trois issues une fois le rendez-vous commencé ; avant, « À venir ».
function MeetingReport({ meeting, busy, onReport }) {
  const started = new Date(meeting.startsAt).getTime() <= Date.now();
  if (meeting.outcome) {
    return (
      <div className="meeting-report">
        <span className={`status-pill${outcomeClass[meeting.outcome] || ''}`}>{b2bMeetingOutcomeLabels[meeting.outcome]}</span>
        {meeting.reportedBy && <small>par {fullName(meeting.reportedBy)}</small>}
        <button className="table-action is-icon" type="button" onClick={() => onReport(meeting, null)} disabled={busy} title="Annuler le compte rendu" aria-label="Annuler le compte rendu"><RotateCcw size={14} /></button>
      </div>
    );
  }
  if (!started) return <span className="status-pill">À venir</span>;
  return (
    <div className="meeting-report">
      {Object.entries(b2bMeetingOutcomeLabels).map(([value, label]) => (
        <button key={value} className={`table-action meeting-outcome is-${value}`} type="button" onClick={() => onReport(meeting, value)} disabled={busy}>{label}</button>
      ))}
    </div>
  );
}

// Fiche d'une demande B2B : la demande, ses rendez-vous (jour, heure, table) et le compte rendu de chacun.
export default function B2bProposalDetail({ id, session, onLogout }) {
  const navigate = useNavigate();
  const isSuperAdmin = session.user.role === 'super-admin';
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    try {
      setProposal(await api.b2bProposal(session.token, id));
      setError('');
    } catch (requestError) {
      if (requestError.status === 401) onLogout();
      else if (requestError.status === 404) setNotFound(true);
      else setError(requestError.message);
    }
  }, [id, onLogout, session.token]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeEvent('b2b', () => { void load(); });

  const open = (type, item = null) => {
    setActionError('');
    setDialog({ type, item });
  };
  const close = () => setDialog(null);

  // Enregistre une action ; l'erreur s'affiche dans la fenêtre ouverte, sinon au-dessus des rendez-vous.
  const run = async (work, { keepOpen = false } = {}) => {
    setBusy(true);
    setActionError('');
    try {
      await work();
      if (!keepOpen) setDialog(null);
      await load();
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  if (notFound) return <main className="admin-workspace"><p className="panel-message">Cette demande n’existe plus. <Link to="/b2b">Retour aux demandes</Link></p></main>;
  if (!proposal) return <main className="admin-workspace"><p className="panel-message">{error || 'Chargement…'}</p></main>;

  const meetings = proposal.meetings || [];
  const accepted = proposal.status === 'accepted';

  return (
    <main className="admin-workspace">
      <header className="workspace-header">
        <div className="stand-title">
          <Link className="admin-icon-button" to="/b2b" aria-label="Retour aux demandes B2B" title="Retour aux demandes B2B"><ArrowLeft size={16} /></Link>
          <h1>{proposal.fullName}</h1>
          <span className={`status-pill${statusClass[proposal.status] ?? ''}`}>{b2bProposalLabels[proposal.status]}</span>
        </div>
        <div className="workspace-actions">
          {proposal.status === 'pending' && <>
            <button className="button button-primary" type="button" onClick={() => open('decide', 'accepted')}><Check size={16} /> Accepter</button>
            <button className="button button-secondary" type="button" onClick={() => open('decide', 'declined')}><X size={16} /> Refuser</button>
          </>}
          <button className="button button-secondary" type="button" onClick={() => open('edit')}><Pencil size={16} /> Modifier</button>
          <button className="button button-danger" type="button" onClick={() => open('delete')}><Trash2 size={16} /> Supprimer</button>
        </div>
      </header>

      <section className="data-panel stand-panel">
        <h2>Demande</h2>
        <dl className="stand-fields">
          {isSuperAdmin && <Field label="Entreprise">{proposal.need?.occupant?.name}</Field>}
          <Field label="Besoin">{proposal.need?.title}</Field>
          <Field label="Reçue le">{received.format(new Date(proposal.createdAt))}</Field>
          <Field label="Téléphone">{proposal.phone && <a href={`tel:${proposal.phone}`}>{proposal.phone}</a>}</Field>
          <Field label="E-mail"><a href={`mailto:${proposal.email}`}>{proposal.email}</a></Field>
          <Field label="Traitée par">{proposal.status !== 'pending' && fullName(proposal.handledBy)}</Field>
          <Field label="Message"><p className="stand-text">{proposal.message}</p></Field>
        </dl>
      </section>

      <section className="data-panel stand-panel">
        <header className="settings-panel-head">
          <h2>Rendez-vous <span>{meetings.length}</span></h2>
          <button className="button button-primary" type="button" onClick={() => open('meeting')} disabled={!accepted} title={accepted ? 'Fixer un rendez-vous' : 'Acceptez d’abord la demande'}><CalendarPlus size={16} /> Rendez-vous</button>
        </header>
        {!accepted && <p className="panel-message">{proposal.status === 'pending' ? 'Acceptez la demande pour fixer un rendez-vous.' : 'Demande refusée : pas de rendez-vous.'}</p>}
        {actionError && !dialog && <p className="panel-message is-error" role="alert">{actionError}</p>}
        {accepted && !meetings.length && <p className="panel-message">Aucun rendez-vous fixé. Rendez-vous de {proposal.schedule?.minutes} minutes, {proposal.schedule?.tables} tables, de {proposal.schedule?.dayStart} à {proposal.schedule?.dayEnd}.</p>}
        {meetings.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Jour et heure</th><th>Table</th><th>Compte rendu</th><th className="actions-heading">Actions</th></tr></thead>
              <tbody>{meetings.map((meeting) => (
                <tr key={meeting.id}>
                  <td className="stand-nowrap"><strong>{dateTime.format(new Date(meeting.startsAt))}</strong><small>{meeting.durationMinutes} min</small></td>
                  <td>Table {meeting.tableNumber}</td>
                  <td>
                    <MeetingReport meeting={meeting} busy={busy} onReport={(item, outcome) => run(() => api.updateB2bMeeting(session.token, proposal.id, item.id, { outcome }))} />
                    {meeting.note && <p className="meeting-note">{meeting.note}</p>}
                  </td>
                  <td><div className="row-actions">
                    <button className="table-action is-icon" type="button" onClick={() => open('note', meeting)} title="Note" aria-label="Écrire une note"><MessageSquareText size={16} /></button>
                    <button className="table-action is-icon is-danger" type="button" onClick={() => open('cancel', meeting)} title="Annuler le rendez-vous" aria-label="Annuler le rendez-vous"><Trash2 size={16} /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {dialog?.type === 'meeting' && <B2bMeetingDialog proposal={proposal} token={session.token} onClose={close} onSaved={async () => { close(); await load(); }} />}
      {dialog?.type === 'note' && <NoteDialog meeting={dialog.item} loading={busy} error={actionError} onCancel={close} onSave={(note) => run(() => api.updateB2bMeeting(session.token, proposal.id, dialog.item.id, { note }))} />}
      {dialog?.type === 'cancel' && <ConfirmDelete subject={{ label: `le rendez-vous du ${dateTime.format(new Date(dialog.item.startsAt))} (le visiteur est prévenu par e-mail s’il n’a pas encore eu lieu)` }} loading={busy} error={actionError} onCancel={close} onConfirm={() => run(() => api.deleteB2bMeeting(session.token, proposal.id, dialog.item.id))} />}
      {dialog?.type === 'decide' && <ConfirmDecision proposal={proposal} status={dialog.item} loading={busy} error={actionError} onCancel={close} onConfirm={() => run(() => api.updateB2bProposal(session.token, proposal.id, { status: dialog.item }))} />}
      {dialog?.type === 'edit' && <B2bProposalDrawer proposal={proposal} token={session.token} onClose={close} onSaved={async () => { close(); await load(); }} />}
      {dialog?.type === 'delete' && <ConfirmDelete subject={{ label: `la demande B2B de ${proposal.fullName}` }} loading={busy} error={actionError} onCancel={close} onConfirm={() => run(async () => { await api.deleteB2bProposal(session.token, proposal.id); navigate('/b2b', { replace: true }); }, { keepOpen: true })} />}
    </main>
  );
}
