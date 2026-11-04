import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { CategoryDonut } from '@/components/admin/CategoryDonut';
import { MetricCards } from '@/components/admin/MetricCards';
import { RegencyBarChart } from '@/components/admin/RegencyBarChart';
import { ScanLogTable } from '@/components/admin/ScanLogTable';
import { useTheme } from '@/hooks/useTheme';
import {
  filterScans,
  getRangeStartIso,
  summarizeScans,
  type DateRange,
  type ScanFilters,
} from '@/lib/scanStats';
import { fetchWasteScans } from '@/lib/wasteScans';
import type { WasteCategory, WasteScan } from '@/types/waste';

type LoadState = 'loading' | 'ready' | 'error';

const NO_FILTERS: ScanFilters = { regency: null, category: null };

export function AdminDashboardPage() {
  const { theme, toggleTheme } = useTheme();
  const [range, setRange] = useState<DateRange>('30d');
  const [scans, setScans] = useState<WasteScan[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const [filters, setFilters] = useState<ScanFilters>(NO_FILTERS);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');

    fetchWasteScans(getRangeStartIso(range))
      .then((rows) => {
        if (cancelled) return;
        setScans(rows);
        setLoadState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [range, reloadKey]);

  const summary = useMemo(() => summarizeScans(scans), [scans]);
  const tableRows = useMemo(() => filterScans(scans, filters), [scans, filters]);

  const selectRegency = useCallback((regency: string) => {
    setFilters((current) => ({
      ...current,
      regency: current.regency === regency ? null : regency,
    }));
  }, []);

  const selectCategory = useCallback((category: WasteCategory) => {
    setFilters((current) => ({
      ...current,
      category: current.category === category ? null : category,
    }));
  }, []);

  return (
    <div className="min-h-screen lg:flex">
      <AdminSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader
          range={range}
          onRangeChange={setRange}
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenMenu={() => setMenuOpen(true)}
        />

        <main className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8">
          {loadState === 'loading' && <LoadingPanel />}

          {loadState === 'error' && (
            <div
              role="alert"
              className="flex flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-soft ring-1 ring-rose-200 dark:bg-slate-900 dark:ring-rose-900"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                <AlertTriangle className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Data dashboard belum bisa dimuat</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Periksa koneksi internet lalu coba lagi.</p>
              </div>
              <button
                type="button"
                onClick={() => setReloadKey((key) => key + 1)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Coba lagi
              </button>
            </div>
          )}

          {loadState === 'ready' && (
            <>
              <section id="ringkasan" className="scroll-mt-24">
                <MetricCards summary={summary} />
              </section>

              <section id="analitik" className="scroll-mt-24 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                <RegencyBarChart
                  countsByRegency={summary.byRegency}
                  activeRegency={filters.regency}
                  onSelect={selectRegency}
                />
                <CategoryDonut
                  countsByCategory={summary.byCategory}
                  activeCategory={filters.category}
                  onSelect={selectCategory}
                />
              </section>

              <section id="log" className="scroll-mt-24">
                <ScanLogTable
                  key={`${range}-${filters.regency ?? ''}-${filters.category ?? ''}`}
                  scans={tableRows}
                  filters={filters}
                  onClearRegency={() => setFilters((current) => ({ ...current, regency: null }))}
                  onClearCategory={() => setFilters((current) => ({ ...current, category: null }))}
                />
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <div role="status" className="space-y-6" aria-label="Memuat data">
      <div className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
      <div className="grid animate-pulse gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="h-80 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}
