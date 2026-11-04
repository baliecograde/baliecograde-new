create table public.waste_scans (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  user_id uuid references auth.users(id) on delete set null,
  material_detected text,
  trash_category text check (trash_category in ('ORGANIK', 'ANORGANIK', 'RESIDU', 'B3')),
  confidence_score numeric(6,5) check (confidence_score between 0 and 1),
  action_instruction text,
  balinese_context_note text,
  analysis_status text not null default 'pending' check (analysis_status in ('pending', 'completed', 'failed')),
  analysis_error_code text check (analysis_error_code is null or analysis_error_code ~ '^[a-z0-9_]{1,64}$'),
  review_status text not null default 'not_required' check (review_status in ('not_required', 'pending', 'approved', 'rejected')),
  latitude double precision,
  longitude double precision,
  location_accuracy_m numeric(10,2) check (location_accuracy_m is null or location_accuracy_m >= 0),
  location_captured_at timestamptz,
  regency text,
  district text,
  image_path text,
  created_at timestamptz not null default now(),
  constraint waste_scans_coordinate_pair check ((latitude is null and longitude is null) or (latitude is not null and longitude is not null)),
  constraint waste_scans_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint waste_scans_longitude_range check (longitude is null or longitude between -180 and 180),
  constraint waste_scans_location_metadata_consistent check ((latitude is null and location_accuracy_m is null and location_captured_at is null) or (latitude is not null and location_accuracy_m is not null and location_captured_at is not null)),
  constraint waste_scans_failed_has_error_code check ((analysis_status = 'failed' and analysis_error_code is not null) or (analysis_status <> 'failed' and analysis_error_code is null))
);
create index waste_scans_created_at_id_desc_idx on public.waste_scans (created_at desc, id desc);
alter table public.waste_scans enable row level security;
revoke all on table public.waste_scans from public, anon, authenticated;
grant select, insert, update on table public.waste_scans to service_role;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('waste-images', 'waste-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']::text[]) on conflict (id) do nothing;
