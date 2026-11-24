import { Compass, ExternalLink, Factory, FileCheck2, Handshake, LifeBuoy, MapPin, Scale } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PROCEDURES_URL, procedures as allProcedures, services as allServices } from '../content/services';

const DOMAINS = ['free_zone', 'investment_code', 'blue_book'];
// Une icône par service de l'API-ZF.
const ICONS = { orientation: Compass, regimes: Scale, facilitation: FileCheck2, industrial_site: Factory, aftercare: LifeBuoy, partnerships: Handshake };

// « Les services de l'API-ZF » (document v4, M1) : les six services en cartes bien délimitées (icône, titre, promesse,
// où les trouver au stand), puis les démarches déjà en ligne, groupées par domaine. Contenu statique : content/services.js.
export default function HomeServices() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'fr';
  const services = allServices.map((item) => ({ id: item.key, stage: item.stage, limited: Boolean(item.limited), ...item[language] }));
  const procedures = allProcedures.map((item) => ({ id: item.id, domain: item.domain, url: item.url, title: item[language] }));
  const byDomain = DOMAINS.map((domain) => ({ domain, items: procedures.filter((item) => item.domain === domain) })).filter((group) => group.items.length);

  return (
    <>
      {services.length > 0 && (
        <section className="home-services" aria-labelledby="home-services-title">
          <h2 id="home-services-title">{t('services.title')}</h2>
          <div className="service-cards">
            {services.map((item) => {
              const Icon = ICONS[item.id] || Compass;
              return (
                <article key={item.id} className="service-card">
                  {/* L'étape du parcours « Investir au Togo en 5 étapes » (1 à 5), puis l'icône du service. */}
                  <div className="service-card-top">
                    <span className="service-card-stage" title={t(`services.stages.${item.stage}`)} aria-label={t('services.stage', { step: item.stage, name: t(`services.stages.${item.stage}`) })}>{item.stage}</span>
                    <span className="service-card-icon" aria-hidden="true"><Icon size={22} /></span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.promise}</p>
                  {(item.place || item.limited) && (
                    <span className="service-card-place">
                      {item.place && <><MapPin size={15} aria-hidden="true" /><span>{item.place}</span></>}
                      {item.limited && <em>{t('services.limited')}</em>}
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {procedures.length > 0 && (
        <section className="home-procedures" aria-labelledby="home-procedures-title">
          <header className="home-procedures-head">
            <h2 id="home-procedures-title">{t('services.procedures', { count: procedures.length })}</h2>
            <a className="button button-primary" href={PROCEDURES_URL} target="_blank" rel="noreferrer">{t('services.openPlatform')}<ExternalLink size={16} aria-hidden="true" /></a>
          </header>
          <div className="procedure-groups">
            {byDomain.map(({ domain, items }) => (
              <div key={domain} className="procedure-group">
                <h3>{t(`services.domains.${domain}`)}</h3>
                <ul>
                  {items.map((item) => (
                    <li key={item.id}>
                      {item.url
                        ? <a href={item.url} target="_blank" rel="noreferrer">{item.title}<ExternalLink size={15} aria-label={t('services.external')} /></a>
                        : <span>{item.title}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
