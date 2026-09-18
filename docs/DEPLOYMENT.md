# Deployment handoff

## Current state

The review build is currently hosted through ChatGPT Sites at:

<https://maximilian-kelly-portfolio.albert3kelly.chatgpt.site/>

Sanity Studio is independently hosted at:

<https://maxbkelly-portfolio.sanity.studio/>

## Intended production state

1. GitHub `main` is the source of truth.
2. Cloudflare connects to the GitHub repository.
3. A successful production build deploys automatically after an approved merge to `main`.
4. The custom domain points to that Cloudflare deployment.
5. Sanity remains independent; published content updates should not require a GitHub commit.

## Before connecting Cloudflare

- Confirm the repository belongs to Max and is private.
- Give Cloudflare access only to this repository.
- Preserve the current review deployment until the Cloudflare URL is verified.
- Add the final Cloudflare and custom-domain origins to Sanity CORS if browser-side content requests are used.
- Never copy GitHub, Sanity or Cloudflare credentials into repository files.

## Build checks

```bash
npm run build
npm run cms:build
```

The current app uses Vinext and the Cloudflare Vite plugin. When configuring the permanent Cloudflare deployment, Claude should verify the current recommended Workers/Pages configuration rather than assuming the temporary ChatGPT Sites settings are portable unchanged.
