import { Fragment, useState } from 'react';

// Ligne dépliable, comme sur la Semaine de l'Industrie : la ligne garde l'essentiel,
// un clic l'ouvre et affiche le reste juste en dessous ; un second clic la referme. Une seule ligne ouverte à la fois.
export function useOpenRow() {
  const [openId, setOpenId] = useState(null);
  return {
    isOpen: (id) => openId === id,
    toggle: (id) => setOpenId((current) => (current === id ? null : id)),
  };
}

// La ligne et, si elle est ouverte, son détail sur toute la largeur du tableau.
export function ExpandableRow({ id, openRow, className = '', colSpan, details, children }) {
  const open = openRow.isOpen(id);
  return (
    <Fragment>
      <tr className={`${className} is-link${open ? ' is-open' : ''}`.trim()} onClick={() => openRow.toggle(id)} aria-expanded={open}>
        {children}
      </tr>
      {open && (
        <tr className="row-details-row">
          <td colSpan={colSpan}><dl className="row-details">{details}</dl></td>
        </tr>
      )}
    </Fragment>
  );
}

// Une information du détail ; absente, elle ne s'affiche pas. « wide » la place sur toute la largeur (message, description…).
export function Detail({ label, wide = false, children }) {
  if (children === null || children === undefined || children === '' || children === false) return null;
  return <div className={`row-detail${wide ? ' is-wide' : ''}`}><dt>{label}</dt><dd>{children}</dd></div>;
}

// Cellule des boutons : un clic sur un bouton n'ouvre pas la ligne.
export function ActionsCell({ children }) {
  return <td onClick={(event) => event.stopPropagation()}><div className="row-actions">{children}</div></td>;
}
