import { useCallback, useEffect, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { api } from '../lib/api';
import { exportToExcel, formatDate } from '../../lib/excel';
import { roleLabels } from '../../navigation';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });

// Journal des actions (super administrateur) : qui a fait quoi, où et quand dans l'espace équipe, le plus récent
// d'abord. Les 1 000 dernières actions sont chargées ; la recherche porte sur le compte, la rubrique, l'action, l'élément.
export default function AuditLogPage({ session, onLogout }) {
  const [logs, setLogs] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.auditLogs(session.token);
      setLogs(data.items);
      setTotal(data.total);
      setError('');
    } catch (requestError) {
      if (requestError.status === 401) onLogout();
      else setError(requestError.message);
    }
  }, [onLogout, session.token]);

  useEffect(() => { void load(); }, [load]);

  const term = search.trim().toLowerCase();
  const rows = (logs || []).filter((item) => !term || [item.userName, item.section, item.action, item.target].filter(Boolean).some((value) => value.toLowerCase().includes(term)));
  const exportRows = () => exportToExcel({
    name: 'journal-des-actions',
    sheetName: 'Journal',
    rows,
    columns: [
      { header: 'Date et heure', value: (item) => formatDate(item.createdAt), width: 20 },
      { header: 'Compte', value: (item) => item.userName, width: 26 },
      { header: 'Rôle', value: (item) => roleLabels[item.userRole] || item.userRole, width: 20 },
      { header: 'Rubrique', value: (item) => item.section, width: 18 },
      { header: 'Action', value: (item) => item.action, width: 30 },
      { header: 'Élément', value: (item) => item.target, width: 30 },
    ],
  });

  return (
    <main className="admin-workspace">
      <header className="workspace-header"><h1>Journal des actions</h1></header>
      <section className="data-panel">
        <header className="data-toolbar">
          <div className="data-toolbar-controls">
            <label className="admin-search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher" aria-label="Rechercher dans le journal" /></label>
            {logs && total > logs.length && <span className="data-note">Les {logs.length} dernières actions sur {total}</span>}
            <button className="button button-secondary data-export" type="button" onClick={exportRows} disabled={!rows.length}><Download size={15} /> Exporter</button>
            <button className="button button-secondary" type="button" onClick={() => { void load(); }}>Actualiser</button>
          </div>
        </header>
        {error && <p className="panel-message is-error">{error}</p>}
        {!logs && !error && <p className="panel-message">Chargement…</p>}
        {logs && !rows.length && <p className="panel-message">{logs.length ? 'Aucune action ne correspond.' : 'Aucune action enregistrée.'}</p>}
        {rows.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Date et heure</th><th>Compte</th><th>Rubrique</th><th>Action</th><th>Élément</th></tr></thead>
              <tbody>{rows.map((item) => (
                <tr key={item.id}>
                  <td className="stand-nowrap">{dateTime.format(new Date(item.createdAt))}</td>
                  <td><strong>{item.userName}</strong><small>{roleLabels[item.userRole] || item.userRole}</small></td>
                  <td>{item.section}</td>
                  <td>{item.action}</td>
                  <td>{item.target || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
