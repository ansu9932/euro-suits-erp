# Euro Suits ERP frontend

Private frontend source for https://erp.eurosuitsmfg.in . Go API, PostgreSQL, Redis and documents remain on the Hostinger VPS.

## Development

`npm ci` then `npm run dev`. Existing VPS fallback uses `npm run build` and adapter-node.

## Cloudflare Pages

- Production branch: `main`
- Root directory: repository root
- Build: `npm run test:proxy && npm run build:cloudflare`
- Output: `.svelte-kit/cloudflare`
- Node: 22
- Production secret: `ERP_PROXY_SECRET`, entered in Pages encrypted environment settings.
- Backend origin and public address: `wrangler.jsonc` (not secrets).

Cloudflare Git integration publishes successful main-branch pushes automatically. Local file edits alone do not publish. Run checks, commit and push each approved frontend change. Backend changes are deployed separately to Hostinger.

API requests retain their original Origin, CSRF, cookies and action IDs. The private origin verifies the edge secret before trusting the client IP. API responses are never cached. Preview addresses reject private API requests; use the official ERP domain for real sign-in. Do not place credentials, customer data, private documents or database backups in this repository.
