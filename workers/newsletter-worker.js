/**
 * Delfineo Daily Newsletter Worker
 * 
 * Runs on a cron trigger at 8pm CET (18:00 UTC in winter, 17:00 UTC in summer).
 * Fetches today's news from a JSON endpoint on the site and sends via Buttondown.
 * 
 * Wrangler config (wrangler.toml):
 *   [triggers]
 *   crons = ["0 18 * * *"]
 * 
 * Environment variables:
 *   BUTTONDOWN_API_KEY = your Buttondown API key
 *   SITE_URL = https://delfineo.com
 */

export default {
  async scheduled(event, env) {
    const today = new Date().toISOString().slice(0, 10); // "2026-04-15"
    
    try {
      // Fetch today's news from a JSON endpoint on your site
      // You'll create this as a static JSON file or API route in Astro
      const res = await fetch(`${env.SITE_URL}/api/news-today.json`);
      if (!res.ok) {
        console.log(`No news found for ${today}`);
        return;
      }
      
      const newsItems = await res.json();
      if (!newsItems || newsItems.length === 0) return;

      // Build the email HTML
      const emailHtml = buildEmailHtml(newsItems, today, env.SITE_URL);
      const emailSubject = `Delfineo Daily — ${formatDate(today)}`;

      // Send via Buttondown
      const sendRes = await fetch('https://api.buttondown.email/v1/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${env.BUTTONDOWN_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: emailSubject,
          body: emailHtml,
          status: 'published', // sends immediately
        }),
      });

      if (sendRes.ok) {
        console.log(`Newsletter sent for ${today} with ${newsItems.length} items`);
      } else {
        console.error(`Failed to send newsletter: ${sendRes.status}`);
      }

    } catch (e) {
      console.error('Newsletter worker error:', e);
    }
  },
};

function formatDate(isoDate) {
  const d = new Date(isoDate + 'T12:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildEmailHtml(items, date, siteUrl) {
  const stories = items.map((item, i) => `
    <tr>
      <td style="padding: 24px 0; ${i < items.length - 1 ? 'border-bottom: 1px solid #e8ecef;' : ''}">
        <p style="font-family: 'Helvetica Neue', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #1a5276; margin: 0 0 8px;">
          ${item.category}
        </p>
        <h3 style="font-family: Georgia, serif; font-size: 18px; font-weight: 700; color: #051c2c; margin: 0 0 10px; line-height: 1.3;">
          ${item.title}
        </h3>
        <p style="font-family: Georgia, serif; font-size: 15px; color: #4a6274; line-height: 1.65; margin: 0 0 16px;">
          ${item.summary}
        </p>
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="border-left: 3px solid #051c2c; padding-left: 16px;">
              <p style="font-family: 'Helvetica Neue', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #051c2c; margin: 0 0 6px;">
                Delfineo's Take
              </p>
              <p style="font-family: Georgia, serif; font-size: 14px; color: #1a3a4f; line-height: 1.7; margin: 0;">
                ${item.insight}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background: #f7f8fa;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f7f8fa;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px; background: #ffffff; border: 1px solid #e8ecef; border-radius: 4px;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 36px 24px; border-bottom: 1px solid #e8ecef;">
              <h1 style="font-family: Georgia, serif; font-size: 22px; font-weight: 700; letter-spacing: 0.04em; color: #051c2c; margin: 0;">
                DELFINEO
              </h1>
              <p style="font-family: 'Helvetica Neue', sans-serif; font-size: 13px; color: #7a8f9e; margin: 6px 0 0;">
                Daily Market Intelligence — ${formatDate(date)}
              </p>
            </td>
          </tr>
          <!-- Stories -->
          <tr>
            <td style="padding: 8px 36px 16px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                ${stories}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; border-top: 1px solid #e8ecef; background: #f7f8fa; border-radius: 0 0 4px 4px;">
              <p style="font-family: 'Helvetica Neue', sans-serif; font-size: 12px; color: #a3b4c0; margin: 0 0 4px;">
                <a href="${siteUrl}" style="color: #1a5276; text-decoration: none;">Read more on delfineo.com</a>
              </p>
              <p style="font-family: 'Helvetica Neue', sans-serif; font-size: 11px; color: #a3b4c0; margin: 0;">
                This is not investment advice. All analysis reflects the author's personal views.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
