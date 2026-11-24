import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, Phone } from 'lucide-react';
import { api } from '../lib/api';
import { dueLabel, dueState } from '../lib/due';
import { useRealtimeEvent } from '../../lib/realtime';
import { accessRole, isApizfTeamRole, isGlobalRole } from '../../navigation';
import { guichetShortLabels } from '../constants/access';
import { autoLabel, CompleteFollowUpForm, outcomeLabels } from '../components/InvestorRequestDetail';
import ConfirmDelete from '../components/ConfirmDelete';
import RowMenu from '../components/RowMenu';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');

// À faire d'abord, de la plus en retard à la plus lointaine ; puis les faites, la plus récente d'abord.
const ordered = (items) => [
  ...items.filter((item) => !item.doneAt).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt)),
  ...items.filter((item) => item.doneAt).sort((a, b) => new Date(b.doneAt) - new Date(a.doneAt)),
];
// Relances à faire maintenant : en retard ou prévues aujourd'hui (la pastille de l'onglet).
const dueNow = (items) => items.filter((item) => !item.doneAt && dueState(item.dueAt)).length;

// Une ligne commune aux deux onglets : l'échéance (en couleur si elle approche), la personne, le motif, l'état, les actions.
function FollowUpRow({ item, person, detail, phone, to, extra, onComplete, onDelete }) {
  const state = item.doneAt ? null : dueState(item.dueAt);
  return (
    <tr className={state ? `is-due-${state}` : item.doneAt ? 'is-muted' : ''}>
      <td className={`stand-nowrap investor-due${state ? ` is-${state}` : ''}`}>
        {state && <AlarmClock size={14} aria-hidden="true" />}{state === 'late' && 'En retard · '}{dueLabel(item.dueAt)}
        <small>{autoLabel(item) || fullName(item.createdBy)}</small>
      </td>
      <td>
        {to ? <Link to={to}><strong>{person}</strong></Link> : <strong>{person}</strong>}
        {detail && <small>{detail}</small>}
      </td>
      {extra}
      <td className="meeting-note-cell">{item.reason}</td>
      <td className="meeting-note-cell">{item.doneAt
        ? <><strong>{outcomeLabels[item.outcome]}</strong><small>{item.outcomeNote || `Faite le ${dateTime.format(new Date(item.doneAt))}`}</small></>
        : phone ? <a className="follow-up-call" href={`tel:${phone}`}><Phone size={14} aria-hidden="true" /> {phone}</a> : '—'}</td>
      <td><RowMenu label="Actions de la relance" items={[
        { label: 'Marquer faite', onClick: onComplete, disabled: Boolean(item.doneAt), hint: 'Relance déjà faite' },
        { label: 'Supprimer', onClick: onDelete, danger: true },
      ]} /></td>
    </tr>
  );
}

// Relances : une seule page de travail. Onglets Contacts et B2B (les stands), onglet Guichets (équipe API-ZF et
// occupants du Stand API-ZF). Chaque relance se marque faite ici, avec sa prochaine étape, comme dans les fiches.
export default function FollowUpsPage({ session, onLogout }) {
  const role = accessRole(session.user);
  const isGlobal = isGlobalRole(session.user.role);
  const withGuichets = isApizfTeamRole(role);
  const [tab, setTab] = useState('contacts');
  const [contacts, setContacts] = useState(null);
  const [guichets, setGuichets] = useState(null);
  const [b2b, setB2b] = useState(null);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    try {
      const [contactData, b2bData, guichetData] = await Promise.all([
        api.contactFollowUps(session.token),
        api.b2bFollowUps(session.token),
        withGuichets ? api.guichetFollowUps(session.token) : [],
      ]);
      setContacts(contactData);
      setB2b(b2bData);
      setGuichets(guichetData);
      setError('');
    } catch (requestError) {
      if (requestError.status === 401) onLogout();
      else setError(requestError.message);
    }
  }, [onLogout, session.token, withGuichets]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeEvent(['contacts', 'b2b', 'investor-requests'], () => { void load(); });

  const contactRows = useMemo(() => ordered(contacts || []), [contacts]);
  const guichetRows = useMemo(() => ordered(guichets || []), [guichets]);
  const b2bRows = useMemo(() => ordered(b2b || []), [b2b]);

  const close = () => { setDialog(null); setActionError(''); };
  const run = async (work) => {
    setBusy(true);
    setActionError('');
    try {
      await work();
      close();
      await load();
    } catch (requestError) {
      if (requestError.status === 401) onLogout();
      else setActionError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const actions = {
    contact: { complete: (item, values) => api.completeContactFollowUp(session.token, item.id, values), remove: (item) => api.deleteContactFollowUp(session.token, item.id) },
    b2b: { complete: (item, values) => api.completeB2bFollowUp(session.token, item.id, values), remove: (item) => api.deleteB2bFollowUp(session.token, item.id) },
    guichet: {
      complete: (item, values) => api.completeInvestorFollowUp(session.token, item.investorRequestId, item.id, values),
      remove: (item) => api.deleteInvestorFollowUp(session.token, item.investorRequestId, item.id),
    },
  };
  const complete = (values) => run(() => actions[dialog.kind].complete(dialog.item, values));
  const remove = () => run(() => actions[dialog.kind].remove(dialog.item));

  const tabs = [
    ['contacts', 'Contacts', dueNow(contacts || [])],
    ['b2b', 'B2B', dueNow(b2b || [])],
    ...(withGuichets ? [['guichets', 'Guichets', dueNow(guichets || [])]] : []),
  ];
  const loading = !error && (contacts === null || b2b === null || guichets === null);
  const rows = { contacts: contactRows, b2b: b2bRows, guichets: guichetRows }[tab];

  return (
    <main className="admin-workspace">
      <header className="workspace-header">
        <div className="section-heading">
          <h1>Relances</h1>
          <nav className="section-tabs" aria-label="Relances">
            {tabs.map(([key, label, count]) => (
              <button key={key} type="button" className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)} aria-pressed={tab === key}>{label}{count > 0 && <b>{count}</b>}</button>
            ))}
          </nav>
        </div>
      </header>

      <section className="data-panel">
        {error && <p className="panel-message is-error">{error}</p>}
        {loading && <p className="panel-message">Chargement…</p>}
        {!loading && !error && !rows.length && (
          <p className="panel-message">Aucune relance.</p>
        )}
        {!loading && !error && rows.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead><tr>
                <th>Échéance</th>
                <th>Contact</th>
                {(tab === 'contacts' || tab === 'b2b') && isGlobal && <th>Stand</th>}
                {tab === 'guichets' && <th>Guichet</th>}
                <th>Motif</th>
                <th>Suite</th>
                <th className="actions-heading">Actions</th>
              </tr></thead>
              <tbody>
                {tab === 'contacts' && contactRows.map((item) => (
                  <FollowUpRow
                    key={item.id}
                    item={item}
                    person={item.contact.fullName}
                    detail={item.contact.company}
                    phone={item.contact.phone}
                    to={isGlobal ? `/stands/${item.contact.occupantId}` : `/contacts/${item.contact.id}`}
                    extra={isGlobal ? <td>{item.contact.occupant?.name || '—'}</td> : null}
                    onComplete={() => setDialog({ type: 'complete', kind: 'contact', item, person: item.contact.fullName })}
                    onDelete={() => setDialog({ type: 'delete', kind: 'contact', item, person: item.contact.fullName })}
                  />
                ))}
                {tab === 'b2b' && b2bRows.map((item) => (
                  <FollowUpRow
                    key={item.id}
                    item={item}
                    person={item.proposal.fullName}
                    detail={item.proposal.need.title}
                    phone={item.proposal.phone}
                    to={`/b2b/${item.proposal.id}`}
                    extra={isGlobal ? <td>{item.proposal.need.occupant?.name || '—'}</td> : null}
                    onComplete={() => setDialog({ type: 'complete', kind: 'b2b', item, person: item.proposal.fullName })}
                    onDelete={() => setDialog({ type: 'delete', kind: 'b2b', item, person: item.proposal.fullName })}
                  />
                ))}
                {tab === 'guichets' && guichetRows.map((item) => (
                  <FollowUpRow
                    key={item.id}
                    item={item}
                    person={item.request.fullName}
                    detail={item.request.organization}
                    phone={item.request.phone}
                    to={`/guichets/${item.request.id}`}
                    extra={<td className="stand-nowrap">{guichetShortLabels[item.request.guichet] || '—'}</td>}
                    onComplete={() => setDialog({ type: 'complete', kind: 'guichet', item, person: item.request.fullName })}
                    onDelete={() => setDialog({ type: 'delete', kind: 'guichet', item, person: item.request.fullName })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {dialog?.type === 'complete' && <CompleteFollowUpForm request={{ fullName: dialog.person }} followUp={dialog.item} loading={busy} error={actionError} onClose={close} onSave={complete} />}
      {dialog?.type === 'delete' && <ConfirmDelete subject={{ label: `la relance de ${dialog.person}` }} loading={busy} error={actionError} onCancel={close} onConfirm={remove} />}
    </main>
  );
}
