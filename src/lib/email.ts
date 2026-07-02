// =====================================================================
// lib/email.ts — HTML-Templates für Transaktions-Mails
// =====================================================================
// - renderOrderEmail:         Bestellbestätigung (Anbieter + Kunde)
// - renderPasswordResetEmail: "Passwort vergessen"-Link
//
// Vorher lag das Order-Template als ~90-Zeilen-String mitten im
// Order-Endpoint (api/orders/index.ts). Hier ausgelagert: die Endpoints
// bleiben lesbar, die Templates sind isoliert änder- und testbar.
//
// Diese Datei wurde mit Hilfe von Claude (Anthropic) erstellt.
// =====================================================================

export type OrderEmailLine = {
  name: string;
  quantity: number;
  price: number;   // Einzelpreis (Snapshot)
};

export type OrderEmailData = {
  bordereauNr: string;
  lines: OrderEmailLine[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  shippingCost: number;
  total: number;
};

/**
 * Rendert die Bestell-Mail im Zeitungs-Look des Shops.
 * `heading`/`intro` unterscheiden Anbieter- und Kunden-Variante.
 */
export function renderOrderEmail(heading: string, intro: string, data: OrderEmailData): string {
  const { bordereauNr, lines, subtotal, discount, couponCode, shippingCost, total } = data;

  const itemRows = lines.map((line) => `
    <tr>
      <td style="padding:10px 0; border-bottom:1px solid #e3d9c2; font-family:Lora,Georgia,serif;">${line.name}</td>
      <td style="padding:10px 0; border-bottom:1px solid #e3d9c2; text-align:center; font-family:monospace; font-size:.85rem;">× ${line.quantity}</td>
      <td style="padding:10px 0; border-bottom:1px solid #e3d9c2; text-align:right; font-family:'Playfair Display',Georgia,serif; font-weight:700;">${(line.price * line.quantity).toFixed(2)} €</td>
    </tr>
  `).join('');

  return `
    <div style="font-family:'Lora',Georgia,serif; max-width:600px; margin:0 auto; padding:2rem; background:#f3ede1; color:#1a1612;">
      <div style="border-bottom:1px solid #1a1612; padding-bottom:1rem; text-align:center; margin-bottom:2rem;">
        <h1 style="font-family:'Playfair Display',Georgia,serif; font-size:2rem; font-weight:800; margin:0;">The Ordinary Emporium</h1>
        <p style="font-style:italic; color:#4a423a; font-size:.9rem; margin:.5rem 0 0;">Das Wochenblatt für vollkommen belanglose Gegenstände.</p>
      </div>
      <p style="font-family:monospace; font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; color:#7a1f1f; margin:0 0 .5rem;">${heading}</p>
      <h2 style="font-family:'Playfair Display',Georgia,serif; font-size:1.6rem; font-weight:800; margin:0 0 .5rem;">${intro}</h2>
      <p style="font-family:monospace; font-size:.78rem; color:#7a6f5f; margin:0 0 1.5rem;">Bordereau ${bordereauNr}</p>
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left; font-family:monospace; font-size:.7rem; letter-spacing:.12em; text-transform:uppercase; color:#7a6f5f; padding-bottom:8px; border-bottom:1px solid #1a1612;">Artikel</th>
            <th style="text-align:center; font-family:monospace; font-size:.7rem; letter-spacing:.12em; text-transform:uppercase; color:#7a6f5f; padding-bottom:8px; border-bottom:1px solid #1a1612;">Menge</th>
            <th style="text-align:right; font-family:monospace; font-size:.7rem; letter-spacing:.12em; text-transform:uppercase; color:#7a6f5f; padding-bottom:8px; border-bottom:1px solid #1a1612;">Summe</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="margin-top:1.5rem; padding-top:1rem; border-top:1px solid #1a1612;">
        <div style="display:flex; justify-content:space-between; padding:.3rem 0;">
          <span style="color:#7a6f5f;">Zwischensumme</span>
          <span>${subtotal.toFixed(2)} €</span>
        </div>
        ${discount > 0 ? `
        <div style="display:flex; justify-content:space-between; padding:.3rem 0;">
          <span style="color:#7a6f5f;">Gutschein${couponCode ? ` (${couponCode})` : ''}</span>
          <span style="color:#7a1f1f;">−${discount.toFixed(2)} €</span>
        </div>` : ''}
        <div style="display:flex; justify-content:space-between; padding:.3rem 0;">
          <span style="color:#7a6f5f;">Versand</span>
          <span>${shippingCost.toFixed(2)} €</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:.6rem 0 0; font-weight:700;">
          <span>Gesamt</span>
          <span style="font-family:'Playfair Display',Georgia,serif; font-size:1.4rem;">${total.toFixed(2)} €</span>
        </div>
      </div>
      <p style="font-family:monospace; font-size:.72rem; letter-spacing:.1em; text-transform:uppercase; color:#7a6f5f; margin:2rem 0 0; text-align:center;">
        © ${new Date().getFullYear()} The Ordinary Emporium
      </p>
    </div>
  `;
}

/**
 * Rendert die "Passwort vergessen"-Mail mit dem Reset-Link.
 * Der Link enthält den Klartext-Token — die Mail ist damit der
 * einzige Ort, an dem er existiert (DB speichert nur den Hash).
 */
export function renderPasswordResetEmail(resetUrl: string, ttlMinutes: number): string {
  return `
    <div style="font-family:'Lora',Georgia,serif; max-width:600px; margin:0 auto; padding:2rem; background:#f3ede1; color:#1a1612;">
      <div style="border-bottom:1px solid #1a1612; padding-bottom:1rem; text-align:center; margin-bottom:2rem;">
        <h1 style="font-family:'Playfair Display',Georgia,serif; font-size:2rem; font-weight:800; margin:0;">The Ordinary Emporium</h1>
        <p style="font-style:italic; color:#4a423a; font-size:.9rem; margin:.5rem 0 0;">Das Wochenblatt für vollkommen belanglose Gegenstände.</p>
      </div>

      <p style="font-family:monospace; font-size:.72rem; letter-spacing:.12em; text-transform:uppercase; color:#7a1f1f; margin:0 0 .5rem;">Kennwort-Angelegenheit</p>
      <h2 style="font-family:'Playfair Display',Georgia,serif; font-size:1.6rem; font-weight:800; margin:0 0 1rem;">
        Vergessen. <em style="font-style:italic;">Kommt vor.</em>
      </h2>

      <p style="line-height:1.7; color:#4a423a; margin:0 0 1.5rem;">
        Für Ihr Konto wurde das Zurücksetzen des Passworts beantragt.
        Falls Sie das waren, folgen Sie in gebotener Ruhe diesem Link:
      </p>

      <p style="text-align:center; margin:0 0 1.5rem;">
        <a href="${resetUrl}" style="display:inline-block; background:#1a1612; color:#f3ede1; padding:0.9rem 1.6rem; font-family:monospace; font-size:.8rem; letter-spacing:.12em; text-transform:uppercase; text-decoration:none;">Neues Passwort vergeben →</a>
      </p>

      <div style="background:#ece4d3; border-left:3px solid #c8961d; padding:1rem 1.2rem; margin:0 0 1.5rem;">
        <p style="font-style:italic; margin:0; color:#4a423a; line-height:1.55;">
          Der Link ist ${ttlMinutes} Minuten gültig und genau einmal verwendbar.
          Danach müssten Sie erneut vergessen.
        </p>
      </div>

      <p style="font-family:monospace; font-size:.85rem; color:#7a6f5f; margin:0; line-height:1.6;">
        Falls Sie das nicht beantragt haben, ignorieren Sie diese Nachricht —
        Ihr Passwort bleibt dann unverändert. Es geschieht: nichts.
      </p>

      <p style="font-family:monospace; font-size:.72rem; letter-spacing:.1em; text-transform:uppercase; color:#7a6f5f; margin:2rem 0 0; text-align:center; border-top:1px solid #d3cab3; padding-top:1.5rem;">
        © ${new Date().getFullYear()} The Ordinary Emporium
      </p>
    </div>
  `;
}
