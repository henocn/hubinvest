import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useDashboard } from '../dashboard';

// Une carte : un gros chiffre, son libellé, et la rubrique où agir.
function Stat({ value, label, detail, to, urgent = false }) {
  const content = (
    <>
      <strong>{value ?? '—'}</strong>
      <span>{label}</span>
      {detail && <small>{detail}</small>}
      {to && <ArrowRight className="dashboard-arrow" size={16} aria-hidden="true" />}
    </>
  );
  const className = `dashboard-stat${urgent && value > 0 ? ' is-urgent' : ''}`;
  return to ? <Link className={className} to={to}>{content}</Link> : <div className={className}>{content}</div>;
}

// Accueil de l'administration : d'abord ce qui attend une action, puis les chiffres du Hub.
export default function DashboardPage({ session }) {
  const { data, error } = useDashboard();
  const isSuperAdmin = session.user.role === 'super-admin';

  return (
    <main className="admin-workspace">
      <header className="workspace-header">
        <div><h1>Tableau de bord</h1></div>
      </header>
      {error && <p className="admin-form-error">{error}</p>}
      {!data && !error && <p className="panel-message">Chargement…</p>}
      {data && (
        <>
          <section className="dashboard-group" aria-labelledby="dashboard-todo">
            <h2 id="dashboard-todo">À traiter</h2>
            <div className="dashboard-grid">
              <Stat value={data.investor.new} label="Demandes Investor Desk" detail="nouvelles" to="/investor-desk" urgent />
              <Stat value={data.b2b.pendingProposals} label="Propositions B2B" detail="sans réponse" to="/b2b" urgent />
              <Stat value={data.challenges.rewardsToHand} label="Récompenses des Défis" detail="parcours terminés, à remettre" to="/participants" urgent />
              <Stat value={data.wheel.prizesToHand} label="Lots de la roue" detail="gagnés, pas encore remis" to="/roue" urgent />
            </div>
          </section>

          <section className="dashboard-group" aria-labelledby="dashboard-numbers">
            <h2 id="dashboard-numbers">Le Hub en chiffres</h2>
            <div className="dashboard-grid">
              {isSuperAdmin && <Stat value={data.stands.active} label="Stands actifs" to="/stands" />}
              {isSuperAdmin && <Stat value={data.contacts.total} label="Contacts captés" detail={`dont ${data.contacts.today} aujourd’hui · ${data.contacts.fromSite} via le site`} />}
              <Stat value={data.challenges.players} label={isSuperAdmin ? 'Joueurs des Défis' : 'Joueurs passés par le stand'} detail={`${data.challenges.rewardsHanded} récompense${data.challenges.rewardsHanded > 1 ? 's' : ''} remise${data.challenges.rewardsHanded > 1 ? 's' : ''}`} to="/participants" />
              <Stat value={data.wheel.played} label="Parties de roue" detail={`dont ${data.wheel.playedToday} aujourd’hui`} to="/roue" />
              <Stat value={data.investor.total} label="Projets Investor Desk" detail={`${data.investor.inProgress} en cours`} to="/investor-desk" />
              <Stat value={data.b2b.openNeeds} label="Besoins B2B ouverts" to="/b2b" />
              <Stat value={data.studio.confirmed} label="Invités Studio confirmés" detail={`${data.studio.pending} sans réponse`} to="/studio" />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
