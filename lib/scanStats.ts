import { WASTE_CATEGORY_ORDER } from '@/lib/wasteCategories';
import type { ScanSummary, WasteCategory } from '@/types/waste';

export type DateRange = '7d' | '30d' | 'all';

export const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '7d', label: '7 hari' },
  { value: '30d', label: '30 hari' },
  { value: 'all', label: 'Semua' },
];

export interface ScanFilters {
  regency: string | null;
  category: WasteCategory | null;
}

export function summarizeServerStats(
  total: number,
  byCategoryInput: Record<string, number>,
  byRegency: Record<string, number>,
): ScanSummary {
  const byCategory = Object.fromEntries(
    WASTE_CATEGORY_ORDER.map((category) => [category, byCategoryInput[category] ?? 0]),
  ) as Record<WasteCategory, number>;

  let topCategory: ScanSummary['topCategory'] = null;
  for (const category of WASTE_CATEGORY_ORDER) {
    const count = byCategory[category];
    if (count > 0 && (!topCategory || count > topCategory.count)) {
      topCategory = { category, count };
    }
  }

  return {
    total,
    byCategory,
    byRegency,
    activeRegencies: Object.keys(byRegency).filter((key) => key !== 'Tidak diketahui').length,
    topCategory,
  };
}
