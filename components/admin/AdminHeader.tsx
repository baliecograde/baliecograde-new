import { CalendarDays, ChevronRight, Menu, Moon, Sun } from 'lucide-react';
import { DATE_RANGE_OPTIONS, type DateRange } from '@/lib/scanStats';
import type { Theme } from '@/hooks/useTheme';

interface AdminHeaderProps {
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenMenu: () => void;
}

export function AdminHeader({ range, onRangeChange, theme, onToggleTheme, onOpenMenu }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Buka menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
            <a href="/" className="text-slate-500 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-300">
              Beranda
            </a>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="text-slate-500 dark:text-slate-400">Admin</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="truncate font-semibold text-slate-900 dark:text-white">Dashboard</span>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Rentang tanggal"
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800"
          >
            <CalendarDays className="ml-1.5 mr-0.5 hidden h-4 w-4 text-slate-500 sm:block dark:text-slate-400" aria-hidden="true" />
            {DATE_RANGE_OPTIONS.map((option) => {
              const active = option.value === range;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onRangeChange(option.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                    active
                      ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-900 dark:text-emerald-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onToggleTheme}
            suppressHydrationWarning
            aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
