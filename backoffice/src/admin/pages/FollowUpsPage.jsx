import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlarmClock, Download, Search } from 'lucide-react';
import { api } from '../lib/api';
import { dueLabel, dueState } from '../lib/due';
import { exportToExcel, formatDate } from '../../lib/excel';
import { useRealtimeEvent } from '../../lib/realtime';
import { accessRole, isApizfTeamRole, isGlobalRole } from '../../navigation';
import { guichetShortLabels } from '../constants/access';
import { autoLabel, CompleteFollowUpForm, outcomeLabels } from '../components/InvestorRequestDetail';
import ConfirmDelete from '../components/ConfirmDelete';
import RowMenu from '../components/RowMenu';
import { ActionsCell } from '../components/RowDetails';
import { SelectAllHeader, SelectCell, useRowSelection } from '../components/RowSelection';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const fullName = (user) => [user?.firstName, user?.lastName].filter(Boolean).join(' ');

// Une relance, quel que soit l'onglet : la personne, son contexte, son téléphone, la fiche à ouvrir.
const contactRow = (isGlobal) => (item) => ({
  id: item.id, kind: 'contact', item, person: item.contact.fullName, detail: item.contact.company, phone: item.contact.phone,
  stand: item.contact.occupant?.name, to: isGlobal ? `/stands/${item.contact.occupantId}` : `/contacts/${item.contact.id}`,
});
const b2bRow = (item) => ({
  id: item.id, kind: 'b2b', item, person: item.proposal.fullName, detail: item.proposal.need.title, phone: item.proposal.phone,
  stand: item.proposal.need.occupant?.name, to: `/b2b/${item.proposal.id}`,
});
const guichetRow = (item) => ({
  id: item.id, kind: 'guichet', item, person: item.request.fullName, detail: item.request.organization, phone: item.request.phone,
  guichet: guichetShortLabels[item.request.guichet], to: `/guichets/${item.request.id}`,
});

// À faire d'abord, de la plus en retard à la plus lointaine ; puis les faites, la plus récente d'abord.
const ordered = (rows) => [
  ...rows.filter((row) => !row.item.doneAt).sort((a, b) => new Date(a.item.dueAt) - new Date(b.item.dueAt)),
  ...rows.filter((row) => row.item.doneAt).sort((a, b) => new Date(b.item.doneAt) - new Date(a.item.doneAt)),
];
// Relances à faire maintenant : en retard ou prévues aujourd'hui (la pastille de l'onglet).
const dueNow = (rows) => rows.filter((row) => !row.item.doneAt && dueState(row.item.dueAt)).length;
const filters = [['todo', 'À faire'], ['done', 'Faites'], ['all', 'Toutes']];

// Relances : une seule page de travail, comme les autres tableaux (recherche, filtre, cases à cocher, export, ligne
// cliquable vers la fiche). Onglets Contacts et B2B (les stands), Guichets (équipe API-ZF et occupants du Stand API-ZF).
export default function FollowUpsPage({ session, onLogout }) {
  const navigate = useNavigate();
  const isGlobal = isGlobalRole(session.user.role);
  const withGuichets = isApizfTeamRole(accessRole(session.user));
  const [tab, setTab] = useState('contacts');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todo');
  const [exporting, setExporting] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    try {
      const [contacts, b2b, guichets] = await Promise.all([
        api.contactFollowUps(session.token),
        api.b2bFollowUps(session.token),
        withGuichets ? api.guichetFollowUps(session.token) : [],
      ]);
      setData({ contacts: contacts.map(contactRow(isGlobal)), b2b: b2b.map(b2bRow), guichets: guichets.map(guichetRow) });
      setError('');
    } catch (requestError) {
      if (requestError.status === 401) onLogout();
      else setError(requestError.message);
    }
  }, [isGlobal, onLogout, session.token, withGuichets]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeEvent(['contacts', 'b2b', 'investor-requests'], () => { void load(); });

  const query = search.trim().toLowerCase();
  const rows = useMemo(() => ordered((data?.[tab] || []).filter((row) => {
    if (filter === 'todo' && row.item.doneAt) return false;
    if (filter === 'done' && !row.item.doneAt) return false;
    return !query || [row.person, row.detail, row.phone, row.stand, row.item.reason].some((value) => String(value || '').toLowerCase().includes(query));
  })), [data, filter, query, tab]);
  const selection = useRowSelection(rows);
  const { clear } = selection;
  useEffect(() => { clear(); }, [tab, filter]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const complete = (values) => run(() => actions[dialog.row.kind].complete(dialog.row.item, values));
  const remove = () => run(() => actions[dialog.row.kind].remove(dialog.row.item));

  const showStand = tab !== 'guichets' && isGlobal;
  const tabs = [
    ['contacts', 'Contacts'],
    ['b2b', 'B2B'],
    ...(withGuichets ? [['guichets', 'Guichets']] : []),
  ];

  // Exporte les lignes cochées, sinon toutes les lignes affichées.
  const exportRows = async () => {
    setExporting(true);
    try {
      await exportToExcel({
        name: `relances-${tab}`,
        sheetName: 'Relances',
        rows: selection.selected.length ? selection.selected : rows,
        columns: [
          { header: 'Échéance', value: (row) => formatDate(row.item.dueAt), width: 18 },
          { header: 'Contact', value: (row) => row.person, width: 26 },
          { header: tab === 'guichets' ? 'Structure' : tab === 'b2b' ? 'Besoin' : 'Entreprise', value: (row) => row.detail, width: 26 },
          ...(showStand ? [{ header: 'Stand', value: (row) => row.stand, width: 22 }] : []),
          ...(tab === 'guichets' ? [{ header: 'Guichet', value: (row) => row.guichet, width: 16 }] : []),
          { header: 'Téléphone', value: (row) => row.phone, width: 18 },
          { header: 'Motif', value: (row) => row.item.reason, width: 40 },
          { header: 'Faite le', value: (row) => formatDate(row.item.doneAt), width: 18 },
          { header: 'Suite', value: (row) => (row.item.doneAt ? [outcomeLabels[row.item.outcome], row.item.outcomeNote].filter(Boolean).join(' · ') : ''), width: 32 },
        ],
      });
    } finally {
      setExporting(false);
    }
  };

  const checked = selection.selected.length;

  return (
    <main className="admin-workspace">
      <header className="workspace-header">
        <div className="section-heading">
          <h1>Relances</h1>
          <nav className="section-tabs" aria-label="Relances">
            {tabs.map(([key, label]) => {
              const count = dueNow(data?.[key] || []);
              return <button key={key} type="button" className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)} aria-pressed={tab === key}>{label}{count > 0 && <b>{count}</b>}</button>;
            })}
          </nav>
        </div>
      </header>

      <section className="data-panel">
        <header className="data-toolbar">
          <div className="data-toolbar-controls">
            <label className="admin-search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher" aria-label="Rechercher une relance" /></label>
            <span className="data-note">{rows.length} relance{rows.length > 1 ? 's' : ''}</span>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Relances affichées">
              {filters.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <button className="button button-secondary data-export" type="button" onClick={exportRows} disabled={!data || exporting || !rows.length} title={checked ? `Exporter les ${checked} lignes cochées` : 'Exporter tout le tableau'}>
              <Download size={15} /> {exporting ? 'Export…' : 'Exporter'}{checked > 0 && !exporting && ` (${checked})`}
            </button>
          </div>
        </header>
        {error && <p className="panel-message is-error">{error}</p>}
        {!data && !error && <p className="panel-message">Chargement…</p>}
        {data && !rows.length && <p className="panel-message">{query ? 'Aucune relance ne correspond.' : filter === 'done' ? 'Aucune relance faite.' : 'Aucune relance à faire.'}</p>}
        {data && rows.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead><tr>
                <SelectAllHeader selection={selection} />
                <th>Échéance</th>
                <th>Contact</th>
                {showStand && <th>Stand</th>}
                {tab === 'guichets' && <th>Guichet</th>}
                <th>Motif</th>
                <th>Téléphone</th>
                <th className="actions-heading">Actions</th>
              </tr></thead>
              <tbody>
                {rows.map((row) => {
                  const { item } = row;
                  const state = item.doneAt ? null : dueState(item.dueAt);
                  return (
                    <tr key={row.id} className={`is-link${state ? ` is-due-${state}` : ''}${item.doneAt ? ' is-muted' : ''}`} onClick={() => navigate(row.to)}>
                      <SelectCell selection={selection} id={row.id} />
                      <td className={`stand-nowrap investor-due${state ? ` is-${state}` : ''}`}>
                        {state && <AlarmClock size={14} aria-hidden="true" />}{state === 'late' && 'En retard · '}{dueLabel(item.dueAt)}
                        <small>{item.doneAt ? `Faite le ${dateTime.format(new Date(item.doneAt))}` : autoLabel(item) || fullName(item.createdBy)}</small>
                      </td>
                      <td><strong>{row.person}</strong>{row.detail && <small>{row.detail}</small>}</td>
                      {showStand && <td>{row.stand || '—'}</td>}
                      {tab === 'guichets' && <td className="stand-nowrap">{row.guichet || '—'}</td>}
                      <td className="meeting-note-cell">{item.reason}{item.doneAt && <small>{[outcomeLabels[item.outcome], item.outcomeNote].filter(Boolean).join(' · ')}</small>}</td>
                      <td className="stand-nowrap" onClick={(event) => event.stopPropagation()}>{row.phone ? <a className="cell-link" href={`tel:${row.phone}`}>{row.phone}</a> : '—'}</td>
                      <ActionsCell>
                        <RowMenu label="Actions de la relance" items={[
                          { label: 'Marquer faite', onClick: () => setDialog({ type: 'complete', row }), disabled: Boolean(item.doneAt), hint: 'Relance déjà faite' },
                          { label: 'Supprimer', onClick: () => setDialog({ type: 'delete', row }), danger: true },
                        ]} />
                      </ActionsCell>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {dialog?.type === 'complete' && <CompleteFollowUpForm request={{ fullName: dialog.row.person }} followUp={dialog.row.item} loading={busy} error={actionError} onClose={close} onSave={complete} />}
      {dialog?.type === 'delete' && <ConfirmDelete subject={{ label: `la relance de ${dialog.row.person}` }} loading={busy} error={actionError} onCancel={close} onConfirm={remove} />}
    </main>
  );
}
