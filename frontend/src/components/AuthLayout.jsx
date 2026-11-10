import logo from '../../../assets/Logo fond blanc.jpeg';

export default function AuthLayout({ children }) {
  return (
    <main className="login-page">
      <section className="login-brand">
        <img src={logo} alt="API-ZF" />
        <div><strong>HubInvest</strong><span>Espace équipe</span></div>
      </section>
      <section className="login-panel">{children}</section>
    </main>
  );
}
