# Condo – Serverless React Todo

A modern todo list built with React + TypeScript (Vite) and serverless functions (Netlify).

## Quick start

- Dev (SPA):
  - `npm run dev`
- Dev with functions (requires Netlify CLI):
  - `npm install -g netlify-cli`
  - `netlify dev`
  - Then access API at `/api/todos`
- Production build:
  - `npm run build`
  - `npm run preview`

## Serverless API

- `GET /api/todos` → returns sample todos
- `POST /api/todos` → echoes created todo `{ title: string, completed?: boolean }`

Configured via `netlify.toml`; functions live in `netlify/functions`.

## Notes

- Todos persist locally via `localStorage`.
- No commits made; initialize your own git workflow as desired.
