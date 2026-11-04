import 'server-only';
export async function reverseGeocode(coords: { latitude: number; longitude: number }) {
  void coords;
  return { regency: null, district: null };
}
