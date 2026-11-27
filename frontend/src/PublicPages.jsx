import { useEffect } from 'react';
import PublicHeader from './components/PublicHeader';
import PublicBottomNav from './components/PublicBottomNav';
import BrandFooter from './components/BrandFooter';
import B2bDetailPage from './pages/B2bDetailPage';
import B2bListPage from './pages/B2bListPage';
import HomePage from './pages/HomePage';
import GuichetsPage from './pages/GuichetsPage';
import NotFoundPage from './pages/NotFoundPage';
import StandDetailPage from './pages/StandDetailPage';
import StandListPage from './pages/StandListPage';
import StudioInvitationPage from './pages/StudioInvitationPage';
import ChallengePage from './pages/ChallengePage';
import MeetingsPage from './pages/MeetingsPage';
import ScreenPage from './pages/ScreenPage';
import PassagePage from './pages/PassagePage';
import RewardPage from './pages/RewardPage';
import { setPageTitle, titleForPath } from './lib/page-title';
import './public.css';

export default function PublicPages({ path }) {
  // Chaque nouvelle page s'ouvre en haut, avec son titre d'onglet (les fiches précisent le leur une fois chargées).
  useEffect(() => {
    window.scrollTo(0, 0);
    setPageTitle(titleForPath(path));
  }, [path]);

  const standDetail = path.match(/^\/stands\/([a-z0-9-]+)$/);
  const b2bDetail = path.match(/^\/b2b\/([a-f0-9-]+)$/i);
  const studioInvitation = path.match(/^\/studio\/([a-f0-9]{64})$/i);
  const challengePassport = path.match(/^\/defis\/([a-f0-9]{64})$/i);
  // QR posé devant un stand, et QR du comptoir des récompenses du Stand API-ZF.
  const passage = path.match(/^\/passage\/([a-z0-9-]+)\/([A-Za-z0-9_-]+)$/);
  const reward = path.match(/^\/recuperer\/([A-Za-z0-9_-]+)$/);

  // Grand écran du Stand : plein écran, sans en-tête, menu ni pied de page.
  if (path === '/ecran') return <ScreenPage />;

  let page;

  if (path === '/') {
    page = <HomePage />;
  } else if (path === '/stands') {
    page = <StandListPage />;
  } else if (standDetail) {
    page = <StandDetailPage key={standDetail[1]} slug={standDetail[1]} />;
  } else if (path === '/guichets') {
    page = <GuichetsPage mode="book" />;
  } else if (path === '/guichets/rappel' || path === '/investor-desk') {
    page = <GuichetsPage mode="callback" />;
  } else if (path === '/b2b') {
    page = <B2bListPage />;
  } else if (path === '/rencontres') {
    page = <MeetingsPage />;
  } else if (b2bDetail) {
    page = <B2bDetailPage key={b2bDetail[1]} id={b2bDetail[1]} />;
  } else if (studioInvitation) {
    page = <StudioInvitationPage token={studioInvitation[1]} />;
  } else if (path === '/defis') {
    page = <ChallengePage />;
  } else if (path === '/roue') {
    page = <ChallengePage openWheel />;
  } else if (passage) {
    page = <PassagePage key={path} slug={passage[1]} sig={passage[2]} />;
  } else if (reward) {
    page = <RewardPage key={path} sig={reward[1]} />;
  } else if (challengePassport) {
    page = <ChallengePage token={challengePassport[1]} />;
  } else {
    page = <NotFoundPage />;
  }

  return (
    <div className="public-app">
      <PublicHeader path={path} />
      {page}
      <BrandFooter />
      <PublicBottomNav path={path} />
    </div>
  );
}
