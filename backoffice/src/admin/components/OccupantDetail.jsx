import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Pencil, QrCode, Search, Trash2 } from 'lucide-react';
import { programTypeLabels, publicBaseUrl, roleLabels } from '../constants/access';
import { api, resolveAssetUrl } from '../lib/api';
import { exportToExcel, formatDate } from '../../lib/excel';
import { upcomingFirst } from '../lib/order';
import { ProposalCount } from './tables/B2bNeedsTable';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const day = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'long', year: 'numeric' });
const lines = (text) => String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
const belongsTo = (id) => (item) => item.occupantId === id || item.occupant?.id === id;
// Classe d'un contact de stand ; les anciennes valeurs (chaud, tiède, froid) restent lisibles.
const contactClass = (value) => ({ hot: 'A', warm: 'B', cold: 'C' })[value] || value || '';

// Une ligne « libellé : valeur » ; une valeur absente s'affiche en tiret.
function Field({ label, children }) {
  const empty = children === null || children === undefined || children === '' || (Array.isArray(children) && !children.length);
  return <div className="stand-field"><dt>{label}</dt><dd>{empty ? <span className="stand-empty">—</span> : children}</dd></div>;
}

// Un tableau rattaché au stand (comptes, programme…), ou une ligne « Aucun… » s'il est vide.
function Related({ empty, head, rows }) {
  return (
    <section className="data-panel stand-panel">
      {!rows.length ? <p className="panel-message">{empty}</p> : (
        <div className="table-scroll">
          <table>
            <thead><tr>{head.map((label) => <th key={label}>{label}</th>)}</tr></thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// Carnet du stand, en lecture pour l'API-ZF : recherche, export Excel. La saisie reste à l'équipe du stand.
function StandContacts({ occupant, token }) {
  const [contacts, setContacts] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    api.standContacts(token, occupant.id)
      .then((rows) => { if (active) setContacts(rows); })
      .catch((requestError) => { if (active) setError(requestError.message); });
    return () => { active = false; };
  }, [occupant.id, token]);

  if (error) return <section className="data-panel stand-panel"><p className="panel-message is-error">{error}</p></section>;
  if (!contacts) return <section className="data-panel stand-panel"><p className="panel-message">Chargement…</p></section>;

  const term = search.trim().toLowerCase();
  const rows = contacts.filter((item) => !term || [item.fullName, item.phone, item.email, item.company].filter(Boolean).some((value) => value.toLowerCase().includes(term)));
  const exportRows = () => exportToExcel({
    name: `contacts-${occupant.slug}`,
    sheetName: 'Contacts',
    rows,
    columns: [
      { header: 'Enregistré le', value: (item) => formatDate(item.createdAt), width: 18 },
      { header: 'Nom', value: (item) => item.fullName, width: 28 },
      { header: 'Téléphone', value: (item) => item.phone, width: 18 },
      { header: 'E-mail', value: (item) => item.email, width: 28 },
      { header: 'Entreprise', value: (item) => item.company, width: 26 },
      { header: 'Recherche', value: (item) => item.need, width: 45 },
      { header: 'Classe', value: (item) => contactClass(item.qualification), width: 10 },
      { header: 'Origine', value: (item) => (item.source === 'public' ? 'Demande du site' : 'Saisi sur le stand'), width: 18 },
      { header: 'Accord API-ZF', value: (item) => Boolean(item.consentApizf), width: 14 },
    ],
  });

  return (
    <section className="data-panel stand-panel">
      <header className="settings-panel-head">
        <label className="admin-search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher" aria-label="Rechercher un contact" /></label>
        <button className="button button-secondary" type="button" onClick={exportRows} disabled={!rows.length}><Download size={16} /> Exporter</button>
      </header>
      {!rows.length ? <p className="panel-message">{contacts.length ? 'Aucun contact ne correspond.' : 'Aucun contact enregistré.'}</p> : (
        <div className="table-scroll">
          <table>
            <thead><tr><th>Nom</th><th>Téléphone</th><th>Entreprise</th><th>Classe</th><th>Origine</th><th>Enregistré le</th></tr></thead>
            <tbody>{rows.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.fullName}</strong>{item.need && <small>{item.need}</small>}</td>
                <td className="stand-nowrap"><a href={`tel:${item.phone}`}>{item.phone}</a>{item.email && <small><a href={`mailto:${item.email}`}>{item.email}</a></small>}</td>
                <td>{item.company || '—'}</td>
                <td>{contactClass(item.qualification) || '—'}</td>
                <td>{item.source === 'public' ? 'Site' : 'Stand'}</td>
                <td className="stand-nowrap">{dateTime.format(new Date(item.createdAt))}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export const standPublicUrl = (occupant) => `${publicBaseUrl}/stands/${occupant.slug}`;

// Fiche d'un stand (informations et images) : onglet Fiche de l'administration et page « Mon stand » de l'occupant.
// Les champs passés en enfants s'ajoutent à la fin de la liste.
export function StandSheet({ occupant, children }) {
  const isActive = occupant.status === 'active';
  const publicUrl = standPublicUrl(occupant);
  const photos = [
    occupant.logoUrl && { url: occupant.logoUrl, label: 'Logo', isLogo: true },
    occupant.coverImageUrl && { url: occupant.coverImageUrl, label: 'Couverture' },
    ...(occupant.gallery || []).map((url, index) => ({ url, label: `Photo ${index + 1}` })),
  ].filter(Boolean);

  return (
    <>
      <section className="data-panel stand-panel">
        <dl className="stand-fields">
          <Field label="Emplacement">{occupant.standLabel}</Field>
          <Field label="Activités">{occupant.activity && <p className="stand-text">{occupant.activity}</p>}</Field>
          <Field label="Produits">{lines(occupant.products).length > 0 && <ul>{lines(occupant.products).map((item) => <li key={item}>{item}</li>)}</ul>}</Field>
          <Field label="Services">{lines(occupant.services).length > 0 && <ul>{lines(occupant.services).map((item) => <li key={item}>{item}</li>)}</ul>}</Field>
          <Field label="Site web">{occupant.website && <a href={occupant.website} target="_blank" rel="noreferrer">{occupant.website.replace(/^https?:\/\//, '')}</a>}</Field>
          <Field label="Fiche publique">{isActive ? <a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl.replace(/^https?:\/\//, '')}</a> : 'Masquée tant que le stand est inactif'}</Field>
          {children}
        </dl>
      </section>

      <section className="data-panel stand-panel">
        <h2>Images</h2>
        {photos.length ? (
          <div className="stand-photos">
            {photos.map((photo) => (
              <a key={photo.url} href={resolveAssetUrl(photo.url)} target="_blank" rel="noreferrer" className={photo.isLogo ? 'is-logo' : ''}>
                <img src={resolveAssetUrl(photo.url)} alt={photo.label} loading="lazy" />
                <span>{photo.label}</span>
              </a>
            ))}
          </div>
        ) : <p className="admin-empty-state">Aucune image.</p>}
      </section>
    </>
  );
}

// Fiche complète d'un stand dans l'administration, en onglets : son carnet de contacts (ouvert d'abord), ses comptes,
// son programme, ses besoins B2B, puis la fiche elle-même.
export default function OccupantDetail({ occupant, token, users, contactCount, programEvents, b2bNeeds, challengePassports, onEdit, onDelete, onQrCode }) {
  const [tab, setTab] = useState('contacts');
  const isActive = occupant.status === 'active';
  const publicUrl = standPublicUrl(occupant);
  const own = belongsTo(occupant.id);
  const accounts = users.filter(own);
  const events = upcomingFirst(programEvents.filter(own), (item) => item.startsAt, (item) => new Date(item.endsAt || item.startsAt) >= new Date());
  const upcomingEvents = events.filter((item) => new Date(item.endsAt || item.startsAt) >= new Date()).length;
  const needs = b2bNeeds.filter(own);
  const players = challengePassports.filter((passport) => (passport.passages || []).some(own)).length;
  const tabs = [
    ['contacts', 'Contacts'],
    ['accounts', 'Comptes'],
    ['program', 'Programme', upcomingEvents],
    ['needs', 'Besoins B2B'],
    ['details', 'Fiche'],
  ];

  return (
    <main className="admin-workspace">
      <header className="workspace-header">
        <div className="stand-title">
          <Link className="admin-icon-button" to="/stands" aria-label="Retour aux stands" title="Retour aux stands"><ArrowLeft size={16} /></Link>
          <h1>{occupant.name}</h1>
          <span className={`status-pill${isActive ? ' is-active' : ''}`}>{isActive ? 'Actif' : 'Inactif'}</span>
        </div>
        <div className="workspace-actions">
          {isActive && <button className="button button-secondary" type="button" onClick={() => onQrCode({ title: occupant.name, url: publicUrl, fileName: `hubinvest-${occupant.slug}` })}><QrCode size={16} /> QR</button>}
          <button className="button button-secondary" type="button" onClick={onEdit}><Pencil size={16} /> Modifier</button>
          <button className="button button-danger" type="button" onClick={onDelete}><Trash2 size={16} /> Supprimer</button>
        </div>
      </header>

      <nav className="section-tabs detail-tabs" aria-label="Fiche du stand">
        {tabs.map(([key, label, count]) => (
          <button key={key} type="button" className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)} aria-pressed={tab === key}>{label}{count > 0 && <b>{count}</b>}</button>
        ))}
      </nav>

      {tab === 'details' && (
        <StandSheet occupant={occupant}>
          <Field label="Contacts enregistrés">{contactCount}</Field>
          <Field label="Joueurs des Défis">{players}</Field>
          <Field label="Créé le">{occupant.createdAt && day.format(new Date(occupant.createdAt))}</Field>
        </StandSheet>
      )}

      {tab === 'contacts' && <StandContacts occupant={occupant} token={token} />}

      {tab === 'accounts' && (
        <Related
          empty="Aucun compte rattaché à ce stand."
          head={['Nom', 'E-mail', 'Rôle', 'Actif']}
          rows={accounts.map((user) => <tr key={user.id}><td>{[user.firstName, user.lastName].filter(Boolean).join(' ')}</td><td>{user.email}</td><td>{roleLabels[user.role] || user.role}</td><td>{user.isActive ? 'Oui' : 'Non'}</td></tr>)}
        />
      )}
      {tab === 'program' && (
        <Related
          empty="Aucun rendez-vous de ce stand au programme."
          head={['Date', 'Type', 'Titre', 'Lieu']}
          rows={events.map((event) => <tr key={event.id}><td className="stand-nowrap">{dateTime.format(new Date(event.startsAt))}</td><td>{programTypeLabels[event.type] || event.type}</td><td>{event.title || '—'}</td><td>{event.location || occupant.standLabel || '—'}</td></tr>)}
        />
      )}
      {tab === 'needs' && (
        <Related
          empty="Aucun besoin B2B publié par ce stand."
          head={['Besoin', 'Demandes', 'Statut', 'Publié le']}
          rows={needs.map((need) => <tr key={need.id}><td>{need.title}</td><td><ProposalCount need={need} /></td><td>{need.status === 'open' ? 'Ouvert' : 'Fermé'}</td><td className="stand-nowrap">{day.format(new Date(need.createdAt))}</td></tr>)}
        />
      )}
    </main>
  );
}
