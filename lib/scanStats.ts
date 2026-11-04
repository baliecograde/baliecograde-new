import { WASTE_CATEGORY_ORDER } from '@/lib/wasteCategories';
import type { WasteCategory, WasteScan } from '@/types/waste';

export type DateRange = '7d' | '30d' | 'all';

export const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '7d', label: '7 hari' },
  { value: '30d', label: '30 hari' },
  { value: 'all', label: 'Semua' },
];

export function getRangeStartIso(range: DateRange): string | null {
  if (range === 'all') return null;
  const days = range === '7d' ? 7 : 30;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export interface ScanFilters {
  regency: string | null;
  category: WasteCategory | null;
}

export interface ScanSummary {
  total: number;
  activeRegencies: number;
  topCategory: { category: WasteCategory; count: number } | null;
  byRegency: Record<string, number>;
  byCategory: Record<WasteCategory, number>;
}

export function filterScans(scans: WasteScan[], filters: ScanFilters): WasteScan[] {
  return scans.filter(
    (scan) =>
      (filters.regency === null || scan.regency === filters.regency) &&
      (filters.category === null || scan.category === filters.category),
  );
}

export function summarizeScans(scans: WasteScan[]): ScanSummary {
  const byRegency: Record<string, number> = {};
  const byCategory: Record<WasteCategory, number> = { organic: 0, inorganic: 0, residue: 0 };

  for (const scan of scans) {
    byRegency[scan.regency] = (byRegency[scan.regency] ?? 0) + 1;
    byCategory[scan.category] += 1;
  }

  let topCategory: ScanSummary['topCategory'] = null;
  for (const category of WASTE_CATEGORY_ORDER) {
    const count = byCategory[category];
    if (count > 0 && (topCategory === null || count > topCategory.count)) {
      topCategory = { category, count };
    }
  }

  return {
    total: scans.length,
    activeRegencies: Object.keys(byRegency).length,
    topCategory,
    byRegency,
    byCategory,
  };
}
