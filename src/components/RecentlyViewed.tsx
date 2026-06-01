// =====================================================================
// components/RecentlyViewed.tsx
// =====================================================================
// Zeigt die zuletzt besuchten Produkte aus localStorage.
// Wichtig: Die Komponente rendert IMMER eine Section (auch leer),
// damit `client:visible` die Höhe für den IntersectionObserver erkennt.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) angepasst.

import { createSignal, onMount, For, Show } from 'solid-js';

interface Props {
  currentId: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  thumbnail: string;
}

export default function RecentlyViewed(props: Props) {
  const [recent, setRecent] = createSignal<Product[]>([]);
  const [loaded, setLoaded] = createSignal(false);
  const [hasData, setHasData] = createSignal(false);

  onMount(async () => {
    // Aktuelle Seite in localStorage speichern
    const existing = JSON.parse(localStorage.getItem('recently_viewed') ?? '[]') as number[];
    const updated = [props.currentId, ...existing.filter(id => id !== props.currentId)].slice(0, 4);
    localStorage.setItem('recently_viewed', JSON.stringify(updated));

    // Andere IDs ohne die aktuelle
    const others = updated.filter(id => id !== props.currentId).slice(0, 3);

    if (others.length === 0) {
      setLoaded(true);
      setHasData(false);
      return;
    }

    // Produktdaten laden
    const products = await Promise.all(
      others.map(async (id) => {
        const res = await fetch(`/api/product/${id}`);
        if (!res.ok) return null;
        return res.json();
      })
    );

    const filtered = products.filter(Boolean) as Product[];
    setRecent(filtered);
    setHasData(filtered.length > 0);
    setLoaded(true);
  });

  return (
    <section class="recently-viewed">
      {/* Eyebrow ist immer da -> stabile Höhe für client:visible */}
      <p class="section-eyebrow">Zuletzt im Lesesaal</p>

      <Show when={!loaded()}>
        <p class="recent-empty"><em>Wird geladen ...</em></p>
      </Show>

      <Show when={loaded() && !hasData()}>
        <p class="recent-empty">
          <em>Sie haben in dieser Sitzung noch keine weiteren Objekte aufgesucht.</em>
        </p>
      </Show>

      <Show when={hasData()}>
        <div class="recent-grid">
          <For each={recent()}>
            {(product) => (
              <a href={`/product/${product.id}`} class="recent-card">
                <div class="recent-img-wrapper">
                  <img src={product.thumbnail} alt={product.name} class="recent-img" />
                </div>
                <p class="recent-name">{product.name}</p>
                <p class="recent-price">{product.price.toFixed(2)} €</p>
              </a>
            )}
          </For>
        </div>
      </Show>
    </section>
  );
}