import { WASTE_CATEGORY_ORDER, WASTE_CATEGORIES } from '@/lib/wasteCategories';
import type { WasteCategory } from '@/types/waste';

interface CategoryDonutProps {
  countsByCategory: Record<WasteCategory, number>;
  activeCategory: WasteCategory | null;
  onSelect: (category: WasteCategory) => void;
}

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CategoryDonut({ countsByCategory, activeCategory, onSelect }: CategoryDonutProps) {
  const total = WASTE_CATEGORY_ORDER.reduce((sum, category) => sum + countsByCategory[category], 0);

  let cumulativeFraction = 0;
  const segments = WASTE_CATEGORY_ORDER.map((category) => {
    const fraction = total > 0 ? countsByCategory[category] / total : 0;
    const segment = {
      category,
      fraction,
      dashLength: fraction * CIRCUMFERENCE,
      dashOffset: -cumulativeFraction * CIRCUMFERENCE,
    };
    cumulativeFraction += fraction;
    return segment;
  });

  return (
    <section className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200/70 sm:p-6 dark:bg-slate-900 dark:ring-slate-800">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rasio Kategori Sampah</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Organik, anorganik, dan residu.</p>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center lg:flex-col xl:flex-row">
        <div className="relative h-44 w-44 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full" role="img" aria-label="Diagram kategori sampah">
            <circle cx="60" cy="60" r={RADIUS} fill="none" strokeWidth="14" className="stroke-slate-100 dark:stroke-slate-800" />
            {total > 0 &&
              segments.map((segment) => (
                <circle
                  key={segment.category}
                  cx="60"
                  cy="60"
                  r={RADIUS}
                  fill="none"
                  strokeWidth={activeCategory === segment.category ? 18 : 14}
                  stroke={WASTE_CATEGORIES[segment.category].chartColor}
                  strokeDasharray={`${segment.dashLength} ${CIRCUMFERENCE}`}
                  strokeDashoffset={segment.dashOffset}
                  transform="rotate(-90 60 60)"
                  className="transition-[stroke-width] duration-300"
                />
              ))}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">{total.toLocaleString('id-ID')}</span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total</span>
          </div>
        </div>

        <ul className="w-full max-w-xs space-y-2">
          {segments.map(({ category, fraction }) => {
            const meta = WASTE_CATEGORIES[category];
            const active = activeCategory === category;
            return (
              <li key={category}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(category)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    active ? 'bg-slate-100 ring-1 ring-slate-300 dark:bg-slate-800 dark:ring-slate-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="flex items-center gap-2.5 font-semibold text-slate-700 dark:text-slate-200">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.chartColor }} aria-hidden="true" />
                    {meta.label}
                  </span>
                  <span className="tabular-nums text-slate-600 dark:text-slate-300">
                    {countsByCategory[category].toLocaleString('id-ID')}{' '}
                    <span className="text-slate-500 dark:text-slate-400">({Math.round(fraction * 100)}%)</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
