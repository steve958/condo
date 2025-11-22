# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common commands

- Install deps: `npm install`
- Dev (Vite SPA): `npm run dev`
- Dev with serverless functions (Netlify CLI):
  - `npm install -g netlify-cli`
  - `netlify dev` (serves app and proxies `/api/*` to functions)
- Build: `npm run build` (TypeScript typecheck + Vite bundle)
- Preview production build: `npm run preview`
- Lint: `npm run lint`
  - Auto-fix: `npm run lint -- --fix`
- Tests: not configured in this repo (no test runner/scripts present).

## Environment

- The app uses Firebase Firestore. Set Vite env vars (e.g. in `.env.local`) before running:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`

## Architecture overview

- Frontend
  - React + TypeScript app built with Vite.
  - Entry: `src/main.tsx` mounts `<App />` into `#root`.
  - `src/App.tsx` drives UI from a real-time Firestore subscription to the `todos` collection ordered by a numeric `sort` field.
    - CRUD: create (`addDoc`), update (`updateDoc`), delete (`deleteDoc`). Toggle completion flips `completed`.
    - Reordering: drag-and-drop updates `sort` for all items via a Firestore `writeBatch`.
    - Filtering: by status (`all | active | completed`) and by `room` (fixed taxonomy with color accents).
    - Totals: computes aggregate price in RSD and EUR (fixed conversion) with localized currency formatting.
    - Media: optional `imgUrl` with lightbox preview and a fallback icon.
  - Styles: `src/index.css`, `src/App.css`; static assets in `public/` and `src/assets/`.

- Serverless API (Netlify Functions)
  - Location: `netlify/functions/`.
  - `todos.js` implements demo endpoints:
    - `GET /api/todos` → returns sample todos.
    - `POST /api/todos` → echoes created todo payload.
  - Configured via `netlify.toml`:
    - Functions dir: `netlify/functions`.
    - Redirect: `[[redirects]] from = "/api/*" → `/.netlify/functions/:splat`.
    - `dev` proxy: Vite on port 5173 is proxied by Netlify dev on port 8888.
  - Note: the current UI does not call these endpoints; data comes from Firestore.

- Tooling & configuration
  - Build: Vite (`vite.config.ts`) with React plugin.
  - TypeScript: project references split into app and node configs (`tsconfig.app.json`, `tsconfig.node.json`), strict mode, bundler module resolution, noEmit.
  - Linting: ESLint (`eslint.config.js`) using `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`; `dist/` is ignored.
  - Output: production build emits to `dist/` (as per `netlify.toml`).
