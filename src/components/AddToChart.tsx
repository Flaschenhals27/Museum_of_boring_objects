import { createSignal } from 'solid-js';

interface Props {
  itemId: number;
  initialStock: number;
}

export default function AddToCart(props: Props) {
  const [stock, setStock] = createSignal(props.initialStock);
  const [isAdded, setIsAdded] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  const [quantity, setQuantity] = createSignal(1); // NEU

  const handleBuy = async () => {
    if (stock() <= 0 || isLoading()) return;
    // NEU: Menge validieren
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
        setStock(stock() - qty);
        setIsAdded(true);
        setQuantity(1); // NEU: zurücksetzen
        setTimeout(() => setIsAdded(false), 2000);
        window.dispatchEvent(new CustomEvent('cart-updated'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ "margin-top": "auto", "padding-top": "1rem" }}>
      <p style={{ color: "#666", "font-size": "0.9rem", "margin-bottom": "0.75rem" }}>
        Live-Bestand: {stock()} Stück
      </p>

      {/* NEU: Menge + Button nebeneinander */}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <input
          type="number"
          min="1"
          max={stock()}
          value={quantity()}
          disabled={stock() === 0}
          onInput={(e) => {
            const val = parseInt(e.currentTarget.value);
            if (!isNaN(val) && val >= 1 && val <= stock()) {
              setQuantity(val);
            }
          }}
          style={{
            width: "70px",
            padding: "0.75rem 0.5rem",
            border: "1px solid #e0e0e0",
            "border-radius": "8px",
            "font-size": "1rem",
            "text-align": "center",
            "font-family": "inherit",
          }}
        />
        <button
          onClick={handleBuy}
          disabled={stock() === 0 || isLoading()}
          style={{
            flex: "1",
            padding: "0.75rem",
            "background-color": stock() === 0 ? "#ccc" : isAdded() ? "#e2e8f0" : "#333",
            color: isAdded() ? "#333" : "#fff",
            border: "none",
            "border-radius": "8px",
            cursor: stock() === 0 ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            "font-family": "inherit",
            "font-size": "0.95rem",
            "font-weight": "600",
          }}
        >
          {isLoading()
            ? "..."
            : stock() === 0
              ? "Gähnend ausverkauft"
              : isAdded()
                ? "🥱 Im Warenkorb gelandet"
                : "In den Warenkorb"}
        </button>
      </div>
    </div>
  );
}