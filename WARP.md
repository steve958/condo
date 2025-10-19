# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common commands

- Install deps: `npm install`
- Dev (Vite SPA): `npm run dev`
- Dev with serverless functions (Netlify CLI):
  - `npm install -g netlify-cli`
  - `netlify dev` (serves app and proxies `/api/*` to functions)
- Build: `npm run build` (TypeScript project build + Vite bundle)
- Preview production build: `npm run preview`
- Lint: `npm run lint`
  - Auto-fix: `npm run lint -- --fix`
- Tests: not configured in this repo (no test runner/scripts present).

## Architecture overview

- Frontend
  - React + TypeScript app built with Vite.
  - Entry: `src/main.tsx` mounts `<App />` into `#root`.
  - `src/App.tsx` implements the entire Todo UI and state:
    - Local state of todos with persistence to `localStorage` under key `condo.todos`.
    - CRUD helpers (add, toggle, remove, rename) and filtering (`all | active | completed`).
    - Optional data bootstrap via `fetch('/api/todos')` to merge server-provided sample todos.
  - Styles: `src/index.css`, `src/App.css`.
  - Static assets under `public/` and `src/assets/` (bundled by Vite).

- Serverless API (Netlify Functions)
  - Location: `netlify/functions/`.
  - `todos.js` handles:
    - `GET /api/todos` → returns sample todos.
    - `POST /api/todos` → echoes created todo payload.
  - Configured via `netlify.toml`:
    - Functions dir: `netlify/functions`.
    - Redirect: `[[redirects]] from = "/api/*" → `/.netlify/functions/:splat`.
    - `dev` proxy: Vite on port 5173 is proxied by Netlify dev on port 8888.

- Tooling & configuration
  - Build: Vite (`vite.config.ts`) with React plugin.
  - TypeScript: project references split into app and node configs (`tsconfig.app.json`, `tsconfig.node.json`), strict mode, bundler module resolution, noEmit.
  - Linting: ESLint (`eslint.config.js`) using `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`; `dist/` is ignored.
  - Output: production build emits to `dist/` (as per `netlify.toml`).

## Notes pulled from README

- Quick start:
  - SPA dev: `npm run dev`.
  - Full-stack dev (requires Netlify CLI): `netlify dev`; API served at `/api/todos`.
  - Production: `npm run build` then `npm run preview`.
- Persistence: todos are stored locally via `localStorage`.
