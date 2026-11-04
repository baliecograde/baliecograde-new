'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { CategoryDonut } from '@/components/admin/CategoryDonut';
import { MetricCards } from '@/components/admin/MetricCards';
import { RegencyBarChart } from '@/components/admin/RegencyBarChart';
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
  const [scans, setScans] = useState<WasteScan[]>([]);
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
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
    if (category) query.set('category', category);
    if (regency) query.set('regency', regency);
    if (district) query.set('district', district);
    if (search) query.set('search', search);
    if (range !== 'all') query.set('start_date', startDate(range === '7d' ? 7 : 30));
    return query.toString();
  }, [page, category, regency, district, search, range]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [scansResponse, statsResponse] = await Promise.all([
          fetch('/api/admin/scans?' + params, { cache: 'no-store' }),
          fetch('/api/admin/stats?' + params, { cache: 'no-store' }),
        ]);
        if (!scansResponse.ok || !statsResponse.ok) throw new Error('Data dashboard tidak dapat dimuat.');
        const scansPayload = await scansResponse.json() as ScansPayload;
        const statsPayload = await statsResponse.json() as { data: StatsPayload };
        if (!cancelled) {
          setScans(scansPayload.data);
          setPageCount(Math.max(1, scansPayload.meta.total_pages));
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
  }, [params]);

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

  const updateFilter = (fn: () => void) => { fn(); setPage(1); };
  const exportUrl = '/api/admin/export?' + params.replace(/(^|&)page=[^&]*/, '').replace(/&&/g, '&');

  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white sm:p-8">
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-bold">Dashboard BaliEcoGrade</h1><p className="text-sm text-slate-500">Laporan menggunakan zona waktu Asia/Makassar</p></div><div className="flex gap-3"><a className="rounded-lg border px-4 py-2" href={exportUrl}>Ekspor CSV</a><button className="rounded-lg border px-4 py-2" onClick={async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.push('/admin-login'); }}>Keluar</button></div></header>
      <div className="flex flex-wrap gap-3">
        <select aria-label="Rentang tanggal" className="rounded-lg border p-2 dark:bg-slate-900" value={range} onChange={(e) => updateFilter(() => setRange(e.target.value as '7d' | '30d' | 'all'))}><option value="7d">7 hari</option><option value="30d">30 hari</option><option value="all">Semua</option></select>
        <select aria-label="Kategori" className="rounded-lg border p-2 dark:bg-slate-900" value={category} onChange={(e) => updateFilter(() => setCategory(e.target.value as WasteCategory | ''))}><option value="">Semua kategori</option>{WASTE_CATEGORY_ORDER.map((value) => <option key={value} value={value}>{WASTE_CATEGORIES[value].label}</option>)}</select>
        <input aria-label="Kabupaten" className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Kabupaten" value={regency} onChange={(e) => updateFilter(() => setRegency(e.target.value))} />
        <input aria-label="Kecamatan" className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Kecamatan" value={district} onChange={(e) => updateFilter(() => setDistrict(e.target.value))} />
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); updateFilter(() => setSearch(searchInput.trim())); }}><input aria-label="Cari" className="rounded-lg border p-2 dark:bg-slate-900" placeholder="Cari material atau wilayah" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} /><button className="rounded-lg bg-emerald-700 px-4 py-2 text-white">Cari</button></form>
      </div>
      {error && <p role="alert" className="rounded-lg bg-rose-100 p-4 text-rose-900">{error} {error.includes('401') || error.includes('403') ? <a href="/admin-login">Login admin</a> : null}</p>}
      {loading && <p role="status">Memuat data…</p>}
      {summary && <><MetricCards summary={summary} /><div className="grid gap-6 xl:grid-cols-2"><RegencyBarChart countsByRegency={summary.byRegency} activeRegency={regency || null} onSelect={(value) => updateFilter(() => setRegency(regency === value ? '' : value))} /><CategoryDonut countsByCategory={summary.byCategory} activeCategory={category || null} onSelect={(value) => updateFilter(() => setCategory(category === value ? '' : value))} /></div></>}
      <section className="overflow-hidden rounded-2xl bg-white shadow ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex items-center justify-between border-b p-4"><div><h2 className="font-bold">Log pemindaian</h2><p className="text-sm text-slate-500">Halaman {page} dari {pageCount}</p></div><div className="flex gap-2"><button className="rounded border px-3 py-2 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</button><button className="rounded border px-3 py-2 disabled:opacity-40" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Berikutnya</button></div></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[50rem] text-left text-sm"><thead><tr className="bg-slate-100 dark:bg-slate-800"><th className="p-3">Foto</th><th className="p-3">Material</th><th className="p-3">Wilayah</th><th className="p-3">Kategori</th><th className="p-3">Confidence</th><th className="p-3">Review</th><th className="p-3">Waktu</th></tr></thead><tbody>{scans.map((scan) => <tr key={scan.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-3">{scan.image_url ? <Image unoptimized width={48} height={48} src={scan.image_url} alt="Foto sampah" className="h-12 w-12 rounded object-cover" /> : '—'}</td><td className="p-3">{scan.material ?? '—'}</td><td className="p-3">{[scan.district, scan.regency].filter(Boolean).join(', ') || 'Tidak diketahui'}</td><td className="p-3">{scan.category ? WASTE_CATEGORIES[scan.category].label : 'Tidak terklasifikasi'}</td><td className="p-3">{scan.confidence === null ? '—' : (scan.confidence * 100).toFixed(1) + '%'}</td><td className="p-3">{scan.review_status}</td><td className="p-3">{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(new Date(scan.scanned_at))}</td></tr>)}</tbody></table></div>
        {!scans.length && !loading && <p className="p-8 text-center text-slate-500">Tidak ada data pada filter ini.</p>}
      </section>
    </div>
  </main>;
}
