import { Gift } from 'lucide-react';

// Confirme une remise : récompense des Défis, ou lot de la roue quand « prize » est donné.
export default function ConfirmReward({ passport, prize = null, loading, error, onCancel, onConfirm }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="confirm-dialog reward-dialog" role="alertdialog" aria-modal="true" aria-labelledby="reward-title" onMouseDown={(event) => event.stopPropagation()}>
        <span className="reward-icon"><Gift size={21} /></span>
        <div><h2 id="reward-title">Confirmer la remise</h2><p>{prize ? `Lot « ${prize} » remis à` : 'Récompense remise à'} {passport.displayName}, code {passport.code}.</p></div>
        {error && <p className="admin-form-error dialog-error">{error}</p>}
        <footer><button className="button button-secondary" type="button" onClick={onCancel} disabled={loading}>Annuler</button><button className="button button-primary" type="button" onClick={onConfirm} disabled={loading}>{loading ? 'Enregistrement...' : 'Confirmer la remise'}</button></footer>
      </section>
    </div>
  );
}
