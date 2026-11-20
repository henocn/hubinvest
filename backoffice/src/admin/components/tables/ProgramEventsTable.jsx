import { CalendarDays, Pencil, Trash2 } from 'lucide-react';
import { programTypeLabels } from '../../constants/access';
import EmptyState from '../EmptyState';
import { ActionsCell, Detail, ExpandableRow, useOpenRow } from '../RowDetails';
import { SelectAllHeader, SelectCell } from '../RowSelection';

const HUB_TIME_ZONE = 'Africa/Lome';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: HUB_TIME_ZONE,
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('fr-FR', {
  timeZone: HUB_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
});

// Indique l'horaire d'un élément : toute la journée pour l'affiche, sinon début et fin.
const scheduleLabel = (event) => {
  if (event.type === 'spotlight') return 'Toute la journée';
  const start = timeFormatter.format(new Date(event.startsAt));
  return event.endsAt ? `${start} – ${timeFormatter.format(new Date(event.endsAt))}` : start;
};

// Programme du Hub ; un clic sur la ligne affiche le stand, le lieu et la description.
export default function ProgramEventsTable({ selection, events, query, onEdit, onDelete }) {
  const openRow = useOpenRow();
  if (!events.length) {
    return <EmptyState icon={CalendarDays} title="Programme vide" copy={query ? 'Aucun résultat ne correspond à la recherche.' : 'Ajoutez le premier élément du programme du Hub.'} />;
  }

  const now = Date.now();

  return (
    <div className="table-scroll">
      <table>
        <thead><tr><SelectAllHeader selection={selection} /><th>Date</th><th>Type</th><th>Titre</th><th className="actions-heading">Actions</th></tr></thead>
        <tbody>{events.map((event) => {
          const isPast = new Date(event.endsAt || event.startsAt).getTime() + (event.type === 'spotlight' ? 86_400_000 : 0) < now;
          return (
            <ExpandableRow
              key={event.id}
              id={event.id}
              openRow={openRow}
              className={`program-row is-${event.type}${isPast ? ' is-past' : ''}`}
              colSpan={5}
              details={<>
                <Detail label="Stand">{event.occupant?.name || 'Tout le Hub'}</Detail>
                <Detail label="Lieu">{event.location || event.occupant?.standLabel}</Detail>
                <Detail label="Horaire">{scheduleLabel(event)}</Detail>
                <Detail label="Description" wide>{event.description}</Detail>
              </>}
            >
              <SelectCell selection={selection} id={event.id} />
              <td className="studio-date"><strong>{dateFormatter.format(new Date(event.startsAt))}</strong><small>{scheduleLabel(event)}</small></td>
              <td className="program-type-cell">{programTypeLabels[event.type] || event.type}</td>
              <td className="activity-cell"><strong>{event.type === 'spotlight' ? event.occupant?.name || '—' : event.title}</strong></td>
              <ActionsCell>
                <button className="table-action is-icon" type="button" aria-label={`Modifier ${event.title}`} title="Modifier" onClick={() => onEdit(event)}><Pencil size={16} /></button>
                <button className="table-action is-icon is-danger" type="button" aria-label={`Supprimer ${event.title}`} title="Supprimer" onClick={() => onDelete(event)}><Trash2 size={16} /></button>
              </ActionsCell>
            </ExpandableRow>
          );
        })}</tbody>
      </table>
    </div>
  );
}
