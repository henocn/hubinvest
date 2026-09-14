import { Gift } from 'lucide-react';

export default function ConfirmReward({ passport, loading, error, onCancel, onConfirm }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="confirm-dialog reward-dialog" role="alertdialog" aria-modal="true" aria-labelledby="reward-title" onMouseDown={(event) => event.stopPropagation()}>
        <span className="reward-icon"><Gift size={21} /></span>
        <div><h2 id="reward-title">Confirmer la remise</h2><p>Récompense remise à {passport.displayName}, code {passport.code}.</p></div>
        {error && <p className="form-error dialog-error">{error}</p>}
        <footer><button className="button button-secondary" type="button" onClick={onCancel} disabled={loading}>Annuler</button><button className="button button-primary" type="button" onClick={onConfirm} disabled={loading}>{loading ? 'Enregistrement...' : 'Confirmer la remise'}</button></footer>
      </section>
    </div>
  );
}
