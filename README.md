# BaliEcoGrade

BaliEcoGrade is a Next.js App Router application for waste classification and education in Bali.

## Local setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to a local environment file and fill values privately.
3. Start with `npm run dev`.

## Checks

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Scan API

The application submits scans through `POST /api/scans`. The request uses `multipart/form-data` with an `image` field and an `Idempotency-Key` UUID header; GPS fields are optional. The server validates and stores the scan and image, then returns the persisted analysis result. The endpoint `/api/scans/analyze` is not part of the active application flow.
