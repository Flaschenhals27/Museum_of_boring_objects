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
        (window as any).toast?.(
          wasActive
            ? 'Aus der Wunschliste entfernt.'
            : 'Auf die Wunschliste gesetzt.',
          'success'
        );
      } else {
        const data = await res.json().catch(() => ({}));
        (window as any).toast?.(data.error ?? 'Aktion fehlgeschlagen.', 'error');
      }
    } catch (err) {
      (window as any).toast?.('Netzwerkfehler. Bitte erneut versuchen.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const variant = props.variant ?? 'icon';

  if (variant === 'icon') {
    return (
      <button
        onClick={toggle}
        disabled={loading()}
        class={'wishlist-icon-btn ' + (active() ? 'is-active' : '')}
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
      class={'wishlist-block-btn ' + (active() ? 'is-active' : '')}
    >
      {loading() ? '…' : active() ? '♥ Vermerkt auf Wunschliste' : '♡ Zur Wunschliste'}
    </button>
  );
}
