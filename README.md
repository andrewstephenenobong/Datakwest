# DataKwest

DataKwest is a React learning platform that helps aspiring analysts build practical data-analysis skills through guided lessons, quizzes, practice exercises, personalized progress tracking, project evidence, Tutor AI, and achievements.

## Technology

The application is a Vite-powered React 19 single-page application. It uses React Router for client-side navigation, Supabase Auth and database APIs for authentication and persistence, Supabase Edge Functions for server-side AI workflows, and Tailwind CSS for styling. The production deployment target is Vercel.

## Local development

Use Node.js 22 or a compatible current LTS release. Install dependencies and start the development server:

```bash
npm ci
npm run dev
```

Create an ignored local `.env.local` file containing only the public browser configuration required by the Vite client, such as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never expose a Supabase service-role key through a `VITE_*` variable and never commit environment files or secrets.

## Verification

```bash
npm run test:coverage  # Contract tests with Node coverage output
npm run lint           # ESLint
npm run build          # Production bundle
npm run audit          # High-severity dependency audit
npm run check          # Lint, tests, and production build
```

GitHub Actions runs coverage, lint, production build, and dependency audit checks for pushes to `main` and `feat/**` branches, and for pull requests targeting `main`.

## Supabase backend

The version-controlled backend lives under `backend/supabase/`. It includes schema migrations, RLS-aware server contracts, Edge Function source, generated metadata, and deployment documentation. The active project uses server-authoritative functions for daily missions, readiness scoring, project submissions, achievements, and Tutor AI.

Before a public release, verify every user-owned table with separate test accounts, validate Row Level Security, confirm Edge Function JWT verification and rate limits, and ensure browser clients cannot authoritatively mutate XP, streaks, scores, badge awards, or review status.

## Deployment

Deploy the repository as a Vercel project using the Vite build command. Configure the two public Supabase environment variables privately in development, preview, and production environments. The repository includes explicit SPA rewrites for application routes, crawler files in `public/`, and response security headers in `vercel.json`.

The deployment branch is `main`. Feature work is developed on `feat/full-mvp-production-foundation`, validated, and merged into `main` before manual or automatic Vercel deployment.

## Project structure

```text
src/
  components/   Shared navigation, route protection, and renderers
  context/      Authentication state
  lib/          Supabase adapters, analytics, progress, AI, and learner features
  pages/        Authentication, onboarding, learning, project, Tutor, portfolio, and achievements
backend/
  supabase/     Migrations, Edge Functions, metadata, and backend documentation
public/         Public assets, robots.txt, sitemap.xml, and favicon files
.github/        Continuous integration workflow
vercel.json     SPA route rewrites and browser security headers
```

## Live links

- [Live application](https://datakwest.vercel.app)
- [GitHub repository](https://github.com/andrewstephenenobong/Datakwest)
