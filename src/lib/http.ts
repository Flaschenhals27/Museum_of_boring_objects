// =====================================================================
// lib/http.ts — JSON-Response-Helfer für alle API-Routen
// =====================================================================
// Vorher stand `new Response(JSON.stringify(...), { status, headers })`
// dutzendfach in den Routen — teils mit, teils ohne Content-Type-Header.
// Hier zentral, damit jede Antwort denselben Header trägt.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.
// =====================================================================

/** Erfolgs- oder Datenantwort als JSON (Status default 200). */
export function jsonOk(
  data: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

/** Fehlerantwort im einheitlichen Format { error: "..." }. */
export function jsonError(
  error: string,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return jsonOk({ error }, status, extraHeaders);
}
