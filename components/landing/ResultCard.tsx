import { CheckCircle2, ListChecks, MapPin, Sparkles, TriangleAlert } from 'lucide-react';
import { WasteBadge } from '@/components/landing/WasteBadge';
import type { ScanOutcome, ScanStatus } from '@/hooks/useWasteScan';
import { WASTE_CATEGORIES } from '@/lib/wasteCategories';
interface ResultCardProps { status: ScanStatus; outcome: ScanOutcome | null }
export function ResultCard({ status, outcome }: ResultCardProps) {
  return <section aria-labelledby="result-heading" className="flex flex-col rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200/70 sm:p-6 dark:bg-slate-900 dark:ring-slate-800">
    <h2 id="result-heading" className="text-xl font-bold text-slate-900 dark:text-white">Hasil Klasifikasi</h2>
    {status === 'scanning' && <p className="py-12 text-center text-slate-600">Foto sedang diunggah dan dianalisis…</p>}
    {status !== 'scanning' && !outcome && <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center"><Sparkles className="h-8 w-8 text-emerald-600" aria-hidden="true" /><p className="max-w-xs text-sm text-slate-600 dark:text-slate-400">Hasil analisis akan muncul setelah foto diproses oleh layanan AI.</p></div>}
    {status !== 'scanning' && outcome && <div className="mt-5 flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {outcome.category ? <WasteBadge category={outcome.category} size="lg" /> : <span className="rounded-full bg-amber-100 px-4 py-2 font-semibold text-amber-900">Belum dapat diklasifikasikan</span>}
        {outcome.confidence !== null && <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Keyakinan {(outcome.confidence * 100).toFixed(1)}%</span>}
      </div>
      <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400"><MapPin className="h-4 w-4" aria-hidden="true" />{[outcome.area.district, outcome.area.regency].filter(Boolean).join(', ') || 'Lokasi tidak tersedia'}</p>
      {outcome.category && <div><h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white"><ListChecks className="h-5 w-5 text-emerald-600" aria-hidden="true" />Cara menangani</h3><ol className="mt-3 space-y-2">{WASTE_CATEGORIES[outcome.category].instructions.map((item, i) => <li key={item} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800"><span className="mr-2 font-bold">{i + 1}.</span>{item}</li>)}</ol></div>}
      {outcome.reviewStatus === 'pending' && <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Hasil ini menunggu tinjauan manusia karena keyakinan rendah atau kategori belum pasti.</p>}
      <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Pemindaian tercatat</p>
    </div>}
    {status === 'error' && !outcome && <p className="mt-3 flex items-center gap-2 text-sm text-rose-700"><TriangleAlert className="h-4 w-4" />Pemindaian belum berhasil.</p>}
  </section>;
}
