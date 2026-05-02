import { For, createSignal, onMount } from 'solid-js';

const links = [
  { href: '/daily-object', label: 'Objekt des Tages' },
  { href: '/', label: 'Shop' },
  { href: '/about', label: 'About' },
];

export default function NavBar() {
  const [currentPath, setCurrentPath] = createSignal('');
  const [cartCount, setCartCount] = createSignal(0);

  const loadCartCount = async () => {
    const res = await fetch('/api/cart');
    const data = await res.json();
    setCartCount(data.items.reduce((sum: number, i: any) => sum + i.quantity, 0));
  };

  onMount(() => {
    setCurrentPath(window.location.pathname);
    loadCartCount();
    // Badge aktualisieren wenn Produkt hinzugefügt wird
    window.addEventListener('cart-updated', loadCartCount);
  });

  return (
  <nav class="nav-container">
    <div class="nav-blur-bg"></div>
    <div class="nav-content">

      {/* Logo – linksbündig */}
      <a href="/" class="nav-logo">🪨 The Ordinary Emporium</a>

      {/* Links – zentriert */}
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

      {/* Rechte Seite – rechtsbündig */}
      <div class="nav-right">
        <a href="/cart" class="nav-cart">
          🛒
          {cartCount() > 0 && (
            <span class="nav-cart-badge">{cartCount()}</span>
          )}
        </a>
        <button class="hamburger" id="hamburger-btn" aria-label="Menü öffnen">☰</button>
      </div>

    </div>

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
    </ul>
  </nav>
);
}