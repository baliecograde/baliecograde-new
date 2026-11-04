import { WASTE_CATEGORY_ORDER, WASTE_CATEGORIES } from '@/lib/wasteCategories';
import type { WasteCategory } from '@/types/waste';
interface Props { countsByCategory: Record<WasteCategory, number>; activeCategory: WasteCategory | null; onSelect: (category: WasteCategory) => void }
export function CategoryDonut({ countsByCategory, activeCategory, onSelect }: Props) {
  const total = WASTE_CATEGORY_ORDER.reduce((sum, key) => sum + countsByCategory[key], 0);
  return <section className="rounded-2xl bg-white p-5 shadow ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"><h2 className="mb-4 text-lg font-bold">Kategori Sampah</h2><ul className="space-y-2">{WASTE_CATEGORY_ORDER.map((category) => {
    const meta = WASTE_CATEGORIES[category]; const count = countsByCategory[category]; const active = activeCategory === category;
    return <li key={category}><button type="button" aria-pressed={active} onClick={() => onSelect(category)} className="flex w-full items-center justify-between rounded-lg p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"><span style={{ color: meta.chartColor }}>{meta.label}</span><span>{count.toLocaleString('id-ID')} ({total ? Math.round(count / total * 100) : 0}%)</span></button></li>;
  })}</ul></section>;
}
