export type AcceptedImageMime = 'image/jpeg' | 'image/png' | 'image/webp';
export type ReviewStatusValue = 'not_required' | 'pending' | 'approved' | 'rejected';
export type CanonicalWasteCategory = 'ORGANIK' | 'ANORGANIK' | 'RESIDU' | 'B3';

const REVIEW_STATUS_SET = new Set<ReviewStatusValue>(['not_required', 'pending', 'approved', 'rejected']);
const CATEGORY_SET = new Set<CanonicalWasteCategory>(['ORGANIK', 'ANORGANIK', 'RESIDU', 'B3']);
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface GpsSnapshot {
  latitude: number | null;
  longitude: number | null;
  location_accuracy_m: number | null;
  location_captured_at: string | null;
}

export interface ReviewPatchPayload {
  review_status: ReviewStatusValue;
  category?: CanonicalWasteCategory;
}

export function isValidUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function sniffImageMime(bytes: Uint8Array): AcceptedImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return 'image/png';
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') return 'image/webp';
  return null;
}
export function parseGpsFields(values: Array<FormDataEntryValue | null>): GpsSnapshot | null {
  if (values.every((value) => value === null || value === '')) {
    return { latitude: null, longitude: null, location_accuracy_m: null, location_captured_at: null };
  }
  if (values.some((value) => typeof value !== 'string' || value.length === 0)) return null;
  const [latRaw, lonRaw, accuracyRaw, capturedRaw] = values as string[];
  const latitude = Number(latRaw); const longitude = Number(lonRaw); const accuracy = Number(accuracyRaw);
  const captured = new Date(capturedRaw);
  if (![latitude, longitude, accuracy].every(Number.isFinite) || latitude < -90 || latitude > 90 ||
      longitude < -180 || longitude > 180 || accuracy < 0 || Number.isNaN(captured.getTime())) return null;
  return { latitude, longitude, location_accuracy_m: accuracy, location_captured_at: captured.toISOString() };
}
export function parsePagination(pageValue: string | null, pageSizeValue: string | null) {
  const page = Number(pageValue ?? 1); const pageSize = Number(pageSizeValue ?? 20);
  return Number.isInteger(page) && page >= 1 && Number.isInteger(pageSize) && pageSize >= 1 && pageSize <= 100
    ? { page, pageSize }
    : null;
}
export function hasAdminRole(appMetadata: unknown) {
  return typeof appMetadata === 'object' && appMetadata !== null &&
    'role' in appMetadata && appMetadata.role === 'ADMIN';
}
export function parseReviewPatch(body: unknown): ReviewPatchPayload | null {
  if (!body || typeof body !== 'object') return null;
  const record = body as Record<string, unknown>;
  if (typeof record.review_status !== 'string' || !REVIEW_STATUS_SET.has(record.review_status as ReviewStatusValue)) {
    return null;
  }
  const review_status = record.review_status as ReviewStatusValue;
  if (record.category === undefined || record.category === null || record.category === '') {
    return { review_status };
  }
  if (typeof record.category !== 'string' || !CATEGORY_SET.has(record.category as CanonicalWasteCategory)) {
    return null;
  }
  return { review_status, category: record.category as CanonicalWasteCategory };
}
