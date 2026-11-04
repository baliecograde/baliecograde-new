import type { ScanArea } from '@/types/waste';

interface VillageCoordinate {
  village: string;
  regency: string;
  lat: number;
  lng: number;
}

const VILLAGES: VillageCoordinate[] = [
  { regency: 'Denpasar', village: 'Denpasar Selatan', lat: -8.6850, lng: 115.2300 },
  { regency: 'Denpasar', village: 'Denpasar Timur', lat: -8.6500, lng: 115.2500 },
  { regency: 'Denpasar', village: 'Denpasar Barat', lat: -8.6700, lng: 115.1950 },
  { regency: 'Denpasar', village: 'Denpasar Utara', lat: -8.6200, lng: 115.2100 },
  { regency: 'Badung', village: 'Kuta', lat: -8.7200, lng: 115.1700 },
  { regency: 'Badung', village: 'Jimbaran', lat: -8.7900, lng: 115.1650 },
  { regency: 'Badung', village: 'Mengwi', lat: -8.5600, lng: 115.1700 },
  { regency: 'Badung', village: 'Abiansemal', lat: -8.5300, lng: 115.2200 },
  { regency: 'Gianyar', village: 'Ubud', lat: -8.5069, lng: 115.2625 },
  { regency: 'Gianyar', village: 'Gianyar Kota', lat: -8.5410, lng: 115.3280 },
  { regency: 'Tabanan', village: 'Kediri', lat: -8.6100, lng: 115.1400 },
  { regency: 'Tabanan', village: 'Tabanan Kota', lat: -8.5400, lng: 115.1250 },
  { regency: 'Buleleng', village: 'Singaraja', lat: -8.1119, lng: 115.0880 },
  { regency: 'Buleleng', village: 'Lovina', lat: -8.1600, lng: 115.0260 },
  { regency: 'Karangasem', village: 'Amlapura', lat: -8.4500, lng: 115.6120 },
  { regency: 'Karangasem', village: 'Candidasa', lat: -8.4800, lng: 115.5600 },
  { regency: 'Klungkung', village: 'Semarapura', lat: -8.5000, lng: 115.4000 },
  { regency: 'Bangli', village: 'Bangli Kota', lat: -8.4500, lng: 115.3550 },
  { regency: 'Jembrana', village: 'Negara', lat: -8.3600, lng: 114.6200 },
];

export const BALI_REGENCIES: string[] = [...new Set(VILLAGES.map((item) => item.regency))];

export const DEFAULT_AREA: ScanArea = { regency: 'Denpasar', village: 'Denpasar Selatan' };

export function isWithinBali(lat: number, lng: number): boolean {
  return lat >= -8.95 && lat <= -8.0 && lng >= 114.3 && lng <= 115.8;
}

export function findNearestArea(lat: number, lng: number): ScanArea {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  let nearest = VILLAGES[0];
  let nearestDistance = Infinity;

  for (const candidate of VILLAGES) {
    const dx = (candidate.lng - lng) * cosLat;
    const dy = candidate.lat - lat;
    const distance = dx * dx + dy * dy;
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  return { regency: nearest.regency, village: nearest.village };
}
