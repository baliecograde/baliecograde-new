import { MapPin, ScanLine, Trophy } from 'lucide-react';
import { WASTE_CATEGORIES } from '@/lib/wasteCategories';
import type { ScanSummary } from '@/types/waste';
export function MetricCards({ summary }: { summary: ScanSummary }) {
  const top = summary.topCategory;
  const TopIcon = top ? WASTE_CATEGORIES[top.category].icon : Trophy;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Metric
        label="Total pemindaian"
        value={summary.total.toLocaleString('id-ID')}
        description="Semua foto yang diklasifikasikan"
        icon={ScanLine}
        iconClass="bg-emerald-500/15 text-emerald-400"
      />
      <Metric
        label="Kabupaten aktif"
        value={String(summary.activeRegencies)}
        description="Wilayah dengan data pemindaian"
        icon={MapPin}
        iconClass="bg-sky-500/15 text-sky-400"
      />
      <Metric
        label="Kategori terbanyak"
        value={top ? WASTE_CATEGORIES[top.category].label : '—'}
        description={top ? `${top.count.toLocaleString('id-ID')} pemindaian` : 'Belum ada data'}
        icon={TopIcon}
        iconClass="bg-amber-500/15 text-amber-400"
      />
    </div>
  );
}

function Metric({
  label,
  value,
  description,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof ScanLine;
  iconClass: string;
}) {
  return (
    <article className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:gap-4 sm:p-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 sm:text-sm">{label}</p>
        <p className="truncate text-lg font-bold text-slate-900 dark:text-white sm:text-xl">{value}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-500">{description}</p>
      </div>
    </article>
  );
}
