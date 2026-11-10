import './admin.css';
import BackofficePage from './pages/BackofficePage';

export default function AdminApp({ session, onLogout }) {
  return (
    <div className="admin-app">
      <BackofficePage session={session} onLogout={onLogout} />
    </div>
  );
}
