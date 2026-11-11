import { useTranslation } from 'react-i18next';
import apizfLogo from '../assets/brand/apizf-logo.png';

// Pied de page commun : le co-marquage « Une initiative de » l'API-ZF.
export default function BrandFooter({ className = '' }) {
  const { t } = useTranslation();
  return (
    <footer className={`brand-footer ${className}`.trim()}>
      <small>{t('brand.initiative')}</small>
      <img src={apizfLogo} alt="API-ZF" />
    </footer>
  );
}
