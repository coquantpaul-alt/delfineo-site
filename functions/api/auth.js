export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { email } = await context.request.json();
    if (!email || !email.includes('@')) {
      return Response.json({ status: 'error', message: 'Invalid email' }, { status: 400, headers: corsHeaders });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const apiKey = context.env.BUTTONDOWN_API_KEY;

    if (!apiKey) {
      // No API key configured — grant access but don't subscribe
      return Response.json({ status: 'new' }, { headers: corsHeaders });
    }

    // Step 1: Check if subscriber already exists
    const checkRes = await fetch(
      `https://api.buttondown.com/v1/subscribers?email=${encodeURIComponent(normalizedEmail)}`,
      { headers: { 'Authorization': `Token ${apiKey}` } }
    );

    if (checkRes.ok) {
      const data = await checkRes.json();
      const results = data.results || data;
      if (Array.isArray(results) && results.length > 0) {
        return Response.json({ status: 'existing' }, { headers: corsHeaders });
      }
    }

    // Step 2: Create new subscriber
    const createRes = await fetch('https://api.buttondown.com/v1/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email_address: normalizedEmail,
        type: 'regular',
      }),
    });

    if (createRes.ok || createRes.status === 201) {
      return Response.json({ status: 'new' }, { headers: corsHeaders });
    }

    // Step 3: Handle errors
    const errBody = await createRes.text();

    // If subscriber already exists (race condition or API quirk)
    if (createRes.status === 400 || createRes.status === 409) {
      if (errBody.toLowerCase().includes('already') || errBody.toLowerCase().includes('exists')) {
        return Response.json({ status: 'existing' }, { headers: corsHeaders });
      }
    }

    return Response.json(
      { status: 'error', message: `Subscription failed (${createRes.status})` },
      { status: 500, headers: corsHeaders }
    );
  } catch (e) {
    return Response.json(
      { status: 'error', message: 'Internal error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
