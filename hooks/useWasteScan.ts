import { useCallback, useEffect, useState } from 'react';
import { classifyWaste } from '@/lib/classifier';
import { createThumbnailDataUrl } from '@/lib/thumbnail';
import { recordWasteScan } from '@/lib/wasteScans';
import type { AreaStatus } from '@/hooks/useUserArea';
import type { ClassificationResult, ScanArea, ScanCoordinates } from '@/types/waste';

export type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';

export interface ScanOutcome {
  category: ClassificationResult['category'];
  confidence: number;
  material: string;
  reason: string;
  instruction: string;
  localContext: string | null;
  analysisStatus: ClassificationResult['analysisStatus'];
  area: ScanArea;
  saved: boolean;
}

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function useWasteScan(
  area: ScanArea,
  coordinates: ScanCoordinates | null,
  locationStatus: AreaStatus,
) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const selectFile = useCallback((next: File) => {
    if (!ACCEPTED_TYPES.has(next.type)) {
      setMessage('Hanya file gambar (JPG, PNG, atau WEBP) yang bisa dianalisis.');
      return;
    }
    if (next.size > MAX_FILE_SIZE_BYTES) {
      setMessage('Ukuran foto maksimal 10 MB.');
      return;
    }
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
    setOutcome(null);
    setStatus('idle');
    setMessage(null);
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setPreviewUrl(null);
    setOutcome(null);
    setStatus('idle');
    setMessage(null);
  }, []);

  const classify = useCallback(async () => {
    if (!file) return;
    if (!coordinates) {
      setStatus('error');
      setMessage(
        locationStatus === 'locating'
          ? 'Sedang mendeteksi lokasi. Tunggu sebentar lalu coba lagi.'
          : locationStatus === 'outside-bali'
            ? 'Analisis hanya tersedia untuk lokasi di Bali.'
            : 'Izin lokasi diperlukan untuk menganalisis foto. Aktifkan akses lokasi lalu muat ulang halaman.',
      );
      return;
    }

    setStatus('scanning');
    setMessage(null);

    try {
      const classification = await classifyWaste(file, coordinates, area);
      const thumbnail = await createThumbnailDataUrl(file).catch(() => null);

      let saved = true;
      try {
        await recordWasteScan({
          regency: classification.area.regency,
          village: classification.area.village,
          category: classification.category,
          confidence: classification.confidence,
          thumbnail,
        });
      } catch {
        saved = false;
      }

      setOutcome({
        ...classification,
        saved,
      });
      setStatus('done');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Foto belum bisa dianalisis. Silakan coba lagi.');
    }
  }, [file, area, coordinates, locationStatus]);

  return {
    previewUrl: file ? previewUrl : null,
    hasFile: file !== null,
    status,
    outcome,
    message,
    selectFile,
    clearFile,
    classify,
  };
}
