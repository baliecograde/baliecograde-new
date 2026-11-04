import { findNearestBaliDistrict } from './bali-districts';

export interface ResolvedLocation {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  captured_at: string | null;
  regency: string;
  district: string;
  source: 'osm_nominatim' | 'offline_dataset';
}

export class LocationValidationError extends Error {
  code: 'MISSING_COORDINATES' | 'INVALID_COORDINATES' | 'OUTSIDE_BALI_REGION';
  statusCode: number;

  constructor(message: string, code: 'MISSING_COORDINATES' | 'INVALID_COORDINATES' | 'OUTSIDE_BALI_REGION', statusCode = 400) {
    super(message);
    this.name = 'LocationValidationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const BALI_BOUNDS = {
  minLat: -8.95,
  maxLat: -8.05,
  minLng: 114.40,
  maxLng: 115.75,
};

export function isCoordinateWithinBali(lat: number, lng: number): boolean {
  return (
    lat >= BALI_BOUNDS.minLat &&
    lat <= BALI_BOUNDS.maxLat &&
    lng >= BALI_BOUNDS.minLng &&
    lng <= BALI_BOUNDS.maxLng
  );
}

function normalizeRegencyName(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/^(Kabupaten|Kota)\s+/i, '').trim();
  const known = ['Badung', 'Bangli', 'Buleleng', 'Gianyar', 'Jembrana', 'Karangasem', 'Klungkung', 'Tabanan', 'Denpasar'];
  const match = known.find((k) => k.toLowerCase() === cleaned.toLowerCase());
  return match || cleaned;
}

function normalizeDistrictName(raw: string | undefined | null): string | null {
  if (!raw) return null;
  return raw.replace(/^(Kecamatan|Kelurahan|Desa)\s+/i, '').trim();
}

interface NominatimAddress {
  city?: string;
  county?: string;
  state_district?: string;
  city_district?: string;
  suburb?: string;
  municipality?: string;
  town?: string;
  village?: string;
  state?: string;
}

async function reverseGeocodeWithNominatim(lat: number, lng: number): Promise<{ regency: string; district: string } | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'BaliEcoGrade/1.0 (contact@baliecograde.org)',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(2500),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    const address = (data?.address || {}) as NominatimAddress;

    const rawRegency = address.county || address.city || address.state_district || null;
    const rawDistrict = address.suburb || address.municipality || address.town || address.city_district || address.village || null;

    const regency = normalizeRegencyName(rawRegency);
    const district = normalizeDistrictName(rawDistrict);

    if (regency && district) {
      return { regency, district };
    }

    if (regency) {
      const nearest = findNearestBaliDistrict(lat, lng);
      return { regency, district: nearest.district };
    }

    return null;
  } catch {
    return null;
  }
}

export async function resolveLocationFromCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
  accuracy: number | null | undefined,
  capturedAt: string | null | undefined
): Promise<ResolvedLocation> {
  if (lat === null || lat === undefined || isNaN(lat) || lng === null || lng === undefined || isNaN(lng)) {
    throw new LocationValidationError(
      'Izin lokasi diperlukan. Koordinat GPS latitude dan longitude wajib disertakan.',
      'MISSING_COORDINATES',
      400
    );
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new LocationValidationError(
      `Rentang koordinat tidak valid: latitude [${lat}], longitude [${lng}]`,
      'INVALID_COORDINATES',
      400
    );
  }

  if (!isCoordinateWithinBali(lat, lng)) {
    throw new LocationValidationError(
      `Lokasi (${lat.toFixed(4)}, ${lng.toFixed(4)}) berada di luar wilayah operasional Provinsi Bali.`,
      'OUTSIDE_BALI_REGION',
      400
    );
  }

  // 1. Coba reverse geocode OSM Nominatim (level kecamatan & kabupaten)
  const nominatimResult = await reverseGeocodeWithNominatim(lat, lng);

  if (nominatimResult) {
    return {
      latitude: lat,
      longitude: lng,
      accuracy: accuracy !== null && accuracy !== undefined && accuracy >= 0 ? accuracy : null,
      captured_at: capturedAt || null,
      regency: nominatimResult.regency,
      district: nominatimResult.district,
      source: 'osm_nominatim',
    };
  }

  // 2. Fallback offline dataset 57 kecamatan Bali (zero-latency, reliable)
  const nearest = findNearestBaliDistrict(lat, lng);

  return {
    latitude: lat,
    longitude: lng,
    accuracy: accuracy !== null && accuracy !== undefined && accuracy >= 0 ? accuracy : null,
    captured_at: capturedAt || null,
    regency: nearest.regency,
    district: nearest.district,
    source: 'offline_dataset',
  };
}
