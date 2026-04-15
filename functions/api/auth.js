export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { email, debug } = await context.request.json();

    if (!email || !email.includes('@')) {
      return Response.json({ status: 'error', message: 'Invalid email' }, { status: 400, headers: corsHeaders });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const apiKey = context.env.BUTTONDOWN_API_KEY;

    // Debug mode: return raw API responses
    if (debug) {
      const diagnostics = {
        apiKeyPresent: !!apiKey,
        apiKeyPrefix: apiKey ? apiKey.substring(0, 8) + '...' : null,
        email: normalizedEmail,
        steps: [],
      };

      // Test 1: Check subscriber
      try {
        const checkUrl = `https://api.buttondown.com/v1/subscribers?email=${encodeURIComponent(normalizedEmail)}`;
        const checkRes = await fetch(checkUrl, {
          headers: { 'Authorization': `Token ${apiKey}` },
        });
        const checkBody = await checkRes.text();
        diagnostics.steps.push({
          step: 'check_subscriber',
          url: checkUrl,
          status: checkRes.status,
          body: checkBody.substring(0, 500),
        });
      } catch (e) {
        diagnostics.steps.push({ step: 'check_subscriber', error: e.message });
      }

      // Test 2: Create subscriber
      try {
        const createUrl = 'https://api.buttondown.com/v1/subscribers';
        const createRes = await fetch(createUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email_address: normalizedEmail, type: 'regular' }),
        });
        const createBody = await createRes.text();
        diagnostics.steps.push({
          step: 'create_subscriber',
          url: createUrl,
          status: createRes.status,
          body: createBody.substring(0, 500),
        });
      } catch (e) {
        diagnostics.steps.push({ step: 'create_subscriber', error: e.message });
      }

      return Response.json(diagnostics, { headers: corsHeaders });
    }

    // --- Normal flow ---
    if (!apiKey) {
      return Response.json({ status: 'new' }, { headers: corsHeaders });
    }

    // Check if subscriber exists
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

    // Create new subscriber
    const createRes = await fetch('https://api.buttondown.com/v1/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email_address: normalizedEmail, type: 'regular' }),
    });

    if (createRes.ok || createRes.status === 201) {
      return Response.json({ status: 'new' }, { headers: corsHeaders });
    }

    const errBody = await createRes.text();
    if (createRes.status === 400 || createRes.status === 409) {
      if (errBody.toLowerCase().includes('already') || errBody.toLowerCase().includes('exists')) {
        return Response.json({ status: 'existing' }, { headers: corsHeaders });
      }
    }

    return Response.json(
      { status: 'error', message: `Failed (${createRes.status}): ${errBody.substring(0, 200)}` },
      { status: 500, headers: corsHeaders }
    );
  } catch (e) {
    return Response.json(
      { status: 'error', message: `Internal error: ${e.message}` },
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
