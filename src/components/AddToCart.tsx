import { createSignal } from 'solid-js';
import '../styles/add-to-cart.css';

interface Props {
  itemId: number;
  initialStock: number;
  variant?: 'inline' | 'block';
}

export default function AddToCart(props: Props) {
  const [stock, setStock] = createSignal(props.initialStock);
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
        class={'addcart-btn-inline ' + (outOfStock ? 'is-out' : isAdded() ? 'is-added' : '')}
      >
        {outOfStock ? '♡ Auf Wunschliste' : isAdded() ? '✓ Vermerkt' : 'In den Warenkorb'}
      </button>
    );
  }

  return (
    <div class="addcart-block">
      <p class="addcart-stock">
        Vermerkter Restbestand: <strong>{stock()} {stock() === 1 ? 'Exemplar' : 'Exemplare'}</strong>
      </p>

      <div class="addcart-row">
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
          class="addcart-qty"
          aria-label="Menge"
        />
        <button
          onClick={handleBuy}
          disabled={outOfStock || isLoading()}
          class={'addcart-btn ' + (outOfStock ? 'is-out' : isAdded() ? 'is-added' : '')}
        >
          {label()}
        </button>
      </div>
    </div>
  );
}
