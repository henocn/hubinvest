// Confirmation avant d'accepter ou de refuser une demande B2B : la personne en est prévenue par e-mail.
export default function ConfirmDecision({ proposal, status, loading, error, onCancel, onConfirm }) {
  const accept = status === 'accepted';
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="decision-title" onMouseDown={(event) => event.stopPropagation()}>
        <div>
          <h2 id="decision-title">{accept ? 'Accepter la demande' : 'Refuser la demande'}</h2>
          <p>Demande de {proposal.fullName}{proposal.need?.title ? ` pour « ${proposal.need.title} »` : ''}. {proposal.fullName} recevra un e-mail {accept ? 'annonçant que sa demande est acceptée' : 'annonçant que sa demande est refusée'}.</p>
        </div>
        {error && <p className="admin-form-error dialog-error">{error}</p>}
        <footer>
          <button className="button button-secondary" type="button" onClick={onCancel} disabled={loading}>Annuler</button>
          <button className={`button ${accept ? 'button-primary' : 'button-danger'}`} type="button" onClick={onConfirm} disabled={loading}>{loading ? 'Enregistrement…' : accept ? 'Accepter' : 'Refuser'}</button>
        </footer>
      </section>
    </div>
  );
}
