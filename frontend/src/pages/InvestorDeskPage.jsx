import InvestorRequestForm from '../components/InvestorRequestForm';
import { useTranslation } from 'react-i18next';
import { useSiteSettings } from '../lib/settings';

export default function InvestorDeskPage() {
  const { t } = useTranslation();
  const settings = useSiteSettings();
  return (
    <main className="public-container investor-desk-page">
      <section className="investor-desk-intro">
        <h1>{t('investor.title')}</h1>
        <p>{t('investor.subtitle')}</p>
      </section>
      {settings.investorDeskOpen
        ? <section className="investor-request-panel"><InvestorRequestForm /></section>
        : <p className="public-message is-closed">{t('closed.investor')}</p>}
    </main>
  );
}
