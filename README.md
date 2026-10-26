# NetTutor AI — AI Quiz + Student Dashboard Add-on

This add-on includes a React + Vite student interface and an Express + MongoDB backend for AI-generated Computer Networks quizzes, saved attempts, score analytics, and answer explanations.

## Important note about the uploaded project archive

The ZIP provided for inspection contained `CN.js`, a standalone `index.html`, `package.json`, and `node_modules`. It did **not** contain an existing React/Vite source tree, MongoDB models, or authentication routes. Therefore this package is a clean React frontend and backend upgrade scaffold that preserves the existing `/api/chat` endpoint, rather than a patch to unseen React components.

## Features

- Email/password registration and login with bcrypt password hashing and JWT authentication.
- AI quiz generation through the existing Google Gemini SDK dependency.
- Topics, difficulty, question count (5–20), and duration settings.
- Quiz runner with question navigation, timer, server-calculated scoring, and explanations.
- MongoDB persistence for users, quizzes, and test attempts.
- Personal dashboard: total attempts, average and highest score, accuracy, score trend, topic strengths, recent attempts, practice time, and repeat-question correctness signals.
- User-scoped API queries; one student cannot access another student's quiz or attempt records.

## Setup

### 1. Backend

Open a terminal in `backend/`:

```bash
npm install
```

Copy `.env.example` to `.env`, then set:

- `MONGODB_URI` — local MongoDB or your MongoDB Atlas connection string.
- `JWT_SECRET` — a random secret at least 32 characters long.
- `GEMINI_API_KEY` — your Gemini API key.
- `CLIENT_ORIGIN=http://localhost:5173`
- `GEMINI_MODEL=gemini-2.5-flash` (change to a model enabled for your API key if necessary).

Start the API:

```bash
npm run dev
```

The API runs at `http://localhost:5000`. Check `http://localhost:5000/api/health`.

### 2. Frontend

Open another terminal in `frontend/`:

```bash
npm install
```

Copy `.env.example` to `.env` if you need a non-default API URL, then run:

```bash
npm run dev
```

Open `http://localhost:5173`, create a student account, generate a quiz, and submit it to populate the dashboard.

## API overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/chat` (keeps the existing NetTutor AI chat endpoint)
- `POST /api/quizzes/generate`
- `GET /api/quizzes`
- `GET /api/quizzes/:id`
- `POST /api/attempts/submit`
- `GET /api/attempts/my-results`
- `GET /api/attempts/:id`
- `GET /api/dashboard/stats`

All quiz and analytics endpoints require `Authorization: Bearer <token>`.

## Data and scoring notes

- Correct answers are excluded from quiz-fetch responses and are only returned after an attempt is submitted.
- The backend computes scores against the answer key stored in MongoDB; the frontend does not submit a score.
- The dashboard is intentionally student-only and returns only the authenticated student's own records.
- Repeat-question correctness signals require the same saved quiz to be attempted more than once. They are a personal learning signal, not a population-wide psychometric assessment.
- The countdown and elapsed-time value in this starter are client-driven. Scoring is server-side, but production/high-stakes exams should add server-managed quiz sessions and authoritative expiration enforcement.
- AI-generated questions can be imperfect. Review generated questions and explanations before relying on them for formal assessment.

## Integration with the existing chat page

The new backend retains `POST /api/chat`, so your existing standalone `index.html` chat page can continue using the backend. The React frontend in this package is a separate UI scaffold; it does not automatically merge your existing HTML/CSS chat screen into React. You can keep that page available or migrate its chat component into React as a later step.

## Security

Never put `GEMINI_API_KEY`, MongoDB credentials, or `JWT_SECRET` in frontend environment variables or commit real `.env` files. Rotate any key that has accidentally been shared. The `.env.example` file contains placeholders only.
