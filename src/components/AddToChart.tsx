// src/components/AddToCart.tsx
import { createSignal } from 'solid-js';

// Wir definieren, welche Daten Astro an diese Komponente übergeben darf
interface Props {
  itemId: number;
  initialStock: number;
}

export default function AddToCart(props: Props) {
  // createSignal ist das SolidJS-Äquivalent zu Reacts useState
  const [stock, setStock] = createSignal(props.initialStock);
  const [isAdded, setIsAdded] = createSignal(false);

  const handleBuy = () => {
    if (stock() > 0) {
      setStock(stock() - 1); // Bestand lokal reduzieren
      setIsAdded(true);      // Button-Status ändern
      
      // Nach 2 Sekunden den Text wieder zurücksetzen
      setTimeout(() => setIsAdded(false), 2000);
      
      // Hier würde später der globale Warenkorb aktualisiert werden
      console.log(`Objekt ${props.itemId} wurde in den Warenkorb gelegt!`);
    }
  };

  return (
    <div style={{ "margin-top": "auto", "padding-top": "1rem" }}>
      <p style={{ color: "#666", "font-size": "0.9rem", "margin-bottom": "0.5rem" }}>
        Live-Bestand: {stock()} Stück
      </p>
      
      <button 
        onClick={handleBuy}
        disabled={stock() === 0}
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
        {stock() === 0 
          ? "Gähnend ausverkauft" 
          : isAdded() 
            ? "🥱 Im Warenkorb gelandet" 
            : "In den Warenkorb"}
      </button>
    </div>
  );
}