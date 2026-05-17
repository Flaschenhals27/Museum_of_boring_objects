import { For, createSignal, onMount } from 'solid-js';

const sections = [
  { href: '/', label: 'Katalog' },
  { href: '/daily-object', label: 'Objekt des Tages' },
  { href: '/about', label: 'Die Redaktion' },
];

interface User {
  id: number;
  email: string;
  username: string;
  prename: string;
}

export default function NavBar() {
  const [currentPath, setCurrentPath] = createSignal('');
  const [cartCount, setCartCount] = createSignal(0);
  const [user, setUser] = createSignal<User | null>(null);

  const loadCartCount = async () => {
    try {
      const res = await fetch('/api/cart');
      const data = await res.json();
      setCartCount(data.items.reduce((sum: number, i: any) => sum + i.quantity, 0));
    } catch (e) { /* still */ }
  };

  const loadUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      setUser(data.user);
    } catch (e) { /* still */ }
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
      <div class="nav-container">

        {/* LINKS: Anmelden bzw. User-Chip */}
        <div class="nav-left">
          {user() ? (
            <>
              <span class="nav-user-chip">▸ {user()!.prename.toUpperCase()}</span>
              <button class="nav-logout-btn" onClick={handleLogout}>Abmelden</button>
            </>
          ) : (
            <a href="/login" class="nav-anmelden">Anmelden ⟵</a>
          )}
        </div>

        {/* MITTE: Zeitungs-Logo */}
        <a href="/" class="nav-logo">
          <span class="nav-logo__title">The Ordinary Emporium</span>
          <span class="nav-logo__sub">Das Wochenblatt für vollkommen belanglose Gegenstände.</span>
        </a>

        {/* RECHTS: Warenkorb */}
        <div class="nav-right">
          <a href="/cart" class="nav-cart">
            Warenkorb · {cartCount()}
          </a>
        </div>

      </div>

      {/* SECTION-TABS */}
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
    </>
  );
}