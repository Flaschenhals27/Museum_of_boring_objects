// =====================================================================
// components/RecentlyViewed.tsx
// =====================================================================
// Zeigt die zuletzt besuchten Produkte aus localStorage.
// Wichtig: Die Komponente rendert IMMER eine Section (auch leer),
// damit `client:visible` die Höhe für den IntersectionObserver erkennt.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) angepasst.

// TAILWIND-MIGRATION: recently-viewed.css gelöscht, Styles als Utilities.
// Der Bild-Platzhalter nutzt die geteilte .bg-stripes-Klasse (global.css).
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
    <section class="mt-12 border-0 border-t border-solid border-ink pt-8">
      {/* Eyebrow ist immer da -> stabile Höhe für client:visible */}
      <p class="mt-0 mb-2 font-meta text-[0.78rem] uppercase tracking-[0.14em] text-red">Zuletzt im Lesesaal</p>

      <Show when={!loaded()}>
        <p class="mt-6 mb-0 py-4 font-body text-[0.95rem] text-ink-mute"><em>Wird geladen ...</em></p>
      </Show>

      <Show when={loaded() && !hasData()}>
        <p class="mt-6 mb-0 py-4 font-body text-[0.95rem] text-ink-mute">
          <em>Sie haben in dieser Sitzung noch keine weiteren Objekte aufgesucht.</em>
        </p>
      </Show>

      <Show when={hasData()}>
        <div class="mt-6 grid grid-cols-3 border-0 border-t border-solid border-paper-3 max-[720px]:grid-cols-1">
          <For each={recent()}>
            {(product) => (
              <a href={`/product/${product.id}`} class="flex flex-col gap-3 border-0 border-b border-r border-solid border-paper-3 p-4 text-ink transition-colors duration-150 hover:bg-paper-2 [&:nth-child(3n)]:border-r-0 max-[720px]:border-r-0">
                <div class="bg-stripes aspect-[4/3] overflow-hidden">
                  <img src={product.thumbnail} alt={product.name} class="block h-full w-full object-cover mix-blend-multiply [filter:sepia(0.12)_contrast(0.95)]" />
                </div>
                <p class="m-0 font-display text-[1.1rem] font-bold leading-[1.15]">{product.name}</p>
                <p class="m-0 font-display text-base font-bold text-ink">{product.price.toFixed(2)} €</p>
              </a>
            )}
          </For>
        </div>
      </Show>
    </section>
  );
}