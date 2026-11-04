# BaliEcoGrade Dashboard Integration — DRAFT

> Semua rancangan endpoint, field, dan contoh JSON di dokumen ini adalah usulan sementara untuk dibahas. Ini bukan kontrak API atau skema final. Mock data adalah data simulasi lokal dan bukan data produksi.

## Status repository

Repository saat audit belum memiliki file aplikasi. Baseline ini memakai React 18 + Vite 5. Tidak ditemukan konfigurasi Tailwind, Supabase, backend, maupun komponen yang sudah ada. Dashboard memakai CSS dan SVG bawaan, tanpa library chart atau koneksi database.

## Struktur data yang dibutuhkan UI

Satu record scan sementara memuat `id`, `material`, `category`, `confidence`, `instruction`, `local_context`, `regency`, `district`, `scanned_at`, dan `image_url` opsional. UI memerlukan confidence pada skala 0–1, timestamp ISO-8601 dengan zona waktu, serta kategori ORGANIK, ANORGANIK, RESIDU, B3. Penamaan dan bentuk ID perlu disepakati dengan backend.

## Draft tabel database

Rancangan awal `public.waste_scans` ada di [database-draft.sql](./database-draft.sql). Isinya mencakup nama material, kategori, skor confidence, instruksi, catatan konteks lokal, kabupaten, kecamatan, waktu scan, referensi gambar opsional, dan waktu pembuatan. SQL ditandai draft dan belum dijalankan. Belum ada tabel autentikasi atau asumsi kebijakan akses.

Keputusan terbuka: apakah lokasi disimpan sebagai teks atau foreign key ke master wilayah; sumber nilai kabupaten/kecamatan; apakah scan bisa gagal/tidak terklasifikasi; kebutuhan anonimisasi dan retensi gambar; skala confidence; apakah hasil model dapat dikoreksi; dan apakah `created_at` berbeda makna dari waktu scan.

## Data untuk visualisasi

- Kartu total dan kategori: hitung record berdasarkan rentang tanggal/filter yang berlaku.
- Grafik aktivitas: agregasi jumlah scan per hari (zona waktu dan batas hari perlu disepakati).
- Wilayah teratas: agregasi jumlah scan berdasarkan kabupaten, dengan drill-down kecamatan bila tersedia.
- Tabel: record scan dengan paginasi, pencarian material/wilayah, dan filter kategori, tanggal, kabupaten/kecamatan.
- Saat ini seluruh agregasi dihitung dari dataset lokal terbatas. Untuk data produksi, backend sebaiknya menangani agregasi dan paginasi.

## Endpoint yang diusulkan (sementara)

Semua endpoint berikut usulan untuk diskusi, bukan kontrak final:

- `GET /api/dashboard/summary?from=&to=` — total dan jumlah per kategori.
- `GET /api/dashboard/activity?from=&to=&group_by=day` — bucket waktu dan jumlah.
- `GET /api/dashboard/regions?from=&to=&regency=&limit=` — agregasi wilayah.
- `GET /api/dashboard/scans?from=&to=&category=&regency=&district=&q=&page=&page_size=` — riwayat scan terfilter.

Untuk iterasi pertama UI, repository hanya mengharapkan `GET /api/dashboard/scans`, yang dapat mengembalikan array atau `{ "data": [...] }`. Saat backend menentukan endpoint agregat, adapter repository dapat dikembangkan tanpa mengubah komponen presentasi.

## Contoh JSON sementara

```json
{
  "data": [
    {
      "id": "scan-id",
      "material": "Botol plastik PET",
      "category": "ANORGANIK",
      "confidence": 0.93,
      "instruction": "Kosongkan, bilas, lalu pilah untuk didaur ulang.",
      "local_context": "Panduan pemilahan setempat.",
      "regency": "Badung",
      "district": "Kuta",
      "scanned_at": "2026-11-03T09:30:00+08:00",
      "image_url": null
    }
  ],
  "meta": { "page": 1, "page_size": 20, "total": 1 }
}
```

Bentuk envelope, paginasi, nama field, dan validasi belum disepakati. Adapter saat ini menerima array atau `data` array dan tidak memakai `meta`.

## Implementasi frontend

- `src/services/dashboardRepository.js` mendefinisikan repository contract, implementasi mock, dan adapter API.
- `.env.example` menyiapkan `VITE_API_BASE_URL` serta `VITE_DASHBOARD_DATA_SOURCE`. Default aman adalah mock.
- API diaktifkan dengan `VITE_DASHBOARD_DATA_SOURCE=api` dan base URL Express. Tidak ada kredensial Supabase di browser.
- `src/data/mockScans.js` menyuplai record deterministik-ish untuk demo; semuanya ditandai simulasi di dashboard.

## Perlu disepakati dengan backend/tim

1. Bentuk endpoint, envelope error/success, paginasi, batas query, dan nama field.
2. Apakah summary, activity, regions dihitung backend atau dashboard mengambil seluruh scan.
3. Taksonomi kategori, format confidence, dan aturan untuk klasifikasi tidak pasti.
4. Wilayah master dan ejaan kanonis kabupaten/kecamatan.
5. Zona waktu agregasi dan rentang tanggal inklusif/eksklusif.
6. Penyimpanan, akses, masa retensi, dan kebijakan privasi untuk referensi gambar.
7. Aturan akses admin dan autentikasi; tidak ada implementasi auth dalam draft ini.
8. Pemilik migrasi Supabase, RLS, indeks, serta proses persetujuan sebelum deployment.
