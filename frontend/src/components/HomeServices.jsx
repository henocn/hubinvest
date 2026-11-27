import { useState } from 'react';
import { ChevronDown, Compass, ExternalLink, Factory, FileCheck2, Handshake, LifeBuoy, MapPin, Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Reveal from './Reveal';
import { PROCEDURES_URL, procedures as allProcedures, services as allServices } from '../content/services';

const DOMAINS = ['free_zone', 'investment_code', 'blue_book'];
// Une icône par service de l'API-ZF.
const ICONS = { orientation: Compass, regimes: Scale, facilitation: FileCheck2, industrial_site: Factory, aftercare: LifeBuoy, partnerships: Handshake };

// « Les services de l'API-ZF » (document v4, M1) : les six services en cartes (titre, promesse, où les trouver au stand), puis les démarches déjà en ligne, repliées par domaine (on ouvre celui qui intéresse). Contenu statique : content/services.js.
export default function HomeServices() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(null);
  const language = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'fr';
  const services = allServices.map((item) => ({ id: item.key, stage: item.stage, limited: Boolean(item.limited), ...item[language] }));
  const procedures = allProcedures.map((item) => ({ id: item.id, domain: item.domain, url: item.url, title: item[language] }));
  const byDomain = DOMAINS.map((domain) => ({ domain, items: procedures.filter((item) => item.domain === domain) })).filter((group) => group.items.length);

  return (
    <>
      {services.length > 0 && (
        <Reveal as="section" className="home-services" aria-labelledby="home-services-title">
          <h2 id="home-services-title">{t('services.title')}</h2>
          {/* Tuiles à toucher : une grande icône et le titre ; un toucher déplie la promesse et le guichet où trouver le
              service (la tuile ouverte prend toute la ligne). Pas de bandeau de couleur, d'icône en pastille ni d'étape. */}
          <ul className="service-cards">
            {services.map((item, index) => {
              const Icon = ICONS[item.id] || Compass;
              const isOpen = open === item.id;
              return (
                <li key={item.id} className={`service-card${isOpen ? ' is-open' : ''}`} style={{ '--i': index }}>
                  <button
                    className="service-card-toggle"
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`service-${item.id}`}
                    onClick={() => setOpen(isOpen ? null : item.id)}
                  >
                    <Icon className="service-card-icon" size={34} strokeWidth={1.7} aria-hidden="true" />
                    <h3>{item.title}</h3>
                    <ChevronDown className="service-card-chevron" size={18} aria-hidden="true" />
                  </button>
                  <div className="service-card-more" id={`service-${item.id}`}>
                    <div>
                      <p className="service-card-promise">{item.promise}</p>
                      {(item.place || item.limited) && (
                        <p className="service-card-place">
                          {item.place && <><MapPin size={15} aria-hidden="true" /><span>{item.place}</span></>}
                          {item.limited && <em>{t('services.limited')}</em>}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Reveal>
      )}

      {procedures.length > 0 && (
        <Reveal as="section" className="home-procedures" aria-labelledby="home-procedures-title">
          <header className="home-procedures-head">
            <h2 id="home-procedures-title">{t('services.procedures', { count: procedures.length })}</h2>
            <a className="button button-primary" href={PROCEDURES_URL} target="_blank" rel="noreferrer">{t('services.openPlatform')}<ExternalLink size={16} aria-hidden="true" /></a>
          </header>
          <div className="procedure-groups">
            {byDomain.map(({ domain, items }) => (
              <details key={domain} className="procedure-group">
                <summary>
                  <span>{t(`services.domains.${domain}`)}</span>
                  <span className="procedure-count">{items.length}</span>
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <ul>
                  {items.map((item) => (
                    <li key={item.id}>
                      {item.url
                        ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}<ExternalLink size={15} aria-label={t('services.external')} /></a>
                        : <span>{item.title}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </Reveal>
      )}
    </>
  );
}
