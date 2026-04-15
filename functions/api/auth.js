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

    // Check if subscriber exists
    const checkRes = await fetch(
      `https://api.buttondown.email/v1/subscribers?email=${encodeURIComponent(normalizedEmail)}`,
      { headers: { 'Authorization': `Token ${apiKey}` } }
    );

    if (checkRes.ok) {
      const data = await checkRes.json();
      if (data.results && data.results.length > 0) {
        return Response.json({ status: 'existing' }, { headers: corsHeaders });
      }
    }

    // Create new subscriber
    const createRes = await fetch('https://api.buttondown.email/v1/subscribers', {
      method: 'POST',
      headers: { 'Authorization': `Token ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalizedEmail, type: 'regular' }),
    });

    if (createRes.ok || createRes.status === 201) {
      return Response.json({ status: 'new' }, { headers: corsHeaders });
    }

    if (createRes.status === 400) {
      const err = await createRes.json();
      if (JSON.stringify(err).includes('already')) {
        return Response.json({ status: 'existing' }, { headers: corsHeaders });
      }
    }

    return Response.json({ status: 'error', message: 'Failed' }, { status: 500, headers: corsHeaders });
  } catch (e) {
    return Response.json({ status: 'error', message: 'Internal error' }, { status: 500, headers: corsHeaders });
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
