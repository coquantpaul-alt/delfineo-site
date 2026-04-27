/**
 * Delfineo Auth Worker — magic-link login
 * ────────────────────────────────────────
 * Endpoints (all under /api/auth/*):
 *   POST   /api/auth/request   { email, redirectTo? }  → 202 { ok:true, alreadyMember }
 *   GET    /api/auth/verify?token=...&next=...         → 302 to next URL + session cookie
 *   GET    /api/auth/me                                → { email, tier, isSubscriber } or 401
 *   POST   /api/auth/logout                            → 204 + clears cookie
 *
 *   GET    /api/auth/saved                             → { items: [{ slug, savedAt }] } | 401
 *   POST   /api/auth/saved   { slug, savedAt? }        → { ok: true, savedAt } | 401
 *   DELETE /api/auth/saved   { slug }                  → { ok: true } | 401
 *
 * Required bindings (wrangler.toml):
 *   [[d1_databases]]
 *     binding = "DB"                      — D1 database
 *
 * Required secrets (set via `npx wrangler secret put NAME`):
 *   AUTH_SECRET          — 32+ random chars, used to sign session cookies
 *   RESEND_API_KEY       — from https://resend.com/api-keys
 *   BUTTONDOWN_API_KEY   — (optional) syncs new users to newsletter list
 *   AUTH_FROM_EMAIL      — e.g. "Delfineo <auth@delfineo.com>"
 *   AUTH_SITE_URL        — e.g. "https://delfineo.com" (no trailing slash)
 *
 * Cookie: __Secure-delf_sess  (HttpOnly, Secure, SameSite=Lax, Path=/, Domain=delfineo.com)
 *   Format: <sessionId>.<hmac-sha256(sessionId, AUTH_SECRET)>
 *   Domain=delfineo.com so the cookie covers BOTH delfineo.com AND
 *   www.delfineo.com — without it, the apex and www hosts get
 *   independent sessions and the user appears signed out when their
 *   browser jumps between the two.
 */

const COOKIE_NAME   = '__Secure-delf_sess';
const COOKIE_DOMAIN = 'delfineo.com';
const MAGIC_TTL_MIN = 15;
const SESSION_TTL_D = 30;
const RATE_LIMIT_S  = 60;

// ─── tiny helpers ───────────────────────────────────────────────
function now()     { return Math.floor(Date.now() / 1000); }
function uuid()    { return crypto.randomUUID(); }
function rand32()  {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return b64url(b);
}
function b64url(bytes) {
  const s = btoa(String.fromCharCode(...bytes));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function isEmail(e) { return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function normEmail(e) { return String(e).trim().toLowerCase(); }

async function hmacSign(msg, secret) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(msg));
  return b64url(new Uint8Array(sig));
}

async function signCookie(sessId, secret) {
  const sig = await hmacSign(sessId, secret);
  return `${sessId}.${sig}`;
}
async function verifyCookie(value, secret) {
  if (!value || !value.includes('.')) return null;
  const [sessId, sig] = value.split('.');
  if (!sessId || !sig) return null;
  const expected = await hmacSign(sessId, secret);
  // constant-time-ish compare
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? sessId : null;
}

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

// ─── email + newsletter ────────────────────────────────────────
async function sendMagicEmail(env, email, link) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.AUTH_FROM_EMAIL,
      to: [email],
      subject: 'Sign in to Delfineo',
      html: `
<!doctype html>
<html><body style="font-family:Georgia,serif;background:#f6f3ea;margin:0;padding:40px 20px;color:#0e1726;">
  <div style="max-width:520px;margin:0 auto;background:#fcfbf7;padding:40px 36px;border:1px solid rgba(14,23,38,0.08);">
    <div style="font-family:'Playfair Display',Georgia,serif;font-size:24px;letter-spacing:0.22em;color:#0A2540;text-align:center;margin-bottom:28px;">DELFINEO</div>
    <p style="font-size:16px;line-height:1.55;color:#0e1726;margin:0 0 18px;">Click the link below to sign in. This link is valid for ${MAGIC_TTL_MIN} minutes and can only be used once.</p>
    <p style="text-align:center;margin:28px 0 32px;">
      <a href="${link}" style="background:#0A2540;color:#f3ead2;padding:12px 28px;text-decoration:none;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;">Sign in</a>
    </p>
    <p style="font-size:13px;line-height:1.55;color:rgba(14,23,38,0.55);margin:0 0 6px;">Or copy this URL into your browser:</p>
    <p style="font-size:12px;word-break:break-all;color:rgba(14,23,38,0.72);margin:0 0 24px;">${link}</p>
    <p style="font-size:12px;line-height:1.5;color:rgba(14,23,38,0.55);border-top:1px solid rgba(14,23,38,0.08);padding-top:16px;margin:24px 0 0;">If you didn't request this, you can ignore this email.</p>
  </div>
</body></html>`,
      text: `Sign in to Delfineo\n\nOpen this link (valid ${MAGIC_TTL_MIN} min, single-use):\n${link}\n\nIf you didn't request this, ignore this email.`,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

async function syncToButtondown(env, email) {
  if (!env.BUTTONDOWN_API_KEY) return;
  try {
    await fetch('https://api.buttondown.email/v1/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${env.BUTTONDOWN_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, type: 'regular' }),
    });
    // Silently ignore 400 "already subscribed" — we don't care.
  } catch (_) {
    // Newsletter sync failure should not block login.
  }
}

// ─── endpoints ─────────────────────────────────────────────────
async function handleRequest(request, env) {
  const { email, redirectTo } = await request.json().catch(() => ({}));
  if (!isEmail(email)) return json({ status: 'error', message: 'Invalid email' }, 400);

  const addr = normEmail(email);

  // Rate-limit: one magic link per email per RATE_LIMIT_S seconds
  const recent = await env.DB.prepare(
    'SELECT MAX(created_at) AS t FROM magic_links WHERE email = ?'
  ).bind(addr).first();
  if (recent && recent.t && (now() - recent.t) < RATE_LIMIT_S) {
    return json({ status: 'error', message: 'Please wait a minute before requesting another link.' }, 429);
  }

  const token      = rand32();
  const created    = now();
  const expires    = created + MAGIC_TTL_MIN * 60;
  const nextPath   = typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : null;

  await env.DB.prepare(
    'INSERT INTO magic_links (token, email, created_at, expires_at, redirect_to) VALUES (?,?,?,?,?)'
  ).bind(token, addr, created, expires, nextPath).run();

  const link = `${env.AUTH_SITE_URL}/api/auth/verify?token=${encodeURIComponent(token)}`;

  // Send magic email + sync to Buttondown in parallel
  await Promise.all([
    sendMagicEmail(env, addr, link),
    syncToButtondown(env, addr),
  ]);

  // Tell the client whether this email is a returning user (UX copy)
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(addr).first();

  return json({ ok: true, alreadyMember: !!existing });
}

async function handleVerify(request, env, url) {
  const token = url.searchParams.get('token');
  if (!token) return new Response('Missing token', { status: 400 });

  const link = await env.DB.prepare(
    'SELECT email, expires_at, used_at, redirect_to FROM magic_links WHERE token = ?'
  ).bind(token).first();

  if (!link)                   return new Response('Invalid or expired link', { status: 400 });
  if (link.used_at)            return new Response('This link has already been used. Request a new one.', { status: 400 });
  if (link.expires_at < now()) return new Response('This link has expired. Request a new one.', { status: 400 });

  const email = normEmail(link.email);
  const t = now();

  // Upsert user
  let user = await env.DB.prepare('SELECT id, tier FROM users WHERE email = ?').bind(email).first();
  if (!user) {
    const uid = uuid();
    await env.DB.prepare(
      'INSERT INTO users (id, email, tier, is_subscriber, created_at, last_login_at) VALUES (?,?,?,?,?,?)'
    ).bind(uid, email, 'free', 1, t, t).run();
    user = { id: uid, tier: 'free' };
  } else {
    await env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(t, user.id).run();
  }

  // Mark the magic link as used
  await env.DB.prepare('UPDATE magic_links SET used_at = ? WHERE token = ?').bind(t, token).run();

  // Create session
  const sessId = rand32();
  const exp    = t + SESSION_TTL_D * 86400;
  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?,?,?,?)'
  ).bind(sessId, user.id, t, exp).run();

  const cookie = await signCookie(sessId, env.AUTH_SECRET);
  const next   = link.redirect_to || '/';

  return new Response(null, {
    status: 302,
    headers: {
      'Location': next,
      'Set-Cookie': `${COOKIE_NAME}=${cookie}; HttpOnly; Secure; SameSite=Lax; Path=/; Domain=${COOKIE_DOMAIN}; Max-Age=${SESSION_TTL_D * 86400}`,
    },
  });
}

async function readSession(request, env) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.split(/;\s*/).find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  const value = decodeURIComponent(match.slice(COOKIE_NAME.length + 1));
  const sessId = await verifyCookie(value, env.AUTH_SECRET);
  if (!sessId) return null;
  const row = await env.DB.prepare(
    'SELECT s.id AS sid, s.expires_at, u.id AS uid, u.email, u.tier, u.is_subscriber FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ?'
  ).bind(sessId).first();
  if (!row || row.expires_at < now()) return null;
  return row;
}

async function handleMe(request, env) {
  const sess = await readSession(request, env);
  if (!sess) return json({ status: 'anon' }, 401);
  return json({
    status: 'ok',
    email: sess.email,
    tier: sess.tier,
    isSubscriber: !!sess.is_subscriber,
  });
}

// ─── saved articles ────────────────────────────────────────────
function isSlug(s) {
  // Slug shape: 8-digit date prefix, then "-NN-" then kebab body.
  // Allow lowercase alphanumeric + hyphens, max 128 chars.
  return typeof s === 'string' && /^[a-z0-9][a-z0-9-]{0,127}$/.test(s);
}

async function handleSavedList(request, env) {
  const sess = await readSession(request, env);
  if (!sess) return json({ status: 'anon' }, 401);
  const rows = await env.DB.prepare(
    'SELECT slug, saved_at AS savedAt FROM saved_articles WHERE user_id = ? ORDER BY saved_at DESC'
  ).bind(sess.uid).all();
  return json({ status: 'ok', items: rows.results || [] });
}

async function handleSavedAdd(request, env) {
  const sess = await readSession(request, env);
  if (!sess) return json({ status: 'anon' }, 401);
  const body = await request.json().catch(() => ({}));
  const slug = body && body.slug;
  if (!isSlug(slug)) return json({ status: 'error', message: 'Invalid slug' }, 400);
  const incoming = Number(body && body.savedAt);
  // Trust the client's savedAt if it's a sane recent timestamp,
  // otherwise stamp server-side. Reject far-future timestamps.
  const serverNow = Date.now();
  const savedAt =
    Number.isFinite(incoming) && incoming > 0 && incoming <= serverNow + 60_000
      ? Math.floor(incoming)
      : serverNow;
  await env.DB.prepare(
    'INSERT INTO saved_articles (user_id, slug, saved_at) VALUES (?,?,?) ' +
    'ON CONFLICT (user_id, slug) DO UPDATE SET saved_at = excluded.saved_at'
  ).bind(sess.uid, slug, savedAt).run();
  return json({ status: 'ok', savedAt });
}

async function handleSavedRemove(request, env) {
  const sess = await readSession(request, env);
  if (!sess) return json({ status: 'anon' }, 401);
  const body = await request.json().catch(() => ({}));
  const slug = body && body.slug;
  if (!isSlug(slug)) return json({ status: 'error', message: 'Invalid slug' }, 400);
  await env.DB.prepare(
    'DELETE FROM saved_articles WHERE user_id = ? AND slug = ?'
  ).bind(sess.uid, slug).run();
  return json({ status: 'ok' });
}

async function handleLogout(request, env) {
  const sess = await readSession(request, env);
  if (sess) {
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sess.sid).run();
  }
  return new Response(null, {
    status: 204,
    headers: {
      'Set-Cookie': `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Domain=${COOKIE_DOMAIN}; Max-Age=0`,
    },
  });
}

// ─── router ───────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url    = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const allow  = origin === env.AUTH_SITE_URL ? origin : '';
    const corsH  = cors(allow);

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsH });

    try {
      if (url.pathname === '/api/auth/request' && request.method === 'POST') {
        const r = await handleRequest(request, env);
        Object.entries(corsH).forEach(([k, v]) => r.headers.set(k, v));
        return r;
      }
      if (url.pathname === '/api/auth/verify' && request.method === 'GET') {
        return await handleVerify(request, env, url);
      }
      if (url.pathname === '/api/auth/me' && request.method === 'GET') {
        const r = await handleMe(request, env);
        Object.entries(corsH).forEach(([k, v]) => r.headers.set(k, v));
        return r;
      }
      if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
        const r = await handleLogout(request, env);
        Object.entries(corsH).forEach(([k, v]) => r.headers.set(k, v));
        return r;
      }
      if (url.pathname === '/api/auth/saved' && request.method === 'GET') {
        const r = await handleSavedList(request, env);
        Object.entries(corsH).forEach(([k, v]) => r.headers.set(k, v));
        return r;
      }
      if (url.pathname === '/api/auth/saved' && request.method === 'POST') {
        const r = await handleSavedAdd(request, env);
        Object.entries(corsH).forEach(([k, v]) => r.headers.set(k, v));
        return r;
      }
      if (url.pathname === '/api/auth/saved' && request.method === 'DELETE') {
        const r = await handleSavedRemove(request, env);
        Object.entries(corsH).forEach(([k, v]) => r.headers.set(k, v));
        return r;
      }
      return new Response('Not found', { status: 404 });
    } catch (e) {
      return json({ status: 'error', message: String(e && e.message || e) }, 500, corsH);
    }
  },
};
