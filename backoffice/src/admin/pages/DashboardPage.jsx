import { Link } from 'react-router-dom';
import { AlarmClock, CalendarClock } from 'lucide-react';
import { useDashboard } from '../dashboard';
import { accessRole, isApizfTeamRole, isGlobalRole } from '../../navigation';
import { dueLabel, dueState } from '../lib/due';

const time = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Lome', hour: '2-digit', minute: '2-digit' });

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

// Une colonne de l'agenda du jour : une ligne par relance ou rendez-vous, qui ouvre la fiche.
function AgendaList({ title, Icon, empty, items }) {
  return (
    <div className="dashboard-agenda-list">
      <h3><Icon size={15} aria-hidden="true" /> {title}{items.length > 0 && <b>{items.length}</b>}</h3>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item.key}>
              <Link className={item.state ? `is-${item.state}` : ''} to={item.to}>
                <time>{item.when}</time>
                <span><strong>{item.name}</strong>{item.detail && <small>{item.detail}</small>}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : <p>{empty}</p>}
    </div>
  );
}

// Accueil de l'administration : l'agenda du jour, ce qui attend une action, puis les chiffres du Hub.
export default function DashboardPage({ session }) {
  const { data, error } = useDashboard();
  // Équipe API-ZF (tous les stands) ; guichets et roue aussi pour les occupants du Stand API-ZF.
  const isApizf = isGlobalRole(session.user.role);
  const hasGuichets = isApizfTeamRole(accessRole(session.user));
  const isSuperAdmin = session.user.role === 'super-admin';

  const followUps = (data?.agenda?.followUps || []).map((item) => {
    const state = dueState(item.dueAt) || 'today';
    return {
      key: `${item.kind}-${item.id}-${item.dueAt}`,
      // Guichet : sa fiche ; contact : sa fiche dans le carnet pour l'occupant, la page Relances pour l'API-ZF.
      to: item.kind === 'guichet' ? `/guichets/${item.id}` : isApizf ? '/relances' : `/contacts/${item.id}`,
      state,
      when: state === 'late' ? `En retard · ${dueLabel(item.dueAt)}` : time.format(new Date(item.dueAt)),
      name: item.fullName,
      detail: [item.organization, item.reason].filter(Boolean).join(' · '),
    };
  });
  const meetings = (data?.agenda?.meetings || []).map((item) => ({
    key: `${item.kind}-${item.id}-${item.startsAt}`,
    to: item.kind === 'b2b' ? `/b2b/${item.id}` : `/guichets/${item.id}`,
    state: new Date(item.startsAt) < new Date() ? 'past' : null,
    when: time.format(new Date(item.startsAt)),
    name: item.fullName,
    detail: [item.kind === 'b2b' ? 'B2B' : 'Guichet', item.place].filter(Boolean).join(' · '),
  }));

  // À traiter : seulement ce qui attend vraiment une action (rien à zéro).
  const todo = data ? [
    hasGuichets && { value: data.investor.new, label: 'Contacts des guichets', detail: 'à traiter', to: '/guichets' },
    { value: data.todo?.['follow-ups'] ?? 0, label: 'Relances du jour', detail: 'en retard ou à faire aujourd’hui', to: '/relances' },
    hasGuichets && { value: data.investor.commitmentsOverdue ?? 0, label: 'Engagements en retard', detail: 'réponse promise non donnée', to: '/guichets' },
    { value: data.b2b.pendingProposals, label: 'Demandes B2B', detail: 'à accepter ou refuser', to: '/b2b' },
    isApizf && { value: data.todo?.['live-questions'] ?? 0, label: 'Questions du public', detail: 'à poser ou écarter', to: '/questions' },
    isApizf && { value: data.studio.pending, label: 'Studio', detail: 'invités sans créneau', to: '/studio' },
    hasGuichets && { value: data.challenges.rewardsToHand, label: 'Récompenses à remettre', detail: 'les 5 étapes trouvées', to: '/participants' },
    hasGuichets && { value: data.wheel.prizesToHand, label: 'Lots de la roue', detail: 'gagnés, pas encore remis', to: '/roue' },
    data.challenges.rewardsLeft !== null && data.challenges.rewardsLeft !== undefined && data.challenges.rewardsLeft <= 5
      && { value: data.challenges.rewardsLeft, label: 'Récompenses en stock', detail: `sur ${data.challenges.rewardStock}, à réapprovisionner`, to: isSuperAdmin ? '/parametres' : undefined },
  ].filter((item) => item && item.value > 0) : [];

  return (
    <main className="admin-workspace">
      <header className="workspace-header"><h1>Tableau de bord</h1></header>
      {error && <p className="admin-form-error">{error}</p>}
      {!data && !error && <p className="panel-message">Chargement…</p>}
      {data && (
        <>
          <section className="dashboard-group" aria-labelledby="dashboard-today">
            <h2 id="dashboard-today">Aujourd’hui</h2>
            <div className="dashboard-agenda">
              <AgendaList title="Relances à faire" Icon={AlarmClock} empty="Aucune relance à faire aujourd’hui." items={followUps} />
              <AgendaList title="Rendez-vous" Icon={CalendarClock} empty="Aucun rendez-vous aujourd’hui." items={meetings} />
            </div>
          </section>

          <section className="dashboard-group" aria-labelledby="dashboard-todo">
            <h2 id="dashboard-todo">À traiter</h2>
            {todo.length ? (
              <div className="dashboard-grid">
                {todo.map((item) => <Stat key={item.label} {...item} urgent />)}
              </div>
            ) : <p className="dashboard-empty">Rien à traiter pour le moment.</p>}
          </section>

          <section className="dashboard-group" aria-labelledby="dashboard-numbers">
            <h2 id="dashboard-numbers">Le Hub en chiffres</h2>
            <div className="dashboard-grid">
              {isApizf && <Stat value={data.stands.active} label="Stands actifs" to="/stands" />}
              {isApizf && <Stat value={data.contacts.total} label="Contacts captés" detail={`dont ${data.contacts.today} aujourd’hui · ${data.contacts.fromSite} via le site`} />}
              <Stat value={data.challenges.players} label={isApizf ? 'Joueurs des Défis' : 'Joueurs passés par le stand'} detail={`${data.challenges.rewardsHanded} récompense${data.challenges.rewardsHanded > 1 ? 's' : ''} remise${data.challenges.rewardsHanded > 1 ? 's' : ''}`} to={hasGuichets ? '/participants' : '/defis'} />
              {hasGuichets && <Stat value={data.wheel.played} label="Parties de roue" detail={`dont ${data.wheel.playedToday} aujourd’hui`} to="/roue" />}
              {hasGuichets && <Stat value={data.investor.total} label="Contacts aux guichets" detail={`${data.investor.inProgress} en suivi`} to="/guichets" />}
              {hasGuichets && <Stat value={data.investor.diagnosed ?? 0} label="Diagnostics réalisés" detail="fiches de diagnostic en 15 minutes" to="/guichets" />}
              {hasGuichets && <Stat value={data.investor.supportTaken ?? 0} label="Sollicitations d’accompagnement" detail="prises en charge avec un engagement de suivi" to="/guichets" />}
              <Stat value={data.b2b.openNeeds} label="Besoins B2B ouverts" to="/besoins-b2b" />
              {isApizf && <Stat value={data.studio.confirmed} label="Passages au Studio" detail="réservés, à venir" to="/studio" />}
              {data.challenges.rewardsLeft !== null && data.challenges.rewardsLeft !== undefined && data.challenges.rewardsLeft > 5 && <Stat value={data.challenges.rewardsLeft} label="Récompenses en stock" detail={`sur ${data.challenges.rewardStock}`} to={isSuperAdmin ? '/parametres' : undefined} />}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
