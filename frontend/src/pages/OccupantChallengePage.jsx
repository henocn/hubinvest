import { Handshake, LogOut, Users } from 'lucide-react';
import ChallengeValidationForm from '../components/occupant/ChallengeValidationForm';

export default function OccupantChallengePage({ session, onLogout }) {
  return (
    <>
      <header className="app-header">
        <div className="brand-name">HubInvest</div>
        <div className="app-header-actions"><a className="app-header-link" href="/espace-occupant" title="Contacts"><Users size={18} /> Contacts</a><a className="app-header-link" href="/espace-occupant/b2b" title="B2B"><Handshake size={18} /> B2B</a><button className="icon-button" type="button" onClick={onLogout} aria-label="Se déconnecter"><LogOut size={20} /></button></div>
      </header>
      <main className="workspace challenge-validation-workspace">
        <div className="page-heading"><h1>Défis du public</h1><p>{session.user.occupant?.name}</p></div>
        <section className="challenge-validation-panel"><h2>Valider un passage</h2><ChallengeValidationForm token={session.token} /></section>
      </main>
    </>
  );
}
