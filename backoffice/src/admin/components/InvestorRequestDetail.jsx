import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, PhoneCall, Pencil, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';
import { investorChannelLabels, investorClassHints, investorClassLabels, investorStatusLabels } from '../constants/access';
import ConfirmDelete from './ConfirmDelete';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const statusClass = { new: ' is-new', in_progress: ' is-active', closed: '' };
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');
// Heure de Lomé = UTC : un champ date-heure se lit et s'écrit en UTC.
const toInput = (value) => (value ? new Date(value).toISOString().slice(0, 16) : '');
const fromInput = (value) => (value ? new Date(`${value}:00Z`).toISOString() : null);

function Field({ label, children }) {
  const empty = children === null || children === undefined || children === '';
  return <div className="stand-field"><dt>{label}</dt><dd>{empty ? <span className="stand-empty">—</span> : children}</dd></div>;
}

// Fenêtre centrée commune aux formulaires de la fiche.
function Modal({ eyebrow, title, error, loading, submitLabel, onClose, onSubmit, children }) {
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="investor-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div><span className="eyebrow">{eyebrow}</span><h2 id="investor-modal-title">{title}</h2></div>
          <button className="admin-icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </header>
        <form className="drawer-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
          {children}
          {error && <p className="admin-form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement…' : submitLabel}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}

// Relance faite : moyen, ce qui s'est dit, étape suivante (obligatoire pour A et B) et date de la prochaine relance.
function FollowUpForm({ request, loading, error, onClose, onSave }) {
  const required = ['A', 'B'].includes(request.classification);
  const [form, setForm] = useState({ channel: 'call', note: '', nextStep: '', nextFollowUpAt: '' });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  return (
    <Modal eyebrow={request.fullName} title="Relance faite" error={error} loading={loading} submitLabel="Enregistrer la relance" onClose={onClose}
      onSubmit={() => onSave({ channel: form.channel, note: form.note || null, nextStep: form.nextStep || null, nextFollowUpAt: fromInput(form.nextFollowUpAt) })}>
      <label>Moyen<select value={form.channel} onChange={set('channel')}>{Object.entries(investorChannelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Ce qui s’est dit<textarea rows="4" value={form.note} onChange={set('note')} maxLength={2000} /></label>
      <label>Étape suivante{required && ' (obligatoire pour un contact A ou B)'}<input value={form.nextStep} onChange={set('nextStep')} maxLength={255} required={required} /></label>
      <label>Prochaine relance<input type="datetime-local" value={form.nextFollowUpAt} onChange={set('nextFollowUpAt')} /><span className="field-hint">Heure de Lomé. L’interlocuteur est prévenu à cette date si la relance n’est pas faite.</span></label>
    </Modal>
  );
}

function MeetingForm({ request, meeting, loading, error, onClose, onSave }) {
  const [form, setForm] = useState({ startsAt: toInput(meeting?.startsAt), location: meeting?.location || 'Investor Desk, Hub de l’Investissement' });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  return (
    <Modal eyebrow={request.fullName} title={meeting ? 'Modifier le rendez-vous' : 'Fixer un rendez-vous'} error={error} loading={loading} submitLabel={meeting ? 'Déplacer le rendez-vous' : 'Fixer le rendez-vous'} onClose={onClose}
      onSubmit={() => onSave({ startsAt: fromInput(form.startsAt), location: form.location })}>
      <label>Date et heure<input type="datetime-local" value={form.startsAt} onChange={set('startsAt')} required /><span className="field-hint">Heure de Lomé. L’investisseur reçoit le rendez-vous par e-mail.</span></label>
      <label>Lieu<input value={form.location} onChange={set('location')} minLength={2} maxLength={160} required /></label>
    </Modal>
  );
}

// Réponse à une information de qualification, selon son type.
function QualificationInput({ field, value, onChange }) {
  if (field.type === 'select') {
    return <select value={value ?? ''} onChange={(event) => onChange(event.target.value)}><option value="">—</option>{(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  }
  if (field.type === 'yesno') {
    return <select value={value === true ? 'yes' : value === false ? 'no' : ''} onChange={(event) => onChange(event.target.value === '' ? '' : event.target.value === 'yes')}><option value="">—</option><option value="yes">Oui</option><option value="no">Non</option></select>;
  }
  return <input type={field.type === 'number' ? 'number' : 'text'} min={field.type === 'number' ? 0 : undefined} value={value ?? ''} onChange={(event) => onChange(event.target.value)} maxLength={500} />;
}

// Fiche Investor Desk : la demande, sa qualification (neuf informations), sa classe A·B·C, son interlocuteur nommé,
// ses relances et ses rendez-vous. Une relance A dépassée est signalée en rouge.
export default function InvestorRequestDetail({ id, session, onLogout }) {
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [follow, setFollow] = useState(null);
  const [answers, setAnswers] = useState({});
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [saved, setSaved] = useState('');

  // « resetForms » : le suivi et la qualification reprennent les valeurs enregistrées (premier chargement, après un
  // enregistrement) ; une mise à jour reçue en temps réel ne touche pas à une saisie en cours.
  const load = useCallback(async (resetForms = true) => {
    try {
      const data = await api.investorRequest(session.token, id);
      setRequest(data);
      if (resetForms) {
        setFollow({ classification: data.classification || '', contactUserId: data.contactUserId || '', status: data.status });
        setAnswers(data.qualification || {});
      }
      setError('');
    } catch (requestError) {
      if (requestError.status === 401) onLogout();
      else if (requestError.status === 404) setNotFound(true);
      else setError(requestError.message);
    }
  }, [id, onLogout, session.token]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeEvent('investor-requests', () => { void load(false); });

  const open = (type, item = null) => {
    setActionError('');
    setDialog({ type, item });
  };
  const close = () => setDialog(null);

  // Enregistre une action ; l'erreur reste dans la fenêtre ouverte, sinon au-dessus de la section.
  const run = async (work, savedLabel = '') => {
    setBusy(true);
    setActionError('');
    try {
      await work();
      setDialog(null);
      await load();
      if (savedLabel) {
        setSaved(savedLabel);
        window.setTimeout(() => setSaved((current) => (current === savedLabel ? '' : current)), 2000);
      }
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  if (notFound) return <main className="admin-workspace"><p className="panel-message">Cette demande n’existe plus. <Link to="/investor-desk">Retour à l’Investor Desk</Link></p></main>;
  if (!request) return <main className="admin-workspace"><p className="panel-message">{error || 'Chargement…'}</p></main>;

  const overdue = request.nextFollowUpAt && new Date(request.nextFollowUpAt) < new Date() && request.status !== 'closed';
  const followUps = request.followUps || [];
  const meetings = request.meetings || [];
  const fields = request.qualificationFields || [];
  const filled = fields.filter((field) => request.qualification?.[field.key] !== undefined).length;
  const followChanged = follow && (follow.classification !== (request.classification || '') || follow.contactUserId !== (request.contactUserId || '') || follow.status !== request.status);

  return (
    <main className="admin-workspace">
      <header className="workspace-header">
        <div className="stand-title">
          <Link className="admin-icon-button" to="/investor-desk" aria-label="Retour à l’Investor Desk" title="Retour à l’Investor Desk"><ArrowLeft size={16} /></Link>
          <h1>{request.fullName}</h1>
          {request.classification && <span className={`investor-class is-${request.classification}`} title={investorClassHints[request.classification]}>{request.classification}</span>}
          <span className={`status-pill${statusClass[request.status] ?? ''}`}>{investorStatusLabels[request.status]}</span>
        </div>
        <div className="workspace-actions">
          <button className="button button-primary" type="button" onClick={() => open('follow-up')}><PhoneCall size={16} /> Relancé</button>
          <button className="button button-secondary" type="button" onClick={() => open('meeting')}><CalendarPlus size={16} /> Rendez-vous</button>
        </div>
      </header>

      {overdue && <p className="panel-message is-error investor-overdue" role="alert">Relance en retard depuis le {dateTime.format(new Date(request.nextFollowUpAt))}.</p>}
      {actionError && !dialog && <p className="panel-message is-error" role="alert">{actionError}</p>}

      <section className="data-panel stand-panel">
        <h2>Demande</h2>
        <dl className="stand-fields">
          <Field label="Reçue le">{dateTime.format(new Date(request.createdAt))}</Field>
          <Field label="Téléphone">{request.phone && <a href={`tel:${request.phone}`}>{request.phone}</a>}</Field>
          <Field label="E-mail"><a href={`mailto:${request.email}`}>{request.email}</a></Field>
          <Field label="Accord API-ZF">{request.consentApizf ? 'Oui' : 'Non'}</Field>
          <Field label="Projet ou besoin"><p className="stand-text">{request.projectSummary}</p></Field>
        </dl>
      </section>

      <section className="data-panel stand-panel">
        <header className="settings-panel-head"><h2>Suivi</h2>{saved === 'follow' && <span className="investor-saved">Enregistré</span>}</header>
        <form className="investor-follow" onSubmit={(event) => { event.preventDefault(); void run(() => api.updateInvestorRequest(session.token, request.id, { classification: follow.classification || null, contactUserId: follow.contactUserId || null, status: follow.status }), 'follow'); }}>
          <fieldset className="investor-classes">
            <legend>Classe</legend>
            {Object.entries(investorClassLabels).map(([value, label]) => (
              <label key={value} className={`investor-class-option${follow.classification === value ? ' is-selected' : ''}`}>
                <input type="radio" name="classification" value={value} checked={follow.classification === value} onChange={() => setFollow({ ...follow, classification: value })} />
                <span><strong>{label}</strong><small>{investorClassHints[value]}</small></span>
              </label>
            ))}
          </fieldset>
          <div className="field-row">
            <label>Interlocuteur nommé
              <select value={follow.contactUserId} onChange={(event) => setFollow({ ...follow, contactUserId: event.target.value })}>
                <option value="">À désigner</option>
                {(request.team || []).map((member) => <option key={member.id} value={member.id}>{fullName(member)}</option>)}
              </select>
            </label>
            <label>Statut
              <select value={follow.status} onChange={(event) => setFollow({ ...follow, status: event.target.value })}>
                {Object.entries(investorStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
          </div>
          <dl className="stand-fields investor-follow-facts">
            <Field label="Prochaine relance">{request.nextFollowUpAt && <span className={overdue ? 'investor-late' : ''}>{dateTime.format(new Date(request.nextFollowUpAt))}</span>}</Field>
            <Field label="Étape suivante">{request.nextAction}</Field>
          </dl>
          <div className="investor-form-actions"><button className="button button-primary" type="submit" disabled={busy || !followChanged}>Enregistrer le suivi</button></div>
        </form>
      </section>

      <section className="data-panel stand-panel">
        <header className="settings-panel-head"><h2>Qualification <span>{filled} / {fields.length}</span></h2>{saved === 'qualification' && <span className="investor-saved">Enregistré</span>}</header>
        <form className="investor-qualification" onSubmit={(event) => { event.preventDefault(); void run(() => api.updateInvestorRequest(session.token, request.id, { qualification: answers }), 'qualification'); }}>
          <div className="investor-qualification-grid">
            {fields.map((field) => (
              <label key={field.key}>{field.label}
                <QualificationInput field={field} value={answers[field.key]} onChange={(value) => setAnswers({ ...answers, [field.key]: value })} />
              </label>
            ))}
          </div>
          <div className="investor-form-actions"><button className="button button-primary" type="submit" disabled={busy}>Enregistrer la qualification</button></div>
        </form>
      </section>

      <section className="data-panel stand-panel">
        <h2>Relances <span>{followUps.length}</span></h2>
        {!followUps.length ? <p className="panel-message">Aucune relance enregistrée.</p> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Date</th><th>Moyen</th><th>Ce qui s’est dit</th><th>Étape suivante</th><th className="actions-heading">Actions</th></tr></thead>
              <tbody>{followUps.map((item) => (
                <tr key={item.id}>
                  <td className="stand-nowrap"><strong>{dateTime.format(new Date(item.doneAt))}</strong><small>{fullName(item.createdBy)}</small></td>
                  <td>{investorChannelLabels[item.channel]}</td>
                  <td className="meeting-note-cell">{item.note || '—'}</td>
                  <td>{item.nextStep || '—'}</td>
                  <td><div className="row-actions"><button className="table-action is-icon is-danger" type="button" onClick={() => open('delete-follow-up', item)} title="Supprimer la relance" aria-label="Supprimer la relance"><Trash2 size={16} /></button></div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="data-panel stand-panel">
        <h2>Rendez-vous <span>{meetings.length}</span></h2>
        {!meetings.length ? <p className="panel-message">Aucun rendez-vous fixé.</p> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Date et heure</th><th>Lieu</th><th className="actions-heading">Actions</th></tr></thead>
              <tbody>{meetings.map((item) => (
                <tr key={item.id}>
                  <td className="stand-nowrap"><strong>{dateTime.format(new Date(item.startsAt))}</strong><small>{fullName(item.createdBy)}</small></td>
                  <td>{item.location}</td>
                  <td><div className="row-actions">
                    <button className="table-action is-icon" type="button" onClick={() => open('meeting', item)} title="Modifier le rendez-vous" aria-label="Modifier le rendez-vous"><Pencil size={16} /></button>
                    <button className="table-action is-icon is-danger" type="button" onClick={() => open('delete-meeting', item)} title="Annuler le rendez-vous" aria-label="Annuler le rendez-vous"><Trash2 size={16} /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {dialog?.type === 'follow-up' && <FollowUpForm request={request} loading={busy} error={actionError} onClose={close} onSave={(values) => run(() => api.addInvestorFollowUp(session.token, request.id, values))} />}
      {dialog?.type === 'meeting' && <MeetingForm request={request} meeting={dialog.item} loading={busy} error={actionError} onClose={close}
        onSave={(values) => run(() => (dialog.item ? api.updateInvestorMeeting(session.token, request.id, dialog.item.id, values) : api.addInvestorMeeting(session.token, request.id, values)))} />}
      {dialog?.type === 'delete-follow-up' && <ConfirmDelete subject={{ label: `la relance du ${dateTime.format(new Date(dialog.item.doneAt))}` }} loading={busy} error={actionError} onCancel={close} onConfirm={() => run(() => api.deleteInvestorFollowUp(session.token, request.id, dialog.item.id))} />}
      {dialog?.type === 'delete-meeting' && <ConfirmDelete subject={{ label: `le rendez-vous du ${dateTime.format(new Date(dialog.item.startsAt))} (l’investisseur est prévenu par e-mail s’il n’a pas encore eu lieu)` }} loading={busy} error={actionError} onCancel={close} onConfirm={() => run(() => api.deleteInvestorMeeting(session.token, request.id, dialog.item.id))} />}
    </main>
  );
}
