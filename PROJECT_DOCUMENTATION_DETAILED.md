# AI Resume Analyzer & Placement Preparation System — Complete Detailed Documentation
**Version:** 1.0 As-Built (Oct 2026) | **Target length:** ≤50 pages (≈ 22,000 words) | **Audience:** Students, Faculty, Examiners, Developers, Admins

> This is the authoritative as-built documentation. Root `README.md` describes a legacy Node.js/Express/MongoDB vision; disk reality is **Python FastAPI + React+Vite + Gemini/Zen + in-memory stores**. Every chapter marks **SPEC (README intent) vs IMPLEMENTED (code on disk)** to survive viva cross-check.

---
## Table of Contents
1. Executive Summary
2. Vision, Problem, Personas, Scope & Success Criteria
3. System Architecture (As-Built vs Spec)
4. Technology Stack (Verified)
5. Repository Structure & File Map
6. Backend Core: Entry, Config, Schemas, Middleware, Errors
7. Feature 1 — Authentication & Session Management
8. Feature 2 — AI Question Generation (`POST /api/questions/generate`)
9. Feature 3 — Resume Analyzer (Upload + ATS + Skill-Gap + Roles)
10. Feature 4 — Resume Studio (Local Builder + Print)
11. Feature 5 — Skill-Gap View
12. Feature 6 — Career Roles View
13. Feature 7 — Aptitude & Technical Practice Launchers
14. Feature 8 — Quiz Runner (`/quiz`), Generated Quiz (`/generated-quiz`), Quiz Result
15. Feature 9 — Mock Interview
16. Feature 10 — Dashboard & Progress Tracking
17. Feature 11 — Events, Event Details, My Events & Certificates
18. Feature 12 — Admin Suite (Dashboard, Students, Questions, Categories, Analytics)
19. Feature 13 — Profile, Settings, Landing, Layouts & Navigation
20. Cross-Cutting: API Client, Utilities, Design System, Shared Components
21. Data Design: Models, ER Diagrams, Seed Bank (80), Admin Seeding
22. Installation, Configuration, Run & Build
23. Testing Strategy & Coverage (Backend 41 cases + Frontend)
24. Security: Strengths, Gaps & Hardening Plan
25. Deployment, Scaling & Future Roadmap
26. Viva Q&A (20) + 5-Minute Demo Script
27. Appendices: Endpoint Matrix, File Index, Glossary, Page Budget

---
## 1. Executive Summary
**What it is:** A single placement portal where a student registers, uploads a resume (PDF/DOCX/TXT ≤5MB) for instant overall + ATS scores, missing-skill list with priorities, top-3 role matches with preparation plans, strengths/weaknesses/improvements and interview topics; generates AI practice MCQs by track/topic/difficulty/count; attempts timed quizzes graded instantly; practices mock interviews; tracks streak/averages/category performance; admins manage students/question bank/analytics.

**How it works (happy path):**
1. `POST /api/auth/register` → `{token,user}` → `localStorage` → `/dashboard`.
2. `/resume` drag-drop → `POST /api/resumes/upload (multipart field resume)` → `extract_text()` → `analyze_resume_text()` offline (no AI key needed) → `{overallScore,atsScore,breakdown,skills,missingSkills,recommendedRoles,...}` → navigate `/resume/:id`.
3. `/ai-question-generator` (public) or `/aptitude|/technical` → `POST /api/questions/generate {track,topic,difficulty,count}` → Gemini pool → Zen fallback → validated `{data:{questions:[{question,options[4],correctAnswer,explanation}]}}` → `/quiz?mode=ai...` or `/generated-quiz?...` → client grading via `buildAiQuizAttempt()` → `/quiz-result/local-*`.
4. `/interview`, `/progress`, `/events`, `/admin/*` complete the loop (some call legacy Node routes that 404 on Python — documented as future).

**Key numbers:** Backend ~1,400 lines `app/` + ~700 lines `tests/`; Frontend 22 student/public pages + 5 admin pages + 27 shared components; Resume vocab 60 skills + 6 role templates; Quiz validation `count 1-15`, rate-limit `10 req/10min/IP`, timeout `60s`; ATS `40-97`, Overall `25-97`.

**Critical caveat for examiners:** No MongoDB, no `seed.js`, no JWT/bcrypt, no `/users|/quiz|/interview|/dashboard` backend on disk. All are **design intent**; as-built uses in-memory dicts, opaque tokens, SHA256 demo hash, stateless AI generation. Chapter 3 explains drift; Chapter 21 gives migration path.

---
## 2. Vision, Problem, Personas, Scope
### 2.1 Problem
Students use scattered tools: ATS checkers, quiz sites, interview bots, Excel trackers. Feedback is inconsistent, AI keys leak to browsers, admin has no visibility into bank coverage or student readiness.

### 2.2 Vision
One dark-glass portal: **Analyze → Practice → Interview → Track → Manage**, all AI server-side, keys never reach browser, offline heuristics keep core flows alive when AI is down.

### 2.3 Personas
| Persona | Goals | Key screens |
|---|---|---|
| Student (primary) | Upload resume, know gaps, practice aptitude/technical, mock interview, see streak | `/dashboard,/resume,/resume/:id,/skill-gap,/career-roles,/aptitude,/technical,/quiz,/interview,/progress,/events` |
| Admin (`email startswith admin@`) | See totals, search/toggle students, CRUD bank, coverage, charts | `/admin,/admin/students,/admin/questions,/admin/categories,/admin/analytics` |
| Faculty/Examiner | Verify architecture, scoring fairness, no key leak, tests | This doc + `/api/health`, `pytest`, `npm test`, logs |
| Visitor | Understand value, try AI generator without login | `/,/ai-question-generator,/generated-quiz` |

### 2.4 Scope (In / Out)
**In (implemented):** Auth (register/login/me), resume upload/list/detail/re-analyze, AI MCQ generation (Gemini+Zen), client-graded quizzes, resume studio local builder + print, skill-gap/career-roles derived views, landing/login/register/dashboard/profile/settings/progress/events UI shells, admin UI shells.
**Partially wired:** Quiz history, interview start/submit/history, dashboard aggregation, users list, questions CRUD — frontend `api.js` declares them but Python backend returns 404 (legacy Node contract). Documented in each feature as `Frontend Ready / Backend TODO`.
**Out:** Payments, compiler, video interview, mobile app, mail.

### 2.5 Success Criteria
- Resume upload → scores in <3s offline; AI quiz in <60s or graceful 429/502; no secret in browser bundle/logs; 41 backend + frontend tests green; `vite build` clean (fix `GeneratedQuiz.jsx:61` string error first).

---
## 3. System Architecture
### 3.1 As-Built Diagram (text)
```
Browser :5173 (React+Vite+Tailwind)
  ├─ public: /, /login, /register, /ai-question-generator, /generated-quiz
  ├─ student (ProtectedRoute token): StudentLayout(Navbar+Sidebar+Aurora+Outlet) → 15 routes
  └─ admin (ProtectedRoute adminOnly): AdminLayout(topbar+sidebar+Outlet) → 5 routes
  │  axios baseURL: VITE_API_URL or /api (Vite proxy → localhost:8000)
  ▼
FastAPI :8000 (app/main.py)
  ├─ CORSMiddleware (allowed_origins_list + Vite fallbacks)
  ├─ HTTPException handler → {message,detail} duplicated for React
  ├─ /api/health → {status:ok}
  ├─ /api/auth/* (USER_STORE, TOKEN_STORE in-memory)
  ├─ /api/questions/generate (RATE_LIMIT_STORE, asyncio.wait_for 60s → gemini_service)
  └─ /api/resumes/* (RESUME_STORE, resume_service offline)
  ▼
AI Layer (gemini_service.py 532 lines)
  Gemini pool [gemini-3-flash-preview + 3 fallbacks] --429/404 failover--> Zen mimo-v2.5-free (httpx OpenAI-compat)
  → backoff 1s,2s,4s x3 → validation repair x2 → {questions} or 429/502/504
Resume Layer (resume_service.py 409 lines, no network)
  pypdf / python-docx / txt → detect_skills (60 vocab) → signals → weighted scores → roles/missing/strengths
```

### 3.2 SPEC vs IMPLEMENTED Drift Table
| Aspect | README SPEC (Node) | IMPLEMENTED (Python) | Action for doc/viva |
|---|---|---|---|
| Backend | Express 4 + Mongoose, `:5000` | FastAPI + Uvicorn, `:8000` | State drift; update README port/stack |
| DB | Mongo `placement_ai`/Atlas | In-memory dicts, lost on restart | Present both ERs; give migration path |
| Auth | JWT + bcryptjs | Opaque `token_urlsafe(32)` + SHA256 unsalted | Flag demo-grade; propose bcrypt+JWT |
| AI | Pollinations `gpt-oss-20b`/HF router/Groq/Ollama via `AI_PROVIDER` | Gemini pool + Zen `mimo-v2.5-free` | One page per provider, mark Spec vs Impl |
| Parsing | `pdf-parse` + `mammoth` | `pypdf` + `python-docx` + zip/xml + paren fallback | Conceptually same; show code mapping |
| Seed | `seed/seed.js` 80 Qs + admin upsert | No file; stateless AI only | Keep 80 table as spec; propose `seed.py` |
| Routes | `/users,/quiz,/interview,/dashboard`, question CRUD | Only `/auth,/questions/generate,/resumes,/health` | Mark frontend-ready/backend-TODO; 404 proof in `server.log` |
| Uploads | `uploads/` + multer | Memory only (`_text` stored) | Propose S3; note no path traversal |
| Docs links | `PROJECT_DOCUMENTATION_REDESIGNED.md,VIVA_GUIDE,DEMO_SCRIPT` | Missing on disk | This file replaces them |

### 3.3 Request Lifecycle Examples
**AI quiz:** `AiQuizGenerator → navigate /quiz?mode=ai... → Quiz.jsx POST /api/questions/generate → questions.py rate-limit → wait_for 60s → generate_questions_service → _attempt_provider(gemini)→_attempt_provider(zen) → validate → 200 {data:{questions}} → timer → buildAiQuizAttempt → navigate local-*`.
**Resume:** `ResumeAnalyzer drop → validate ext/size → FormData resume → POST /resumes/upload Bearer → _current_user → read → extract_text → blank?400 → analyze_resume_text → store → 200 {data:public} → navigate /resume/:id → GET detail → Re-analyze POST`.

---
## 4. Technology Stack (Verified from lockfiles)
| Layer | Choice + Version | Evidence |
|---|---|---|
| Frontend framework | React 18.3.1, ReactDOM 18.3.1 | `frontend/package.json` |
| Routing | react-router-dom 6.25.1 (BrowserRouter, Routes, Outlet, NavLink, useSearchParams) | `src/App.jsx:109` |
| HTTP | axios 1.7.2 single instance, timeout 65000 | `src/services/api.js:25` |
| Icons | lucide-react 0.417 exclusively, no emoji | all components |
| Styling | Tailwind 3.4.7 + PostCSS + Autoprefixer, custom `index.css:390` + `resume-print.css` | `tailwind.config.js` indigo scale, Sora+Inter |
| Build | Vite 5.4.21 + @vitejs/plugin-react 4.3.1 | `vite.log: ready in 2828ms` |
| Backend | FastAPI ≥0.115, Uvicorn ≥0.30, Pydantic ≥2.7, pydantic-settings ≥2.4 | `backend/requirements.txt:10` |
| AI SDK | google-genai ≥1.0 (lazy import), httpx ≥0.27 for Zen | `gemini_service.py:276,352` |
| Parsing | pypdf ≥4.0, python-docx ≥1.1, python-multipart ≥0.0.9 | `resume_service.py:132,158` |
| Tests | pytest ≥8.0 (`pytest.ini:testpaths=tests`), `node --test` zero-dep | `backend/tests/*`, `frontend/tests/*` |
| Fonts | Inter 400-800 + Sora 600-800 via Google | `index.html` |
| Runtime observed | Node 24.19.0 / npm 11.17.0 / Python 3.14.3 | `bash --version` |
| Ports | Frontend 5173 (proxy `/api→8000`), Backend 8000, Preview 4173 | `vite.config.js`, `server.err.log` |

---
## 5. Repository Structure & File Map
```
placement preparation ai/
├── README.md (185 lines, STALE Node narrative — keep for intent, not stack)
├── .gitignore (node_modules,dist,.env,*.log,backend/uploads/*)
├── backend/
│   ├── .env (REAL, git-ignored: GEMINI_*,ZEN_*,ALLOWED_ORIGINS — never commit)
│   ├── .env.example (10 lines template)
│   ├── .gitignore (.env,__pycache__,pytest_cache,*.pyc,.venv)
│   ├── pytest.ini (testpaths=tests)
│   ├── requirements.txt (10 pins)
│   ├── server.log (38 access) + server.err.log (22 app+provider)
│   ├── app/__init__.py (empty)
│   ├── app/main.py (36: FastAPI+CORS+3 routers+health+error handler)
│   ├── app/config.py (47: Settings + allowed_origins_list + gemini_model_candidates)
│   ├── app/schemas.py (55: Track/Difficulty/GenerateRequest/GeneratedQuestion)
│   ├── app/routes/auth.py (115: USER_STORE,TOKEN_STORE,register/login/me)
│   ├── app/routes/questions.py (79: rate-limit+POST /generate)
│   ├── app/routes/resumes.py (127: RESUME_STORE+upload/list/detail/re-analyze)
│   ├── app/services/gemini_service.py (532: taxonomy,prompt,backoff,JSON salvage,repair,Gemini+Zen)
│   ├── app/services/resume_service.py (409: extract+detect+score+roles)
│   └── tests/conftest+test_auth/health/generate/gemini_service/orchestration/provider_resilience/resumes/zen_fallback
├── frontend/
│   ├── .env (VITE_API_URL=http://localhost:8000/api)
│   ├── .env.example (# unset → proxy)
│   ├── package.json (scripts dev/build/preview/test)
│   ├── vite.config.js (host 0.0.0.0:5173, proxy /api→8000)
│   ├── index.html (title PlacementPrep, Inter+Sora, #root)
│   ├── tailwind.config.js (primary indigo, glass/card/glow shadows, fade-up/float/drift/shimmer)
│   ├── src/main.jsx (StrictMode<App/>)
│   ├── src/App.jsx (109: 5 public + 15 student + 5 admin + 404)
│   ├── src/services/api.js (164: axios+resolveBase+interceptors+12 API groups)
│   ├── src/context/AuthContext.jsx (97: token/user localStorage, login/register/me/logout)
│   ├── src/utils/helpers.js (51), markdown.js (95), aiQuiz.js (45)
│   ├── src/components/ (27: StudentLayout,AdminLayout,Navbar,Sidebar,Aurora,AuthShell,GlassCard,Button,PageHeader,StatCard,ScoreRing,ProgressBar,Modal,LoadingState,EmptyState,Reveal,SearchBar,FilterPanel,SkillBadge,EventCard,CategoryCard,MarkdownText,AiDisclaimer,AiQuizGenerator,ProtectedRoute + resume/ResumeTemplates 761)
│   ├── src/pages/ (22: Landing,Login,Register,Dashboard,Profile,Settings,ResumeAnalyzer,ResumeStudio 719,ResumeResult,SkillGap,CareerRoles,Aptitude,TechnicalPractice,Quiz 291,QuizResult,Interview 301,Progress,Events 334,EventDetails 363,MyEvents 349,AiQuestionGenerator,GeneratedQuiz)
│   ├── src/pages/admin/ (5: AdminDashboard 206,Students 344,Questions 585,Categories 168,Analytics 247)
│   └── tests/aiQuiz,helpers,helpersExtended,markdown.test.js
└── docs/capture_screens.py + screenshots/11 PNGs
```
Missing on disk (referenced in README): `PROJECT_DOCUMENTATION_REDESIGNED.md,VIVA_GUIDE.md,DEMO_SCRIPT.md,backend/seed/seed.js,backend/src/server.js,ADMIN_ROUTES_SNIPPET` content — this file supersedes them.

---
## 6. Backend Core
### 6.1 `app/main.py:1-36`
`FastAPI(title="Placement Prep AI Question Generator")`; `CORSMiddleware(allow_origins=settings.allowed_origins_list(), allow_credentials=True, allow_methods=["*"], allow_headers=["*"])`; `include_router(auth,"/api"),(questions,"/api"),(resumes,"/api")`; `exception_handler(HTTPException)→{message,detail}` both `str(detail)` so React reads `.message`; `GET /api/health→{status:ok}`. No DB connect, no static, no versioning.

### 6.2 `app/config.py:1-47`
`Settings(BaseSettings, env_file=".env", extra="ignore")`: `GEMINI_API_KEY ""`, `GEMINI_MODEL gemini-3-flash-preview`, `GEMINI_FALLBACK_MODELS gemini-3.1-flash-lite,gemini-3.7-flash,gemini-3.8-flash`, `ZEN_API_KEY ""`, `ZEN_MODEL mimo-v2.5-free`, `ZEN_BASE_URL https://opencode.ai/zen/v1`, `ALLOWED_ORIGINS ...:5173`, `REQUEST_TIMEOUT 60.0`, `RATE_LIMIT_MAX 10`, `RATE_LIMIT_WINDOW 600`. `allowed_origins_list()` splits CSV, dedupes, always appends `localhost/127.0.0.1/0.0.0.0/[::1]:5173`. `gemini_model_candidates()` returns `[primary]+fallbacks` deduped.

### 6.3 `app/schemas.py:1-55`
`Track=Literal[technical,aptitude]`, `Difficulty=Literal[Easy,Medium,Hard,Mixed]`; `GenerateQuestionsRequest{track,topic[2,120] stripped non-blank,difficulty,count[1,15]}`; `GeneratedQuestion{question non-blank,options[4,4] unique non-empty,correctAnswer[0,3],explanation non-blank}`; `QuestionsData{questions[]}`, `GenerateQuestionsResponse{data}`. Failures → auto `422`.

### 6.4 Middleware & Cross-Cutting
Only CORS + HTTPException handler. No auth/session/rate-limit middleware — auth inline per-route (`_current_user`), rate-limit inline (`check_rate_limit`), timeout inline (`asyncio.wait_for`). `OPTIONS *→200` via CORS preflight (seen in `server.log`).

### 6.5 Complete Error Matrix
| Source | HTTP | Message | File |
|---|---|---|---|
| Pydantic | 422 | FastAPI body | auto |
| Register dup | 409 | User already exists. | `auth.py:74` |
| Login bad | 401 | Invalid email or password. | `auth.py:98` |
| Missing Bearer | 401 | Missing bearer token. | `auth.py:108,resumes.py:35` |
| Bad token | 401 | Invalid or expired session. | `auth.py:113` |
| Local rate-limit | 429 | Rate limit exceeded. Try again later. | `questions.py:57` |
| Upstream throttle | 429 | AI is busy right now. Please wait... | `gemini→questions.py:66` |
| Timeout 60s | 504 | Request timed out. Please try again. | `questions.py:64` |
| Provider/config | 502 | AI provider failed. Please try again later. | `questions.py:73` |
| Resume ext/size/empty | 400 | Only .pdf.../File must be under 5MB./File is empty. | `resumes.py:56` |
| Resume unreadable | 400 | Could not read any text...not a photo scan | `resumes.py:76` |
| Resume other/missing | 404 | Resume not found. (intentional, no 403) | `resumes.py:111` |
| No route | 404 | {"detail":"Not Found"} e.g. /api/dashboard,/favicon.ico | Starlette |

---
## 7. Feature 1 — Authentication & Session Management
**Purpose:** Let students self-serve accounts; recognise admins; guard student/admin routes; attach Bearer to every private call.
**Users:** Students, Admins (`admin@*`), Visitors (login/register public).
**Frontend:** `src/pages/Login.jsx:121` (email+password, show toggle, `redirect`/`state.from` handling, role redirect `admin→/admin` else `/dashboard`), `src/pages/Register.jsx:160` (8 fields name/email/password/college+degree/dept/year/phone, `password≥6`, grid sm2), `src/context/AuthContext.jsx:97` (`user,token,loading`, mount restore `localStorage`, `persist()`, `fetchMe/login/register/logout/updateUser`), `src/components/ProtectedRoute.jsx` (`loading→LoadingState`, `!token→/login state.from`, `adminOnly&&role!==admin→/dashboard`), `src/components/AuthShell.jsx:37` (centered GlassCard, error `role=alert`), `src/services/api.js` (request adds `Bearer`, 401 clears + hard redirect unless `/login`).
**Backend:** `POST /api/auth/register:70-90` (normalize lower/strip, 409 if exists, `id=token_urlsafe(8)`, `passwordHash=sha256`, `role=admin if startswith admin@ else student`, `token=token_urlsafe(32)`, `{token,user sanitized}`), `POST /api/auth/login:93-101` (hash compare, 401 else new token), `GET /api/auth/me:104-115` (Bearer parse, 401s). Stores `USER_STORE[email]`, `TOKEN_STORE[token]=email` in-process, lost on restart. `_sanitize_user` pops hash.
**Validation:** Pydantic name[2,120]/email[3,200] must contain @/password[6,128]/college[2,200] + optional stripped→None.
**Security notes:** Demo-grade SHA256 unsalted, no expiry, `localStorage` XSS-stealable, prefix-admin spoofable — must become bcrypt/argon2 + short JWT + HttpOnly cookies + blocklist + login rate-limit before production. Keys never involved here.
**Errors:** 409/401/422 as §6.5; frontend `getErrorMessage` joins `message/detail/hint/code`.
**Tests:** `test_auth.py:2` (register→me→role student→no password leak; bad password 401), `test_provider_resilience` 401 path, frontend `helpersExtended` base-url.
**Demo:** Register student → `/dashboard`; register `admin@college.edu` → `/admin`; logout → `/login`; direct `/dashboard` anon → redirect login.

---
## 8. Feature 2 — AI Question Generation
**Purpose:** Single AI endpoint powering all practice: given track/topic/difficulty/count, return validated MCQs with explanations, resilient to quota/downtime.
**Users:** All (public `/ai-question-generator`, `/generated-quiz`; student `/quiz?mode=ai`, `/aptitude`, `/technical`).
**Contract:** `POST /api/questions/generate` public + IP rate-limited. Request `{track:technical|aptitude, topic:2-120 non-blank, difficulty:Easy|Medium|Hard|Mixed, count:1-15}`. Response `{data:{questions:[{question,options[4 unique non-empty],correctAnswer 0-3,explanation}]}}`.
**Frontend callers:** `questionGeneratorAPI.generate()` + `quizAPI.generate()` (same endpoint), `AiQuestionGenerator.jsx:76` (TRACKS technical/DSA… + aptitude Quant…, COUNTS 5/10/15, validates `trim≥2` else `Please enter topic`), `AiQuizGenerator.jsx:80` (`type` prop, COUNTS 5/8/10, `navigate /quiz?mode=ai&type&topic&count&difficulty`), `Quiz.jsx:291` (clamps count 1-10, `track=technical?technical:aptitude`, timer, `buildAiQuizAttempt→local-*`), `GeneratedQuiz.jsx:62` (validates topic, `correctIndex` tolerates `correctAnswer|correct_answer|answer|findIndex`, local grading + review).
**Backend route `questions.py:52-79`:** `_client_ip` prefers `x-forwarded-for[0]`; `check_rate_limit` fixed-window prune `10/600s`; `429` if exceeded; `await wait_for(generate_questions_service,60s)` → `504` on timeout; map `RateLimitError→429 busy`, `ProviderError→502 failed`.
**Prompt `build_prompt:65-75` (verbatim):** `Generate exactly {count} placement-practice multiple-choice questions. Track: {track}. Topic: {topic}. Difficulty: {difficulty}. Return JSON only with shape {"questions": [{"question": str, "options": [four unique non-empty strings], "correctAnswer": 0-3 index into options, "explanation": str}]}. Every question must have exactly 4 distinct non-empty options, a correctAnswer integer between 0 and 3, and a one-to-two sentence explanation.` Zen adds `Return ONLY raw JSON, no markdown fences, no preamble, no commentary.` + system `You are a placement exam setter.` + `response_format json_object, temperature 0.7, max_tokens 4096`. Gemini uses SDK structured output `response_mime_type application/json + response_schema _GeminiQuestionList`.
**Models:** Implemented: `GEMINI_MODEL gemini-3-flash-preview` + fallbacks `gemini-3.1-flash-lite,gemini-3.7-flash,gemini-3.8-flash` (pool failover on 429/NOT_FOUND/404, log `quota_failover next=`); `ZEN_MODEL mimo-v2.5-free` at `{ZEN_BASE_URL}/chat/completions` OpenAI-compat (`Bearer ZEN_API_KEY`, `httpx timeout 15`). Spec-only (README, no code): Pollinations `gpt-oss-20b` free ~1req/15s, HF router `Llama-3.1-8B→Qwen2.5→gemma→Mistral` (402 when empty), Groq/OpenRouter/Ollama/custom — document as provider cards with `Status: Spec`.
**Resilience `_attempt_provider:419-491`:** 3× transient backoff `min(2^(n-1),8)+jitter0-0.5` (~1s,2s,4s) on `RateLimit|Transient|generic`; fail-fast on `ProviderError` (401/403/404/410/auth/config); 2× validation repair via `_auto_repair_and_validate`; logs only `provider,model,attempt,error class,latency_ms` (never keys). `_classify_sdk_error:122-151` maps `429/RATE_LIMIT/RESOURCE_EXHAUSTED→RateLimit`, `500/502/503/504/OVERLOAD→RateLimit`, `400/401/403/404/410/AUTH→Provider`, `TIMEOUT→Transient`. `_loads_json_lenient:83-119` strips, fence-strips ```json, salvages outermost `{...}`, raises `ValueError` never raw. `repair_question_item:154-218` dedupes, pads with `None/All/Cannot/Implementation dependent`, normalizes `int|"0"-"3"|A-D|option-text`, synthesizes explanation.
**Orchestrator `generate_questions_service:494-532`:** `has_gemini/has_zen` from keys; neither→`ProviderError not configured`; try gemini, save error; try zen (RateLimit→raise, Provider→raise); else re-raise.
**Errors:** 422 (8 cases tested: `hr,x,blank,Extreme,0,16,121chars,lowercase medium`), 429 local + upstream, 504, 502. Frontend timeout `ECONNABORTED→Request timed out...smaller set`.
**Tests:** `test_generate.py:5` (shape, 422 matrix, all 2×4 combos, 11th→429, Provider→502), `test_gemini_service:4`, `test_orchestration:5`, `test_provider_resilience:6`, `test_zen_fallback:3` — all mocked, assert backoff counts, fence salvage, no-key-leak.
**Viva line:** AI down? Gemini pool → Zen → 429/502 generic without leaking; resume still works offline.

---
## 9. Feature 3 — Resume Analyzer (Flagship)
**Purpose:** Upload resume → instant scores + gaps + roles + coaching without AI key.
**Route:** `/resume` (list + dropzone) → `/resume/:id` (detail). Auth: student Bearer.
**Frontend `ResumeAnalyzer.jsx:194`:** `ACCEPTED .pdf,.docx,.txt, MAX 5MB, STAGES[Uploading,Reviewing,Checking]`, `dragOver/fileError/uploading/stage/list/loadingList/listError`, `fileRef`, `validate ext+size`, `FormData resume→resumeAPI.upload→saved._id?navigate /resume/:id`, dropzone `role=button` keyboard accessible, past grid `sm2 Link GlassCard fileName Score/100 date`, Refresh. `ResumeResult.jsx:235` (`useParams id`, `getById/analyze`, `asStrings`, `reanalyzing/notice`): header Back + Re-analyze, `ScoreRing Overall + ATS & Breakdown (Skills/Projects/Education/Experience/Formatting ProgressBars)`, Strengths emerald / Weaknesses rose, `SkillBadge` + Missing with priority, Roles `match% + prep + Needs`, Improvements + Interview Topics, `AiDisclaimer`. `api.js:resumeAPI{upload multipart,list,getById,analyze}`.
**Backend `resumes.py:127`:** `MAX_BYTES 5MB`, `ALLOWED_EXTS{.pdf,.docx,.txt}`, `RESUME_STORE[id]=record`. `_current_user` Bearer→401s. `_public` strips `_*/owner`, re-adds `_id+id` (frontend navigates `saved?._id`). `_validate_file` 400s. `POST /upload` (field `resume`): auth→`read()`→validate→`extract_text()`→blank?400 `not a photo scan`→`analyze_resume_text()`→`rid=token_urlsafe(8)`→`record{_id,id,fileName,createdAt:utcnow_iso(),owner/_owner:email,_text,**analysis}`→`{data:public}`. `GET ""+/` alias (sorted desc, owner filter), `GET /{id}` (404 not 403), `POST /{id}/analyze` deterministic re-run.
**Parsing `resume_service.py:125-185` (Python equiv of pdf-parse/mammoth):** `extract_txt` utf-8 ignore; `extract_docx` python-docx paragraphs else zip `word/document.xml` `}t` nodes; `extract_pdf` pypdf pages else regex `\(([^)]{3,})\)` latin-1 `[:20000]`; dispatcher by ext. Never crashes; blank → 400.
**ATS Scoring `analyze_resume_text:212-405` — step-by-step:**
1. *Tokenize:* `words=re[A-Za-z][A-Za-z0-9+#.]*`, `wordCount=len`.
2. *Skills:* `SKILLS_MAP 60` (python→Python…testing→Testing, special `C` regex `(?<![\w+#])c(?![\w+#])`), word-boundary search (java≠javascript), dedupe.
3. *Signals:* `has_email/phone/linkedin/github/education(b.e|b.tech|bachelor|master|university|cgpa)/experience(intern|worked|company)/projects(built|portfolio)/skills_section`, `bullets=^[-*•|\d+\.]`, `action_hits` 12 verbs.
4. *Section scores:* `skills=min(95,25+7*n) else 20`; `projects=85 if (has_projects&&bullets≥3) else 65/30`; `education=85/30`; `experience=80 if (has&&actions≥2) else 60/35`; `formatting=50+12email+8phone+10links+10skills_section+10(250≤w≤1200 else 4 if w>80) cap95`.
5. *ATS:* `40+12email+6phone+10skills_section+8edu+8exp+6proj+5(w≥150)+5(skills≥5) cap97`.
6. *Overall:* `round(.28skills+.22proj+.20exp+.15edu+.15fmt) clamp[25,97]`.
7. *Roles `ROLE_TEMPLATES 6×8` (FullStack[JS,React,Node,HTML,CSS,SQL,Git,REST], Backend[Python,FastAPI,SQL,Mongo,Docker,Git,REST,Testing], Frontend[JS,React,HTML,CSS,Tailwind,Git,Testing,REST], DataSci[Python,Pandas,NumPy,ML,SQL,Scikit,Excel,Tableau], MLE[Python,ML,DL,PyTorch,TensorFlow,SQL,Docker,Git], DevOps[Linux,Docker,K8s,AWS,Bash,Git,Testing,Python]):* `pct=matched/8`, sort desc top3; `missing` union cap8 with `priority_cycle[High,High,Medium×3,Low×3]`, `reason Required for {top1}...`; `recommendedRoles[{role,matchPercentage,requiredSkills,missing[:5],preparation}]`.
8. *Coaching:* strengths cap6 (breadth/projects/verbs/links), weaknesses cap6 + improvements cap7 paired (email/phone/edu/exp/proj/skills<5/words<150/links/bullets<3/gaps), `interviewTopics=skills[:6]+missing[:4] cap8`, `summary Detected {n} skills in {w} words. Best fit: {role} ({pct}%). Top gaps...`, `breakdown{5}`.
*Worked example:* sample TXT (Python,FastAPI,JS,React,SQL,Mongo,Docker,Git,REST,Testing + edu+intern+3 bullets+links+phone) → ATS ~97, overall high-80s.
**Errors:** 400 ext/size/empty/unreadable, 401, 404. Frontend mirrors MAX.
**Tests:** `test_resumes.py:7` (scores+ids, bad ext 400, empty 400, Alice/Bob isolation + slash alias equal, owner 200/other 404, reanalyze deterministic, never-leak email on 4 endpoints).
**Demo:** Upload TXT → scores → Re-analyze same → open Skill-Gap/Career-Roles (latest resume).

---
## 10. Feature 4 — Resume Studio (Local Builder)
**Purpose:** Build a printable resume without server: 3-step Upload→Details→Design, 3 templates, accent picker, localStorage saves, `window.print` A4.
**Route:** `/resume-studio` student. Largest page `ResumeStudio.jsx:719`, local-only (reserved `studioAPI generate-design/list/get/remove` unused).
**Data:** `ResumeData{name,title,email,phone,location,website,linkedin,summary,experience[{role,company,duration,location,bullets[]}],education[{degree,school,year,details}],skills[],projects[{name,link,bullets[]}],certifications[],design{layout,accentColor,fontStyle,sectionOrder[]}}`; `DEFAULT_ACCENT #6366f1`, `STORAGE_KEY resume-studio-designs`, `ACCEPT png/jpg/webp/pdf 5MB` (local parse only).
**Flow:** Step1 Upload (dashed GlassCard, Continue/Skip) → Step2 Details (contact grid sm2 8 fields + Experience/Education/Projects Add/Remove rows, bullets newline, Back/Continue, profile prefill name/email/phone/college) → Step3 Design (radiogroup templates, accent color, Save design→localStorage, Download PDF→`window.print`, `#resume-print-root Preview`, Back/Download) + Saved grid (Refresh/Open/Delete + Delete Modal).
**Templates `resume/ResumeTemplates.jsx:761`:** `TEMPLATES{modern,classic,minimal}`, `TEMPLATE_NAMES`; helpers `safeArr/safeStr/bulletsOf/getSectionOrder/accentOf/contactParts/Sheet`; Modern two-col `1fr 200px` sidebar + timeline pills; Classic centered serif double rule; Minimal airy hairlines monochrome. All defensive (skip empty), print classes `rt-section/rt-avoid/rt-heading`. `resume-print.css`: `@page A4 10mm`, `@media print` hides `body *` except `#resume-print-root`, exact colors, avoid breaks, no shadows.
**State:** `useState` only, `hydrate/normalize/applyProfile/loadLocal/persistLocal`, `skillsText/certsText` sync. No network, no auth beyond layout.
**Viva:** Why local? Zero PII upload, instant, printable; server design endpoint reserved for future AI layout.

---
## 11. Feature 5 — Skill-Gap View
**Purpose:** Answer “what am I missing?” from latest resume.
**Route:** `/skill-gap` student. File `SkillGap.jsx:136`.
**Logic:** `resumeAPI.list→latest sort createdAt desc`; `missing=missingSkills||[]`; `existing=skills`. `priorityStyle high→rose, medium→amber, low→emerald else slate` pills via `cn`.
**UI:** loading/error; `!resume→EmptyState GitBranch Analyze→/resume`; else `PageHeader Skills + GlassCard Existing badges + Missing (n) grid md2 GlassCard priority pill + current/target/reason` (strings → `Suggested medium`), `0→AlertTriangle No gaps`.
**Backend:** Same `/resumes` list; no extra endpoint. Deterministic (re-analyze same).
**Demo:** Upload → open Skill-Gap → see `High: Docker for Backend...` → learn → re-upload → gap shrinks.

---
## 12. Feature 6 — Career Roles View
**Purpose:** Answer “where do I fit best?” Top-3 roles with match% and prep.
**Route:** `/career-roles` student. File `CareerRoles.jsx:126`.
**Logic:** Same latest-resume fetch; `recommendedRoles,fileName`; `asStrings` tolerant.
**UI:** loading/error; `0→EmptyState Briefcase Analyze`; else `PageHeader Careers + grid md2 GlassCard hover Briefcase tile + match% pill + ProgressBar Role match + Strong in emerald CheckCircle2 + To improve amber XCircle + How to prepare box`.
**Data:** From `ROLE_TEMPLATES` scoring (§9 step 7). Example: FullStack 75% (6/8), missing `[Docker,SQL]` etc.
**Demo:** Show 3 cards, expand prep `Build 2 full-stack...`.

---
## 13. Feature 7 — Aptitude & Technical Launchers
**Purpose:** One-click entry to AI practice with sensible defaults.
**Routes:** `/aptitude` (`Aptitude.jsx:16`), `/technical` (`TechnicalPractice.jsx:16`) student. Each: `PageHeader (Practice/Aptitude Practice, CS fundamentals...)` + `<AiQuizGenerator type=aptitude|technical>`.
**Component `AiQuizGenerator.jsx:80`:** `topic/count5/difficultyMixed` states; `COUNTS[5,8,10] DIFFICULTIES[Mixed,Easy,Medium,Hard]`; placeholder conditional (`Quant...` vs `DSA...`); `handleGenerate→navigate /quiz?mode=ai&type&topic&count&difficulty`; UI `GlassCard glow Sparkles AI Questing/Powered by Gemini + NEW + topic input max120 + selects + Button Wand2 Generate`.
**No API/state here** — delegates to Quiz runner. Keeps pages tiny and testable.

---
## 14. Feature 8 — Quiz Runner, Generated Quiz, Quiz Result
**Purpose:** Timed AI attempt → instant grading → per-question review. Three paths, all client-graded (server only supplies questions).
### 14.1 Path A/B — `/quiz?mode=ai&type&topic&count&difficulty&category` (`Quiz.jsx:291` student)
- *Guards:* `mode!==ai→Navigate /ai-question-generator`; loading `Gemini crafting`; error Back.
- *Start:* `track=type technical?technical:aptitude`, `topicText=resolveTopic(topic,category)`, `body{track,topic,count clamp1-10,difficulty}` → `questionGeneratorAPI.generate POST` → `generated=res.data?.data?.questions||[]`; `source/fallback/hint` retained for future bank fallback (currently always AI).
- *Attempt:* `questions,current,selected{},review{},elapsed (interval 1s),confirmOpen,submitting,submitError`; header `aiTopic/category·difficulty + AI-generated Sparkles + answered count + Timer`; grid `1fr 220px` question `Q n + marked + Markdown inline + options ABCD radiogroup active indigo + Prev/Mark/Next-Submit` + Navigator `grid5 buttons emerald answered + review dot + Submit Test` + Modal `Answered/unanswered/time + Keep/Confirm`.
- *Submit:* `buildAiQuizAttempt({questions,selected,elapsed,category,difficulty,type})→navigate /quiz-result/local-Date.now state{result}`.
### 14.2 Path C — `/ai-question-generator` (public `AiQuestionGenerator.jsx:76`) → `/generated-quiz?...` (public `GeneratedQuiz.jsx:62`)
- *Form:* `TRACKS[technical DSA...,aptitude Quant...] DIFFICULTIES[Easy,Medium,Hard,Mixed] COUNTS[5,10,15]`; `track technical,topic,difficulty Medium,count5`; validate `trim≥2` else `Please enter topic`; `navigate /generated-quiz?track&topic&difficulty&count`; UI standalone `AuroraBackground max-w4xl BrainCircuit + eyebrow Google AI + form radio cards + selects + Generate + perks`.
- *Runner:* `useSearchParams`; `if !trim→No topic`; `POST generate`; timer; `correctIndex(q)=correctAnswer??correct_answer??answer??findIndex`; submitted view `CheckCircle2 Practice complete score/len time + review GlassCards Your/Correct + Markdown explanation + AiDisclaimer + Generate another`.
### 14.3 Scoring `utils/aiQuiz.js:45`
`buildAiQuizAttempt`: per item `selectedAnswer=selected[i]??-1`, `correctAnswer=item.correctAnswer??answer??0`, `isCorrect===`, `questionId{question,options,explanation,correctAnswer}`; `correctCount,total=reviewed.length||1,score=round(correct/total*100)` → `{category,difficulty,type,questions[{questionId,selectedAnswer,correctAnswer,isCorrect}],correctCount,wrongCount,totalQuestions,accuracy:score,timeTaken:elapsed,score}`.
### 14.4 Result `/quiz-result/:id` (`QuizResult.jsx:154` student)
`location.state.result` if `local-*` else `GET /quiz/:id` (404 on Python). UI: `Link /progress All results + h1 + category·difficulty·type + grid lg2 ScoreRing correct/total + time + grid2 StatCards Correct/Wrong/Accuracy/Time + Answer Review ol GlassCard emerald/rose Check/X + Markdown inline + options grid correct emerald/your pick rose + Why explanation + AiDisclaimer`.
### 14.5 History/Progress hook
`Progress.jsx` does `Promise.all(history,dashboard)` — both 404 on Python; falls back to `dash` stats; when legacy Node present computes `tests,questions=sum(total),avg=mean,best=max`, `BarChart` last10 + table `Category/Difficulty/Score/Accuracy/Date/View`.
**Fairness note:** README Q8 (server hides answers) applies to Node design; Python as-built ships answers to browser — flag; fix via `POST /quiz/submit` server-graded.
**Tests:** `aiQuiz.test.js:2` (50% case, `answer` fallback).

---
## 15. Feature 9 — Mock Interview
**Purpose:** Role-targeted Q&A + AI feedback + history.
**Route:** `/interview` student. File `Interview.jsx:301`.
**Frontend contract `interviewAPI`:** `start(data)→POST /interview/start {role,difficulty,interviewType,count}`, `submit/answer→POST /interview/submit {sessionId,answers[{questionIndex,answer}]}`, `history→GET /interview/history`, `getById→GET /interview/:id`.
**Flow:** Form `role* (e.g. Frontend Developer), difficulty Medium, interviewType technical/hr/mixed, count5` → validate `role.trim` else `Please enter target role` → `start()` → `session+answers[]`; list `session.role·difficulty·type`, `Q{i+1} [category]`, `textarea` (or read-only if `completed=status completed||feedback`); `submit()` → `session updated` + refresh history; feedback `session.feedback{overallScore,summary,strengths[],improvements[],detailed[{questionIndex,score,feedback}]}` → `ScoreRing + grids`; sidebar History buttons `openHistoryItem(id)→GET→scroll top`, `EmptyState Mic` if none.
**Backend reality:** No `/interview/*` routes in `main.py` — all 404 on Python. Document as `Design (Node: aiService + scoring per-question rubric) vs Not implemented (Python)`. For viva, sketch prompt: `role+difficulty+type+history→next question + final rubric`.
**Demo (when backend restored):** Start Frontend/Medium/technical/5 → answer → submit → feedback 78 → history.

---
## 16. Feature 10 — Dashboard & Progress Tracking
**Purpose:** At-a-glance readiness: scores, attempts, streak, prep bars, activity.
**Routes:** `/dashboard` (`Dashboard.jsx:206`), `/progress` (`Progress.jsx:177`) student.
**Frontend expectation `dashboardAPI.get→GET /dashboard` (flat):** `{resumeScore,avgScore|averageScore,questionsAttempted,streak,preparationProgress{aptitude,interviews,resume},categoryPerformance[{category,avgAccuracy,tests}],recentActivity|activity[{_id,title|action,score,date|createdAt}]}` + tolerant nested `{stats,resume,progress}`. Derived: `stats, resume{score/summary}, prep, techAvg (first /tech/ or non-quant), progress{aptitude,technical,interview,resume}, activity`.
**Dashboard UI:** loading `LoadingState+Skeleton`; `PageHeader Overview greeting,name`; error alert; stats `sm2 lg4 Reveal stagger70 StatCards Resume/Questions/Average/Streak`; grid `lg2` resume health `ScoreRing + Re-analyze/Analyze /resume` + prep `ProgressBars`; QuickActions `sm2 lg4` tiles `/resume,/aptitude,/technical,/interview`; RecentActivity `EmptyState Analyze→/resume` or `ul divide 6 formatDate`.
**Progress UI:** `BarChart{data,valueKey,labelKey,suffix}` normalized by max; `useEffect Promise.all(history,dashboard)`; `stats{tests,questions,avg,best,streak} memo`; `PageHeader Tracking + grid sm2 lg5 StatCards Total Tests/Questions/Avg/Best/Streak + Empty Practice→/aptitude or grid lg2 Score History/Category BarCharts + Recent table Category/Difficulty/Score/Accuracy/Date/View→/quiz-result/:id`.
**Backend reality:** No `/dashboard` — `server.log: GET /api/dashboard 404×2`. Document aggregation design: `resumeScore=latest overall`, `avgScore=mean accuracy`, `questionsAttempted=sum total`, `streak=consecutive days`, `prep normalized 0-100`, `category group-by avg`, `recent union sorted desc limit6` → mark `To-build`. `AdminDashboard.jsx:19` notes per-user limit.
**Demo:** Register → dashboard empty → upload+quiz → refresh → bars/activity fill (once backend added; currently shows fallback).

---
## 17. Feature 11 — Events, Event Details, My Events
**Purpose:** Campus events discovery, registration, certificates — fullest CRUD example (expects Node backend).
**Routes:** `/events` (`Events.jsx:334`), `/events/:id` (`EventDetails.jsx:363`), `/my-events` (`MyEvents.jsx:349` self-guard `!auth→/login?redirect=/my-events`) student.
**APIs `eventsAPI/registrationsAPI/certificatesAPI`:** `list(params)→GET /events?limit&category&type&sort`, `categories→GET /events/categories`, `get→GET /events/:id`, `register→POST /events/:id/register`, `mine→GET /registrations/mine`, `remove→DELETE /registrations/:id`, `certs mine→GET /certificates/mine`.
**Events list:** `search+filters{category,college,type,sort}+events+categories+total+visible+loading+error` synced `?q&category`; `load params limit100 + category/type featured|upcoming|past + sort → Promise.allSettled list+categories → normalize`; `colleges memo Set`; `filtered memo search+college+dateType+sort recent/popular/upcoming`; UI `PageHeader Community + My Events TicketCheck + SearchBar max-w2xl + FilterPanel(CATEGORIES 8,TYPES 7,SORTS 3) + Category grid2/sm4/lg7 active toggle + Skeleton/error Retry/clear Empty or Showing shown/filtered + grid1/sm2/lg3 Reveal40 EventCard + Load more PAGE_SIZE9`. Helpers `normalizeList/normalizeCategories/getDateValue/getPopularity/startOfDay/matchesDateType`.
**EventCard.jsx:102:** defensive picks `_id/id,title/name,college/organizer.college,venue/location,date/startDate,category/type,image/registered/limit/pct/spotsLeft/isFull/featured`; `Link /events/:id glass-card-hover h44 img lazy hover scale + overlay + pills + p4 title line-clamp1 + Calendar/MapPin/Users + bar-fill`.
**Details:** `normalizeOne`; `event,loading,error,registered,registering,message` auto-clear 3.5s; `GET /events/:id`; check `mine→registered`; `handleRegister !auth→login?redirect else POST→count+1 success/already→registered else error`; `handleShare clipboard`; derived `title/college/organizer/venue/date/time/deadline/limit/count/spots/isFull/category/description/rules/image/pct/info[7]`; UI `Back + PageHeader + hero h64/sm80 + Share + grid lg3 About whitespace-pre + Rules BadgeCheck + Info tiles + sticky register ring-glow seats/pct/message/Register disabled registering|registered|full`.
**MyEvents:** `regs,certs,loading,error,selectedCert,cancelTarget,cancelling,actionError`; `Promise.allSettled mine`; `handleCancel DELETE→filter`; UI `PageHeader + Registrations TicketCheck grid + Certificates Award grid + Modal Cancel + Modal Certificate dashed gradient`.
**Backend reality:** No `/events|/registrations|/certificates` on Python — 404. Keep as aspirational; viva: explain pagination, URL-synced filters, optimistic register.
**Components:** `SearchBar.jsx:40` (form glass + clear X + submit), `FilterPanel.jsx:105` (selects Category/College/Date-Type/Sort + Reset), `CategoryCard.jsx:44` (CATEGORY_ICONS Symposium→Sparkles etc, active ring-glow).

---
## 18. Feature 12 — Admin Suite
**Guard:** `ProtectedRoute adminOnly` (`token + role===admin` else `→/dashboard`); `AdminLayout.jsx:139` (topbar `ShieldCheck ADMIN + Student view /dashboard + user + Logout`, links 5: Dashboard, Students, Questions, Categories, Analytics, mobile overlay, `nav-active-dot`).
### 18.1 `/admin` (`AdminDashboard.jsx:206`)
Combines `dashboardAPI + GET /users limit100 + GET /questions limit1` (`Promise.allSettled`) → `studentsTotal/Active/Sampled,bankTotal`; UI `h1 + error + 6 StatCards Total Students/Active/Questions/Total Tests/Avg Score/Avg Resume + grid lg2 Recent Activity Empty or 6 + Manage shortcuts + questionsAttempted/best`. Notes per-user dashboard limit.
### 18.2 `/admin/students` (`Students.jsx:344`)
`GET /users?search&page&limit LIMIT10` (debounce 400 reset page) → `students,total`; `viewStudent GET /users/:id→Modal dl Name/Email/Role/College/Degree/Dept/Year/Phone/CareerGoal/Joined/Bio/Skills/Status`; `toggleStatus PATCH /users/:id/status→isActive`; UI Search pl9 + Desktop table `hidden md Name/Email/College/Status/Joined/Actions Eye/UserCheckX` + Mobile cards + Pagination + `StatusBadge`.
### 18.3 `/admin/questions` (`Questions.jsx:585` largest admin)
`questionAPI list/create/update/remove`; `LIMIT15 TYPES[aptitude,technical,hr,interview] DIFFICULTIES[Easy,Medium,Hard] KNOWN 13`; `EMPTY_FORM{question,options4,correct0,explanation,category,type aptitude,difficulty Medium}`; deep-link `?category`; debounce search; `GET /questions?page&limit&...`; `setFilter/openCreate/openEdit/setOption/save(validate 4+category→POST/PUT)/delete soft`; UI header total + Add, Filters Search/Category/Type/Difficulty + Clear, `ul GlassCard pills + question + options grid correct emerald + explanation + Edit/Delete + Pagination + Modal form max70vh textarea/options/correct/difficulty/type/category datalist/explanation + Modal delete`.
### 18.4 `/admin/categories` (`Categories.jsx:168`)
`KNOWN 13 {Quant,Logical,Verbal,DI,Programming,DSA,DBMS,OS,CN,OOP,WebDev,HR,Projects} mirrors seed.js`; `emptyBucket{total,Easy,Medium,Hard}`; `GET /questions limit500→buckets/extras custom`; UI header total + Add→questions, Info no separate endpoint, cards `grid sm2 lg3 type pill + total + Easy/Med/Hard + Manage→/admin/questions?category=`.
### 18.5 `/admin/analytics` (`Analytics.jsx:247`)
`allSettled dashboard+history+GET /questions limit200+GET /users limit1→bankByType sorted,totals`; `categoryPerf/max/recent10 reverse/avg`; UI `h1 + 4 StatCards Students/Bank/Tests/Avg + grid lg2 Tests by Category Bar + Bank by Type Bar + Recent vertical bars h44 scoreColor title category% date`; local `Bar{label,value,max}`.
**Backend reality:** `GET /users`, `GET /questions` list, `POST/PUT/DELETE /questions`, `PATCH /users/:id/status` do NOT exist on Python (only `POST /questions/generate`). Admin pages will 404 until Node parity restored — state clearly; keep UI as spec.

---
## 19. Feature 13 — Profile, Settings, Landing, Layouts
**Profile `/profile` (`Profile.jsx:155`):** `userAPI getProfile/updateProfile`, `updateUser`; `form{name,college,degree,dept,year,phone,bio,skills string,careerGoal},email,loading,saving,msg`; load `getProfile→user||data` else `user` fallback, `skills array join`; submit `split→PUT→updateUser→msg`; UI `max-w2xl PageHeader + GlassCard alert + grid sm2 email readonly + 6 inputs + skills/careerGoal/bio textarea + Save`.
**Settings `/settings` (`Settings.jsx:70`):** `user/logout→/login`; `max-w2xl PageHeader + GlassCard User tile + Info Appearance dark default + Password disabled ghost coming soon (no backend) + Danger rose Logout`.
**Landing `/` (`Landing.jsx:176` public):** `Navbar` only; `features[6]{icon,title,text,accent}`, `steps[5]`, `stats[4]{80+ ATS AI 360°}`; hero `eyebrow sparkles + h1 Prepare Smarter gradient + CTAs /register Analyze + /login Start + stats grid2/sm4`; features `grid sm2 lg3 Reveal stagger90`; How it works `ol steps number circle + Start here Star`; final CTA `glow + CheckCircle2 Ready? + Create free account + ©2026`. No API/state.
**Login/Register** see §7. **NotFound `App.jsx`:** `AuroraBackground + eyebrow Lost + 404 gradient 7xl + Go Home`.
**Layouts:** `StudentLayout.jsx:22` (`Aurora+Navbar(onMenuToggle)+flex max-w-7xl Sidebar+main.page-enter Outlet`), `Sidebar.jsx:85` (12 links Dashboard→Settings, mobile overlay, `nav-active-dot`), `Navbar.jsx:71` (token? Menu+brand→dashboard + user pill + Logout→login : Login ghost + Get Started), `AuroraBackground.jsx:23` (grid 56px mask + 3 orbs blur120 drift), `AuthShell.jsx:37` (brand→/ + GlassCard glow page-enter title/sub/error/children/footer).

---
## 20. Cross-Cutting: Client, Utils, Design, Components
### 20.1 `services/api.js:164`
`axios.create({baseURL:resolveApiBaseUrl(),JSON,timeout 65000})` (65s just over 60s backend). `resolveApiBaseUrl(configured,hostname)`: configured trimmed→use; `localhost/127.0.0.1/[::1]→/api` (proxy); `0.0.0.0→http://localhost:8000/api`; else `/api`. Interceptors: request `Bearer`; response 401→clear + hard `/login` (unless there), 503 `DB_UNAVAILABLE` not logout (Node transient). `getErrorMessage(err,fallback)`: `ECONNABORTED→Request timed out...smaller set`; else `message||detail||fallback + details entries + hint + (code)`. Groups: `authAPI(login/register/me)`, `userAPI(getProfile/updateProfile/list/getById/toggleStatus)`, `resumeAPI(upload multipart/list/getById/analyze)`, `questionAPI(list/create/update/remove/publish)`, `quizAPI(start/submit/history/getById/generate→POST /questions/generate)`, `questionGeneratorAPI(generate)`, `interviewAPI(start/submit/answer/history/getById)`, `dashboardAPI(get→GET /dashboard)`, `eventsAPI/registrationsAPI/certificatesAPI/studioAPI(reserved)` + default `api`.
### 20.2 Utils
`helpers.js:51`: `cn`, `greeting(<12 morning,<17 afternoon else evening)`, `formatDate en-IN {day numeric month short year} else —`, `formatTime en-IN {hour minute}`, `scoreColor(≥75 emerald,≥50 amber else rose)`, `difficultyColor(easy emerald,medium amber,hard rose else slate)`. `markdown.js:95` (dependency-free, no `dangerouslySetInnerHTML`, raw HTML inert): `parseInline(code→bold→italic)`, `parseMarkdown(fence```lang,bullets [-*],ordered [1.)],para)` → `{t:code|ul|ol|para}`. `aiQuiz.js:45` see §14.3.
### 20.3 Design system `index.css:390 + tailwind.config.js`
`:root --accent #6366f1,--accent-2 #a855f7,--bg-0 #020617`; `body triple radial + linear #020617→#0b1128→#0d1526 fixed`; `.font-display Sora`, `.text-gradient white→#c7d2fe→#67e8f9`, `.eyebrow pill`; `.glass/.glass-card(+hover translateY-4 +glow)/.ring-glow`; `.btn-primary gradient 135deg #6366f1→#7c3aed→#6d28d9 + shine sweep + hover translate + active scale + disabled .6`, `.btn-ghost`; `.glass-input + pl/pr preservation`; `.reveal IntersectionObserver threshold .12`, `.page-enter fade-up .55s`, `.bar-fill gradient pan`, `.skeleton-shimmer`, `.spinner-ring conic mask`, `.nav-active-dot 3px bar`; focus-visible `#818cf8`, scrollbar indigo, `prefers-reduced-motion` disables.
### 20.4 Shared components (27)
`GlassCard{hover,glow}`, `Button{primary|ghost|danger,sm|md|lg,loading Loader2}`, `PageHeader{eyebrow,title,sub,action}`, `StatCard{icon,label,value,sub,accent indigo|emerald|amber|rose|cyan}`, `ScoreRing{score,size120, r48, gradient, scoreColor}`, `ProgressBar{value,label,role=progressbar}`, `Modal{open,onClose,title,Escape,overlay click}`, `LoadingState{message+spinner} + SkeletonLoader`, `EmptyState{icon,title,message,action}`, `Reveal{delay,as,IO}`, `SkillBadge{high rose|medium amber|low emerald|learning primary}`, `MarkdownText{inline,blocks code/ul/ol/para}`, `AiDisclaimer(AI may be inaccurate)`, plus §13/17 cards. `ResumeTemplates` see §10.

---
## 21. Data Design
### 21.1 As-Built (no DB)
No `pymongo/sqlalchemy`; `config.py` has no `MONGODB_URI/JWT_SECRET/ADMIN_*`. Stores: `USER_STORE[email]={id,name,email,passwordHash:sha256,college,degree?,dept?,year?,phone?,role}`, `TOKEN_STORE[token]=email`, `RESUME_STORE[rid]={_id/id,fileName,createdAt:utc_iso,owner/_owner:email,_text,**analysis}`, `_RATE_LIMIT_STORE[ip]=[float]`. Integrity in Python: `_current_user` + owner filter + `_public` strip + 404-not-403. Quiz/Interview = browser objects (`aiQuiz.js`, `Interview.jsx` state, `localStorage`/`router state`).
```
USER_STORE[email] 1:N RESUME_STORE[rid] via _owner==email; 1:N TOKEN_STORE[token]==email
RATE_LIMIT[IP]=hits; QuizAttempt(JS obj) - - browser only; Interview(state) - - React only
```
### 21.2 Legacy Intended (DESIGN-ONLY, from README + api.js + admin UI)
`User{_id,name,email unique lower,passwordHash bcrypt,role student|admin,college,degree,dept,year,phone,isActive,createdAt}`, `Question{_id,question,options[4],correctAnswer 0-3,explanation,category 13,type aptitude|technical|hr|interview,difficulty Easy|Medium|Hard,isActive/isPublished,createdBy,timestamps}`, `Resume{_id,userId,fileName,filePath,overallScore,atsScore,skills[],missing[],roles[],strengths[],weaknesses[],improvements[],topics[],summary,createdAt}`, `QuizAttempt{_id,userId,category,difficulty,type,questions[{questionId,selected,correct,isCorrect}],score,accuracy,correct/wrong/total,timeTaken,createdAt}`, `InterviewSession{_id,userId,type HR|technical,questions[{q,a,feedback,score}],overallScore,createdAt}`; `User 1-N Resume/Quiz/Interview; Question 1-N Quiz.questions`.
### 21.3 Seed Bank (SPEC, 80 — no file on disk)
| Type | Count | Breakdown |
|---|---|---|
| Aptitude 30 | Quant 10, Logical 8, Verbal 7, DI 5 |
| Technical 30 | Prog 5, DSA 6, DBMS 5, OS 4, CN 4, OOP 3, Web 3 |
| HR 10 | behavioral |
| Interview 10 | projects open-ended |
| Total 80 | 13 categories = `Categories.jsx KNOWN` (Quant,Logical,Verbal,DI,Programming,DSA,DBMS,OS,CN,OOP,WebDev,HR,Projects) |
Per-item: `4 options, correct index, explanation, category, type, difficulty`. Command SPEC: `cd backend; npm run seed` (clear+insert, safe re-run). Replacement as-built: stateless AI generation (§8).
### 21.4 Admin Seeding SPEC vs BUILT
SPEC: `upsert by ADMIN_EMAIL (default admin@college.edu/Admin@123), bcrypt, force admin`. BUILT: `role=admin if email.startswith(admin@)` on register, SHA256, in-memory, 409 on dup — spoofable, lost on restart. Fix: `seed.py` + bcrypt + allowlist + persistent store.
### 21.5 Pydantic/Heuristic Shapes for Appendix
`GenerateQuestionsRequest/GeneratedQuestion` (§6.3), `RegisterRequest` (§7), resume analysis dict (§9) — paste verbatim for viva.

---
## 22. Installation, Configuration, Run & Build
### 22.1 Prerequisites
Node ≥18 (obs 24.19.0, npm 11.17.0), Python ≥3.10 (obs 3.14.3), ports 5173+8000+4173 free, Edge/Chrome for screenshots, at least one of `GEMINI_API_KEY` (AI Studio) or `ZEN_API_KEY` (opencode.ai/zen) else 502 (resume still works). Mongo **not required** (in-memory). PowerShell 5.1 (`; if ($?)` not `&&`).
`requirements.txt`: fastapi,pydantic,pydantic-settings,google-genai,uvicorn,python-multipart,pytest,httpx,pypdf,python-docx. `package.json`: axios,lucide-react,react,react-dom,react-router-dom; dev vite,plugin-react,tailwind,autoprefixer,postcss; scripts `dev/build/preview/test`.
### 22.2 Env Tables
**Backend `.env.example→.env` (never commit):** `GEMINI_API_KEY` yes-unless-Zen (backend only), `GEMINI_MODEL gemini-3-flash-preview`, `GEMINI_FALLBACK_MODELS` (code default 3), `ZEN_API_KEY` yes-unless-Gemini, `ZEN_MODEL mimo-v2.5-free`, `ZEN_BASE_URL https://opencode.ai/zen/v1→POST /chat/completions`, `ALLOWED_ORIGINS localhost:5173,127.0.0.1:5173 (+ auto 0.0.0.0/[::1])`, `REQUEST_TIMEOUT 60.0→504`, `RATE_LIMIT_MAX 10 / WINDOW 600→429`. Legacy `PORT/MONGODB_URI/JWT_SECRET/ADMIN_*` not implemented — do not set.
**Frontend `.env`:** `VITE_API_URL` no-locally/yes-deployed. `resolveApiBaseUrl`: set→trimmed use; localhost→`/api` (proxy); 0.0.0.0→`http://localhost:8000/api`; else `/api`. Leave unset locally; set `https://api.domain/api` in prod. Never put Gemini key here.
### 22.3 Install & Run (PowerShell)
```powershell
node --version; npm --version; python --version
cd "C:\Users\acer\Videos\placement preparation ai\backend"
python -m pip install -r requirements.txt
Copy-Item .env.example .env  # edit GEMINI_API_KEY and/or ZEN_API_KEY
# backend dev (match proxy 8000, not 5000):
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000  # docs at /docs, health /api/health
cd "..\frontend"
npm install
Copy-Item .env.example .env  # leave VITE_API_URL empty locally
npm run dev  # http://localhost:5173/
python -m pytest -q  # from backend/ (dummy key, mocked)
npm test  # from frontend/ (node --test)
python docs/capture_screens.py  # 10 routes 1280x820 to docs/screenshots
```
Order: backend before frontend; check `GET 127.0.0.1:8000/api/health→{status:ok}` or `localhost:5173/api/health`.
`vite.config.js`: `host 0.0.0.0:5173 proxy /api→http://localhost:8000 changeOrigin`.
### 22.4 Build
Frontend `npm run build→dist/index.html+assets` (git-ignored, present) → host Vercel/Netlify/Nginx (`VITE_API_URL` inlined at build, SPA fallback, gzip, immutable assets). `npm run preview :4173` validates. Backend no build: `uvicorn app.main:app --host 0.0.0.0 --port 8000` (or gunicorn 2-4 workers). Stale `npm run dev:memory/seed` do not exist — remove.
### 22.5 Log Hints
`vite.log:89`: healthy `ready 2828ms`, HMR pages, benign `AuthContext Fast Refresh` notice, **must-fix `GeneratedQuiz.jsx:61 Unterminated string` (giant single-line JSX, truncated `bg-indigo-500/2…`)** → prettify multiline, `npm run build` before demo. `server.log:38`: health 200, auth 200/401 (expected), `GET /api/dashboard 404×2` (no route), `POST /generate 502×3` (quota), `OPTIONS 200` CORS, `upload/resumes 200`, `favicon 404` benign. `server.err.log:22`: `Uvicorn :8000`, `provider=gemini 1..3 transient RateLimit 2-6s → zen 1..3 Transient 2-3s` → retry+failover executed, no keys (shape `provider attempt outcome error latency_ms`). Fix demo: valid Gemini quota or Zen key.

---
## 23. Testing Strategy & Coverage
### 23.1 Backend `pytest.ini:testpaths=tests`, `conftest.py` (dummy `GEMINI_API_KEY=test-key-not-real`, `make_question/make_questions`, `client` clears rate-limit + `TestClient`, `valid_payload{technical,DBMS normalization,Medium,2}`)
| File | Tests |
|---|---|
| `test_auth.py:2` | register→me student no-leak; bad password 401 |
| `test_health.py:1` | `/api/health ok` |
| `test_generate.py:5 (13 cases)` | shape exact count; 422×8 (`hr,x,blank,Extreme,0,16,121chars,lowercase medium`); all 2×4 combos; 11th→429; Provider→502 `{message,detail}` |
| `test_gemini_service.py:4` | prompt constraints; reject `[]/nope/dupes/7`; retry-once→2 calls; 2 fails→Provider |
| `test_orchestration.py:5` | repair 2→4; `"A"→0`; heal irregular; 410→Provider; RESOURCE_EXHAUSTED→RateLimit |
| `test_provider_resilience.py:6` | throttle 3 calls 2 sleeps→success; persistent→RateLimit; route 429 `busy`; auth fail-fast 1 call→zen success; fences/prose salvage; logs contain `provider=gemini` never keys |
| `test_resumes.py:7` | upload scores+ids; bad ext 400; empty 400; isolation + slash alias equal; owner 200/other 404; reanalyze deterministic; never-leak 4 endpoints |
| `test_zen_fallback.py:3` | gemini fail→zen; no keys→Provider; both fail→Provider |
Total 41 node IDs (`.pytest_cache`), all mocked, no network/DB. Run `pytest -v`, `-k`, `tests/test_resumes.py -v`, `--collect-only`.
### 23.2 Frontend `npm test = node --test tests/*.test.js` (native, ESM)
`aiQuiz.test.js:2` (50% + `answer` fallback), `helpers.test.js` (`cn/scoreColor/difficultyColor/formatDate` + 11 file-existence guards `App,main,api,helpers,AuthContext,Dashboard,Quiz,QuizResult,Interview,ResumeAnalyzer,ResumeResult,admin/Questions`), `helpersExtended.test.js:9` (`greeting 9/14/20h`, `formatTime/formatDate —`, `cn falsy`, `scoreColor NaN→rose`, `difficultyColor case-insensitive`, `resolveApiBaseUrl` 3 cases), `markdown.test.js:4` (bold/italic/code 7 spans, HTML inert, fence+ul+ol, empty/null/plain). Run `npm test`, single `node --test tests/x`.
### 23.3 Gaps & Next
Add E2E Playwright `register→upload→quiz→interview→dashboard→admin`, `vite build` in CI (catches line-61 bug), coverage thresholds, eval harness for AI quality.

---
## 24. Security
**Good (highlight):** Keys only `backend/.env` via settings, never browser (`VITE_API_URL` only); logs/errors never include key (only provider/attempt/error/latency, verified `test_logs_never_contain_keys` + `server.err.log`); git-ignored secrets/uploads/logs (`.gitignore` both levels, `cp .env.example .env`); validation everywhere (Pydantic + repair + lenient JSON); upload allowlist+5MB+empty/unreadable+owner-scoped 404-not-403 + no path traversal; password stripped, Bearer required, 401 clears+redirect, `adminOnly` guard; generic 429/502/504 without internals.
**Gaps (disclose + fix):** 1) SHA256 unsalted fast + opaque tokens no expiry + `localStorage` XSS → bcrypt/argon2 + short JWT + HttpOnly Secure SameSite + blocklist + login rate-limit. 2) Ephemeral stores → Postgres/Mongo + S3 + Redis. 3) Prefix-admin spoofable, no adminMiddleware → seed env + role guard. 4) `/generate` unauthenticated → `Depends(get_current_user)`. 5) CORS `*` + credentials → tighten methods/headers + HTTPS + TrustedHost + headers. 6) `_text` retention, no delete → retention policy + encryption + delete-my-data + consent. 7) `dist/*.js` may inline `VITE_API_URL` — verify no secret, sourcemaps off prod.

---
## 25. Deployment, Scaling & Roadmap
| Concern | Local | Production |
|---|---|---|
| Frontend | `npm run dev :5173` proxy | `VITE_API_URL=https://api.domain/api npm run build→dist` on Vercel/Netlify/Nginx, gzip, immutable assets, SPA fallback |
| Backend | `uvicorn --reload :8000` single | `gunicorn -k uvicorn.workers -w 2-4` behind Nginx/Caddy TLS, `ALLOWED_ORIGINS=https://app.domain`, health LB, JSON logs |
| Env | `.env` files | Secrets manager, never bake image, `extra=ignore` |
| Python | 3.14.3 bleeding | Pin `3.12-slim` Docker multi-stage <200MB + `pip freeze` lock |
| Data | Ephemeral | Managed Postgres/Mongo + S3 uploads + backup/retention |
| AI quota | 429/5xx→502 observed | Paid quota/Zen key, model pool config, cache `hash(prompt)`, queue (Celery/RQ), per-user quota, latency/cost dashboards |
| CI | manual | GH Actions `py3.12+node20: pip install+npm ci → pytest → node --test → vite build → ruff/eslint` |
| Docs | `capture_screens.py` manual | Regenerate after line-61 fix + Playwright regression |
Minimal backend Dockerfile: `FROM python:3.12-slim/WORKDIR /app/COPY requirements RUN pip install --no-cache/COPY app ./app/ENV PORT=8000/CMD uvicorn app.main:app --host 0.0.0.0 --port 8000` + runtime env.
**Roadmap (8):** 1) Persist (Postgres/Mongo+Alembic, S3, Redis). 2) Bank+seed 80 Python + CRUD soft-delete + pagination + indexes. 3) AI queue+cache+router+offline heuristic+eval. 4) AuthN/Z bcrypt/JWT/cookies/admin toggle/audit. 5) Harden (`/generate` auth, `/dashboard` agg, versioned `/api/v1`, user rate-limit, request-id). 6) Frontend lazy-split, virtualize, IndexedDB, PWA, a11y, E2E. 7) Observability Prometheus/Sentry/uptime/screenshots. 8) Compliance HTTPS/HSTS/CSP/antivirus/PII/retention/consent + bias audit `ROLE_TEMPLATES`.

---
## 26. Viva Q&A (20) + 5-Minute Demo Script
**Q1 Problem?** Scattered prep → one portal resume+quiz+interview+track + admin bank.
**Q2 Scoring?** Offline heuristic `resume_service.py:212-405`: 60 vocab regex + signals → weighted overall + ATS sum, caps 25-97/40-97. (README HF-rating stale.)
**Q3 Key storage?** Only `backend/.env GEMINI/ZEN` via settings; browser only `VITE_API_URL`; server-side calls; logs never key.
**Q4 Auth?** Opaque `token_urlsafe(32)` + SHA256 demo (should be bcrypt) + Bearer + localStorage + AuthContext + ProtectedRoute; README JWT clarify.
**Q5 Admin?** Now `admin@*→admin` on register; prod `seed.py` upsert `ADMIN_EMAIL` bcrypt.
**Q6 Seed?** README 80 (apt30:Q10/L8/V7/DI5, tech30:P5/DSA6/DBMS5/OS4/CN4/OOP3/Web3, HR10, interview10, 4 opts+explanation). Python stateless AI `count1-15`; propose re-add.
**Q7 AI down?** Taxonomy Provider→502, RateLimit→429 hint, Transient→502, Timeout→504; pool→Zen→offline (resume already offline). Live in `server.err.log`.
**Q8 Fairness?** Server validates + repairs; as-built ships answers client-side — move to server grading.
**Q9 Deactivate?** Future `PATCH /users/:id/status isActive`; now in-memory manual; admin UI ready.
**Q10 Scale?** Paginate, cache bank, queue AI, S3, Redis, replicas, CDN, workers.
**Q11 Why 502 generate but 200 upload?** Upload local; generate needs quota (429/5xx→502/429).
**Q12 Why /dashboard 404?** Frontend Node API; Python mounts 3 routers — add agg route.
**Q13 Why logs/.env ignored?** Prevent secret/upload leak.
**Q14 Proxy?** Avoid CORS: `/api→8000`.
**Q15 No leak proof?** Log format + `server.err.log` + `dist grep GEMINI` + `test_logs_never_contain_keys`.
**Q16 Port 5000 vs 8000?** README stale Express 5000; actual 8000 + proxy.
**Q17 Tests?** Backend mocked provider + isolation; frontend pure + guards; add E2E.
**Q18 Line-61 fix?** Break JSX multiline, close string, `npm run build`.
**Q19 DB choice?** Postgres relations or Mongo flexible docs — justify by queries.
**Q20 Ethics?** Minimize PII, consent, retention, bias audit roles.
**Demo 5-min:** 0:00 Landing stats → 0:30 Register student → 1:00 Upload TXT → scores/roles/gaps → 1:45 Re-analyze + Skill-Gap/Career-Roles → 2:30 AI generator topic DBMS → 5 Qs → 3:15 Timed quiz → submit → review → 4:00 Dashboard/Progress (fallback) → 4:30 Admin `admin@` students/questions/analytics → 5:00 Q&A (keys server-side, offline fallback, 502 drill).

---
## 27. Appendices
### A. Endpoint Matrix (prefix `/api`, base `127.0.0.1:8000`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | – | Liveness `{status:ok}` |
| POST | `/auth/register` | – | Create `{token,user}` 409 dup |
| POST | `/auth/login` | – | Session 401 |
| GET | `/auth/me` | Bearer | Current user 401s |
| POST | `/questions/generate` | IP limit | MCQs 422/429/504/502 → `{data:{questions}}` |
| POST | `/resumes/upload` | Bearer | Multipart `resume` ≤5MB → `{data:analysis}` 400s |
| GET | `/resumes`, `/resumes/` | Bearer | Own list desc (alias equal) |
| GET | `/resumes/{id}` | Bearer+owner | Detail 404 |
| POST | `/resumes/{id}/analyze` | Bearer+owner | Re-run deterministic |
| *Missing* | `/users,/quiz,/interview,/dashboard,/events,/questions list-CRUD` | – | Frontend expects, backend 404 — TODO |
### B. File Index (abridged, absolute)
`backend/requirements.txt:10,pytest.ini:2,.env.example:10,app/main.py:36,config.py:47,schemas.py:55,routes/auth.py:115,questions.py:79,resumes.py:127,services/gemini_service.py:532,resume_service.py:409,tests/conftest:41 + 8 test files,server.log:38,server.err.log:22; frontend/package.json,vite.config.js,tailwind.config.js,index.html,.env,src/App.jsx:109,main.jsx,services/api.js:164,context/AuthContext.jsx:97,utils/helpers:51,markdown:95,aiQuiz:45,components 27 files, pages 22 files, admin 5 files, tests 4 files; docs/capture_screens.py+screenshots/11`
### C. Glossary
ATS (parser checks), Overall (weighted readiness), `correctAnswer` (0-3 index), `missingSkills[{skill,priority,reason}]`, `recommendedRoles[{role,match%,required,missing,preparation}]`, Provider/RateLimit/Transient taxonomy, `TOR` (trade-off): in-memory vs persistent, client-graded vs server-graded.
### D. Page Budget (≤50)
Exec1 + Vision2 + Arch4 + Stack2 + Structure3 + Backend3 + Auth3 + AI6 + Resume8 + Studio2 + Gaps/Roles1 + Launchers1 + Quiz5 + Interview2 + Dash3 + Events3 + Admin4 + Profile2 + Cross3 + Data4 + Install4 + Tests3 + Security2 + Deploy3 + Viva3 + Appendix2 ≈ 48 pages. Print double-sided; keep code snippets 8pt; link full file:line refs instead of pasting all 1,400 lines.

*End — Generated via 5 parallel subagents (backend, frontend, AI/resume/quiz, DB/seed/tests, setup/security) + synthesis. Fix `GeneratedQuiz.jsx:61`, rotate `backend/.env` secrets, update README stack/ports, implement `/dashboard|/quiz|/interview|/users|/questions-CRUD` or mark explicitly as roadmap before final submission.*
