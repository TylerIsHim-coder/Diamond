# Diamond Welcome Code Worker

This is the backend for the welcome-code API (the site no longer loads a popup script by default; you can wire `POST /claim` from any form).

It issues **one unique welcome code per email ever** (stored in Cloudflare KV) and emails it via **SendGrid**.

## What you need

- A Cloudflare account (Workers + KV)
- A SendGrid account
- Your domain (`diamondbeautystores.com`) on Cloudflare DNS (recommended) or at least the ability to create `api.diamondbeautystores.com`

## 1) Create a SendGrid API key

In SendGrid:

- Settings → API Keys → Create API Key
- Permissions: **Mail Send**
- Copy the key

Also set up domain authentication in SendGrid (recommended for deliverability).

## 2) Create a Cloudflare KV namespace

In Cloudflare dashboard:

- Workers & Pages → KV → Create namespace
- Name it: `WELCOME_KV`
- Copy the namespace ID

Paste that ID into `wrangler.toml`:

- `worker/wrangler.toml` → `kv_namespaces.id`

## 3) Install and login

From `worker/`:

```bash
npm install
npx wrangler login
```

## 4) Configure secrets / variables

From `worker/`:

```bash
npx wrangler secret put SENDGRID_API_KEY
```

Edit `worker/wrangler.toml` if needed:

- `FROM_EMAIL`: must be a verified sender in SendGrid
- `FROM_NAME`: display name
- `ALLOWED_ORIGIN`: should be `https://diamondbeautystores.com`

## 5) Develop locally (optional)

```bash
npm run dev
```

Then you can temporarily set in your site:

```js
window.DIAMOND_WELCOME_API_URL = "http://127.0.0.1:8787/claim";
```

## 6) Deploy

```bash
npm run deploy
```

## 7) Point `api.diamondbeautystores.com` to the Worker

Recommended: in Cloudflare, set a **Custom Domain** for the Worker:

- Workers & Pages → your worker → Triggers → Custom Domains
- Add: `api.diamondbeautystores.com`

Your site is already calling:

- `https://api.diamondbeautystores.com/claim`

So once the custom domain is set, it will work.

## API

### `POST /claim`

Body:

```json
{ "email": "customer@example.com" }
```

Response:

- `{ "ok": true, "status": "sent" }` (first time)
- `{ "ok": true, "status": "resent" }` (already claimed; re-sends same code)

