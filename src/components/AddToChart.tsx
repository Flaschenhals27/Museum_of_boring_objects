import { createSignal } from 'solid-js';

interface Props {
  itemId: number;
  initialStock: number;
}

export default function AddToCart(props: Props) {
  const [stock, setStock] = createSignal(props.initialStock);
  const [isAdded, setIsAdded] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);

  const handleBuy = async () => {
    if (stock() <= 0 || isLoading()) return;
    setIsLoading(true);

    try {
      // NEU: API aufrufen statt nur lokal updaten
      const res = await fetch('/api/cart/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: props.itemId, quantity: 1 }),
      });

      if (res.ok) {
        setStock(stock() - 1);
        setIsAdded(true);
        setTimeout(() => setIsAdded(false), 2000);
        // NEU: Event damit Nav-Badge sich aktualisiert
        window.dispatchEvent(new CustomEvent('cart-updated'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ "margin-top": "auto", "padding-top": "1rem" }}>
      <p style={{ color: "#666", "font-size": "0.9rem", "margin-bottom": "0.5rem" }}>
        Live-Bestand: {stock()} Stück
      </p>
      <button
        onClick={handleBuy}
        disabled={stock() === 0 || isLoading()}
        style={{
          width: "100%",
          padding: "0.75rem",
          "background-color": stock() === 0 ? "#ccc" : isAdded() ? "#e2e8f0" : "#333",
          color: isAdded() ? "#333" : "#fff",
          border: "none",
          "border-radius": "4px",
          cursor: stock() === 0 ? "not-allowed" : "pointer",
          transition: "all 0.2s ease"
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
  );
}