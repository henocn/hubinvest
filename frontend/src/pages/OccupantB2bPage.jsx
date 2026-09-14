import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Handshake, Pencil, Plus } from 'lucide-react';
import B2bNeedForm from '../components/occupant/B2bNeedForm';
import B2bProposalList from '../components/occupant/B2bProposalList';
import { api } from '../lib/api';

export default function OccupantB2bPage({ session, onLogout }) {
  const [view, setView] = useState('list');
  const [needs, setNeeds] = useState([]);
  const [selectedNeed, setSelectedNeed] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProposalId, setLoadingProposalId] = useState('');
  const [error, setError] = useState('');
  const canManage = session.user.role === 'occupant-responsable';

  const loadNeeds = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setNeeds(await api.b2bNeeds(session.token));
    } catch (requestError) {
      if (requestError.status === 401 || requestError.status === 403) onLogout();
      else setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [onLogout, session.token]);

  useEffect(() => { loadNeeds(); }, [loadNeeds]);

  const openNeed = async (need) => {
    setSelectedNeed(need);
    setView('detail');
    setLoading(true);
    setError('');
    try {
      setProposals(await api.b2bProposals(session.token, need.id));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const saved = async (need) => {
    await loadNeeds();
    setSelectedNeed(need);
    setView('list');
  };

  const decide = async (id, status) => {
    setLoadingProposalId(id);
    setError('');
    try {
      await api.updateB2bProposal(session.token, id, { status });
      setProposals(await api.b2bProposals(session.token, selectedNeed.id));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoadingProposalId('');
    }
  };

  if (view === 'form') return <B2bNeedForm need={selectedNeed} token={session.token} onCancel={() => setView(selectedNeed ? 'detail' : 'list')} onSaved={saved} />;

  return (
    <>
      {view === 'detail' && selectedNeed ? (
        <main className="workspace b2b-workspace-detail">
          <button type="button" className="back-button" onClick={() => { setView('list'); setSelectedNeed(null); }}><ArrowLeft size={18} /> Besoins B2B</button>
          <div className="page-heading heading-with-action"><div><h1>{selectedNeed.title}</h1><p>{selectedNeed.status === 'open' ? 'Ouvert' : 'Fermé'}</p></div>{canManage && <button className="button button-secondary" type="button" onClick={() => setView('form')}><Pencil size={17} /> Modifier</button>}</div>
          <p className="b2b-workspace-description">{selectedNeed.description}</p>
          <h2 className="b2b-proposals-title">Propositions</h2>
          {error && <p className="panel-error">{error}</p>}
          {loading ? <p className="empty-state">Chargement…</p> : <B2bProposalList proposals={proposals} canManage={canManage} loadingId={loadingProposalId} onDecision={decide} />}
        </main>
      ) : (
        <main className="workspace">
          <div className="page-heading heading-with-action"><div><h1>Besoins B2B</h1><p>{session.user.occupant?.name}</p></div>{canManage && <button className="button button-primary" type="button" onClick={() => { setSelectedNeed(null); setView('form'); }}><Plus size={19} /> Nouveau besoin</button>}</div>
          {error && <p className="panel-error">{error}</p>}
          {loading && <p className="empty-state">Chargement…</p>}
          {!loading && !error && needs.length === 0 && <div className="empty-state"><Handshake size={28} /><strong>Aucun besoin publié</strong>{canManage && <span>Publiez le premier besoin de votre stand.</span>}</div>}
          {!loading && needs.length > 0 && <div className="b2b-workspace-list">{needs.map((need) => <button className={`b2b-workspace-row is-${need.status}`} type="button" key={need.id} onClick={() => openNeed(need)}><span><strong>{need.title}</strong><small>{need.description}</small></span><b>{need.status === 'open' ? 'Ouvert' : 'Fermé'}</b></button>)}</div>}
        </main>
      )}
    </>
  );
}
