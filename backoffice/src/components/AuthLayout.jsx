import hubLogo from '../assets/brand/hub-logo.png';
import BrandFooter from './BrandFooter';

export default function AuthLayout({ children }) {
  return (
    <main className="login-page">
      <section className="login-brand">
        <img className="login-hub-logo" src={hubLogo} alt="Hub de l’Investissement" />
        <span className="login-space">Espace équipe</span>
      </section>
      <section className="login-panel">{children}<BrandFooter className="login-footer" /></section>
    </main>
  );
}
