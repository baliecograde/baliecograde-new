import { useRef, type ChangeEvent } from 'react';
import { CheckCircle2, ListChecks, MapPin, ScanSearch, Sparkles, TriangleAlert, X } from 'lucide-react';
import { WasteBadge } from '@/components/landing/WasteBadge';
import type { ScanOutcome, ScanStatus } from '@/hooks/useWasteScan';
import { WASTE_CATEGORIES } from '@/lib/wasteCategories';

interface ResultCardProps {
  status: ScanStatus;
  outcome: ScanOutcome | null;
  showUncertainDialog: boolean;
  onDismissUncertainDialog: () => void;
  onFileSelect: (file: File) => void;
}

export function ResultCard({
  status,
  outcome,
  showUncertainDialog,
  onDismissUncertainDialog,
  onFileSelect,
}: ResultCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFileSelect(file);
    event.target.value = '';
  };

  return (
    <>
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

      {showUncertainDialog && outcome && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={onDismissUncertainDialog}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="uncertain-heading"
            aria-describedby="uncertain-reason"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                <TriangleAlert className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="uncertain-heading" className="text-lg font-bold text-slate-900 dark:text-white">
                  Sampah belum terdeteksi
                </h2>
                <p id="uncertain-reason" className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {summarizeReason(outcome.reason)}
                </p>
              </div>
              <button
                type="button"
                onClick={onDismissUncertainDialog}
                aria-label="Tutup dialog"
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              Silakan unggah foto lain yang menampilkan sampah dengan jelas.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onDismissUncertainDialog}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Lihat hasil
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              >
                Pilih gambar lain
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </section>
        </div>
      )}
    </>
  );
}

function summarizeReason(reason: string): string {
  const conciseReason = reason.trim().split(/(?<=[.!?])\s/)[0] || 'Objek pada foto belum dapat dikenali sebagai sampah.';
  return conciseReason.length > 180 ? `${conciseReason.slice(0, 177).trimEnd()}...` : conciseReason;
}

function ResultDetails({ outcome }: { outcome: ScanOutcome }) {
  const meta = WASTE_CATEGORIES[outcome.category];
  const matchPercent = Math.round(outcome.confidence);

  return (
    <div className="animate-fade-up mt-5 flex flex-col gap-6">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/30">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
          <ScanSearch className="h-4 w-4" aria-hidden="true" />
          Objek terdeteksi
        </p>
        <h3 className="mt-1.5 text-xl font-bold leading-snug text-slate-900 dark:text-white sm:text-2xl">
          {outcome.material}
        </h3>
      </div>

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

      {outcome.analysisStatus === 'uncertain' && (
        <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Hasil ini belum pasti. Coba ambil foto yang lebih jelas sebelum memilah.
        </p>
      )}

      <div>
        <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
          <ListChecks className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          Alasan klasifikasi
        </h3>
        <p className="mt-3 rounded-xl bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
          {outcome.reason}
        </p>
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">Cara membuang yang tepat</h3>
        <p className="mt-3 rounded-xl bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
          {outcome.instruction}
        </p>
      </div>

      {outcome.localContext && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm leading-relaxed text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <span className="font-semibold">Konteks Bali: </span>
          {outcome.localContext}
        </p>
      )}

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
