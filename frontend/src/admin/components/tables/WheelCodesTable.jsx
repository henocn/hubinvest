import { Ticket } from 'lucide-react';
import EmptyState from '../EmptyState';
import PlayerContact from '../../../components/PlayerContact';

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Africa/Lome',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const shortTime = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', hour: '2-digit', minute: '2-digit' });

const resultLabel = (item) => {
  if (item.status === 'waiting') return `Pas encore joué · expire à ${shortTime.format(new Date(item.expiresAt))}`;
  if (item.status === 'expired') return 'Expiré sans être joué';
  return item.result.sponsor ? `${item.result.label} · ${item.result.sponsor}` : item.result.label;
};

// Liste les derniers codes délivrés et le résultat de chaque partie.
export default function WheelCodesTable({ codes }) {
  if (!codes.length) {
    return <EmptyState icon={Ticket} title="Aucun code délivré" copy="Générez un code pour chaque personne qui veut tourner la roue." />;
  }

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><th>Code</th><th>Délivré</th><th>Joueur</th><th>Résultat</th></tr></thead>
        <tbody>{codes.map((item) => (
          <tr key={item.id} className={`wheel-code-row is-${item.status}${item.result?.kind === 'prize' ? ' is-won' : ''}`}>
            <td className="challenge-table-code">{item.code}</td>
            <td><strong>{timeFormatter.format(new Date(item.createdAt))}</strong><small>{item.createdBy ? `${item.createdBy.firstName} ${item.createdBy.lastName}` : '—'}</small></td>
            <td>{item.player ? <><strong>{item.player.displayName}</strong><PlayerContact player={item.player} /></> : '—'}</td>
            <td>{resultLabel(item)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
