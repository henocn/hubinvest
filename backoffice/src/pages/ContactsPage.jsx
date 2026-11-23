import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Clock3, Cloud, Download, Pencil, Phone, Plus, RefreshCw, Search, UserRound } from 'lucide-react';
import { api } from '../lib/api';
import { exportToExcel, formatDate } from '../lib/excel';
import { isValidPhone, toInternationalPhone } from '../lib/phone';
import { useRealtimeEvent } from '../lib/realtime';
import { listStoredContacts, mergeServerContacts, queueContact, syncPendingContacts } from '../lib/contact-store';
import PhoneInputField from '../components/PhoneInputField';

// Qualification des contacts du stand, sur le modèle de l'Investor Desk (document : A sous 48 h, B sous 7 jours, C à nourrir).
const qualificationLabels = {
  A: 'A · Prioritaire',
  B: 'B · À suivre',
  C: 'C · À nourrir',
};

const qualificationHints = {
  A: 'Besoin concret : recontacter sous 48 h',
  B: 'Intérêt réel : recontacter sous 7 jours',
  C: 'Simple curiosité : garder pour les informations futures',
};

// Contacts encore stockés hors ligne avec l'ancienne qualification (chaud, tiède, froid).
const normalizeQualification = (value) => ({ hot: 'A', warm: 'B', cold: 'C' })[value] || value;
const qualificationLabel = (value) => qualificationLabels[normalizeQualification(value)] || 'À qualifier';

const toLocalDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

function ContactForm({ onCancel, onCreated }) {
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    company: '',
    need: '',
    qualification: 'C',
    nextAction: '',
    nextActionAt: '',
    consentOccupant: false,
    consentApizf: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const field = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!isValidPhone(form.phone)) {
      setError('Numéro invalide. Ajoutez l’indicatif pour un numéro étranger (ex. +33…).');
      return;
    }
    setLoading(true);
    setError('');

    try {
      await onCreated({
        ...form,
        phone: toInternationalPhone(form.phone),
        id: crypto.randomUUID(),
        nextActionAt: form.nextActionAt || null,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="workspace contact-form-view">
      <button type="button" className="back-button" onClick={onCancel}>
        <ArrowLeft size={18} />
        Mes contacts
      </button>
      <div className="page-heading">
        <h1>Nouveau contact</h1>
        <p>Les informations utiles pour assurer la prochaine action.</p>
      </div>

      <form className="form-stack" onSubmit={submit}>
        <label>
          Nom complet
          <input value={form.fullName} onChange={(event) => field('fullName', event.target.value)} required />
        </label>
        <PhoneInputField label="Numéro de téléphone" value={form.phone} onChange={(phone) => field('phone', phone)} required />
        <label>
          Entreprise
          <input value={form.company} onChange={(event) => field('company', event.target.value)} />
        </label>
        <label>
          Ce que la personne recherche
          <textarea value={form.need} onChange={(event) => field('need', event.target.value)} rows={3} />
        </label>
        <fieldset>
          <legend>Qualification</legend>
          <div className="qualification-options">
            {Object.entries(qualificationLabels).map(([value, label]) => (
              <label key={value} className={`qualification-option ${value}`}>
                <input
                  type="radio"
                  name="qualification"
                  value={value}
                  checked={form.qualification === value}
                  onChange={() => field('qualification', value)}
                />
                <span><strong>{label}</strong><small>{qualificationHints[value]}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          Prochaine action
          <input value={form.nextAction} onChange={(event) => field('nextAction', event.target.value)} />
        </label>
        <label>
          Date de la prochaine action
          <input
            type="datetime-local"
            value={form.nextActionAt}
            onChange={(event) => field('nextActionAt', event.target.value)}
          />
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.consentOccupant}
            onChange={(event) => field('consentOccupant', event.target.checked)}
            required
          />
          <span>La personne accepte d’être recontactée par cet occupant.</span>
        </label>
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.consentApizf}
            onChange={(event) => field('consentApizf', event.target.checked)}
          />
          <span>La personne accepte de recevoir les informations de l'API-ZF.</span>
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" className="button button-secondary" onClick={onCancel}>
            Annuler
          </button>
          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer le contact'}
          </button>
        </div>
      </form>
    </section>
  );
}

function ContactDetail({ contact, onBack, onSave, apiOnline }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [form, setForm] = useState(() => ({
    qualification: normalizeQualification(contact.qualification) || '',
    nextAction: contact.nextAction || '',
    nextActionAt: toLocalDateTime(contact.nextActionAt),
  }));
  useEffect(() => {
    setForm({
      qualification: normalizeQualification(contact.qualification) || '',
      nextAction: contact.nextAction || '',
      nextActionAt: toLocalDateTime(contact.nextActionAt),
    });
  }, [contact.id, contact.qualification, contact.nextAction, contact.nextActionAt]);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setEditError('');
    try {
      await onSave(contact.id, {
        ...(form.qualification ? { qualification: form.qualification } : {}),
        nextAction: form.nextAction || null,
        nextActionAt: form.nextActionAt ? new Date(form.nextActionAt).toISOString() : null,
      });
      setEditing(false);
    } catch (requestError) {
      setEditError(requestError.message);
    } finally {
      setSaving(false);
    }
  };
  const dialNumber = contact.phone?.replace(/[^\d+]/g, '');
  const nextActionDate = contact.nextActionAt ? new Date(contact.nextActionAt) : null;
  const formattedDate = nextActionDate && !Number.isNaN(nextActionDate.getTime())
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(nextActionDate)
    : null;

  return (
    <section className="workspace contact-detail-view">
      <button type="button" className="back-button" onClick={onBack}>
        <ArrowLeft size={18} />
        Mes contacts
      </button>

      <div className="detail-heading">
        <div>
          <h1>{contact.fullName}</h1>
          <span className={`qualification-label ${normalizeQualification(contact.qualification) || 'unqualified'}`} title={qualificationHints[normalizeQualification(contact.qualification)]}>
            {contact.qualification && <Check size={14} />}
            {qualificationLabel(contact.qualification)}
          </span>
        </div>
        {dialNumber && (
          <a className="button button-primary" href={`tel:${dialNumber}`}>
            <Phone size={18} />
            Appeler
          </a>
        )}
      </div>

      <div className="detail-panel">
        <dl className="detail-fields">
          {contact.source === 'public' && <div><dt>Origine</dt><dd>Demande envoyée depuis la fiche du stand</dd></div>}
          <div><dt>Téléphone</dt><dd>{contact.phone}</dd></div>
          {contact.company && <div><dt>Entreprise</dt><dd>{contact.company}</dd></div>}
          {contact.need && <div><dt>Recherche</dt><dd>{contact.need}</dd></div>}
          {(contact.nextAction || formattedDate) && (
            <div>
              <dt>Prochaine action</dt>
              <dd>{contact.nextAction || 'Date planifiée'}{formattedDate && <small>{formattedDate}</small>}</dd>
            </div>
          )}
        </dl>
        <div className="detail-sync">
          {contact.syncStatus === 'pending' && <><Clock3 size={16} /> Enregistré sur ce téléphone · À synchroniser</>}
          {contact.syncStatus === 'syncing' && <><RefreshCw size={16} /> Synchronisation en cours</>}
          {(contact.syncStatus === 'synced' || !contact.syncStatus) && <><Cloud size={16} /> Synchronisé</>}
        </div>
        {contact.syncError && <p className="detail-error">Synchronisation impossible. Revenez à Mes contacts pour réessayer.</p>}
      </div>
      <div className="detail-follow-up">
        {!editing && <button className="button button-secondary" type="button" onClick={() => setEditing(true)} disabled={!apiOnline || contact.syncStatus === 'pending' || contact.syncStatus === 'syncing'}><Pencil size={17} /> Modifier le suivi</button>}
        {editing && (
          <form className="form-stack" onSubmit={save}>
            <label>Qualification
              <select value={form.qualification} onChange={(event) => setForm({ ...form, qualification: event.target.value })}>
                <option value="">À qualifier</option>
                {Object.entries(qualificationLabels).map(([value, label]) => <option key={value} value={value}>{label} ({qualificationHints[value].split(' : ')[1]})</option>)}
              </select>
            </label>
            <label>Prochaine action<input value={form.nextAction} onChange={(event) => setForm({ ...form, nextAction: event.target.value })} maxLength={255} /></label>
            <label>Date de la prochaine action<input type="datetime-local" value={form.nextActionAt} onChange={(event) => setForm({ ...form, nextActionAt: event.target.value })} /></label>
            {editError && <p className="form-error">{editError}</p>}
            <div className="form-actions">
              <button className="button button-secondary" type="button" onClick={() => { setEditing(false); setEditError(''); }}>Annuler</button>
              <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

// Carnet de contacts du stand : liste (/contacts), nouveau contact (/contacts/nouveau) et fiche (/contacts/:id).
// Les contacts sont d'abord enregistrés sur le téléphone, puis synchronisés dès que le réseau revient.
export default function ContactsPage({ session, onLogout }) {
  const navigate = useNavigate();
  const subPath = (useParams()['*'] || '').replace(/\/$/, '');
  const view = !subPath ? 'list' : subPath === 'nouveau' ? 'new' : 'detail';
  const contactId = view === 'detail' ? subPath : null;
  const [apiOnline, setApiOnline] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const occupantId = session.user.occupantId;

  // Vérifie que l'API répond ; sans réseau, le carnet reste lisible et la saisie continue sur le téléphone.
  useEffect(() => {
    const checkApi = () => {
      if (!navigator.onLine) {
        setApiOnline(false);
        return;
      }
      api.health().then(() => setApiOnline(true)).catch(() => setApiOnline(false));
    };
    checkApi();
    window.addEventListener('online', checkApi);
    window.addEventListener('offline', checkApi);
    return () => {
      window.removeEventListener('online', checkApi);
      window.removeEventListener('offline', checkApi);
    };
  }, []);

  const readLocal = useCallback(async () => {
    const stored = await listStoredContacts(occupantId);
    setContacts(stored);
    return stored;
  }, [occupantId]);

  const sync = useCallback(async () => {
    setError('');

    if (!navigator.onLine) {
      setApiOnline(false);
      await readLocal();
      setLoading(false);
      return;
    }

    try {
      await syncPendingContacts(occupantId, (contact) => api.createContact(session.token, contact));
      const contactData = await api.contacts(session.token);
      await mergeServerContacts(occupantId, contactData.items);
      await readLocal();
      setApiOnline(true);
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) {
        onLogout();
        return;
      }
      if (!requestError.status) setApiOnline(false);
      setError(requestError.message);
      await readLocal();
    } finally {
      setLoading(false);
    }
  }, [occupantId, onLogout, readLocal, session.token]);

  useEffect(() => {
    let active = true;
    listStoredContacts(occupantId).then((stored) => {
      if (!active) return;
      setContacts(stored);
      setLoading(false);
    });
    return () => { active = false; };
  }, [occupantId]);

  useEffect(() => {
    if (apiOnline) sync();
  }, [apiOnline, sync]);

  // Au retour sur l'application, les contacts saisis hors ligne partent et la liste se met à jour.
  useEffect(() => {
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void sync();
    };
    document.addEventListener('visibilitychange', syncWhenVisible);
    window.addEventListener('online', syncWhenVisible);
    return () => {
      document.removeEventListener('visibilitychange', syncWhenVisible);
      window.removeEventListener('online', syncWhenVisible);
    };
  }, [sync]);

  // Une demande du site ou une saisie depuis un autre téléphone du stand apparaît sans actualiser.
  useRealtimeEvent('contacts', () => {
    if (navigator.onLine) void sync();
  });

  const createContact = async (values) => {
    const queued = await queueContact(occupantId, values);
    await readLocal();
    navigate(`/contacts/${queued.id}`, { replace: true });
    if (apiOnline) sync();
  };

  const updateContact = async (id, values) => {
    const saved = await api.updateContact(session.token, id, values);
    await mergeServerContacts(occupantId, [saved]);
    await readLocal();
  };

  if (view === 'new') {
    return <ContactForm onCancel={() => navigate('/contacts')} onCreated={createContact} />;
  }

  if (view === 'detail') {
    const selectedContact = contacts.find((contact) => contact.id === contactId);
    if (selectedContact) {
      return <ContactDetail contact={selectedContact} onBack={() => navigate('/contacts')} onSave={updateContact} apiOnline={apiOnline} />;
    }
    return (
      <main className="workspace">
        {loading ? <p className="empty-state">Chargement du contact...</p> : (
          <div className="empty-state">
            <UserRound size={28} />
            <strong>Contact introuvable</strong>
            <Link to="/contacts">Retour aux contacts</Link>
          </div>
        )}
      </main>
    );
  }

  const filteredContacts = contacts.filter((contact) => {
    const value = search.toLowerCase();
    return [contact.fullName, contact.phone, contact.company]
      .filter(Boolean)
      .some((item) => item.toLowerCase().includes(value));
  });

  const stats = contacts.reduce((result, contact) => {
    result.total += 1;
    if (contact.qualification) result.byQualification[normalizeQualification(contact.qualification)] += 1;
    else result.unqualified += 1;
    return result;
  }, { total: 0, unqualified: 0, byQualification: { A: 0, B: 0, C: 0 } });
  const pendingCount = contacts.filter((contact) => contact.syncStatus !== 'synced').length;

  // Le carnet du stand en Excel : les contacts affichés (après recherche), même ceux pas encore synchronisés.
  const exportContacts = () => exportToExcel({
    name: 'contacts',
    sheetName: 'Contacts',
    rows: filteredContacts,
    columns: [
      { header: 'Enregistré le', value: (item) => formatDate(item.createdAt), width: 18 },
      { header: 'Nom', value: (item) => item.fullName, width: 28 },
      { header: 'Téléphone', value: (item) => item.phone, width: 18 },
      { header: 'Entreprise', value: (item) => item.company, width: 26 },
      { header: 'Recherche', value: (item) => item.need, width: 45 },
      { header: 'Qualification', value: (item) => qualificationLabel(item.qualification), width: 14 },
      { header: 'Prochaine action', value: (item) => item.nextAction, width: 32 },
      { header: 'Date de l’action', value: (item) => formatDate(item.nextActionAt), width: 18 },
      { header: 'Origine', value: (item) => (item.source === 'public' ? 'Demande du site' : 'Saisi sur le stand'), width: 18 },
      { header: 'Accord API-ZF', value: (item) => Boolean(item.consentApizf), width: 14 },
      { header: 'Synchronisé', value: (item) => item.syncStatus === 'synced' || !item.syncStatus, width: 13 },
    ],
  });

  return (
    <main className="workspace">
      <div className="page-heading heading-with-action">
        <div>
          <h1>Mes contacts</h1>
        </div>
        <Link className="button button-primary" to="/contacts/nouveau">
          <Plus size={20} />
          Nouveau
        </Link>
      </div>

      <section className="metric-strip" aria-label="Contacts par qualification">
        <div><strong>{stats.total}</strong><span>Total</span></div>
        <div><strong>{stats.unqualified}</strong><span>À qualifier</span></div>
        <div><strong>{stats.byQualification.A}</strong><span>Prioritaires (A)</span></div>
        <div><strong>{pendingCount}</strong><span>À synchroniser</span></div>
      </section>

      <div className="list-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Rechercher un contact"
            placeholder="Rechercher"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button className="button button-secondary button-compact" type="button" onClick={exportContacts} disabled={!filteredContacts.length} aria-label="Exporter les contacts en Excel">
          <Download size={17} />
          Excel
        </button>
      </div>

      {error && <p className="panel-error">{error}</p>}
      {loading && <p className="empty-state">Chargement des contacts...</p>}
      {!loading && !error && filteredContacts.length === 0 && (
        <div className="empty-state">
          <UserRound size={28} />
          <strong>Aucun contact</strong>
          <span>Enregistrez la première personne rencontrée sur le stand.</span>
        </div>
      )}

      {!loading && filteredContacts.length > 0 && (
        <div className="contact-list">
          {filteredContacts.map((contact) => (
            <Link className="contact-row" to={`/contacts/${contact.id}`} key={contact.id} aria-label={`Voir le contact ${contact.fullName}`}>
              <div className="contact-avatar">{contact.fullName.slice(0, 1).toUpperCase()}</div>
              <div className="contact-main">
                <strong>{contact.fullName}</strong>
                <span>{contact.company || contact.phone}</span>
                {contact.source === 'public' && <span className="contact-origin">Demande du site</span>}
                {contact.nextAction && (
                  <span className="next-action">Prochaine action : {contact.nextAction}</span>
                )}
                <small className={`sync-status ${contact.syncStatus || 'synced'}`}>
                  {contact.syncStatus === 'pending' && <Clock3 size={13} />}
                  {contact.syncStatus === 'syncing' && <RefreshCw size={13} />}
                  {(contact.syncStatus === 'synced' || !contact.syncStatus) && <Cloud size={13} />}
                  {contact.syncStatus === 'pending' && 'À synchroniser'}
                  {contact.syncStatus === 'syncing' && 'Synchronisation'}
                  {(contact.syncStatus === 'synced' || !contact.syncStatus) && 'Synchronisé'}
                </small>
              </div>
              <span className={`qualification-label ${normalizeQualification(contact.qualification) || 'unqualified'}`} title={qualificationHints[normalizeQualification(contact.qualification)]}>
                {contact.qualification && <Check size={14} />}
                {qualificationLabel(contact.qualification)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
