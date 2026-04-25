# Delfineo auth — one-time setup

This turns the existing "soft" email gate into a real magic-link login system.
Users type their email, get a one-time link, click it, and are signed in
(session cookie, 30 days). Everything runs on Cloudflare's free tier + Resend's
3,000-emails/month free tier. Estimated cost: $0/month at your traffic.

**Estimated time:** 30 minutes. Only done once.

---

## Step 1 — Create a Resend account (for sending the sign-in emails)

1. Go to https://resend.com and sign up (free). Use your delfineo email.
2. In Resend, click **Domains → Add Domain** and enter `delfineo.com`.
3. Resend shows you a list of DNS records (MX, TXT, SPF, DKIM). Log into your
   domain registrar (wherever you bought `delfineo.com`), open the DNS editor
   for that domain, and add each record exactly as Resend shows.
4. Back in Resend, click **Verify** on the domain. Usually completes in 5 min.
   If it stays pending, wait 30 min and try again (DNS propagation).
5. Go to **API Keys → Create API Key**, name it `delfineo-auth`, choose
   **Sending access**, and copy the key that starts with `re_...`. Keep it safe.

---

## Step 2 — Create the D1 database (free Cloudflare SQLite)

Open a **Command Prompt** in the `delfineo` folder. Run:

```
npx wrangler login
```

A browser will open — sign in to your Cloudflare account and authorize.

Then create the database:

```
npx wrangler d1 create delfineo-auth
```

You'll see output like:

```
[[d1_databases]]
binding = "DB"
database_name = "delfineo-auth"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Copy the `database_id` value.** Open `wrangler.toml` and replace
`REPLACE_WITH_ID_FROM_WRANGLER_CREATE` with that ID.

Run the migration to create the tables:

```
npx wrangler d1 execute delfineo-auth --remote --file=workers/migrations/0001_init.sql
```

---

## Step 3 — Set the secrets

Still in Command Prompt, from the `delfineo` folder, run each of these. When
asked for the value, paste it and press Enter. (Nothing shows as you type —
that's normal.)

```
npx wrangler secret put AUTH_SECRET
```
Paste a 32+ character random string. Easiest: run
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
and paste the result.

```
npx wrangler secret put RESEND_API_KEY
```
Paste the `re_...` key from Step 1.

```
npx wrangler secret put AUTH_FROM_EMAIL
```
Paste: `Delfineo <auth@delfineo.com>`

```
npx wrangler secret put AUTH_SITE_URL
```
Paste: `https://delfineo.com`

(Optional, if you want new users auto-subscribed to Buttondown:)

```
npx wrangler secret put BUTTONDOWN_API_KEY
```
Paste your existing Buttondown token.

---

## Step 4 — Wire the route and deploy

Open `wrangler.toml` and uncomment this line by removing the `#`:

```
routes = [{ pattern = "delfineo.com/api/auth/*", zone_name = "delfineo.com" }]
```

Then deploy:

```
npx wrangler deploy
```

You should see: `Uploaded delfineo-auth... Published delfineo-auth...`
and a URL like `https://delfineo.com/api/auth/*`.

---

## Step 5 — Test it

1. Open `https://delfineo.com` in a private/incognito window.
2. Click any research piece (or the "Sign-up / Sign-in" button).
3. Enter your email. You should see "Check your inbox" after 1–2 seconds.
4. Check your inbox for a Delfineo email. Click the button.
5. You should land back on the site signed in, with your email showing in
   the top-right and the padlock icons gone.

If the email doesn't arrive:
- Check your spam folder.
- Check the Resend dashboard → Logs to see if it was sent.
- If Resend says "not sent", the DNS records from Step 1 aren't verified yet.

If clicking the link returns "Invalid or expired link":
- Links expire after 15 minutes.
- Each link is single-use. Request a fresh one.

---

## How to check who's signed up

```
npx wrangler d1 execute delfineo-auth --remote --command="SELECT email, tier, created_at, last_login_at FROM users ORDER BY created_at DESC"
```

## How to revoke all active sessions (force everyone to re-login)

```
npx wrangler d1 execute delfineo-auth --remote --command="DELETE FROM sessions"
```

## Adding a paid tier later

The `users.tier` column is already there. When you wire up Stripe, set
`tier = 'paid'` for paying users and gate content in the page templates
based on that value (delivered by the `/api/auth/me` endpoint in the
`tier` field). No schema migration needed.

---

## Costs at current volume

- Cloudflare Workers: 100,000 requests/day free → plenty.
- Cloudflare D1: 5M reads + 100k writes/day free → plenty.
- Resend: 3,000 emails/month free. Each sign-in is one email. You'd need
  ~100 sign-ins/day to exceed this. Paid plan starts at $20/mo for 50k.
- Buttondown: unchanged from today.

**Total today: $0/month.**
