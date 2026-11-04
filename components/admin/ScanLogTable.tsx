import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff, X } from 'lucide-react';
import { WasteBadge } from '@/components/landing/WasteBadge';
import { WASTE_CATEGORIES } from '@/lib/wasteCategories';
import type { ScanFilters } from '@/lib/scanStats';
import type { WasteScan } from '@/types/waste';

const PAGE_SIZE = 10;
const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

interface ScanLogTableProps {
  scans: WasteScan[];
  filters: ScanFilters;
  onClearRegency: () => void;
  onClearCategory: () => void;
}

export function ScanLogTable({ scans, filters, onClearRegency, onClearCategory }: ScanLogTableProps) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(scans.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = scans.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const hasFilters = filters.regency !== null || filters.category !== null;

  return (
    <section className="rounded-2xl bg-white shadow-soft ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Log Pemindaian</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {scans.length.toLocaleString('id-ID')} catatan
            {hasFilters ? ' sesuai filter' : ''}
          </p>
        </div>
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {filters.regency && (
              <FilterChip label={`Kabupaten: ${filters.regency}`} onClear={onClearRegency} />
            )}
            {filters.category && (
              <FilterChip label={`Kategori: ${WASTE_CATEGORIES[filters.category].label}`} onClear={onClearCategory} />
            )}
          </div>
        )}
      </div>

      {scans.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-slate-600 dark:text-slate-400">
          Belum ada pemindaian pada rentang dan filter ini.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">Foto</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Kabupaten</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Desa/Kelurahan</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Kategori</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pageRows.map((scan) => (
                  <tr key={scan.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-3">
                      {scan.thumbnail ? (
                        <img
                          src={scan.thumbnail}
                          alt={`Foto sampah dari ${scan.village}`}
                          loading="lazy"
                          className="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                      ) : (
                        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                          <ImageOff className="h-5 w-5" aria-label="Tidak ada foto" />
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">{scan.regency}</td>
                    <td className="px-5 py-3 text-slate-700 dark:text-slate-300">{scan.village}</td>
                    <td className="px-5 py-3">
                      <WasteBadge category={scan.category} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 tabular-nums text-slate-600 dark:text-slate-400">
                      {TIMESTAMP_FORMATTER.format(new Date(scan.created_at))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm dark:border-slate-800">
            <span className="text-slate-600 dark:text-slate-400">
              Halaman {currentPage + 1} dari {pageCount}
            </span>
            <div className="flex items-center gap-2">
              <PagerButton
                label="Halaman sebelumnya"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
                icon={ChevronLeft}
              />
              <PagerButton
                label="Halaman berikutnya"
                disabled={currentPage >= pageCount - 1}
                onClick={() => setPage(currentPage + 1)}
                icon={ChevronRight}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 py-1 pl-3 pr-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Hapus filter ${label}`}
        className="rounded-full p-0.5 transition hover:bg-emerald-100 dark:hover:bg-emerald-900"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
}

function PagerButton({
  label,
  disabled,
  onClick,
  icon: Icon,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon: typeof ChevronLeft;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
