interface Props { countsByRegency: Record<string, number>; activeRegency: string | null; onSelect: (regency: string) => void }
export function RegencyBarChart({ countsByRegency, activeRegency, onSelect }: Props) {
  const rows = Object.entries(countsByRegency).filter(([key]) => key !== 'Tidak diketahui').sort((a, b) => b[1] - a[1]).slice(0, 12);
  const max = Math.max(1, ...rows.map(([, count]) => count));
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">Pemindaian per Kabupaten</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Pilih kabupaten untuk memfilter log di bawah.</p>
      </div>
      <ul className="space-y-1">
        {rows.map(([name, count]) => (
          <li key={name}>
            <button
              type="button"
              onClick={() => onSelect(name)}
              aria-pressed={activeRegency === name}
              className={`grid w-full grid-cols-[minmax(4.5rem,6.5rem)_minmax(0,1fr)_2rem] items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition sm:gap-3 sm:px-3 ${
                activeRegency === name
                  ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/70'
              }`}
            >
              <span className="truncate">{name}</span>
              <span className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${(count / max) * 100}%` }} />
              </span>
              <span className="text-right tabular-nums">{count}</span>
            </button>
          </li>
        ))}
      </ul>
      {!rows.length && <p className="text-sm text-slate-500">Wilayah belum tersedia.</p>}
    </section>
  );
}
