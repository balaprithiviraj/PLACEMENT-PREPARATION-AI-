# AI Resume Analyzer & Placement Preparation System

An AI-powered placement portal for college students: upload a resume for an
ATS-style score + skill-gap analysis, practice aptitude/technical quizzes from a
seeded bank, take AI mock interviews, and track preparation on a dashboard.
Admins manage students and the question bank. AI features are powered by
open-source Hugging Face models, called **only from the backend** (token never reaches the browser).

## Project Documentation

- Main report: [PROJECT_DOCUMENTATION_REDESIGNED.md](PROJECT_DOCUMENTATION_REDESIGNED.md)
- UI snapshot: [Landing page screenshot](.doc_work/screens/01-landing.png)

## Tech stack

| Layer    | Tech |
|----------|------|
| Frontend | React 18 + Vite, react-router-dom, axios, Tailwind CSS, lucide-react |
| Backend  | Node.js + Express 4, Mongoose, JWT auth, bcryptjs, multer uploads |
| Database | MongoDB (local `placement_ai` or Atlas) |
| AI       | Free Pollinations cloud (`gpt-oss-20b`, no key) via backend `aiService.js`/`aiProvider.js` (native fetch, no SDK); or HF router chain / Groq / OpenRouter / local Ollama via `AI_PROVIDER`, offline heuristic fallback |
| Parsing  | `pdf-parse` (PDF resumes), `mammoth` (DOCX resumes) |

## Project structure

```
placement preparation ai/
├── README.md                  ← you are here
├── .gitignore
├── docs/
│   ├── VIVA_GUIDE.md          ← 2-page viva guide (architecture, APIs, Gemini)
│   └── DEMO_SCRIPT.md         ← 5-minute live demo script
├── backend/
│   ├── package.json           ← scripts: dev / start / seed
│   ├── .env.example
│   ├── seed/seed.js           ← question bank (80) + admin upsert
│   ├── uploads/               ← uploaded resumes (git-ignored)
│   └── src/
│       ├── server.js          ← Express app + route mounting
│       ├── config/            ← db.js, gemini.js
│       ├── controllers/       ← auth, user, resume, question, quiz, interview, dashboard
│       ├── middleware/        ← authMiddleware, adminMiddleware, errorMiddleware
│       ├── models/            ← User, Question, Resume, QuizAttempt, InterviewSession
│       ├── routes/            ← /auth /users /resumes /questions /quiz /interview /dashboard
│       └── services/          ← geminiService, resumeParser, scoringService
└── frontend/
    ├── .env.example           ← VITE_API_URL=http://localhost:5000/api
    └── src/
        ├── App.jsx            ← public + student routes (admin block merges via snippet)
        ├── ADMIN_ROUTES_SNIPPET.md ← exact JSX for the main agent to paste
        ├── components/        ← GlassCard, StatCard, Modal, Button, LoadingState,
        │                        EmptyState, ProtectedRoute, StudentLayout, AdminLayout, …
        ├── context/AuthContext.jsx
        ├── pages/             ← Landing, Login, Register, Dashboard, Profile, Settings
        ├── pages/admin/       ← AdminDashboard, Students, Questions, Categories, Analytics
        ├── services/api.js    ← axios instance + authAPI/userAPI/resumeAPI/
        │                        questionAPI/quizAPI/interviewAPI/dashboardAPI
        └── utils/helpers.js   ← cn, greeting, formatDate/Time, scoreColor, difficultyColor
```

## Setup

### Prerequisites

- Node.js 18+ (Gemini service uses native `fetch`)
- MongoDB running locally (`mongodb://127.0.0.1:27017/placement_ai`) or an Atlas URI —
  or **no install at all**: `npm run dev:memory` starts an ephemeral in-memory DB

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # then fill in values (see table below)
npm run seed                # inserts 80 questions + upserts admin user
npm run dev                 # http://localhost:5000
```

`backend/.env` keys:

| Key | Purpose |
|-----|---------|
| `PORT` | API port (default `5000`) |
| `MONGODB_URI` | Mongo connection string |
| `JWT_SECRET` | Secret for signing login tokens |
| `GEMINI_API_KEY` | Google Gemini key — **backend only, never commit** |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed admin credentials (defaults: `admin@college.edu` / `Admin@123`) |

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api
npm run dev                 # http://localhost:5173
```

> `frontend/.env.example` already contains `VITE_API_URL` — verified present,
> no action needed beyond copying it to `.env`.

### 3. Seed (question bank + admin)

```bash
cd backend
npm run seed
```

What it does (`seed/seed.js`, read-only safe to re-run):

- Clears `questions` and inserts **80 questions**:
  aptitude 30 (Quantitative 10, Logical 8, Verbal 7, DI 5),
  technical 30 (Programming 5, DSA 6, DBMS 5, OS 4, CN 4, OOP 3, Web Dev 3),
  HR 10, interview/open-ended 10.
- Upserts the admin user by email from `ADMIN_EMAIL`/`ADMIN_PASSWORD`
  (safe defaults `admin@college.edu` / `Admin@123` when env is unset) and forces
  `role: 'admin'`.

## Demo flow (happy path)

1. **Register** at `/register` as a student → lands on `/dashboard`.
2. **Upload resume** at `/resume` (PDF/DOCX) → overall score, ATS score,
   missing skills, role suggestions.
3. **Practice quiz** (`/aptitude` or `/technical`) → start → submit → accuracy
   + explanations → attempt saved to history.
4. **Mock interview** at `/interview` → HR/technical turns with AI feedback.
5. **Track progress** on `/dashboard` (streak, category performance, activity).
6. **Admin**: log in as admin → `/admin` stats → `/admin/students` (view,
   activate/deactivate) → `/admin/questions` (CRUD with filters) →
   `/admin/categories` (coverage) → `/admin/analytics` (charts).

## API quick reference (all prefixed with `/api`)

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/auth/register`, `/auth/login` | – | Create session (JWT) |
| GET | `/auth/me` | user | Current user |
| GET/PUT | `/users/profile` | user | Own profile |
| GET | `/users?search=&page=&limit=` | admin | Student list |
| GET | `/users/:id` | admin | Student detail |
| PATCH | `/users/:id/status` | admin | Toggle active |
| POST | `/resumes/upload` | user | Upload + analyze resume |
| GET | `/resumes`, `/resumes/:id` | user | Resume history/detail |
| GET | `/questions?category=&difficulty=&type=&search=&page=&limit=` | user | Bank listing |
| POST/PUT/DELETE | `/questions`, `/questions/:id` | admin | Bank CRUD (delete = soft) |
| POST | `/quiz/start`, `/quiz/submit` | user | Quiz flow |
| GET | `/quiz/history` | user | Past attempts |
| POST | `/interview/start`, `/interview/answer` | user | Mock interview |
| GET | `/interview/history` | user | Past sessions |
| GET | `/dashboard` | user | Aggregated progress |

## Viva Q&A cheat-sheet

1. **What problem does this solve?** Students get resume feedback, structured
   quiz practice and mock interviews in one portal instead of scattered tools.
2. **How is the resume scored?** Parser extracts text/skills, then an
   open-source HF chat model rates
   it (overall + ATS) and lists missing skills; offline heuristic fallback applies.
3. **Where is the HF token kept?** Only in backend `.env` as
   `HF_TOKEN`; the browser never sees it — all AI calls are server-side.
4. **How does auth work?** JWT on login, stored in `localStorage`, sent as
   `Bearer` header; `authMiddleware` guards routes, `adminMiddleware` guards admin ones.
5. **How is the admin created?** `npm run seed` upserts by `ADMIN_EMAIL`, hashes
   the password with bcrypt and forces `role: 'admin'`.
6. **How many seed questions, and what kinds?** 80: aptitude 30, technical 30,
   HR 10, interview 10; each has 4 options, a correct index, explanation,
   category, type and difficulty.
7. **What happens when the AI provider is down?** Controllers catch the error and fall
   back to the local heuristics / live bank, so core flows still work offline.
8. **How do quizzes stay fair?** Questions come from the server bank with
   server-side correct answers; students only receive what the API returns.
9. **How do you deactivate a student?** Admin → Students → toggle; it flips
   `isActive` via `PATCH /users/:id/status` without deleting data.
10. **How would you scale this?** Paginate/admin-aggregate endpoints, cache the
    bank, queue AI calls, move uploads to object storage, add rate limiting.

## AI notes (free by default, open models)

- Default provider is **free Pollinations cloud** (`AI_PROVIDER=pollinations`,
  no key): open-weights `gpt-oss-20b` answers resume/interview/quiz calls live
  (verified: resume → `source:ai`, 75/80 scores). Anonymous tier ≈ 1 req/15s —
  rapid repeats fall back gracefully to offline heuristics.
- Paid/alt path: `AI_PROVIDER=hf` + `HF_TOKEN` (Hugging Face router chain
  Llama-3.1-8B → Qwen2.5 → gemma → Mistral; needs credits, 402 when empty),
  `groq` / `openrouter` / `ollama` / `custom` also supported — see
  `backend/.env.example`.
#   P L A C E M E N T - P R E P A R A T I O N - A I -  
 