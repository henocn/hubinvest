import PublicHeader from './components/PublicHeader';
import InvestorDeskPage from './pages/InvestorDeskPage';
import NotFoundPage from './pages/NotFoundPage';
import StandDetailPage from './pages/StandDetailPage';
import StandListPage from './pages/StandListPage';
import './public.css';

export default function PublicPages({ path }) {
  const standDetail = path.match(/^\/stands\/([a-z0-9-]+)$/);

  let page;

  if (path === '/' || path === '/stands') {
    page = <StandListPage isHome={path === '/'} />;
  } else if (standDetail) {
    page = <StandDetailPage slug={standDetail[1]} />;
  } else if (path === '/investor-desk') {
    page = <InvestorDeskPage />;
  } else {
    page = <NotFoundPage />;
  }

  return (
    <div className="public-app">
      <PublicHeader />
      {page}
    </div>
  );
}
