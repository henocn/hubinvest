import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <main className="public-container public-detail">
      <h1>{t('common.pageNotFound')}</h1>
      <a className="public-back" href="/stands">{t('stands.all')} <ArrowRight size={18} /></a>
    </main>
  );
}
