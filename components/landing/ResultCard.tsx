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
        className="flex min-w-0 flex-col rounded-2xl bg-white p-4 shadow-soft ring-1 ring-slate-200/70 sm:p-6 dark:bg-slate-900 dark:ring-slate-800"
      >
        <h2 id="result-heading" className="text-xl font-bold text-slate-900 dark:text-white">
          Hasil Klasifikasi
        </h2>

        {status === 'scanning' && (
          <p role="status" className="py-12 text-center text-slate-600 dark:text-slate-400">
            Foto sedang diunggah dan dianalisis…
          </p>
        )}

        {status !== 'scanning' && !outcome && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
            <Sparkles className="h-8 w-8 text-emerald-600" aria-hidden="true" />
            <p className="max-w-xs text-sm text-slate-600 dark:text-slate-400">
              Hasil analisis akan muncul setelah foto diproses oleh layanan AI.
            </p>
          </div>
        )}

        {status !== 'scanning' && outcome && <ResultDetails outcome={outcome} />}
        {status === 'error' && !outcome && (
          <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300">
            <TriangleAlert className="h-4 w-4" aria-hidden="true" />
            Pemindaian belum berhasil.
          </p>
        )}
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

function summarizeReason(reason: string | null): string {
  const conciseReason =
    reason?.trim().split(/(?<=[.!?])\s/)[0] || 'Objek pada foto belum dapat dikenali sebagai sampah.';
  return conciseReason.length > 180 ? `${conciseReason.slice(0, 177).trimEnd()}...` : conciseReason;
}

function ResultDetails({ outcome }: { outcome: ScanOutcome }) {
  const categoryValue = outcome.category;
  const category = categoryValue ? WASTE_CATEGORIES[categoryValue] : null;
  const location = [outcome.area.district, outcome.area.regency].filter(Boolean).join(', ');

  return (
    <div className="animate-fade-up mt-5 flex flex-col gap-6">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/70 dark:bg-emerald-950/30">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
          <ScanSearch className="h-4 w-4" aria-hidden="true" />
          {category ? 'Objek terdeteksi' : 'Objek belum dikenali'}
        </p>
        <h3 className="mt-1.5 break-words text-xl font-bold leading-snug text-slate-900 dark:text-white sm:text-2xl">
          {outcome.material || 'Tidak ada objek sampah yang dikenali'}
        </h3>
      </div>

      <div className="flex flex-col items-start gap-3">
        {categoryValue !== null ? (
          <WasteBadge category={categoryValue} size="lg" />
        ) : (
          <span className="rounded-full bg-amber-100 px-4 py-2 font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
            Belum dapat diklasifikasikan
          </span>
        )}
        {outcome.confidence !== null && (
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Keyakinan {(outcome.confidence * 100).toFixed(1)}%
          </span>
        )}
      </div>

      <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <MapPin className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        {location || 'Lokasi tidak tersedia'}
      </p>

      {outcome.reason && (
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <ListChecks className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Alasan klasifikasi
          </h3>
          <p className="mt-3 break-words rounded-xl bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
            {outcome.reason}
          </p>
        </div>
      )}

      {outcome.instruction && (
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">Cara membuang yang tepat</h3>
          <p className="mt-3 break-words rounded-xl bg-slate-50 p-3.5 text-sm leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
            {outcome.instruction}
          </p>
        </div>
      )}

      {outcome.localContext && (
        <p className="break-words rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm leading-relaxed text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <span className="font-semibold">Konteks Bali: </span>
          {outcome.localContext}
        </p>
      )}

      {outcome.reviewStatus === 'pending' && (
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Hasil ini menunggu tinjauan karena keyakinan rendah atau kategori belum pasti.
        </p>
      )}

      {outcome.saved ? (
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Pemindaian tercatat
        </p>
      ) : (
        <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
          <TriangleAlert className="h-4 w-4" aria-hidden="true" />
          Hasil ini belum tersimpan.
        </p>
      )}
    </div>
  );
}
