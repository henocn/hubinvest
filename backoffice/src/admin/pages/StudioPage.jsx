import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clapperboard, Plus, Search, X } from 'lucide-react';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';
import { publicBaseUrl, studioStatusLabels } from '../constants/access';
import ConfirmDelete from '../components/ConfirmDelete';
import EmptyState from '../components/EmptyState';
import RowMenu from '../components/RowMenu';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const statusClass = { invited: ' is-new', booked: ' is-active', delivered: ' is-done', declined: ' is-lost', cancelled: '' };
const studioLink = (invitation) => `${publicBaseUrl}/studio/${invitation.token}`;
const isOpen = (invitation) => ['invited', 'booked'].includes(invitation.status);

function Modal({ eyebrow, title, error, loading, submitLabel, onClose, onSubmit, children }) {
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="studio-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div><span className="eyebrow">{eyebrow}</span><h2 id="studio-modal-title">{title}</h2></div>
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

// Invitation personnelle : l'invité reçoit son lien par e-mail et choisit lui-même son créneau.
function InvitationForm({ invitation, formats, occupants, fixedOccupant, loading, error, onClose, onSave }) {
  const [form, setForm] = useState({
    guestName: invitation?.guestName || '',
    email: invitation?.email || '',
    phone: invitation?.phone || '',
    organization: invitation?.organization || '',
    format: invitation?.format || formats[0]?.key || '',
    subject: invitation?.subject || '',
    language: invitation?.language || 'fr',
    occupantId: invitation?.occupantId || '',
  });
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const submit = () => onSave({
    guestName: form.guestName,
    email: form.email,
    phone: form.phone || null,
    organization: form.organization || null,
    format: form.format,
    subject: form.subject || null,
    language: form.language,
    ...(!fixedOccupant && { occupantId: form.occupantId || null }),
  });
  return (
    <Modal eyebrow="Studio" title={invitation ? 'Modifier l’invitation' : 'Inviter au Studio'} error={error} loading={loading} submitLabel={invitation ? 'Enregistrer' : 'Envoyer l’invitation'} onClose={onClose} onSubmit={submit}>
      <label>Nom et prénom<input value={form.guestName} onChange={set('guestName')} minLength={2} maxLength={160} required /></label>
      <div className="field-row">
        <label>E-mail<input type="email" value={form.email} onChange={set('email')} maxLength={180} required /></label>
        <label>Téléphone<input type="tel" value={form.phone} onChange={set('phone')} minLength={6} maxLength={32} /></label>
      </div>
      <div className="field-row">
        <label>Format<select value={form.format} onChange={set('format')}>{formats.map((format) => <option key={format.key} value={format.key}>{format.label}</option>)}</select></label>
        <label>Langue des e-mails<select value={form.language} onChange={set('language')}><option value="fr">Français</option><option value="en">Anglais</option></select></label>
      </div>
      {fixedOccupant
        ? <p className="field-hint">Invitation pour {fixedOccupant.name}.</p>
        : <label>Stand<select value={form.occupantId} onChange={set('occupantId')}><option value="">Aucun (invité de l’API-ZF)</option>{occupants.map((occupant) => <option key={occupant.id} value={occupant.id}>{occupant.name}</option>)}</select></label>}
      <label>Structure<input value={form.organization} onChange={set('organization')} maxLength={160} /></label>
      <label>Sujet<input value={form.subject} onChange={set('subject')} maxLength={180} /></label>
      {!invitation && <p className="field-hint">L’invité reçoit un e-mail avec son lien personnel pour choisir son créneau, puis des rappels la veille et une heure avant.</p>}
    </Modal>
  );
}

function DeliverForm({ invitation, loading, error, onClose, onSave }) {
  const [url, setUrl] = useState(invitation.capsuleUrl || '');
  return (
    <Modal eyebrow={invitation.guestName} title="Livrer la capsule" error={error} loading={loading} submitLabel="Envoyer à l’invité" onClose={onClose} onSubmit={() => onSave(url)}>
      <label>Lien de la capsule<input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" maxLength={500} required /></label>
      <p className="field-hint">L’invité reçoit ce lien par e-mail, avec sa capsule prête à partager.</p>
    </Modal>
  );
}

function ConfirmCancel({ invitation, loading, error, onCancel, onConfirm }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="studio-cancel-title" onMouseDown={(event) => event.stopPropagation()}>
        <div>
          <h2 id="studio-cancel-title">Annuler le passage</h2>
          <p>L’invitation de {invitation.guestName} est annulée{invitation.status === 'booked' ? ` ; son créneau du ${dateTime.format(new Date(invitation.scheduledAt))} est libéré et il en est prévenu par e-mail` : ''}.</p>
        </div>
        {error && <p className="admin-form-error dialog-error">{error}</p>}
        <footer>
          <button className="button button-secondary" type="button" onClick={onCancel} disabled={loading}>Retour</button>
          <button className="button button-danger" type="button" onClick={onConfirm} disabled={loading}>{loading ? 'Enregistrement…' : 'Annuler le passage'}</button>
        </footer>
      </section>
    </div>
  );
}

// Studio (document, module M5) : invitations personnelles, créneaux choisis par les invités, rappels automatiques,
// livraison des capsules. Un administrateur de stand ne voit et n'invite que pour son stand.
export default function StudioPage({ session, onLogout }) {
  const isSuperAdmin = session.user.role === 'super-admin';
  const [invitations, setInvitations] = useState(null);
  const [formats, setFormats] = useState([]);
  const [occupants, setOccupants] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    try {
      const [data, formatData, occupantData] = await Promise.all([
        api.studioInvitations(session.token),
        api.studioFormats(session.token),
        isSuperAdmin ? api.occupants(session.token) : Promise.resolve([]),
      ]);
      setInvitations(data);
      setFormats(formatData);
      setOccupants(occupantData);
      setError('');
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
      else setError(requestError.message);
    }
  }, [isSuperAdmin, onLogout, session.token]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeEvent('studio', () => { void load(); });

  const open = (type, item = null) => {
    setActionError('');
    setDialog({ type, item });
  };
  const close = () => setDialog(null);

  const run = async (work, message = '') => {
    setBusy(true);
    setActionError('');
    try {
      await work();
      setDialog(null);
      await load();
      if (message) {
        setNotice(message);
        window.setTimeout(() => setNotice((current) => (current === message ? '' : current)), 2500);
      }
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (invitation) => {
    try {
      await navigator.clipboard.writeText(studioLink(invitation));
      setNotice(`Lien de ${invitation.guestName} copié.`);
    } catch {
      setNotice(studioLink(invitation));
    }
  };

  const formatLabel = (key) => formats.find((format) => format.key === key)?.label || key;
  const query = search.trim().toLowerCase();
  const rows = useMemo(() => (invitations || []).filter((item) => !query || [item.guestName, item.email, item.organization, item.occupant?.name, item.subject]
    .some((value) => String(value || '').toLowerCase().includes(query))), [invitations, query]);
  const counts = (invitations || []).reduce((result, item) => ({ ...result, [item.status]: (result[item.status] || 0) + 1 }), {});

  return (
    <main className="admin-workspace">
      <header className="workspace-header">
        <h1>Studio</h1>
        <div className="workspace-actions">
          <button className="button button-primary" type="button" onClick={() => open('form')}><Plus size={16} /> Invitation</button>
        </div>
      </header>

      <section className="data-panel">
        <header className="data-toolbar">
          <div className="data-toolbar-controls">
            <label className="admin-search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher" aria-label="Rechercher un invité" /></label>
            {invitations && <span className="data-note">{counts.invited || 0} à choisir · {counts.booked || 0} réservé{(counts.booked || 0) > 1 ? 's' : ''} · {counts.delivered || 0} capsule{(counts.delivered || 0) > 1 ? 's' : ''} livrée{(counts.delivered || 0) > 1 ? 's' : ''}</span>}
          </div>
        </header>
        {notice && <p className="panel-message" role="status">{notice}</p>}
        {actionError && !dialog && <p className="panel-message is-error" role="alert">{actionError}</p>}
        {error && <p className="panel-message is-error">{error}</p>}
        {!invitations && !error && <p className="panel-message">Chargement…</p>}
        {invitations && !rows.length && <EmptyState icon={Clapperboard} title="Aucune invitation" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Invitez les dirigeants et intervenants : chacun choisit son créneau au Studio.'} />}
        {rows.length > 0 && (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Invité</th><th>Format</th><th>Créneau</th><th>Statut</th><th className="actions-heading">Actions</th></tr></thead>
              <tbody>{rows.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.guestName}</strong><small>{item.organization || item.occupant?.name || item.email}</small></td>
                  <td>{formatLabel(item.format)}{item.subject && <small>{item.subject}</small>}</td>
                  <td className="stand-nowrap">{item.scheduledAt ? dateTime.format(new Date(item.scheduledAt)) : '—'}</td>
                  <td><span className={`status-pill${statusClass[item.status] || ''}`}>{studioStatusLabels[item.status]}</span></td>
                  <td><RowMenu label={`Actions pour ${item.guestName}`} items={[
                    { label: 'Copier le lien de l’invité', onClick: () => { void copyLink(item); }, disabled: !isOpen(item), hint: 'Invitation fermée' },
                    { label: 'Renvoyer l’invitation', onClick: () => { void run(() => api.resendStudioInvitation(session.token, item.id), `Invitation renvoyée à ${item.email}.`); }, disabled: !isOpen(item) || !item.email, hint: 'Invitation fermée' },
                    { label: item.status === 'delivered' ? 'Renvoyer la capsule' : 'Livrer la capsule', onClick: () => open('deliver', item), disabled: !['booked', 'delivered'].includes(item.status), hint: 'Après la réservation du créneau' },
                    { label: 'Modifier', onClick: () => open('form', item) },
                    { label: 'Annuler le passage', onClick: () => open('cancel', item), disabled: !isOpen(item), hint: 'Invitation déjà fermée' },
                    { label: 'Supprimer', onClick: () => open('delete', item), danger: true },
                  ]} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {dialog?.type === 'form' && <InvitationForm invitation={dialog.item} formats={formats} occupants={occupants} fixedOccupant={isSuperAdmin ? null : session.user.occupant} loading={busy} error={actionError} onClose={close}
        onSave={(values) => run(() => (dialog.item ? api.updateStudioInvitation(session.token, dialog.item.id, values) : api.createStudioInvitation(session.token, values)), dialog.item ? '' : `Invitation envoyée à ${values.email}.`)} />}
      {dialog?.type === 'deliver' && <DeliverForm invitation={dialog.item} loading={busy} error={actionError} onClose={close} onSave={(url) => run(() => api.deliverStudioCapsule(session.token, dialog.item.id, url), `Capsule envoyée à ${dialog.item.guestName}.`)} />}
      {dialog?.type === 'cancel' && <ConfirmCancel invitation={dialog.item} loading={busy} error={actionError} onCancel={close} onConfirm={() => run(() => api.cancelStudioInvitation(session.token, dialog.item.id))} />}
      {dialog?.type === 'delete' && <ConfirmDelete subject={{ label: `l’invitation de ${dialog.item.guestName} (sans prévenir l’invité : pour le décommander, annulez son passage)` }} loading={busy} error={actionError} onCancel={close} onConfirm={() => run(() => api.deleteStudioInvitation(session.token, dialog.item.id))} />}
    </main>
  );
}
