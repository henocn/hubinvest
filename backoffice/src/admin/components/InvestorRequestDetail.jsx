import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, PhoneCall, X } from 'lucide-react';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';
import { companyRegimeLabels, contactSourceLabels, guichetLabels, investorChannelLabels, investorClassHints, investorClassLabels, investorClassShort, investorStatusLabel } from '../constants/access';
import ConfirmDelete from './ConfirmDelete';
import RowMenu from './RowMenu';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const statusClass = { new: ' is-new', in_progress: ' is-active', closed: '' };
const meetingStatus = { scheduled: ['Prévu', ' is-new'], held: ['Tenu', ' is-done'], cancelled: ['Annulé', ' is-lost'] };
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');
// Heure de Lomé = UTC : un champ date-heure se lit et s'écrit en UTC.
const toInput = (value) => (value ? new Date(value).toISOString().slice(0, 16) : '');
const fromInput = (value) => (value ? new Date(`${value}:00Z`).toISOString() : null);
const day = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', weekday: 'long', day: 'numeric', month: 'long' });
// Une réponse promise est due jusqu'à la fin du jour choisi.
const dayToInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const dayFromInput = (value) => (value ? new Date(`${value}T23:59:00Z`).toISOString() : null);

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

// Relancer : appel ou message, ce qui s'est dit, étape suivante (obligatoire pour A et B) et date de la prochaine relance.
function FollowUpForm({ request, loading, error, onClose, onSave }) {
  const required = ['A', 'B'].includes(request.classification);
  const [form, setForm] = useState({ channel: 'call', note: '', nextStep: '', nextFollowUpAt: '' });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  return (
    <Modal eyebrow={request.fullName} title="Relancer" error={error} loading={loading} submitLabel="Enregistrer la relance" onClose={onClose}
      onSubmit={() => onSave({ channel: form.channel, note: form.note || null, nextStep: form.nextStep || null, nextFollowUpAt: fromInput(form.nextFollowUpAt) })}>
      <label>Moyen<select value={form.channel} onChange={set('channel')}>{Object.entries(investorChannelLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Ce qui s’est dit<textarea rows="4" value={form.note} onChange={set('note')} maxLength={2000} /></label>
      <label>Étape suivante{required && ' (obligatoire pour un contact A ou B)'}<input value={form.nextStep} onChange={set('nextStep')} maxLength={255} required={required} /></label>
      <label>Prochaine relance<input type="datetime-local" value={form.nextFollowUpAt} onChange={set('nextFollowUpAt')} /><span className="field-hint">Heure de Lomé. Sans date, la demande passe à « Terminé ».</span></label>
    </Modal>
  );
}

function MeetingForm({ request, meeting, loading, error, onClose, onSave }) {
  const [form, setForm] = useState({ startsAt: toInput(meeting?.startsAt), atGuichet: meeting ? Boolean(meeting.guichet) : true, location: meeting && !meeting.guichet ? meeting.location : '' });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });
  return (
    <Modal eyebrow={request.fullName} title={meeting ? 'Modifier le rendez-vous' : 'Fixer un rendez-vous'} error={error} loading={loading} submitLabel={meeting ? 'Déplacer le rendez-vous' : 'Fixer le rendez-vous'} onClose={onClose}
      onSubmit={() => onSave({ startsAt: fromInput(form.startsAt), atGuichet: form.atGuichet, ...(!form.atGuichet && { location: form.location }) })}>
      <label>Date et heure<input type="datetime-local" value={form.startsAt} onChange={set('startsAt')} required /><span className="field-hint">Heure de Lomé. La personne reçoit le rendez-vous par e-mail, puis un rappel la veille et une heure avant.</span></label>
      <label className="checkbox-field"><input type="checkbox" checked={form.atGuichet} onChange={set('atGuichet')} /> Au guichet « {guichetLabels[request.guichet]} »</label>
      {!form.atGuichet && <label>Lieu<input value={form.location} onChange={set('location')} minLength={2} maxLength={160} required /></label>}
    </Modal>
  );
}

// Valider (le rendez-vous a eu lieu) ou annuler (l'investisseur est prévenu par e-mail) un rendez-vous prévu.
function ConfirmMeeting({ meeting, cancel, loading, error, onCancel, onConfirm }) {
  const when = dateTime.format(new Date(meeting.startsAt));
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="meeting-status-title" onMouseDown={(event) => event.stopPropagation()}>
        <div>
          <h2 id="meeting-status-title">{cancel ? 'Annuler le rendez-vous' : 'Valider le rendez-vous'}</h2>
          <p>{cancel ? `Le rendez-vous du ${when} est annulé ; la personne en est prévenue par e-mail.` : `Le rendez-vous du ${when} a bien eu lieu.`}</p>
        </div>
        {error && <p className="admin-form-error dialog-error">{error}</p>}
        <footer>
          <button className="button button-secondary" type="button" onClick={onCancel} disabled={loading}>Retour</button>
          <button className={`button ${cancel ? 'button-danger' : 'button-primary'}`} type="button" onClick={onConfirm} disabled={loading}>{loading ? 'Enregistrement…' : cancel ? 'Annuler le rendez-vous' : 'Valider'}</button>
        </footer>
      </section>
    </div>
  );
}

// Confirmation du classement ; un changement de classe est signalé, avec son effet sur la relance prévue.
function ConfirmClass({ request, classification, loading, error, onCancel, onConfirm }) {
  const change = Boolean(request.classification);
  const relanced = (request.followUps || []).length > 0;
  const effect = classification === 'support'
    ? 'Le suivi passe par la fiche « Mon entreprise, mes difficultés » et son engagement de suivi écrit.'
    : classification === 'C'
    ? 'Intégré à la lettre d’information, sans relance individuelle : le contact passe à « Terminé ».'
    : relanced ? 'Une relance a déjà été faite : la date de la prochaine relance ne change pas.' : `La relance est prévue ${classification === 'A' ? 'sous 48 h' : 'sous 7 jours'}.`;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="class-title" onMouseDown={(event) => event.stopPropagation()}>
        <div>
          <h2 id="class-title">{change ? 'Changer la classe' : 'Classer le contact'}</h2>
          <p>{change
            ? <>Vous changez la classe de {request.fullName} : <strong>{investorClassLabels[request.classification]}</strong> devient <strong>{investorClassLabels[classification]}</strong>.</>
            : <>Vous classez {request.fullName} en <strong>{investorClassLabels[classification]}</strong>.</>}</p>
          <p>{effect}</p>
        </div>
        {error && <p className="admin-form-error dialog-error">{error}</p>}
        <footer>
          <button className="button button-secondary" type="button" onClick={onCancel} disabled={loading}>Annuler</button>
          <button className="button button-primary" type="button" onClick={onConfirm} disabled={loading}>{loading ? 'Enregistrement…' : change ? 'Changer la classe' : 'Classer'}</button>
        </footer>
      </section>
    </div>
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

// Fiche de diagnostic (15 minutes) : les neuf informations, le service vers lequel la personne est orientée et l'étape suivante.
function DiagnosisForm({ request, busy, saved, onSave }) {
  const fields = request.qualificationFields || [];
  const [answers, setAnswers] = useState(request.qualification || {});
  const [serviceId, setServiceId] = useState(request.recommendedService || '');
  const [nextAction, setNextAction] = useState(request.nextAction || '');
  return (
    <section className="data-panel stand-panel">
      <header className="settings-panel-head">
        <h2>Diagnostic</h2>
        {saved ? <span className="investor-saved">Enregistré</span> : <span className="data-note">{request.diagnosedAt ? `Réalisé le ${dateTime.format(new Date(request.diagnosedAt))}` : 'À faire'}</span>}
      </header>
      <form className="investor-qualification" onSubmit={(event) => { event.preventDefault(); onSave({ qualification: answers, recommendedService: serviceId || null, nextAction }); }}>
        <div className="investor-qualification-grid">
          {fields.map((field) => (
            <label key={field.key}>{field.label}
              <QualificationInput field={field} value={answers[field.key]} onChange={(value) => setAnswers({ ...answers, [field.key]: value })} />
            </label>
          ))}
          <label>Service vers lequel la personne est orientée
            <select value={serviceId} onChange={(event) => setServiceId(event.target.value)}><option value="">—</option>{(request.services || []).map((service) => <option key={service.key} value={service.key}>{service.title}</option>)}</select>
          </label>
          <label>Étape suivante<input value={nextAction} onChange={(event) => setNextAction(event.target.value)} minLength={2} maxLength={255} required /></label>
        </div>
        <div className="investor-form-actions"><button className="button button-primary" type="submit" disabled={busy}>Enregistrer le diagnostic</button></div>
      </form>
    </section>
  );
}

// Fiche « Mon entreprise, mes difficultés » et engagement de suivi écrit, envoyé à l'entreprise par e-mail.
function DifficultyForm({ request, busy, saved, onSave, onResolve }) {
  const initial = request.difficulty || {};
  const [form, setForm] = useState({
    company: initial.company || request.organization || '',
    regime: initial.regime || 'free_zone',
    nature: initial.nature || '',
    description: initial.description || request.projectSummary || '',
    serviceId: request.commitmentService || '',
    dueAt: dayToInput(request.commitmentDueAt),
    note: request.commitmentNote || '',
  });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const committed = Boolean(request.commitmentDueAt);
  const submit = (event) => {
    event.preventDefault();
    onSave({
      difficulty: { company: form.company, regime: form.regime, nature: form.nature, description: form.description },
      commitmentService: form.serviceId || null,
      commitmentDueAt: dayFromInput(form.dueAt),
      commitmentNote: form.note.trim() || null,
    });
  };
  return (
    <section className="data-panel stand-panel">
      <header className="settings-panel-head">
        <h2>Mon entreprise, mes difficultés</h2>
        {saved && <span className="investor-saved">Enregistré</span>}
      </header>
      {committed && (
        <div className={`investor-commitment${request.resolvedAt ? ' is-done' : ''}`}>
          <span>{request.resolvedAt ? `Réponse donnée le ${dateTime.format(new Date(request.resolvedAt))}` : `Réponse promise au plus tard le ${day.format(new Date(request.commitmentDueAt))}`}</span>
          <button className="button button-secondary" type="button" disabled={busy} onClick={() => onResolve(!request.resolvedAt)}>{request.resolvedAt ? 'Rouvrir' : 'Réponse donnée'}</button>
        </div>
      )}
      <form className="investor-qualification" onSubmit={submit}>
        <div className="investor-qualification-grid">
          <label>Entreprise<input value={form.company} onChange={set('company')} minLength={2} maxLength={160} required /></label>
          <label>Régime<select value={form.regime} onChange={set('regime')}>{Object.entries(companyRegimeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Nature de la difficulté<input value={form.nature} onChange={set('nature')} minLength={2} maxLength={160} required /></label>
          <label className="is-wide">Description<textarea rows="4" value={form.description} onChange={set('description')} minLength={2} maxLength={4000} required /></label>
        </div>
        <h3 className="investor-subtitle">Engagement de suivi écrit</h3>
        <div className="investor-qualification-grid">
          <label>Service concerné<select value={form.serviceId} onChange={set('serviceId')}><option value="">—</option>{(request.services || []).map((service) => <option key={service.key} value={service.key}>{service.title}</option>)}</select></label>
          <label>Réponse au plus tard le<input type="date" value={form.dueAt} onChange={set('dueAt')} required={Boolean(form.note.trim())} /></label>
          <label className="is-wide">Engagement pris auprès de l’entreprise<textarea rows="3" value={form.note} onChange={set('note')} maxLength={2000} required={Boolean(form.dueAt)} /></label>
        </div>
        <p className="field-hint">Un nouvel engagement, ou un engagement modifié, est envoyé par e-mail à {request.email}. Le responsable est alerté à l’échéance si la réponse n’est pas notée.</p>
        <div className="investor-form-actions"><button className="button button-primary" type="submit" disabled={busy}>Enregistrer la fiche</button></div>
      </form>
    </section>
  );
}

// Fiche d'un contact des guichets : coordonnées, guichet, responsable nommé et classe ; fiche de diagnostic ou fiche
// « Mon entreprise, mes difficultés » ; rendez-vous ; relances. Une échéance dépassée est signalée en rouge.
export default function InvestorRequestDetail({ id, session, onLogout }) {
  const [request, setRequest] = useState(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [tab, setTab] = useState('details');
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
      if (resetForms) setFormKey((key) => key + 1);
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

  if (notFound) return <main className="admin-workspace"><p className="panel-message">Ce contact n’existe plus. <Link to="/guichets">Retour aux guichets</Link></p></main>;
  if (!request) return <main className="admin-workspace"><p className="panel-message">{error || 'Chargement…'}</p></main>;

  const overdue = request.classification !== 'support' && request.nextFollowUpAt && new Date(request.nextFollowUpAt) < new Date() && request.status !== 'closed';
  const commitmentLate = request.classification === 'support' && request.commitmentDueAt && !request.resolvedAt && new Date(request.commitmentDueAt) < new Date();
  const followUps = request.followUps || [];
  const meetings = request.meetings || [];
  // Une entreprise installée en difficulté a sa fiche « difficultés » ; les autres contacts, la fiche de diagnostic.
  const companyCase = request.guichet === 'company' || request.classification === 'support';

  return (
    <main className="admin-workspace">
      <header className="workspace-header">
        <div className="stand-title">
          <Link className="admin-icon-button" to="/guichets" aria-label="Retour aux guichets" title="Retour aux guichets"><ArrowLeft size={16} /></Link>
          <h1>{request.fullName}</h1>
          {request.classification && <span className={`investor-class is-${request.classification}`} title={investorClassHints[request.classification]}>{investorClassShort[request.classification]}</span>}
          <span className={`status-pill${statusClass[request.status] ?? ''}`}>{investorStatusLabel(request)}</span>
        </div>
      </header>

      {overdue && <p className="panel-message is-error investor-overdue" role="alert">Relance en retard depuis le {dateTime.format(new Date(request.nextFollowUpAt))}.</p>}
      {commitmentLate && <p className="panel-message is-error investor-overdue" role="alert">Réponse promise pour le {day.format(new Date(request.commitmentDueAt))}, pas encore donnée.</p>}
      {actionError && !dialog && <p className="panel-message is-error" role="alert">{actionError}</p>}
      {/* Onglets : détails et classe, la fiche du guichet (diagnostic ou difficultés), rendez-vous, relances. */}
      <nav className="section-tabs detail-tabs" aria-label="Fiche du contact">
        <button type="button" className={tab === 'details' ? 'is-active' : ''} onClick={() => setTab('details')} aria-pressed={tab === 'details'}>Détails</button>
        <button type="button" className={tab === 'sheet' ? 'is-active' : ''} onClick={() => setTab('sheet')} aria-pressed={tab === 'sheet'}>{companyCase ? 'Difficultés' : 'Diagnostic'}</button>
        <button type="button" className={tab === 'meetings' ? 'is-active' : ''} onClick={() => setTab('meetings')} aria-pressed={tab === 'meetings'}>Rendez-vous <b>{meetings.length}</b></button>
        <button type="button" className={tab === 'follow-ups' ? 'is-active' : ''} onClick={() => setTab('follow-ups')} aria-pressed={tab === 'follow-ups'}>Relances <b>{followUps.length}</b></button>
      </nav>

      {tab === 'details' && <>

      <section className="data-panel stand-panel">
        <h2>Contact</h2>
        <dl className="stand-fields">
          <Field label="Reçu le">{dateTime.format(new Date(request.createdAt))}</Field>
          <Field label="Origine">{contactSourceLabels[request.source]}</Field>
          <Field label="Guichet">{guichetLabels[request.guichet]}</Field>
          <Field label="Structure">{request.organization}</Field>
          <Field label="Téléphone">{request.phone && <a href={`tel:${request.phone}`}>{request.phone}</a>}</Field>
          <Field label="E-mail"><a href={`mailto:${request.email}`}>{request.email}</a></Field>
          <Field label="Accord API-ZF">{request.consentApizf ? 'Oui' : 'Non'}</Field>
          <Field label="Projet ou besoin"><p className="stand-text">{request.projectSummary}</p></Field>
        </dl>
      </section>

      <section className="data-panel stand-panel">
        <header className="settings-panel-head"><h2>Suivi</h2>{saved === 'follow' && <span className="investor-saved">Enregistré</span>}</header>
        {/* Un clic sur une classe demande confirmation (classement, ou changement de classe). */}
        <div className="investor-follow">
          <label className="investor-owner">Responsable
            <select value={request.contactUserId || ''} disabled={busy} onChange={(event) => { void run(() => api.updateInvestorRequest(session.token, request.id, { contactUserId: event.target.value || null }), 'follow'); }}>
              <option value="">À désigner</option>
              {(request.team || []).map((member) => <option key={member.id} value={member.id}>{fullName(member)}</option>)}
            </select>
          </label>
          <fieldset className="investor-classes" disabled={busy}>
            <legend>Classe</legend>
            {Object.entries(investorClassLabels).map(([value, label]) => (
              <label key={value} className={`investor-class-option${request.classification === value ? ' is-selected' : ''}`}>
                <input type="radio" name="classification" value={value} checked={request.classification === value}
                  onChange={() => open('classify', value)} />
                <span><strong>{label}</strong><small>{investorClassHints[value]}</small></span>
              </label>
            ))}
          </fieldset>
        </div>
      </section>

      </>}

      {tab === 'sheet' && (companyCase
        ? <DifficultyForm key={formKey} request={request} busy={busy} saved={saved === 'sheet'} onSave={(values) => run(() => api.saveInvestorDifficulty(session.token, request.id, values), 'sheet')} onResolve={(resolved) => run(() => api.resolveInvestorCommitment(session.token, request.id, resolved), 'sheet')} />
        : <DiagnosisForm key={formKey} request={request} busy={busy} saved={saved === 'sheet'} onSave={(values) => run(() => api.saveInvestorDiagnosis(session.token, request.id, values), 'sheet')} />)}

      {tab === 'meetings' && (
      <section className="data-panel stand-panel">
        <header className="settings-panel-head">
          <h2>Rendez-vous <span>{meetings.length}</span></h2>
          <button className="button button-primary" type="button" onClick={() => open('meeting')}><CalendarPlus size={16} /> Rendez-vous</button>
        </header>
        {!meetings.length ? <p className="panel-message">Aucun rendez-vous fixé.</p> : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Date et heure</th><th>Lieu</th><th>Statut</th><th className="actions-heading">Actions</th></tr></thead>
              <tbody>{meetings.map((item) => (
                <tr key={item.id}>
                  <td className="stand-nowrap"><strong>{dateTime.format(new Date(item.startsAt))}</strong><small>{fullName(item.createdBy)}</small></td>
                  <td>{item.location}</td>
                  <td><span className={`status-pill${meetingStatus[item.status]?.[1] || ''}`}>{meetingStatus[item.status]?.[0]}</span></td>
                  <td><RowMenu label="Actions du rendez-vous" items={[
                    { label: 'Valider', onClick: () => open('hold-meeting', item), disabled: item.status !== 'scheduled' || new Date(item.startsAt) > new Date(), hint: item.status !== 'scheduled' ? 'Rendez-vous déjà tenu ou annulé' : 'Se valide une fois l’heure passée' },
                    { label: 'Modifier', onClick: () => open('meeting', item), disabled: item.status !== 'scheduled', hint: 'Rendez-vous déjà tenu ou annulé' },
                    { label: 'Annuler', onClick: () => open('cancel-meeting', item), disabled: item.status !== 'scheduled', hint: 'Rendez-vous déjà tenu ou annulé' },
                    { label: 'Supprimer', onClick: () => open('delete-meeting', item), danger: true },
                  ]} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
      )}

      {tab === 'follow-ups' && (
      <section className="data-panel stand-panel">
        <header className="settings-panel-head">
          <h2>Relances <span>{followUps.length}</span></h2>
          <button className="button button-primary" type="button" onClick={() => open('follow-up')}><PhoneCall size={16} /> Relancer</button>
        </header>
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
                  <td><RowMenu label="Actions de la relance" items={[{ label: 'Supprimer', onClick: () => open('delete-follow-up', item), danger: true }]} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
      )}


      {dialog?.type === 'classify' && <ConfirmClass request={request} classification={dialog.item} loading={busy} error={actionError} onCancel={close}
        onConfirm={() => run(() => api.updateInvestorRequest(session.token, request.id, { classification: dialog.item }), 'follow')} />}
      {dialog?.type === 'follow-up' && <FollowUpForm request={request} loading={busy} error={actionError} onClose={close} onSave={(values) => run(() => api.addInvestorFollowUp(session.token, request.id, values))} />}
      {dialog?.type === 'meeting' && <MeetingForm request={request} meeting={dialog.item} loading={busy} error={actionError} onClose={close}
        onSave={(values) => run(() => (dialog.item ? api.updateInvestorMeeting(session.token, request.id, dialog.item.id, values) : api.addInvestorMeeting(session.token, request.id, values)))} />}
      {dialog?.type === 'delete-follow-up' && <ConfirmDelete subject={{ label: `la relance du ${dateTime.format(new Date(dialog.item.doneAt))}` }} loading={busy} error={actionError} onCancel={close} onConfirm={() => run(() => api.deleteInvestorFollowUp(session.token, request.id, dialog.item.id))} />}
      {(dialog?.type === 'hold-meeting' || dialog?.type === 'cancel-meeting') && <ConfirmMeeting meeting={dialog.item} cancel={dialog.type === 'cancel-meeting'} loading={busy} error={actionError} onCancel={close}
        onConfirm={() => run(() => api.setInvestorMeetingStatus(session.token, request.id, dialog.item.id, dialog.type === 'cancel-meeting' ? 'cancelled' : 'held'))} />}
      {dialog?.type === 'delete-meeting' && <ConfirmDelete subject={{ label: `le rendez-vous du ${dateTime.format(new Date(dialog.item.startsAt))} (sans prévenir la personne : pour le décommander, annulez-le)` }} loading={busy} error={actionError} onCancel={close} onConfirm={() => run(() => api.deleteInvestorMeeting(session.token, request.id, dialog.item.id))} />}
    </main>
  );
}
