import { useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, Upload } from 'lucide-react';
import { publicBaseUrl, serviceTitles } from '../constants/access';
import { api, resolveAssetUrl } from '../lib/api';

const MAX_VIDEO = 500 * 1024 * 1024;
const UPLOADED = /^\/uploads\/screen\//;

// D'où vient la vidéo de repli : le grand écran la lit selon sa source.
const sourceOf = (url) => {
  if (!url) return null;
  if (UPLOADED.test(url)) return 'Vidéo chargée sur la plateforme';
  if (/youtube\.com|youtu\.be/.test(url)) return 'Vidéo YouTube';
  if (/drive\.google\.com/.test(url)) return 'Fichier Google Drive';
  return 'Fichier vidéo en ligne';
};

// Grand écran du Stand (document v4, M7) : en direct, ou la boucle vidéo de repli ; le service du jour, choisi ou à tour de rôle.
// La vidéo de repli est un lien (YouTube, Google Drive, fichier en ligne) ou un fichier chargé ici.
export default function ScreenSettings({ settings, saving, saved, onSave, token, onUploaded }) {
  const current = settings.screenVideoUrl || '';
  const uploaded = UPLOADED.test(current);
  const [videoUrl, setVideoUrl] = useState(uploaded ? '' : current);
  const [progress, setProgress] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef(null);
  useEffect(() => { setVideoUrl(UPLOADED.test(current) ? '' : current); }, [current]);
  const link = videoUrl.trim();
  const validUrl = !link || /^https?:\/\/\S+$/.test(link);
  const unchanged = uploaded ? !link : link === current;
  const isDrive = /drive\.google\.com/.test(link);
  const [importing, setImporting] = useState(false);

  // Un lien Drive est importé : le serveur télécharge la vidéo (une à deux minutes pour quelques centaines de Mo).
  // Les autres liens sont enregistrés tels quels.
  const saveLink = async () => {
    if (!validUrl || unchanged) return;
    if (!isDrive) { void onSave('screenVideoUrl', link); return; }
    setUploadError('');
    setImporting(true);
    try {
      onUploaded(await api.importScreenVideo(token, link));
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setImporting(false);
    }
  };

  const upload = async (file) => {
    if (!file) return;
    setUploadError('');
    if (file.size > MAX_VIDEO) { setUploadError('La vidéo ne doit pas dépasser 500 Mo.'); return; }
    setProgress(0);
    try {
      onUploaded(await api.uploadScreenVideo(token, file, setProgress));
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setProgress(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

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
          <option value="video" disabled={!current}>Boucle vidéo (repli)</option>
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
      <form className="settings-row screen-video-row" onSubmit={(event) => { event.preventDefault(); void saveLink(); }}>
        <span>
          <strong>Vidéo de repli</strong>
          {current
            ? <a className="screen-video-source" href={resolveAssetUrl(current)} target="_blank" rel="noreferrer">{sourceOf(current)}</a>
            : <span className="screen-video-source">Aucune</span>}
          {isDrive && <span className="screen-video-hint">Partagée à « tous ceux qui ont le lien »</span>}
        </span>
        {saved === 'screenVideoUrl' && <Check className="settings-saved" size={18} aria-label="Enregistré" />}
        <span className="settings-number">
          <input type="url" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="Lien YouTube, Google Drive ou fichier vidéo" aria-label="Lien de la vidéo de repli" />
          <button className="button button-secondary" type="submit" disabled={saving === 'screenVideoUrl' || importing || progress !== null || !validUrl || unchanged}>{importing ? 'Import depuis Drive…' : 'Enregistrer'}</button>
          <input ref={fileRef} type="file" accept="video/mp4,video/webm" hidden onChange={(event) => upload(event.target.files?.[0])} />
          <button className="button button-secondary" type="button" disabled={progress !== null || importing} onClick={() => fileRef.current?.click()}>
            <Upload size={15} aria-hidden="true" />
            {progress === null ? 'Charger une vidéo' : `Envoi… ${Math.round(progress * 100)} %`}
          </button>
        </span>
        {uploadError && <p className="form-error screen-video-error" role="alert">{uploadError}</p>}
      </form>
    </section>
  );
}
