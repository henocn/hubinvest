import { Link } from 'react-router-dom';
import { ArrowLeft, Pencil, QrCode, Trash2 } from 'lucide-react';
import { programTypeLabels, publicBaseUrl, roleLabels } from '../constants/access';
import { resolveAssetUrl } from '../lib/api';
import { ProposalCount } from './tables/B2bNeedsTable';

const dateTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const day = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', day: 'numeric', month: 'long', year: 'numeric' });
const lines = (text) => String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
const belongsTo = (id) => (item) => item.occupantId === id || item.occupant?.id === id;

// Une ligne « libellé : valeur » ; une valeur absente s'affiche en tiret.
function Field({ label, children }) {
  const empty = children === null || children === undefined || children === '' || (Array.isArray(children) && !children.length);
  return <div className="stand-field"><dt>{label}</dt><dd>{empty ? <span className="stand-empty">—</span> : children}</dd></div>;
}

// Un tableau rattaché au stand (comptes, programme…), affiché seulement s'il a des lignes.
function Related({ title, head, rows }) {
  if (!rows.length) return null;
  return (
    <section className="data-panel stand-panel">
      <h2>{title} <span>{rows.length}</span></h2>
      <div className="table-scroll">
        <table>
          <thead><tr>{head.map((label) => <th key={label}>{label}</th>)}</tr></thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </section>
  );
}

// Fiche complète d'un stand dans l'administration : tout ce qui le décrit et tout ce qui lui est rattaché.
export default function OccupantDetail({ occupant, users, contactCount, programEvents, b2bNeeds, challengePassports, onEdit, onDelete, onQrCode }) {
  const isActive = occupant.status === 'active';
  const publicUrl = `${publicBaseUrl}/stands/${occupant.slug}`;
  const own = belongsTo(occupant.id);
  const accounts = users.filter(own);
  const events = programEvents.filter(own).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  const needs = b2bNeeds.filter(own);
  const players = challengePassports.filter((passport) => (passport.passages || []).some(own)).length;
  const photos = [
    occupant.logoUrl && { url: occupant.logoUrl, label: 'Logo', isLogo: true },
    occupant.coverImageUrl && { url: occupant.coverImageUrl, label: 'Couverture' },
    ...(occupant.gallery || []).map((url, index) => ({ url, label: `Photo ${index + 1}` })),
  ].filter(Boolean);

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

      <section className="data-panel stand-panel">
        <dl className="stand-fields">
          <Field label="Emplacement">{occupant.standLabel}</Field>
          <Field label="Activités">{occupant.activity && <p className="stand-text">{occupant.activity}</p>}</Field>
          <Field label="Produits">{lines(occupant.products).length > 0 && <ul>{lines(occupant.products).map((item) => <li key={item}>{item}</li>)}</ul>}</Field>
          <Field label="Services">{lines(occupant.services).length > 0 && <ul>{lines(occupant.services).map((item) => <li key={item}>{item}</li>)}</ul>}</Field>
          <Field label="Site web">{occupant.website && <a href={occupant.website} target="_blank" rel="noreferrer">{occupant.website.replace(/^https?:\/\//, '')}</a>}</Field>
          <Field label="Fiche publique">{isActive ? <a href={publicUrl} target="_blank" rel="noreferrer">{publicUrl.replace(/^https?:\/\//, '')}</a> : 'Masquée tant que le stand est inactif'}</Field>
          <Field label="Contacts enregistrés">{contactCount}</Field>
          <Field label="Joueurs des Défis">{players}</Field>
          <Field label="Créé le">{occupant.createdAt && day.format(new Date(occupant.createdAt))}</Field>
        </dl>
      </section>

      <section className="data-panel stand-panel">
        <h2>Images <span>{photos.length}</span></h2>
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

      <Related
        title="Comptes"
        head={['Nom', 'E-mail', 'Rôle', 'Actif']}
        rows={accounts.map((user) => <tr key={user.id}><td>{[user.firstName, user.lastName].filter(Boolean).join(' ')}</td><td>{user.email}</td><td>{roleLabels[user.role] || user.role}</td><td>{user.isActive ? 'Oui' : 'Non'}</td></tr>)}
      />
      <Related
        title="Programme"
        head={['Date', 'Type', 'Titre', 'Lieu']}
        rows={events.map((event) => <tr key={event.id}><td className="stand-nowrap">{dateTime.format(new Date(event.startsAt))}</td><td>{programTypeLabels[event.type] || event.type}</td><td>{event.title || '—'}</td><td>{event.location || occupant.standLabel || '—'}</td></tr>)}
      />
      <Related
        title="Besoins B2B"
        head={['Besoin', 'Demandes', 'Statut', 'Publié le']}
        rows={needs.map((need) => <tr key={need.id}><td>{need.title}</td><td><ProposalCount need={need} /></td><td>{need.status === 'open' ? 'Ouvert' : 'Fermé'}</td><td className="stand-nowrap">{day.format(new Date(need.createdAt))}</td></tr>)}
      />
    </main>
  );
}
