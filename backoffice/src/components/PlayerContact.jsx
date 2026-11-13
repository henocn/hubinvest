import { displayPhone } from '../lib/phone';

const legacyHref = (contact) => {
  if (contact.includes('@')) return `mailto:${contact}`;
  if (/^[+\d\s().-]+$/.test(contact)) return `tel:${contact.replace(/[^\d+]/g, '')}`;
  return null;
};

// Coordonnées d'un joueur des Défis : téléphone et e-mail cliquables, ou l'ancien champ contact libre.
export default function PlayerContact({ player }) {
  if (player?.phone || player?.email) {
    return (
      <span className="player-contact">
        {player.phone && <a href={`tel:${player.phone}`}>{displayPhone(player.phone)}</a>}
        {player.email && <a href={`mailto:${player.email}`}>{player.email}</a>}
      </span>
    );
  }
  if (!player?.contact) return <span className="challenge-table-empty">—</span>;
  const href = legacyHref(player.contact);
  return href ? <a className="challenge-table-contact" href={href}>{player.contact}</a> : <span>{player.contact}</span>;
}
