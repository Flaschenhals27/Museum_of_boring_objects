import { For, createSignal, onMount } from 'solid-js';

const links = [
  { href: '/daily-object', label: 'Objekt des Tages' },
  { href: '/', label: 'Shop' },
  { href: '/about', label: 'About' },
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
    const res = await fetch('/api/cart');
    const data = await res.json();
    setCartCount(data.items.reduce((sum: number, i: any) => sum + i.quantity, 0));
  };

  const loadUser = async () => {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    setUser(data.user);
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

  return (
    <nav class="nav-container">
      <div class="nav-blur-bg"></div>
      <div class="nav-content">

        {/* Logo */}
        <a href="/" class="nav-logo">🪨 The Ordinary Emporium</a>

        {/* Desktop Links */}
        <ul class="nav-links">
          <For each={links}>
            {(link) => (
              <li>
                <a href={link.href} class={`nav-link ${currentPath() === link.href ? 'nav-link--active' : ''}`}>
                  {link.label}
                </a>
              </li>
            )}
          </For>
        </ul>

        {/* Rechte Seite */}
        <div class="nav-right">

          {/* Eingeloggt */}
          {user() ? (
            <div class="nav-user">
              <span class="nav-user-name">👤 {user()!.prename}</span>
              <button class="nav-logout-btn" onClick={handleLogout}>Abmelden</button>
            </div>
          ) : (
            <a href="/login" class="nav-login-btn">Anmelden</a>
          )}

          {/* Warenkorb */}
          <a href="/cart" class="nav-cart">
            🛒
            {cartCount() > 0 && (
              <span class="nav-cart-badge">{cartCount()}</span>
            )}
          </a>

          <button class="hamburger" id="hamburger-btn" aria-label="Menü öffnen">☰</button>
        </div>

      </div>

      {/* Mobile Menü */}
      <ul class="nav-mobile" id="nav-mobile">
        <For each={links}>
          {(link) => (
            <li>
              <a href={link.href} class={currentPath() === link.href ? 'nav-link--active' : ''}>
                {link.label}
              </a>
            </li>
          )}
        </For>
        <li><a href="/cart">🛒 Warenkorb {cartCount() > 0 ? `(${cartCount()})` : ''}</a></li>
        {user()
          ? <li><button class="nav-mobile-logout" onClick={handleLogout}>Abmelden ({user()!.prename})</button></li>
          : <li><a href="/login">Anmelden</a></li>
        }
      </ul>
    </nav>
  );
}