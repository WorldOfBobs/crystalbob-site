# Cloudflare Pages deploy notes

## Why this setup

This repo is prepared for **Cloudflare Pages now** while staying easy to move to Vercel later.

Good fit when:
- frontend is Vite/React
- model data is fetched from external APIs/backends
- Cloudflare is serving the site and optionally a thin gating/proxy layer

## Build settings

Use these in Cloudflare Pages:
- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

## Local commands

- Build: `npm run build`
- Cloudflare build alias: `npm run cf:build`
- Deploy from CLI: `npm run cf:deploy`

## Notes

- `public/_redirects` is included so SPA routing will still work if we later move from hash routes to normal app routes.
- `public/_headers` adds a few safe default headers.
- `wrangler.toml` is minimal on purpose.

## Later migration to Vercel

Keep these boundaries clean:
- frontend UI stays in React
- wallet gating logic should live behind a small API boundary
- model data fetching should avoid hard-coding Cloudflare-specific bindings unless needed

That way Cloudflare can host the frontend now without locking the app in forever.
