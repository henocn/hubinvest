import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <main className="public-container public-detail">
      <h1>{t('common.pageNotFound')}</h1>
      <Link className="public-back" to="/stands">{t('stands.all')} <ArrowRight size={18} /></Link>
    </main>
  );
}
