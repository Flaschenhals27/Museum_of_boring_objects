// =====================================================================
// env.d.ts — globale Typ-Deklarationen
// =====================================================================
// window.toast wird in Layout.astro (Toast-System, is:inline-Script)
// definiert und von den Solid-Komponenten benutzt. Vorher stand dafür
// überall `(window as any).toast` — hier einmal sauber typisiert.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.
// =====================================================================

declare global {
  interface Window {
    toast?: (message: string, variant?: 'success' | 'error' | 'info') => void;
  }
}

export {};
