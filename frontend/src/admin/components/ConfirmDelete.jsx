import { Trash2 } from 'lucide-react';

export default function ConfirmDelete({ subject, loading, error, onCancel, onConfirm }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" onMouseDown={(event) => event.stopPropagation()}>
        <span className="danger-icon"><Trash2 size={21} /></span>
        <div>
          <h2 id="delete-title">Supprimer {subject.label}</h2>
          <p>Cette action est définitive. Les éléments encore utilisés par la plateforme ne pourront pas être supprimés.</p>
        </div>
        {error && <p className="form-error dialog-error">{error}</p>}
        <footer>
          <button className="button button-secondary" type="button" onClick={onCancel} disabled={loading}>Annuler</button>
          <button className="button button-danger" type="button" onClick={onConfirm} disabled={loading}>{loading ? 'Suppression...' : 'Supprimer'}</button>
        </footer>
      </section>
    </div>
  );
}
