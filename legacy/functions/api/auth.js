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
      return Response.json({ status: 'new' }, { headers: corsHeaders });
    }

    // Step 1: Check if subscriber already exists
    // The Buttondown API ?email= filter is not an exact match,
    // so we must verify the results ourselves
    const checkRes = await fetch(
      `https://api.buttondown.com/v1/subscribers?email=${encodeURIComponent(normalizedEmail)}`,
      { headers: { 'Authorization': `Token ${apiKey}` } }
    );

    if (checkRes.ok) {
      const data = await checkRes.json();
      const results = data.results || [];
      // Exact match check — the API may return non-exact matches
      const exactMatch = results.find(
        (sub) => sub.email_address && sub.email_address.toLowerCase() === normalizedEmail
      );
      if (exactMatch) {
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
      body: JSON.stringify({ email_address: normalizedEmail, type: 'regular' }),
    });

    if (createRes.ok || createRes.status === 201) {
      return Response.json({ status: 'new' }, { headers: corsHeaders });
    }

    // Step 3: Handle errors
    const errBody = await createRes.text();
    let errData = {};
    try { errData = JSON.parse(errBody); } catch {}

    // Subscriber already exists (race condition)
    if (errData.code === 'email_already_exists' ||
        (errBody.toLowerCase().includes('already') || errBody.toLowerCase().includes('exists'))) {
      return Response.json({ status: 'existing' }, { headers: corsHeaders });
    }

    // Firewall block — still grant access but don't pretend they're subscribed
    if (errData.code === 'subscriber_blocked') {
      return Response.json({ status: 'new' }, { headers: corsHeaders });
    }

    return Response.json(
      { status: 'error', message: 'Something went wrong. Please try again.' },
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
