import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';

// Actions d'une ligne : un bouton à trois points verticaux ouvre un menu contextuel.
// items = [{ label, onClick, disabled?, hint?, danger? }] ; un clic ailleurs ou Échap referme le menu.
export default function RowMenu({ label = 'Actions', items }) {
  const [open, setOpen] = useState(false);
  // Position fixe sous le bouton : le menu n'est pas coupé par un tableau qui défile.
  const [position, setPosition] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => { if (event.key === 'Escape') setOpen(false); };
    const hide = () => setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [open]);

  return (
    <div className="row-menu" ref={ref} onClick={(event) => event.stopPropagation()}>
      <button className="table-action is-icon" type="button" onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        setPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
        setOpen((current) => !current);
      }} aria-haspopup="menu" aria-expanded={open} aria-label={label} title={label}><MoreVertical size={16} /></button>
      {open && (
        <ul className="row-menu-list" role="menu" style={position || undefined}>
          {items.map((item) => (
            <li key={item.label} role="none">
              <button type="button" role="menuitem" className={item.danger ? 'is-danger' : ''} disabled={item.disabled} title={item.disabled ? item.hint : undefined}
                onClick={() => { setOpen(false); item.onClick(); }}>
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
