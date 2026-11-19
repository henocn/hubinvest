import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, QrCode, Search, Ticket } from 'lucide-react';
import ConfirmDelete from '../components/ConfirmDelete';
import ConfirmReward from '../components/ConfirmReward';
import QrCodeDialog from '../components/QrCodeDialog';
import InvestorRequestDrawer from '../components/drawers/InvestorRequestDrawer';
import B2bNeedDrawer from '../components/drawers/B2bNeedDrawer';
import OccupantDrawer from '../components/drawers/OccupantDrawer';
import ProgramEventDrawer from '../components/drawers/ProgramEventDrawer';
import StudioInvitationDrawer from '../components/drawers/StudioInvitationDrawer';
import UserDrawer from '../components/drawers/UserDrawer';
import InvestorRequestsTable from '../components/tables/InvestorRequestsTable';
import B2bNeedsTable from '../components/tables/B2bNeedsTable';
import ChallengePassportsTable from '../components/tables/ChallengePassportsTable';
import OccupantsTable from '../components/tables/OccupantsTable';
import ProgramEventsTable from '../components/tables/ProgramEventsTable';
import StudioInvitationsTable from '../components/tables/StudioInvitationsTable';
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

const sectionMeta = {
  occupants: { title: 'Stands', description: 'Fiches publiques, emplacements et statuts.' },
  users: { title: 'Accès', description: 'Comptes et niveaux d’accès à la plateforme.' },
  program: { title: 'Programme', description: 'Stand à l’affiche, animations et temps forts affichés sur l’accueil.' },
  'investor-requests': { title: 'Investor Desk', description: 'Demandes de professionnels adressées à l’API-ZF.' },
  b2b: { title: 'B2B', description: 'Besoins publiés et propositions reçues.' },
  studio: { title: 'Studio', description: 'Invitations et planning des invités.' },
  challenges: { title: 'Participants aux défis', description: 'Contacts, progression et remise des récompenses.' },
  wheel: { title: 'Roue des opportunités', description: 'Lots, quantités et codes de jeu à usage unique.' },
};

// Page d'une rubrique de l'administration ; la rubrique vient de l'adresse (/stands, /b2b, /roue…).
export default function BackofficePage({ session, onLogout, section }) {
  const isSuperAdmin = session.user.role === 'super-admin';
  const isAdmin = session.user.role === 'admin';
  const [occupants, setOccupants] = useState([]);
  const [users, setUsers] = useState([]);
  const [investorRequests, setInvestorRequests] = useState([]);
  const [b2bNeeds, setB2bNeeds] = useState([]);
  const [studioInvitations, setStudioInvitations] = useState([]);
  const [programEvents, setProgramEvents] = useState([]);
  const [challengePassports, setChallengePassports] = useState([]);
  const [contactStats, setContactStats] = useState({ total: 0, byOccupant: {} });
  const [wheel, setWheel] = useState({ segments: [], codes: [], stats: { played: 0, awarded: 0, remaining: 0 } });
  const [wheelCode, setWheelCode] = useState(null);
  const [search, setSearch] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [sortValue, setSortValue] = useState('');
  const [exporting, setExporting] = useState(false);
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
        const [occupantData, userData, statsData, investorData, b2bData, studioData, challengeData, programData, wheelData] = await Promise.all([
          api.occupants(session.token),
          api.users(session.token),
          api.contactStats(session.token),
          api.investorRequests(session.token),
          api.b2bNeeds(session.token),
          api.studioInvitations(session.token),
          api.challengePassports(session.token),
          api.programEvents(session.token),
          api.wheel(session.token),
        ]);
        setOccupants(occupantData);
        setUsers(userData);
        setContactStats(statsData);
        setInvestorRequests(investorData.items);
        setB2bNeeds(b2bData);
        setStudioInvitations(studioData);
        setChallengePassports(challengeData);
        setProgramEvents(programData);
        setWheel(wheelData);
      } else {
        const [investorData, needData, studioData, challengeData, wheelData] = await Promise.all([
          api.investorRequests(session.token),
          api.b2bNeeds(session.token),
          api.studioInvitations(session.token),
          api.challengePassports(session.token),
          api.wheel(session.token),
        ]);
        setInvestorRequests(investorData.items);
        setB2bNeeds(needData);
        setStudioInvitations(studioData);
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
      studio: async () => setStudioInvitations(await api.studioInvitations(token)),
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
  useRealtimeEvent('studio', () => reloadTopic('studio'));
  useRealtimeEvent('challenge', () => reloadTopic('challenge'));
  useRealtimeEvent('wheel', () => reloadTopic('wheel'));
  useRealtimeEvent('account', () => reloadTopic('account'));

  const query = search.trim().toLowerCase();
  const visibleOccupants = useMemo(() => occupants.filter((occupant) => !query || [occupant.name, occupant.activity, occupant.standLabel].some((value) => String(value || '').toLowerCase().includes(query))), [occupants, query]);
  const visibleUsers = useMemo(() => users.filter((user) => !query || [user.firstName, user.lastName, user.email, user.role, user.occupant?.name].some((value) => String(value || '').toLowerCase().includes(query))), [users, query]);
  const visibleInvestorRequests = useMemo(() => investorRequests.filter((item) => !query || [item.fullName, item.email, item.projectSummary, item.nextAction].some((value) => String(value || '').toLowerCase().includes(query))), [investorRequests, query]);
  const visibleB2bNeeds = useMemo(() => b2bNeeds.filter((item) => !query || [item.title, item.occupant?.name, item.status].some((value) => String(value || '').toLowerCase().includes(query))), [b2bNeeds, query]);
  const visibleStudioInvitations = useMemo(() => studioInvitations.filter((item) => !query || [item.guestName, item.subject].some((value) => String(value || '').toLowerCase().includes(query))), [studioInvitations, query]);
  const visibleProgramEvents = useMemo(() => programEvents.filter((item) => !query || [item.title, item.location, item.description, item.occupant?.name].some((value) => String(value || '').toLowerCase().includes(query))), [programEvents, query]);
  const programTodayStart = new Date().setUTCHours(0, 0, 0, 0);
  const programTodayEnd = programTodayStart + 86_400_000;
  const visibleChallengePassports = useMemo(() => challengePassports.filter((item) => !query || [item.displayName, item.email, item.phone, item.contact, item.code, ...(item.passages || []).flatMap((passage) => [passage.occupant?.name, passage.validatedBy?.firstName, passage.validatedBy?.lastName])].some((value) => String(value || '').toLowerCase().includes(query))), [challengePassports, query]);

  const visibleWheelSegments = useMemo(() => wheel.segments.filter((item) => !query || [item.label, item.sponsor].some((value) => String(value || '').toLowerCase().includes(query))), [wheel.segments, query]);

  // Chaque rubrique s'ouvre avec une recherche vide.
  useEffect(() => {
    setSearch('');
    setFilterValue('');
    setSortValue('');
  }, [section]);

  // Filtre et tri du tableau affiché : le premier tri proposé est celui par défaut.
  const settings = tableSettings[section];
  const arrange = (items) => {
    const matches = (item) => {
      const result = settings.filterOf(item, filterValue);
      return result === true || result === filterValue;
    };
    const sorter = settings.sorts.find((item) => item.value === sortValue) || settings.sorts[0];
    return (filterValue ? items.filter(matches) : [...items]).sort(sorter.compare);
  };
  const sectionRows = {
    occupants: visibleOccupants,
    users: visibleUsers,
    program: visibleProgramEvents,
    'investor-requests': visibleInvestorRequests,
    b2b: visibleB2bNeeds,
    studio: visibleStudioInvitations,
    challenges: visibleChallengePassports,
    wheel: visibleWheelSegments,
  };
  const rows = arrange(sectionRows[section] || []);

  // Exporte exactement les lignes affichées ; pour la roue, toutes les parties jouées.
  const exportRows = async () => {
    setExporting(true);
    try {
      const data = section === 'wheel' ? await api.wheelPlays(session.token) : rows;
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
      await loadData();
    } catch (requestError) {
      setDeleteError(requestError.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <main className="admin-workspace">
        <header className="workspace-header">
          <div><h1>{sectionMeta[section].title}</h1><p>{sectionMeta[section].description}</p></div>
          {(section === 'occupants' || section === 'users' || section === 'program' || section === 'b2b' || section === 'studio' || section === 'challenges' || section === 'wheel') && <div className="workspace-actions">
            {section === 'occupants' && <button className="button button-secondary" type="button" onClick={() => setQrCode({ title: 'QR du Hub', url: `${publicBaseUrl}/stands`, fileName: 'hubinvest-hub' })}><QrCode size={18} /> QR du Hub</button>}
            {section === 'challenges' && <button className="button button-secondary" type="button" onClick={() => setQrCode({ title: 'QR des Défis', url: `${publicBaseUrl}/defis`, fileName: 'hubinvest-defis' })}><QrCode size={18} /> QR des Défis</button>}
            {section === 'program' && <button className="button button-primary" type="button" onClick={() => setDrawer({ type: 'program', item: null })}><Plus size={18} /> Ajouter au programme</button>}
            {section === 'wheel' && <><button className="button button-secondary" type="button" onClick={() => setDrawer({ type: 'wheel', item: null })}><Plus size={18} /> Nouvelle case</button><button className="button button-primary" type="button" onClick={generateWheelCode}><Ticket size={18} /> Générer un code</button></>}
            {section !== 'challenges' && section !== 'program' && section !== 'wheel' && <button className="button button-primary" type="button" onClick={() => setDrawer({ type: section === 'occupants' ? 'occupant' : section === 'users' ? 'user' : section === 'b2b' ? 'b2b' : 'studio', item: null })}><Plus size={18} /> {section === 'occupants' ? 'Nouveau stand' : section === 'users' ? 'Nouvel utilisateur' : section === 'b2b' ? 'Nouveau besoin' : 'Nouvelle invitation'}</button>}
          </div>}
        </header>

        {section === 'wheel' ? (
          <section className="summary-row" aria-label="Résumé">
            <article><span>Parties jouées</span><strong>{loading || error ? '—' : wheel.stats.played}</strong><small>codes utilisés</small></article>
            <article><span>Lots gagnés</span><strong>{loading || error ? '—' : wheel.stats.awarded}</strong><small>depuis l’ouverture</small></article>
            <article><span>Lots restants</span><strong>{loading || error ? '—' : wheel.stats.remaining}</strong><small>encore sur la roue</small></article>
          </section>
        ) : section === 'challenges' ? (
          <section className="summary-row" aria-label="Résumé">
            <article><span>En cours</span><strong>{loading || error ? '—' : challengePassports.filter((item) => item.status === 'active').length}</strong><small>parcours commencés</small></article>
            <article><span>Terminés</span><strong>{loading || error ? '—' : challengePassports.filter((item) => item.status === 'completed').length}</strong><small>récompenses à remettre</small></article>
            <article><span>Remises</span><strong>{loading || error ? '—' : challengePassports.filter((item) => item.status === 'redeemed').length}</strong><small>récompenses enregistrées</small></article>
          </section>
        ) : section === 'program' ? (
          <section className="summary-row" aria-label="Résumé">
            <article><span>Aujourd’hui</span><strong>{loading || error ? '—' : programEvents.filter((item) => item.type !== 'spotlight' && new Date(item.startsAt) >= programTodayStart && new Date(item.startsAt) < programTodayEnd).length}</strong><small>rendez-vous du jour</small></article>
            <article><span>À venir</span><strong>{loading || error ? '—' : programEvents.filter((item) => item.type !== 'spotlight' && new Date(item.startsAt) >= programTodayEnd).length}</strong><small>rendez-vous programmés</small></article>
            <article><span>À l’affiche</span><strong>{loading || error ? '—' : programEvents.find((item) => item.type === 'spotlight' && new Date(item.startsAt) >= programTodayStart && new Date(item.startsAt) < programTodayEnd)?.occupant?.name || 'Aucun'}</strong><small>stand du jour</small></article>
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
            <label className="admin-search-field"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={section === 'occupants' ? 'Rechercher un occupant' : section === 'users' ? 'Rechercher un utilisateur' : section === 'program' ? 'Rechercher dans le programme' : section === 'b2b' ? 'Rechercher un besoin' : section === 'studio' ? 'Rechercher une invitation' : section === 'challenges' ? 'Rechercher un participant' : section === 'wheel' ? 'Rechercher un lot' : 'Rechercher une demande'} /></label>
            <div className="data-toolbar-controls">
              <select value={filterValue} onChange={(event) => setFilterValue(event.target.value)} aria-label={settings.filterLabel}>
                <option value="">{settings.filterLabel} : tous</option>
                {settings.filters.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <select value={sortValue || settings.sorts[0].value} onChange={(event) => setSortValue(event.target.value)} aria-label="Trier">
                {settings.sorts.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
              <span className="data-count">{loading ? '—' : rows.length} ligne{rows.length > 1 ? 's' : ''}</span>
              <button className="button button-secondary data-export" type="button" onClick={exportRows} disabled={loading || exporting || (section !== 'wheel' && !rows.length)}>
                <Download size={16} /> {exporting ? 'Export…' : section === 'wheel' ? 'Exporter les parties' : 'Exporter'}
              </button>
            </div>
          </header>
          {error && <p className="panel-message is-error">{error}</p>}
          {loading && <p className="panel-message">Chargement des données...</p>}
          {!loading && !error && section === 'occupants' && <OccupantsTable occupants={rows} contactStats={contactStats} query={query} onQrCode={setQrCode} onEdit={(item) => setDrawer({ type: 'occupant', item })} onDelete={requestOccupantDelete} />}
          {!loading && !error && section === 'users' && <UsersTable users={rows} query={query} currentUserId={session.user.id} onEdit={(item) => setDrawer({ type: 'user', item })} onDelete={requestUserDelete} />}
          {!loading && !error && section === 'program' && <ProgramEventsTable events={rows} query={query} onEdit={(item) => setDrawer({ type: 'program', item })} onDelete={requestProgramDelete} />}
          {!loading && !error && section === 'investor-requests' && <InvestorRequestsTable requests={rows} query={query} showStand={isSuperAdmin} onEdit={(item) => setDrawer({ type: 'investor-request', item })} />}
          {!loading && !error && section === 'b2b' && <B2bNeedsTable needs={rows} query={query} showStand={isSuperAdmin} onEdit={(item) => setDrawer({ type: 'b2b', item })} />}
          {!loading && !error && section === 'studio' && <StudioInvitationsTable invitations={rows} query={query} showStand={isSuperAdmin} copiedId={copiedInvitationId} onCopy={copyInvitationLink} onEdit={(item) => setDrawer({ type: 'studio', item })} />}
          {!loading && !error && section === 'challenges' && <ChallengePassportsTable passports={rows} query={query} allowReward={isSuperAdmin} onRedeem={(passport) => { setRewardError(''); setPendingReward(passport); }} />}
          {!loading && !error && section === 'wheel' && <WheelSegmentsTable segments={rows} query={query} onEdit={(item) => setDrawer({ type: 'wheel', item })} onDelete={requestWheelDelete} />}
        </section>
        {section === 'wheel' && !loading && !error && <section className="data-panel wheel-codes-panel"><h2>Derniers codes</h2><WheelCodesTable codes={wheel.codes} /></section>}
      </main>

      {drawer?.type === 'occupant' && <OccupantDrawer occupant={drawer.item} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'user' && <UserDrawer user={drawer.item} occupants={occupants} token={session.token} currentRole={session.user.role} currentUserId={session.user.id} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'program' && <ProgramEventDrawer programEvent={drawer.item} occupants={occupants} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'investor-request' && <InvestorRequestDrawer investorRequest={drawer.item} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'b2b' && <B2bNeedDrawer need={drawer.item} occupants={occupants} fixedOccupant={isAdmin ? session.user.occupant : null} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'studio' && <StudioInvitationDrawer invitation={drawer.item} occupants={occupants} fixedOccupant={isAdmin ? session.user.occupant : null} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {drawer?.type === 'wheel' && <WheelSegmentDrawer segment={drawer.item} token={session.token} onClose={() => setDrawer(null)} onSaved={saved} />}
      {wheelCode && <WheelCodeDialog wheelCode={wheelCode.data} loading={wheelCode.loading} error={wheelCode.error} onNew={generateWheelCode} onClose={() => setWheelCode(null)} />}
      {pendingDelete && <ConfirmDelete subject={pendingDelete} loading={deleting} error={deleteError} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />}
      {pendingReward && <ConfirmReward passport={pendingReward} loading={rewarding} error={rewardError} onCancel={() => setPendingReward(null)} onConfirm={confirmReward} />}
      {qrCode && <QrCodeDialog {...qrCode} onClose={() => setQrCode(null)} />}
    </>
  );
}
