# Gefundene Inkonsistenzen (zur späteren Klärung/Fix)

Notizen aus der Abnahme-Vorbereitung — Dinge, die beim Durcharbeiten des Codes aufgefallen sind,
aber nicht sofort gefixt wurden. Für spätere Aufräum-Sessions (z.B. im Zuge der Tailwind-Migration).

## `loadCartItems({ prune: true })` wird nicht konsistent genutzt

`loadCartItems` (src/lib/cart.ts:113) kann verwaiste CartItems (Produkt wurde gelöscht) automatisch
aufräumen, wenn `{ prune: true }` übergeben wird. Aktuell genutzt an vier Stellen, aber ohne
erkennbare einheitliche Regel:

- **Mit `prune: true`:**
  - `src/pages/api/orders/index.ts:220` (Bestellabschluss)
  - `src/pages/api/cart/index.ts:26` (GET /api/cart — reiner Lesezugriff!)
- **Ohne `prune`:**
  - `src/pages/cart.astro:18` (Warenkorb-Seite)
  - `src/pages/checkout.astro:24` (Checkout-Seite)
  - `src/pages/api/cart/coupon.ts:42` (Subtotal-Berechnung für Gutschein-Validierung)

**Problem:** `api/cart/index.ts` ist ein GET-Endpoint (reiner Lesezugriff) und prunt trotzdem
(löst also einen DB-Write als Nebeneffekt eines GETs aus) — während die beiden Seiten
(`cart.astro`, `checkout.astro`), die denselben Zweck (Warenkorb anzeigen) erfüllen, es nicht tun.
Es gibt keine Code-Kommentare, die diese Aufteilung begründen.

**Möglicher Fix:** Entweder überall prunen (konsistent selbstheilend) oder eine klare Regel
festlegen (z.B. "nur bei zustandsverändernden Aktionen") und `api/cart/index.ts` entsprechend
anpassen.

---

*Diese Datei dient als Backlog-Notiz, nicht als Teil der Lernfragen-Abnahme-Vorbereitung
(siehe dafür LERNFRAGEN.md).*
