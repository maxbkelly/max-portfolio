# Deployment handoff

## Current state

The production build is hosted on Cloudflare Workers at:

<https://maximilian-kelly-portfolio.maximilianbkelly.workers.dev/>

Sanity Studio is independently hosted at:

<https://maxbkelly-portfolio.sanity.studio/>

## Production setup

1. GitHub `main` is the source of truth.
2. Cloudflare connects to the GitHub repository.
3. A successful production build deploys automatically after an approved merge to `main`.
4. A custom domain can point to that Cloudflare deployment later.
5. Sanity remains independent; published content updates should not require a GitHub commit.

## Cloudflare build configuration

- Worker name: `maximilian-kelly-portfolio`
- Production branch: `main`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy --config dist/server/wrangler.json`
- Preview deploy command: `npx wrangler versions upload --config dist/server/wrangler.json`
- Repository root: `/`

The Workers address is registered in Sanity CORS without credentials. Add any future custom-domain origin to Sanity CORS too. Never copy GitHub, Sanity or Cloudflare credentials into repository files.

## Build checks

```bash
npm run build
npm run cms:build
```

The app uses Vinext and the Cloudflare Vite plugin. Cloudflare builds the Worker bundle and static assets into `dist/`, then deploys using the generated `dist/server/wrangler.json` configuration.
