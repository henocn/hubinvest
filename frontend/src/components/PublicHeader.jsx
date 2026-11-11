import hubLogo from '../assets/brand/hub-logo.png';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';

function LanguageFlag({ language }) {
  if (language === 'fr') {
    return <svg viewBox="0 0 18 12" aria-hidden="true"><path fill="#002395" d="M0 0h6v12H0z" /><path fill="#fff" d="M6 0h6v12H6z" /><path fill="#ED2939" d="M12 0h6v12h-6z" /></svg>;
  }

  return (
    <svg viewBox="0 0 18 12" aria-hidden="true">
      <path fill="#012169" d="M0 0h18v12H0z" />
      <path stroke="#fff" strokeWidth="2.4" d="m0 0 18 12M18 0 0 12" />
      <path stroke="#C8102E" strokeWidth="1.1" d="m0 0 18 12M18 0 0 12" />
      <path stroke="#fff" strokeWidth="4" d="M9 0v12M0 6h18" />
      <path stroke="#C8102E" strokeWidth="2.2" d="M9 0v12M0 6h18" />
    </svg>
  );
}

export default function PublicHeader() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'fr';

  return (
    <header className="public-header">
      <a className="public-brand" href="/" aria-label={t('brand.homeLabel')}>
        <img src={hubLogo} alt={t('brand.subtitle')} />
      </a>
      <div className="language-select">
        <select value={language} onChange={(event) => i18n.changeLanguage(event.target.value)} aria-label={t('language.label')}>
          <option value="fr">{t('language.french')}</option>
          <option value="en">{t('language.english')}</option>
        </select>
        <span className="language-select-flag" aria-hidden="true"><LanguageFlag language={language} /></span>
        <ChevronDown size={15} aria-hidden="true" />
      </div>
    </header>
  );
}
