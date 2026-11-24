import { Link } from 'react-router-dom';
import { useDashboard } from '../dashboard';
import { isGlobalRole } from '../../navigation';

// Une ligne : le libellé et son détail à gauche, le chiffre à droite ; cliquable vers la rubrique où agir.
function Stat({ value, label, detail, to, urgent = false }) {
  const content = (
    <>
      <span>{label}{detail && <small> · {detail}</small>}</span>
      <strong>{value ?? '—'}</strong>
    </>
  );
  const className = `dashboard-stat${urgent && value > 0 ? ' is-urgent' : ''}`;
  return to ? <Link className={className} to={to}>{content}</Link> : <div className={className}>{content}</div>;
}

// Accueil de l'administration : d'abord ce qui attend une action, puis les chiffres du Hub.
export default function DashboardPage({ session }) {
  const { data, error } = useDashboard();
  const isSuperAdmin = isGlobalRole(session.user.role);

  return (
    <main className="admin-workspace">
      <header className="workspace-header"><h1>Tableau de bord</h1></header>
      {error && <p className="admin-form-error">{error}</p>}
      {!data && !error && <p className="panel-message">Chargement…</p>}
      {data && (
        <>
          <section className="dashboard-group" aria-labelledby="dashboard-todo">
            <h2 id="dashboard-todo">À traiter</h2>
            <div className="dashboard-grid">
              {isSuperAdmin && <Stat value={data.investor.new} label="Guichets" detail="contacts à traiter" to="/guichets" urgent />}
              {isSuperAdmin && <Stat value={data.investor.overdue ?? 0} label="Relances en retard" detail="heure de relance dépassée" to="/guichets" urgent />}
              {isSuperAdmin && <Stat value={data.investor.commitmentsOverdue ?? 0} label="Engagements en retard" detail="réponse promise non donnée" to="/guichets" urgent />}
              <Stat value={data.b2b.pendingProposals} label="Demandes B2B" detail="à traiter" to="/b2b" urgent />
              <Stat value={data.studio.pending} label="Studio" detail="invités sans créneau" to="/studio" />
              <Stat value={data.challenges.rewardsToHand} label="Récompenses à remettre" detail="les 5 étapes trouvées" to="/participants" urgent />
              {data.challenges.rewardsLeft !== null && data.challenges.rewardsLeft !== undefined && <Stat value={data.challenges.rewardsLeft} label="Récompenses en stock" detail={`sur ${data.challenges.rewardStock}`} to="/parametres" urgent={data.challenges.rewardsLeft <= 5} />}
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
              {isSuperAdmin && <Stat value={data.investor.total} label="Contacts aux guichets" detail={`${data.investor.inProgress} en suivi`} to="/guichets" />}
              {isSuperAdmin && <Stat value={data.investor.diagnosed ?? 0} label="Diagnostics réalisés" detail="fiches de diagnostic en 15 minutes" to="/guichets" />}
              {isSuperAdmin && <Stat value={data.investor.supportTaken ?? 0} label="Sollicitations d’accompagnement" detail="prises en charge avec un engagement de suivi" to="/guichets" />}
              <Stat value={data.b2b.openNeeds} label="Besoins B2B ouverts" to="/besoins-b2b" />
              <Stat value={data.studio.confirmed} label="Passages au Studio" detail="réservés, à venir" to="/studio" />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
