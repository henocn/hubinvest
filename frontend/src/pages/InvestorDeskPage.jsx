import InvestorRequestForm from '../components/InvestorRequestForm';
import { useTranslation } from 'react-i18next';

export default function InvestorDeskPage() {
  const { t } = useTranslation();
  return (
    <main className="public-container investor-desk-page">
      <section className="investor-desk-intro">
        <h1>{t('investor.title')}</h1>
        <p>{t('investor.subtitle')}</p>
      </section>
      <section className="investor-request-panel"><InvestorRequestForm /></section>
    </main>
  );
}
