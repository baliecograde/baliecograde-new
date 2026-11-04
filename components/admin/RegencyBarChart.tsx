import { BALI_REGENCIES } from '@/lib/regions';

interface RegencyBarChartProps {
  countsByRegency: Record<string, number>;
  activeRegency: string | null;
  onSelect: (regency: string) => void;
}

export function RegencyBarChart({ countsByRegency, activeRegency, onSelect }: RegencyBarChartProps) {
  const rows = BALI_REGENCIES.map((regency) => ({ regency, count: countsByRegency[regency] ?? 0 })).sort(
    (a, b) => b.count - a.count,
  );
  const maxCount = Math.max(1, ...rows.map((row) => row.count));

  return (
    <section className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200/70 sm:p-6 dark:bg-slate-900 dark:ring-slate-800">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Pemindaian per Kabupaten</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Klik satu kabupaten untuk memfilter log di bawah.</p>
      </div>

      <ul className="space-y-2.5">
        {rows.map(({ regency, count }) => {
          const active = activeRegency === regency;
          const width = (count / maxCount) * 100;
          return (
            <li key={regency}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(regency)}
                className={`group grid w-full grid-cols-[6.5rem_1fr_3rem] items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition sm:grid-cols-[8rem_1fr_3.5rem] ${
                  active ? 'bg-emerald-50 ring-1 ring-emerald-400 dark:bg-emerald-950/40 dark:ring-emerald-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="truncate font-semibold text-slate-700 dark:text-slate-200">{regency}</span>
                <span className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
                  <span
                    className="block h-full rounded-full bg-emerald-600 transition-[width] duration-700 ease-out group-hover:bg-emerald-500 dark:bg-emerald-500"
                    style={{ width: `${width}%` }}
                  />
                </span>
                <span className="text-right font-bold tabular-nums text-slate-900 dark:text-white">
                  {count.toLocaleString('id-ID')}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
