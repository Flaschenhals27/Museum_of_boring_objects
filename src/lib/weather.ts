// =====================================================================
// lib/weather.ts — echtes Wetter für die Top-Banner-Zeile
// =====================================================================
// Holt die aktuelle Temperatur + Wetterlage von Open-Meteo (kostenlos,
// kein API-Key) für den Standort aus der .env (IMPRESSUM_MAP_MARKER_LAT/
// LNG — dieselben Koordinaten wie die Karte auf der Kontaktseite).
//
// Die Wetterlage wird als WMO-Code geliefert und hier in redaktionell
// angemessene Missmutigkeit übersetzt ("SONNIG. VIEL ZU GRELL.").
//
// Cache: In-Memory mit 15 Minuten TTL — das Banner ist auf JEDER Seite,
// ohne Cache würde jeder Seitenaufruf die API treffen. Schlägt der
// Abruf fehl, wird der letzte bekannte Wert weiterverwendet (stale),
// notfalls null — das Layout zeigt dann einen Fallback-Text.
// Gleiche bewusste Grenze wie lib/rateLimit: nicht clusterfähig.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.
// =====================================================================

import { company } from './company';

export type Weather = {
  temp: number;    // gerundet, °C
  label: string;   // z.B. "BEDECKT. ANGEMESSEN."
};

const CACHE_TTL_MS   = 15 * 60 * 1000;  // 15 Minuten
const FETCH_TIMEOUT_MS = 3000;          // Banner darf den Seitenaufbau nicht aufhalten

let cache: { data: Weather; fetchedAt: number } | null = null;
let pending: Promise<Weather | null> | null = null;

/**
 * Übersetzt WMO-Wettercode + Temperatur in die Haus-Tonalität.
 * Extreme Temperaturen überstimmen die Wetterlage.
 * Codes: https://open-meteo.com/en/docs (WMO Weather interpretation)
 */
function describeWeather(code: number, temp: number): string {
  if (temp >= 30) return 'VIEL ZU HEISS.';
  if (temp <= -5) return 'VIEL ZU KALT.';

  if (code === 0)               return temp >= 25 ? 'SONNIG. VIEL ZU HEISS.' : 'SONNIG. VIEL ZU GRELL.';
  if (code === 1)               return 'ÜBERWIEGEND KLAR. NOCH.';
  if (code === 2)               return 'TEILS BEWÖLKT. UNENTSCHLOSSEN.';
  if (code === 3)               return 'BEDECKT. ANGEMESSEN.';
  if (code === 45 || code === 48) return 'NEBEL. MAN SIEHT NICHTS. AUCH GUT.';
  if (code >= 51 && code <= 57) return 'NIESELREGEN. NATÜRLICH.';
  if (code >= 61 && code <= 67) return 'REGEN, WIE ERWARTET.';
  if (code >= 71 && code <= 77) return 'SCHNEE. GEHT AUCH WIEDER WEG.';
  if (code >= 80 && code <= 82) return 'SCHAUER, WIEDERHOLT.';
  if (code === 85 || code === 86) return 'SCHNEESCHAUER. NUN GUT.';
  if (code >= 95)               return 'GEWITTER. IMMERHIN ABWECHSLUNG.';
  return 'WETTER: VORHANDEN.';
}

/** Der eigentliche API-Abruf — von getWeather() gecacht aufgerufen. */
async function fetchWeather(): Promise<Weather | null> {
  const lat = parseFloat(company.markerLat);
  const lng = parseFloat(company.markerLng);
  if (isNaN(lat) || isNaN(lng)) return null;

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,weather_code`;

  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) return null;

  const data = await res.json();
  const temp = Math.round(data?.current?.temperature_2m);
  const code = Number(data?.current?.weather_code);
  if (isNaN(temp) || isNaN(code)) return null;

  return { temp, label: describeWeather(code, temp) };
}

/**
 * Aktuelles Wetter, gecacht. Gibt bei API-Problemen den letzten
 * bekannten Wert zurück (auch wenn abgelaufen) — oder null, wenn es
 * noch nie einen gab. Parallele Seitenaufrufe teilen sich denselben
 * laufenden Request (pending), statt die API mehrfach zu treffen.
 */
export async function getWeather(): Promise<Weather | null> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  if (!pending) {
    pending = fetchWeather()
      .catch(() => null)
      .finally(() => { pending = null; });
  }

  const fresh = await pending;
  if (fresh) {
    cache = { data: fresh, fetchedAt: now };
    return fresh;
  }
  // Fehlschlag: lieber veraltetes Wetter als gar keins
  return cache?.data ?? null;
}
