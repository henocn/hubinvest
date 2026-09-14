import logo from '../../../assets/Logo fond blanc.jpeg';
import { useTranslation } from 'react-i18next';

export default function PublicHeader() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'fr';

  return (
    <header className="public-header">
      <a className="public-brand" href="/" aria-label={t('brand.homeLabel')}>
        <img src={logo} alt="API-ZF" />
        <span><strong>HubInvest</strong><small>{t('brand.subtitle')}</small></span>
      </a>
      <div className="language-switcher" role="group" aria-label={t('language.label')}>
        <button type="button" className={language === 'fr' ? 'is-active' : ''} onClick={() => i18n.changeLanguage('fr')} aria-pressed={language === 'fr'} aria-label={t('language.french')}>FR</button>
        <button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => i18n.changeLanguage('en')} aria-pressed={language === 'en'} aria-label={t('language.english')}>EN</button>
      </div>
    </header>
  );
}
