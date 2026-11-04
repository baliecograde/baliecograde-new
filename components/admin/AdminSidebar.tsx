import { Activity, ChevronRight, Home, LayoutDashboard, Leaf, ScrollText, X, BarChart3 } from 'lucide-react';

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { label: 'Ringkasan', href: '#ringkasan', icon: LayoutDashboard },
  // { label: 'Analitik', href: '#analitik', icon: BarChart3 },
  // { label: 'Log Pemindaian', href: '#log', icon: ScrollText },
];

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        aria-label="Navigasi admin"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-0 lg:z-0 lg:h-screen lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <a href="/" className="flex items-center gap-2.5" aria-label="BaliEcoGrade beranda">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <Leaf className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-sans text-base font-bold text-slate-900 dark:text-white">BaliEcoGrade</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <p className="px-5 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Admin
        </p>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
            <a
              key={href}
              href={href}
              onClick={onClose}
              className="group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-800 dark:text-slate-300 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300"
            >
              <span className="flex items-center gap-3">
                <Icon className="h-5 w-5" aria-hidden="true" />
                {label}
              </span>
              <ChevronRight className="h-4 w-4 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
            </a>
          ))}
        </nav>

        <div className="space-y-3 border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Activity className="h-4 w-4 shrink-0" aria-hidden="true" />
            Data diperbarui saat halaman dibuka
          </div>
          <a
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Home className="h-5 w-5" aria-hidden="true" />
            Kembali ke Beranda
          </a>
        </div>
      </aside>
    </>
  );
}
