import logo from '../../../assets/Logo fond blanc.jpeg';

export default function PublicHeader() {
  return (
    <header className="public-header">
      <a className="public-brand" href="/" aria-label="HubInvest, accueil">
        <img src={logo} alt="API-ZF" />
        <span><strong>HubInvest</strong><small>Hub de l’Investissement</small></span>
      </a>
      <nav aria-label="Navigation publique">
        <a href="/stands">Stands</a>
        <a href="/b2b">B2B</a>
        <a href="/investor-desk">Investor Desk</a>
        <a className="public-login" href="/connexion">Espace occupant</a>
      </nav>
    </header>
  );
}
