import type { SupabaseClient } from '@supabase/supabase-js';
import type { WasteCategory } from '@/types/waste';
export const WASTE_CATEGORIES: WasteCategory[] = ['ORGANIK', 'ANORGANIK', 'RESIDU', 'B3'];
export interface ScanFilters { category: WasteCategory | null; regency: string | null; district: string | null; search: string | null; start: string | null; end: string | null }
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
  const category = params.get('category'); const startDate = params.get('start_date'); const endDate = params.get('end_date');
  const validDate = (value: string | null) => {
    if (!value) return true;
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00Z');
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  };
  if ((category && !WASTE_CATEGORIES.includes(category as WasteCategory)) || !validDate(startDate) || !validDate(endDate) || (startDate && endDate && startDate >= endDate)) return null;
  const toUtc = (value: string | null) => value ? new Date(value + 'T00:00:00+08:00').toISOString() : null;
  return { category: category as WasteCategory | null, regency: params.get('regency')?.trim().slice(0, 100) || null, district: params.get('district')?.trim().slice(0, 100) || null, search: params.get('search')?.trim().slice(0, 120) || null, start: toUtc(startDate), end: toUtc(endDate) };
}
export function applyScanFilters(query: FilterQuery, filters: ScanFilters): FilterQuery {
  let next = query;
  if (filters.category) next = next.eq('trash_category', filters.category);
  if (filters.regency) next = next.eq('regency', filters.regency);
  if (filters.district) next = next.eq('district', filters.district);
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
  return { id: row.id, material: row.material_detected, category: row.trash_category, confidence: row.confidence_score, instruction: row.action_instruction, local_context: row.balinese_context_note, analysis_status: row.analysis_status, review_status: row.review_status, regency: row.regency, district: row.district, scanned_at: row.created_at, image_path: row.image_path };
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
