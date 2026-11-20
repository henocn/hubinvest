import { useEffect, useRef, useState } from 'react';

// Sélection de lignes par identifiant ; seules les lignes encore affichées comptent.
export function useRowSelection(rows) {
  const [picked, setPicked] = useState(() => new Set());
  const selected = rows.filter((row) => picked.has(row.id));
  const allChecked = rows.length > 0 && selected.length === rows.length;

  return {
    selected,
    allChecked,
    someChecked: selected.length > 0 && !allChecked,
    isChecked: (id) => picked.has(id),
    toggle: (id) => setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    }),
    // Coche toutes les lignes affichées, ou les décoche si elles le sont déjà.
    toggleAll: () => setPicked(allChecked ? new Set() : new Set(rows.map((row) => row.id))),
    clear: () => setPicked(new Set()),
  };
}

// En-tête de la colonne à cocher : tout cocher, état intermédiaire si une partie seulement l'est.
export function SelectAllHeader({ selection }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = selection.someChecked;
  }, [selection.someChecked]);
  return (
    <th className="select-cell">
      <input ref={ref} type="checkbox" aria-label="Tout sélectionner" checked={selection.allChecked} onChange={selection.toggleAll} />
    </th>
  );
}

// Case d'une ligne ; cocher n'ouvre pas la fiche de la ligne.
export function SelectCell({ selection, id }) {
  return (
    <td className="select-cell" onClick={(event) => event.stopPropagation()}>
      <input type="checkbox" aria-label="Sélectionner la ligne" checked={selection.isChecked(id)} onChange={() => selection.toggle(id)} />
    </td>
  );
}
