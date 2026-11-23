import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Check, MessageSquareText, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { isGlobalRole } from '../../navigation';
import { upcomingFirst } from '../lib/order';
import { useRealtimeEvent } from '../../lib/realtime';
import { b2bMeetingOutcomeLabels, b2bProposalLabels } from '../constants/access';
import B2bMeetingDialog from './B2bMeetingDialog';
import B2bProposalDrawer from './drawers/B2bProposalDrawer';
import ConfirmDecision from './ConfirmDecision';
import ConfirmDelete from './ConfirmDelete';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const received = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const statusClass = { pending: ' is-new', accepted: ' is-active', declined: '' };
const outcomeClass = { present: ' is-done', absent: ' is-lost' };
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');

function Field({ label, children }) {
  const empty = children === null || children === undefined || children === '';
  return <div className="stand-field"><dt>{label}</dt><dd>{empty ? <span className="stand-empty">—</span> : children}</dd></div>;
}

// Compte rendu d'un rendez-vous : le visiteur était présent ou absent (une fois le rendez-vous commencé ; un second clic
// retire le choix), puis la prochaine étape et la note, facultatives et modifiables à tout moment.
function ReportDialog({ meeting, loading, error, onCancel, onSave }) {
  const started = new Date(meeting.startsAt).getTime() <= Date.now();
  const [outcome, setOutcome] = useState(meeting.outcome || null);
  const [nextStep, setNextStep] = useState(meeting.nextStep || '');
  const [note, setNote] = useState(meeting.note || '');
  const submit = (event) => {
    event.preventDefault();
    onSave({ nextStep, note, ...(outcome !== (meeting.outcome || null) && { outcome }) });
  };
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onCancel}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="report-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div><span className="eyebrow">{dateTime.format(new Date(meeting.startsAt))} · table {meeting.tableNumber}</span><h2 id="report-title">Compte rendu</h2></div>
          <button className="admin-icon-button" type="button" onClick={onCancel} aria-label="Fermer"><X size={18} /></button>
        </header>
        <form className="drawer-form" onSubmit={submit}>
          <fieldset className="meeting-outcomes" disabled={!started}>
            <legend>Le visiteur était</legend>
            {Object.entries(b2bMeetingOutcomeLabels).map(([value, label]) => (
              <button key={value} type="button" className={`meeting-outcome is-${value}${outcome === value ? ' is-selected' : ''}`} aria-pressed={outcome === value}
                onClick={() => setOutcome(outcome === value ? null : value)}>{label}</button>
            ))}
            {!started && <span className="field-hint">La présence se note une fois le rendez-vous commencé.</span>}
          </fieldset>
          <label>Prochaine étape<input value={nextStep} onChange={(event) => setNextStep(event.target.value)} maxLength={255} /></label>
          <label>Note<textarea rows="6" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} /></label>
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

// Dans le tableau : l'issue retenue (ou « À venir » / « À faire »), son auteur, puis la prochaine étape et la note.
// Un visiteur absent sans rendez-vous suivant garde un bouton « Reprogrammer ».
function MeetingReport({ meeting, rescheduled, onReschedule }) {
  const started = new Date(meeting.startsAt).getTime() <= Date.now();
  return (
    <>
      <div className="meeting-report">
        {meeting.outcome
          ? <span className={`status-pill${outcomeClass[meeting.outcome] || ''}`}>{b2bMeetingOutcomeLabels[meeting.outcome]}</span>
          : <span className={`status-pill${started ? ' is-new' : ''}`}>{started ? 'À faire' : 'À venir'}</span>}
        {meeting.outcome && meeting.reportedBy && <small>par {fullName(meeting.reportedBy)}</small>}
        {meeting.outcome === 'absent' && !rescheduled && <button className="table-action" type="button" onClick={onReschedule}><CalendarPlus size={14} /> Reprogrammer</button>}
      </div>
      {meeting.nextStep && <p className="meeting-note"><strong>Prochaine étape :</strong> {meeting.nextStep}</p>}
      {meeting.note && <p className="meeting-note">{meeting.note}</p>}
    </>
  );
}

// Fiche d'une demande B2B : la demande, ses rendez-vous (jour, heure, table) et le compte rendu de chacun.
export default function B2bProposalDetail({ id, session, onLogout }) {
  const navigate = useNavigate();
  const isSuperAdmin = isGlobalRole(session.user.role);
  const [proposal, setProposal] = useState(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('details');
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
  // Renvoie true si l'action a réussi.
  const run = async (work, { keepOpen = false } = {}) => {
    setBusy(true);
    setActionError('');
    try {
      await work();
      if (!keepOpen) setDialog(null);
      await load();
      return true;
    } catch (requestError) {
      setActionError(requestError.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Visiteur absent : on propose aussitôt un nouveau rendez-vous, pour qu'il ne reste pas sans suite.
  const saveReport = async (meeting, values) => {
    const saved = await run(() => api.updateB2bMeeting(session.token, proposal.id, meeting.id, values));
    if (saved && values.outcome === 'absent') open('meeting');
  };

  if (notFound) return <main className="admin-workspace"><p className="panel-message">Cette demande n’existe plus. <Link to="/b2b">Retour aux demandes</Link></p></main>;
  if (!proposal) return <main className="admin-workspace"><p className="panel-message">{error || 'Chargement…'}</p></main>;

  const meetings = upcomingFirst(proposal.meetings || [], (item) => item.startsAt, (item) => new Date(item.startsAt) >= new Date());
  // Le nombre de l'onglet ne compte que les rendez-vous à venir, et disparaît à zéro.
  const upcomingMeetings = meetings.filter((item) => new Date(item.startsAt) >= new Date()).length;
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

      {/* Onglets : la demande, puis ses rendez-vous et leurs comptes rendus. */}
      <nav className="section-tabs detail-tabs" aria-label="Fiche de la demande">
        <button type="button" className={tab === 'details' ? 'is-active' : ''} onClick={() => setTab('details')} aria-pressed={tab === 'details'}>Demande</button>
        <button type="button" className={tab === 'meetings' ? 'is-active' : ''} onClick={() => setTab('meetings')} aria-pressed={tab === 'meetings'}>Rendez-vous{upcomingMeetings > 0 && <b>{upcomingMeetings}</b>}</button>
      </nav>

      {tab === 'details' && (
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
      )}

      {tab === 'meetings' && (
      <section className="data-panel stand-panel">
        <header className="settings-panel-head">
          <h2>Rendez-vous</h2>
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
                  <td><MeetingReport meeting={meeting} rescheduled={meetings.some((item) => new Date(item.startsAt) > new Date(meeting.startsAt))} onReschedule={() => open('meeting')} /></td>
                  <td><div className="row-actions">
                    <button className="table-action is-icon" type="button" onClick={() => open('meeting', meeting)} disabled={Boolean(meeting.outcome)} title={meeting.outcome ? 'Compte rendu fait : le rendez-vous ne peut plus être déplacé' : 'Modifier le rendez-vous'} aria-label="Modifier le rendez-vous"><Pencil size={16} /></button>
                    <button className="table-action is-icon" type="button" onClick={() => open('report', meeting)} title="Compte rendu" aria-label="Faire le compte rendu"><MessageSquareText size={16} /></button>
                    <button className="table-action is-icon is-danger" type="button" onClick={() => open('cancel', meeting)} title="Annuler le rendez-vous" aria-label="Annuler le rendez-vous"><Trash2 size={16} /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {dialog?.type === 'meeting' && <B2bMeetingDialog proposal={proposal} meeting={dialog.item} token={session.token} onClose={close} onSaved={async () => { close(); await load(); }} />}
      {dialog?.type === 'report' && <ReportDialog meeting={dialog.item} loading={busy} error={actionError} onCancel={close} onSave={(values) => saveReport(dialog.item, values)} />}
      {dialog?.type === 'cancel' && <ConfirmDelete subject={{ label: `le rendez-vous du ${dateTime.format(new Date(dialog.item.startsAt))} (le visiteur est prévenu par e-mail s’il n’a pas encore eu lieu)` }} loading={busy} error={actionError} onCancel={close} onConfirm={() => run(() => api.deleteB2bMeeting(session.token, proposal.id, dialog.item.id))} />}
      {dialog?.type === 'decide' && <ConfirmDecision proposal={proposal} status={dialog.item} loading={busy} error={actionError} onCancel={close} onConfirm={() => run(() => api.updateB2bProposal(session.token, proposal.id, { status: dialog.item }))} />}
      {dialog?.type === 'edit' && <B2bProposalDrawer proposal={proposal} token={session.token} onClose={close} onSaved={async () => { close(); await load(); }} />}
      {dialog?.type === 'delete' && <ConfirmDelete subject={{ label: `la demande B2B de ${proposal.fullName}` }} loading={busy} error={actionError} onCancel={close} onConfirm={() => run(async () => { await api.deleteB2bProposal(session.token, proposal.id); navigate('/b2b', { replace: true }); }, { keepOpen: true })} />}
    </main>
  );
}
