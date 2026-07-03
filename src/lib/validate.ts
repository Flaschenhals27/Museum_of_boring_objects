// =====================================================================
// lib/validate.ts — zentrale Eingabe-Validierung (Regex an EINER Stelle)
// =====================================================================
// Vorher war z.B. die E-Mail-Regex 5× im Code dupliziert und Namen wurden
// gar nicht auf ihren Inhalt geprüft ("Max123" kam durch). Hier zentral,
// damit Client (schnelles Feedback) und Server (die Wahrheit) garantiert
// dieselben Regeln anwenden.
//
// Wichtig zu \p{L}: Das ist die Unicode-Klasse "beliebiger Buchstabe" —
// deckt Umlaute (ä ö ü), ß und Akzente (é, ø, ł, …) ab. Nur a-z zu
// erlauben würde "Müller" oder "José" fälschlich ablehnen. Das `u`-Flag
// schaltet den Unicode-Modus ein (nötig für \p{…}).
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.
// =====================================================================

// ---------------------------------------------------------------------
// E-Mail — pragmatisch (kein vollständiger RFC 5322, aber deckt die
// real vorkommenden Adressen ab): etwas@etwas.tld, keine Leerzeichen.
// ---------------------------------------------------------------------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isValidEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value);
}

// ---------------------------------------------------------------------
// Name (Vor-/Nachname) — NUR Buchstaben, dazwischen EIN Trennzeichen
// (Leerzeichen, Bindestrich, gerader ' oder typografischer ' Apostroph).
// Nie am Rand, nie doppelt, KEINE Ziffern oder Sonderzeichen.
//
//   gültig:   "Max", "Müller", "Anna-Lena", "O'Brien", "van der Berg", "José"
//   ungültig: "Max123", "Max-", "M@x", "123", "Max  Mustermann" (Doppelspace)
//
// Aufbau: ein oder mehr Buchstaben, danach beliebig oft
// (ein Trennzeichen + ein oder mehr Buchstaben). Dadurch kann kein
// Trennzeichen am Anfang/Ende stehen und keine zwei hintereinander.
// ---------------------------------------------------------------------
const NAME_RE = /^\p{L}+(?:[ '’-]\p{L}+)*$/u;
export function isValidName(value: string): boolean {
  return value.length >= 1 && value.length <= 64 && NAME_RE.test(value);
}

// ---------------------------------------------------------------------
// Ort — wie Name, zusätzlich Punkt erlaubt ("St. Gallen", "Frankfurt am Main",
// "Villingen-Schwenningen"). Weiterhin keine Ziffern.
// ---------------------------------------------------------------------
const CITY_RE = /^\p{L}+(?:[ .'’-]\p{L}+)*$/u;
export function isValidCity(value: string): boolean {
  return value.length >= 1 && value.length <= 80 && CITY_RE.test(value);
}

// ---------------------------------------------------------------------
// Straße + Hausnummer — hier sind Ziffern nötig (Hausnummer!). Erlaubt:
// Buchstaben, Ziffern, Leerzeichen, Punkt, Bindestrich, Schrägstrich.
// Muss mindestens EINEN Buchstaben enthalten (reine Zahl ist keine Straße).
//
//   gültig:   "Musterstraße 1", "Hauptstr. 12a", "Lindenallee 12-14", "Am Bach 3/2"
//   ungültig: "12345" (keine Buchstaben), "" (leer)
// ---------------------------------------------------------------------
const STREET_RE = /^(?=.*\p{L})[\p{L}\d][\p{L}\d .\/-]*$/u;
export function isValidStreet(value: string): boolean {
  return value.length >= 2 && value.length <= 100 && STREET_RE.test(value);
}

// ---------------------------------------------------------------------
// Deutsche PLZ — genau 5 Ziffern.
// ---------------------------------------------------------------------
const POSTAL_DE_RE = /^\d{5}$/;
export function isValidPostalDE(value: string): boolean {
  return POSTAL_DE_RE.test(value);
}

// ---------------------------------------------------------------------
// Benutzername — bewusst MIT Ziffern (im Gegensatz zum echten Namen):
// 3–32 Zeichen, Buchstaben (a-z, case-insensitiv), Ziffern, _ und -.
// ---------------------------------------------------------------------
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,32}$/;
export function isValidUsername(value: string): boolean {
  return USERNAME_RE.test(value);
}
