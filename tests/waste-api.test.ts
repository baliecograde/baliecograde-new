import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvEscape, getConfidenceThreshold, parseFilters } from '../lib/waste-api';

test('validates categories and Makassar date boundaries', () => {
  const filters = parseFilters(new URLSearchParams('category=B3&start_date=2026-11-01&end_date=2026-12-01'));
  assert.equal(filters?.category, 'B3');
  assert.equal(filters?.start, '2026-10-31T16:00:00.000Z');
  assert.equal(filters?.end, '2026-11-30T16:00:00.000Z');
  assert.equal(parseFilters(new URLSearchParams('category=unknown')), null);
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
  for (const value of ['ORGANIK', 'ANORGANIK', 'RESIDU', 'B3', 'numeric(6,5)', 'auth.users(id)', 'on delete set null', 'enable row level security', "'waste-images'", 'false']) {
    assert.ok(sql.toLowerCase().includes(value.toLowerCase()), 'missing migration invariant: ' + value);
  }
  const lowered = sql.toLowerCase();
  assert.equal(lowered.includes('drop table'), false);
  assert.equal(lowered.includes('truncate '), false);
  assert.equal(lowered.includes('delete from'), false);
});

import { hasAdminRole, parseGpsFields, parsePagination, sniffImageMime } from '../lib/scan-validation';

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

test('validates pagination and trusts app_metadata role only', () => {
  assert.deepEqual(parsePagination(null, null), { page: 1, pageSize: 20 });
  assert.equal(parsePagination('0', '20'), null);
  assert.equal(parsePagination('1', '101'), null);
  assert.equal(hasAdminRole({ role: 'ADMIN' }), true);
  assert.equal(hasAdminRole({ role: 'USER' }), false);
  assert.equal(hasAdminRole({}), false);
});
