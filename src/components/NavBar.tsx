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
      <div class="nav-container">

        <div class="nav-left">
          {user() ? (
            <>
              <a href="/account" class="nav-user-chip" title="Zum Konto">
                ▸ {user()!.prename.toUpperCase()}
              </a>
              <button class="nav-logout-btn" onClick={handleLogout}>Abmelden</button>
            </>
          ) : (
            <a href="/login" class="nav-anmelden">Anmelden ⟵</a>
          )}
        </div>

        {/* Logo + Stempel-Siegel */}
        <div class="nav-logo-wrap">
          <a href="/" class="nav-logo" aria-label="Zur Startseite">
            <span class="nav-logo__title">
              The <em>Ordinary</em> Emporium
            </span>
            <span class="nav-logo__sub">
              Das Wochenblatt für vollkommen belanglose Gegenstände
            </span>
          </a>
          <div class="nav-stamp" aria-hidden="true">
            <svg viewBox="0 0 100 100" class="nav-stamp__svg">
              <circle class="nav-stamp__circle nav-stamp__circle--outer" cx="50" cy="50" r="46" />
              <circle class="nav-stamp__circle"                          cx="50" cy="50" r="40" />
              <text class="nav-stamp__no" x="50" y="48">N° {props.ausgabeRoman ?? 'XXII'}</text>
              <text class="nav-stamp__text" x="50" y="62">KATALOG</text>
              <text class="nav-stamp__text" x="50" y="74">EST. {props.jahrgangRoman ?? 'MMXXVI'}</text>
            </svg>
          </div>
        </div>

        <div class="nav-right">
          <a href="/wishlist" class="nav-wishlist-btn" title="Wunschliste" aria-label="Wunschliste">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </a>
          <a href="/cart" class="nav-cart">
            Warenkorb · {cartCount()}
          </a>
        </div>

      </div>

      {/* SECTION-BAR: Inhalt | Tabs | Suchen */}
      <div class="nav-sections-bar">
        <div class="nav-sections-bar__left">
          <span class="nav-meta">
            <span>Inhalt</span>
            <span class="nav-meta__sep">·</span>
            <span>{props.itemCount ?? '–'} Einträge</span>
          </span>
        </div>

        <ul class="nav-sections">
          <For each={sections}>
            {(s) => (
              <li>
                <a href={s.href} class={isActive(s.href) ? 'is-active' : ''}>
                  {s.label}
                </a>
              </li>
            )}
          </For>
        </ul>

        <div class="nav-sections-bar__right">
          <a href="/search" class="nav-search-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
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
