'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, Home, Leaf, LogOut, Moon, Sun } from 'lucide-react';
import { CategoryDonut } from '@/components/admin/CategoryDonut';
import { MetricCards } from '@/components/admin/MetricCards';
import { RegencyBarChart } from '@/components/admin/RegencyBarChart';
import { useTheme } from '@/hooks/useTheme';
import { WASTE_CATEGORIES } from '@/lib/wasteCategories';
import { WASTE_CATEGORY_ORDER } from '@/lib/wasteCategories';
import type { WasteCategory, WasteScan, ScanSummary } from '@/types/waste';

interface StatsPayload { total: number; by_category: Record<string, number>; by_regency: Record<string, number> }
interface ScansPayload { data: WasteScan[]; meta: { total: number; page: number; page_size: number; total_pages: number } }
function startDate(days: number) {
  const nowWita = new Date(Date.now() + 8 * 60 * 60 * 1000);
  nowWita.setUTCDate(nowWita.getUTCDate() - days);
  return nowWita.toISOString().slice(0, 10);
}
export function AdminDashboardPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [scans, setScans] = useState<WasteScan[]>([]);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [totalScans, setTotalScans] = useState(0);
  const [includeNonWaste, setIncludeNonWaste] = useState(false);
  const [category, setCategory] = useState<WasteCategory | ''>('');
  const [regency, setRegency] = useState('');
  const [district, setDistrict] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const query = new URLSearchParams();
    query.set('page', String(page)); query.set('page_size', '20');
    if (includeNonWaste) query.set('include_uncertain', 'true');
    if (category) query.set('category', category);
    if (regency) query.set('regency', regency);
    if (district) query.set('district', district);
    if (search) query.set('search', search);
    if (range !== 'all') query.set('start_date', startDate(range === '7d' ? 7 : 30));
    return query.toString();
  }, [page, includeNonWaste, category, regency, district, search, range]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [scansResponse, statsResponse] = await Promise.all([
          fetch(`/api/admin/scans${includeNonWaste ? '/full' : ''}?${params}`, { cache: 'no-store' }),
          fetch('/api/admin/stats?' + params, { cache: 'no-store' }),
        ]);
        if (!scansResponse.ok || !statsResponse.ok) throw new Error('Data dashboard tidak dapat dimuat.');
        const scansPayload = await scansResponse.json() as ScansPayload;
        const statsPayload = await statsResponse.json() as { data: StatsPayload };
        if (!cancelled) {
          setScans(scansPayload.data);
          setPageCount(Math.max(1, scansPayload.meta.total_pages));
          setTotalScans(scansPayload.meta.total);
          setStats(statsPayload.data);
          setError(null);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) { setError(e instanceof Error ? e.message : 'Terjadi kesalahan.'); setLoading(false); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [params, includeNonWaste]);

  const summary: ScanSummary | null = stats ? {
    total: stats.total,
    activeRegencies: Object.keys(stats.by_regency).filter((key) => key !== 'Tidak diketahui').length,
    byRegency: stats.by_regency,
    byCategory: Object.fromEntries(WASTE_CATEGORY_ORDER.map((key) => [key, stats.by_category[key] ?? 0])) as Record<WasteCategory, number>,
    topCategory: (() => {
      const top = WASTE_CATEGORY_ORDER.map((key) => ({ category: key, count: stats.by_category[key] ?? 0 })).sort((a, b) => b.count - a.count)[0];
      return top && top.count ? top : null;
    })(),
  } : null;

  const updateFilter = (fn: () => void) => { setLoading(true); fn(); setPage(1); };
  const exportUrl = '/api/admin/export?' + params.replace(/(^|&)page=[^&]*/, '').replace(/&&/g, '&');

  const dateRanges = [
    { value: '7d', label: '7 hari' },
    { value: '30d', label: '30 hari' },
    { value: 'all', label: 'Semua' },
  ] as const;
  const cardClass = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900/80';
  const fieldClass = 'min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100';

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100`}>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-48 flex-col overflow-y-auto border-r border-slate-200 bg-white md:flex lg:w-60 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-h-full flex-col p-5">
          <Link href="/" className="flex items-center gap-2.5 rounded-lg text-white" aria-label="BaliEcoGrade beranda">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700">
              <Leaf className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="font-bold tracking-tight">BaliEcoGrade</span>
          </Link>

          <div className="mt-10">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Admin</p>
            <a
              href="#ringkasan"
              className="mt-3 flex items-center gap-3 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-sm font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-500/20"
            >
              <CalendarDays className="h-4 w-4" aria-hidden="true" />
              Ringkasan
            </a>
          </div>

          <div className="mt-auto space-y-3 pt-10">
            <p className="rounded-xl border border-emerald-900/70 bg-emerald-950/50 p-3 text-xs leading-relaxed text-emerald-300">
              Data diperbarui saat halaman dibuka.
            </p>
            <Link
              href="/"
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex min-w-0 items-center gap-2 text-sm font-bold text-white">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-700">
              <Leaf className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="truncate">BaliEcoGrade Admin</span>
          </Link>
          <Link href="/" className="shrink-0 rounded-lg border border-slate-700 p-2 text-slate-300" aria-label="Kembali ke beranda">
            <Home className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="min-h-screen min-w-0 md:pl-48 lg:pl-60">
        <div className="mx-auto w-full max-w-[1600px] space-y-5 p-4 sm:space-y-6 sm:p-6 xl:p-8">
          <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div className="min-w-0">
              <nav aria-label="Breadcrumb" className="mb-2 hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400 sm:flex">
                <Link href="/" className="transition hover:text-slate-900 dark:hover:text-slate-300">Beranda</Link>
                <span aria-hidden="true">›</span>
                <span>Admin</span>
                <span aria-hidden="true">›</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">Dashboard</span>
              </nav>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">Dashboard</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Laporan menggunakan zona waktu Asia/Makassar</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div role="group" aria-label="Rentang tanggal" className="inline-flex rounded-lg border border-slate-300 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
                {dateRanges.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={range === value}
                    onClick={() => updateFilter(() => setRange(value))}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      range === value ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
              </button>
              <a
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                href={exportUrl}
              >
                Ekspor CSV
              </a>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/admin-login'); }}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </header>

          <section aria-label="Filter dashboard" className={`${cardClass} grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6`}>
            <button
              type="button"
              aria-pressed={includeNonWaste}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                includeNonWaste
                  ? 'border-emerald-500 bg-emerald-600 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
              onClick={() => updateFilter(() => setIncludeNonWaste(!includeNonWaste))}
            >
              {includeNonWaste ? 'Tampilkan sampah saja' : 'Sampah saja'}
            </button>
            <select
              aria-label="Kategori"
              className={fieldClass}
              value={category}
              onChange={(e) => updateFilter(() => setCategory(e.target.value as WasteCategory | ''))}
            >
              <option value="">Semua kategori</option>
              {WASTE_CATEGORY_ORDER.map((value) => <option key={value} value={value}>{WASTE_CATEGORIES[value].label}</option>)}
            </select>
            <input
              aria-label="Kabupaten"
              className={fieldClass}
              placeholder="Kabupaten"
              value={regency}
              onChange={(e) => updateFilter(() => setRegency(e.target.value))}
            />
            <input
              aria-label="Kecamatan"
              className={fieldClass}
              placeholder="Kecamatan"
              value={district}
              onChange={(e) => updateFilter(() => setDistrict(e.target.value))}
            />
            <form
              className="flex min-w-0 gap-2 sm:col-span-2"
              onSubmit={(e) => { e.preventDefault(); updateFilter(() => setSearch(searchInput.trim())); }}
            >
              <input
                aria-label="Cari"
                className={`${fieldClass} w-full`}
                placeholder="Cari material atau wilayah"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="submit" className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500">
                Cari
              </button>
            </form>
          </section>

          {error && (
            <p role="alert" className="rounded-xl border border-rose-900 bg-rose-950/60 p-4 text-sm text-rose-200">
              {error} {error.includes('401') || error.includes('403') ? <a className="underline" href="/admin-login">Login admin</a> : null}
            </p>
          )}
          {loading &&           <p role="status" className="text-sm text-slate-500 dark:text-slate-400">Memuat data…</p>}

          {summary && (
            <div id="ringkasan" className="scroll-mt-24 space-y-5 sm:space-y-6">
              <MetricCards summary={summary} />
              <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <RegencyBarChart
                  countsByRegency={summary.byRegency}
                  activeRegency={regency || null}
                  onSelect={(value) => updateFilter(() => setRegency(regency === value ? '' : value))}
                />
                <CategoryDonut
                  countsByCategory={summary.byCategory}
                  activeCategory={category || null}
                  onSelect={(value) => updateFilter(() => setCategory(category === value ? '' : value))}
                />
              </div>
            </div>
          )}

          <section className={`${cardClass} min-w-0 overflow-hidden`}>
            <div className="flex flex-col gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Log pemindaian</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {includeNonWaste ? 'Sampah dan non-sampah' : 'Sampah saja'} · {totalScans.toLocaleString('id-ID')} catatan
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Halaman sebelumnya"
                  className="rounded-lg border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{page} / {pageCount}</span>
                <button
                  type="button"
                  aria-label="Halaman berikutnya"
                  className="rounded-lg border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  disabled={page >= pageCount}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[54rem] text-left text-sm">
                <thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Foto</th>
                    <th className="px-4 py-3 font-semibold">Material</th>
                    <th className="px-4 py-3 font-semibold">Wilayah</th>
                    <th className="px-4 py-3 font-semibold">Kategori</th>
                    <th className="px-4 py-3 font-semibold">Keyakinan</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
                  {scans.map((scan) => (
                    <tr key={scan.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        {scan.image_url
                          ? <Image unoptimized width={40} height={40} src={scan.image_url} alt="Foto sampah" className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
                          : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="max-w-56 truncate px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{scan.material ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{[scan.regency, scan.district].filter(Boolean).join(', ') || 'Tidak diketahui'}</td>
                      <td className="px-4 py-3">
                        {scan.category ? (
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${WASTE_CATEGORIES[scan.category].badgeClass}`}>
                            {WASTE_CATEGORIES[scan.category].label}
                          </span>
                        ) : <span className="text-slate-400">Tidak terklasifikasi</span>}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-300">
                        {scan.confidence === null ? '—' : `${(scan.confidence * 100).toFixed(1)}%`}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{scan.review_status}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500 dark:text-slate-400">
                        {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(new Date(scan.scanned_at))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!scans.length && !loading && <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">Tidak ada data pada filter ini.</p>}
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <span>Halaman {page} dari {pageCount}</span>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Halaman sebelumnya" className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" aria-label="Halaman berikutnya" className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
