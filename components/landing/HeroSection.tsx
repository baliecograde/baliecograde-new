import { BALI_REGENCIES } from '@/lib/regions';

const HERO_IMAGE_URL =
  'https://images.pexels.com/photos/36810327/pexels-photo-36810327.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-emerald-950">
      <img
        src={HERO_IMAGE_URL}
        alt="Sawah berteras hijau di Bali"
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-60"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-950/95 via-emerald-950/75 to-sky-950/60" />

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
        <p className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-900/50 px-3.5 py-1.5 text-sm font-semibold text-emerald-100">
          Smart waste sorting untuk Jawa
        </p>
        <h1 className="animate-fade-up mt-5 max-w-3xl text-4xl font-bold leading-[1.15] tracking-tight text-white [animation-delay:80ms] sm:text-5xl lg:text-6xl">
          Pilah sampah lebih cerdas, jaga keindahan Bali.
        </h1>
        <p className="animate-fade-up mt-5 max-w-2xl text-base leading-relaxed text-emerald-50/90 [animation-delay:160ms] sm:text-lg">
          Cukup foto sampahmu. BaliEcoGrade langsung menentukan kategorinya dan memberi langkah membuang yang tepat untuk warga maupun petugas kebersihan.
        </p>
        <dl className="animate-fade-up mt-8 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3 [animation-delay:240ms]">
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-emerald-200">Kategori</dt>
            <dd className="mt-1 text-2xl font-bold text-white">3</dd>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-emerald-200">Kabupaten/Kota</dt>
            <dd className="mt-1 text-2xl font-bold text-white">{BALI_REGENCIES.length}</dd>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
            <dt className="text-xs font-medium uppercase tracking-wide text-emerald-200">Biaya</dt>
            <dd className="mt-1 text-2xl font-bold text-white">Gratis</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
