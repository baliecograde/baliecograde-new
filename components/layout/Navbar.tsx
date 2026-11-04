import { Leaf, MapPin, Moon, Sun } from 'lucide-react';
import type { Theme } from '@/hooks/useTheme';
import type { UserArea } from '@/hooks/useUserArea';

interface NavbarProps {
  userArea: UserArea;
  theme: Theme;
  onToggleTheme: () => void;
}

const LOCATION_NOTES: Record<UserArea['status'], string> = {
  locating: 'Mendeteksi lokasi',
  precise: 'Lokasi terdeteksi',
  denied: 'Lokasi perkiraan (izin lokasi tidak diberikan)',
  unavailable: 'Lokasi perkiraan (lokasi tidak tersedia)',
  'outside-bali': 'Lokasi perkiraan (di luar Bali)',
};

export function Navbar({ userArea, theme, onToggleTheme }: NavbarProps) {
  const isLocating = userArea.status === 'locating';
  const isPrecise = userArea.status === 'precise';
  const locationLabel = isLocating ? 'Mendeteksi...' : userArea.area.regency;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <a href="/" className="flex min-w-0 items-center gap-2.5" aria-label="BaliEcoGrade beranda">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-sm">
            <Leaf className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="truncate font-sans text-base font-bold tracking-tight text-slate-900 dark:text-white sm:text-lg">
            BaliEcoGrade
          </span>
        </a>

        <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
          <div
            title={LOCATION_NOTES[userArea.status]}
            className="flex min-w-0 max-w-[7.5rem] items-center gap-1.5 overflow-hidden rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 sm:max-w-[12rem] sm:gap-2 sm:px-3 sm:text-sm"
          >
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                isPrecise ? 'bg-emerald-500' : isLocating ? 'animate-pulse bg-slate-400' : 'bg-amber-500'
              }`}
              aria-hidden="true"
            />
            <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 sm:h-4 sm:w-4" aria-hidden="true" />
            <span className="truncate min-[360px]:max-w-[4.5rem] sm:max-w-[9rem]">{locationLabel}</span>
            <span className="sr-only">{LOCATION_NOTES[userArea.status]}</span>
          </div>

          {/* <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button> */}
        </div>
      </nav>
    </header>
  );
}
