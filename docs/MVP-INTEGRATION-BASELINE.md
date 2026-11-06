# BaliEcoGrade MVP integration baseline

Status: owner-approved MVP decisions, implemented locally on `feature/database-supabase`. This document supersedes unresolved proposals in earlier draft registers for the choices listed here. It does not authorize deployment to Production.

## Production audit evidence

The initial owner-provided read-only audit for project `grvrrlgguaelbyjvvdyr` reported PostgreSQL 17.11, no application tables in `public`, no CLI migration rows or `supabase_migrations.schema_migrations`, and no application Storage bucket. Those findings predate deployment. The owner has since verified migrations `20261104000100` and `20261105000100` on Production, including `public.waste_scans` and the private `waste-images` bucket. No Production change was made during this commit-preparation task.

## Confirmed MVP data contract

- Canonical category values are `ORGANIK`, `ANORGANIK`, `RESIDU`, `B3`; an unclassified result uses NULL.
- Confidence is 0..1, validated before rounding to five decimal places. The starting review threshold is `WASTE_CLASSIFICATION_CONFIDENCE_THRESHOLD=0.70`; it is a workflow threshold, not a model-calibration claim.
- Processing and human review are separate. Processing: `pending | completed | failed`. Review: `not_required | pending | approved | rejected`. A low-confidence or unclassified completed result is review-pending.
- GPS coordinates (`latitude`, `longitude`) are required for new scans by the `origin/dev` frontend/API contract. Accuracy and capture timestamp accompany the coordinates. The database columns remain nullable for compatibility with legacy rows; no static area fallback is allowed.
- Region fields are `regency` and `district`; the current provider adapter intentionally returns NULL until an approved reverse-geocoding provider is configured.
- `user_id` is nullable in the schema and references `auth.users(id)` with `ON DELETE SET NULL`; every newly accepted scan must have a user ID from a cookie-backed Supabase Auth session validated server-side. The browser creates a Supabase Anonymous Auth session without an application CAPTCHA. Anonymous users do not need email or password. Losing browser storage/session loses access to that guest identity and its scans; there is no automatic anonymous-account deletion because `ON DELETE SET NULL` would detach retained scans from their owner.
- Admin access is checked using the authenticated user returned by Supabase Auth and the server-managed `app_metadata.role === 'ADMIN'`. Client metadata is never trusted and no role-edit endpoint exists.
- Images are private objects in `waste-images`, limited to 10 MiB and JPEG/PNG/WebP input. The server decodes and re-encodes to JPEG (removing EXIF), then stores `scans/{scan_id}/{uuid}.jpg`; the database stores only `image_path`. Admin image URLs expire after 300 seconds. There is no automatic retention deletion in this MVP.
- Dashboard filters and reporting use Asia/Makassar calendar dates; start is inclusive and end is exclusive. List order is `created_at DESC, id DESC`. Stats and CSV cover all matching records, not only the current page.

## Local migration

`supabase/migrations/20261104000100_create_waste_scans_and_private_storage.sql` creates the initial scan table and private bucket, enables RLS without client policies, revokes table privileges from `PUBLIC`, `anon`, and `authenticated`, and grants the server role only the required table operations. The server secret bypasses RLS, so every admin operation must pass the server auth guard. Anonymous scan creation uses the same restricted server API. No direct browser table access is used.

Migration `20261104000100_create_waste_scans_and_private_storage.sql` has been applied to Production. Migration `20261105000100_grant_delete_on_waste_scans.sql` is maintained on `origin/dev` and has also been applied to Production. No SQL was executed against Supabase during this commit-preparation task.

## AI and operation

DeepSeek Vision is called server-side using `DEEPSEEK_API_KEY` and `DEEPSEEK_MODEL` (the current documented vision model default is `deepseek-flash`). Missing credentials cause the scan API to return `AI_NOT_CONFIGURED`; there is no random classifier fallback and no simulated result is persisted. Confidence is not calibrated. AI-supplied local cultural context is discarded until independently supported. User-facing instructions are server-controlled category guidance.

`SCAN_API_ENABLED` defaults to false and must be enabled in the Production runtime before scans are accepted. The team decision for this MVP is to run without application-level request rate limits, AI quotas, or Redis. Every accepted scan can trigger a DeepSeek request, so API usage and cost scale with incoming scans. DeepSeek calls remain server-side and bounded by the configured model and output-token limit.

The application creates guest identities through Supabase Anonymous Auth without a CAPTCHA token. No Supabase Production Auth setting was changed. If CAPTCHA enforcement remains enabled in the Supabase Dashboard, anonymous sign-in will be rejected until an administrator updates that setting.

Scan idempotency remains globally unique in the database, while the server checks ownership before returning any existing result. Same-owner completed retries return the stored result without another AI call; fresh pending retries return only pending status; failed retries require a new key; stale pending rows older than three minutes are atomically marked failed and are not reprocessed. A process crash after upload can leave an unreferenced private object; the current MVP intentionally does not automatically delete images or guest accounts.

Redis is not required by the scan API. Database and Storage data operations remain server-only using the administrative client. The browser uses only the publishable key for Auth; it does not access tables or Storage. Signed image URLs are issued only after owner/admin authorization and all scan responses are `private, no-store`. No Storage policies are added because browser access is not part of this architecture.

## First admin provisioning

1. In Supabase Dashboard, open Authentication > Users and create/invite the intended administrator account.
2. Obtain the user's Auth ID from that page.
3. Set `app_metadata.role = ADMIN` using a trusted one-time server-side Admin API operation, for example `supabase.auth.admin.updateUserById(userId, { app_metadata: { role: 'ADMIN' } })`. Run it only in a private local script or protected operator environment with the Supabase server secret obtained directly from the Dashboard. Do not put the secret in Git, browser variables, or chat. Do not use `user_metadata`.
4. Remove the temporary script/secret from the working environment and sign in at `/admin-login`.

The app intentionally provides no public endpoint to assign or change roles.

## Remaining deployment gates

- Authenticate Supabase CLI and repeat effective schema/table privilege, role-membership, migration-history, and bucket/policy inspection immediately before deployment.
- Review migration dry-run and Production backup/recovery evidence; obtain explicit deployment approval.
- Configure Supabase and DeepSeek values in local/Vercel environment, confirm Anonymous Auth settings, and run Auth, Storage, RLS, and API tests using synthetic data. Review DeepSeek usage and spending regularly because application-level scan and AI quotas are intentionally not enabled.
- Confirm whether Supabase Production Auth requires CAPTCHA for Anonymous Auth; this application does not send a CAPTCHA token.
- Choose/configure an actual reverse-geocoding provider.
- Agree on image/GPS retention duration and operational review workflow. No automated deletion exists.
- Validate the migration against PostgreSQL 17.11 in a local or non-production instance. Docker/Podman was not available during this implementation.
- CSV export currently materializes filtered results in server memory; switch to streaming/background export if dataset size makes this unsuitable.

## Vercel upload size

Vercel Functions reject request bodies over 4.5 MB. The browser therefore compresses selected images to at most 3.8 MiB before multipart upload; the original selection can be up to 10 MiB. The server independently checks file signatures, decodes with a pixel limit, strips metadata by re-encoding, and validates the resulting image before Storage upload.
