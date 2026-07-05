// =====================================================================
// components/NavBar.tsx — Hauptnavigation
// =====================================================================
// Solid-Insel mit client:load. Rendert:
//   - Linke Spalte: Anmelden bzw. eingeloggter User-Chip + Logout
//   - Mittlere Spalte: Logo-Block mit Stempel-Siegel
//   - Rechte Spalte: Wishlist-Herz + Warenkorb
//   - Section-Bar darunter: "Inhalt · N Einträge" | Tabs | Suchen-Button
//
// Cart-Stand und User-Status werden über die jeweiligen API-Endpunkte
// asynchron nachgeladen.
//
// TAILWIND-MIGRATION: alle nav-*-Klassen aus global.css sind durch
// Utility-Klassen ersetzt (inkl. SVG-Stempel via fill-/stroke-Utilities).
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) angepasst.

import { For, createSignal, onMount } from 'solid-js';

interface Props {
  ausgabeRoman?: string;
  jahrgangRoman?: string;
  itemCount?: number;   // echte Katalog-Größe, kommt aus Layout.astro (DB-Count)
}

const sections = [
  { href: '/',             label: 'Katalog' },
  { href: '/daily-object', label: 'Objekt des Tages' },
  { href: '/about',        label: 'Die Redaktion' },
  { href: '/archive',      label: 'Archiv' },
];

interface User {
  id: number;
  email: string;
  username: string;
  prename: string;
}

// Wiederkehrende Utility-Kombi (lesbarer als 4x inline)
const metaChip = 'font-meta uppercase tracking-[0.1em] text-[0.78rem]';

export default function NavBar(props: Props) {
  const [currentPath, setCurrentPath] = createSignal('');
  const [cartCount, setCartCount] = createSignal(0);
  const [user, setUser] = createSignal<User | null>(null);

  const loadCartCount = async () => {
    try {
      const res = await fetch('/api/cart');
      const data = await res.json();
      setCartCount(data.items.reduce((sum: number, i: any) => sum + i.quantity, 0));
    } catch (e) { /* ignore */ }
  };

  const loadUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user);
    } catch (e) { /* ignore */ }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    window.location.href = '/';
  };

  onMount(() => {
    setCurrentPath(window.location.pathname);
    loadCartCount();
    loadUser();
    window.addEventListener('cart-updated', loadCartCount);
  });

  const isActive = (href: string) => {
    if (href === '/') return currentPath() === '/';
    return currentPath().startsWith(href);
  };

  return (
    <>
      {/* HAUPTZEILE: User-Chip / Logo+Stempel / Wishlist+Cart */}
      <div class="mx-auto grid max-w-[1200px] grid-cols-[1fr_auto_1fr] items-center gap-4 pb-[1.4rem] max-[720px]:grid-cols-1 max-[540px]:gap-[0.6rem]">

        <div class="flex items-center justify-start gap-[0.9rem] max-[720px]:justify-center max-[720px]:pb-2 max-[540px]:gap-[0.6rem] max-[540px]:pb-[0.3rem]">
          {user() ? (
            <>
              <a
                href="/account"
                title="Zum Konto"
                class={`${metaChip} tracking-[0.08em] text-ink-soft transition-colors duration-150 hover:text-red pointer-coarse:min-h-11 pointer-coarse:inline-flex pointer-coarse:items-center`}
              >
                ▸ {user()!.prename.toUpperCase()}
              </a>
              <button
                onClick={handleLogout}
                class="ml-2 cursor-pointer border border-solid border-ink bg-transparent px-[0.6rem] py-[0.3rem] font-meta text-[0.7rem] uppercase tracking-[0.08em] text-ink hover:bg-ink hover:text-paper pointer-coarse:min-h-11"
              >Abmelden</button>
            </>
          ) : (
            <a
              href="/login"
              class={`${metaChip} inline-flex items-center gap-[0.4rem] border border-solid border-ink px-[0.95rem] py-[0.55rem] text-ink transition-colors duration-150 hover:bg-ink hover:text-paper pointer-coarse:min-h-11 max-[540px]:text-[0.72rem]`}
            >Anmelden ⟵</a>
          )}
        </div>

        {/* Logo + Stempel-Siegel */}
        <div class="flex items-center justify-center gap-6 max-[720px]:gap-4">
          <a href="/" class="block text-center text-ink" aria-label="Zur Startseite">
            <span class="block font-display text-[clamp(2.4rem,5.8vw,4rem)] font-extrabold leading-none tracking-[-0.015em] max-[720px]:text-[clamp(1.6rem,9vw,2.4rem)] max-[720px]:leading-none">
              The <em class="mx-[0.05em] font-bold italic text-red">Ordinary</em> Emporium
            </span>
            <span class="mt-[0.7rem] inline-flex items-center gap-[0.6rem] font-body text-base font-normal italic tracking-normal text-ink-soft max-[720px]:text-[0.7rem] before:content-['‹'] before:text-[1.1rem] before:not-italic before:text-ink-mute after:content-['›'] after:text-[1.1rem] after:not-italic after:text-ink-mute">
              Das Wochenblatt für vollkommen belanglose Gegenstände
            </span>
          </a>
          <div class="h-[92px] w-[92px] shrink-0 opacity-[0.92] max-[720px]:h-16 max-[720px]:w-16 max-[540px]:hidden" aria-hidden="true">
            <svg viewBox="0 0 100 100" class="h-full w-full">
              <circle class="fill-none stroke-red stroke-1"     cx="50" cy="50" r="46" />
              <circle class="fill-none stroke-red stroke-[1.5]" cx="50" cy="50" r="40" />
              <text class="fill-red font-display text-[22px] font-bold italic [text-anchor:middle]" x="50" y="48">N° {props.ausgabeRoman ?? 'XXII'}</text>
              <text class="fill-red font-meta text-[7px] uppercase tracking-[0.18em] [text-anchor:middle]" x="50" y="62">KATALOG</text>
              <text class="fill-red font-meta text-[7px] uppercase tracking-[0.18em] [text-anchor:middle]" x="50" y="74">EST. {props.jahrgangRoman ?? 'MMXXVI'}</text>
            </svg>
          </div>
        </div>

        <div class="flex items-center justify-end gap-[0.9rem] max-[720px]:justify-center max-[720px]:pb-2 max-[540px]:gap-[0.6rem] max-[540px]:pb-[0.3rem]">
          <a
            href="/wishlist" title="Wunschliste" aria-label="Wunschliste"
            class="inline-flex h-[38px] w-[38px] items-center justify-center rounded-full border border-solid border-paper-3 bg-paper text-ink transition-colors duration-150 hover:border-red hover:text-red"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="h-[18px] w-[18px]">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </a>
          <a
            href="/cart"
            class={`${metaChip} inline-flex items-center gap-[0.4rem] bg-ink px-[0.95rem] py-[0.55rem] font-medium text-paper transition-colors duration-150 hover:bg-red pointer-coarse:min-h-11 max-[540px]:px-[0.9rem] max-[540px]:py-[0.6rem] max-[540px]:text-[0.72rem]`}
          >
            Warenkorb · {cartCount()}
          </a>
        </div>

      </div>

      {/* SECTION-BAR: Inhalt | Tabs | Suchen */}
      <div class="mx-auto grid max-w-[1200px] grid-cols-[1fr_auto_1fr] items-center gap-6 border-0 border-t border-solid border-ink px-6 pt-[0.9rem] pb-[0.95rem] max-[720px]:grid-cols-1 max-[720px]:gap-[0.6rem] max-[720px]:px-4 max-[720px]:pt-[0.6rem] max-[720px]:pb-[0.8rem]">
        <div class="justify-self-start max-[720px]:justify-self-center">
          <span class="flex items-center gap-2 font-meta text-[0.7rem] uppercase tracking-[0.12em] text-ink-mute max-[720px]:text-[0.65rem]">
            <span>Inhalt</span>
            <span class="text-paper-3">·</span>
            <span>{props.itemCount ?? '–'} Einträge</span>
          </span>
        </div>

        <ul class="m-0 flex list-none justify-center gap-12 p-0 font-meta text-[0.82rem] uppercase tracking-[0.12em] max-[720px]:flex-wrap max-[720px]:gap-[1.2rem] max-[720px]:text-[0.72rem] max-[540px]:gap-[0.8rem] max-[540px]:pb-2 max-[540px]:text-[0.7rem]">
          <For each={sections}>
            {(s) => (
              <li>
                <a
                  href={s.href}
                  class={
                    'border-0 border-b-2 border-solid pb-2 transition-colors duration-150 pointer-coarse:pt-[0.6rem] pointer-coarse:pb-[0.6rem] ' +
                    (isActive(s.href)
                      ? 'border-red text-red'
                      : 'border-transparent text-ink hover:text-red')
                  }
                >
                  {s.label}
                </a>
              </li>
            )}
          </For>
        </ul>

        <div class="justify-self-end max-[720px]:justify-self-center">
          <a
            href="/search"
            class="inline-flex items-center gap-[0.4rem] rounded-full border border-solid border-paper-3 bg-transparent px-4 py-2 font-meta text-[0.72rem] uppercase tracking-[0.12em] text-ink-soft transition-colors duration-150 hover:border-ink hover:text-ink"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.5" y2="16.5" />
            </svg>
            Suchen
          </a>
        </div>
      </div>
    </>
  );
}
