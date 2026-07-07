# Fragenkatalog — The Ordinary Emporium (Abnahme-Vorbereitung)

> **Anleitung für das abfragende Modell (Sonnet/Opus):**
> Stelle die Fragen der Reihe nach (oder zufällig innerhalb eines Blocks).
> Lass den Nutzer frei antworten, prüfe die Antwort dann **gegen den
> tatsächlichen Code dieses Repos** (Dateien lesen!) und korrigiere präzise.
> Bei „Wo passiert was"-Fragen zählt Datei + ungefähre Stelle als richtig.
> Hake nach, wenn die Antwort auswendig klingt, aber das Warum fehlt.
> Blöcke 1–3 sind Grundlagen, ab Block 8 wird es anspruchsvoll.

---

## Block 1 — Web-Grundlagen (das Fundament)

1. Was bedeutet SSR (Server-Side Rendering) und was passiert dabei konkret, wenn ein Browser eine Seite anfragt?
2. Was ist der Unterschied zwischen SSR, CSR (Client-Side Rendering) und SSG (Static Site Generation)?
3. Warum ist dieses Projekt SSR und nicht SSG? Welche Zeile in `astro.config.mjs` legt das fest?
4. Was ist HTTP? Nenne die vier wichtigsten HTTP-Methoden und wofür sie stehen.
5. Was bedeuten die Statuscodes 200, 400, 401, 404, 409, 429 und 500? Alle kommen im Projekt vor.
6. Was ist ein Cookie und wie gelangt es vom Server zum Browser und wieder zurück?
7. Was bedeutet das `httpOnly`-Flag bei einem Cookie und wogegen schützt es?
8. Was bedeutet `sameSite: 'lax'` bei einem Cookie und wogegen schützt es?
9. Was ist JSON und warum benutzen die API-Routen es als Austauschformat?
10. Was ist der Unterschied zwischen Frontend und Backend — und wo verläuft die Grenze in einer Astro-Datei mit `<script>`-Block?
11. Was ist eine REST-API? Inwiefern folgen die Routen unter `src/pages/api/` diesem Prinzip?
12. Was ist eine Datenbank-Tabelle, was eine Zeile, was eine Spalte? Was ist ein Primary Key?
13. Was ist ein Foreign Key (im Projekt: `references`)? Nenne ein Beispiel aus `db/config.ts`.
14. Was ist der Unterschied zwischen `GET` und `POST` — warum wäre ein Login per GET eine schlechte Idee?
15. Was ist `fetch()` im Browser und was gibt es zurück?
16. Was ist `async/await` und warum steht vor fast jedem DB-Aufruf ein `await`?
17. Was passiert, wenn man ein `await` vergisst? Was hält man dann in der Variable?
18. Was ist TypeScript und was bringt es gegenüber reinem JavaScript in diesem Projekt?
19. Was ist eine Umgebungsvariable (`.env`) und warum stehen `JWT_SECRET` und `RESEND_API_KEY` dort und nicht im Code?
20. Was ist npm und was steht in der `package.json` unter `dependencies` vs. `devDependencies`?

## Block 2 — Astro & Projektstruktur

21. Wie funktioniert das dateibasierte Routing von Astro? Welche URL bedient `src/pages/product/[id].astro`?
22. Was ist der „Frontmatter"-Bereich einer `.astro`-Datei (zwischen den `---`) und wo läuft dieser Code — Server oder Browser?
23. Wo läuft der Code in einem `<script>`-Block am Ende einer `.astro`-Datei?
24. Was ist die „Islands Architecture" und warum ist sie das Hauptargument für Astro?
25. Was bedeutet `client:load` bei `<NavBar client:load />` in `Layout.astro`?
26. Was würde passieren, wenn man `client:load` bei `AddToCart` wegließe?
27. Warum ist Solid.js im Projekt und wofür genau? Nenne die fünf Solid-Komponenten.
28. Was ist ein Signal in Solid.js (`createSignal`)? Wie unterscheidet es sich von einer normalen Variable?
29. Wozu dient `src/layouts/Layout.astro` und was ist ein `<slot />`?
30. Wie wird eine API-Route in Astro definiert? Was ist der Typ `APIRoute` und was bekommt die Handler-Funktion übergeben?
31. Warum liegt `global.css` als `import` im Layout-Frontmatter statt als `<link>`-Tag? (Siehe Commit-Historie/Kommentar.)
32. Wozu dient der Node-Adapter (`@astrojs/node`, mode: 'standalone') in der Config?
33. Was macht `Astro.cookies` und wo überall im Projekt wird darauf zugegriffen?
34. Was macht `Astro.redirect('/')` und in welchen Seiten wird es benutzt — und warum jeweils?
35. Was ist der Unterschied zwischen einer Seite unter `src/pages/` und einer Komponente unter `src/components/`?
36. Welche Aufgabe hat `src/env.d.ts` und warum funktioniert `window.toast?.(...)` ohne TypeScript-Fehler?
37. Wie kommt das Toast-System technisch zustande — wo ist es definiert, wie rufen es Komponenten auf, warum über `window`?
38. Was bedeutet `is:inline` bei den Script-Tags in `Layout.astro`?

## Block 3 — Datenmodell (db/config.ts)

39. Zähle alle 10 Tabellen des Projekts auf und beschreibe je in einem Satz ihren Zweck.
40. Warum hat `Cart` sowohl `sessionId` als auch ein optionales `userId`?
41. Warum ist `CartItem` eine eigene Tabelle statt einer Liste im Cart? (Stichwort 1:n-Beziehung)
42. Was ist ein „Snapshot"-Feld? Welche Snapshots speichert `Order`, welche `OrderItem`?
43. Warum wird der Preis in `OrderItem.priceSnapshot` kopiert, statt ihn über `itemId` aus `Item` zu lesen?
44. Warum wird die Lieferadresse in die `Order`-Tabelle kopiert, obwohl es eine `Address`-Tabelle gibt?
45. Was bedeutet `unique: true` bei `User.email` — was passiert bei einem Insert mit doppelter E-Mail?
46. Was bedeutet `optional: true` bei einer Spalte auf DB-Ebene?
47. Wozu dient `Order.bordereauNr` und wozu zusätzlich `Order.token`? Warum reicht eins allein nicht?
48. Warum speichert `PasswordResetToken` einen `tokenHash` statt des Tokens selbst?
49. Welche Spalten machen einen Coupon zeitlich und mengenmäßig begrenzbar?
50. Wie bildet die `Wishlist`-Tabelle sowohl Gäste als auch eingeloggte Nutzer ab?
51. Was ist der Unterschied zwischen `db/config.ts` und `db/seed.ts`?
52. Was passiert mit der lokalen Datenbank, wenn man `astro dev` startet? Woher kommen die Produkte?
53. Was ist Drizzle ORM und was macht `astro:db` daraus? Was ist ein ORM überhaupt?
54. Übersetze in Worte: `db.select().from(Cart).where(eq(Cart.userId, userPayload.userId))`
55. Was macht `inArray()` und in welchen drei Stellen des Projekts wird es benutzt — und warum dort?
56. Was gibt `.returning()` bei einem Insert/Update zurück und wo nutzt das Projekt es?

## Block 4 — Authentifizierung (lib/auth.ts + api/auth/*)

57. Was ist ein JWT? Aus welchen drei Teilen besteht es?
58. Was steht bei uns im JWT-Payload (siehe `createToken`) und warum nicht mehr (z.B. das Passwort)?
59. Was bedeutet „signiert" bei einem JWT — kann der Server erkennen, wenn jemand das Payload manipuliert? Wie?
60. Kann ein Nutzer den Inhalt seines JWT **lesen**? Kann er ihn **ändern**? Begründe den Unterschied.
61. Was passiert in `lib/auth.ts` beim Server-Start, wenn `JWT_SECRET` fehlt oder zu kurz ist — und warum ist das absichtlich so hart?
62. Warum wird das JWT im `httpOnly`-Cookie transportiert und nicht im `localStorage`?
63. Was ist bcrypt und warum benutzt man es statt SHA-256 für Passwörter? (Stichwort: cost factor / langsam by design)
64. Was ist ein Salt und wo steckt er bei bcrypt?
65. Beschreibe den kompletten Registrierungs-Ablauf: Welche Validierungen laufen in welcher Reihenfolge in `register.ts`?
66. Beschreibe den kompletten Login-Ablauf in `login.ts` Schritt für Schritt.
67. Warum vergleicht `login.ts` auch dann ein Passwort (gegen einen Dummy-Hash), wenn der User gar nicht existiert?
68. Warum ist die Fehlermeldung bei Login absichtlich identisch für „User existiert nicht" und „Passwort falsch"?
69. Was passiert beim Login mit dem Gast-Warenkorb und der Gast-Wunschliste?
70. Was macht `logout.ts` mit dem Cart, bevor es die Cookies löscht — und warum die neue zufällige sessionId?
71. Wozu dient `GET /api/auth/me` und wer ruft es auf?
72. Wie lange ist das Auth-Cookie gültig und wo ist das definiert (zwei Stellen!)?
73. Was passiert, wenn ein gültiges JWT zu einem inzwischen gelöschten User gehört? (Siehe `account.astro`)
74. Warum prüft `account.astro` den Login serverseitig statt im Browser?

## Block 5 — Passwort-Reset (der neue Flow)

75. Beschreibe den kompletten Passwort-Reset-Ablauf von „Link anfordern" bis „neues Passwort gesetzt".
76. Warum antwortet `forgot-password` immer mit derselben Nachricht, egal ob die E-Mail existiert?
77. Warum wird der Reset-Token mit SHA-256 gehasht gespeichert, das Passwort aber mit bcrypt? Warum reicht hier SHA-256?
78. Wie lang ist der Reset-Token, wie wird er erzeugt und warum ist er nicht erratbar?
79. Wie wird Einmal-Verwendung des Tokens sichergestellt? Was macht `consumeResetToken` genau?
80. Warum entwertet erst das POST des Formulars den Token und nicht schon das Öffnen des Links (GET)?
81. Was passiert mit alten Reset-Tokens, wenn ein Nutzer einen neuen anfordert?
82. Warum wird der Reset-Link nur im Dev-Modus in die Konsole geloggt — was wäre das Risiko in Produktion?
83. Welche bewusste Lücke bleibt nach einem Passwort-Reset bestehen (Stichwort: bestehende JWTs) und warum ist sie ohne Zusatzaufwand nicht schließbar?
84. Warum setzt `reset-password.astro` einen `Cache-Control: no-store`-Header?

## Block 6 — Warenkorb & Sessions

85. Wie wird ein Gast ohne Account über mehrere Seitenaufrufe hinweg wiedererkannt?
86. Was macht `getOrCreateSessionId` und welche zwei Stellen benutzen es?
87. Erkläre die Suchreihenfolge in `getCart`: erst User, dann Session — warum diese Reihenfolge?
88. Worin unterscheiden sich `getCart` und `getOrCreateCart` und wann nimmt man welches?
89. Was macht `loadCartItems` und was bedeutet die Option `{ prune: true }` („selbstheilend")?
90. Beschreibe Schritt für Schritt, was `POST /api/cart/add` macht.
91. Warum wird der Lagerbestand beim In-den-Warenkorb-Legen NICHT reduziert? Was wäre das Problem, wenn doch?
92. Gegen welchen Wert prüft `cart/add` die gewünschte Menge und warum gegen `existingItem.quantity + quantity` statt nur `quantity`?
93. Wie stellt `PUT /api/cart/update` sicher, dass niemand fremde Warenkorb-Positionen ändert?
94. Warum liest `cart/update` die `itemId` aus der Datenbank statt aus dem Request-Body?
95. Was genau ist eine IDOR-Schwachstelle? Konstruiere den Angriff, der vor dem Fix bei `cart/remove` möglich war.
96. Was passiert mit dem Warenkorb eines Gastes, der sich einloggt und schon einen User-Cart hat?
97. Woher kommt die Zahl neben dem Warenkorb-Symbol in der NavBar? (Welcher Endpoint, welches Event?)
98. Was bedeutet das `cart-updated`-CustomEvent und wer feuert/hört es?
99. Warum lädt die Warenkorb-Seite nach jeder Mengenänderung die ganze Seite neu (`window.location.reload()`)? Was wäre die Alternative und ihr Trade-off?
100. Warum hat die Warenkorb-Nummer das Format „K-00042" und die Bestellnummer „2026/00042"?

## Block 7 — Gutscheine & Preisberechnung

101. Welche zwei Gutschein-Typen gibt es und wie unterscheidet sich die Rabatt-Berechnung?
102. Welche fünf Bedingungen prüft `couponBlockReason` in welcher Reihenfolge?
103. Warum gibt es sowohl `validateCoupon` (mit Fehlermeldung) als auch `resolveDiscount` (still)? Wann wird welches benutzt?
104. Warum wird der Rabattbetrag nirgends gespeichert, sondern bei jedem Seitenaufruf neu berechnet?
105. Wo wird der eingelöste Code vermerkt und wann wird er wieder vom Cart entfernt?
106. Warum wird der Rabatt beim Bestellabschluss serverseitig NEU berechnet, obwohl der Client ihn schon kennt?
107. Kann der Rabatt größer sein als die Zwischensumme? Wo wird das verhindert (Code-Stelle)?
108. Wird der Rabatt auf die Versandkosten angewendet? Wo steht die Formel für `total`?
109. Wann und wo wird `redeemedCount` erhöht — und warum atomar per SQL statt read-modify-write?
110. Was passiert mit einem Gutschein, der zwischen Einlösen und Bestellen abläuft?

## Block 8 — Der Bestellprozess (die Königsfrage)

111. **Die große Ablauffrage:** Was passiert alles, nachdem der Kunde auf „Bestellung aufgeben" klickt? Gehe ALLE 11 nummerierten Schritte in `api/orders/index.ts` durch.
112. Welche Felder validiert `validate()` und warum ist die E-Mail-Regex bewusst „grob"?
113. Wie wird die Bordereau-Nummer generiert? Warum kann das bei zwei gleichzeitigen Bestellungen kollidieren?
114. Wie geht der Code mit dieser Kollision um? (Retry-Loop erklären)
115. Erkläre `reserveStock`: Was macht `SET stock = stock - n WHERE stock >= n` und warum ist das „atomar"?
116. Was ist eine Race Condition? Konstruiere den Überverkauf, der mit der alten Version (`stock: product.stock - quantity`) möglich war.
117. Warum verhindert die neue Version den Überverkauf, obwohl es immer noch keine Transaktion gibt?
118. Was passiert, wenn Artikel 3 von 5 nicht mehr vorrätig ist, nachdem 1 und 2 schon reserviert wurden?
119. Was ist eine Datenbank-Transaktion und warum kann dieses Projekt keine benutzen?
120. Was ist das dokumentierte „Crash-Fenster" im Bestellprozess und warum ist es ohne Transaktionen nicht vollständig schließbar?
121. Was wäre ein Saga-/Outbox-Pattern (grob) und welches Problem würde es lösen?
122. Warum werden die OrderItems mit `nameSnapshot` und `priceSnapshot` geschrieben statt nur mit `itemId`?
123. Warum darf ein fehlgeschlagener Mail-Versand die Bestellung NICHT scheitern lassen? Wie ist das implementiert?
124. Warum navigiert der Client nach der Bestellung mit dem `token` zur Bestätigungsseite statt mit der Bordereau-Nummer?
125. Was würde passieren, wenn `order-confirmed` die Bestellung per Bordereau-Nummer laden würde? Konstruiere den Angriff.
126. Wozu dient das kurzlebige `order_placed`-Cookie (60 Sekunden)?
127. Warum leert der Prozess den Warenkorb erst NACH dem erfolgreichen Order-Insert?
128. Warum wird checkout.astro bei leerem Warenkorb sofort umgeleitet — und wo passiert das (Server oder Client)?
129. Welche Rolle spielt `SHIPPING_COST` und warum ist es eine Konstante in `lib/` statt dreimal `12.00` im Code?
130. Zeichne (mündlich) das Sequenzdiagramm: Browser → checkout.astro → /api/orders → DB → Resend → Browser.

## Block 9 — Sicherheit (Querschnitt)

131. Nenne alle Sicherheitsmaßnahmen des Projekts, die dir einfallen — mindestens acht.
132. Wie funktioniert der Rate-Limiter in `lib/rateLimit.ts`? Erkläre „Sliding Window" anhand des Codes.
133. Welche Endpoints sind rate-limited und mit welchen Limits? Warum ausgerechnet diese?
134. Welche zwei dokumentierten Schwächen hat der In-Memory-Rate-Limiter?
135. Woher nimmt `getClientIp` die IP-Adresse? Warum ist `X-Forwarded-For` nur hinter einem Reverse-Proxy vertrauenswürdig?
136. Was ist Account-Enumeration und an welchen DREI Stellen verhindert das Projekt sie?
137. Was ist ein Timing-Angriff und wieso ist der bcrypt-Vergleich in `login.ts` dagegen gehärtet?
138. Was ist XSS? Warum sind Astro-Templates (`{item.name}`) standardmäßig dagegen geschützt?
139. Was ist SQL-Injection? Warum schützt das ORM (parametrisierte Queries) davor — und wo wäre man trotzdem vorsichtig (`sql`-Template in orders)?
140. Was ist CSRF und wie viel Schutz bietet `sameSite: 'lax'` für unsere JSON-POST-APIs?
141. Warum werden alle Nutzereingaben serverseitig validiert, obwohl das Frontend schon validiert?
142. Der Server vertraut dem Client an KEINER Stelle bei Preisen/Rabatten/Beständen. Nenne drei konkrete Codestellen, die das zeigen.
143. Welche Angriffsfläche hätte ein Coupon-Code als Query-Parameter statt im POST-Body?
144. Warum ist `crypto.randomUUID()` bzw. `crypto.getRandomValues()` für Tokens okay, `Math.random()` aber nicht?
145. Was würde passieren, wenn `JWT_SECRET` geleakt würde? Was könnte ein Angreifer tun, was nicht?
146. Warum speichert das Projekt Passwörter nie im Klartext — und wieso hilft das auch, wenn die DB gestohlen wird?
147. Welche Header setzt `order-confirmed.astro` und warum (`no-store`)?
148. Was ist der Unterschied zwischen Authentifizierung und Autorisierung? Gib je ein Beispiel aus dem Projekt.

## Block 10 — „Wo im Code passiert …?" (Suchfragen)

149. Wo wird das `cart_session`-Cookie zum ersten Mal gesetzt (welche lib-Funktion, von wem aufgerufen)?
150. Wo wird entschieden, welche Produkte auf der Startseite in welcher Reihenfolge erscheinen?
151. Wo ist definiert, dass ein Produkt als „Begehrt" gestempelt wird (Bedingung + mind. zwei Vorkommen)?
152. Wo wird die „Signatur" (z.B. „07.411") eines Produkts berechnet und aus welchen Zutaten?
153. Wo steht die einzige Stelle, die `Item.stock` verringert? Wo die einzige, die ihn wieder erhöht?
154. Wo werden verwaiste CartItems (Produkt gelöscht) automatisch entfernt?
155. Wo wird die deutsche Datumszeile im Seitenkopf („DONNERSTAG, 2. JULI …") erzeugt?
156. Wo wird die römische Ausgaben-Nummer berechnet und wie funktioniert `toRoman` grob?
157. Wo werden die Firmendaten (Impressum, E-Mail etc.) zentral verwaltet und woher kommen die Werte?
158. Wo ist das HTML der Bestell-E-Mail definiert und von wo wird es mit welchen Daten aufgerufen?
159. Wo prüft das Projekt, ob eine Produkt-ID in der URL eine gültige positive Ganzzahl ist (zwei Stellen)?
160. Wo wird der 404-Fall der Produktseite behandelt und mit welchem Statuscode?
161. Wo findet der Wishlist-Merge beim Login statt und wie werden Duplikate vermieden?
162. Wo ist das Newsletter-Formular-Handling implementiert und warum funktioniert EIN Handler für mehrere Formulare?
163. Wo wird `window.toast` definiert und wo wird es überall aufgerufen (mind. drei Dateien)?
164. Wo steht die Logik „Reveal beim Scrollen" (IntersectionObserver) und was macht sie?
165. Wo wird die Suche implementiert — welcher Query-Parameter, welche DB-Operatoren, welches Längen-Cap?
166. Wo wird verhindert, dass eine Seite `/checkout` mit leerem Warenkorb angezeigt wird?
167. Wo werden „Zuletzt angesehen"-Produkte gespeichert (Client oder Server?) und welcher Endpoint liefert die Daten nach?
168. Wo wird das OpenGraph-Bild und der Canonical-Link gesetzt und wie entsteht der volle Titel einer Seite?

## Block 11 — Unterschiede & Missverständnisse („X vs. Y")

169. `Cart.couponCode` vs. `Order.couponCode` — warum existieren beide und was ist der Unterschied im Lebenszyklus?
170. `sessionId` (Cart) vs. JWT (Auth) — zwei „Sessions"? Grenze die Konzepte sauber ab.
171. Hashing vs. Verschlüsselung — warum wird das Passwort gehasht und nicht verschlüsselt?
172. bcrypt vs. SHA-256 — warum das eine für Passwörter, das andere für Reset-Tokens?
173. `401 Unauthorized` vs. `403 Forbidden` vs. unser `404` bei fremden Cart-Items — was wäre semantisch korrekt und warum ist 404 hier trotzdem vertretbar?
174. Astro-`<script>` vs. `<script is:inline>` — was ist der Unterschied (Bundling, TypeScript)?
175. `Astro.cookies` (Server) vs. `document.cookie` (Browser) — warum sieht der Browser das `auth_token` nicht?
176. Solid.js `createSignal` vs. React `useState` — was ist konzeptionell anders (Re-Render vs. feingranulare Updates)?
177. `db.select().where(...)` vs. `Array.filter()` nach dem Laden — warum ist Ersteres besser?
178. Snapshot (OrderItem.priceSnapshot) vs. Normalisierung (itemId-Referenz) — wann will man was?
179. `validateCoupon` vs. `resolveDiscount` vs. `computeDiscount` — wer ruft wen und warum drei Funktionen?
180. Rate-Limiting vs. Authentifizierung — warum schützt das eine nicht vor dem anderen?
181. `jsonOk`/`jsonError` vs. rohes `new Response(JSON.stringify(...))` — was war das konkrete Problem vor dem Refactoring?
182. Optimistic UI (Stock lokal reduzieren) vs. Server-Wahrheit — warum reduziert `AddToCart` den angezeigten Bestand bewusst NICHT lokal?
183. `git mv` vs. Datei löschen + neu anlegen — warum ist Ersteres bei `AddToChart.tsx → AddToCart.tsx` besser gewesen?
184. Unique-Constraint in der DB vs. Existenz-Check im Code (`register.ts` macht beides) — warum reicht der Code-Check allein nicht?

## Block 12 — Crazy Shit (Transfer, Edge Cases, Design-Verteidigung)

185. Zwei Browser-Tabs, gleicher Gast: In Tab A wird das letzte Exemplar bestellt, in Tab B liegt es noch im Warenkorb. Was passiert, wenn Tab B jetzt auch bestellt? Gehe den Code durch.
186. Ein Nutzer fordert einen Reset-Link an, ändert dann aber normal nichts, und ein Angreifer errät die URL-Struktur `/reset-password?token=...`. Warum ist Brute-Force auf den Token aussichtslos? (Rechne grob: 32 Bytes Entropie.)
187. Der Admin löscht ein Produkt, das in 50 Warenkörben und 200 alten Bestellungen liegt. Was zeigt der Warenkorb, was zeigt die Bestellhistorie — und warum unterscheiden sie sich?
188. Zwei Bestellungen kommen in derselben Millisekunde an. Spiele durch, was mit Bordereau-Nummer UND Stock passiert — welche der beiden Mechanismen greift wo?
189. Der Server stürzt exakt zwischen `reserveStock` und dem Order-Insert ab. Beschreibe den inkonsistenten Zustand, warum ihn niemand bemerkt, und zwei Wege, ihn zu erkennen/beheben.
190. Jemand schickt `{"quantity": 1e100}` an `cart/add`. Welche Prüfung fängt das ab und warum?
191. Jemand schickt `quantity: "5"` (String statt Zahl). Geht das durch? Verfolge den Weg durch `Number()` und `Number.isInteger()`.
192. Was passiert bei `quantity: -3`? Und bei `0.5`? Welche Zeile stoppt was?
193. Der Prof sagt: „Euer Rate-Limiter ist nutzlos, ich starte einfach den Server neu." Wie antwortest du (Trade-off verteidigen)?
194. Der Prof sagt: „JWT im Cookie ist Unsinn, nehmt doch Server-Sessions." Nenne je zwei Vor- und Nachteile beider Ansätze.
195. Der Prof sagt: „Warum Astro? Hättet ihr das nicht einfach mit Express + EJS bauen können?" Verteidige die Wahl — und nenne ehrlich, was Express einfacher gemacht hätte.
196. Wie würdest du das Projekt clusterfähig machen (2+ Server-Instanzen)? Nenne die DREI Stellen, die dann brechen (Rate-Limit, …).
197. Wie würdest du Bezahlung (z.B. Stripe) integrieren — an welcher Stelle des Order-Flows und warum genau dort (vor/nach Stock-Reservierung)?
198. Ein Kunde behauptet, er habe 3 Artikel bestellt, die Bestätigungsseite zeige aber nur 2. Wie debuggst du das — welche Tabellen, welche Logs, welche Codepfade?
199. Was müsste sich ändern, damit eingeloste Gutscheine pro NUTZER limitiert sind (nicht global)? Skizziere Schema- und Code-Änderung.
200. Die Meta-Frage: Welche drei Design-Entscheidungen des Projekts würdest du heute anders treffen — und warum ist „bewusst dagegen entschieden und dokumentiert" trotzdem eine legitime Antwort?

---

*Erstellt mit Hilfe von Claude (Anthropic) zur Abnahme-Vorbereitung. Stand: 2026-07-02, Commit b50c6b9.*
