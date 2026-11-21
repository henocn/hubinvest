import { useEffect, useState } from 'react';
import { Check, ExternalLink } from 'lucide-react';
import { publicBaseUrl, serviceTitles } from '../constants/access';

// Grand écran du Stand (document v4, M7) : en direct, ou la boucle vidéo de repli ; le service du jour, choisi ou à tour de rôle.
export default function ScreenSettings({ settings, saving, saved, onSave }) {
  const [videoUrl, setVideoUrl] = useState(settings.screenVideoUrl || '');
  useEffect(() => { setVideoUrl(settings.screenVideoUrl || ''); }, [settings.screenVideoUrl]);
  const validUrl = !videoUrl || /^https?:\/\/\S+$/.test(videoUrl);

  return (
    <section className="data-panel settings-panel">
      <header className="settings-panel-head">
        <h2>Grand écran</h2>
        <a className="button button-secondary" href={`${publicBaseUrl}/ecran`} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Ouvrir l’écran</a>
      </header>
      <label className="settings-row">
        <span><strong>Affichage</strong></span>
        {saved === 'screenMode' && <Check className="settings-saved" size={18} aria-label="Enregistré" />}
        <select value={settings.screenMode || 'live'} disabled={saving === 'screenMode'} onChange={(event) => onSave('screenMode', event.target.value)}>
          <option value="live">En direct</option>
          <option value="video" disabled={!settings.screenVideoUrl}>Boucle vidéo (repli)</option>
        </select>
      </label>
      <label className="settings-row">
        <span><strong>Service du jour</strong></span>
        {saved === 'screenService' && <Check className="settings-saved" size={18} aria-label="Enregistré" />}
        <select value={settings.screenService || ''} disabled={saving === 'screenService'} onChange={(event) => onSave('screenService', event.target.value)}>
          <option value="">À tour de rôle, un par jour</option>
          {Object.entries(serviceTitles).map(([key, title]) => <option key={key} value={key}>{title}</option>)}
        </select>
      </label>
      <form className="settings-row" onSubmit={(event) => { event.preventDefault(); if (validUrl && videoUrl !== (settings.screenVideoUrl || '')) void onSave('screenVideoUrl', videoUrl.trim()); }}>
        <span><strong>Vidéo de repli</strong></span>
        {saved === 'screenVideoUrl' && <Check className="settings-saved" size={18} aria-label="Enregistré" />}
        <span className="settings-number">
          <input type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="https://…/boucle.mp4" aria-label="Adresse de la vidéo de repli" />
          <button className="button button-secondary" type="submit" disabled={saving === 'screenVideoUrl' || !validUrl || videoUrl === (settings.screenVideoUrl || '')}>Enregistrer</button>
        </span>
      </form>
    </section>
  );
}
