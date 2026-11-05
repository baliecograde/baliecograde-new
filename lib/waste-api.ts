import type { SupabaseClient } from '@supabase/supabase-js';
import type { WasteCategory } from '@/types/waste';

export const WASTE_CATEGORIES: WasteCategory[] = ['ORGANIK', 'ANORGANIK', 'RESIDU', 'B3'];
export type DbAnalysisStatus = 'pending' | 'completed' | 'failed';
export type DbReviewStatus = 'not_required' | 'pending' | 'approved' | 'rejected';

const ANALYSIS_STATUSES: DbAnalysisStatus[] = ['pending', 'completed', 'failed'];
const REVIEW_STATUSES: DbReviewStatus[] = ['not_required', 'pending', 'approved', 'rejected'];

export const DEFAULT_CATEGORY_INSTRUCTIONS: Record<WasteCategory, string> = {
  ORGANIK: 'Pisahkan dan olah sebagai sampah organik atau kompos.',
  ANORGANIK: 'Bersihkan lalu pilah untuk didaur ulang atau setorkan ke bank sampah.',
  RESIDU: 'Buang terpisah dari sampah organik dan material daur ulang.',
  B3: 'Simpan dengan aman dan serahkan ke fasilitas pengumpulan limbah B3 resmi.',
};

export interface ScanFilters {
  category: WasteCategory | null;
  regency: string | null;
  district: string | null;
  search: string | null;
  start: string | null;
  end: string | null;
  review_status?: DbReviewStatus | null;
  analysis_status?: DbAnalysisStatus | null;
}

export interface SummaryStats {
  total_scans: number;
  by_category: Record<WasteCategory, number>;
  unclassified: number;
  pending_reviews: number;
  by_regency: Record<string, number>;
}

export interface ActivityPoint {
  date: string;
  count: number;
}

export interface DistrictStat {
  district: string;
  total_scans: number;
}

export interface RegionStat {
  regency: string | null;
  total_scans: number;
  districts: DistrictStat[];
}

type QueryResult = { data: unknown[] | null; error: unknown; count?: number | null };
interface FilterQuery extends PromiseLike<QueryResult> {
  eq(column: string, value: string): FilterQuery;
  gte(column: string, value: string): FilterQuery;
  lt(column: string, value: string): FilterQuery;
  or(filters: string): FilterQuery;
  order(column: string, options: { ascending: boolean }): FilterQuery;
  range(from: number, to: number): FilterQuery;
}
interface LooseSupabase { from(table: string): { select(columns: string, options?: { count?: string }): FilterQuery } }

export function parseFilters(params: URLSearchParams): ScanFilters | null {
  const category = params.get('category');
  const startDate = params.get('start_date');
  const endDate = params.get('end_date');
  const reviewStatus = params.get('review_status');
  const analysisStatus = params.get('analysis_status');

  const validDate = (value: string | null) => {
    if (!value) return true;
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  };
  if (
    (category && !WASTE_CATEGORIES.includes(category as WasteCategory)) ||
    (reviewStatus && !REVIEW_STATUSES.includes(reviewStatus as DbReviewStatus)) ||
    (analysisStatus && !ANALYSIS_STATUSES.includes(analysisStatus as DbAnalysisStatus)) ||
    !validDate(startDate) ||
    !validDate(endDate) ||
    (startDate && endDate && startDate >= endDate)
  ) {
    return null;
  }
  const toUtc = (value: string | null) => value ? new Date(value + 'T00:00:00+08:00').toISOString() : null;
  const result: ScanFilters = {
    category: category as WasteCategory | null,
    regency: params.get('regency')?.trim().slice(0, 100) || null,
    district: params.get('district')?.trim().slice(0, 100) || null,
    search: params.get('search')?.trim().slice(0, 120) || null,
    start: toUtc(startDate),
    end: toUtc(endDate),
  };
  if (reviewStatus) result.review_status = reviewStatus as DbReviewStatus;
  if (analysisStatus) result.analysis_status = analysisStatus as DbAnalysisStatus;
  return result;
}

export function applyScanFilters(query: FilterQuery, filters: ScanFilters): FilterQuery {
  let next = query;
  if (filters.category) next = next.eq('trash_category', filters.category);
  if (filters.regency) next = next.eq('regency', filters.regency);
  if (filters.district) next = next.eq('district', filters.district);
  if (filters.review_status) next = next.eq('review_status', filters.review_status);
  if (filters.analysis_status) next = next.eq('analysis_status', filters.analysis_status);
  if (filters.start) next = next.gte('created_at', filters.start);
  if (filters.end) next = next.lt('created_at', filters.end);
  if (filters.search) {
    const term = filters.search.replace(/[^\p{L}\p{N}\s_-]/gu, ' ').trim();
    if (term) next = next.or('material_detected.ilike.%' + term + '%,regency.ilike.%' + term + '%,district.ilike.%' + term + '%');
  }
  return next;
}

export function buildFilteredQuery(supabase: SupabaseClient, fields: string, filters: ScanFilters, withCount = false): FilterQuery {
  const client = supabase as unknown as LooseSupabase;
  const options = withCount ? { count: 'exact' } : undefined;
  return applyScanFilters(client.from('waste_scans').select(fields, options), filters);
}

export async function readAllFilteredRows(supabase: SupabaseClient, filters: ScanFilters, fields: string, batchSize = 1000) {
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; ; offset += batchSize) {
    const query = buildFilteredQuery(supabase, fields, filters).order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + batchSize - 1);
    const { data, error } = await query;
    if (error) throw error;
    const page = (data ?? []) as unknown as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < batchSize) return rows;
  }
}

export function safeScanDto(row: Record<string, unknown>) {
  const rawConfidence = row.confidence_score;
  const confidence =
    rawConfidence === null || rawConfidence === undefined || rawConfidence === ''
      ? null
      : Number.isFinite(Number(rawConfidence))
        ? Number(rawConfidence)
        : null;
  return {
    id: row.id,
    material: row.material_detected ?? null,
    category: row.trash_category ?? null,
    confidence,
    instruction: row.action_instruction ?? null,
    local_context: row.balinese_context_note ?? null,
    analysis_status: row.analysis_status,
    review_status: row.review_status,
    regency: row.regency ?? null,
    district: row.district ?? null,
    scanned_at: row.created_at,
    image_path: row.image_path ?? null,
  };
}

function isStatEligibleRow(row: Record<string, unknown>): boolean {
  const analysisStatus = row.analysis_status ?? 'completed';
  const reviewStatus = row.review_status ?? 'not_required';
  return analysisStatus === 'completed' && reviewStatus !== 'rejected';
}

export function computeSummaryStats(rows: Record<string, unknown>[]): SummaryStats {
  const byCategory: Record<WasteCategory, number> = {
    ORGANIK: 0,
    ANORGANIK: 0,
    RESIDU: 0,
    B3: 0,
  };
  const byRegency: Record<string, number> = {};
  let totalScans = 0;
  let unclassified = 0;
  let pendingReviews = 0;

  for (const row of rows) {
    const analysisStatus = row.analysis_status ?? 'completed';
    if (analysisStatus === 'completed' && row.review_status === 'pending') {
      pendingReviews += 1;
    }
    if (!isStatEligibleRow(row)) continue;

    totalScans += 1;
    const category = typeof row.trash_category === 'string' && WASTE_CATEGORIES.includes(row.trash_category as WasteCategory)
      ? (row.trash_category as WasteCategory)
      : null;
    if (category) {
      byCategory[category] += 1;
    } else {
      unclassified += 1;
    }

    const regency = typeof row.regency === 'string' && row.regency.trim() ? row.regency.trim() : 'Tidak diketahui';
    byRegency[regency] = (byRegency[regency] ?? 0) + 1;
  }

  return {
    total_scans: totalScans,
    by_category: byCategory,
    unclassified,
    pending_reviews: pendingReviews,
    by_regency: byRegency,
  };
}

export function toMakassarDateString(dateInput: string | number | Date): string {
  const ms = typeof dateInput === 'number' ? dateInput : new Date(dateInput).getTime();
  return new Date(ms + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function computeActivitySeries(
  rows: Record<string, unknown>[],
  startIso: string | null,
  endIso: string | null,
  nowMs = Date.now(),
): ActivityPoint[] {
  const counts = new Map<string, number>();
  let earliestDate: string | null = null;

  for (const row of rows) {
    if (!isStatEligibleRow(row)) continue;
    if (typeof row.created_at !== 'string') continue;
    const timestamp = new Date(row.created_at).getTime();
    if (Number.isNaN(timestamp)) continue;
    const day = toMakassarDateString(timestamp);
    counts.set(day, (counts.get(day) ?? 0) + 1);
    if (!earliestDate || day < earliestDate) earliestDate = day;
  }

  const endDayInclusive = endIso
    ? toMakassarDateString(new Date(endIso).getTime() - 1)
    : toMakassarDateString(nowMs);

  let startDay: string;
  if (startIso) {
    startDay = toMakassarDateString(startIso);
  } else {
    const defaultStartMs = new Date(endDayInclusive + 'T00:00:00Z').getTime() - 29 * 24 * 60 * 60 * 1000;
    const defaultStartDay = new Date(defaultStartMs).toISOString().slice(0, 10);
    startDay = earliestDate && earliestDate < defaultStartDay ? earliestDate : defaultStartDay;
  }

  if (startDay > endDayInclusive) return [];

  const series: ActivityPoint[] = [];
  const cursor = new Date(startDay + 'T00:00:00Z');
  const last = new Date(endDayInclusive + 'T00:00:00Z');
  while (cursor <= last) {
    const dayKey = cursor.toISOString().slice(0, 10);
    series.push({ date: dayKey, count: counts.get(dayKey) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
}

export function computeRegionStats(rows: Record<string, unknown>[]): RegionStat[] {
  const regencyMap = new Map<string | null, { total: number; districts: Map<string, number> }>();

  for (const row of rows) {
    if (!isStatEligibleRow(row)) continue;
    const regency = typeof row.regency === 'string' && row.regency.trim() ? row.regency.trim() : null;
    const district = typeof row.district === 'string' && row.district.trim() ? row.district.trim() : null;

    let entry = regencyMap.get(regency);
    if (!entry) {
      entry = { total: 0, districts: new Map<string, number>() };
      regencyMap.set(regency, entry);
    }
    entry.total += 1;
    if (district) {
      entry.districts.set(district, (entry.districts.get(district) ?? 0) + 1);
    }
  }

  const results: RegionStat[] = [];
  for (const [regency, value] of regencyMap.entries()) {
    const districts = Array.from(value.districts.entries())
      .map(([district, total_scans]) => ({ district, total_scans }))
      .sort((a, b) => b.total_scans - a.total_scans || a.district.localeCompare(b.district));
    results.push({ regency, total_scans: value.total, districts });
  }

  return results.sort((a, b) => {
    if (a.regency === null && b.regency !== null) return 1;
    if (a.regency !== null && b.regency === null) return -1;
    return b.total_scans - a.total_scans || (a.regency ?? '').localeCompare(b.regency ?? '');
  });
}

export function csvEscape(value: unknown) {
  let text = value == null ? '' : String(value);
  if (['=', '+', '-', '@', '\t', '\r'].includes(text.charAt(0))) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}

export function getConfidenceThreshold() {
  const threshold = Number(process.env.WASTE_CLASSIFICATION_CONFIDENCE_THRESHOLD ?? '0.70');
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new Error('Invalid confidence threshold.');
  return threshold;
}
