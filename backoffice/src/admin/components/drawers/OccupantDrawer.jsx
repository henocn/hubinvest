import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { api, resolveAssetUrl } from '../../lib/api';

const GALLERY_LIMIT = 5;
const IMAGE_TYPES = '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp';

// « own » : l'occupant modifie sa propre fiche (contenu et images) ; nom, espace, emplacement et statut restent à l'API-ZF.
export default function OccupantDrawer({ occupant, onClose, onSaved, token, own = false }) {
  const isEditing = Boolean(occupant);
  const [form, setForm] = useState(() => ({
    name: occupant?.name || '',
    standLabel: occupant?.standLabel || '',
    space: occupant?.space || 'industry',
    website: occupant?.website || '',
    activity: occupant?.activity || '',
    products: occupant?.products || '',
    services: occupant?.services || '',
    status: occupant?.status || 'active',
  }));
  const [coverFile, setCoverFile] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  // Galerie : images déjà en ligne gardées, retirées, et nouvelles images à envoyer à l'enregistrement.
  const [keptImages, setKeptImages] = useState(() => occupant?.gallery || []);
  const [newImages, setNewImages] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const previews = useMemo(() => newImages.map((file) => ({ file, url: URL.createObjectURL(file) })), [newImages]);
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);
  const remaining = GALLERY_LIMIT - keptImages.length - newImages.length;

  const field = (name) => (event) => setForm({ ...form, [name]: event.target.value });

  const addImages = (event) => {
    const files = [...(event.target.files || [])];
    event.target.value = '';
    setError('');
    const tooBig = files.find((file) => file.size > 5 * 1024 * 1024);
    if (tooBig) {
      setError('Chaque image doit faire 5 Mo au plus.');
      return;
    }
    if (files.length > remaining) setError(`La galerie accepte ${GALLERY_LIMIT} images au plus : seules les ${remaining} premières sont gardées.`);
    setNewImages((current) => [...current, ...files.slice(0, Math.max(0, remaining))]);
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const content = {
        website: form.website.trim() || null,
        activity: form.activity || null,
        products: form.products || null,
        services: form.services || null,
      };
      const values = own ? content : { ...content, name: form.name, standLabel: form.standLabel || null, space: form.space, status: form.status };
      let saved = isEditing
        ? await api.updateOccupant(token, occupant.id, values)
        : await api.createOccupant(token, values);
      if (coverFile) saved = await api.uploadOccupantCover(token, saved.id, coverFile);
      if (logoFile) saved = await api.uploadOccupantLogo(token, saved.id, logoFile);
      for (const url of (occupant?.gallery || []).filter((item) => !keptImages.includes(item))) {
        saved = await api.removeOccupantGalleryImage(token, saved.id, url);
      }
      for (const file of newImages) {
        saved = await api.addOccupantGalleryImage(token, saved.id, file);
      }
      await onSaved(saved);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const chooseLogo = (event) => {
    const file = event.target.files?.[0] || null;
    setLogoFile(null);
    setError('');
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Le logo ne doit pas dépasser 2 Mo.');
      event.target.value = '';
      return;
    }

    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      if (image.naturalWidth > 1200 || image.naturalHeight > 1200) {
        setError('Le logo ne doit pas dépasser 1200 × 1200 pixels.');
        event.target.value = '';
        return;
      }
      setLogoFile(file);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setError('Le fichier choisi n’est pas une image valide.');
      event.target.value = '';
    };
    image.src = objectUrl;
  };

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer drawer-wide" role="dialog" aria-modal="true" aria-labelledby="occupant-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div><h2 id="occupant-title">{isEditing ? 'Modifier le stand' : 'Créer un stand'}</h2></div>
          <button className="admin-icon-button" type="button" onClick={onClose} aria-label="Fermer"><X size={19} /></button>
        </header>
        <form onSubmit={submit} className="drawer-form">
          {!own && <>
            <label>Nom de la structure<input value={form.name} onChange={field('name')} minLength={2} required autoFocus /></label>
            <label>Espace<select value={form.space} onChange={field('space')}><option value="industry">Espace Industrie</option><option value="apizf">Stand API-ZF</option></select></label>
          </>}
          {own ? <label>Site web<input type="url" inputMode="url" value={form.website} onChange={field('website')} placeholder="https://" /></label> : (
            <div className="field-row">
              <label>Emplacement du stand<input value={form.standLabel} onChange={field('standLabel')} /></label>
              <label>Site web<input type="url" inputMode="url" value={form.website} onChange={field('website')} placeholder="https://" /></label>
            </div>
          )}
          <label>Logo de la structure — 1200 × 1200 px, 2 Mo max.<input type="file" accept={IMAGE_TYPES} onChange={chooseLogo} required={!occupant?.logoUrl} /></label>
          <label>Image de couverture<input type="file" accept={IMAGE_TYPES} onChange={(event) => setCoverFile(event.target.files?.[0] || null)} required={!occupant?.coverImageUrl} /></label>
          <label>Activités<textarea rows="5" value={form.activity} onChange={field('activity')} /></label>
          <div className="field-row">
            <label>Produits<span className="field-hint">Un par ligne</span><textarea rows="5" value={form.products} onChange={field('products')} /></label>
            <label>Services<span className="field-hint">Un par ligne</span><textarea rows="5" value={form.services} onChange={field('services')} /></label>
          </div>

          <fieldset className="gallery-field">
            <legend>Photos des produits <span className="field-hint">{keptImages.length + newImages.length} / {GALLERY_LIMIT}</span></legend>
            <div className="gallery-grid">
              {keptImages.map((url) => (
                <figure key={url}>
                  <img src={resolveAssetUrl(url)} alt="" />
                  <button type="button" onClick={() => setKeptImages((current) => current.filter((item) => item !== url))} aria-label="Retirer cette photo"><X size={15} /></button>
                </figure>
              ))}
              {previews.map(({ file, url }) => (
                <figure key={url} className="is-new">
                  <img src={url} alt="" />
                  <button type="button" onClick={() => setNewImages((current) => current.filter((item) => item !== file))} aria-label="Retirer cette photo"><X size={15} /></button>
                </figure>
              ))}
              {remaining > 0 && (
                <label className="gallery-add">
                  <ImagePlus size={22} aria-hidden="true" />
                  <span>Ajouter</span>
                  <input type="file" accept={IMAGE_TYPES} multiple onChange={addImages} />
                </label>
              )}
            </div>
          </fieldset>

          {!own && <label>Statut du stand<select value={form.status} onChange={field('status')}><option value="active">Actif</option><option value="inactive">Inactif</option></select></label>}
          {error && <p className="admin-form-error">{error}</p>}
          <footer className="drawer-actions">
            <button className="button button-secondary" type="button" onClick={onClose}>Annuler</button>
            <button className="button button-primary" type="submit" disabled={loading}>{loading ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : 'Créer le stand'}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
