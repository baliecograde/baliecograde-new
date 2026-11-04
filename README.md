# BaliEcoGrade

BaliEcoGrade is a Next.js App Router application for waste classification and education in Bali.

## Local setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to a local environment file and fill values privately.
3. Start with `npm run dev`.

Server environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (server only)
- `DEEPSEEK_API_KEY` (server only)
- `DEEPSEEK_MODEL` (DeepSeek Vision model)
- `WASTE_CLASSIFICATION_CONFIDENCE_THRESHOLD` (defaults to 0.70)
- `SCAN_API_ENABLED` (Production scan endpoint stays disabled unless explicitly enabled after abuse controls are configured)

Admin access requires Supabase Auth and server-managed `app_metadata.role = ADMIN`. See [the MVP integration baseline](docs/MVP-INTEGRATION-BASELINE.md) for setup, security, migration, and deployment gates.

## Checks

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

The first database migration is local and has not been applied to Supabase Production.
