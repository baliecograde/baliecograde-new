import { MapPin, ScanLine, Trophy } from 'lucide-react';
import { WASTE_CATEGORIES } from '@/lib/wasteCategories';
import type { ScanSummary } from '@/types/waste';
export function MetricCards({ summary }: { summary: ScanSummary }) {
  const top = summary.topCategory;
  const TopIcon = top ? WASTE_CATEGORIES[top.category].icon : Trophy;
  return <div className="grid gap-4 sm:grid-cols-3"><Metric label="Total pemindaian" value={summary.total.toLocaleString('id-ID')} icon={ScanLine} /><Metric label="Kabupaten terpetakan" value={String(summary.activeRegencies)} icon={MapPin} /><Metric label="Kategori terbanyak" value={top ? WASTE_CATEGORIES[top.category].label : '—'} icon={TopIcon} /></div>;
}
function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof ScanLine }) {
  return <article className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800"><Icon className="h-6 w-6 text-emerald-700" aria-hidden="true" /><div><p className="text-sm text-slate-500">{label}</p><p className="text-xl font-bold">{value}</p></div></article>;
}
