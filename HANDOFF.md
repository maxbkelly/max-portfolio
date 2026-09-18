# Max's portfolio: handoff guide

This document is the nontechnical map for Max and anyone helping him.

## What lives where

### GitHub: the website itself

GitHub stores the code, design, animation and change history. Think of it as the master project folder with a complete undo history.

Repository: <https://github.com/maxbkelly/max-portfolio>

Use Claude for frontend changes such as typography, layout, colors, animation, player behavior or new functionality. Claude should work from this repository, make a branch, test the change and submit it for approval before it reaches the public site.

### Sanity: everyday content editing

Sanity is where Max changes content without touching code.

CMS: <https://maxbkelly-portfolio.sanity.studio/>

Use Sanity to:

- Add, remove or rename projects.
- Paste or replace Vimeo links.
- Add a project to Director, Editor or several sections at once.
- Drag projects into a new order inside a section.
- Add a section such as Social or Cinematographer.
- Reorder or hide navigation sections.
- Change the homepage reel and About text.

The same Project record can appear in several Sections. Do not create duplicate Project records merely to place one video in both Director and Editor.

### Vimeo: video hosting

Upload and manage the actual videos in Vimeo. Sanity only needs the Vimeo link. For unlisted videos, keep the full link including its privacy hash.

### Cloudflare: final website hosting

Cloudflare will publish the website and eventually manage the domain. It is not connected to this GitHub repository yet. Until that setup is complete, the current `chatgpt.site` address is a temporary review site.

## Max's normal workflow

### To change content

1. Open Sanity Studio.
2. Make the change.
3. Click **Publish** on every edited document.
4. Refresh the portfolio to confirm it.

No GitHub or Claude session is needed for ordinary content changes.

### To change the design or behavior

1. Open the GitHub project in Claude.
2. Describe the desired change and include screenshots or references.
3. Ask Claude to preserve the Sanity content model and run both builds.
4. Review the preview.
5. Approve the pull request or deployment only when it looks right.

## Accounts and ownership

The GitHub, Sanity, Cloudflare, Vimeo and domain accounts should use Max's email, with two-factor authentication enabled. Never paste passwords, recovery codes or billing details into Claude, GitHub files or Sanity fields.

## Current status

- Sanity is connected and contains the starting portfolio content.
- The website code can read Site Settings, Sections and Projects from Sanity.
- The CMS has a hosted login address.
- GitHub is the intended master code repository.
- Cloudflare connection and the final custom domain remain to be completed.
