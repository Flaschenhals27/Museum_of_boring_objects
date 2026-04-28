import { createSignal, onCleanup, onMount, For } from 'solid-js';
import { isServer } from 'solid-js/web';

// Wir definieren, welche Daten Astro an diese Komponente übergeben darf

interface Props {
  images: string[];
  alt: string;
}

export default function ImageGallery(props: Props) {
  const [activeIndex, setActiveIndex] = createSignal(0);
  const [lightboxOpen, setLightboxOpen] = createSignal(false);

  // Zum nächsten/vorherigen Bild wechseln
  const prev = () => setActiveIndex(i => (i - 1 + props.images.length) % props.images.length);
  const next = () => setActiveIndex(i => (i + 1) % props.images.length);

  // Pfeiltasten und ESC nur wenn Lightbox offen
  const handleKey = (e: KeyboardEvent) => {
    if (!lightboxOpen()) return;
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'Escape') setLightboxOpen(false);
  };

  onMount(() => {
    if (!isServer) {
        window.addEventListener('keydown', handleKey);
    }
  });

  onCleanup(() => {
    if (!isServer) {
        window.removeEventListener('keydown', handleKey);
    }
  });

  return (
    <div class="gallery">

      {/* Hauptbild – Klick öffnet Lightbox */}
      <div class="gallery-main" onClick={() => setLightboxOpen(true)}>
        <img
          src={props.images[activeIndex()] || '/products/placeholder.jpg'}
          alt={props.alt}
          class="gallery-main-img"
        />
        {/* Zoom-Hinweis */}
        <div class="gallery-zoom-hint">🔍 Klicken zum Vergrößern</div>
      </div>

      {/* Thumbnails */}
      {props.images.length > 1 && (
        <div class="gallery-thumbs">
            <For each={props.images}>
                {(src, i) => (
                <img
                    src={src}
                    alt={`${props.alt} ${i() + 1}`}
                    class={`gallery-thumb ${i() === activeIndex() ? 'active' : ''}`}
                    onClick={() => setActiveIndex(i())}
                />
                )}
            </For>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen() && (
        <div class="lightbox" onClick={() => setLightboxOpen(false)}>
          {/* Klick auf Bild selbst schließt NICHT */}
          <div class="lightbox-content" onClick={e => e.stopPropagation()}>

            {/* Schließen-Button */}
            <button class="lightbox-close" onClick={() => setLightboxOpen(false)}>✕</button>

            {/* Pfeil links */}
            {props.images.length > 1 && (
              <button class="lightbox-arrow lightbox-arrow--left" onClick={prev}>‹</button>
            )}

            {/* Großes Bild */}
            <img
              src={props.images[activeIndex()] || '/products/placeholder.jpg'}
              alt={props.alt}
              class="lightbox-img"
            />

            {/* Pfeil rechts */}
            {props.images.length > 1 && (
              <button class="lightbox-arrow lightbox-arrow--right" onClick={next}>›</button>
            )}

            {/* Bildnummer */}
            <p class="lightbox-counter">{activeIndex() + 1} / {props.images.length}</p>
          </div>
        </div>
      )}

    </div>
  );
}