# BaliEcoGrade — API Data Contract Draft

> **DRAFT — bukan kontrak final.** Endpoint berikut adalah kebutuhan/rute usulan untuk Next.js Route Handlers. Repository aktif kini merupakan aplikasi Next.js App Router; versi 16.4.5 baru tercatat dalam manifest/lockfile dan dependency belum terpasang. Backend, frontend, dan database owner harus menyetujui request, response, auth, status HTTP, filter, pagination, dan error sebelum implementasi. Contoh hanya memakai data sintetis; tidak ada endpoint yang diasumsikan tersedia.

## 1. Status dan aturan pertukaran data

### Temuan kode aktual (audit statis, 2026-11-04)

- App Router memiliki `app/page.tsx` dan `app/admin-dashboard/page.tsx`, tetapi tidak ditemukan Next.js Route Handler `route.ts`. Enam endpoint di dokumen ini tetap usulan dan belum tersedia.
- Dashboard dan alur scan memanggil Supabase langsung dari client melalui `lib/wasteScans.ts` (`insert` dan `select`); ini tidak sesuai prinsip bahwa dashboard dan penyimpanan scan harus melalui backend API.
- Query aktual meminta `id, regency, village, category, confidence, thumbnail, created_at`, sedangkan rancangan DB memakai `id, user_id, material_detected, trash_category, confidence_score, action_instruction, balinese_context_note, analysis_status, latitude, longitude, location_accuracy_m, location_captured_at, regency, district, image_path, created_at`.
- Tidak ditemukan autentikasi/otorisasi ADMIN, Route Handler, DeepSeek, upload Supabase Storage, migration, RLS, atau Storage policy. `@supabase/supabase-js` terdaftar, tetapi `node_modules` belum ada.
- `lib/classifier.ts` menghasilkan kategori dan confidence acak untuk stand-in, mengabaikan file gambar, dan hanya mencakup tiga kategori lowercase. Nilai sekitar 82–98 bukan output AI produksi maupun skala database 0–1.
- GPS diambil saat halaman dibuka dan dipetakan ke area statis terdekat. Jika gagal/ditolak/tidak tersedia/di luar Bali, `DEFAULT_AREA` tetap dipakai; koordinat, akurasi, serta waktu capture tidak dikirim saat insert.
- Thumbnail JPEG Data URL dikirim sebagai `thumbnail`; belum ada alur upload private Storage atau penggunaan `image_path`.

Status keputusan memakai label **CONFIRMED** (persetujuan spesifik tertulis), **PROPOSED** (usulan), **PENDING** (perlu keputusan/informasi), dan **BLOCKED** (menunggu dependensi). Persetujuan umum rancangan proyek tidak memfinalisasi detail kontrak.

| Topik | Status | Pemilik | Tindak lanjut |
|---|---|---|---|
| Next.js App Router sebagai aplikasi utama; Supabase, DeepSeek server-side, Storage privat, akses data dashboard melalui API | CONFIRMED | Keputusan bersama | Manifest/lockfile mencatat Next 16.4.5; runtime belum terpasang. |
| Enam route dan bentuk request/response pada dokumen ini | PROPOSED | Backend & AI + Frontend + Database | Belum ada Route Handlers; sepakati endpoint dan contract sebelum adapter. |
| Status AI, semantik `needs_review` vs `uncertain`, confidence dan kategori | PENDING | Backend & AI + Frontend + Database | Bedakan status proses dari antrean review; cocokkan kategori dan skala sebelum persistensi. |
| Auth ADMIN, akses API, RLS/grants, serta Storage access | BLOCKED | Frontend + Backend & AI + Database | Tentukan identitas dan role sebelum implementasi kontrol akses/policies. |
| GPS snapshot, null handling, reverse geocoding wilayah | PENDING | Frontend + Backend & AI + Database | Kode aktual menggunakan area default; perlu perilaku eksplisit dan sumber wilayah. |
| Pagination/agregasi/export server-side | PROPOSED | Backend & AI + Frontend; Database untuk query/index | Saat ini dashboard dibatasi 5.000 row dan menghitung di client. Tetapkan filter dan cakupan bersama. |

### Baseline rancangan tim

- Frontend/dashboard memakai Next.js Route Handlers; browser tidak membaca tabel Supabase produksi langsung.
- Target `public.waste_scans`; confidence 0–1, kategori `ORGANIK`, `ANORGANIK`, `RESIDU`, `B3`, waktu tersimpan `TIMESTAMPTZ`, laporan `Asia/Makassar`.
- Gambar berada di bucket privat `waste-images`; DB menyimpan `image_path`, bukan Base64 atau signed URL permanen.
- Backend memetakan database ke field dashboard.
- Rute yang diminta untuk dievaluasi tercantum di bawah, tetapi belum disetujui backend.

### Usulan konsistensi response

- Contoh sukses JSON memakai `{ "data": ..., "meta": ... }` sebagai konvensi sementara; tidak semua endpoint perlu `meta`.
- UUID dikirim sebagai string; confidence sebagai number 0–1; timestamp sebagai ISO 8601 dengan `Z` atau offset eksplisit.
- Field nullable dikirim sebagai `null`, bukan dihilangkan tanpa aturan.
- `analysis_status` dibutuhkan untuk membedakan pending/completed/uncertain/failed, tetapi belum ada di bentuk UI saat ini. Penambahan ke response/UI perlu disepakati.
- Nama route, envelope, status HTTP, auth, dan perlakuan field null belum final.

## 2. Pemetaan database ke dashboard

Mapping dilakukan backend; komponen dashboard tidak membaca nama kolom DB secara langsung.

| Database | Dashboard/API | Aturan sementara |
|---|---|---|
| `id` | `id` | UUID diserialisasi sebagai string. |
| `material_detected` | `material` | `null` bila belum ada hasil yang dapat ditampilkan. |
| `trash_category` | `category` | Empat kategori atau `null` jika belum terklasifikasi; jangan mengarang kategori. |
| `confidence_score` | `confidence` | Angka 0–1; UI boleh menampilkan persen. Precision/rounding menunggu keputusan. |
| `action_instruction` | `instruction` | String atau `null` sesuai status/kebijakan. |
| `balinese_context_note` | `local_context` | String atau `null`. |
| `regency` | `regency` | Kabupaten/kota dari reverse geocoding atau `null`. |
| `district` | `district` | Kecamatan dari reverse geocoding atau `null`. |
| `created_at` | `scanned_at` | ISO 8601 bertimezone; bucket/filter report memakai `Asia/Makassar`. |
| `image_path` | `image_url` | Backend mengotorisasi lalu memberi signed URL sementara/mekanisme aman. Jangan kirim path sebagai URL publik. |

`analysis_status`, `user_id`, GPS, akurasi, dan capture time belum ada pada bentuk record UI baseline. Apakah status perlu diekspos adalah keputusan terbuka.

## 3. Filter dan pagination — usulan

### Parameter `GET /api/dashboard/scans`

| Parameter | Tipe/contoh | Validasi yang diusulkan | Status |
|---|---|---|---|
| `page` | integer `1` | Default 1; harus >=1; nilai tidak valid → validation error. | Usulan |
| `page_size` | integer `20` | Default 20; rentang 1–100. Rekomendasi: tolak >100, bukan clamp diam-diam. | Usulan |
| `search` | string | Trim, maksimum usulan 100 karakter, parameterized query; case/wildcard semantics perlu ditetapkan. | Usulan |
| `category` | string enum | Hanya empat kategori; kategori null tidak cocok dengan category filter. | Kategori baseline; parameter usulan |
| `regency` | string | Exact match nama kanonis setelah sumber wilayah ditetapkan; batas panjang perlu ditentukan. | Usulan |
| `district` | string | Exact match; perilaku tanpa regency perlu disepakati. | Usulan |
| `start_date` | `YYYY-MM-DD` | Kalender `Asia/Makassar`; format invalid → 400. | Usulan |
| `end_date` | `YYYY-MM-DD` | Usulan inklusif sebagai tanggal lokal; server membentuk interval `[start midnight, day after end midnight)` di `Asia/Makassar`; harus >= start. | Usulan; perlu approval |
| `sort` | `created_at_desc` | Allowlist nilai; tidak menerima nama kolom/arbitrary SQL. Tambahkan `id` sebagai tie-breaker. | Usulan |

**Validasi query usulan:** nilai/format invalid menghasilkan HTTP 400 dan error code stabil; jangan mengubah query diam-diam. Tentukan apakah parameter tak dikenal ditolak atau diabaikan. Pakai parameter binding/ORM aman dan batas response. Semantik search, ejaan wilayah, sort lain, serta status yang dicakup belum ditentukan.

### Metadata pagination

```json
{
  "total": 245,
  "page": 2,
  "page_size": 20,
  "total_pages": 13
}
```

`total` adalah semua row yang memenuhi filter sebelum pagination. Untuk empty result diusulkan `total: 0`, `total_pages: 0`, `data: []`. Model offset/page atau cursor, snapshot saat ada insert, dan batas maksimal perlu persetujuan.

## 4. Endpoint dan contoh JSON

Semua contoh request/response sintetis dan sementara; kode status juga belum final.

### 4.1 `POST /api/scans/analyze`

Backend menangani validasi, Storage, analisis AI, dan persistensi. Transport belum diputuskan: `multipart/form-data` berisi file/GPS atau upload privat terpisah lalu mengirim referensinya. Client tidak mengirim Supabase secret/DeepSeek key.

Contoh JSON *jika* file sudah diunggah melalui flow yang disepakati:

```json
{
  "image_upload_token": "synthetic-upload-token",
  "location": {
    "latitude": -8.4095,
    "longitude": 115.1889,
    "accuracy": 12.5,
    "captured_at": "2026-11-04T09:30:00+08:00"
  }
}
```

Contoh sukses usulan:

```json
{
  "data": {
    "id": "00000000-0000-4000-8000-000000000001",
    "analysis_status": "completed",
    "material": "Botol plastik PET",
    "category": "ANORGANIK",
    "confidence": 0.93,
    "instruction": "Kosongkan, bilas, lalu pilah untuk didaur ulang.",
    "local_context": null,
    "regency": "Badung",
    "district": "Kuta",
    "scanned_at": "2026-11-04T01:30:00Z",
    "image_url": null
  }
}
```

`analysis_status`, auth untuk analyze, sync/async, dan response akhir perlu persetujuan. Bila asynchronous, kandidat `202 Accepted` dan scan ID untuk polling, tetapi polling route belum ditetapkan. GPS null/di luar Bali, pending row, retry, serta upload failure juga belum diputuskan.

### 4.2 `GET /api/dashboard/summary`

Usulan memakai filter scope yang sama dengan daftar bila disepakati, tanpa `page`/`page_size`.

```json
{
  "data": {
    "total_scans": 245,
    "by_category": {
      "ORGANIK": 80,
      "ANORGANIK": 95,
      "RESIDU": 55,
      "B3": 15
    }
  },
  "meta": {
    "timezone": "Asia/Makassar",
    "filters_applied": {
      "start_date": "2026-11-01",
      "end_date": "2026-11-30"
    }
  }
}
```

Belum diputuskan apakah total mencakup semua status atau hanya completed/uncertain, cara menghitung kategori null, serta apakah kartu mengikuti semua filter tabel atau hanya periode.

### 4.3 `GET /api/dashboard/activity`

Usulan tambahan query: `group_by=day`; default harian perlu disetujui. Label tanggal adalah kalender `Asia/Makassar`.

```json
{
  "data": [
    { "date": "2026-11-03", "count": 12 },
    { "date": "2026-11-04", "count": 9 }
  ],
  "meta": {
    "timezone": "Asia/Makassar",
    "group_by": "day"
  }
}
```

Rentang default, hari kosong (bucket nol atau dihilangkan), status yang dihitung, dan filter selain tanggal belum ditetapkan.

### 4.4 `GET /api/dashboard/regions`

```json
{
  "data": [
    {
      "regency": "Badung",
      "total_scans": 72,
      "districts": [
        { "district": "Kuta", "total_scans": 28 },
        { "district": "Mengwi", "total_scans": 18 }
      ]
    },
    { "regency": null, "total_scans": 3, "districts": [] }
  ],
  "meta": {
    "timezone": "Asia/Makassar",
    "filters_applied": { "start_date": "2026-11-01", "end_date": "2026-11-30" }
  }
}
```

Urutan, top-N/limit, tampilan region null, filter regency/district, dan status yang dihitung perlu persetujuan. Agregasi menghitung seluruh record yang cocok, bukan satu halaman.

### 4.5 `GET /api/dashboard/scans`

Contoh response usulan dengan record UI dan metadata pagination:

```json
{
  "data": [
    {
      "id": "00000000-0000-4000-8000-000000000001",
      "material": "Botol plastik PET",
      "category": "ANORGANIK",
      "confidence": 0.93,
      "instruction": "Kosongkan, bilas, lalu pilah untuk didaur ulang.",
      "local_context": null,
      "regency": "Badung",
      "district": "Kuta",
      "scanned_at": "2026-11-04T01:30:00Z",
      "image_url": "https://signed.example.invalid/synthetic-image?token=temporary"
    },
    {
      "id": "00000000-0000-4000-8000-000000000002",
      "material": null,
      "category": null,
      "confidence": null,
      "instruction": null,
      "local_context": null,
      "regency": null,
      "district": null,
      "scanned_at": "2026-11-04T01:28:00Z",
      "image_url": null
    }
  ],
  "meta": {
    "total": 245,
    "page": 1,
    "page_size": 20,
    "total_pages": 13,
    "sort": "created_at_desc",
    "timezone": "Asia/Makassar"
  }
}
```

URL `.invalid` dan token hanya contoh sintetis. Perlu diputuskan apakah list membuat URL untuk setiap row atau detail mendapat URL melalui mekanisme/route aman. Kode Next.js saat ini belum memiliki adapter API dashboard; ia meng-query Supabase langsung dari client dan belum memakai `meta`. Penyesuaian menunggu kontrak final.

### 4.6 `GET /api/dashboard/scans/export`

Export menerapkan filter yang sama (`search`, `category`, `regency`, `district`, `start_date`, `end_date`) dan mencakup **semua** hasil. `page`/`page_size` tidak boleh membatasi export; `sort` dapat mengurutkan file.

Contoh JSON sintetis sebagai **opsi asynchronous/control response**, bukan keputusan:

```json
{
  "data": {
    "export_id": "00000000-0000-4000-8000-000000000099",
    "status": "ready",
    "format": "csv",
    "filename": "baliecograde-scans-2026-11.csv",
    "download_url": "https://signed.example.invalid/export?token=temporary",
    "expires_at": "2026-11-04T02:00:00Z",
    "record_count": 245
  }
}
```

> Alternatif lebih sederhana adalah stream `text/csv` langsung; contoh JSON di atas tidak berlaku untuk opsi itu. Backend/frontend harus memilih stream sinkron atau job/download sementara. CSV mempertahankan escaping, null handling, UTF-8, dan mitigasi formula injection.

## 5. Statistik dan filter bersama

- Statistik dan export dihitung terhadap **seluruh himpunan terfilter** di server, sebelum pagination.
- Filter summary/activity/regions/scans harus konsisten. Apakah semua mendukung search/category/regency/district atau hanya tanggal perlu disetujui.
- `total_scans` belum tentu sama dengan jumlah empat kategori jika ada pending, failed, uncertain, atau kategori null. Tetapkan status yang masuk hitungan.
- Aktivitas dan filter tanggal laporan memakai `Asia/Makassar`; timestamp record tetap ISO bertimezone. Batas start/end harus eksplisit.
- Wilayah berasal dari reverse geocoding backend; null tidak boleh dipetakan ke nama buatan.
- Sort default usulan `created_at_desc`, tie-break dengan `id` untuk pagination stabil.

## 6. Error response — usulan

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Parameter request tidak valid.",
    "details": [
      { "field": "page_size", "issue": "must_be_between_1_and_100" }
    ],
    "request_id": "synthetic-request-id"
  }
}
```

Envelope, status, details, request ID, dan pesan aman perlu disetujui. Jangan kirim SQL, stack trace, credential, prompt internal, atau secret provider ke client.

| Kondisi | HTTP status kandidat | `code` kandidat | Catatan |
|---|---:|---|---|
| Validasi gagal | 400 atau 422 | `VALIDATION_ERROR` | Pilih satu dan konsisten; detail tidak membocorkan data sensitif. |
| Tidak terautentikasi | 401 | `UNAUTHENTICATED` | Mekanisme auth belum dipilih. |
| Tidak memiliki akses admin | 403 | `FORBIDDEN` | Role diverifikasi backend, bukan browser. |
| Data/scan tidak ditemukan | 404 | `NOT_FOUND` | Apakah inaccessible disamarkan sebagai 404 perlu keputusan. |
| Database gagal | 500 atau 503 | `DATABASE_ERROR` | Pesan generik client; detail redacted pada server log. |
| Storage gagal | 502/503 | `STORAGE_ERROR` | Retryable/non-retryable perlu disepakati. |
| Analisis AI gagal | 502/503 atau resource status | `ANALYSIS_FAILED` | Bedakan dari `uncertain`; sync/async flow belum ditetapkan. |

## 7. Akses gambar

- `image_path` hanya referensi internal ke bucket privat; bukan URL untuk browser.
- Backend memeriksa authz lalu membuat signed URL berumur terbatas atau stream/proxy aman.
- Signed URL adalah akses sementara; jangan simpan di DB atau log publik. Tangani expired dan object missing.
- Belum diputuskan apakah URL dibuat pada list atau hanya saat detail; jangan menambahkan route lain tanpa koordinasi backend.

## 8. Keamanan

- Anggap seluruh `GET /api/dashboard/*` sebagai admin endpoint sebelum production. Auth provider/session/ADMIN belum tersedia.
- Backend memverifikasi ADMIN setiap request; tidak mempercayai parameter/header role dari browser.
- Dashboard tidak mengakses Supabase table/Data API langsung.
- Publishable key bersifat publik dan hanya untuk pola yang dibatasi RLS. Secret/service-role dan DeepSeek key hanya server-side; service-role dapat melewati RLS, sehingga backend tetap memeriksa akses eksplisit.
- RLS/grants dan Storage policies belum dibuat. Key bukan pengganti otorisasi.

## 9. Keputusan untuk ditinjau

### Frontend

- Apakah UI perlu `analysis_status`; perilaku null category/confidence/instruction.
- Field GPS, permission denied/timeout, dan response jika lokasi null.
- Page/page_size atau cursor, default/maximum, empty page, reset saat filter berubah.
- Filter district, parameter sort, batas tanggal kalender `Asia/Makassar`.
- Export sebagai CSV stream atau JSON job/download URL, filename, expiry, UX status.
- Kapan detail memperoleh `image_url`; fallback URL expired/object missing.

### Backend & AI

- Route, auth analyze, sync/async, content type, response envelope, status HTTP, error codes.
- Status/transisi, uncertain threshold, confidence semantics, nullability, retry/idempotency, pending row.
- Mapping DB→UI, signed URL, dan apakah `analysis_status` masuk response.
- Filter semantics, validasi search/wilayah/tanggal/sort/page limits.
- Status yang dihitung summary/activity/regions; timezone bucket, null regions, filter bersama.
- Pagination stabil dan metadata; export penuh, limit volume, stream vs job.
- Boundary akses Supabase, ADMIN guard, Storage flow, redaksi error/log.

### Database / tim bersama

- Versi PostgreSQL target, nullability/constraints, auth/FK `user_id`, RLS/grants/Data API exposure.
- Storage policies, retensi GPS/gambar, nama wilayah, dan boundary tanggal.

## 10. Status kesiapan

- **Siap ditinjau:** mapping field utama, kategori/confidence/timezone baseline, parameter filter, pagination metadata, kebutuhan statistik/export, dan envelope error kandidat.
- **Belum kontrak:** seluruh route, parameter final, JSON, HTTP status/error code, sync/async analyze, export stream/job, statistik status/filter, auth, serta image URL flow.
- Aplikasi Next.js telah tersedia dalam repository, tetapi belum ada Route Handler. Kode dashboard masih query Supabase langsung dari client, memakai batas 5.000 row, dan belum mengonsumsi pagination/filter server atau endpoint agregasi/export.
- Dashboard Vite dan `dashboard-integration-draft.md` adalah referensi historis; tidak menggambarkan framework utama repository sekarang.
