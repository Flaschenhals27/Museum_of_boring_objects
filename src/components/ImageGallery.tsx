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

// TAILWIND-MIGRATION: gallery.css gelöscht, Styles als Utilities.
// Der Bild-Platzhalter nutzt die geteilte .bg-stripes-Klasse (global.css).
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

  // Wiederkehrende Utility-Kombi für die Lightbox-Pfeile
  const arrowBtn =
    'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border border-solid ' +
    'border-paper/30 bg-paper/10 font-display text-[1.8rem] text-paper transition-colors ' +
    'duration-150 hover:bg-paper/20 max-[720px]:text-[1.6rem]';

  // ---- Render ----
  return (
    <div class="flex flex-col gap-4">

      {/* Hauptbild */}
      <div
        class="bg-stripes group relative aspect-[4/3] cursor-zoom-in overflow-hidden border border-solid border-paper-3"
        onClick={() => { setUserInteracted(true); setLightboxOpen(true); }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={props.images[activeIndex()] || '/products/placeholder.jpg'}
          alt={props.alt}
          class="block h-full w-full object-cover mix-blend-multiply transition-opacity duration-300 [filter:sepia(0.12)_contrast(0.95)]"
          style={{ opacity: fading() ? '0' : '1' }}
        />
        <div class="pointer-events-none absolute bottom-[0.6rem] right-[0.6rem] bg-ink px-[0.6rem] py-[0.3rem] font-meta text-[0.7rem] uppercase tracking-[0.1em] text-paper opacity-0 transition-opacity duration-200 group-hover:opacity-100 max-[720px]:hidden">🔍 Klicken zum Vergrößern</div>

        {/* Fortschritts-Ring — komplett JS-gesteuert (kein CSS-Animation) */}
        <Show when={!userInteracted() && props.images.length > 1}>
          <div class="absolute bottom-[0.6rem] left-[0.6rem] h-7 w-7">
            <svg viewBox="0 0 36 36" class="h-full w-full [transform:rotate(-90deg)]">
              <circle class="fill-none [stroke:rgba(26,22,18,0.2)] [stroke-width:3]" cx="18" cy="18" r="15" />
              <circle
                class="fill-none stroke-ink [stroke-linecap:round] [stroke-width:3] [transition:stroke-dashoffset_0.05s_linear]"
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
        <div class="flex flex-wrap gap-2 max-[720px]:justify-start max-[720px]:gap-[0.4rem] max-[720px]:overflow-x-auto max-[720px]:pb-[0.4rem]">
          <For each={props.images}>
            {(src, i) => (
              <img
                src={src}
                alt={`${props.alt} ${i() + 1}`}
                class={
                  'h-[70px] w-[70px] cursor-pointer border border-solid object-cover transition-[opacity,border-color] duration-200 [filter:sepia(0.12)_contrast(0.95)] hover:border-ink hover:opacity-100 max-[720px]:h-[60px] max-[720px]:w-[60px] max-[720px]:shrink-0 ' +
                  (i() === activeIndex() ? 'border-ink opacity-100' : 'border-paper-3 opacity-55')
                }
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
        <div class="fixed inset-0 z-[99999] flex items-center justify-center bg-[rgba(26,22,18,0.92)]" onClick={() => setLightboxOpen(false)}>
          <div class="relative flex max-h-[90vh] max-w-[90vw] items-center gap-4" onClick={e => e.stopPropagation()}>
            <button class="absolute -top-10 right-0 cursor-pointer border-0 bg-transparent font-meta text-[1.2rem] text-paper opacity-70 transition-opacity hover:opacity-100" onClick={() => setLightboxOpen(false)}>✕</button>
            <Show when={props.images.length > 1}>
              <button class={arrowBtn} onClick={prev}>‹</button>
            </Show>
            <img
              src={props.images[activeIndex()] || '/products/placeholder.jpg'}
              alt={props.alt}
              class="max-h-[85vh] max-w-[80vw] object-contain [filter:sepia(0.12)_contrast(0.95)]"
            />
            <Show when={props.images.length > 1}>
              <button class={arrowBtn} onClick={next}>›</button>
            </Show>
            <p class="absolute -bottom-8 left-1/2 m-0 -translate-x-1/2 font-meta text-[0.78rem] uppercase tracking-[0.1em] text-paper opacity-50">{activeIndex() + 1} / {props.images.length}</p>
          </div>
        </div>
      </Show>

    </div>
  );
}
