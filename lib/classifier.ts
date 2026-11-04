import type { AnalyzeScanSuccessResponse, ApiErrorResponse, CanonicalCategory } from '@/types/api';
import type { ClassificationResult, ScanArea, ScanCoordinates, WasteCategory } from '@/types/waste';

const CATEGORY_MAP: Record<CanonicalCategory, WasteCategory> = {
  ORGANIK: 'organic',
  ANORGANIK: 'inorganic',
  RESIDU: 'residue',
  B3: 'b3',
};

function isCanonicalCategory(value: unknown): value is CanonicalCategory {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CATEGORY_MAP, value);
}

export async function classifyWaste(
  image: File,
  coordinates: ScanCoordinates,
  fallbackArea: ScanArea,
): Promise<ClassificationResult> {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('latitude', String(coordinates.latitude));
  formData.append('longitude', String(coordinates.longitude));
  formData.append('accuracy', String(coordinates.accuracy));
  formData.append('captured_at', coordinates.capturedAt);

  const response = await fetch('/api/scans/analyze', {
    method: 'POST',
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | AnalyzeScanSuccessResponse
    | ApiErrorResponse
    | null;

  if (!response.ok) {
    const message =
      payload && 'error' in payload && typeof payload.error.message === 'string'
        ? payload.error.message
        : `Analisis gagal (HTTP ${response.status}).`;
    throw new Error(message);
  }

  if (!payload || !('data' in payload)) {
    throw new Error('Respons analisis tidak valid.');
  }

  const result = payload.data;
  if (!isCanonicalCategory(result.category)) {
    throw new Error('Respons analisis tidak memiliki kategori yang valid.');
  }
  if (
    typeof result.confidence !== 'number' ||
    !Number.isFinite(result.confidence) ||
    result.confidence < 0 ||
    result.confidence > 1
  ) {
    throw new Error('Respons analisis memiliki nilai confidence yang tidak valid.');
  }
  if (result.analysis_status !== 'completed' && result.analysis_status !== 'uncertain') {
    throw new Error('Respons analisis memiliki status yang tidak valid.');
  }

  return {
    category: CATEGORY_MAP[result.category],
    confidence: result.confidence * 100,
    material: result.material || 'Material tidak diketahui',
    reason: result.reason || 'Alasan klasifikasi tidak tersedia.',
    instruction: result.instruction || 'Pilah sampah sesuai kategorinya.',
    localContext: result.local_context,
    analysisStatus: result.analysis_status,
    area: {
      regency: result.regency || fallbackArea.regency,
      village: result.district || fallbackArea.village,
    },
  };
}
