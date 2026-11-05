import { useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import Image from 'next/image';
import { Camera, ImagePlus, MapPinOff, RotateCcw, ScanLine, UploadCloud } from 'lucide-react';
import { ScanningOverlay } from '@/components/landing/ScanningOverlay';
import type { AreaStatus } from '@/hooks/useUserArea';
import { TurnstileCaptcha } from '@/components/landing/TurnstileCaptcha';

interface UploadCardProps {
  previewUrl: string | null;
  hasFile: boolean;
  isScanning: boolean;
  message: string | null;
  locationStatus?: AreaStatus;
  onRetryLocation?: () => void;
  needsCaptcha: boolean;
  onCaptchaToken: (token: string | null) => void;
  captchaResetNonce: number;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  onClassify: () => void;
}

export function UploadCard({
  previewUrl,
  hasFile,
  isScanning,
  message,
  locationStatus = 'precise',
  onRetryLocation,
  needsCaptcha,
  onCaptchaToken,
  captchaResetNonce,
  onFileSelect,
  onClear,
  onClassify,
}: UploadCardProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isLocationHeld =
    locationStatus === 'denied' ||
    locationStatus === 'unavailable' ||
    locationStatus === 'outside-bali';

  const holdMessage =
    locationStatus === 'denied'
      ? 'Akses lokasi ditolak. Pemindai ditahan sampai izin GPS diaktifkan pada browser Anda.'
      : locationStatus === 'outside-bali'
        ? 'Lokasi Anda berada di luar Provinsi Bali. Pemindai hanya aktif di wilayah Bali.'
        : locationStatus === 'unavailable'
          ? 'Lokasi GPS belum dapat diakses. Aktifkan layanan lokasi perangkat untuk membuka pemindai.'
          : null;

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (isLocationHeld) return;
    const file = event.target.files?.[0];
    if (file) onFileSelect(file);
    event.target.value = '';
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isScanning && !isLocationHeld) setIsDragging(true);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (isScanning || isLocationHeld) return;
    const file = event.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <section
      aria-labelledby="upload-heading"
      className="flex flex-col rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-200/70 sm:p-6 dark:bg-slate-900 dark:ring-slate-800"
    >
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 id="upload-heading" className="text-xl font-bold text-slate-900 dark:text-white">
            Pindai Sampahmu
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Foto sampah dengan jelas, lalu biarkan kami menentukan kategorinya.
          </p>
        </div>
        {hasFile && !isScanning && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Ganti foto
          </button>
        )}
      </header>

      {isLocationHeld && holdMessage && (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
        >
          <div className="flex items-start gap-2.5">
            <MapPinOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
            <p className="font-medium leading-relaxed">{holdMessage}</p>
          </div>
          {onRetryLocation && (
            <button
              type="button"
              onClick={onRetryLocation}
              className="self-start rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-800"
            >
              Periksa Ulang Lokasi
            </button>
          )}
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative aspect-[4/3] overflow-hidden rounded-2xl border-2 border-dashed transition-colors duration-300 ${
          isLocationHeld
            ? 'border-slate-200 bg-slate-100/80 opacity-60 dark:border-slate-800 dark:bg-slate-900/60'
            : isDragging
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40'
              : 'border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
        }`}
      >
        {previewUrl ? (
          <Image src={previewUrl} alt="Pratinjau sampah yang dipilih" fill unoptimized sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
        ) : (
          <button
            type="button"
            disabled={isLocationHeld}
            onClick={() => galleryInputRef.current?.click()}
            className="group flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center disabled:cursor-not-allowed"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 transition group-hover:scale-105 dark:bg-emerald-900/60 dark:text-emerald-300">
              <UploadCloud className="h-7 w-7" aria-hidden="true" />
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {isLocationHeld ? 'Pemindai ditahan — aktifkan izin lokasi' : 'Seret & lepas foto di sini'}
            </span>
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {isLocationHeld ? 'Wajib berada di wilayah Bali dengan GPS aktif' : 'atau klik untuk memilih dari galeri (JPG, PNG, WEBP)'}
            </span>
          </button>
        )}
        {isScanning && <ScanningOverlay />}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isScanning || isLocationHeld}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600 px-4 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-400 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
        >
          <Camera className="h-5 w-5" aria-hidden="true" />
          Ambil Foto (Camera)
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={isScanning || isLocationHeld}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ImagePlus className="h-5 w-5" aria-hidden="true" />
          Pilih dari Galeri
        </button>
      </div>

      <button
        type="button"
        onClick={onClassify}
        disabled={!hasFile || isScanning || isLocationHeld}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:-translate-y-0.5 hover:bg-emerald-800 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none disabled:hover:translate-y-0 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
      >
        <ScanLine className="h-5 w-5" aria-hidden="true" />
        Klasifikasikan Sampah Sekarang
      </button>

      {needsCaptcha && <TurnstileCaptcha onToken={onCaptchaToken} resetNonce={captchaResetNonce} />}

      {message && (
        <p role="alert" className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-300">
          {message}
        </p>
      )}

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleInputChange}
      />
    </section>
  );
}
