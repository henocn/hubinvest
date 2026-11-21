import { useCallback, useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';
import ConfirmDelete from '../components/ConfirmDelete';
import RowMenu from '../components/RowMenu';

// Les cinq étapes « Investir au Togo en 5 étapes » et les domaines des démarches (document v4, § 02).
export const serviceStages = { 1: 'S’informer', 2: 'Structurer son projet', 3: 'Choisir son régime', 4: 'S’implanter', 5: 'Développer ses activités' };
export const procedureDomains = { free_zone: 'Zone Franche', investment_code: 'Code des investissements', blue_book: 'Carnet Bleu' };

function Modal({ title, error, loading, submitLabel, onClose, onSubmit, children }) {
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="service-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div><span className="eyebrow">Services</span><h2 id="service-modal-title">{title}</h2></div>
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

function ServiceForm({ item, loading, error, onClose, onSave }) {
  const [form, setForm] = useState({
    title: item?.title || '',
    stage: String(item?.stage || 1),
    promise: item?.promise || '',
    place: item?.place || '',
    limited: Boolean(item?.limited),
  });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.type === 'checkbox' ? event.target.checked : event.target.value });
  return (
    <Modal title={item ? 'Modifier le service' : 'Ajouter un service'} error={error} loading={loading} submitLabel="Enregistrer" onClose={onClose}
      onSubmit={() => onSave({ title: form.title, stage: Number(form.stage), promise: form.promise, place: form.place || null, limited: form.limited })}>
      <label>Service<input value={form.title} onChange={set('title')} minLength={2} maxLength={120} required /></label>
      <label>Étape du parcours<select value={form.stage} onChange={set('stage')}>{Object.entries(serviceStages).map(([value, label]) => <option key={value} value={value}>{value} · {label}</option>)}</select></label>
      <label>Promesse au visiteur<textarea value={form.promise} onChange={set('promise')} minLength={2} maxLength={600} rows={3} required /></label>
      <label>Où le vivre à la Foire<input value={form.place} onChange={set('place')} maxLength={240} /></label>
      <label className="checkbox-field"><input type="checkbox" checked={form.limited} onChange={set('limited')} /> Selon disponibilités</label>
    </Modal>
  );
}

function ProcedureForm({ item, loading, error, onClose, onSave }) {
  const [form, setForm] = useState({ title: item?.title || '', domain: item?.domain || 'free_zone', url: item?.url || '' });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  return (
    <Modal title={item ? 'Modifier la démarche' : 'Ajouter une démarche'} error={error} loading={loading} submitLabel="Enregistrer" onClose={onClose}
      onSubmit={() => onSave({ title: form.title, domain: form.domain, url: form.url || null })}>
      <label>Démarche<input value={form.title} onChange={set('title')} minLength={2} maxLength={200} required /></label>
      <label>Domaine<select value={form.domain} onChange={set('domain')}>{Object.entries(procedureDomains).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Lien vers la plateforme officielle<input type="url" value={form.url} onChange={set('url')} placeholder="https://" maxLength={500} /></label>
    </Modal>
  );
}

// Menu d'une ligne : modifier, déplacer, publier ou masquer, supprimer.
const rowItems = ({ item, index, items, onEdit, onMove, onToggle, onDelete }) => [
  { label: 'Modifier', onClick: onEdit },
  { label: 'Monter', onClick: () => onMove(index, -1), disabled: index === 0 },
  { label: 'Descendre', onClick: () => onMove(index, 1), disabled: index === items.length - 1 },
  { label: item.published ? 'Masquer du site' : 'Publier sur le site', onClick: onToggle },
  { label: 'Supprimer', onClick: onDelete, danger: true },
];

// Les six services de l'API-ZF et les douze démarches en ligne, affichés à l'accueil « Nos services » (document v4, M1 et M9).
export default function ServicesPage({ session, onLogout }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await api.services(session.token));
      setError('');
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
      else setError(requestError.message);
    }
  }, [onLogout, session.token]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeEvent('services', () => { void load(); });

  const run = async (work) => {
    setBusy(true);
    setActionError('');
    try {
      await work();
      setDialog(null);
      await load();
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const open = (type, kind, item = null) => { setActionError(''); setDialog({ type, kind, item }); };
  const save = (kind, item) => (values) => run(() => (item ? api.updateServiceItem(session.token, kind, item.id, values) : api.createServiceItem(session.token, kind, values)));
  const move = (kind, items) => (index, step) => {
    const ids = items.map((item) => item.id);
    [ids[index], ids[index + step]] = [ids[index + step], ids[index]];
    void run(() => api.reorderServiceItems(session.token, kind, ids));
  };
  const toggle = (kind, item) => () => { void run(() => api.updateServiceItem(session.token, kind, item.id, { published: !item.published })); };

  const services = data?.services || [];
  const procedures = data?.procedures || [];

  return (
    <main className="admin-workspace">
      <header className="workspace-header"><h1>Services</h1></header>
      {error && <p className="admin-form-error">{error}</p>}
      {actionError && !dialog && <p className="admin-form-error">{actionError}</p>}
      {!data && !error && <p className="panel-message">Chargement…</p>}
      {data && (
        <>
          <section className="data-panel settings-panel">
            <header className="settings-panel-head">
              <h2>Services de l’API-ZF<span>{services.length}</span></h2>
              <button className="button button-secondary" type="button" onClick={() => open('form', 'services')}><Plus size={15} /> Service</button>
            </header>
            <div className="table-scroll">
              <table>
                <thead><tr><th>Étape</th><th>Service</th><th>Où le vivre</th><th className="actions-heading">Actions</th></tr></thead>
                <tbody>{services.map((item, index) => (
                  <tr key={item.id} className={item.published ? '' : 'is-muted'}>
                    <td className="stand-nowrap">{item.stage} · {serviceStages[item.stage]}</td>
                    <td><strong>{item.title}</strong>{!item.published ? <small>Masqué du site</small> : item.limited && <small>Selon disponibilités</small>}</td>
                    <td>{item.place || '—'}</td>
                    <td><RowMenu label={`Actions pour ${item.title}`} items={rowItems({
                      item, index, items: services,
                      onEdit: () => open('form', 'services', item),
                      onMove: move('services', services),
                      onToggle: toggle('services', item),
                      onDelete: () => open('delete', 'services', item),
                    })} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>

          <section className="data-panel settings-panel">
            <header className="settings-panel-head">
              <h2>Démarches en ligne<span>{procedures.length}</span></h2>
              <button className="button button-secondary" type="button" onClick={() => open('form', 'procedures')}><Plus size={15} /> Démarche</button>
            </header>
            <div className="table-scroll">
              <table>
                <thead><tr><th>N°</th><th>Démarche</th><th>Domaine</th><th>Lien</th><th className="actions-heading">Actions</th></tr></thead>
                <tbody>{procedures.map((item, index) => (
                  <tr key={item.id} className={item.published ? '' : 'is-muted'}>
                    <td>{index + 1}</td>
                    <td><strong>{item.title}</strong>{!item.published && <small>Masquée du site</small>}</td>
                    <td className="stand-nowrap">{procedureDomains[item.domain]}</td>
                    <td>{item.url ? <a href={item.url} target="_blank" rel="noreferrer">Ouvrir</a> : '—'}</td>
                    <td><RowMenu label={`Actions pour ${item.title}`} items={rowItems({
                      item, index, items: procedures,
                      onEdit: () => open('form', 'procedures', item),
                      onMove: move('procedures', procedures),
                      onToggle: toggle('procedures', item),
                      onDelete: () => open('delete', 'procedures', item),
                    })} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {dialog?.type === 'form' && dialog.kind === 'services' && <ServiceForm item={dialog.item} loading={busy} error={actionError} onClose={() => setDialog(null)} onSave={save('services', dialog.item)} />}
      {dialog?.type === 'form' && dialog.kind === 'procedures' && <ProcedureForm item={dialog.item} loading={busy} error={actionError} onClose={() => setDialog(null)} onSave={save('procedures', dialog.item)} />}
      {dialog?.type === 'delete' && (
        <ConfirmDelete subject={{ label: `« ${dialog.item.title} »` }} loading={busy} error={actionError} onCancel={() => setDialog(null)}
          onConfirm={() => run(() => api.deleteServiceItem(session.token, dialog.kind, dialog.item.id))} />
      )}
    </main>
  );
}
