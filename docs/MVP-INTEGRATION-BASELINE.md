# BaliEcoGrade MVP integration baseline

Status: owner-approved MVP decisions, implemented locally on `feature/database-supabase`. This document supersedes unresolved proposals in earlier draft registers for the choices listed here. It does not authorize deployment to Production.

## Production audit evidence

The owner-provided read-only audit for project `grvrrlgguaelbyjvvdyr` reports PostgreSQL 17.11; no application tables in `public`; no CLI migration rows and no `supabase_migrations.schema_migrations`; ten internal `storage` tables with RLS enabled and FORCE RLS disabled; no policy rows returned for `public` and `storage`; no `storage.buckets` rows. It does not establish that effective privileges are empty. The later effective-privilege query could not be run because the CLI needed an authenticated access token. No Production change has been made.

## Confirmed MVP data contract

- Canonical category values are `ORGANIK`, `ANORGANIK`, `RESIDU`, `B3`; an unclassified result uses NULL.
- Confidence is 0..1, validated before rounding to five decimal places. The starting review threshold is `WASTE_CLASSIFICATION_CONFIDENCE_THRESHOLD=0.70`; it is a workflow threshold, not a model-calibration claim.
- Processing and human review are separate. Processing: `pending | completed | failed`. Review: `not_required | pending | approved | rejected`. A low-confidence or unclassified completed result is review-pending.
- GPS is captured at scan submission. Coordinates are a pair; accuracy and captured timestamp accompany coordinates. When geolocation is absent or denied, all GPS fields are NULL. No static area fallback is allowed.
- Region fields are `regency` and `district`; the current provider adapter intentionally returns NULL until an approved reverse-geocoding provider is configured.
- `user_id` is nullable and references `auth.users(id)` with `ON DELETE SET NULL`. Anonymous scans are accepted by the server API.
- Admin access is checked using the authenticated user returned by Supabase Auth and the server-managed `app_metadata.role === 'ADMIN'`. Client metadata is never trusted and no role-edit endpoint exists.
- Images are private objects in `waste-images`, limited to 10 MiB and JPEG/PNG/WebP input. The server decodes and re-encodes to JPEG (removing EXIF), then stores `scans/{scan_id}/{uuid}.jpg`; the database stores only `image_path`. Admin image URLs expire after 300 seconds. There is no automatic retention deletion in this MVP.
- Dashboard filters and reporting use Asia/Makassar calendar dates; start is inclusive and end is exclusive. List order is `created_at DESC, id DESC`. Stats and CSV cover all matching records, not only the current page.

## Local migration

`supabase/migrations/20261104000100_create_waste_scans_and_private_storage.sql` creates the initial scan table and private bucket, enables RLS without client policies, revokes table privileges from `PUBLIC`, `anon`, and `authenticated`, and grants the server role only the required table operations. The server secret bypasses RLS, so every admin operation must pass the server auth guard. Anonymous scan creation uses the same restricted server API. No direct browser table access is used.

The migration is local and reviewable only. It has not been applied to Production. No SQL was executed against Supabase during this implementation.

## AI and operation

DeepSeek Vision is called server-side using `DEEPSEEK_API_KEY` and `DEEPSEEK_MODEL` (the current documented vision model default is `deepseek-flash`). Missing credentials cause the scan API to return `AI_NOT_CONFIGURED`; there is no random classifier fallback and no simulated result is persisted. Confidence is not calibrated. AI-supplied local cultural context is discarded until independently supported. User-facing instructions are server-controlled category guidance.

For a Production deployment, `SCAN_API_ENABLED` defaults to false. Enable it only after configuring a distributed rate limit/abuse-control layer and validating request cost controls; this repository does not include a durable distributed limiter. The in-process API is not a substitute for one.

## First admin provisioning

1. In Supabase Dashboard, open Authentication > Users and create/invite the intended administrator account.
2. Obtain the user's Auth ID from that page.
3. Set `app_metadata.role = ADMIN` using a trusted one-time server-side Admin API operation, for example `supabase.auth.admin.updateUserById(userId, { app_metadata: { role: 'ADMIN' } })`. Run it only in a private local script or protected operator environment with the Supabase server secret obtained directly from the Dashboard. Do not put the secret in Git, browser variables, or chat. Do not use `user_metadata`.
4. Remove the temporary script/secret from the working environment and sign in at `/admin-login`.

The app intentionally provides no public endpoint to assign or change roles.

## Remaining deployment gates

- Authenticate Supabase CLI and repeat effective schema/table privilege, role-membership, migration-history, and bucket/policy inspection immediately before deployment.
- Review migration dry-run and Production backup/recovery evidence; obtain explicit deployment approval.
- Configure Supabase and DeepSeek secrets in local/Vercel environment, and run real Auth, Storage, RLS, and API tests using synthetic data.
- Choose/configure an actual reverse-geocoding provider and durable rate-limiting/abuse controls.
- Agree on image/GPS retention duration and operational review workflow. No automated deletion exists.
- Validate the migration against PostgreSQL 17.11 in a local or non-production instance. Docker/Podman was not available during this implementation.
- CSV export currently materializes filtered results in server memory; switch to streaming/background export if dataset size makes this unsuitable.

## Vercel upload size

Vercel Functions reject request bodies over 4.5 MB. The browser therefore compresses selected images to at most 3.8 MiB before multipart upload; the original selection can be up to 10 MiB. The server independently checks file signatures, decodes with a pixel limit, strips metadata by re-encoding, and validates the resulting image before Storage upload.
