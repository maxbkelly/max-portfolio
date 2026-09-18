# Sanity content model

Project ID: `j7kkjji4`  
Dataset: `production`  
Studio: <https://maxbkelly-portfolio.sanity.studio/>

## Documents

### Site Settings

The singleton document with ID `siteSettings` controls:

- Upper-left site name
- Homepage Vimeo reel
- Ordered navigation sections
- Large About statement
- Smaller About biography

### Section

Each section has a menu name, URL slug, visibility toggle and ordered array of Project references. Array order is the project-grid order. Because these are references, the same Project can be placed in multiple Sections.

### Project

Each project has a title, Vimeo URL, optional description and credits, plus a loading color. The Vimeo URL parser accepts standard, manager and unlisted/hash URLs.

## Frontend query

The query and normalization logic live in `app/data.ts`. The public site performs an unauthenticated read from Sanity's CDN. Never add a write token to frontend code.

## Schema changes

Edit `studio/schemaTypes/`, then run:

```bash
npm run cms:build
npm --prefix studio run deploy
```

Changing schema code requires GitHub/Claude. Editing documents does not.

## Seed data

`studio/seed.ndjson` is the original migration snapshot. Do not routinely re-import it: importing with replacement can overwrite content that Max has since edited.
