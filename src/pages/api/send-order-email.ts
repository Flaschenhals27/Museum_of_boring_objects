import type { APIRoute } from 'astro';
import { Resend } from 'resend';

const resend = new Resend(import.meta.env.RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  const { items, total } = await request.json();

  // Produkt-Liste als HTML aufbauen
  const itemRows = items.map((item: any) => `
    <tr>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.product.name}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: center;">× ${item.quantity}</td>
      <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${(item.product.price * item.quantity).toFixed(2)} €</td>
    </tr>
  `).join('');

  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: import.meta.env.MY_EMAIL, // deine Email aus .env
    subject: '🛒 Neue Bestellung im Ordinary Emporium!',
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 2rem;">
        
        <h1 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">
          🪨 The Ordinary Emporium
        </h1>
        <p style="color: #86866b; margin-bottom: 2rem;">Neue Bestellung eingegangen</p>

        <div style="background: #f5f5f7; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
          <h2 style="font-size: 1rem; font-weight: 600; margin: 0 0 1rem;">Bestellte Artikel</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="text-align: left; font-size: 0.8rem; color: #86866b; padding-bottom: 8px;">Produkt</th>
                <th style="text-align: center; font-size: 0.8rem; color: #86866b; padding-bottom: 8px;">Menge</th>
                <th style="text-align: right; font-size: 0.8rem; color: #86866b; padding-bottom: 8px;">Preis</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>
          <div style="display: flex; justify-content: space-between; margin-top: 1rem; font-weight: 700; font-size: 1.1rem;">
            <span>Gesamt</span>
            <span>${total.toFixed(2)} €</span>
          </div>
        </div>

        <div style="background: #1d1d1f; color: white; border-radius: 12px; padding: 1rem; text-align: center;">
          <p style="margin: 0; font-size: 0.9rem;">💸 Wird von Elon Musk übernommen</p>
        </div>

        <p style="color: #86866b; font-size: 0.8rem; margin-top: 2rem; text-align: center;">
          © ${new Date().getFullYear()} The Ordinary Emporium
        </p>

      </div>
    `,
  });

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};