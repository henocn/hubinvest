import { useTranslation } from 'react-i18next';
import apizfLogo from '../assets/brand/apizf-logo.png';

// Pied de page commun : le bandeau de la mosaïque de la charte, puis le co-marquage « Une initiative de » l'API-ZF.
export default function BrandFooter({ className = '' }) {
  const { t } = useTranslation();
  return (
    <footer className={`brand-footer ${className}`.trim()}>
      <span className="brand-band" aria-hidden="true" />
      <span className="brand-footer-sign">
        <small>{t('brand.initiative')}</small>
        <img src={apizfLogo} alt="API-ZF" />
      </span>
    </footer>
  );
}
