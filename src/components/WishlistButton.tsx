// =====================================================================
// components/WishlistButton.tsx — Wunschlisten-Toggle
// =====================================================================
// Eine kleine Solid-Insel mit zwei Darstellungs-Varianten:
//   - 'icon':  rundes Herz-Symbol für Katalog-Karten
//   - 'block': breiter Button mit Label für Detail-Seiten
//
// Beim Mount prüft die Komponente, ob das Item bereits in der
// Wunschliste ist, und zeigt den entsprechenden Zustand.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.
// =====================================================================

// TAILWIND-MIGRATION: wishlist-button.css gelöscht, Styles als Utilities.
import { createSignal, onMount } from 'solid-js';

interface Props {
  itemId: number;
  variant?: 'icon' | 'block';
}

export default function WishlistButton(props: Props) {
  const [active, setActive]   = createSignal(false);
  const [loading, setLoading] = createSignal(false);

  // Beim Mount: aktuellen Status erfragen
  onMount(async () => {
    try {
      const res = await fetch('/api/wishlist');
      const data = await res.json();
      const isInList = data.items.some((entry: any) => entry.itemId === props.itemId);
      setActive(isInList);
    } catch (e) {
      // Stillschweigend ignorieren — Default ist "nicht in Liste"
    }
  });

  const toggle = async () => {
    if (loading()) return;
    setLoading(true);

    const wasActive = active();
    const method = wasActive ? 'DELETE' : 'POST';

    try {
      const res = await fetch('/api/wishlist', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: props.itemId }),
      });
      if (res.ok) {
        setActive(!wasActive);
        // Andere Komponenten könnten interessiert sein (z.B. Counter in NavBar)
        window.dispatchEvent(new CustomEvent('wishlist-updated'));
        window.toast?.(
          wasActive
            ? 'Aus der Wunschliste entfernt.'
            : 'Auf die Wunschliste gesetzt.',
          'success'
        );
      } else {
        const data = await res.json().catch(() => ({}));
        window.toast?.(data.error ?? 'Aktion fehlgeschlagen.', 'error');
      }
    } catch (err) {
      window.toast?.('Netzwerkfehler. Bitte erneut versuchen.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const variant = props.variant ?? 'icon';

  // Gemeinsame Basis + zustandsabhängige Utilities (aktiv = rot gefüllt)
  const iconBase =
    'inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full ' +
    'border border-solid text-[1.1rem] leading-none transition-all duration-150 ' +
    'disabled:cursor-wait disabled:opacity-60';
  const blockBase =
    'mt-2 w-full cursor-pointer border border-solid px-6 py-4 font-meta text-[0.85rem] ' +
    'font-semibold uppercase tracking-[0.12em] transition-colors duration-150 pointer-coarse:min-h-11';

  if (variant === 'icon') {
    return (
      <button
        onClick={toggle}
        disabled={loading()}
        class={iconBase + ' ' + (active()
          ? 'border-red bg-red text-paper'
          : 'border-paper-3 bg-paper text-ink-mute enabled:hover:border-red enabled:hover:text-red')}
        aria-label={active() ? 'Aus Wunschliste entfernen' : 'Zur Wunschliste hinzufügen'}
        title={active() ? 'Aus Wunschliste entfernen' : 'Zur Wunschliste hinzufügen'}
      >
        {active() ? '♥' : '♡'}
      </button>
    );
  }

  // 'block'-Variante
  return (
    <button
      onClick={toggle}
      disabled={loading()}
      class={blockBase + ' ' + (active()
        ? 'border-red bg-red text-paper enabled:hover:bg-red-deep'
        : 'border-ink bg-transparent text-ink enabled:hover:bg-paper-2')}
    >
      {loading() ? '…' : active() ? '♥ Vermerkt auf Wunschliste' : '♡ Zur Wunschliste'}
    </button>
  );
}
