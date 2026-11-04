import { Leaf } from 'lucide-react';

export function ScanningOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 flex flex-col items-center justify-center gap-6 overflow-hidden bg-slate-950/75 backdrop-blur-sm"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-emerald-400/20 to-transparent animate-scan-sweep motion-reduce:hidden"
      />
      <div className="relative flex h-40 w-40 items-center justify-center" aria-hidden="true">
        <span className="absolute inset-0 rounded-full border border-emerald-400/60 animate-ping motion-reduce:animate-none" />
        <span className="absolute inset-4 rounded-full border border-emerald-400/40 animate-ping [animation-delay:400ms] motion-reduce:animate-none" />
        <span className="absolute inset-8 rounded-full border border-sky-400/40 animate-ping [animation-delay:800ms] motion-reduce:animate-none" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 animate-pulse">
          <Leaf className="h-7 w-7" />
        </span>
      </div>
      <div className="px-6 text-center">
        <p className="text-lg font-semibold text-white">Menganalisis sampah...</p>
        <p className="mt-1 text-sm text-slate-300">Mencocokkan bentuk, warna, dan tekstur</p>
      </div>
    </div>
  );
}
