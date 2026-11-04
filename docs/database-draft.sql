-- DRAFT ONLY — discussion starting point for BaliEcoGrade.
-- Do not run against production. Confirm naming, nullability, privacy/retention,
-- classification taxonomy, geographic source, and ownership with backend team first.

-- No auth tables, policies, triggers, or migrations are proposed here.
create table if not exists public.waste_scans (
  id uuid primary key default gen_random_uuid(),
  material_name text not null,
  category text not null check (category in ('ORGANIK', 'ANORGANIK', 'RESIDU', 'B3')),
  confidence_score numeric(5,4) check (confidence_score >= 0 and confidence_score <= 1),
  sorting_instruction text,
  local_context_note text,
  regency text,
  district text,
  scanned_at timestamptz not null default now(),
  image_url text,
  created_at timestamptz not null default now()
);

-- Candidate indexes, to review only after expected query patterns are agreed:
-- create index on public.waste_scans (scanned_at desc);
-- create index on public.waste_scans (category, scanned_at desc);
-- create index on public.waste_scans (regency, district, scanned_at desc);
