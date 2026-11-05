import 'server-only';
import { resolveLocationFromCoordinates } from '@/lib/server/geocoding';

export async function reverseGeocode(coords: { latitude: number; longitude: number }) {
  const resolved = await resolveLocationFromCoordinates(coords.latitude, coords.longitude, null, null);
  return { regency: resolved.regency, district: resolved.district };
}
