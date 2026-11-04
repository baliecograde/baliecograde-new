export type AcceptedImageMime = 'image/jpeg' | 'image/png' | 'image/webp';
export interface GpsSnapshot {
  latitude: number | null;
  longitude: number | null;
  location_accuracy_m: number | null;
  location_captured_at: string | null;
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
