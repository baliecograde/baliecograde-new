export interface ResolvedLocation {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  captured_at: string | null;
  regency: string | null;
  district: string | null;
}

const BALI_BOUNDS = {
  minLat: -8.95,
  maxLat: -8.05,
  minLng: 114.40,
  maxLng: 115.75,
};

export function resolveLocationFromCoordinates(
  lat: number | null,
  lng: number | null,
  accuracy: number | null,
  capturedAt: string | null
): ResolvedLocation {
  if (lat === null || lng === null) {
    return {
      latitude: null,
      longitude: null,
      accuracy: null,
      captured_at: null,
      regency: null,
      district: null,
    };
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('Invalid coordinate range');
  }

  const isWithinBali =
    lat >= BALI_BOUNDS.minLat &&
    lat <= BALI_BOUNDS.maxLat &&
    lng >= BALI_BOUNDS.minLng &&
    lng <= BALI_BOUNDS.maxLng;

  return {
    latitude: lat,
    longitude: lng,
    accuracy: accuracy !== null && accuracy >= 0 ? accuracy : null,
    captured_at: capturedAt,
    regency: isWithinBali ? 'Bali' : null,
    district: null,
  };
}

