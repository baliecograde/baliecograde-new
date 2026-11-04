import fs from 'node:fs';
import path from 'node:path';

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

// Minimal valid 1x1 JPEG image bytes
const MINIMAL_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
  0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
  0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
  0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
  0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
  0xff, 0xff, 0xff, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01,
  0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05,
  0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a,
  0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xbf,
  0x80, 0xff, 0xd9
]);

async function runTest() {
  const args = process.argv.slice(2);
  const targetUrl = args.find((a) => a.startsWith('http')) || 'http://localhost:3000/api/scans/analyze';
  const customImagePath = args.find((a) => !a.startsWith('http') && !a.startsWith('--'));

  let imageBuffer = MINIMAL_JPEG;
  let mimeType = 'image/jpeg';
  let filename = 'sample.jpg';

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
    console.log(`Menggunakan 1x1 test JPEG synthetic (${imageBuffer.length} bytes)`);
  }

  const formData = new FormData();
  const blob = new Blob([imageBuffer], { type: mimeType });
  formData.append('image', blob, filename);
  formData.append('latitude', '-8.4095');
  formData.append('longitude', '115.1889');
  formData.append('accuracy', '10.5');
  formData.append('captured_at', new Date().toISOString());

  console.log(`\nMengirim POST multipart/form-data ke: ${targetUrl}`);
  const startTime = Date.now();

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      body: formData,
    });

    const latency = Date.now() - startTime;
    console.log(`HTTP Status: ${response.status} ${response.statusText} (${latency}ms)`);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      console.log('\nResponse JSON:');
      console.log(JSON.stringify(data, null, 2));

      if (response.ok) {
        console.log('\n[PASS] Endpoint dan DeepSeek berhasil diuji!');
      } else {
        console.log('\n[FAIL] Server mengembalikan error terstruktur sesuai instruksi (tanpa mock fallback).');
      }
    } else {
      const rawText = await response.text();
      console.log('\nResponse Text:', rawText);
    }
  } catch (err) {
    console.error('\nGagal menghubungi server/endpoint:', err.message);
    console.log('Pastikan server dev berjalan: npm run dev');
  }
}

runTest();

