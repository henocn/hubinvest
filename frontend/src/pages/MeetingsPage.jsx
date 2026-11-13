import { Link } from 'react-router-dom';
import { BriefcaseBusiness, Handshake } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function MeetingsPage() {
  const { t } = useTranslation();
  const choices = [
    { href: '/b2b', Icon: Handshake, title: t('meetings.b2bTitle'), text: t('meetings.b2bText') },
    { href: '/investor-desk', Icon: BriefcaseBusiness, title: t('meetings.deskTitle'), text: t('meetings.deskText') },
  ];

  return (
    <main className="public-container meetings-page">
      <header>
        <h1>{t('meetings.title')}</h1>
      </header>
      <div className="meeting-choices">
        {choices.map(({ href, Icon, title, text }) => (
          <Link to={href} key={href}>
            <Icon size={23} aria-hidden="true" />
            <span><strong>{title}</strong><small>{text}</small></span>
          </Link>
        ))}
      </div>
    </main>
  );
}
