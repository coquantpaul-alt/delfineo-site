// Cloudflare Pages Function: POST /api/contact
// Sends the contact form to CONTACT_TO through Resend.
// Required environment variables (Cloudflare Pages > Settings > Variables and Secrets):
//   RESEND_API_KEY   Resend key with sending access (domain delfineo.com is verified)
//   CONTACT_TO       the inbox that receives the messages
// Optional:
//   CONTACT_FROM     defaults to "Delfineo Partners <contact@delfineo.com>"

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const oneLine = (v) => v.replace(/[\r\n]+/g, ' ');

export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: 'invalid' }, 400);
  }

  // Honeypot: real visitors never fill this field.
  if (data && data.website) return json({ ok: true });

  const name = oneLine(clean(data?.name, 120));
  const email = oneLine(clean(data?.email, 200));
  const company = oneLine(clean(data?.company, 200));
  const subject = oneLine(clean(data?.subject, 200));
  const message = clean(data?.message, 5000);

  if (!name || !message || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ ok: false, error: 'invalid' }, 400);
  }

  if (!env.RESEND_API_KEY || !env.CONTACT_TO) {
    return json({ ok: false, error: 'unavailable' }, 503);
  }

  const text = [
    `Nom / Name: ${name}`,
    `E-mail: ${email}`,
    `Société / Company: ${company || '-'}`,
    `Objet / Subject: ${subject || '-'}`,
    '',
    message,
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM || 'Delfineo Partners <contact@delfineo.com>',
      to: [env.CONTACT_TO],
      reply_to: email,
      subject: `[delfineo.com] ${subject || name}`,
      text,
    }),
  });

  if (!res.ok) return json({ ok: false, error: 'send_failed' }, 502);
  return json({ ok: true });
}

export async function onRequest() {
  return json({ ok: false, error: 'method_not_allowed' }, 405);
}
