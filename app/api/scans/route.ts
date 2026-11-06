import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { analyzeWasteWithDeepSeek } from '@/lib/server/deepseek';
import { resolveLocationFromCoordinates } from '@/lib/server/geocoding';
import { getConfidenceThreshold } from '@/lib/waste-api';
import { parseGpsFields, sniffImageMime } from '@/lib/scan-validation';
import { getValidatedScanIdentity } from '@/lib/server/scan-identity';
import { createScanPostHandler, type ScanRow, type ScanStore } from '@/lib/server/scan-post-handler';
import sharp from 'sharp';

export const maxDuration = 60;

function createStore(): ScanStore {
  const admin = createSupabaseAdminClient();
  return {
    async findByIdempotencyKey(key) {
      const { data, error } = await admin.from('waste_scans').select('*').eq('idempotency_key', key).maybeSingle();
      if (error) throw error;
      return data as unknown as ScanRow | null;
    },
    async insertPending(row) {
      const { error } = await admin.from('waste_scans').insert(row);
      if (error?.code === '23505') return 'unique_conflict';
      if (error) throw error;
      return 'created';
    },
    async markStaleFailed(id, cutoffIso) {
      const { data, error } = await admin.from('waste_scans')
        .update({ analysis_status: 'failed', analysis_error_code: 'processing_timeout', review_status: 'not_required' })
        .eq('id', id).eq('analysis_status', 'pending').lt('created_at', cutoffIso).select('id').maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
    async markFailed(id, errorCode) {
      const { error } = await admin.from('waste_scans')
        .update({ analysis_status: 'failed', analysis_error_code: errorCode, review_status: 'not_required' })
        .eq('id', id).eq('analysis_status', 'pending');
      if (error) throw error;
    },
    async completePending(id, values) {
      const { data, error } = await admin.from('waste_scans')
        .update(values).eq('id', id).eq('analysis_status', 'pending').select('*').maybeSingle();
      if (error) throw error;
      return data as unknown as ScanRow | null;
    },
  };
}

const post = createScanPostHandler({
  getIdentity: getValidatedScanIdentity,
  getStore: createStore,
  sniffImageMime,
  parseGps: parseGpsFields,
  async normalizeImage(bytes) {
    return new Uint8Array(await sharp(bytes, { limitInputPixels: 40000000, failOn: 'error' }).rotate().jpeg({ quality: 88 }).toBuffer());
  },
  async upload(imagePath, bytes) {
    const { error } = await createSupabaseAdminClient().storage.from('waste-images').upload(imagePath, bytes, {
      contentType: 'image/jpeg', upsert: false, cacheControl: '300',
    });
    return !error;
  },
  async reverseGeocode(latitude, longitude, accuracy, capturedAt) {
    const resolved = await resolveLocationFromCoordinates(latitude, longitude, accuracy, capturedAt);
    return { regency: resolved.regency, district: resolved.district };
  },
  async classify(bytes, mimeType) {
    const result = await analyzeWasteWithDeepSeek(Buffer.from(bytes), mimeType);
    return {
      material: result.material_detected,
      category: result.analysis_status === 'uncertain' ? null : result.trash_category,
      confidence: result.confidence_score,
      reason: result.classification_reason,
    };
  },
  confidenceThreshold: getConfidenceThreshold,
  async createSignedUrl(imagePath) {
    const { data, error } = await createSupabaseAdminClient().storage.from('waste-images').createSignedUrl(imagePath, 300);
    if (error) return null;
    return data.signedUrl;
  },
  now: Date.now,
  isProduction: process.env.NODE_ENV === 'production',
  scanApiEnabled: process.env.SCAN_API_ENABLED === 'true',
  aiConfigured: Boolean(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_MODEL),
});

export async function POST(request: Request) {
  return post(request);
}
