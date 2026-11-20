import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Download, Plus, QrCode, Search, Ticket } from 'lucide-react';
import ConfirmDelete from '../components/ConfirmDelete';
import OccupantDetail from '../components/OccupantDetail';
import { useRowSelection } from '../components/RowSelection';
import ConfirmReward from '../components/ConfirmReward';
import QrCodeDialog from '../components/QrCodeDialog';
import InvestorRequestDrawer from '../components/drawers/InvestorRequestDrawer';
import B2bNeedDrawer from '../components/drawers/B2bNeedDrawer';
import OccupantDrawer from '../components/drawers/OccupantDrawer';
import ProgramEventDrawer from '../components/drawers/ProgramEventDrawer';
import UserDrawer from '../components/drawers/UserDrawer';
import InvestorRequestsTable from '../components/tables/InvestorRequestsTable';
import B2bNeedsTable from '../components/tables/B2bNeedsTable';
import ChallengePassportsTable from '../components/tables/ChallengePassportsTable';
import OccupantsTable from '../components/tables/OccupantsTable';
import ProgramEventsTable from '../components/tables/ProgramEventsTable';
import UsersTable from '../components/tables/UsersTable';
import WheelSegmentsTable from '../components/tables/WheelSegmentsTable';
import WheelCodesTable from '../components/tables/WheelCodesTable';
import WheelSegmentDrawer from '../components/drawers/WheelSegmentDrawer';
import WheelCodeDialog from '../components/WheelCodeDialog';
import { publicBaseUrl } from '../constants/access';
import { tableSettings } from '../constants/tables';
import { exportToExcel } from '../../lib/excel';
import { api } from '../lib/api';
import { useRealtimeEvent } from '../../lib/realtime';
import { meetingTabs } from '../../navigation';
import { useDashboard } from '../dashboard';

const sectionMeta = {
  occupants: { title: 'Stands' },
  users: { title: 'Accès' },
  program: { title: 'Programme' },
  'investor-requests': { title: 'Investor Desk' },
  b2b: { title: 'B2B' },
  challenges: { title: 'Participants aux défis' },
  wheel: { title: 'Roue des opportunités' },
};

// Page d'une rubrique de l'administration ; la rubrique vient de l'adresse (/stands, /b2b, /roue…).
export default function BackofficePage({ session, onLogout, section }) {
  const isSuperAdmin = session.user.role === 'super-admin';
  const isAdmin = session.user.role === 'admin';
  const todo = useDashboard()?.data?.todo || {};
  const location = useLocation();
  const navigate = useNavigate();
  const detailId = section === 'occupants' ? location.pathname.split('/')[2] || null : null;
  const [occupants, setOccupants] = useState([]);
  const [users, setUsers] = useState([]);
  const [investorRequests, setInvestorRequests] = useState([]);
  const [b2bNeeds, setB2bNeeds] = useState([]);
  const [programEvents, setProgramEvents] = useState([]);
  const [challengePassports, setChallengePassports] = useState([]);
  const [contactStats, setContactStats] = useState({ total: 0, byOccupant: {} });
  const [wheel, setWheel] = useState({ segments: [], codes: [], stats: { played: 0, awarded: 0, remaining: 0 } });
  const [wheelCode, setWheelCode] = useState(null);
  const [search, setSearch] = useState('');
  const [sortValue, setSortValue] = useState('');
  const [exporting, setExporting] = useState(false);
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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isSuperAdmin) {
        const [occupantData, userData, statsData, investorData, b2bData, challengeData, programData, wheelData] = await Promise.all([
          api.occupants(session.token),
          api.users(session.token),
          api.contactStats(session.token),
          api.investorRequests(session.token),
          api.b2bNeeds(session.token),
          api.challengePassports(session.token),
          api.programEvents(session.token),
          api.wheel(session.token),
        ]);
        setOccupants(occupantData);
        setUsers(userData);
        setContactStats(statsData);
        setInvestorRequests(investorData.items);
        setB2bNeeds(b2bData);
        setChallengePassports(challengeData);
        setProgramEvents(programData);
        setWheel(wheelData);
      } else {
        const [investorData, needData, challengeData, wheelData] = await Promise.all([
          api.investorRequests(session.token),
          api.b2bNeeds(session.token),
          api.challengePassports(session.token),
          api.wheel(session.token),
        ]);
        setInvestorRequests(investorData.items);
        setB2bNeeds(needData);
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
      'investor-requests': async () => setInvestorRequests((await api.investorRequests(token)).items),
      b2b: async () => setB2bNeeds(await api.b2bNeeds(token)),
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
  const visibleInvestorRequests = useMemo(() => investorRequests.filter((item) => !query || [item.fullName, item.email, item.projectSummary, item.nextAction].some((value) => String(value || '').toLowerCase().includes(query))), [investorRequests, query]);
  const visibleB2bNeeds = useMemo(() => b2bNeeds.filter((item) => !query || [item.title, item.occupant?.name, item.status].some((value) => String(value || '').toLowerCase().includes(query))), [b2bNeeds, query]);
  const visibleProgramEvents = useMemo(() => programEvents.filter((item) => !query || [item.title, item.location, item.description, item.occupant?.name].some((value) => String(value || '').toLowerCase().includes(query))), [programEvents, query]);
  const visibleChallengePassports = useMemo(() => challengePassports.filter((item) => !query || [item.displayName, item.email, item.phone, item.contact, item.code, ...(item.passages || []).flatMap((passage) => [passage.occupant?.name, passage.validatedBy?.firstName, passage.validatedBy?.lastName])].some((value) => String(value || '').toLowerCase().includes(query))), [challengePassports, query]);

  const visibleWheelSegments = useMemo(() => wheel.segments.filter((item) => !query || [item.label, item.sponsor].some((value) => String(value || '').toLowerCase().includes(query))), [wheel.segments, query]);

  // Chaque rubrique s'ouvre avec une recherche vide.
  useEffect(() => {
    setSearch('');
    setSortValue('');
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
    b2b: visibleB2bNeeds,
    challenges: visibleChallengePassports,
    wheel: visibleWheelSegments,
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
  // Pour la roue : les parties jouées, limitées aux lots cochés s'il y en a.
  const exportRows = async () => {
    setExporting(true);
    try {
      const chosen = checkedCount ? selection.selected : rows;
      let data = chosen;
      if (section === 'wheel') {
        const plays = await api.wheelPlays(session.token);
        const labels = new Set(selection.selected.map((segment) => segment.label));
        data = checkedCount ? plays.filter((play) => labels.has(play.result?.label)) : plays;
      }
      await exportToExcel({
        name: settings.exportName,
        sheetName: sectionMeta[section].title,
        columns: settings.columns({ contactStats, publicBaseUrl }),
        rows: data,
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setExporting(false);
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

  const requestWheelDelete = (segment) => {
    setDeleteError('');
    setPendingDelete({ type: 'wheel', item: segment, label: `la case « ${segment.label} » de la roue` });
  };

  // Délivre un code de jeu et l'affiche en grand pour le joueur.
  const generateWheelCode = async () => {
    setWheelCode((current) => ({ data: current?.data || null, loading: true, error: '' }));
    try {
      const data = await api.createWheelCode(session.token);
      setWheelCode({ data, loading: false, error: '' });
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
      else if (pendingDelete.type === 'wheel') await api.deleteWheelSegment(session.token, pendingDelete.item.id);
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
      {detailId ? (
        loading ? <main className="admin-workspace"><p className="panel-message">Chargement…</p></main>
          : occupants.find((item) => item.id === detailId) ? (
            <OccupantDetail
              occupant={occupants.find((item) => item.id === detailId)}
              users={users}
              contactCount={contactStats.byOccupant[detailId] || 0}
              programEvents={programEvents}
              b2bNeeds={b2bNeeds}
              investorRequests={investorRequests}
              challengePassports={challengePassports}
              onEdit={() => setDrawer({ type: 'occupant', item: occupants.find((item) => item.id === detailId) })}
              onDelete={() => requestOccupantDelete(occupants.find((item) => item.id === detailId))}
              onQrCode={setQrCode}
            />
          ) : <main className="admin-workspace"><p className="panel-message">Ce stand n’existe plus. <a href="/stands" onClick={(event) => { event.preventDefault(); navigate('/stands'); }}>Retour aux stands</a></p></main>
      ) : (
      <main className="admin-workspace">
        <header className="workspace-header">
          {meetingTabs.some((item) => item.section === section) ? (
            // Rencontres : un titre et deux onglets, B2B et Investor Desk, avec ce qui attend une action.
            <div className="section-heading">
              <h1>Rencontres</h1>
              <nav className="section-tabs" aria-label="Rencontres">
                {meetingTabs.map((item) => (
                  <NavLink key={item.path} to={item.path} className={({ isActive }) => (isActive ? 'is-active' : '')}>
                    {item.label}{todo[item.section] > 0 && <b>{todo[item.section]}</b>}
                  </NavLink>
                ))}
              </nav>
            </div>
          ) : <h1>{sectionMeta[section].title}</h1>}
          {(section === 'occupants' || section === 'users' || section === 'program' || section === 'b2b' || section === 'investor-requests' || section === 'challenges' || section === 'wheel') && <div className="workspace-actions">
            {section === 'challenges' && <button className="button button-secondary" type="button" onClick={() => setQrCode({ title: 'QR des Défis', url: `${publicBaseUrl}/defis`, fileName: 'hubinvest-defis' })}><QrCode size={16} /> QR des Défis</button>}
            {section === 'program' && <button className="button button-primary" type="button" onClick={() => setDrawer({ type: 'program', item: null })}><Plus size={16} /> Ajouter au programme</button>}
            {section === 'wheel' && <><button className="button button-secondary" type="button" onClick={() => setDrawer({ type: 'wheel', item: null })}><Plus size={16} /> Nouvelle case</button><button className="button button-primary" type="button" onClick={generateWheelCode}><Ticket size={16} /> Générer un code</button></>}
            {section !== 'challenges' && section !== 'program' && section !== 'wheel' && <button className="button button-primary" type="button" onClick={() => setDrawer({ type: section === 'occupants' ? 'occupant' : section === 'users' ? 'user' : section === 'b2b' ? 'b2b' : 'investor-request', item: null })}><Plus size={16} /> {section === 'occupants' ? 'Stand' : section === 'users' ? 'Nouvel utilisateur' : section === 'b2b' ? 'Besoin' : 'Demande'}</button>}
          </div>}
        </header>

        <section className="data-panel">
          <header className="data-toolbar">
            <div className="data-toolbar-controls">
              <label className="admin-search-field"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher" aria-label={section === 'occupants' ? 'Rechercher un occupant' : section === 'users' ? 'Rechercher un utilisateur' : section === 'program' ? 'Rechercher dans le programme' : section === 'b2b' ? 'Rechercher un besoin' : section === 'challenges' ? 'Rechercher un participant' : section === 'wheel' ? 'Rechercher un lot' : 'Rechercher une demande'} /></label>
              {toolbarNote && <span className="data-note">{toolbarNote}</span>}
              <select value={sortValue || settings.sorts[0].value} onChange={(event) => setSortValue(event.target.value)} aria-label="Trier">
                {settings.sorts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <button className="button button-secondary data-export" type="button" onClick={exportRows} disabled={loading || exporting || (section !== 'wheel' && !rows.length)} title={checkedCount ? `Exporter les ${checkedCount} lignes cochées` : 'Exporter tout le tableau'}>
                <Download size={15} /> {exporting ? 'Export…' : section === 'wheel' ? 'Exporter les parties' : 'Exporter'}{checkedCount > 0 && !exporting && ` (${checkedCount})`}
              </button>
            </div>
          </header>
          {error && <p className="panel-message is-error">{error}</p>}
          {loading && <p className="panel-message">Chargement des données...</p>}
          {!loading && !error && section === 'occupants' && <OccupantsTable selection={selection} occupants={rows} contactStats={contactStats} query={query} onEdit={(item) => setDrawer({ type: 'occupant', item })} onDelete={requestOccupantDelete} />}
          {!loading && !error && section === 'users' && <UsersTable selection={selection} users={rows} query={query} currentUserId={session.user.id} onEdit={(item) => setDrawer({ type: 'user', item })} onDelete={requestUserDelete} />}
          {!loading && !error && section === 'program' && <ProgramEventsTable selection={selection} events={rows} query={query} onEdit={(item) => setDrawer({ type: 'program', item })} onDelete={requestProgramDelete} />}
          {!loading && !error && section === 'investor-requests' && <InvestorRequestsTable selection={selection} requests={rows} query={query} showStand={isSuperAdmin} onEdit={(item) => setDrawer({ type: 'investor-request', item })} />}
          {!loading && !error && section === 'b2b' && <B2bNeedsTable selection={selection} needs={rows} query={query} showStand={isSuperAdmin} onEdit={(item) => setDrawer({ type: 'b2b', item })} />}
          {!loading && !error && section === 'challenges' && <ChallengePassportsTable selection={selection} passports={rows} query={query} allowReward={isSuperAdmin} onRedeem={(passport) => { setRewardError(''); setPendingReward(passport); }} />}
          {!loading && !error && section === 'wheel' && <WheelSegmentsTable selection={selection} segments={rows} query={query} onEdit={(item) => setDrawer({ type: 'wheel', item })} onDelete={requestWheelDelete} />}
        </section>
        {section === 'wheel' && !loading && !error && <section className="data-panel wheel-codes-panel"><h2>Derniers codes</h2><WheelCodesTable codes={wheel.codes} /></section>}
      </main>
      )}

      {drawer?.type === 'occupant' && <OccupantDrawer occupant={drawer.item} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'user' && <UserDrawer user={drawer.item} occupants={occupants} token={session.token} currentRole={session.user.role} currentUserId={session.user.id} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'program' && <ProgramEventDrawer programEvent={drawer.item} occupants={occupants} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'investor-request' && <InvestorRequestDrawer investorRequest={drawer.item} occupants={occupants} fixedOccupant={isAdmin ? session.user.occupant : null} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'b2b' && <B2bNeedDrawer need={drawer.item} occupants={occupants} fixedOccupant={isAdmin ? session.user.occupant : null} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'wheel' && <WheelSegmentDrawer segment={drawer.item} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {wheelCode && <WheelCodeDialog wheelCode={wheelCode.data} loading={wheelCode.loading} error={wheelCode.error} onNew={generateWheelCode} onClose={() => setWheelCode(null)} />}
      {pendingDelete && <ConfirmDelete subject={pendingDelete} loading={deleting} error={deleteError} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />}
      {pendingReward && <ConfirmReward passport={pendingReward} loading={rewarding} error={rewardError} onCancel={() => setPendingReward(null)} onConfirm={confirmReward} />}
      {qrCode && <QrCodeDialog {...qrCode} onClose={() => setQrCode(null)} />}
    </>
  );
}
