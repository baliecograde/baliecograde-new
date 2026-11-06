import { useCallback, useEffect, useRef, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';
import { ensureScanSession } from '@/lib/guest-session';
import type { CreateScanRequest, CreateScanResponse, CreateScanResult } from '@/types/api';
import type { ReviewStatus, ScanArea } from '@/types/waste';

export type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';

export type ScanOutcome = Omit<CreateScanResult, 'local_context' | 'regency' | 'district' | 'image_url' | 'review_status' | 'analysis_status'> & {
  area: ScanArea;
  reviewStatus: ReviewStatus;
  saved: boolean;
  imageUrl: string | null;
  localContext: string | null;
  analysisStatus: CreateScanResult['analysis_status'];
};

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

interface LocationSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
}

async function compressForUpload(file: File): Promise<File> {
  const maxUploadBytes = 3.8 * 1024 * 1024;
  if (file.size <= maxUploadBytes) return file;

  const bitmap = await createImageBitmap(file);
  let scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  try {
    while (scale >= 0.25) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('CANVAS_UNAVAILABLE');
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.86, 0.76, 0.66, 0.56, 0.46, 0.36]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
        if (blob && blob.size <= maxUploadBytes) {
          return new File([blob], 'scan.jpg', { type: 'image/jpeg' });
        }
      }
      scale *= 0.8;
    }
  } finally {
    bitmap.close();
  }
  throw new Error('IMAGE_TOO_LARGE_AFTER_COMPRESSION');
}

function captureLocation(): Promise<LocationSnapshot | null> {
  if (!navigator.geolocation) return Promise.resolve(null);
  return new Promise((resolve) =>
    navigator.geolocation.getCurrentPosition(
      ({ coords, timestamp }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          capturedAt: new Date(timestamp).toISOString(),
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    ),
  );
}

export function useWasteScan() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showUncertainDialog, setShowUncertainDialog] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectFile = useCallback((next: File) => {
    if (!ACCEPTED_TYPES.has(next.type) || next.size > 10 * 1024 * 1024) {
      setMessage('Pilih JPG, PNG, atau WEBP dengan ukuran maksimal 10 MB.');
      return;
    }
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    idempotencyKey.current = crypto.randomUUID();
    setOutcome(null);
    setShowUncertainDialog(false);
    setStatus('idle');
    setMessage(null);
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setPreviewUrl(null);
    idempotencyKey.current = null;
    setOutcome(null);
    setShowUncertainDialog(false);
    setStatus('idle');
    setMessage(null);
  }, []);

  const classify = useCallback(async () => {
    if (!file || inFlight.current) return;
    inFlight.current = true;
    setStatus('scanning');
    setMessage(null);

    try {
      const authClient = createSupabaseBrowserClient();
      await ensureScanSession(authClient);

      const location = await captureLocation();
      if (!location) throw new Error('MISSING_COORDINATES');
      const compressedImage = await compressForUpload(file);
      const request: CreateScanRequest = {
        image: compressedImage,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy_m: location.accuracy,
          captured_at: location.capturedAt,
        },
      };
      const form = new FormData();
      form.append('image', request.image);
      form.append('latitude', String(request.location.latitude));
      form.append('longitude', String(request.location.longitude));
      form.append('location_accuracy_m', String(request.location.accuracy_m));
      form.append('location_captured_at', request.location.captured_at);

      const response = await fetch('/api/scans', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey.current ?? crypto.randomUUID() },
        credentials: 'same-origin',
        body: form,
      });
      const payload = (await response.json()) as CreateScanResponse;
      if (!response.ok) {
        if ('error' in payload && payload.error.retry_with_new_key) idempotencyKey.current = crypto.randomUUID();
        throw new Error('error' in payload ? payload.error.code : 'SCAN_FAILED');
      }
      if ('error' in payload) throw new Error(payload.error.code);
      if (payload.data.analysis_status === 'pending') throw new Error('SCAN_PENDING');
      if (payload.data.analysis_status === 'failed') throw new Error('SCAN_PREVIOUSLY_FAILED');

      const data = payload.data;
      const result: ScanOutcome = {
        id: data.id,
        category: data.category,
        confidence: data.confidence,
        area: { regency: data.regency, district: data.district },
        reviewStatus: data.review_status,
        saved: true,
        imageUrl: data.image_url,
        material: data.material,
        reason: data.reason,
        instruction: data.instruction,
        localContext: data.local_context,
        analysisStatus: data.analysis_status,
      };
      setOutcome(result);
      setShowUncertainDialog(result.category === null);
      idempotencyKey.current = null;
      setStatus('done');
    } catch (error) {
      const code = error instanceof Error ? error.message : 'SCAN_FAILED';
      setStatus('error');
      if (code === 'SCAN_PREVIOUSLY_FAILED') idempotencyKey.current = crypto.randomUUID();
      setMessage(
        code === 'MISSING_COORDINATES'
          ? 'Akses lokasi ditolak atau tidak tersedia. Aktifkan izin GPS untuk melanjutkan pemindaian.'
          : code === 'OUTSIDE_BALI_REGION'
            ? 'Lokasi berada di luar Provinsi Bali. Pemindai hanya dapat digunakan di wilayah Bali.'
            : code === 'AI_NOT_CONFIGURED'
          ? 'Layanan klasifikasi AI belum dikonfigurasi.'
          : code === 'SCAN_PENDING'
            ? 'Pemindaian ini masih diproses. Silakan coba lagi sebentar.'
            : code === 'SCAN_PREVIOUSLY_FAILED'
              ? 'Pemindaian sebelumnya gagal. Tekan klasifikasikan lagi untuk memulai scan baru.'
              : code === 'GUEST_SESSION_FAILED'
                ? 'Sesi tamu ditolak Supabase Auth. Periksa Anonymous Auth dan pengaturan proyek.'
                : code === 'SESSION_INVALID' || code === 'UNAUTHENTICATED'
                      ? 'Sesi scan tidak valid atau kedaluwarsa. Muat ulang halaman dan coba lagi.'
            : 'Foto belum dapat dianalisis. Periksa koneksi lalu coba lagi.',
      );
    } finally {
      inFlight.current = false;
    }
  }, [file]);

  return {
    previewUrl,
    hasFile: file !== null,
    status,
    outcome,
    message,
    showUncertainDialog,
    dismissUncertainDialog: () => setShowUncertainDialog(false),
    selectFile,
    clearFile,
    classify,
  };
}
