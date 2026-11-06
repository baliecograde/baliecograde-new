import 'server-only';
import type { CreateScanResult } from '@/types/api';
import type { WasteCategory } from '@/types/waste';
import { decideExistingScan, hasValidatedScanIdentity, mayIssueScanImageUrl, scanBelongsToUser } from '@/lib/scan-access';
import type { ScanIdentity } from '@/lib/server/scan-identity';
import { isSameOriginRequest } from '@/lib/request-origin';
import { LocationValidationError } from '@/lib/server/geocoding';

const MAX_BYTES = 10 * 1024 * 1024;
const STALE_PENDING_MS = 3 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface ScanRow {
  id: string;
  idempotency_key: string;
  user_id: string | null;
  material_detected: string | null;
  trash_category: WasteCategory | null;
  confidence_score: number | null;
  action_instruction: string | null;
  balinese_context_note: string | null;
  analysis_status: 'pending' | 'completed' | 'failed';
  analysis_error_code: string | null;
  review_status: 'not_required' | 'pending' | 'approved' | 'rejected';
  latitude: number | null;
  longitude: number | null;
  location_accuracy_m: number | null;
  location_captured_at: string | null;
  regency: string | null;
  district: string | null;
  image_path: string | null;
  created_at: string;
}

export interface ScanStore {
  findByIdempotencyKey(key: string): Promise<ScanRow | null>;
  insertPending(row: Pick<ScanRow, 'id' | 'idempotency_key' | 'user_id' | 'analysis_status' | 'review_status' | 'image_path'> & Record<string, unknown>): Promise<'created' | 'unique_conflict'>;
  markStaleFailed(id: string, cutoffIso: string): Promise<boolean>;
  markFailed(id: string, errorCode: string): Promise<void>;
  completePending(id: string, values: Partial<ScanRow>): Promise<ScanRow | null>;
}

export interface ScanPostDependencies {
  getIdentity(): Promise<ScanIdentity | null>;
  getStore(): ScanStore;
  sniffImageMime(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null;
  parseGps(values: Array<FormDataEntryValue | null>): {
    latitude: number | null;
    longitude: number | null;
    location_accuracy_m: number | null;
    location_captured_at: string | null;
  } | null;
  normalizeImage(bytes: Uint8Array): Promise<Uint8Array>;
  upload(imagePath: string, bytes: Uint8Array): Promise<boolean>;
  reverseGeocode(
    latitude: number,
    longitude: number,
    accuracy: number | null,
    capturedAt: string | null,
  ): Promise<{ regency: string | null; district: string | null }>;
  classify(bytes: Uint8Array, mimeType: string): Promise<{
    material: string | null;
    category: WasteCategory | null;
    confidence: number | null;
    reason: string | null;
  }>;
  confidenceThreshold(): number;
  createSignedUrl(imagePath: string): Promise<string | null>;
  now(): number;
  isProduction: boolean;
  scanApiEnabled: boolean;
  aiConfigured: boolean;
}

function json(body: unknown, status = 200, extraHeaders: HeadersInit = {}) {
  const headers = new Headers(extraHeaders);
  headers.set('Cache-Control', 'private, no-store');
  return Response.json(body, { status, headers });
}

function fail(code: string, status: number, retryWithNewKey = false) {
  return json({ error: { code, ...(retryWithNewKey ? { retry_with_new_key: true } : {}) } }, status);
}

function scanResult(row: ScanRow, imageUrl: string | null, reason: string | null = null): CreateScanResult {
  return {
    id: row.id,
    material: row.material_detected,
    category: row.trash_category,
    confidence: row.confidence_score,
    reason,
    instruction: row.action_instruction ?? 'Hasil scan tersimpan untuk peninjauan.',
    local_context: null,
    analysis_status: row.analysis_status,
    review_status: row.review_status,
    regency: row.regency,
    district: row.district,
    image_url: imageUrl,
  };
}

async function ownedResult(row: ScanRow, userId: string, deps: ScanPostDependencies, reason: string | null = null) {
  if (!scanBelongsToUser(row, userId)) return null;
  let imageUrl: string | null = null;
  if (row.image_path && mayIssueScanImageUrl(row, userId, false)) {
    try { imageUrl = await deps.createSignedUrl(row.image_path); } catch { imageUrl = null; }
  }
  return scanResult(row, imageUrl, reason);
}

async function resolveExisting(
  row: ScanRow,
  key: string,
  userId: string,
  store: ScanStore,
  deps: ScanPostDependencies,
  retriedStaleCas = false,
): Promise<Response> {
  const decision = decideExistingScan(row, userId, deps.now(), STALE_PENDING_MS);
  if (decision === 'foreign') return fail('IDEMPOTENCY_CONFLICT', 409);

  if (decision === 'completed') {
    const data = await ownedResult(row, userId, deps);
    if (!data) return fail('IDEMPOTENCY_CONFLICT', 409);
    return json({ data, duplicate: true });
  }

  if (decision === 'failed') return fail('SCAN_PREVIOUSLY_FAILED', 409, true);

  if (decision === 'stale_pending') {
    const cutoffIso = new Date(deps.now() - STALE_PENDING_MS).toISOString();
    const changed = await store.markStaleFailed(row.id, cutoffIso);
    if (changed) return fail('SCAN_PREVIOUSLY_FAILED', 409, true);
    if (retriedStaleCas) return fail('DATABASE_ERROR', 503);
    const current = await store.findByIdempotencyKey(key);
    if (!current) return fail('DATABASE_ERROR', 503);
    return resolveExisting(current, key, userId, store, deps, true);
  }

  return json({ data: { id: row.id, analysis_status: 'pending' }, duplicate: true }, 202);
}

export function createScanPostHandler(deps: ScanPostDependencies) {
  return async function POST(request: Request): Promise<Response> {
    if (!isSameOriginRequest(request)) return fail('ORIGIN_NOT_ALLOWED', 403);
    let identity: ScanIdentity | null;
    try { identity = await deps.getIdentity(); } catch { return fail('AUTH_UNAVAILABLE', 503); }
    if (!hasValidatedScanIdentity(identity)) return fail('UNAUTHENTICATED', 401);

    if (deps.isProduction && !deps.scanApiEnabled) return fail('SCAN_API_DISABLED', 503);
    if (request.headers.get('content-length') && Number(request.headers.get('content-length')) > MAX_BYTES + 1024 * 1024) {
      return fail('REQUEST_TOO_LARGE', 413);
    }
    const key = request.headers.get('idempotency-key');
    if (!key || !UUID_PATTERN.test(key)) return fail('INVALID_IDEMPOTENCY_KEY', 400);

    let store: ScanStore;
    try { store = deps.getStore(); } catch { return fail('SERVER_NOT_CONFIGURED', 503); }
    try {
      const existing = await store.findByIdempotencyKey(key);
      if (existing) return await resolveExisting(existing, key, identity.userId, store, deps);
    } catch { return fail('DATABASE_ERROR', 503); }

    if (!deps.aiConfigured) return fail('AI_NOT_CONFIGURED', 503);

    let form: FormData;
    try { form = await request.formData(); } catch { return fail('INVALID_MULTIPART', 400); }
    const file = form.get('image');
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_BYTES) return fail('INVALID_FILE_SIZE', 400);
    const sourceBytes = new Uint8Array(await file.arrayBuffer());
    const sourceMime = deps.sniffImageMime(sourceBytes);
    if (!sourceMime || file.type !== sourceMime) return fail('INVALID_FILE_TYPE', 415);

    let bytes: Uint8Array;
    try { bytes = await deps.normalizeImage(sourceBytes); } catch { return fail('INVALID_IMAGE_CONTENT', 415); }
    if (bytes.length > MAX_BYTES) return fail('IMAGE_NORMALIZATION_TOO_LARGE', 413);
    const gpsValues = [form.get('latitude'), form.get('longitude'), form.get('location_accuracy_m'), form.get('location_captured_at')];
    const gps = deps.parseGps(gpsValues);
    if (!gps) return fail('INVALID_GPS', 400);
    if (gps.latitude === null || gps.longitude === null) return fail('MISSING_COORDINATES', 400);

    let region: { regency: string | null; district: string | null };
    try {
      region = await deps.reverseGeocode(
        gps.latitude,
        gps.longitude,
        gps.location_accuracy_m,
        gps.location_captured_at,
      );
    } catch (error) {
      if (error instanceof LocationValidationError) return fail(error.code, error.statusCode);
      return fail('INVALID_GPS', 400);
    }

    const scanId = crypto.randomUUID();
    const imagePath = `scans/${scanId}/${crypto.randomUUID()}.jpg`;
    let inserted: 'created' | 'unique_conflict';
    try {
      inserted = await store.insertPending({
        id: scanId,
        idempotency_key: key,
        user_id: identity.userId,
        analysis_status: 'pending',
        review_status: 'not_required',
        image_path: imagePath,
        ...gps,
      });
    } catch { return fail('DATABASE_ERROR', 503); }
    if (inserted === 'unique_conflict') {
      try {
        const raced = await store.findByIdempotencyKey(key);
        if (!raced) return fail('IDEMPOTENCY_CONFLICT', 409);
        return await resolveExisting(raced, key, identity.userId, store, deps);
      } catch { return fail('DATABASE_ERROR', 503); }
    }

    try {
      if (!await deps.upload(imagePath, bytes)) {
        await store.markFailed(scanId, 'upload_failed');
        return fail('UPLOAD_FAILED', 502, true);
      }
    } catch {
      await store.markFailed(scanId, 'upload_failed');
      return fail('UPLOAD_FAILED', 502, true);
    }

    try {
      const result = await deps.classify(bytes, 'image/jpeg');
      if (result.confidence !== null && (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1)) {
        throw new Error('AI_INVALID_RESPONSE');
      }
      const threshold = deps.confidenceThreshold();
      const confidence = result.confidence === null ? null : Number(result.confidence.toFixed(5));
      const needsReview = result.category === null || confidence === null || confidence < threshold;
      const instruction = result.category ? {
        ORGANIK: 'Pisahkan dan olah sebagai sampah organik atau kompos.',
        ANORGANIK: 'Bersihkan lalu pilah untuk didaur ulang atau setorkan ke bank sampah.',
        RESIDU: 'Buang terpisah dari sampah organik dan material daur ulang.',
        B3: 'Simpan dengan aman dan serahkan ke fasilitas pengumpulan limbah B3 resmi.',
      }[result.category] : 'Pisahkan sementara dan minta verifikasi sebelum membuang.';
      const completed = await store.completePending(scanId, {
        image_path: imagePath,
        regency: region.regency,
        district: region.district,
        material_detected: result.material,
        trash_category: result.category,
        confidence_score: confidence,
        action_instruction: instruction,
        balinese_context_note: null,
        analysis_status: 'completed',
        analysis_error_code: null,
        review_status: needsReview ? 'pending' : 'not_required',
      });
      if (!completed) return fail('SCAN_PREVIOUSLY_FAILED', 409, true);
      const data = await ownedResult(completed, identity.userId, deps, result.reason);
      if (!data) return fail('IDEMPOTENCY_CONFLICT', 409);
      return json({ data }, 201);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'analysis_failed';
      const code = /^[a-z0-9_]{1,64}$/.test(message) ? message.toLowerCase() : 'analysis_failed';
      await store.markFailed(scanId, code);
      return fail(code === 'ai_not_configured' ? 'AI_NOT_CONFIGURED' : 'ANALYSIS_FAILED', 502, true);
    }
  };
}

export function isUniqueIdempotencyViolation(error: { code?: string } | null): boolean {
  return error?.code === '23505';
}
