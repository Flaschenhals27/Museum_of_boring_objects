// =====================================================================
// lib/company.ts — Firmen-/Impressumsdaten an EINER Stelle
// =====================================================================
// Vorher waren diese Werte (mit identischen Fallbacks) über impressum,
// agb, datenschutz, cookies, contact, shipping und faq dupliziert.
// Hier zentral aus den Umgebungsvariablen gelesen und exportiert —
// Änderung der Firmendaten passiert jetzt nur noch hier.
// =====================================================================

export const company = {
	name:            import.meta.env.IMPRESSUM_NAME             ?? 'The Ordinary Emporium GmbH',
	street:          import.meta.env.IMPRESSUM_STREET           ?? 'Musterstraße 1',
	postal:          import.meta.env.IMPRESSUM_POSTAL           ?? '12345',
	city:            import.meta.env.IMPRESSUM_CITY             ?? 'Musterstadt',
	email:           import.meta.env.IMPRESSUM_EMAIL            ?? 'info@ordinary-emporium.de',
	tel:             import.meta.env.IMPRESSUM_TEL              ?? '+49 000 000000',
	boss:            import.meta.env.IMPRESSUM_BOSS             ?? 'Max Mustermann',
	district:        import.meta.env.IMPRESSUM_DISTRICT         ?? 'Amtsgericht Musterstadt',
	districtAddress: import.meta.env.IMPRESSUM_DISTRICT_ADDRESS ?? 'Musterstraße 1, 12345 Musterstadt',
	vatId:           import.meta.env.IMPRESSUM_VAT_ID           ?? 'DE123456789',
	mapBbox:         import.meta.env.IMPRESSUM_MAP_BBOX         ?? '8.390%2C48.990%2C8.410%2C49.005',
	markerLat:       import.meta.env.IMPRESSUM_MAP_MARKER_LAT   ?? '49.0069',
	markerLng:       import.meta.env.IMPRESSUM_MAP_MARKER_LNG   ?? '8.4037',
};
