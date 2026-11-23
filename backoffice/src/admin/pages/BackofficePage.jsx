import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Download, Plus, QrCode, Search, Ticket } from 'lucide-react';
import ConfirmDelete from '../components/ConfirmDelete';
import OccupantDetail from '../components/OccupantDetail';
import B2bProposalDetail from '../components/B2bProposalDetail';
import InvestorRequestDetail from '../components/InvestorRequestDetail';
import { useRowSelection } from '../components/RowSelection';
import ConfirmReward from '../components/ConfirmReward';
import ConfirmDecision from '../components/ConfirmDecision';
import QrCodeDialog from '../components/QrCodeDialog';
import InvestorRequestDrawer from '../components/drawers/InvestorRequestDrawer';
import B2bProposalDrawer from '../components/drawers/B2bProposalDrawer';
import OccupantDrawer from '../components/drawers/OccupantDrawer';
import ProgramEventDrawer from '../components/drawers/ProgramEventDrawer';
import UserDrawer from '../components/drawers/UserDrawer';
import InvestorRequestsTable from '../components/tables/InvestorRequestsTable';
import B2bProposalsTable from '../components/tables/B2bProposalsTable';
import ChallengePassportsTable from '../components/tables/ChallengePassportsTable';
import OccupantsTable from '../components/tables/OccupantsTable';
import ProgramEventsTable from '../components/tables/ProgramEventsTable';
import UsersTable from '../components/tables/UsersTable';
import WheelPlaysTable from '../components/tables/WheelPlaysTable';
import WheelCodeDialog from '../components/WheelCodeDialog';
import { publicBaseUrl } from '../constants/access';
import { tableSettings } from '../constants/tables';
import { exportToExcel } from '../../lib/excel';
import { guichetShortLabels } from '../constants/access';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';
import { adminSections, groupTabs, sectionGroups } from '../../navigation';
import { useDashboard } from '../dashboard';

const sectionMeta = {
  occupants: { title: 'Stands' },
  users: { title: 'Utilisateurs' },
  program: { title: 'Programme' },
  'investor-requests': { title: 'Guichets' },
  b2b: { title: 'Rencontre B2B' },
  challenges: { title: 'Défi de passage' },
  wheel: { title: 'Roue des opportunités' },
};

// Page d'une rubrique de l'administration ; la rubrique vient de l'adresse (/stands, /b2b, /roue…).
export default function BackofficePage({ session, onLogout, section }) {
  const isSuperAdmin = session.user.role === 'super-admin';
  const todo = useDashboard()?.data?.todo || {};
  // Onglets de la rubrique quand elle fait partie d'un groupe (Jeux).
  const group = adminSections.find((item) => item.section === section)?.group;
  const tabs = group ? groupTabs(group, session.user.role) : [];
  const location = useLocation();
  const navigate = useNavigate();
  // Fiche d'un stand : /stands/<id>.
  const detailId = section === 'occupants' ? location.pathname.split('/')[2] || null : null;
  // Fiche d'une demande B2B : /b2b/<id> (rendez-vous et comptes rendus).
  const b2bDetailId = section === 'b2b' ? location.pathname.split('/')[2] || null : null;
  // Fiche d'un contact des guichets : /guichets/<id> (diagnostic ou difficulté, classe, rendez-vous, relances).
  const investorDetailId = section === 'investor-requests' ? location.pathname.split('/')[2] || null : null;
  const [occupants, setOccupants] = useState([]);
  const [users, setUsers] = useState([]);
  const [investorRequests, setInvestorRequests] = useState([]);
  const [b2bNeeds, setB2bNeeds] = useState([]);
  const [b2bProposals, setB2bProposals] = useState([]);
  const [pendingDecision, setPendingDecision] = useState(null);
  const [deciding, setDeciding] = useState(false);
  const [decisionError, setDecisionError] = useState('');
  const [programEvents, setProgramEvents] = useState([]);
  const [challengePassports, setChallengePassports] = useState([]);
  const [contactStats, setContactStats] = useState({ total: 0, byOccupant: {} });
  const [wheel, setWheel] = useState({ segments: [], codes: [], plays: [], stats: { played: 0, awarded: 0, remaining: 0 } });
  const [wheelCode, setWheelCode] = useState(null);
  const [search, setSearch] = useState('');
  const [sortValue, setSortValue] = useState('');
  const [exporting, setExporting] = useState(false);
  // Une erreur d'export s'affiche au-dessus du tableau, sans le masquer.
  const [exportError, setExportError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drawer, setDrawer] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [pendingReward, setPendingReward] = useState(null);
  const [rewardError, setRewardError] = useState('');
  const [rewarding, setRewarding] = useState(false);
  const [pendingClaim, setPendingClaim] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isSuperAdmin) {
        const [occupantData, userData, statsData, investorData, b2bData, proposalData, challengeData, programData, wheelData] = await Promise.all([
          api.occupants(session.token),
          api.users(session.token),
          api.contactStats(session.token),
          api.investorRequests(session.token),
          api.b2bNeeds(session.token),
          api.b2bAllProposals(session.token),
          api.challengePassports(session.token),
          api.programEvents(session.token),
          api.wheel(session.token),
        ]);
        setOccupants(occupantData);
        setUsers(userData);
        setContactStats(statsData);
        setInvestorRequests(investorData.items);
        setB2bNeeds(b2bData);
        setB2bProposals(proposalData);
        setChallengePassports(challengeData);
        setProgramEvents(programData);
        setWheel(wheelData);
      } else {
        const [needData, proposalData, challengeData, wheelData] = await Promise.all([
          api.b2bNeeds(session.token),
          api.b2bAllProposals(session.token),
          api.challengePassports(session.token),
          api.wheel(session.token),
        ]);
        setB2bNeeds(needData);
        setB2bProposals(proposalData);
        setChallengePassports(challengeData);
        setWheel(wheelData);
      }
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
      else setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, onLogout, session.token]);

  useEffect(() => { loadData(); }, [loadData]);

  // Rechargements silencieux par sujet, déclenchés par le flux en temps réel : les tableaux se mettent à jour sans « Chargement… ».
  const silentLoaders = useMemo(() => {
    const token = session.token;
    const loaders = {
      b2b: async () => {
        const [needData, proposalData] = await Promise.all([api.b2bNeeds(token), api.b2bAllProposals(token)]);
        setB2bNeeds(needData);
        setB2bProposals(proposalData);
      },
      challenge: async () => setChallengePassports(await api.challengePassports(token)),
      wheel: async () => setWheel(await api.wheel(token)),
      account: async () => { await api.profile(token); },
    };
    if (isSuperAdmin) {
      Object.assign(loaders, {
        occupants: async () => {
          const [occupantData, programData] = await Promise.all([api.occupants(token), api.programEvents(token)]);
          setOccupants(occupantData);
          setProgramEvents(programData);
        },
        'investor-requests': async () => setInvestorRequests((await api.investorRequests(token)).items),
        users: async () => setUsers(await api.users(token)),
        program: async () => setProgramEvents(await api.programEvents(token)),
        contacts: async () => setContactStats(await api.contactStats(token)),
      });
    }
    return loaders;
  }, [isSuperAdmin, session.token]);

  const reloadTopic = useCallback(async (topic) => {
    const loader = silentLoaders[topic];
    if (!loader) return;
    try {
      await loader();
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
    }
  }, [onLogout, silentLoaders]);

  useRealtimeEvent('occupants', () => reloadTopic('occupants'));
  useRealtimeEvent('users', () => reloadTopic('users'));
  useRealtimeEvent('program', () => reloadTopic('program'));
  useRealtimeEvent('contacts', () => reloadTopic('contacts'));
  useRealtimeEvent('investor-requests', () => reloadTopic('investor-requests'));
  useRealtimeEvent('b2b', () => reloadTopic('b2b'));
  useRealtimeEvent('challenge', () => reloadTopic('challenge'));
  useRealtimeEvent('wheel', () => reloadTopic('wheel'));
  useRealtimeEvent('account', () => reloadTopic('account'));

  const query = search.trim().toLowerCase();
  const visibleOccupants = useMemo(() => occupants.filter((occupant) => !query || [occupant.name, occupant.activity, occupant.standLabel].some((value) => String(value || '').toLowerCase().includes(query))), [occupants, query]);
  const visibleUsers = useMemo(() => users.filter((user) => !query || [user.firstName, user.lastName, user.email, user.role, user.occupant?.name].some((value) => String(value || '').toLowerCase().includes(query))), [users, query]);
  const [guichetFilter, setGuichetFilter] = useState('');
  const visibleInvestorRequests = useMemo(() => investorRequests.filter((item) => (!guichetFilter || item.guichet === guichetFilter) && (!query || [item.fullName, item.email, item.organization, item.projectSummary, item.nextAction].some((value) => String(value || '').toLowerCase().includes(query)))), [investorRequests, query, guichetFilter]);
  const visibleB2bProposals = useMemo(() => b2bProposals.filter((item) => !query || [item.fullName, item.email, item.phone, item.message, item.need?.title, item.need?.occupant?.name].some((value) => String(value || '').toLowerCase().includes(query))), [b2bProposals, query]);
  const visibleProgramEvents = useMemo(() => programEvents.filter((item) => !query || [item.title, item.location, item.description, item.occupant?.name].some((value) => String(value || '').toLowerCase().includes(query))), [programEvents, query]);
  const visibleChallengePassports = useMemo(() => challengePassports.filter((item) => !query || [item.displayName, item.email, item.phone, item.contact, item.code, ...(item.passages || []).flatMap((passage) => [passage.occupant?.name, passage.validatedBy?.firstName, passage.validatedBy?.lastName])].some((value) => String(value || '').toLowerCase().includes(query))), [challengePassports, query]);

  const visibleWheelPlays = useMemo(() => wheel.plays.filter((item) => !query || [item.code, item.player?.displayName, item.player?.email, item.player?.phone, item.result.label].some((value) => String(value || '').toLowerCase().includes(query))), [wheel.plays, query]);

  // Chaque rubrique s'ouvre avec une recherche vide.
  useEffect(() => {
    setSearch('');
    setSortValue('');
    setExportError('');
  }, [section]);

  // Tri du tableau affiché : le premier tri proposé est celui par défaut.
  const settings = tableSettings[section];
  const arrange = (items) => {
    const sorter = settings.sorts.find((item) => item.value === sortValue) || settings.sorts[0];
    return [...items].sort(sorter.compare);
  };
  const sectionRows = {
    occupants: visibleOccupants,
    users: visibleUsers,
    program: visibleProgramEvents,
    'investor-requests': visibleInvestorRequests,
    b2b: visibleB2bProposals,
    challenges: visibleChallengePassports,
    wheel: visibleWheelPlays,
  };
  const rows = arrange(sectionRows[section] || []);
  // Lignes cochées : l'export ne prend qu'elles quand il y en a.
  const selection = useRowSelection(rows);
  const checkedCount = selection.selected.length;
  const { clear: clearSelection } = selection;
  useEffect(() => { clearSelection(); }, [section]); // eslint-disable-line react-hooks/exhaustive-deps
  // Repères de la roue, affichés en une ligne discrète.
  const toolbarNote = loading || error ? '' : section === 'wheel'
    ? `${wheel.stats.played} partie${wheel.stats.played > 1 ? 's' : ''} · ${wheel.stats.awarded} lot${wheel.stats.awarded > 1 ? 's' : ''} gagné${wheel.stats.awarded > 1 ? 's' : ''} · ${wheel.stats.remaining} restant${wheel.stats.remaining > 1 ? 's' : ''}`
    : '';

  // Exporte les lignes cochées, sinon toutes les lignes affichées.
  const exportRows = async () => {
    setExporting(true);
    setExportError('');
    try {
      const data = checkedCount ? selection.selected : rows;
      await exportToExcel({
        name: settings.exportName,
        sheetName: sectionMeta[section].title,
        columns: settings.columns({ contactStats, publicBaseUrl }),
        rows: data,
      });
    } catch (exportFailure) {
      setExportError(`Export impossible : ${exportFailure.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Accepter ou refuser une demande B2B, après confirmation : la personne reçoit la réponse par e-mail.
  const requestDecision = (proposal, status) => {
    setDecisionError('');
    setPendingDecision({ proposal, status });
  };

  const confirmDecision = async () => {
    setDeciding(true);
    setDecisionError('');
    try {
      await api.updateB2bProposal(session.token, pendingDecision.proposal.id, { status: pendingDecision.status });
      setPendingDecision(null);
      await reloadTopic('b2b');
    } catch (requestError) {
      setDecisionError(requestError.message);
    } finally {
      setDeciding(false);
    }
  };

  const saved = async () => {
    setDrawer(null);
    await loadData();
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

  // Lot de la roue remis depuis l'historique : ce tour précis, après confirmation.
  const confirmWheelClaim = async () => {
    setRewarding(true);
    setRewardError('');
    try {
      await api.claimWheelPlay(session.token, pendingClaim.id);
      setPendingClaim(null);
      await reloadTopic('wheel');
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

  // Demande confirmation avant de retirer un élément du programme.
  const requestProgramDelete = (programEvent) => {
    setDeleteError('');
    setPendingDelete({ type: 'program', item: programEvent, label: programEvent.type === 'spotlight' ? `la mise à l’affiche de ${programEvent.occupant?.name || 'ce stand'}` : `« ${programEvent.title} » du programme` });
  };

  const requestPassportDelete = (passport) => {
    setDeleteError('');
    setPendingDelete({ type: 'challenge-passport', item: passport, label: `le participant ${passport.displayName} (code ${passport.code})` });
  };

  const requestWheelPlayDelete = (play) => {
    setDeleteError('');
    setPendingDelete({ type: 'wheel-play', item: play, label: `la partie ${play.code}${play.player ? ` de ${play.player.displayName}` : ''} (${play.result.label})` });
  };

  const requestB2bProposalDelete = (proposal) => {
    setDeleteError('');
    setPendingDelete({ type: 'b2b-proposal', item: proposal, label: `la demande B2B de ${proposal.fullName}` });
  };

  // Délivre un code de jeu, l'affiche en grand pour le joueur et l'ajoute à la liste des codes.
  const generateWheelCode = async () => {
    setWheelCode((current) => ({ data: current?.data || null, loading: true, error: '' }));
    try {
      const data = await api.createWheelCode(session.token);
      setWheelCode({ data, loading: false, error: '' });
      void reloadTopic('wheel');
    } catch (requestError) {
      setWheelCode((current) => ({ data: current?.data || null, loading: false, error: requestError.message }));
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      if (pendingDelete.type === 'occupant') await api.deleteOccupant(session.token, pendingDelete.item.id);
      else if (pendingDelete.type === 'program') await api.deleteProgramEvent(session.token, pendingDelete.item.id);
      else if (pendingDelete.type === 'b2b-proposal') await api.deleteB2bProposal(session.token, pendingDelete.item.id);
      else if (pendingDelete.type === 'wheel-play') await api.deleteWheelPlay(session.token, pendingDelete.item.id);
      else if (pendingDelete.type === 'challenge-passport') await api.deleteChallengePassport(session.token, pendingDelete.item.id);
      else await api.deleteUser(session.token, pendingDelete.item.id);
      setPendingDelete(null);
      if (pendingDelete.type === 'occupant' && detailId) navigate('/stands', { replace: true });
      await loadData();
    } catch (requestError) {
      setDeleteError(requestError.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {investorDetailId ? <InvestorRequestDetail key={investorDetailId} id={investorDetailId} session={session} onLogout={onLogout} /> : b2bDetailId ? <B2bProposalDetail key={b2bDetailId} id={b2bDetailId} session={session} onLogout={onLogout} /> : detailId ? (
        loading ? <main className="admin-workspace"><p className="panel-message">Chargement…</p></main>
          : occupants.find((item) => item.id === detailId) ? (
            <OccupantDetail
              occupant={occupants.find((item) => item.id === detailId)}
              token={session.token}
              users={users}
              contactCount={contactStats.byOccupant[detailId] || 0}
              programEvents={programEvents}
              b2bNeeds={b2bNeeds}
              challengePassports={challengePassports}
              onEdit={() => setDrawer({ type: 'occupant', item: occupants.find((item) => item.id === detailId) })}
              onDelete={() => requestOccupantDelete(occupants.find((item) => item.id === detailId))}
              onQrCode={setQrCode}
            />
          ) : <main className="admin-workspace"><p className="panel-message">Ce stand n’existe plus. <a href="/stands" onClick={(event) => { event.preventDefault(); navigate('/stands'); }}>Retour aux stands</a></p></main>
      ) : (
      <main className="admin-workspace">
        <header className="workspace-header">
          {tabs.length > 1 ? (
            // Groupe de rubriques : un titre et ses onglets, avec ce qui attend une action.
            <div className="section-heading">
              <h1>{sectionGroups[group].label}</h1>
              <nav className="section-tabs" aria-label={sectionGroups[group].label}>
                {tabs.map((item) => (
                  <NavLink key={item.path} to={item.path} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                    {item.label}{todo[item.section] > 0 && <b>{todo[item.section]}</b>}
                  </NavLink>
                ))}
              </nav>
            </div>
          ) : <h1>{sectionMeta[section].title}</h1>}
          {(section === 'occupants' || section === 'users' || section === 'program' || section === 'investor-requests' || section === 'challenges' || section === 'wheel') && <div className="workspace-actions">
            {section === 'challenges' && <button className="button button-secondary" type="button" onClick={() => setQrCode({ title: 'QR des Défis', url: `${publicBaseUrl}/defis`, fileName: 'hubinvest-defis' })}><QrCode size={16} /> QR des Défis</button>}
            {section === 'program' && <button className="button button-primary" type="button" onClick={() => setDrawer({ type: 'program', item: null })}><Plus size={16} /> Ajouter au programme</button>}
            {section === 'wheel' && <button className="button button-primary" type="button" onClick={() => setWheelCode({ data: null, loading: false, error: '' })}><Ticket size={16} /> Code de jeu</button>}
            {(section === 'occupants' || section === 'users' || section === 'investor-requests') && <button className="button button-primary" type="button" onClick={() => setDrawer({ type: section === 'occupants' ? 'occupant' : section === 'users' ? 'user' : 'investor-request', item: null })}><Plus size={16} /> {section === 'occupants' ? 'Stand' : section === 'users' ? 'Nouvel utilisateur' : 'Contact'}</button>}
          </div>}
        </header>

        <section className="data-panel">
          <header className="data-toolbar">
            <div className="data-toolbar-controls">
              <label className="admin-search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher" aria-label={section === 'occupants' ? 'Rechercher un occupant' : section === 'users' ? 'Rechercher un utilisateur' : section === 'program' ? 'Rechercher dans le programme' : section === 'b2b' ? 'Rechercher une demande B2B' : section === 'challenges' ? 'Rechercher un participant' : section === 'wheel' ? 'Rechercher une partie' : 'Rechercher une demande'} /></label>
              {toolbarNote && <span className="data-note">{toolbarNote}</span>}
              {section === 'investor-requests' && (
                <select value={guichetFilter} onChange={(event) => setGuichetFilter(event.target.value)} aria-label="Guichet">
                  <option value="">Tous les guichets</option>
                  {Object.entries(guichetShortLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              )}
              <select value={sortValue || settings.sorts[0].value} onChange={(event) => setSortValue(event.target.value)} aria-label="Trier">
                {settings.sorts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <button className="button button-secondary data-export" type="button" onClick={exportRows} disabled={loading || exporting || !rows.length} title={checkedCount ? `Exporter les ${checkedCount} lignes cochées` : 'Exporter tout le tableau'}>
                <Download size={15} /> {exporting ? 'Export…' : 'Exporter'}{checkedCount > 0 && !exporting && ` (${checkedCount})`}
              </button>
            </div>
          </header>
          {exportError && <p className="panel-message is-error" role="alert">{exportError}</p>}
          {error && <p className="panel-message is-error">{error}</p>}
          {loading && <p className="panel-message">Chargement des données...</p>}
          {!loading && !error && section === 'occupants' && <OccupantsTable selection={selection} occupants={rows} contactStats={contactStats} query={query} onEdit={(item) => setDrawer({ type: 'occupant', item })} onDelete={requestOccupantDelete} />}
          {!loading && !error && section === 'users' && <UsersTable selection={selection} users={rows} query={query} currentUserId={session.user.id} onEdit={(item) => setDrawer({ type: 'user', item })} onDelete={requestUserDelete} />}
          {!loading && !error && section === 'program' && <ProgramEventsTable selection={selection} events={rows} query={query} onEdit={(item) => setDrawer({ type: 'program', item })} onDelete={requestProgramDelete} />}
          {!loading && !error && section === 'investor-requests' && <InvestorRequestsTable selection={selection} requests={rows} query={query} onOpen={(item) => navigate(`/guichets/${item.id}`)} />}
          {!loading && !error && section === 'b2b' && <B2bProposalsTable selection={selection} proposals={rows} query={query} showStand={isSuperAdmin} onOpen={(item) => navigate(`/b2b/${item.id}`)} onDecide={requestDecision} onEdit={(item) => setDrawer({ type: 'b2b-proposal', item })} onDelete={requestB2bProposalDelete} />}
          {!loading && !error && section === 'challenges' && <ChallengePassportsTable selection={selection} passports={rows} query={query} allowReward={isSuperAdmin} onRedeem={(passport) => { setRewardError(''); setPendingReward(passport); }} onDelete={isSuperAdmin ? requestPassportDelete : undefined} />}
          {!loading && !error && section === 'wheel' && <WheelPlaysTable selection={selection} plays={rows} query={query} onClaim={(play) => { setRewardError(''); setPendingClaim(play); }} onDelete={isSuperAdmin ? requestWheelPlayDelete : undefined} />}
        </section>
      </main>
      )}

      {drawer?.type === 'occupant' && <OccupantDrawer occupant={drawer.item} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'user' && <UserDrawer user={drawer.item} occupants={occupants} token={session.token} currentRole={session.user.role} currentUserId={session.user.id} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'program' && <ProgramEventDrawer programEvent={drawer.item} occupants={occupants} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'investor-request' && <InvestorRequestDrawer token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'b2b-proposal' && <B2bProposalDrawer proposal={drawer.item} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {wheelCode && <WheelCodeDialog codes={wheel.codes} created={wheelCode.data} loading={wheelCode.loading} error={wheelCode.error} onNew={generateWheelCode} onClose={() => setWheelCode(null)} />}
      {pendingDelete && <ConfirmDelete subject={pendingDelete} loading={deleting} error={deleteError} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />}
      {pendingDecision && <ConfirmDecision {...pendingDecision} loading={deciding} error={decisionError} onCancel={() => setPendingDecision(null)} onConfirm={confirmDecision} />}
      {pendingClaim && <ConfirmReward passport={{ displayName: pendingClaim.player?.displayName || 'ce joueur', code: pendingClaim.code }} prize={pendingClaim.result.label} loading={rewarding} error={rewardError} onCancel={() => setPendingClaim(null)} onConfirm={confirmWheelClaim} />}
      {pendingReward && <ConfirmReward passport={pendingReward} loading={rewarding} error={rewardError} onCancel={() => setPendingReward(null)} onConfirm={confirmReward} />}
      {qrCode && <QrCodeDialog {...qrCode} onClose={() => setQrCode(null)} />}
    </>
  );
}
