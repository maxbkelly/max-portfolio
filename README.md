# Maximilian Kelly Portfolio

A video-first portfolio for director and editor Maximilian Kelly. The website is a React/Next.js application built with Vinext for Cloudflare-compatible deployment. Portfolio content is managed in Sanity Studio.

## The three parts

- **Website code:** this GitHub repository
- **Content:** [Max Portfolio CMS](https://maxbkelly-portfolio.sanity.studio/)
- **Video hosting:** Vimeo

The website reads published content from Sanity. If Sanity is temporarily unavailable, it falls back to the built-in content in `app/data.ts` so the portfolio remains usable.

## Local setup

Requirements: Node.js 22.13 or newer and npm.

```bash
npm install
npm --prefix studio install
```

Run the website:

```bash
npm run dev
```

Run Sanity Studio in a second terminal:

```bash
npm run cms
```

The website normally opens at `http://localhost:3000`. Sanity Studio normally opens at `http://localhost:3333`.

## Validation

```bash
npm run build
npm run cms:build
```

Both commands must succeed before merging or deploying code changes.

## Content model

- **Site settings:** name, homepage reel, navigation order and About text.
- **Sections:** Director, Editor, A.I., or any new section Max creates.
- **Projects:** one Vimeo project record that can be referenced by multiple sections.
- Project order is controlled independently inside each section.

See [HANDOFF.md](HANDOFF.md) for the plain-English operating guide and [CLAUDE.md](CLAUDE.md) for coding-agent instructions.

## Current services

- Sanity project: `j7kkjji4`
- Sanity dataset: `production`
- Sanity Studio: <https://maxbkelly-portfolio.sanity.studio/>
- Production site: <https://maximilian-kelly-portfolio.maximilianbkelly.workers.dev/>
- GitHub: <https://github.com/maxbkelly/max-portfolio>

Cloudflare automatically builds and deploys the production site from GitHub `main`. A custom domain can be attached later without changing the application architecture.
