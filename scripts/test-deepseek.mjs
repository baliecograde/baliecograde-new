import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Load environment variables from .env.local or .env if present
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [key, ...vals] = trimmed.split('=');
        if (key && vals.length > 0 && !process.env[key.trim()]) {
          process.env[key.trim()] = vals.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    }
  }
}

loadEnv();

// Generate a valid 64x64 RGB PNG image for vision API testing
function createSyntheticPng(width = 64, height = 64) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuf = Buffer.from(type);
    const crcInput = Buffer.concat([typeBuf, data]);
    let crc = 0xffffffff;
    for (const byte of crcInput) {
      crc ^= byte;
      for (let k = 0; k < 8; k++) {
        crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      }
    }
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const raw = Buffer.alloc(height * (1 + width * 3), 210);
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0; // filter byte
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([signature, makeChunk('IHDR', ihdr), makeChunk('IDAT', idat), makeChunk('IEND', Buffer.alloc(0))]);
}

const SYNTHETIC_IMAGE = createSyntheticPng(64, 64);

async function sendScanRequest(targetUrl, imageBuffer, mimeType, filename, locationData) {
  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: mimeType });
  formData.append('image', blob, filename);

  if (locationData.latitude !== undefined) formData.append('latitude', String(locationData.latitude));
  if (locationData.longitude !== undefined) formData.append('longitude', String(locationData.longitude));
  if (locationData.accuracy !== undefined) formData.append('accuracy', String(locationData.accuracy));
  if (locationData.captured_at !== undefined) formData.append('captured_at', locationData.captured_at);

  const res = await fetch(targetUrl, {
    method: 'POST',
    body: formData,
  });

  const status = res.status;
  const contentType = res.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }
  return { status, body };
}

async function runTests() {
  const args = process.argv.slice(2);
  const targetUrl = args.find((a) => a.startsWith('http')) || 'http://localhost:3000/api/scans/analyze';
  const customImagePath = args.find((a) => !a.startsWith('http') && !a.startsWith('--'));

  let imageBuffer = SYNTHETIC_IMAGE;
  let mimeType = 'image/png';
  let filename = 'sample.png';

  if (customImagePath) {
    const resolvedPath = path.resolve(process.cwd(), customImagePath);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`File tidak ditemukan: ${resolvedPath}`);
      process.exit(1);
    }
    imageBuffer = fs.readFileSync(resolvedPath);
    filename = path.basename(resolvedPath);
    if (filename.endsWith('.png')) mimeType = 'image/png';
    else if (filename.endsWith('.webp')) mimeType = 'image/webp';
    else mimeType = 'image/jpeg';
    console.log(`Menggunakan gambar lokal: ${resolvedPath} (${imageBuffer.length} bytes, ${mimeType})`);
  } else {
    console.log(`Menggunakan 64x64 test PNG synthetic (${imageBuffer.length} bytes)`);
  }

  console.log(`Target URL: ${targetUrl}\n=============================================`);

  // Test 1: Tanpa Koordinat (Missing Coordinates)
  console.log('[TEST 1] Mengirim tanpa izin/koordinat lokasi...');
  try {
    const res1 = await sendScanRequest(targetUrl, imageBuffer, mimeType, filename, {});
    console.log(`Status: ${res1.status}, Error Code: ${res1.body?.error?.code}`);
    if (res1.status === 400 && res1.body?.error?.code === 'MISSING_COORDINATES') {
      console.log('✅ PASS: Berhasil ditolak dengan MISSING_COORDINATES.');
    } else {
      console.error('❌ FAIL: Seharusnya ditolak 400 MISSING_COORDINATES. Diterima:', res1);
    }
  } catch (err) {
    console.error('❌ Connection error on Test 1:', err.message);
    console.log('Pastikan server dev aktif (npm run dev).');
    process.exit(1);
  }

  // Test 2: Koordinat di luar Bali (Jakarta: -6.2088, 106.8456)
  console.log('\n[TEST 2] Mengirim koordinat di luar wilayah Bali (Jakarta)...');
  const res2 = await sendScanRequest(targetUrl, imageBuffer, mimeType, filename, {
    latitude: -6.2088,
    longitude: 106.8456,
    accuracy: 15,
    captured_at: new Date().toISOString(),
  });
  console.log(`Status: ${res2.status}, Error Code: ${res2.body?.error?.code}`);
  if (res2.status === 400 && res2.body?.error?.code === 'OUTSIDE_BALI_REGION') {
    console.log('✅ PASS: Berhasil ditolak dengan OUTSIDE_BALI_REGION.');
  } else {
    console.error('❌ FAIL: Seharusnya ditolak 400 OUTSIDE_BALI_REGION. Diterima:', res2);
  }

  // Test 3: Koordinat Riil di Bali (Ubud, Gianyar: -8.5069, 115.2625)
  console.log('\n[TEST 3] Mengirim koordinat riil di Bali (Ubud / Gianyar)...');
  const res3 = await sendScanRequest(targetUrl, imageBuffer, mimeType, filename, {
    latitude: -8.5069,
    longitude: 115.2625,
    accuracy: 10,
    captured_at: new Date().toISOString(),
  });
  console.log(`Status: ${res3.status}`);
  if (res3.status === 200 && res3.body?.data) {
    const { regency, district, material, category, confidence, reason } = res3.body.data;
    console.log(`✅ PASS: Berhasil diproses!`);
    console.log(`   - Kabupaten : ${regency}`);
    console.log(`   - Kecamatan : ${district}`);
    console.log(`   - Material  : ${material}`);
    console.log(`   - Kategori  : ${category}`);
    console.log(`   - Akurasi AI: ${confidence}`);
    console.log(`   - Alasan AI : ${reason}`);
  } else {
    console.error('❌ FAIL on Test 3:', JSON.stringify(res3.body, null, 2));
  }

  // Test 4: Koordinat Riil di Bali (Denpasar: -8.6705, 115.2126)
  console.log('\n[TEST 4] Mengirim koordinat riil di Bali (Denpasar)...');
  const res4 = await sendScanRequest(targetUrl, imageBuffer, mimeType, filename, {
    latitude: -8.6705,
    longitude: 115.2126,
    accuracy: 8,
    captured_at: new Date().toISOString(),
  });
  console.log(`Status: ${res4.status}`);
  if (res4.status === 200 && res4.body?.data) {
    const { regency, district, category, reason } = res4.body.data;
    console.log(`✅ PASS: Berhasil diproses!`);
    console.log(`   - Kabupaten : ${regency}`);
    console.log(`   - Kecamatan : ${district}`);
    console.log(`   - Kategori  : ${category}`);
    console.log(`   - Alasan AI : ${reason}`);
  } else {
    console.error('❌ FAIL on Test 4:', JSON.stringify(res4.body, null, 2));
  }

  console.log('\n=============================================');
  console.log('Semua pengujian deteksi lokasi selesai.');
}

runTests();
