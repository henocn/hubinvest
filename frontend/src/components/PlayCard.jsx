// Carte d'une page en deux parties (Défis, Rencontres) : icône, titre, texte, trois étapes numérotées et l'action.
export default function PlayCard({ icon: Icon, tone, title, text, steps = [], doneSteps = 0, badge, action, children }) {
  return (
    <article className={`play-game is-${tone}`}>
      <div className="play-game-top">
        <span className="play-game-icon" aria-hidden="true"><Icon size={26} /></span>
        {badge}
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      {steps.length > 0 && <ol>{steps.map((step, index) => <li key={step} className={index < doneSteps ? 'is-done' : undefined}>{step}</li>)}</ol>}
      {children}
      {action}
    </article>
  );
}
