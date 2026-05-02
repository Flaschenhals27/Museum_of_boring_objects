import { createSignal, onCleanup, onMount, For } from 'solid-js';
import { isServer } from 'solid-js/web';

interface Props {
  images: string[];
  alt: string;
}

export default function ImageGallery(props: Props) {
  const [activeIndex, setActiveIndex] = createSignal(0);
  const [lightboxOpen, setLightboxOpen] = createSignal(false);
  const [userInteracted, setUserInteracted] = createSignal(false);
// Neue Hilfsfunktion die beim Wechsel kurz ausblendet
  const switchTo = (index: number) => {
    setFading(true);
    setTimeout(() => {
      setActiveIndex(index);
      setFading(false);
    }, 150);
  };

  const prev = () => switchTo((activeIndex() - 1 + props.images.length) % props.images.length);
  const next = () => switchTo((activeIndex() + 1) % props.images.length);

  const [fading, setFading] = createSignal(false);



  // GEÄNDERT: Pfeiltasten funktionieren jetzt auch außerhalb der Lightbox
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { setUserInteracted(true); prev(); }
    if (e.key === 'ArrowRight') { setUserInteracted(true); next(); }
    if (e.key === 'Escape') setLightboxOpen(false);
  };

  // NEU: Swipe-Gesten
  let touchStartX = 0;

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return; // zu kurz → kein Swipe
    setUserInteracted(true);
    if (diff > 0) next(); // nach links gewischt → nächstes Bild
    else prev();          // nach rechts gewischt → vorheriges Bild
  };

  onMount(() => {
    if (!isServer) {
      window.addEventListener('keydown', handleKey);
    }

    const interval = setInterval(() => {
      if (!userInteracted() && !lightboxOpen()) {
        next();
      }
    }, 5000);

    onCleanup(() => {
      if (!isServer) {
        window.removeEventListener('keydown', handleKey);
      }
      clearInterval(interval);
    });
  });

  return (
    <div class="gallery">

      {/* Hauptbild */}
      <div
        class="gallery-main"
        onClick={() => { setUserInteracted(true); setLightboxOpen(true); }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}>
        <img
          src={props.images[activeIndex()] || '/products/placeholder.jpg'}
          alt={props.alt}
          class="gallery-main-img"
          style={{ opacity: fading() ? '0' : '1' }}
        />
        <div class="gallery-zoom-hint">🔍 Klicken zum Vergrößern</div>

        {/* Fortschritts-Kreis – hier als JSX, nicht im onClick */}
        {!userInteracted() && props.images.length > 1 && (
          <div class="slideshow-progress">
            <svg viewBox="0 0 36 36" class="progress-ring">
              <circle class="progress-ring-bg" cx="18" cy="18" r="15" />
              <circle class="progress-ring-fill" cx="18" cy="18" r="15" />
            </svg>
          </div>
        )}
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
                onClick={() => {
                  setUserInteracted(true);
                  setActiveIndex(i());
                }}
              />
            )}
          </For>
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen() && (
        <div class="lightbox" onClick={() => setLightboxOpen(false)}>
          <div class="lightbox-content" onClick={e => e.stopPropagation()}>
            <button class="lightbox-close" onClick={() => setLightboxOpen(false)}>✕</button>
            {props.images.length > 1 && (
              <button class="lightbox-arrow lightbox-arrow--left" onClick={prev}>‹</button>
            )}
            <img
              src={props.images[activeIndex()] || '/products/placeholder.jpg'}
              alt={props.alt}
              class="lightbox-img"
            />
            {props.images.length > 1 && (
              <button class="lightbox-arrow lightbox-arrow--right" onClick={next}>›</button>
            )}
            <p class="lightbox-counter">{activeIndex() + 1} / {props.images.length}</p>
          </div>
        </div>
      )}

    </div>
  );
}