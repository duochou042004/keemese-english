# ADR-0005: Vite + React SPA served by the API

Status: Accepted (2026-10-17)

## Context
The spec suggests "React / Next.js" (§36). The technology baseline names React + TypeScript + Vite + Tailwind v4 for an authenticated workspace SPA. Every screen sits behind a login: no SEO, no public pages (§45).

## Decision
- A client-only SPA built with **Vite 8** and **React 19**, TypeScript.
- Production: the built `web/dist` is copied into the API image and served as static files, with an SPA fallback to `index.html` for non-`/api` routes. Hashed assets are cached immutably; `index.html` is served with `no-cache`.
- Development: `npm run dev` (Vite) with a proxy for `/api` → `http://localhost:5080`.

## Alternatives
- Next.js: server rendering and a Node runtime bring no value for a logged-in app, and they would add a second server process to deploy and secure.
- Serving the SPA from a separate CDN or static host: this breaks same-origin cookies (ADR-0004).

## Consequences
- One container image, one origin, one TLS certificate.
- First load is a JavaScript bundle. Routes are code-split per area (tutor `/t/*` and student `/s/*` load separately).

## Revisit when
Public, indexable pages are ever required (currently a Phase 3 idea, §44).
