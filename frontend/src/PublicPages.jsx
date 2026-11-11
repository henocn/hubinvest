import PublicHeader from './components/PublicHeader';
import PublicBottomNav from './components/PublicBottomNav';
import BrandFooter from './components/BrandFooter';
import B2bDetailPage from './pages/B2bDetailPage';
import B2bListPage from './pages/B2bListPage';
import HomePage from './pages/HomePage';
import InvestorDeskPage from './pages/InvestorDeskPage';
import NotFoundPage from './pages/NotFoundPage';
import StandDetailPage from './pages/StandDetailPage';
import StandListPage from './pages/StandListPage';
import StudioInvitationPage from './pages/StudioInvitationPage';
import ChallengePage from './pages/ChallengePage';
import MeetingsPage from './pages/MeetingsPage';
import WheelPage from './pages/WheelPage';
import './public.css';

export default function PublicPages({ path }) {
  const standDetail = path.match(/^\/stands\/([a-z0-9-]+)$/);
  const b2bDetail = path.match(/^\/b2b\/([a-f0-9-]+)$/i);
  const studioInvitation = path.match(/^\/studio\/([a-f0-9]{64})$/i);
  const challengePassport = path.match(/^\/defis\/([a-f0-9]{64})$/i);

  let page;

  if (path === '/') {
    page = <HomePage />;
  } else if (path === '/stands') {
    page = <StandListPage />;
  } else if (standDetail) {
    page = <StandDetailPage slug={standDetail[1]} />;
  } else if (path === '/investor-desk') {
    page = <InvestorDeskPage />;
  } else if (path === '/b2b') {
    page = <B2bListPage />;
  } else if (path === '/rencontres') {
    page = <MeetingsPage />;
  } else if (b2bDetail) {
    page = <B2bDetailPage id={b2bDetail[1]} />;
  } else if (studioInvitation) {
    page = <StudioInvitationPage token={studioInvitation[1]} />;
  } else if (path === '/defis') {
    page = <ChallengePage />;
  } else if (path === '/roue') {
    page = <WheelPage />;
  } else if (challengePassport) {
    page = <ChallengePage token={challengePassport[1]} />;
  } else {
    page = <NotFoundPage />;
  }

  return (
    <div className="public-app">
      <PublicHeader />
      {page}
      <BrandFooter />
      <PublicBottomNav path={path} />
    </div>
  );
}
