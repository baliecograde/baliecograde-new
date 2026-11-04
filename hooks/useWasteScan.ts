import { useCallback, useEffect, useState } from 'react';
import { classifyWaste } from '@/lib/classifier';
import { createThumbnailDataUrl } from '@/lib/thumbnail';
import { recordWasteScan } from '@/lib/wasteScans';
import type { ScanArea, WasteCategory } from '@/types/waste';

export type ScanStatus = 'idle' | 'scanning' | 'done' | 'error';

export interface ScanOutcome {
  category: WasteCategory;
  confidence: number;
  area: ScanArea;
  saved: boolean;
}

const ACCEPTED_PREFIX = 'image/';

export function useWasteScan(area: ScanArea) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const selectFile = useCallback((next: File) => {
    if (!next.type.startsWith(ACCEPTED_PREFIX)) {
      setMessage('Hanya file gambar (JPG, PNG, atau WEBP) yang bisa dianalisis.');
      return;
    }
    setFile(next);
    setOutcome(null);
    setStatus('idle');
    setMessage(null);
  }, []);

  const clearFile = useCallback(() => {
    setFile(null);
    setOutcome(null);
    setStatus('idle');
    setMessage(null);
  }, []);

  const classify = useCallback(async () => {
    if (!file) return;
    setStatus('scanning');
    setMessage(null);

    try {
      const classification = await classifyWaste(file);
      const thumbnail = await createThumbnailDataUrl(file).catch(() => null);

      let saved = true;
      try {
        await recordWasteScan({
          regency: area.regency,
          village: area.village,
          category: classification.category,
          confidence: classification.confidence,
          thumbnail,
        });
      } catch {
        saved = false;
      }

      setOutcome({
        category: classification.category,
        confidence: classification.confidence,
        area,
        saved,
      });
      setStatus('done');
    } catch {
      setStatus('error');
      setMessage('Foto belum bisa dianalisis. Silakan coba lagi.');
    }
  }, [file, area]);

  return {
    previewUrl,
    hasFile: file !== null,
    status,
    outcome,
    message,
    selectFile,
    clearFile,
    classify,
  };
}
