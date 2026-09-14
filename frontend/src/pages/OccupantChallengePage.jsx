import ChallengeValidationForm from '../components/occupant/ChallengeValidationForm';

export default function OccupantChallengePage({ session, onLogout }) {
  return (
    <main className="workspace challenge-validation-workspace">
      <div className="page-heading"><h1>Défis du public</h1><p>{session.user.occupant?.name}</p></div>
      <section className="challenge-validation-panel"><h2>Valider un passage</h2><ChallengeValidationForm token={session.token} /></section>
    </main>
  );
}
