// =====================================================================
// components/ImageGallery.tsx — Bildergalerie mit Lightbox & Slideshow
// =====================================================================
// SPA-Insel (Solid). Auf der Produktdetailseite verwendet.
//
// Slideshow-Logik:
//   - Bilder wechseln alle SLIDE_MS Millisekunden, solange der Nutzer
//     nicht interagiert hat.
//   - Der Fortschrittskreis ist KEINE CSS-Animation, sondern wird
//     von requestAnimationFrame gesteuert. So sind Progress-Ring und
//     Bildwechsel garantiert synchron — beide nutzen dieselbe Zeitachse.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.
// =====================================================================

import { createSignal, onCleanup, onMount, For, Show } from 'solid-js';
import { isServer } from 'solid-js/web';

interface Props {
  images: string[];
  alt: string;
}

const SLIDE_MS = 5000;   // Wechsel-Intervall
const FADE_MS  = 150;    // Crossfade-Dauer

// Umfang des Kreises: 2 * π * r = 2 * π * 15 ≈ 94.2478
const RING_CIRCUMFERENCE = 2 * Math.PI * 15;

export default function ImageGallery(props: Props) {
  const [activeIndex, setActiveIndex] = createSignal(0);
  const [lightboxOpen, setLightboxOpen] = createSignal(false);
  const [userInteracted, setUserInteracted] = createSignal(false);
  const [fading, setFading] = createSignal(false);

  // Fortschritt 0..1 — wird vom Animation Frame aktualisiert
  const [progress, setProgress] = createSignal(0);

  // Zeitstempel, wann das aktuelle Bild aufgeschaltet wurde
  let slideStart = performance.now();
  let rafId: number | null = null;
  let fadeTimeout: number | null = null;

  // ---- Bildwechsel ----
  const switchTo = (index: number) => {
    setFading(true);
    if (fadeTimeout) clearTimeout(fadeTimeout);
    fadeTimeout = window.setTimeout(() => {
      setActiveIndex(index);
      setFading(false);
      // Slideshow-Timer zurücksetzen, damit Progress wieder bei 0 anfängt
      slideStart = performance.now();
      setProgress(0);
    }, FADE_MS);
  };

  const prev = () => switchTo((activeIndex() - 1 + props.images.length) % props.images.length);
  const next = () => switchTo((activeIndex() + 1) % props.images.length);

  // ---- Animation Frame Loop ----
  // Aktualisiert den Progress-Ring kontinuierlich und triggert
  // den Bildwechsel exakt dann, wenn der Ring voll ist.
  const tick = () => {
    if (userInteracted() || lightboxOpen()) {
      // Pausiert — Animation läuft nicht weiter, aber Loop bleibt
      rafId = requestAnimationFrame(tick);
      return;
    }

    const elapsed = performance.now() - slideStart;
    const p = Math.min(elapsed / SLIDE_MS, 1);
    setProgress(p);

    if (p >= 1 && !fading()) {
      next();
      // slideStart wird in switchTo bzw. fadeTimeout zurückgesetzt
    }

    rafId = requestAnimationFrame(tick);
  };

  // ---- Keyboard ----
  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft')  { setUserInteracted(true); prev(); }
    if (e.key === 'ArrowRight') { setUserInteracted(true); next(); }
    if (e.key === 'Escape')     setLightboxOpen(false);
  };

  // ---- Touch (Swipe) ----
  let touchStartX = 0;
  const handleTouchStart = (e: TouchEvent) => { touchStartX = e.touches[0].clientX; };
  const handleTouchEnd = (e: TouchEvent) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) < 50) return;
    setUserInteracted(true);
    if (diff > 0) next(); else prev();
  };

  onMount(() => {
    if (isServer) return;
    window.addEventListener('keydown', handleKey);
    slideStart = performance.now();
    rafId = requestAnimationFrame(tick);

    onCleanup(() => {
      window.removeEventListener('keydown', handleKey);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (fadeTimeout)    clearTimeout(fadeTimeout);
    });
  });

  // ---- Render ----
  return (
    <div class="gallery">

      {/* Hauptbild */}
      <div
        class="gallery-main"
        onClick={() => { setUserInteracted(true); setLightboxOpen(true); }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={props.images[activeIndex()] || '/products/placeholder.jpg'}
          alt={props.alt}
          class="gallery-main-img"
          style={{ opacity: fading() ? '0' : '1' }}
        />
        <div class="gallery-zoom-hint">🔍 Klicken zum Vergrößern</div>

        {/* Fortschritts-Ring — komplett JS-gesteuert (kein CSS-Animation) */}
        <Show when={!userInteracted() && props.images.length > 1}>
          <div class="slideshow-progress">
            <svg viewBox="0 0 36 36" class="progress-ring">
              <circle class="progress-ring-bg" cx="18" cy="18" r="15" />
              <circle
                class="progress-ring-fill"
                cx="18" cy="18" r="15"
                stroke-dasharray={RING_CIRCUMFERENCE}
                stroke-dashoffset={RING_CIRCUMFERENCE * (1 - progress())}
              />
            </svg>
          </div>
        </Show>
      </div>

      {/* Thumbnails */}
      <Show when={props.images.length > 1}>
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
      </Show>

      {/* Lightbox */}
      <Show when={lightboxOpen()}>
        <div class="lightbox" onClick={() => setLightboxOpen(false)}>
          <div class="lightbox-content" onClick={e => e.stopPropagation()}>
            <button class="lightbox-close" onClick={() => setLightboxOpen(false)}>✕</button>
            <Show when={props.images.length > 1}>
              <button class="lightbox-arrow lightbox-arrow--left" onClick={prev}>‹</button>
            </Show>
            <img
              src={props.images[activeIndex()] || '/products/placeholder.jpg'}
              alt={props.alt}
              class="lightbox-img"
            />
            <Show when={props.images.length > 1}>
              <button class="lightbox-arrow lightbox-arrow--right" onClick={next}>›</button>
            </Show>
            <p class="lightbox-counter">{activeIndex() + 1} / {props.images.length}</p>
          </div>
        </div>
      </Show>

    </div>
  );
}
