# BaliEcoGrade — Data Dictionary

> **Status:** rancangan untuk review. Nama field mengikuti baseline tim; nullability dan beberapa constraints merupakan rekomendasi sementara. Dokumen ini bukan bukti bahwa schema sudah dibuat atau diuji di Supabase.

Draft ini memakai nama field baseline terbaru. `database-draft.sql` yang lama dipertahankan sebagai referensi historis dan memiliki nama kolom berbeda; jangan gunakan kedua definisi sebagai skema bersamaan.

## Konvensi

- Tabel target: `public.waste_scans`.
- Timestamp disimpan sebagai `TIMESTAMPTZ` (instant absolut); laporan memakai zona `Asia/Makassar`.
- Confidence memakai skala desimal **0–1**, bukan 0–100.
- Kategori non-null yang dikenal: `ORGANIK`, `ANORGANIK`, `RESIDU`, `B3`. Hasil belum pasti tidak boleh dipaksa ke salah satunya.
- Backend memetakan nama field database ke bentuk dashboard; dashboard tidak membaca tabel secara langsung.

## Field `waste_scans`

| Field | Tipe PostgreSQL | Nullability dan validasi rekomendasi | Arti, contoh, dan sumber |
|---|---|---|---|
| `id` | `UUID` | `NOT NULL`, primary key; default UUID database | ID unik scan. Contoh `8e39056e-8eb8-4ec4-97ce-a2e59f58c2f1`. Sumber: database. |
| `user_id` | `UUID` | Nullable; FK belum dibuat. FK ke `auth.users(id)` hanya setelah auth/lifecycle disetujui. | Pemilik scan bila terautentikasi. UUID atau `NULL`. Sumber: identitas yang diverifikasi server, bukan klaim role dari browser. |
| `material_detected` | `TEXT` | Disarankan nullable selama pending/gagal/tidak pasti; final bergantung lifecycle analisis. | Material terdeteksi, contoh `Botol plastik PET`. Sumber: hasil analisis backend/AI tervalidasi. |
| `trash_category` | `TEXT` | Nullable untuk hasil belum tersedia/tidak pasti; bila non-null, CHECK empat kategori. | Kategori, contoh `ANORGANIK`; dapat `NULL` bila klasifikasi tidak dapat dipertanggungjawabkan. Sumber: backend/AI tervalidasi. |
| `confidence_score` | `NUMERIC` | Nullable bila hasil belum ada; CHECK `0 <= value <= 1`. Presisi belum disepakati. | Keyakinan, contoh `0.93`. Sumber: backend/AI. UI menampilkan persen; penyimpanan/API tetap skala 0–1. |
| `action_instruction` | `TEXT` | Disarankan nullable untuk pending/gagal; aturan sukses perlu diputuskan. | Instruksi, contoh `Kosongkan, bilas, lalu pilah untuk didaur ulang.` Sumber: backend/AI atau panduan yang disetujui. |
| `balinese_context_note` | `TEXT` | Nullable. | Catatan konteks lokal, contoh `Ikuti jadwal pengumpulan setempat.` Sumber: backend/AI atau konten kurasi. |
| `analysis_status` | `TEXT` | Direkomendasikan `NOT NULL`; vocab/default/CHECK belum ditetapkan. Backend perlu memasok status. | Status proses. `pending`, `completed`, `failed`, `needs_review` hanya contoh, bukan enum final. Sumber: state machine backend. |
| `latitude` | `DOUBLE PRECISION` | Nullable; jika terisi CHECK `-90 <= value <= 90`; berpasangan dengan longitude. | Lintang, contoh `-8.4095`. Sumber: Browser Geolocation API, divalidasi server. |
| `longitude` | `DOUBLE PRECISION` | Nullable; jika terisi CHECK `-180 <= value <= 180`; berpasangan dengan latitude. | Bujur, contoh `115.1889`. Sumber: Browser Geolocation API, divalidasi server. |
| `location_accuracy_m` | `NUMERIC` | Nullable; jika terisi harus finite dan `>= 0`; presisi/ambang belum disepakati. | Akurasi dalam meter, contoh `12.5`. Sumber: properti `accuracy` browser, divalidasi server. |
| `location_captured_at` | `TIMESTAMPTZ` | Nullable bila lokasi/waktu capture tidak tersedia. | Waktu GPS diambil, contoh `2026-11-04T09:30:00+08:00`. Sumber: `captured_at` frontend setelah validasi backend; bukan pengganti `created_at`. |
| `regency` | `TEXT` | Nullable. | Kabupaten/kota hasil reverse geocoding, contoh `Badung` atau `Kota Denpasar`. Sumber: backend; null bila tidak terpetakan/di luar cakupan. |
| `district` | `TEXT` | Nullable. | Kecamatan hasil reverse geocoding, contoh `Kuta`. Sumber: backend; null bila tidak tersedia. |
| `image_path` | `TEXT` | Nullable; path objek saja, bukan public/signed URL. | Referensi bucket privat, contoh `scans/<scan-id>/<object-id>.webp`. Format path belum disepakati. Sumber: proses upload/backend. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default `now()` database. | Waktu row dibuat, contoh `2026-11-04T01:30:00Z`. Laporan mengonversi instant ini ke `Asia/Makassar`; tidak menyimpan waktu lokal tanpa zona. |

## Penanganan lokasi opsional

- Jika izin ditolak, geolocation gagal, atau posisi tidak tersedia, koordinat, akurasi, capture time, dan wilayah dapat `NULL` sesuai request contract.
- Jangan meminta input alamat manual sebagai pengganti GPS.
- Backend memvalidasi koordinat, melakukan reverse geocoding, dan menentukan kabupaten/kecamatan. Database menyimpan hasil backend.
- Apakah scan tetap dianalisis tanpa GPS atau di luar Bali adalah keputusan produk/backend yang belum ditetapkan.

## Mapping database ke dashboard

| Database | Field UI | Catatan transformasi |
|---|---|---|
| `id` | `id` | UUID diserialisasi sebagai string. |
| `material_detected` | `material` | Pertahankan null; perilaku tampilan perlu disepakati. |
| `trash_category` | `category` | Pertahankan null untuk hasil belum pasti; jangan menebak kategori. |
| `confidence_score` | `confidence` | Nilai 0–1; UI menampilkan persen. |
| `action_instruction` | `instruction` | Null mungkin pada scan pending/gagal. |
| `balinese_context_note` | `local_context` | Null diperbolehkan. |
| `regency` | `regency` | Normalisasi nama kanonis belum disepakati. |
| `district` | `district` | Normalisasi nama kanonis belum disepakati. |
| `created_at` | `scanned_at` | ISO 8601 dengan zona; bucket laporan menggunakan `Asia/Makassar`. |
| `image_path` | `image_url` | Backend mengotorisasi lalu memberi URL sementara/mekanisme aman; path bukan URL publik. |

`analysis_status` belum memiliki field sepadan pada bentuk UI saat ini. Jika dashboard perlu membedakan pending/gagal/tidak pasti, sepakati field respons dan perilaku tampilannya sebelum integrasi.

## Hal yang belum disepakati

- Apakah row dibuat sebelum analisis selesai atau hanya setelah hasil tersedia.
- Nullability final dan aturan lintas-field berdasarkan `analysis_status`.
- Vocab status, precision confidence, dan perlakuan skor rendah.
- FK/lifecycle `user_id`, retensi/anonymisasi, dan autentikasi admin.
- Sumber kanonis wilayah dan keputusan tabel `regions`.
- Path convention, retensi gambar, serta masa hidup URL akses gambar.
- Batas tanggal dan bucket grafik pada zona `Asia/Makassar`.
