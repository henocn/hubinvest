import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, BriefcaseBusiness, Handshake, LogOut, Plus, QrCode, RefreshCw, Search, Trophy, UserRound, Users, Video } from 'lucide-react';
import logo from '../../../assets/Logo fond blanc.jpeg';
import ConfirmDelete from '../components/ConfirmDelete';
import ConfirmReward from '../components/ConfirmReward';
import QrCodeDialog from '../components/QrCodeDialog';
import PushToggleButton from '../components/PushToggleButton';
import InvestorRequestDrawer from '../components/drawers/InvestorRequestDrawer';
import B2bNeedDrawer from '../components/drawers/B2bNeedDrawer';
import OccupantDrawer from '../components/drawers/OccupantDrawer';
import StudioInvitationDrawer from '../components/drawers/StudioInvitationDrawer';
import UserDrawer from '../components/drawers/UserDrawer';
import InvestorRequestsTable from '../components/tables/InvestorRequestsTable';
import B2bNeedsTable from '../components/tables/B2bNeedsTable';
import ChallengePassportsTable from '../components/tables/ChallengePassportsTable';
import OccupantsTable from '../components/tables/OccupantsTable';
import StudioInvitationsTable from '../components/tables/StudioInvitationsTable';
import UsersTable from '../components/tables/UsersTable';
import { publicBaseUrl, roleLabels } from '../constants/access';
import { api } from '../lib/api';
import { disablePush } from '../lib/push';

const sectionMeta = {
  occupants: { title: 'Stands', description: 'Fiches publiques, emplacements et statuts.' },
  users: { title: 'Accès', description: 'Comptes et niveaux d’accès à la plateforme.' },
  'investor-requests': { title: 'Investor Desk', description: 'Demandes de professionnels adressées à l’API-ZF.' },
  b2b: { title: 'B2B', description: 'Besoins publiés et propositions reçues.' },
  studio: { title: 'Studio', description: 'Invitations et planning des invités.' },
  challenges: { title: 'Participants aux défis', description: 'Contacts, progression et remise des récompenses.' },
};

export default function BackofficePage({ session, onLogout }) {
  const isSuperAdmin = session.user.role === 'super-admin';
  const isAdmin = session.user.role === 'admin';
  const canAccessBusinessModules = isSuperAdmin || isAdmin;
  const [section, setSection] = useState(() => (isSuperAdmin ? 'occupants' : 'investor-requests'));
  const [occupants, setOccupants] = useState([]);
  const [users, setUsers] = useState([]);
  const [investorRequests, setInvestorRequests] = useState([]);
  const [b2bNeeds, setB2bNeeds] = useState([]);
  const [studioInvitations, setStudioInvitations] = useState([]);
  const [challengePassports, setChallengePassports] = useState([]);
  const [contactStats, setContactStats] = useState({ total: 0, byOccupant: {} });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [copiedInvitationId, setCopiedInvitationId] = useState(null);
  const [pendingReward, setPendingReward] = useState(null);
  const [rewardError, setRewardError] = useState('');
  const [rewarding, setRewarding] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isSuperAdmin) {
        const [occupantData, userData, statsData, investorData, b2bData, studioData, challengeData] = await Promise.all([
          api.occupants(session.token),
          api.users(session.token),
          api.contactStats(session.token),
          api.investorRequests(session.token),
          api.b2bNeeds(session.token),
          api.studioInvitations(session.token),
          api.challengePassports(session.token),
        ]);
        setOccupants(occupantData);
        setUsers(userData);
        setContactStats(statsData);
        setInvestorRequests(investorData.items);
        setB2bNeeds(b2bData);
        setStudioInvitations(studioData);
        setChallengePassports(challengeData);
      } else {
        const [investorData, needData, studioData, challengeData] = await Promise.all([
          api.investorRequests(session.token),
          api.b2bNeeds(session.token),
          api.studioInvitations(session.token),
          api.challengePassports(session.token),
        ]);
        setInvestorRequests(investorData.items);
        setB2bNeeds(needData);
        setStudioInvitations(studioData);
        setChallengePassports(challengeData);
      }
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
      else setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, onLogout, session.token]);

  useEffect(() => { loadData(); }, [loadData]);

  const query = search.trim().toLowerCase();
  const visibleOccupants = useMemo(() => occupants.filter((occupant) => !query || [occupant.name, occupant.activity, occupant.standLabel].some((value) => String(value || '').toLowerCase().includes(query))), [occupants, query]);
  const visibleUsers = useMemo(() => users.filter((user) => !query || [user.firstName, user.lastName, user.email, user.role, user.occupant?.name].some((value) => String(value || '').toLowerCase().includes(query))), [users, query]);
  const visibleInvestorRequests = useMemo(() => investorRequests.filter((item) => !query || [item.fullName, item.email, item.projectSummary, item.nextAction].some((value) => String(value || '').toLowerCase().includes(query))), [investorRequests, query]);
  const visibleB2bNeeds = useMemo(() => b2bNeeds.filter((item) => !query || [item.title, item.occupant?.name, item.status].some((value) => String(value || '').toLowerCase().includes(query))), [b2bNeeds, query]);
  const visibleStudioInvitations = useMemo(() => studioInvitations.filter((item) => !query || [item.guestName, item.subject].some((value) => String(value || '').toLowerCase().includes(query))), [studioInvitations, query]);
  const visibleChallengePassports = useMemo(() => challengePassports.filter((item) => !query || [item.displayName, item.contact, item.code, ...(item.passages || []).flatMap((passage) => [passage.occupant?.name, passage.validatedBy?.firstName, passage.validatedBy?.lastName])].some((value) => String(value || '').toLowerCase().includes(query))), [challengePassports, query]);

  const switchSection = (next) => {
    setSection(next);
    setSearch('');
  };

  const saved = async () => {
    setDrawer(null);
    await loadData();
  };

  const copyInvitationLink = async (id, link) => {
    await navigator.clipboard.writeText(link);
    setCopiedInvitationId(id);
    window.setTimeout(() => setCopiedInvitationId(null), 1800);
  };

  const confirmReward = async () => {
    setRewarding(true);
    setRewardError('');
    try {
      await api.redeemChallengePassport(session.token, pendingReward.id);
      setPendingReward(null);
      await loadData();
    } catch (requestError) {
      setRewardError(requestError.message);
    } finally {
      setRewarding(false);
    }
  };

  const requestOccupantDelete = (occupant) => {
    setDeleteError('');
    setPendingDelete({ type: 'occupant', item: occupant, label: `l'occupant ${occupant.name}` });
  };

  const requestUserDelete = (user) => {
    setDeleteError('');
    setPendingDelete({ type: 'user', item: user, label: `l’utilisateur ${user.firstName} ${user.lastName}` });
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      if (pendingDelete.type === 'occupant') await api.deleteOccupant(session.token, pendingDelete.item.id);
      else await api.deleteUser(session.token, pendingDelete.item.id);
      setPendingDelete(null);
      await loadData();
    } catch (requestError) {
      setDeleteError(requestError.message);
    } finally {
      setDeleting(false);
    }
  };

  // Coupe les notifications de cet appareil avant de quitter volontairement la session.
  const signOut = async () => {
    await Promise.race([
      disablePush(session.token).catch(() => {}),
      new Promise((resolve) => { setTimeout(resolve, 1500); }),
    ]);
    onLogout();
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup"><img src={logo} alt="API-ZF" /><div><strong>HubInvest</strong><span>Administration</span></div></div>
        <nav aria-label="Navigation principale">
          {isSuperAdmin && <><button className={section === 'occupants' ? 'is-active' : ''} onClick={() => switchSection('occupants')} title="Stands"><Building2 size={18} /><span>Stands</span></button><button className={section === 'users' ? 'is-active' : ''} onClick={() => switchSection('users')} title="Accès"><Users size={18} /><span>Accès</span></button></>}
          {canAccessBusinessModules && <button className={section === 'investor-requests' ? 'is-active' : ''} onClick={() => switchSection('investor-requests')} title="Investor Desk"><BriefcaseBusiness size={18} /><span>Investor Desk</span></button>}
          {canAccessBusinessModules && <button className={section === 'b2b' ? 'is-active' : ''} onClick={() => switchSection('b2b')} title="B2B"><Handshake size={18} /><span>B2B</span></button>}
          {canAccessBusinessModules && <button className={section === 'studio' ? 'is-active' : ''} onClick={() => switchSection('studio')} title="Studio"><Video size={18} /><span>Studio</span></button>}
          {canAccessBusinessModules && <button className={section === 'challenges' ? 'is-active' : ''} onClick={() => switchSection('challenges')} title="Participants aux défis"><Trophy size={18} /><span>Participants</span></button>}
        </nav>
        <div className="sidebar-user">
          <span className="user-avatar"><UserRound size={18} /></span>
          <div><strong>{session.user.firstName} {session.user.lastName}</strong><span>{roleLabels[session.user.role] || session.user.role}</span></div>
          <span className="sidebar-user-actions">
            <PushToggleButton token={session.token} />
            <button className="icon-button" type="button" onClick={signOut} aria-label="Se déconnecter" title="Se déconnecter"><LogOut size={18} /></button>
          </span>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div><span className="eyebrow">Gestion</span><h1>{sectionMeta[section].title}</h1><p>{sectionMeta[section].description}</p></div>
          {(section === 'occupants' || section === 'users' || section === 'b2b' || section === 'studio' || section === 'challenges') && <div className="workspace-actions">
            {section === 'occupants' && <button className="button button-secondary" type="button" onClick={() => setQrCode({ title: 'QR du Hub', url: `${publicBaseUrl}/stands`, fileName: 'hubinvest-hub' })}><QrCode size={18} /> QR du Hub</button>}
            {section === 'challenges' && <button className="button button-secondary" type="button" onClick={() => setQrCode({ title: 'QR des Défis', url: `${publicBaseUrl}/defis`, fileName: 'hubinvest-defis' })}><QrCode size={18} /> QR des Défis</button>}
            {section !== 'challenges' && <button className="button button-primary" type="button" onClick={() => setDrawer({ type: section === 'occupants' ? 'occupant' : section === 'users' ? 'user' : section === 'b2b' ? 'b2b' : 'studio', item: null })}><Plus size={18} /> {section === 'occupants' ? 'Nouveau stand' : section === 'users' ? 'Nouvel utilisateur' : section === 'b2b' ? 'Nouveau besoin' : 'Nouvelle invitation'}</button>}
          </div>}
        </header>

        {section === 'challenges' ? (
          <section className="summary-row" aria-label="Résumé">
            <article><span>En cours</span><strong>{loading || error ? '—' : challengePassports.filter((item) => item.status === 'active').length}</strong><small>parcours commencés</small></article>
            <article><span>Terminés</span><strong>{loading || error ? '—' : challengePassports.filter((item) => item.status === 'completed').length}</strong><small>récompenses à remettre</small></article>
            <article><span>Remises</span><strong>{loading || error ? '—' : challengePassports.filter((item) => item.status === 'redeemed').length}</strong><small>récompenses enregistrées</small></article>
          </section>
        ) : section === 'b2b' ? (
          <section className="summary-row" aria-label="Résumé">
            <article><span>Ouverts</span><strong>{loading || error ? '—' : b2bNeeds.filter((item) => item.status === 'open').length}</strong><small>besoins publiés</small></article>
            <article><span>Fermés</span><strong>{loading || error ? '—' : b2bNeeds.filter((item) => item.status === 'closed').length}</strong><small>besoins retirés</small></article>
            <article><span>Total</span><strong>{loading || error ? '—' : b2bNeeds.length}</strong><small>besoins enregistrés</small></article>
          </section>
        ) : section === 'studio' ? (
          <section className="summary-row" aria-label="Résumé">
            <article><span>En attente</span><strong>{loading || error ? '—' : studioInvitations.filter((item) => item.status === 'pending').length}</strong><small>sans réponse</small></article>
            <article><span>Confirmées</span><strong>{loading || error ? '—' : studioInvitations.filter((item) => item.status === 'confirmed').length}</strong><small>invités attendus</small></article>
            <article><span>Refusées</span><strong>{loading || error ? '—' : studioInvitations.filter((item) => item.status === 'declined').length}</strong><small>indisponibles</small></article>
          </section>
        ) : section === 'investor-requests' ? (
          <section className="summary-row" aria-label="Résumé">
            <article><span>Nouvelles</span><strong>{loading || error ? '—' : investorRequests.filter((item) => item.status === 'new').length}</strong><small>à examiner</small></article>
            <article><span>En cours</span><strong>{loading || error ? '—' : investorRequests.filter((item) => item.status === 'in_progress').length}</strong><small>prises en charge</small></article>
            <article><span>Clôturées</span><strong>{loading || error ? '—' : investorRequests.filter((item) => item.status === 'closed').length}</strong><small>demandes traitées</small></article>
          </section>
        ) : (
          <section className="summary-row" aria-label="Résumé">
            <article><span>Stands</span><strong>{loading || error ? '—' : occupants.length}</strong><small>{!loading && !error && `${occupants.filter((item) => item.status === 'active').length} actifs`}</small></article>
            <article><span>Utilisateurs</span><strong>{loading || error ? '—' : users.length}</strong><small>{!loading && !error && `${users.filter((item) => item.isActive).length} actifs`}</small></article>
            {section === 'occupants' ? <article><span>Contacts enregistrés</span><strong>{loading || error ? '—' : contactStats.total}</strong><small>tous les occupants</small></article> : <article><span>Administration</span><strong>{loading || error ? '—' : users.filter((item) => ['super-admin', 'admin'].includes(item.role)).length}</strong><small>comptes internes</small></article>}
          </section>
        )}

        <section className="data-panel">
          <header className="data-toolbar">
            <label className="search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={section === 'occupants' ? 'Rechercher un occupant' : section === 'users' ? 'Rechercher un utilisateur' : section === 'b2b' ? 'Rechercher un besoin' : section === 'studio' ? 'Rechercher une invitation' : section === 'challenges' ? 'Rechercher un participant' : 'Rechercher une demande'} /></label>
            <button className="icon-button" type="button" onClick={loadData} aria-label="Actualiser"><RefreshCw size={18} /></button>
          </header>
          {error && <p className="panel-message is-error">{error}</p>}
          {loading && <p className="panel-message">Chargement des données...</p>}
          {!loading && !error && section === 'occupants' && <OccupantsTable occupants={visibleOccupants} contactStats={contactStats} query={query} onQrCode={setQrCode} onEdit={(item) => setDrawer({ type: 'occupant', item })} onDelete={requestOccupantDelete} />}
          {!loading && !error && section === 'users' && <UsersTable users={visibleUsers} query={query} currentUserId={session.user.id} onEdit={(item) => setDrawer({ type: 'user', item })} onDelete={requestUserDelete} />}
          {!loading && !error && section === 'investor-requests' && <InvestorRequestsTable requests={visibleInvestorRequests} query={query} showStand={isSuperAdmin} onEdit={(item) => setDrawer({ type: 'investor-request', item })} />}
          {!loading && !error && section === 'b2b' && <B2bNeedsTable needs={visibleB2bNeeds} query={query} showStand={isSuperAdmin} onEdit={(item) => setDrawer({ type: 'b2b', item })} />}
          {!loading && !error && section === 'studio' && <StudioInvitationsTable invitations={visibleStudioInvitations} query={query} showStand={isSuperAdmin} copiedId={copiedInvitationId} onCopy={copyInvitationLink} onEdit={(item) => setDrawer({ type: 'studio', item })} />}
          {!loading && !error && section === 'challenges' && <ChallengePassportsTable passports={visibleChallengePassports} query={query} allowReward={isSuperAdmin} onRedeem={(passport) => { setRewardError(''); setPendingReward(passport); }} />}
        </section>
      </main>

      {drawer?.type === 'occupant' && <OccupantDrawer occupant={drawer.item} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'user' && <UserDrawer user={drawer.item} occupants={occupants} token={session.token} currentRole={session.user.role} currentUserId={session.user.id} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'investor-request' && <InvestorRequestDrawer investorRequest={drawer.item} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'b2b' && <B2bNeedDrawer need={drawer.item} occupants={occupants} fixedOccupant={isAdmin ? session.user.occupant : null} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'studio' && <StudioInvitationDrawer invitation={drawer.item} occupants={occupants} fixedOccupant={isAdmin ? session.user.occupant : null} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {pendingDelete && <ConfirmDelete subject={pendingDelete} loading={deleting} error={deleteError} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />}
      {pendingReward && <ConfirmReward passport={pendingReward} loading={rewarding} error={rewardError} onCancel={() => setPendingReward(null)} onConfirm={confirmReward} />}
      {qrCode && <QrCodeDialog {...qrCode} onClose={() => setQrCode(null)} />}
    </div>
  );
}
