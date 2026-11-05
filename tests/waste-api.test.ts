import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeActivitySeries,
  computeRegionStats,
  computeSummaryStats,
  csvEscape,
  getConfidenceThreshold,
  parseFilters,
  safeScanDto,
} from '../lib/waste-api';
import {
  hasAdminRole,
  isValidUuid,
  parseBulkDeletePayload,
  parseGpsFields,
  parsePagination,
  parseReviewPatch,
  sniffImageMime,
} from '../lib/scan-validation';

test('validates categories, statuses, uncertain flags, and Makassar date boundaries', () => {
  const filters = parseFilters(
    new URLSearchParams('category=B3&review_status=pending&analysis_status=completed&include_uncertain=true&start_date=2026-11-01&end_date=2026-12-01'),
  );
  assert.equal(filters?.category, 'B3');
  assert.equal(filters?.review_status, 'pending');
  assert.equal(filters?.analysis_status, 'completed');
  assert.equal(filters?.include_uncertain, true);
  assert.equal(filters?.start, '2026-10-31T16:00:00.000Z');
  assert.equal(filters?.end, '2026-11-30T16:00:00.000Z');

  const forcedUncertain = parseFilters(new URLSearchParams(), { onlyUncertain: true });
  assert.equal(forcedUncertain?.only_uncertain, true);

  assert.equal(parseFilters(new URLSearchParams('category=unknown')), null);
  assert.equal(parseFilters(new URLSearchParams('review_status=invalid')), null);
  assert.equal(parseFilters(new URLSearchParams('analysis_status=invalid')), null);
  assert.equal(parseFilters(new URLSearchParams('include_uncertain=maybe')), null);
  assert.equal(parseFilters(new URLSearchParams('start_date=2026-02-30')), null);
  assert.equal(parseFilters(new URLSearchParams('start_date=2026-11-02&end_date=2026-11-01')), null);
});

test('escapes CSV cells and mitigates formula prefixes', () => {
  assert.equal(csvEscape('hello, "world"'), '"hello, ""world"""');
  assert.equal(csvEscape('=1+1'), '"\'=1+1"');
  assert.equal(csvEscape(null), '""');
});

test('uses validated 0..1 confidence threshold', () => {
  const previous = process.env.WASTE_CLASSIFICATION_CONFIDENCE_THRESHOLD;
  process.env.WASTE_CLASSIFICATION_CONFIDENCE_THRESHOLD = '0.70';
  assert.equal(getConfidenceThreshold(), 0.7);
  process.env.WASTE_CLASSIFICATION_CONFIDENCE_THRESHOLD = '1.1';
  assert.throws(() => getConfidenceThreshold());
  if (previous === undefined) delete process.env.WASTE_CLASSIFICATION_CONFIDENCE_THRESHOLD;
  else process.env.WASTE_CLASSIFICATION_CONFIDENCE_THRESHOLD = previous;
});

test('migration contains MVP safety invariants and no destructive SQL', async () => {
  const sql = await readFile('supabase/migrations/20261104000100_create_waste_scans_and_private_storage.sql', 'utf8');
  for (const value of [
    'ORGANIK',
    'ANORGANIK',
    'RESIDU',
    'B3',
    'numeric(6,5)',
    'auth.users(id)',
    'on delete set null',
    'enable row level security',
    "'waste-images'",
    'false',
  ]) {
    assert.ok(sql.toLowerCase().includes(value.toLowerCase()), 'missing migration invariant: ' + value);
  }
  const lowered = sql.toLowerCase();
  assert.equal(lowered.includes('drop table'), false);
  assert.equal(lowered.includes('truncate '), false);
  assert.equal(lowered.includes('delete from'), false);

  const deleteGrantSql = await readFile('supabase/migrations/20261105000100_grant_delete_on_waste_scans.sql', 'utf8');
  assert.ok(deleteGrantSql.toLowerCase().includes('grant delete on table public.waste_scans to service_role'));
});

test('validates image signatures and GPS snapshots', () => {
  assert.equal(sniffImageMime(new Uint8Array([0xff, 0xd8, 0xff, 0x00])), 'image/jpeg');
  assert.equal(sniffImageMime(new Uint8Array([0, 1, 2, 3])), null);
  assert.deepEqual(parseGpsFields([null, null, null, null]), {
    latitude: null, longitude: null, location_accuracy_m: null, location_captured_at: null,
  });
  assert.equal(parseGpsFields(['-8.65', '115.21', '12', '2026-11-05T00:00:00Z'])?.latitude, -8.65);
  assert.equal(parseGpsFields(['91', '115.21', '12', '2026-11-05T00:00:00Z']), null);
  assert.equal(parseGpsFields(['-8.65', '', '12', '2026-11-05T00:00:00Z']), null);
});

test('validates pagination, UUIDs, false-detection review patches, bulk delete, and admin role', () => {
  assert.deepEqual(parsePagination(null, null), { page: 1, pageSize: 20 });
  assert.equal(parsePagination('0', '20'), null);
  assert.equal(parsePagination('1', '101'), null);
  assert.equal(hasAdminRole({ role: 'ADMIN' }), true);
  assert.equal(hasAdminRole({ role: 'USER' }), false);
  assert.equal(hasAdminRole({}), false);

  const uuid1 = '8e39056e-8eb8-4ec4-97ce-a2e59f58c2f1';
  assert.equal(isValidUuid(uuid1), true);
  assert.equal(isValidUuid('not-a-uuid'), false);

  // Explicit review_status + category
  assert.deepEqual(parseReviewPatch({ review_status: 'approved', category: 'RESIDU' }), {
    review_status: 'approved',
    category: 'RESIDU',
  });
  // Reclassify false detection without specifying review_status -> defaults to approved
  assert.deepEqual(parseReviewPatch({ category: 'ORGANIK', material: 'Daun pisang' }), {
    review_status: 'approved',
    category: 'ORGANIK',
    material: 'Daun pisang',
  });
  // Demote false positive to non-waste (category: null) -> defaults to rejected
  assert.deepEqual(parseReviewPatch({ category: null }), {
    review_status: 'rejected',
    category: null,
  });
  assert.deepEqual(parseReviewPatch({ review_status: 'rejected' }), {
    review_status: 'rejected',
  });
  assert.equal(parseReviewPatch({}), null);
  assert.equal(parseReviewPatch({ review_status: 'invalid' }), null);
  assert.equal(parseReviewPatch({ review_status: 'approved', category: 'PLASTIK' }), null);

  // Bulk delete payload
  assert.deepEqual(parseBulkDeletePayload(null, 'true'), { mode: 'all' });
  assert.deepEqual(parseBulkDeletePayload({ all: true }), { mode: 'all' });
  assert.deepEqual(parseBulkDeletePayload({ ids: [uuid1, uuid1] }), {
    mode: 'ids',
    ids: [uuid1],
  });
  assert.equal(parseBulkDeletePayload({ ids: [] }), null);
  assert.equal(parseBulkDeletePayload({ ids: ['bad-id'] }), null);
});

test('excludes uncertain/non-waste by default and includes them when includeUncertain is true', () => {
  const rows = [
    {
      trash_category: 'ORGANIK',
      analysis_status: 'completed',
      review_status: 'not_required',
      regency: 'Badung',
      district: 'Kuta',
      created_at: '2026-11-03T16:30:00.000Z', // 2026-11-04 00:30 WITA
    },
    {
      trash_category: 'RESIDU',
      analysis_status: 'completed',
      review_status: 'pending',
      regency: 'Badung',
      district: 'Mengwi',
      created_at: '2026-11-04T02:00:00.000Z', // 2026-11-04 10:00 WITA
    },
    {
      trash_category: null, // uncertain / non-waste
      analysis_status: 'completed',
      review_status: 'pending',
      regency: 'Denpasar',
      district: 'Denpasar Selatan',
      created_at: '2026-11-05T18:00:00.000Z', // 2026-11-06 02:00 WITA
    },
    {
      trash_category: 'B3',
      analysis_status: 'completed',
      review_status: 'rejected',
      regency: 'Gianyar',
      district: 'Ubud',
      created_at: '2026-11-04T05:00:00.000Z',
    },
    {
      trash_category: 'ANORGANIK',
      analysis_status: 'failed',
      review_status: 'not_required',
      regency: 'Tabanan',
      district: 'Kediri',
      created_at: '2026-11-04T06:00:00.000Z',
    },
  ];

  // 1. Default (includeUncertain = false): excludes trash_category === null from total_scans & by_regency
  const defaultSummary = computeSummaryStats(rows, false);
  assert.equal(defaultSummary.total_scans, 2);
  assert.deepEqual(defaultSummary.by_category, {
    ORGANIK: 1,
    ANORGANIK: 0,
    RESIDU: 1,
    B3: 0,
  });
  assert.equal(defaultSummary.uncertain_count, 1);
  assert.equal(defaultSummary.unclassified, 1);
  assert.equal(defaultSummary.pending_reviews, 2);
  assert.deepEqual(defaultSummary.by_regency, {
    Badung: 2,
  });

  // 2. Full mode (includeUncertain = true): includes uncertain in total_scans & by_regency
  const fullSummary = computeSummaryStats(rows, true);
  assert.equal(fullSummary.total_scans, 3);
  assert.equal(fullSummary.uncertain_count, 1);
  assert.deepEqual(fullSummary.by_regency, {
    Badung: 2,
    Denpasar: 1,
  });

  // Activity series default (excludes uncertain on 2026-11-06) vs full (includes uncertain on 2026-11-06)
  const defaultActivity = computeActivitySeries(
    rows,
    '2026-11-03T16:00:00.000Z',
    '2026-11-06T16:00:00.000Z',
    Date.now(),
    false,
  );
  assert.deepEqual(defaultActivity, [
    { date: '2026-11-04', count: 2 },
    { date: '2026-11-05', count: 0 },
    { date: '2026-11-06', count: 0 },
  ]);

  const fullActivity = computeActivitySeries(
    rows,
    '2026-11-03T16:00:00.000Z',
    '2026-11-06T16:00:00.000Z',
    Date.now(),
    true,
  );
  assert.deepEqual(fullActivity, [
    { date: '2026-11-04', count: 2 },
    { date: '2026-11-05', count: 0 },
    { date: '2026-11-06', count: 1 },
  ]);

  // Regions default vs full
  const defaultRegions = computeRegionStats(rows, false);
  assert.deepEqual(defaultRegions, [
    {
      regency: 'Badung',
      total_scans: 2,
      districts: [
        { district: 'Kuta', total_scans: 1 },
        { district: 'Mengwi', total_scans: 1 },
      ],
    },
  ]);

  const fullRegions = computeRegionStats(rows, true);
  assert.equal(fullRegions.length, 2);

  const dto = safeScanDto({
    id: '1',
    material_detected: 'Kertas minyak bekas',
    trash_category: 'RESIDU',
    confidence_score: '0.92000',
    action_instruction: 'Buang ke residu',
    balinese_context_note: null,
    analysis_status: 'completed',
    review_status: 'not_required',
    regency: 'Badung',
    district: 'Kuta',
    created_at: '2026-11-04T00:00:00Z',
    image_path: 'scans/1/a.jpg',
  });
  assert.equal(dto.confidence, 0.92);
});
