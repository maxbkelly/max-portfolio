# Claude project instructions

This repository is Maximilian Kelly's production portfolio. Preserve its cinematic, minimal interaction language and keep the content editor simple for a nontechnical owner.

## Responsibilities

- **Code and visual behavior:** GitHub changes made with Claude, reviewed, then deployed.
- **Content:** Sanity Studio. Do not hardcode ordinary portfolio edits into React.
- **Video files:** Vimeo. The CMS stores Vimeo URLs; this repository does not store source videos. Exception: each Project may optionally have a short (under 5s), low-resolution, silent "hover preview clip" uploaded directly as a Sanity file asset (same pattern as thumbnail images) — these are small enough that Sanity's own asset CDN is the right home, not Vimeo or this repo. Second exception: Site Settings may hold a compressed 9:16 "mobile homepage reel" MP4 (~720×1280, under ~10 MB) as a Sanity file asset, which phones play directly in a native `<video>` instead of the Vimeo iframe for faster loading on mobile data. Desktop always uses the Vimeo reel.
- **Production hosting:** Cloudflare Workers, deployed automatically from GitHub `main`.

## Architecture

- `app/page.tsx` is the interactive portfolio UI.
- `app/data.ts` defines CMS types, the Sanity query, Vimeo URL parsing and safe fallback content.
- `app/globals.css` contains the complete visual and motion system.
- `studio/` is a standalone Sanity Studio linked to project `j7kkjji4`, dataset `production`.
- `studio/schemaTypes/` defines Projects, Sections and Site Settings.
- `.openai/hosting.json` and `build/sites-vite-plugin.ts` package hosting metadata during the Vinext build. Preserve them unless the build pipeline is deliberately replaced.

## Required behavior

- Navigation sections must come from the ordered `sections` array in Sanity Site Settings.
- New CMS sections must appear without a code change.
- A single Project may appear in multiple Sections and have a different position in each.
- Vimeo manager links, normal links and unlisted links with hashes must continue to work.
- Grid hover shows a subtle zoom on the thumbnail, or plays the project's optional hover preview clip if one is set (muted, looping, no scrubbing).
- The fullscreen viewer keeps custom PLAY/PAUSE/CLOSE cursor behavior, keyboard arrows, Escape-to-close and portrait-video close zones.
- Keep a graceful fallback if the Sanity request fails.
- Maintain responsive behavior and reduced-motion support.

## Content boundaries

Do not edit `fallbackContent` for normal content requests unless the user explicitly asks to update the emergency fallback too. Change projects, Vimeo links, ordering, navigation and About copy in Sanity.

Do not put secrets or Sanity write tokens in browser code. The frontend reads the public dataset without a token; all writes happen through authenticated Sanity Studio.

## Commands

```bash
npm install
npm --prefix studio install
npm run dev
npm run cms
npm run build
npm run cms:build
```

## Change workflow

1. Pull the latest `main` branch.
2. Create a short-lived branch for code changes.
3. Make the smallest scoped change.
4. Run both build commands.
5. Review desktop and mobile behavior when UI changed.
6. Commit with a clear message and open a pull request.
7. Merge only after Max approves the visual result.

Never rewrite history, force-push `main`, commit `node_modules`, or replace the working stack without an explicit request.
