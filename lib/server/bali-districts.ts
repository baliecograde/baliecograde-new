export interface BaliDistrictCoordinate {
  regency: string;
  district: string;
  lat: number;
  lng: number;
}

export const BALI_DISTRICTS: BaliDistrictCoordinate[] = [
  // Badung (6)
  { regency: 'Badung', district: 'Kuta', lat: -8.7233, lng: 115.1723 },
  { regency: 'Badung', district: 'Kuta Selatan', lat: -8.8000, lng: 115.1667 },
  { regency: 'Badung', district: 'Kuta Utara', lat: -8.6475, lng: 115.1583 },
  { regency: 'Badung', district: 'Mengwi', lat: -8.5447, lng: 115.1742 },
  { regency: 'Badung', district: 'Abiansemal', lat: -8.5167, lng: 115.2167 },
  { regency: 'Badung', district: 'Petang', lat: -8.3833, lng: 115.2167 },

  // Kota Denpasar (4)
  { regency: 'Denpasar', district: 'Denpasar Selatan', lat: -8.6850, lng: 115.2300 },
  { regency: 'Denpasar', district: 'Denpasar Timur', lat: -8.6500, lng: 115.2500 },
  { regency: 'Denpasar', district: 'Denpasar Barat', lat: -8.6700, lng: 115.1950 },
  { regency: 'Denpasar', district: 'Denpasar Utara', lat: -8.6200, lng: 115.2100 },

  // Gianyar (7)
  { regency: 'Gianyar', district: 'Gianyar', lat: -8.5410, lng: 115.3280 },
  { regency: 'Gianyar', district: 'Ubud', lat: -8.5069, lng: 115.2625 },
  { regency: 'Gianyar', district: 'Sukawati', lat: -8.5956, lng: 115.2831 },
  { regency: 'Gianyar', district: 'Blahbatuh', lat: -8.5722, lng: 115.3047 },
  { regency: 'Gianyar', district: 'Tampaksiring', lat: -8.4333, lng: 115.3000 },
  { regency: 'Gianyar', district: 'Tegallalang', lat: -8.4419, lng: 115.2806 },
  { regency: 'Gianyar', district: 'Payangan', lat: -8.3667, lng: 115.2500 },

  // Tabanan (10)
  { regency: 'Tabanan', district: 'Tabanan', lat: -8.5400, lng: 115.1250 },
  { regency: 'Tabanan', district: 'Kediri', lat: -8.6100, lng: 115.1400 },
  { regency: 'Tabanan', district: 'Kerambitan', lat: -8.5500, lng: 115.0833 },
  { regency: 'Tabanan', district: 'Selemadeg', lat: -8.5000, lng: 115.0333 },
  { regency: 'Tabanan', district: 'Selemadeg Barat', lat: -8.4667, lng: 114.9667 },
  { regency: 'Tabanan', district: 'Selemadeg Timur', lat: -8.5333, lng: 115.0667 },
  { regency: 'Tabanan', district: 'Baturiti', lat: -8.3167, lng: 115.1833 },
  { regency: 'Tabanan', district: 'Penebel', lat: -8.4500, lng: 115.1333 },
  { regency: 'Tabanan', district: 'Marga', lat: -8.5000, lng: 115.1667 },
  { regency: 'Tabanan', district: 'Pupuan', lat: -8.3333, lng: 115.0167 },

  // Buleleng (9)
  { regency: 'Buleleng', district: 'Buleleng', lat: -8.1120, lng: 115.0882 },
  { regency: 'Buleleng', district: 'Sukasada', lat: -8.1667, lng: 115.1000 },
  { regency: 'Buleleng', district: 'Seririt', lat: -8.1947, lng: 114.9339 },
  { regency: 'Buleleng', district: 'Banjar', lat: -8.1900, lng: 114.9686 },
  { regency: 'Buleleng', district: 'Gerokgak', lat: -8.1833, lng: 114.7833 },
  { regency: 'Buleleng', district: 'Kubutambahan', lat: -8.1167, lng: 115.2000 },
  { regency: 'Buleleng', district: 'Sawan', lat: -8.1333, lng: 115.1500 },
  { regency: 'Buleleng', district: 'Busungbiu', lat: -8.2667, lng: 114.9667 },
  { regency: 'Buleleng', district: 'Tejakula', lat: -8.1333, lng: 115.3167 },

  // Bangli (4)
  { regency: 'Bangli', district: 'Bangli', lat: -8.4539, lng: 115.3553 },
  { regency: 'Bangli', district: 'Kintamani', lat: -8.2436, lng: 115.3347 },
  { regency: 'Bangli', district: 'Susut', lat: -8.4667, lng: 115.3333 },
  { regency: 'Bangli', district: 'Tembuku', lat: -8.4500, lng: 115.4000 },

  // Karangasem (8)
  { regency: 'Karangasem', district: 'Karangasem', lat: -8.4500, lng: 115.6120 },
  { regency: 'Karangasem', district: 'Abang', lat: -8.3833, lng: 115.6167 },
  { regency: 'Karangasem', district: 'Bebandem', lat: -8.4333, lng: 115.5500 },
  { regency: 'Karangasem', district: 'Kubu', lat: -8.2500, lng: 115.5667 },
  { regency: 'Karangasem', district: 'Manggis', lat: -8.5000, lng: 115.5167 },
  { regency: 'Karangasem', district: 'Rendang', lat: -8.4167, lng: 115.4333 },
  { regency: 'Karangasem', district: 'Selat', lat: -8.4333, lng: 115.4833 },
  { regency: 'Karangasem', district: 'Sidemen', lat: -8.4833, lng: 115.4500 },

  // Klungkung (4)
  { regency: 'Klungkung', district: 'Klungkung', lat: -8.5333, lng: 115.4000 },
  { regency: 'Klungkung', district: 'Banjarangkan', lat: -8.5333, lng: 115.3667 },
  { regency: 'Klungkung', district: 'Dawan', lat: -8.5333, lng: 115.4500 },
  { regency: 'Klungkung', district: 'Nusa Penida', lat: -8.7333, lng: 115.5500 },

  // Jembrana (5)
  { regency: 'Jembrana', district: 'Negara', lat: -8.3589, lng: 114.6208 },
  { regency: 'Jembrana', district: 'Jembrana', lat: -8.3639, lng: 114.6542 },
  { regency: 'Jembrana', district: 'Mendoyo', lat: -8.3750, lng: 114.7500 },
  { regency: 'Jembrana', district: 'Pekutatan', lat: -8.4333, lng: 114.8833 },
  { regency: 'Jembrana', district: 'Melaya', lat: -8.2500, lng: 114.5000 },
];

export function findNearestBaliDistrict(lat: number, lng: number): { regency: string; district: string } {
  const cosLat = Math.cos((lat * Math.PI) / 180);
  let nearest = BALI_DISTRICTS[0];
  let nearestDistance = Infinity;

  for (const candidate of BALI_DISTRICTS) {
    const dx = (candidate.lng - lng) * cosLat;
    const dy = candidate.lat - lat;
    const distance = dx * dx + dy * dy;
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }

  return { regency: nearest.regency, district: nearest.district };
}

