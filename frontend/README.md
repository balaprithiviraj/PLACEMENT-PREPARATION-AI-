# PlacementPrep Frontend

AI Resume Analyzer & Placement Preparation System — frontend shell.

## Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

- Dev server: http://localhost:5173
- API: `VITE_API_URL` (default `http://localhost:5000/api`, falls back to `/api` via Vite proxy).

## Routes

- Public: `/`, `/login`, `/register`
- Student (login required): `/dashboard`, `/profile`, `/settings`
- Placeholders (owned by student-module agent): `/resume`, `/skill-gap`, `/career-roles`, `/aptitude`, `/technical`, `/quiz`, `/interview`, `/progress`

## Design

Dark neutral gradient, glass panels (`white/5` + blur + `white/10` border), single indigo accent, Inter font.
