/**
 * Delfineo Auth Worker
 * 
 * Deploy to Cloudflare Workers. Set these environment variables:
 *   BUTTONDOWN_API_KEY = your Buttondown API key
 * 
 * Routes:
 *   POST /api/auth  { "email": "user@example.com" }
 *   → { "status": "existing" }  (already subscribed)
 *   → { "status": "new" }       (just subscribed)
 *   → { "status": "error", "message": "..." }
 */

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': 'https://delfineo.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return Response.json({ status: 'error', message: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    }

    try {
      const { email } = await request.json();
      
      if (!email || !email.includes('@')) {
        return Response.json({ status: 'error', message: 'Invalid email' }, { status: 400, headers: corsHeaders });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const apiKey = env.BUTTONDOWN_API_KEY;

      // Step 1: Check if subscriber already exists
      const checkRes = await fetch(
        `https://api.buttondown.email/v1/subscribers?email=${encodeURIComponent(normalizedEmail)}`,
        {
          headers: { 'Authorization': `Token ${apiKey}` },
        }
      );

      if (checkRes.ok) {
        const data = await checkRes.json();
        if (data.results && data.results.length > 0) {
          return Response.json({ status: 'existing' }, { headers: corsHeaders });
        }
      }

      // Step 2: Create new subscriber
      const createRes = await fetch('https://api.buttondown.email/v1/subscribers', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          type: 'regular',
        }),
      });

      if (createRes.ok || createRes.status === 201) {
        return Response.json({ status: 'new' }, { headers: corsHeaders });
      }

      // Handle case where subscriber exists but wasn't found (race condition)
      if (createRes.status === 400) {
        const err = await createRes.json();
        if (JSON.stringify(err).includes('already')) {
          return Response.json({ status: 'existing' }, { headers: corsHeaders });
        }
      }

      return Response.json({ status: 'error', message: 'Subscription failed' }, { status: 500, headers: corsHeaders });

    } catch (e) {
      return Response.json({ status: 'error', message: 'Internal error' }, { status: 500, headers: corsHeaders });
    }
  },
};
