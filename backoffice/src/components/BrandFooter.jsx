import apizfLogo from '../assets/brand/apizf-logo.png';

// Pied de page commun : le co-marquage « Une initiative de » l'API-ZF.
export default function BrandFooter({ className = '' }) {
  return (
    <footer className={`brand-footer ${className}`.trim()}>
      <small>Une initiative de</small>
      <img src={apizfLogo} alt="API-ZF" />
    </footer>
  );
}
