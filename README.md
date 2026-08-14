# DataKwest

DataKwest is a React learning platform that helps aspiring analysts build practical data-analysis skills through guided lessons, quizzes, practice exercises, and personalized progress tracking.

## Technology

The application is a Vite-powered React 19 single-page application. It uses React Router for client-side navigation, Supabase Auth and database APIs for authentication and persistence, and Tailwind CSS for styling. The production deployment target is Vercel.

## Local development

Use Node.js 22 or a compatible current LTS release. Install dependencies from the lockfile, create a local environment file, and start the development server:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`. The anon key is intended for browser use only; never expose a Supabase service-role key through a `VITE_*` variable or commit secrets to the repository.

## Verification

The repository provides the following checks:

```bash
npm run lint       # ESLint
npm run build      # Production bundle
npm run audit      # High-severity dependency audit
npm run check      # Lint followed by production build
```

GitHub Actions runs the lint, production build, and dependency audit checks for pushes and pull requests targeting `main`.

## Supabase requirements

The repository expects Supabase tables and Edge Functions that are not defined locally. Before deploying, verify that every user-owned table has Row Level Security enabled and policies constrain access to the authenticated user. Server-side functions must validate the caller JWT, request shape, ownership, rate limits, and generated-content size. Do not trust browser-supplied XP, streak, score, or user identifiers as authoritative values.

The application references the following data surfaces:

| Surface | Purpose |
|---|---|
| `profiles` | User profile, onboarding, roadmap, XP, streak, and skill progress. |
| `phase_progress` | Phase quiz attempts, scores, and completion status. |
| `lessons` | Generated lesson content, completion, and practice submissions. |
| `user_track_progress` | Progress through standalone skill tracks. |
| `events` | Product analytics events. |

Schema migrations, RLS policies, Edge Function source, retention rules, and backup procedures should be versioned and reviewed as part of the deployment process.

## Deployment

Deploy the repository as a Vercel project using the Vite build command. Configure the two public Supabase environment variables in the appropriate development, preview, and production environments. The repository includes explicit SPA rewrites for application routes, crawler files in `public/`, and response security headers in `vercel.json`.

Before a public release, verify the authenticated user journey in a staging environment, inspect the deployed headers, test Supabase authorization with two separate users, and document rollback and incident procedures.

## Project structure

```text
src/
  components/   Shared navigation, route protection, and renderers
  context/      Authentication state
  lib/          Supabase adapters, analytics, progress, and gamification helpers
  pages/        Login, onboarding, dashboard, lessons, quizzes, and tracks
public/         Small public assets, robots.txt, sitemap.xml, and favicon files
.github/        Continuous integration workflow
vercel.json     SPA route rewrites and browser security headers
```

## Live links

- [Live application](https://datakwest.vercel.app)
- [GitHub repository](https://github.com/andrewstephenenobong/Datakwest)
