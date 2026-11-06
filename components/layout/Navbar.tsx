import Link from 'next/link';
import { Leaf, MapPin } from 'lucide-react';
import type { Theme } from '@/hooks/useTheme';
import type { UserArea } from '@/hooks/useUserArea';
interface NavbarProps { userArea: UserArea; theme: Theme; onToggleTheme: () => void }
export function Navbar({ userArea }: NavbarProps) {
  return <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
    <nav className="mx-auto flex w-full max-w-6xl min-w-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
      <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="BaliEcoGrade beranda">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
          <Leaf className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="truncate font-bold text-slate-900 dark:text-white">BaliEcoGrade</span>
      </Link>
      <div
        title="Lokasi hanya direkam ketika pemindaian dimulai; jika izin tidak tersedia, lokasi dikosongkan."
        className="flex max-w-[42%] shrink-0 items-center gap-2 rounded-full border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-200 sm:max-w-none sm:px-3"
      >
        <MapPin className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
        <span className="truncate whitespace-nowrap">{userArea.area.regency ?? 'Lokasi belum tersedia'}</span>
      </div>
    </nav>
  </header>;
}
