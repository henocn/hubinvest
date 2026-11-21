import { ExternalLink, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { procedures as allProcedures, services as allServices } from '../content/services';

const STAGES = [1, 2, 3, 4, 5];
const DOMAINS = ['free_zone', 'investment_code', 'blue_book'];

// « Nos services » (document v4, M1) : le parcours en 5 étapes avec les services de l'API-ZF,
// puis les démarches déjà en ligne avec leur lien vers la plateforme officielle. Contenu statique : content/services.js.
export default function HomeServices() {
  const { t, i18n } = useTranslation();
  const language = i18n.resolvedLanguage?.startsWith('en') ? 'en' : 'fr';
  const services = allServices.map((item) => ({ id: item.key, stage: item.stage, limited: Boolean(item.limited), ...item[language] }));
  const procedures = allProcedures.map((item) => ({ id: item.id, domain: item.domain, url: item.url, title: item[language] }));
  const byStage = STAGES.map((stage) => ({ stage, items: services.filter((item) => item.stage === stage) }));
  const byDomain = DOMAINS.map((domain) => ({ domain, items: procedures.filter((item) => item.domain === domain) })).filter((group) => group.items.length);

  return (
    <>
      {services.length > 0 && (
        <section className="home-services" aria-labelledby="home-services-title">
          <h2 id="home-services-title">{t('services.title')}</h2>
          <ol className="service-stages">
            {byStage.map(({ stage, items }) => (
              <li key={stage} className="service-stage">
                <span className="service-stage-number" aria-hidden="true">{stage}</span>
                <div className="service-stage-body">
                  <h3>{t(`services.stages.${stage}`)}</h3>
                  {items.map((item) => (
                    <article key={item.id} className="service-item">
                      <strong>{item.title}</strong>
                      <p>{item.promise}</p>
                      {(item.place || item.limited) && (
                        <span className="service-item-place">
                          {item.place && <><MapPin size={15} aria-hidden="true" />{item.place}</>}
                          {item.limited && <em>{t('services.limited')}</em>}
                        </span>
                      )}
                    </article>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {procedures.length > 0 && (
        <section className="home-procedures" aria-labelledby="home-procedures-title">
          <h2 id="home-procedures-title">{t('services.procedures', { count: procedures.length })}</h2>
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
        </section>
      )}
    </>
  );
}
