import { createSignal, onMount, For } from 'solid-js';

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

  onMount(async () => {
    // Aktuelle Seite in Cookie speichern
    const existing = JSON.parse(localStorage.getItem('recently_viewed') ?? '[]') as number[];
    const updated = [props.currentId, ...existing.filter(id => id !== props.currentId)].slice(0, 4);
    localStorage.setItem('recently_viewed', JSON.stringify(updated));

    // Andere IDs laden (ohne aktuelle)
    const others = updated.filter(id => id !== props.currentId).slice(0, 3);
    if (others.length === 0) return;

    // Produktdaten laden
    const products = await Promise.all(
      others.map(async (id) => {
        const res = await fetch(`/api/product/${id}`);
        if (!res.ok) return null;
        return res.json();
      })
    );

    setRecent(products.filter(Boolean));
  });

  return (
  <>
    {recent().length > 0 && (
      <section class="recently-viewed">
        <p class="section-eyebrow">Zuletzt angesehen</p>
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
      </section>
    )}
  </>
  );
}