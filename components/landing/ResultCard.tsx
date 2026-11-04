import { CheckCircle2, ListChecks, MapPin, Sparkles, TriangleAlert } from 'lucide-react';
import { WasteBadge } from '@/components/landing/WasteBadge';
import type { ScanOutcome, ScanStatus } from '@/hooks/useWasteScan';
import { WASTE_CATEGORIES } from '@/lib/wasteCategories';

interface ResultCardProps {
  status: ScanStatus;
  outcome: ScanOutcome | null;
}

export function ResultCard({ status, outcome }: ResultCardProps) {
  return (
    <section
      aria-labelledby="result-heading"
      className="flex flex-col rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200/70 sm:p-6 dark:bg-slate-900 dark:ring-slate-800"
    >
      <h2 id="result-heading" className="text-xl font-bold text-slate-900 dark:text-white">
        Hasil Klasifikasi
      </h2>

      {status === 'scanning' && <ResultSkeleton />}

      {status !== 'scanning' && !outcome && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Sparkles className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="max-w-xs text-sm text-slate-600 dark:text-slate-400">
            Hasil analisis, tingkat keyakinan, dan cara membuang sampah akan muncul di sini.
          </p>
        </div>
      )}

      {status !== 'scanning' && outcome && <ResultDetails outcome={outcome} />}
    </section>
  );
}

function ResultDetails({ outcome }: { outcome: ScanOutcome }) {
  const meta = WASTE_CATEGORIES[outcome.category];
  const matchPercent = Math.round(outcome.confidence);

  return (
    <div className="animate-fade-up mt-5 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <WasteBadge category={outcome.category} size="lg" />
        <div className="min-w-[10rem] flex-1 sm:max-w-[12rem]">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Tingkat keyakinan</span>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{matchPercent}% Match</span>
          </div>
          <div
            role="progressbar"
            aria-label="Tingkat keyakinan klasifikasi"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={matchPercent}
            className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
          >
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${matchPercent}%`, backgroundColor: meta.chartColor }}
            />
          </div>
        </div>
      </div>

      <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <MapPin className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        {outcome.area.village}, {outcome.area.regency}, Bali
      </p>

      <div>
        <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <ListChecks className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          Cara membuang yang tepat
        </h3>
        <ol className="mt-4 space-y-3">
          {meta.instructions.map((step, index) => (
            <li
              key={step}
              className="flex gap-3 rounded-xl bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-xs font-bold text-white">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {outcome.saved ? (
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Tercatat dalam statistik kota
        </p>
      ) : (
        <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          Hasil ini belum tersimpan ke statistik kota.
        </p>
      )}
    </div>
  );
}

function ResultSkeleton() {
  return (
    <div className="mt-5 flex animate-pulse flex-col gap-5" aria-hidden="true">
      <div className="flex items-center justify-between gap-4">
        <div className="h-10 w-36 rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-6 w-28 rounded-lg bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-3">
        <div className="h-14 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-14 rounded-xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-14 rounded-xl bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}
