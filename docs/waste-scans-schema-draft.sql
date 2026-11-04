-- DRAFT FOR REVIEW ONLY — NOT A MIGRATION.
-- Do not execute against production or apply with Supabase CLI.
-- Review nullability, analysis_status vocabulary, Auth/FK lifecycle, indexes,
-- and retention/privacy decisions with the team before converting to migration.
-- This draft intentionally does NOT create profiles/regions, RLS policies,
-- Storage buckets/policies, triggers, or a foreign key for user_id.

create table public.waste_scans (
  id uuid primary key default gen_random_uuid(),

  -- Nullable pending an Auth ownership/lifecycle decision. No FK in this draft.
  user_id uuid,

  -- Result fields may be absent for pending, failed, or uncertain analysis.
  material_detected text,
  trash_category text
    check (trash_category in ('ORGANIK', 'ANORGANIK', 'RESIDU', 'B3')),
  confidence_score numeric
    check (confidence_score >= 0 and confidence_score <= 1),
  action_instruction text,
  balinese_context_note text,

  -- Required operational state; allowed values/default await backend decision.
  analysis_status text not null,

  -- GPS is optional. If supplied, both coordinates must be present and valid.
  latitude double precision check (latitude >= -90 and latitude <= 90),
  longitude double precision check (longitude >= -180 and longitude <= 180),
  location_accuracy_m numeric
    check (location_accuracy_m >= 0 and location_accuracy_m < 'Infinity'::numeric),
  location_captured_at timestamptz,
  constraint waste_scans_coordinates_pair_check
    check ((latitude is null) = (longitude is null)),

  -- Populated by backend reverse geocoding; nullable if unavailable/out of scope.
  regency text,
  district text,

  -- Relative object path in private waste-images bucket, never a signed URL.
  image_path text,

  -- Absolute instant; convert to Asia/Makassar for reporting/display.
  created_at timestamptz not null default now()
);

-- Candidate indexes only. Enable after confirming query patterns and query plans.
-- `id` makes created_at ordering deterministic for pagination.
-- create index waste_scans_created_at_id_idx
--   on public.waste_scans (created_at desc, id desc);
-- create index waste_scans_category_created_at_id_idx
--   on public.waste_scans (trash_category, created_at desc, id desc);
-- Choose one of these based on actual location-filter queries; both may be
-- unnecessary or redundant for the final workload.
-- create index waste_scans_regency_created_at_id_idx
--   on public.waste_scans (regency, created_at desc, id desc);
-- create index waste_scans_regency_district_created_at_id_idx
--   on public.waste_scans (regency, district, created_at desc, id desc);
-- create index waste_scans_user_created_at_id_idx
--   on public.waste_scans (user_id, created_at desc, id desc);

-- Team decisions still needed:
-- 1. Whether to add FK user_id -> auth.users(id), and ON DELETE behavior.
-- 2. Allowed analysis_status values and cross-field rules for completed scans.
-- 3. Whether pending/failed scans persist; this controls result nullability.
-- 4. Confidence precision and whether rounding is stored or display-only.
-- 5. Query-driven index selection and location/search indexing strategy.
