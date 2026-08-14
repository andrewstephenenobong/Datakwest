# DataKwest Supabase Backend Export

This directory is the version-controlled export of the accessible DataKwest Supabase project `jdpseeenhqdvvqguibof` in `eu-central-1`.

## Included

The export contains the live public-schema inventory, generated TypeScript database types, catalog metadata for policies/indexes/triggers/functions, migration inventory, Edge Function metadata, and the deployed source for all seven active Edge Functions:

| Function slug | JWT verification | Live version |
|---|---:|---:|
| `smart-task` | Enabled | 13 |
| `smart-service` | Enabled | 16 |
| `generate-phase-quiz` | Enabled | 6 |
| `evaluate-practice` | Enabled | 9 |
| `generate-remediation` | Enabled | 4 |
| `generate-skill-track` | Enabled | 3 |
| `generate-track-lesson` | Enabled | 3 |

## Important limitations

This is a source and metadata export, not a production backup. Secrets, API keys, auth provider settings, storage objects, production rows, logs, and billing configuration are intentionally excluded. The project currently reports no recorded Supabase migrations, so the schema inventory must be converted into a clean, reviewed migration sequence before it can become a reproducible environment.

The exported Edge Functions should be treated as an audit snapshot. Before redeployment, review and harden CORS, request validation, rate-limit atomicity, AI provider error handling, prompt/source traceability, output validation, and server-authoritative progress mutations.

## Ongoing workflow

All subsequent backend changes should be made on the `datakwest-backend` branch, committed with focused conventional commit messages, reviewed, and pushed to GitHub. Database DDL must be added as timestamped migration files under `backend/supabase/migrations/` and applied through the Supabase migration workflow. Edge Function changes should be made in source-controlled files under `backend/supabase/functions/` and deployed only from reviewed commits.

Never commit `.env` files, service-role keys, provider keys, database passwords, or production data. Use Supabase secrets or the deployment provider’s protected environment configuration instead.
