import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveAssetUrl } from '../lib/api';

// Carrousel des photos d'un stand : défilement au doigt sur téléphone, flèches sur ordinateur, compteur discret.
export default function ImageCarousel({ images, label }) {
  const { t } = useTranslation();
  const track = useRef(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const element = track.current;
    if (!element) return undefined;
    const update = () => setIndex(Math.round(element.scrollLeft / Math.max(1, element.clientWidth)));
    element.addEventListener('scroll', update, { passive: true });
    return () => element.removeEventListener('scroll', update);
  }, []);

  const go = (next) => {
    const element = track.current;
    if (!element) return;
    const target = Math.max(0, Math.min(images.length - 1, next));
    element.scrollTo({ left: target * element.clientWidth, behavior: 'smooth' });
  };

  if (!images.length) return null;

  return (
    <div className="image-carousel" role="region" aria-roledescription="carrousel" aria-label={label}>
      <div className="image-carousel-track" ref={track}>
        {images.map((image, position) => (
          <figure key={image} aria-label={`${position + 1} / ${images.length}`}>
            <img src={resolveAssetUrl(image)} alt="" loading={position === 0 ? 'eager' : 'lazy'} />
          </figure>
        ))}
      </div>
      {images.length > 1 && (
        <div className="image-carousel-controls">
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label={t('stands.previousImage')}><ChevronLeft size={20} /></button>
          <span aria-live="polite">{index + 1} / {images.length}</span>
          <button type="button" onClick={() => go(index + 1)} disabled={index >= images.length - 1} aria-label={t('stands.nextImage')}><ChevronRight size={20} /></button>
        </div>
      )}
    </div>
  );
}
