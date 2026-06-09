# 🏛️ Museum of Boring Objects

[![License: All Rights Reserved](https://img.shields.io/badge/license-All%20Rights%20Reserved-red.svg)](LICENSE)

Ein satirischer Webshop, der ausschließlich Gegenstände verkauft, die niemand wirklich braucht — die ausgetrocknete Textmarkerkappe, die leicht verbogene Büroklammer, den Kassenbon. Jedes Objekt wird auf seinen **Langeweile-Index** geprüft; unter 7/10 erscheint es nicht im Katalog.

Hinter der Fassade steckt ein vollständiger E-Commerce-Stack: Produktkatalog, Warenkorb, Wunschliste, Gutscheine, Nutzerkonten, Checkout und Bestellbestätigung per E-Mail.

---

## ✨ Features

- **Produktkatalog** mit Detailseiten, Bildergalerie, Specs und Langeweile-Index
- **Warenkorb** für Gäste (Session-basiert) und eingeloggte Nutzer
- **Wunschliste** — funktioniert für Gäste, wird beim Login automatisch dem Konto zugeordnet
- **Gutschein-System** — prozentual oder fest, mit Mindestbestellwert, Gültigkeitsfenster und Einlöse-Limit
- **Nutzerkonten** — Registrierung & Login (bcryptjs + JWT in HttpOnly-Cookies), hinterlegbare Adressen
- **Checkout & Bestellungen** — Adress- und Preis-Snapshots, sprechende Bordereau-Nummern, Bestellbestätigung per E-Mail (Resend)
- **Newsletter-Anmeldung**
- **„Zuletzt angesehen"** und Tagesobjekt
- **Rate-Limiting** auf sensiblen Endpunkten
- **Rechtstexte** (Impressum, AGB, Datenschutz, Cookies, Widerruf/Versand) — zentral aus `src/lib/company.ts` gespeist

---

## 🧱 Tech-Stack

| Bereich        | Technologie                                            |
| :------------- | :----------------------------------------------------- |
| Framework      | [Astro](https://astro.build) (SSR, `output: 'server'`) |
| Interaktivität | [SolidJS](https://www.solidjs.com) (Inseln)            |
| Datenbank      | [Astro DB](https://docs.astro.build/en/guides/astro-db/) (Drizzle ORM auf SQLite lokal / libSQL·Turso remote) |
| Auth           | bcryptjs (Hashing) + [jose](https://github.com/panva/jose) (JWT) |
| E-Mail         | [Resend](https://resend.com)                           |
| Adapter        | `@astrojs/node` (standalone)                           |
| Sprache        | TypeScript                                             |

> Styling ist handgebaut auf einem eigenen CSS-Token-System (kein Tailwind).

---

## 🚀 Schnellstart

### Voraussetzungen

- **Node.js ≥ 22.12.0**

### Installation

```sh
git clone https://github.com/Flaschenhals27/Museum_of_boring_objects.git
cd Museum_of_boring_objects
npm install
```

### Umgebungsvariablen

Lege eine `.env` im Projekt-Root an:

```sh
# E-Mail (Resend)
RESEND_API_KEY=
MY_EMAIL=

# Auth
JWT_SECRET=

# Impressum / Firmendaten (werden in src/lib/company.ts gelesen)
IMPRESSUM_NAME=
IMPRESSUM_STREET=
IMPRESSUM_POSTAL=
IMPRESSUM_CITY=
IMPRESSUM_EMAIL=
IMPRESSUM_TEL=
IMPRESSUM_BOSS=
IMPRESSUM_DISTRICT=
IMPRESSUM_DISTRICT_ADDRESS=
IMPRESSUM_VAT_ID=
IMPRESSUM_MAP_BBOX=
IMPRESSUM_MAP_MARKER_LAT=
IMPRESSUM_MAP_MARKER_LNG=

# Remote-Datenbank (optional — nur für Produktion mit Astro Studio/Turso)
ASTRO_DB_REMOTE_URL=
ASTRO_DB_APP_TOKEN=
```

> Für alle Firmendaten existieren Fallback-Werte, der Shop läuft also auch ohne vollständige `.env` lokal an.

### Datenbank befüllen

Die Seed-Dateien (`db/seed.ts`, `db/products.json`, `db/coupon-data.ts`) werden von Astro DB beim Start des Dev-Servers automatisch in die lokale Datenbank geladen.

### Entwicklungsserver starten

```sh
npm run dev
```

Der Shop läuft anschließend unter **http://localhost:4321**.

---

## 🧞 Befehle

Alle Befehle werden im Projekt-Root ausgeführt:

| Befehl            | Aktion                                          |
| :---------------- | :---------------------------------------------- |
| `npm install`     | Abhängigkeiten installieren                     |
| `npm run dev`     | Dev-Server unter `localhost:4321` starten       |
| `npm run build`   | Produktions-Build nach `./dist/`                |
| `npm run preview` | Build lokal vorab ansehen                       |
| `npm run astro …` | Astro-CLI (`astro add`, `astro check`, …)       |

---

## 📂 Projektstruktur

```text
/
├── db/                     # Astro DB: Schema, Seed-Daten, Gutschein-Daten
│   ├── config.ts           #   Tabellen-Definitionen (User, Item, Cart, Order, …)
│   ├── products.json       #   Produktkatalog (Seed)
│   └── seed.ts             #   Seed-Logik
├── public/                 # Statische Assets (Favicon, Produktbilder, robots.txt)
├── src/
│   ├── components/         # SolidJS-Inseln (NavBar, ImageGallery, Cart, Wishlist …)
│   ├── layouts/            # Layout.astro
│   ├── lib/                # Server-Logik (auth, cart, coupon, company, rateLimit)
│   ├── pages/              # Routen
│   │   ├── api/            #   API-Endpunkte (auth, cart, orders, wishlist, …)
│   │   └── product/[id]    #   Produktdetailseite
│   └── styles/             # CSS-Token-System & Komponenten-Styles
└── astro.config.mjs
```

---

## 🗃️ Datenmodell

Zentral definiert in `db/config.ts`:

- **User** — Konten (E-Mail, gehashtes Passwort)
- **Item** — der Katalog (Preis, Bestand, Langeweile-Index, Specs, Bilder)
- **Cart / CartItem** — aktiver Warenkorb (Gast via `sessionId` oder Nutzer)
- **Coupon** — Rabattcodes (`percent` / `fixed`, Limits, Gültigkeit)
- **Address** — hinterlegte Adressen eingeloggter Nutzer
- **Order / OrderItem** — abgeschlossene Bestellungen mit **Snapshots** von Adresse und Preisen zum Bestellzeitpunkt
- **Wishlist** — Wunschliste für Gäste und Nutzer

> Bestellungen frieren Adresse und Preise als Snapshot ein, damit spätere Änderungen die Bestellhistorie nicht verfälschen.

---

## 📦 Deployment

`npm run build` erzeugt einen standalone Node-Server in `./dist/`. Für den Produktionsbetrieb wird eine Remote-Datenbank (Astro Studio / Turso) über `ASTRO_DB_REMOTE_URL` und `ASTRO_DB_APP_TOKEN` angebunden.

---

## 📜 Lizenz

**All Rights Reserved.** Dieses Projekt steht unter keiner Open-Source-Lizenz. Der Quellcode darf eingesehen werden, eine Nutzung, Änderung oder Weitergabe ist ohne ausdrückliche schriftliche Genehmigung nicht gestattet. Siehe [`LICENSE`](LICENSE).

---

> Ein Lern- und Hobbyprojekt. Der Shop verkauft nichts Echtes — Sie werden moderat enttäuscht sein. So muss es sein.
