import { For, createSignal, onMount} from 'solid-js';
import { isServer } from 'solid-js/web';

const links = [
  { href: '/daily-object', label: 'Objekt des Tages' },
  { href: '/', label: 'Shop' },
  { href: '/about', label: 'About' },
];

export default function NavBar() {
  // Aktuelle URL erkennen
  const [currentPath, setCurrentPath] = createSignal('');

  onMount(() => {
    setCurrentPath(window.location.pathname);
  });

  return (
    <nav class="nav-container">
      <div class="nav-blur-bg"></div>
      <div class="nav-content">

        {/* Logo mit Emoji */}
        <a href="/" class="nav-logo">
          🪨 The Ordinary Emporium
        </a>

        {/* Desktop Links */}
        <ul class="nav-links">
          <For each={links}>
            {(link) => (
              <li> <a
                
                  href={link.href}
                  class={`nav-link ${currentPath() === link.href ? 'nav-link--active' : ''}`}
                >
                  {link.label}
                </a>
              </li>
            )}
          </For>
        </ul>

        {/* Hamburger */}
        <button class="hamburger" id="hamburger-btn" aria-label="Menü öffnen">☰</button>
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
      </ul>
    </nav>
  );
}