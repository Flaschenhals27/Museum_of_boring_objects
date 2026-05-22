import { createSignal } from 'solid-js';

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
        (window as any).toast?.('Vermerkt — im Warenkorb.', 'success');
      } else {
        const data = await res.json().catch(() => ({}));
        (window as any).toast?.(data.error ?? 'Konnte nicht hinzugefügt werden.', 'error');
      }
    } catch (err) {
      (window as any).toast?.('Netzwerkfehler. Bitte erneut versuchen.', 'error');
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
    // Kompakte Variante für Listen — nur Button, Menge=1
    return (
      <button
        onClick={handleBuy}
        disabled={outOfStock || isLoading()}
        class={'addcart-btn-inline ' + (outOfStock ? 'is-out' : isAdded() ? 'is-added' : '')}
      >
        {outOfStock ? 'Auf Wunschliste' : isAdded() ? '✓ Vermerkt' : 'In den Warenkorb'}
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

      <style>{`
        .addcart-block {
          display: flex;
          flex-direction: column;
          gap: 0.7rem;
          margin-top: 1rem;
        }
        .addcart-stock {
          font-family: var(--font-meta);
          font-size: 0.78rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--ink-mute);
          margin: 0;
        }
        .addcart-stock strong {
          color: var(--ink);
          font-weight: 600;
        }
        .addcart-row {
          display: flex;
          gap: 0;
          align-items: stretch;
        }
        .addcart-qty {
          width: 70px;
          padding: 0.85rem 0.5rem;
          border: 1px solid var(--ink);
          border-right: none;
          background: var(--paper);
          color: var(--ink);
          font-family: var(--font-display);
          font-size: 1.1rem;
          text-align: center;
          font-weight: 600;
        }
        .addcart-qty:focus {
          outline: 2px solid var(--red);
          outline-offset: -1px;
        }
        .addcart-btn {
          flex: 1;
          padding: 0.85rem 1.2rem;
          background: var(--ochre);
          color: var(--ink);
          border: 1px solid var(--ink);
          font-family: var(--font-meta);
          font-size: 0.85rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .addcart-btn:hover:not(:disabled) {
          background: var(--ochre-deep);
        }
        .addcart-btn.is-added {
          background: var(--ink);
          color: var(--paper);
        }
        .addcart-btn.is-out,
        .addcart-btn:disabled {
          background: var(--paper-3);
          color: var(--ink-mute);
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
