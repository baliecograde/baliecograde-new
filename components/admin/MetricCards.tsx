import { ScanLine, MapPin, Trophy } from 'lucide-react';
import { BALI_REGENCIES } from '@/lib/regions';
import { WASTE_CATEGORIES } from '@/lib/wasteCategories';
import type { ScanSummary } from '@/lib/scanStats';

interface MetricCardsProps {
  summary: ScanSummary;
}

export function MetricCards({ summary }: MetricCardsProps) {
  const top = summary.topCategory;
  const topMeta = top ? WASTE_CATEGORIES[top.category] : null;
  const TopIcon = topMeta?.icon ?? Trophy;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <MetricCard
        label="Total Pemindaian"
        value={summary.total.toLocaleString('id-ID')}
        hint="Semua foto yang diklasifikasikan"
        icon={ScanLine}
        tone="emerald"
      />
      <MetricCard
        label="Kabupaten Aktif"
        value={`${summary.activeRegencies}`}
        hint={`dari ${BALI_REGENCIES.length} kabupaten/kota`}
        icon={MapPin}
        tone="sky"
      />
      <MetricCard
        label="Kategori Terbanyak"
        value={topMeta ? topMeta.label : '-'}
        hint={top ? `${top.count.toLocaleString('id-ID')} pemindaian` : 'Belum ada data'}
        icon={TopIcon}
        tone="slate"
      />
    </div>
  );
}

const TONE_CLASSES = {
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300',
  slate: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
};

interface MetricCardProps {
  label: string;
  value: string;
  hint: string;
  icon: typeof ScanLine;
  tone: keyof typeof TONE_CLASSES;
}

function MetricCard({ label, value, hint, icon: Icon, tone }: MetricCardProps) {
  return (
    <article className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-lift dark:bg-slate-900 dark:ring-slate-800">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${TONE_CLASSES[tone]}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      </div>
    </article>
  );
}
