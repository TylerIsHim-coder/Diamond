function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function withCors(res, origin) {
  const h = new Headers(res.headers);
  h.set('Access-Control-Allow-Origin', origin);
  h.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  h.set('Access-Control-Allow-Headers', 'Content-Type');
  h.set('Vary', 'Origin');
  return new Response(res.body, { status: res.status, headers: h });
}

function isValidEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function randomCode(len) {
  // Avoid ambiguous chars (O/0, I/1)
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function sha256Hex(str) {
  const data = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sendEmail(env, toEmail, code) {
  const fromEmail = env.FROM_EMAIL;
  const fromName = env.FROM_NAME || 'Diamond Beauty Stores';

  const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: toEmail }] }],
      from: { email: fromEmail, name: fromName },
      subject: 'Your 20% off welcome code',
      content: [
        {
          type: 'text/html',
          value:
            `Here’s your one-time code: <b>${code}</b><br/><br/>` +
            `Show this code in-store to get <b>20% off</b> your first purchase.`
        }
      ]
    })
  });

  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`SendGrid failed: ${r.status} ${t}`);
  }
}

export default {
  async fetch(req, env) {
    const allowedOrigin = env.ALLOWED_ORIGIN || 'https://diamondbeautystores.com';
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }), allowedOrigin);
    }

    if (req.method !== 'POST' || url.pathname !== '/claim') {
      return withCors(new Response('Not found', { status: 404 }), allowedOrigin);
    }

    let body;
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const emailRaw = (body.email || '').trim();
    const email = emailRaw.toLowerCase();
    if (!isValidEmail(email)) {
      return withCors(json({ ok: false, error: 'Invalid email.' }, 400), allowedOrigin);
    }

    const emailKey = await sha256Hex(email);
    const kvKey = `welcome:v1:${emailKey}`;

    const existing = await env.WELCOME_KV.get(kvKey, { type: 'json' });
    if (existing?.code) {
      // One code per email ever. If they try again, re-send the same code.
      await sendEmail(env, email, existing.code);
      return withCors(json({ ok: true, status: 'resent' }), allowedOrigin);
    }

    const code = `DIAMOND20-${randomCode(6)}`;
    await env.WELCOME_KV.put(kvKey, JSON.stringify({ code, issuedAt: Date.now() }));

    await sendEmail(env, email, code);
    return withCors(json({ ok: true, status: 'sent' }), allowedOrigin);
  }
};

