// =====================================================================
// lib/rateLimit.ts — Einfacher In-Memory-Rate-Limiter
// =====================================================================
// Sliding-Window-Algorithmus pro Schlüssel (z.B. IP-Adresse).
//
// Funktionsweise:
//   - Pro Schlüssel speichern wir die Zeitstempel der letzten Versuche
//   - Bei jedem Aufruf werden Einträge älter als das Fenster verworfen
//   - Wenn nach dem Aufräumen weniger als das Limit übrig ist, gilt
//     der Versuch als erlaubt
//
// Limits dieser Implementation:
//   - In-Memory → bei Server-Neustart geht der Zustand verloren
//   - Nicht clusterfähig → bei mehreren Instanzen muss man Redis o.ä. nehmen
//   - Für ein Demo-Projekt aber völlig ausreichend
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.
// =====================================================================

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

// Aufräum-Schleife: einmal pro Minute alte/leere Buckets entsorgen
// (verhindert unbegrenzten Speicherverbrauch).
const CLEANUP_INTERVAL_MS = 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    // Wenn alle Timestamps älter als 1 Stunde sind: weg damit
    if (bucket.timestamps.every(t => now - t > 3600_000)) {
      buckets.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Prüft, ob ein neuer Versuch erlaubt ist, und registriert ihn ggf.
 *
 * @param key          Eindeutiger Schlüssel (z. B. IP oder IP+Route)
 * @param maxAttempts  Anzahl erlaubter Versuche im Zeitfenster
 * @param windowMs     Länge des Zeitfensters in Millisekunden
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  // Alte Timestamps verwerfen
  bucket.timestamps = bucket.timestamps.filter(t => t > cutoff);

  if (bucket.timestamps.length >= maxAttempts) {
    // Blockiert. Wann darf der Nutzer wieder?
    const oldest = bucket.timestamps[0];
    const retryAfterMs = (oldest + windowMs) - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.ceil(retryAfterMs / 1000),
    };
  }

  bucket.timestamps.push(now);
  return {
    allowed: true,
    remaining: maxAttempts - bucket.timestamps.length,
    retryAfterSec: 0,
  };
}

/**
 * Extrahiert die Client-IP aus den Request-Headern.
 * Berücksichtigt Reverse-Proxy-Header (X-Forwarded-For),
 * fällt zurück auf 'unknown' wenn nichts vorhanden.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // X-Forwarded-For kann mehrere IPs enthalten ("client, proxy1, proxy2")
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}
