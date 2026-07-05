// =====================================================================
// components/AddToCart.tsx — "In den Warenkorb" (Solid-Insel)
// =====================================================================
// TAILWIND-MIGRATION: Styles sind vollständig auf Utility-Klassen
// umgestellt (vorher src/styles/add-to-cart.css, jetzt gelöscht).
// Farb-/Font-Tokens kommen aus src/styles/tailwind.css (@theme).
// Hinweis: `border-solid` steht überall explizit, weil wir Tailwinds
// Preflight (das border-style global vorbelegt) bewusst nicht laden.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.
// =====================================================================

import { createSignal } from 'solid-js';

interface Props {
  itemId: number;
  initialStock: number;
  variant?: 'inline' | 'block';
}

// Wiederkehrende Utility-Kombis einmal benannt (lesbarer als 3x inline)
const metaButton =
  'font-meta uppercase font-semibold tracking-[0.12em] cursor-pointer ' +
  'transition-colors duration-150 disabled:cursor-not-allowed';

export default function AddToCart(props: Props) {
  const [stock] = createSignal(props.initialStock);
  const [isAdded, setIsAdded] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  const [quantity, setQuantity] = createSignal(1);

  const handleBuy = async () => {
    if (stock() <= 0 || isLoading()) return;
    const qty = Math.min(quantity(), stock());
    if (qty <= 0) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: props.itemId, quantity: qty }),
      });

      if (res.ok) {
        // Stock NICHT lokal reduzieren — er wird erst beim Bestellabschluss
        // in der DB reduziert. Lokale Reduzierung würde Drift erzeugen,
        // sobald die Seite neu geladen wird.
        setIsAdded(true);
        setQuantity(1);
        setTimeout(() => setIsAdded(false), 2000);
        window.dispatchEvent(new CustomEvent('cart-updated'));
        window.toast?.('Vermerkt — im Warenkorb.', 'success');
      } else {
        const data = await res.json().catch(() => ({}));
        window.toast?.(data.error ?? 'Konnte nicht hinzugefügt werden.', 'error');
      }
    } catch (err) {
      window.toast?.('Netzwerkfehler. Bitte erneut versuchen.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback bei Ausverkauft (Inline-Variante): Der Button ist mit
  // "Auf Wunschliste" beschriftet — dann muss er das auch TUN, statt
  // nur disabled herumzustehen (vorher ein toter Knopf).
  const handleWishlist = async () => {
    if (isLoading()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: props.itemId }),
      });
      if (res.ok) {
        const data = await res.json();
        window.dispatchEvent(new CustomEvent('wishlist-updated'));
        window.toast?.(
          data.alreadyExists ? 'Steht bereits auf der Wunschliste.' : 'Auf die Wunschliste gesetzt.',
          'success'
        );
      } else {
        const data = await res.json().catch(() => ({}));
        window.toast?.(data.error ?? 'Aktion fehlgeschlagen.', 'error');
      }
    } catch (err) {
      window.toast?.('Netzwerkfehler. Bitte erneut versuchen.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const variant = props.variant ?? 'block';
  const outOfStock = stock() === 0;

  const label = () =>
    isLoading()
      ? '…'
      : outOfStock
      ? 'Gähnend ausverkauft'
      : isAdded()
      ? 'Vermerkt im Bordereau'
      : 'In den Warenkorb';

  if (variant === 'inline') {
    // Kompakte Variante für Listen — nur Button, Menge=1.
    // Ausverkauft => Wunschlisten-Aktion statt totem Button.
    return (
      <button
        onClick={outOfStock ? handleWishlist : handleBuy}
        disabled={isLoading()}
        class={
          `${metaButton} px-4 py-[0.6rem] text-[0.78rem] ` +
          (outOfStock
            ? 'bg-transparent border border-solid border-ink text-ink enabled:hover:border-red enabled:hover:text-red'
            : isAdded()
            ? 'bg-ink text-paper border-0'
            : 'bg-ochre text-ink border-0 enabled:hover:bg-ochre-deep')
        }
      >
        {outOfStock ? '♡ Auf Wunschliste' : isAdded() ? '✓ Vermerkt' : 'In den Warenkorb'}
      </button>
    );
  }

  return (
    <div class="mt-4 flex flex-col gap-[0.7rem]">
      <p class="m-0 font-meta text-[0.78rem] uppercase tracking-[0.08em] text-ink-mute">
        Vermerkter Restbestand:{' '}
        <strong class="font-semibold text-ink">
          {stock()} {stock() === 1 ? 'Exemplar' : 'Exemplare'}
        </strong>
      </p>

      <div class="flex items-stretch">
        <input
          type="number"
          min="1"
          max={stock()}
          value={quantity()}
          disabled={outOfStock}
          onInput={(e) => {
            const val = parseInt(e.currentTarget.value);
            if (!isNaN(val) && val >= 1 && val <= stock()) {
              setQuantity(val);
            }
          }}
          class="w-[70px] border border-solid border-ink border-r-0 bg-paper px-2 py-[0.85rem]
                 text-center font-display text-[1.1rem] font-semibold text-ink
                 focus:outline-2 focus:outline-red focus:-outline-offset-1"
          aria-label="Menge"
        />
        <button
          onClick={handleBuy}
          disabled={outOfStock || isLoading()}
          class={
            `${metaButton} flex-1 border border-solid border-ink px-5 py-[0.85rem] text-[0.85rem] ` +
            (outOfStock
              ? 'bg-paper-3 text-ink-mute'
              : isAdded()
              ? 'bg-ink text-paper'
              : 'bg-ochre text-ink enabled:hover:bg-ochre-deep')
          }
        >
          {label()}
        </button>
      </div>
    </div>
  );
}
