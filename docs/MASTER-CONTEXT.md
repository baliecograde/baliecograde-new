# BaliEcoGrade — Master Context

> **Status dokumen:** acuan kerja bersama dan catatan audit. Audit repository terbaru bersifat statis pada workspace hasil ZIP; branch Git tidak tersedia dan dependency belum terpasang. Next.js 16.4.5 terverifikasi pada `package.json` dan `package-lock.json`, bukan sebagai dependency terpasang. Tidak ada koneksi Supabase atau SQL yang dijalankan. Nama endpoint, envelope respons, detail constraint, dan kebijakan akses yang belum disetujui tetap berupa usulan.

## 1. Tujuan dan arsitektur

BaliEcoGrade membantu pengguna mengenali material sampah, memahami kategorinya, dan memperoleh instruksi pemilahan dengan konteks lokal Bali. Hasil pemindaian, statistik, dan laporan Admin Dashboard perlu memakai data yang konsisten.

### Baseline arsitektur tim

| Area | Baseline yang disepakati dalam brief tim |
|---|---|
| Frontend | Next.js + React |
| Backend | Next.js App Router dan Route Handlers; bukan Express atau service backend terpisah |
| AI | DeepSeek Vision API, dipanggil dari server |
| Database | Supabase PostgreSQL |
| Penyimpanan gambar | Supabase Storage |
| Hosting | Vercel |
| Dashboard | Mengambil data melalui API backend; tidak membaca tabel produksi langsung dari browser |
| Zona waktu laporan | Asia/Makassar |

> Baseline arsitektur di atas adalah arahan proyek. Repository saat ini adalah aplikasi Next.js App Router. SDK Supabase digunakan langsung dari client dengan fallback placeholder, tetapi koneksi produksi dan Route Handlers belum tersedia. Dashboard Vite terdahulu adalah referensi historis terpisah, bukan framework utama repository ini.

## 2. Pembagian tanggung jawab

| Peran | Tanggung jawab utama | Batas koordinasi |
|---|---|---|
| Frontend | Aplikasi Next.js/React, alur UI pemindaian, dashboard, state UI, dan pemanggilan API dari client/server sesuai arsitektur aplikasi. | Jangan mengakses tabel produksi langsung dari browser. Tinjau batas client/server dan contract API bersama Backend & AI. |
| Backend & AI | Next.js Route Handlers, validasi request, pemanggilan DeepSeek Vision dari server, business logic, reverse geocoding, otorisasi endpoint, serta pemetaan data database ke respons UI. | DeepSeek key dan kredensial server hanya di server. Backend menyepakati kontrak API bersama frontend/database. |
| Database & Data Integration | Desain dan migration PostgreSQL, constraints/indexes, evaluasi tabel pendukung, Storage/RLS bersama backend, konsistensi data, mapping kebutuhan dashboard, dan pengujian integrasi data. | Tidak menjalankan migration remote tanpa persetujuan. Tidak mengambil alih AI, reverse geocoding, atau business logic endpoint. |

## 3. Hasil audit repository

Audit awal dilakukan baca-saja pada working directory proyek.

| Temuan | Kondisi aktual |
|---|---|
| Struktur aplikasi | App Router tersedia di `app/`, termasuk `app/page.tsx` dan `app/admin-dashboard/page.tsx`. Ada juga folder root `pages/` dengan modul bernama export; dampaknya pada Pages Router belum diverifikasi dengan build Next.js. |
| Framework dan dependency | `package.json` dan `package-lock.json` mencatat Next.js 16.4.5, React 19.3.0, serta `@supabase/supabase-js`. `node_modules` tidak tersedia, sehingga dependency belum terpasang/terverifikasi runtime. Lockfile npm v3 tersedia; tidak ada field `packageManager`. |
| Git | Direktori `.git` tidak tersedia pada workspace ZIP; branch dan perubahan Git tidak dapat diidentifikasi. |
| Frontend | Landing page dan admin dashboard berada di `app/` + `components/`; modul dashboard log berada di `pages/AdminDashboardPage.tsx` dan memakai filter tanggal/kabupaten/kategori serta pagination client. Batas client/server pada landing page dan folder root `pages/` perlu verifikasi build. |
| Data dan dashboard | `lib/wasteScans.ts` membatasi query pada 5.000 row dan melakukan select/insert langsung melalui Supabase client. Statistik/filter/pagination dilakukan di browser; belum ada search/export server atau agregasi API. |
| Supabase dan keamanan | SDK tersedia dalam manifest, tetapi client memakai `NEXT_PUBLIC_*` dengan fallback placeholder dan dipanggil dari frontend. Belum ditemukan auth, otorisasi ADMIN, Route Handlers, RLS, Storage, atau konfigurasi/migration Supabase. Akses tabel langsung dari browser tidak sesuai target arsitektur. |
| Scan/AI/GPS/gambar | Klasifikasi masih acak dan tidak memakai image; hanya tiga kategori lowercase. GPS memakai area default/nearest-area statis; gambar direduksi menjadi thumbnail Data URL. Temuan rinci dan mismatch schema dicatat pada audit integrasi terbaru di bawah. |
| Validasi toolchain | Script `lint` dan `build` tercatat; tidak ada `typecheck`/`test`. Belum dijalankan karena dependency belum terpasang. |

Repository Next.js saat ini tidak boleh dianggap terintegrasi hanya karena SDK tercantum dalam manifest. Klasifikasi acak dan area default adalah perilaku aplikasi aktual yang tidak boleh diperlakukan sebagai hasil AI atau lokasi produksi. Dashboard Vite terdahulu tetap merupakan referensi historis; implementasi, build, dan smoke-test Vite sebelumnya tidak membuktikan integrasi aplikasi ini.

## 4. Status keputusan

### 4.1 Baseline yang diberikan sebagai keputusan/acuan proyek

- Stack target adalah Next.js App Router, Supabase PostgreSQL/Storage, DeepSeek Vision API di server, dan Vercel.
- `waste_scans` memakai baseline nama field yang tercantum pada bagian database di bawah.
- Kategori bisnis: `ORGANIK`, `ANORGANIK`, `RESIDU`, `B3`.
- Confidence menggunakan skala 0–1.
- Waktu laporan memakai zona `Asia/Makassar`; timestamp penyimpanan bertipe `TIMESTAMPTZ`.
- GPS opsional; lokasi dapat null bila izin ditolak/tidak tersedia atau koordinat tidak dapat dipetakan.
- File gambar berada di bucket privat `waste-images`; database menyimpan path objek, bukan Base64 atau URL bertanda tangan permanen.
- Dashboard menerima data aktual melalui backend API, dan backend memetakan kolom database ke field dashboard.
- Endpoint kebutuhan awal tercantum pada bagian API. Rute sudah menjadi target kerja tim, tetapi format request/response belum menjadi kontrak final.
- Tidak membuat Express/backend terpisah. Dashboard Vite terdahulu tetap diperlakukan sebagai modul historis; repository saat ini sudah memakai Next.js.

### 4.2 Usulan teknis yang membutuhkan review/persetujuan

- Nullability dan aturan status hasil analisis untuk menampung proses pending/gagal/tidak pasti tanpa mengarang kategori.
- Constraint pasangan koordinat, rentang GPS, batas confidence, dan daftar nilai `analysis_status`.
- Foreign key `user_id` ke Supabase Auth, perilaku penghapusan akun, index set, dan strategi cursor/offset pagination.
- Cara menghasilkan URL gambar sementara untuk dashboard dan akses objek oleh user/admin.
- Apakah autentikasi menggunakan Supabase Auth, bentuk role/claims, dan pola RLS untuk request backend.
- Apakah tabel `profiles` atau `regions` benar-benar diperlukan.
- Struktur envelope JSON, parameter filter, timezone batas tanggal, agregasi, metadata pagination, dan bentuk error endpoint.

### 4.3 Belum tersedia/belum dikerjakan

- Dependency Next.js belum dipasang pada workspace ZIP; versi 16.4.5 hanya tercatat di manifest/lockfile. Branch Git juga belum dapat diidentifikasi.
- Route Handlers backend, integrasi DeepSeek, reverse geocoding, serta API produksi belum tersedia. Kode scan/dashboard saat ini mengakses tabel Supabase langsung dari client.
- Proyek/schema Supabase, migration, bucket, Storage policies, RLS, dan kredensial belum dikonfigurasi/ditemukan.
- Autentikasi/otorisasi admin belum tersedia; `/admin-dashboard` belum dilindungi.
- Pengujian insert/read, akses Storage, RLS, agregasi produksi, pagination API, dan export server belum dilakukan.

### 4.4 Status keputusan dan pemilik

Gunakan status berikut pada keputusan integrasi: **CONFIRMED** hanya untuk keputusan spesifik yang tercatat; **PROPOSED** untuk rekomendasi; **PENDING** untuk keputusan/informasi yang belum tersedia; **BLOCKED** bila pekerjaan tidak dapat dilanjutkan sebelum dependensi dipenuhi. Persetujuan umum atas rancangan proyek tidak mengonfirmasi detail yang belum disepakati.

| Topik | Status | Pemilik | Bukti/keterangan |
|---|---|---|---|
| Next.js App Router, Next.js 16.4.5 pada manifest/lockfile, Supabase PostgreSQL/Storage sebagai target | CONFIRMED | Keputusan bersama | Arsitektur target dicatat dalam brief dan dokumen; versi Next.js belum terpasang pada workspace ZIP. |
| Empat kategori target `ORGANIK`, `ANORGANIK`, `RESIDU`, `B3`; confidence database 0–1; `TIMESTAMPTZ`; laporan `Asia/Makassar`; bucket privat; akses dashboard melalui backend | CONFIRMED | Keputusan bersama | Baseline eksplisit dalam dokumen proyek. Nilai kategori/model kode aktual belum sesuai. |
| Bentuk nilai kategori canonical dan mapping lowercase UI ke database | PENDING | Frontend + Backend & AI + Database | Kode saat ini hanya memiliki `organic`, `inorganic`, `residue`; nilai target uppercase. |
| Makna/konversi confidence simulasi 82–98 ke skala database | PENDING | Backend & AI + Database | Jangan menganggap angka simulasi dapat dibagi 100 dan digunakan sebagai confidence AI. |
| Status analisis, termasuk `needs_review` vs `uncertain`, transisi dan nullability | PENDING | Backend & AI | Status AI dan kebutuhan review manusia mungkin berbeda konsep. |
| GPS snapshot, perilaku NULL ketika tidak tersedia, reverse geocoding dan wilayah canonical | PENDING | Frontend + Backend & AI + Database | Kode memakai DEFAULT_AREA/nearest-area; aturan default bukan bukti lokasi scan. Provider wilayah belum dipilih. |
| Upload private Storage, object path, signed URL/proxy, ukuran/retensi | BLOCKED | Backend & AI + Database | Membutuhkan desain upload, autentikasi/otorisasi, bucket/policy, dan review keamanan. |
| Auth dan role ADMIN untuk dashboard/API | BLOCKED | Frontend + Backend & AI | Belum tersedia; menjadi dependensi untuk RLS, grants, dan akses Storage. |
| Endpoint, filter, statistik, pagination server, export, error envelope | PENDING | Frontend + Backend & AI | API Contract masih draft dan belum ada Route Handlers. |
| Migration `waste_scans` dan indeks final | BLOCKED | Database | Schema perlu diselaraskan dengan keputusan di atas dan versi PostgreSQL; tidak ada migration saat ini. |

### 4.5 Temuan implementasi yang memengaruhi kontrak

- `lib/wasteScans.ts` melakukan insert/select langsung dari client dengan `regency`, `village`, `category`, `confidence`, `thumbnail`; ini tidak cocok dengan target `regency`, `district`, `trash_category`, `confidence_score`, `image_path` dan melanggar prinsip akses dashboard melalui backend.
- `lib/classifier.ts` memberi kategori dan confidence acak, tidak menggunakan gambar, serta hanya memuat tiga kategori. Nilai confidence simulasi sekitar 82–98 bukan hasil AI produksi dan berada di luar skala database 0–1.
- `hooks/useUserArea.ts` meminta lokasi saat halaman dibuka; ketika lokasi tidak tersedia/ditolak/di luar Bali, kode memakai `DEFAULT_AREA`. `hooks/useWasteScan.ts` menyimpan area tersebut tanpa mengirim koordinat, akurasi, atau waktu capture.
- `lib/thumbnail.ts` menghasilkan Data URL dan alur scan mengirimnya sebagai `thumbnail`; target adalah upload file ke bucket privat dan menyimpan `image_path`.
- Dashboard membatasi query 5.000 row, menghitung statistik/filter/pagination di client, dan belum menyediakan search/export server. Pagination/agregasi API perlu mencakup semua data yang cocok, bukan hanya subset hasil query.

## 5. Evaluasi rancangan database

### 5.1 Baseline `public.waste_scans`

Tabel berikut adalah baseline desain tim. Rekomendasi tipe/nullability di kolom terakhir adalah usulan desain untuk review, bukan migration yang telah disetujui.

| Kolom | Tipe yang direkomendasikan | Nullability / constraint yang direkomendasikan | Status / catatan |
|---|---|---|---|
| `id` | `UUID` | `NOT NULL PRIMARY KEY`; default UUID dibuat di database | Tipe baseline. Fungsi/default UUID diverifikasi terhadap lingkungan Supabase saat migration dirancang. |
| `user_id` | `UUID` | `NULL`; kandidat FK ke `auth.users(id)` dengan `ON DELETE SET NULL` | FK dan perilaku penghapusan perlu keputusan auth/privacy. Jangan membuat `profiles` hanya untuk menambahkan role. |
| `material_detected` | `TEXT` | **Usulan:** nullable selama analisis pending/gagal/tidak pasti; jika hanya menyimpan analisis sukses, dapat diwajibkan setelah alur dipastikan | Nilai mentah/label material yang diperlukan dashboard. Aturan panjang/normalisasi belum ditetapkan. |
| `trash_category` | `TEXT` | **Usulan:** nullable saat hasil belum pasti; jika non-null, CHECK hanya empat kategori yang disepakati | Jangan mengisi kategori tebakan ketika analisis tidak pasti. Perlu sepakati apakah scan tanpa kategori disimpan. |
| `confidence_score` | `NUMERIC` | **Usulan:** nullable jika belum ada hasil; CHECK `0 <= value <= 1` | Skala 0–1 adalah baseline. Presisi (`NUMERIC(p,s)`) perlu disepakati berdasarkan output model dan kebutuhan tampilan. |
| `action_instruction` | `TEXT` | **Usulan:** nullable untuk status pending/gagal; wajib hanya jika status sukses mensyaratkannya | Perlu disepakati apakah instruksi dapat kosong atau berasal dari aturan lokal. |
| `balinese_context_note` | `TEXT` | **Usulan:** nullable | Catatan konteks lokal; belum ada format/daftar sumber baku. |
| `analysis_status` | `TEXT` | `NOT NULL` dapat dipertimbangkan setelah daftar status ditetapkan; CHECK pada daftar status | Daftar nilai belum disepakati. Contoh `pending`, `completed`, `failed`, `needs_review` hanya usulan; tidak dijadikan constraint final. |
| `latitude` | `DOUBLE PRECISION` | `NULL`; jika ada, CHECK `-90 <= latitude <= 90` | Nilai dari Browser Geolocation API yang divalidasi server. |
| `longitude` | `DOUBLE PRECISION` | `NULL`; jika ada, CHECK `-180 <= longitude <= 180` | Nilai dari Browser Geolocation API yang divalidasi server. |
| `location_accuracy_m` | `NUMERIC` | `NULL`; jika ada, CHECK nilai `>= 0` | Satuan meter. Presisi/ambang akurasi belum disepakati. |
| `location_captured_at` | `TIMESTAMPTZ` | `NULL` bila lokasi tak tersedia; diwajibkan hanya jika capture GPS terjadi | Waktu capture GPS; jangan samakan otomatis dengan `created_at`. |
| `regency` | `TEXT` | `NULL` | Hasil reverse geocoding backend; null bila di luar cakupan/tidak terpetakan. Mencakup kabupaten/kota. |
| `district` | `TEXT` | `NULL` | Hasil reverse geocoding backend; null bila tidak tersedia. |
| `image_path` | `TEXT` | `NULL` | Path relatif objek pada bucket privat, bukan URL publik/signed URL. Format path perlu disepakati. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, default waktu insert database | Waktu pembuatan record. Zona laporan Asia/Makassar diterapkan pada agregasi/tampilan, bukan dengan mengubah makna instant timestamp. |

### 5.2 Constraint dan integritas yang direkomendasikan

Berikut rancangan untuk ditinjau sebelum migration:

1. Validasi rentang latitude/longitude dan `confidence_score` di database, selain validasi request di server.
2. Tambahkan constraint pasangan GPS: kedua koordinat sama-sama null atau sama-sama terisi. `location_accuracy_m` dan `location_captured_at` tetap opsional; aturan keterkaitannya perlu disetujui.
3. Untuk koordinat di luar Bali, simpan koordinat hanya jika kebijakan produk mengizinkan, tetapi backend tidak mengisi `regency`/`district` Bali secara keliru. Kebijakan apakah scan tetap diterima adalah keputusan business/backend.
4. Jangan membuat enum/constraint status atau kategori `UNCERTAIN` sebelum kontrak produk menetapkannya. `trash_category` nullable pada hasil belum pasti adalah salah satu opsi yang perlu disepakati.
5. FK `user_id` ke `auth.users(id)` sesuai bila Supabase Auth memang menjadi sumber identitas. `ON DELETE SET NULL` menjaga scan tetap ada tetapi menghilangkan relasi user; retensi/anonymisasi harus disetujui.
6. Constraint lintas status—misalnya field hasil wajib saat status `completed`—baru ditambahkan setelah state machine analisis disepakati.

### 5.3 Indeks yang dievaluasi

Indeks harus mengikuti endpoint/filter yang benar-benar disepakati. Kandidat awal:

| Kandidat indeks | Alasan | Status |
|---|---|---|
| `(created_at DESC, id DESC)` | Riwayat terbaru dan cursor pagination stabil; `id` menjadi tie-breaker waktu yang sama. | Usulan; verifikasi query plan. |
| `(trash_category, created_at DESC, id DESC)` | Filter kategori pada riwayat. | Usulan; ukur pola filter dan selectivity. |
| `(regency, created_at DESC, id DESC)` | Filter kabupaten/kota dengan urutan riwayat stabil. | Usulan; sesuai hanya bila pola query memfilter regency dan mengurutkan waktu. |
| `(regency, district, created_at DESC, id DESC)` | Filter pasangan kabupaten/kecamatan yang tepat. | Alternatif usulan; tidak otomatis menggantikan indeks regency saja untuk sort waktu. |
| `(user_id, created_at DESC, id DESC)` | Riwayat per user dan policy/query berdasarkan user. | Usulan; relevan bila akses user perorangan dibutuhkan. |

Pencarian substring pada material/lokasi tidak otomatis dipercepat indeks B-tree tersebut; strategi pencarian (misalnya trigram/full-text) perlu diputuskan berdasarkan kebutuhan, extension yang diizinkan, dan volume data. Hindari menambahkan indeks tanpa query/pengukuran yang mendukungnya.

### 5.4 `profiles` dan `regions`

- **`profiles`: belum diputuskan.** Supabase Auth sudah menyimpan identitas dasar. Tabel profil hanya diperlukan jika ada atribut aplikasi tambahan atau role yang perlu dikelola. Jika role admin diperlukan, sumber role/claims, pencegahan eskalasi dari client, dan lifecycle-nya harus ditetapkan lebih dahulu.
- **`regions`: belum diputuskan.** Teks `regency`/`district` cukup untuk baseline awal. Tabel referensi masuk akal bila diperlukan ID kanonis, relasi, validasi data, atau pembaruan wilayah terpusat. Tim perlu menentukan sumber resmi dan granularitas wilayah sebelum normalisasi.

## 6. GPS dan reverse geocoding

### Alur tanggung jawab

1. Frontend meminta izin menggunakan Browser Geolocation API dan mengirim `latitude`, `longitude`, `accuracy`, dan `captured_at` bila tersedia.
2. Jika izin ditolak, timeout, atau perangkat tidak memberikan posisi, field lokasi dikirim/ditafsirkan sebagai null sesuai request contract yang disepakati. Tidak ada input manual yang menggantikan GPS.
3. Backend memvalidasi nilai dan rentang koordinat, lalu melakukan reverse geocoding serta menentukan `regency`/`district`.
4. Backend menangani koordinat di luar Bali atau hasil geocoding yang tidak meyakinkan tanpa mengarang wilayah; kolom wilayah dapat null.
5. Database menyimpan koordinat/capture time dan hasil wilayah yang dikembalikan backend.

### Hal yang masih harus disepakati

- Apakah scan tetap dianalisis jika GPS ditolak atau koordinat di luar Bali.
- Penyedia/sumber reverse geocoding, batas penggunaan, akurasi, lisensi/privasi, dan strategi kegagalan.
- Apakah koordinat mentah disimpan setelah reverse geocoding, periode retensinya, serta apakah presisi perlu dikurangi demi privasi.
- Format nama kabupaten/kota dan kecamatan yang kanonis.
- Perbedaan `location_captured_at` dengan `created_at` serta aturan menerima timestamp client.

Reverse geocoding dan business logic tersebut berada pada tanggung jawab backend, bukan implementasi database.

## 7. Supabase Storage

### Baseline rancangan

- Nama bucket: `waste-images`.
- Bucket privat.
- Gambar diunggah sebagai objek; database menyimpan `image_path` saja.
- Jangan menyimpan Base64, URL publik, atau signed URL sementara sebagai referensi permanen.
- Backend mengotorisasi akses dan, jika sesuai, membuat signed URL berdurasi terbatas untuk pemakai yang berhak.

### Hal teknis untuk review

- Tetapkan batas ukuran, MIME type yang diperbolehkan, nama/path objek yang tidak mudah bertabrakan, retensi, dan proses penghapusan objek terkait scan.
- Pastikan policy Storage membatasi baca/tulis sesuai identitas. Jangan membuat bucket publik untuk menyederhanakan dashboard.
- Jika dashboard memerlukan gambar, backend memetakan `image_path` menjadi `image_url` yang dapat diakses dengan otorisasi yang sesuai. URL tersebut bersifat sementara dan tidak ditulis balik ke `image_path`.
- Belum ada bucket/policy atau mekanisme signed URL yang dibuat maupun diuji.

## 8. Integrasi Admin Dashboard

### Pemetaan field

Backend menjadi boundary mapping dari database ke bentuk record UI. Nama kolom database tidak perlu memaksa perubahan komponen dashboard.

| Database | Dashboard | Catatan |
|---|---|---|
| `id` | `id` | UUID dapat diserialisasi sebagai string. |
| `material_detected` | `material` | Nullable hasilnya harus ditampilkan sebagai kosong/label sesuai status. |
| `trash_category` | `category` | Empat kategori UI; status belum pasti tidak boleh dipaksakan menjadi salah satunya. Penanganan UI perlu keputusan bersama. |
| `confidence_score` | `confidence` | Nilai desimal 0–1; UI menampilkan sebagai persen dan CSV menulis skala 0–1. |
| `action_instruction` | `instruction` | Null perlu ditangani oleh response/UI. |
| `balinese_context_note` | `local_context` | Null diperbolehkan. |
| `regency` | `regency` | Kabupaten/kota hasil backend. |
| `district` | `district` | Kecamatan hasil backend. |
| `created_at` | `scanned_at` | ISO 8601 bertimezone; laporan diubah ke Asia/Makassar. |
| `image_path` | `image_url` | Backend membuat URL akses yang sah/bertanda tangan bila gambar tersedia; jangan mengekspos bucket privat. |

Dashboard saat ini menghitung kartu, grafik, dan wilayah dari daftar scan yang dimuat client. Pagination juga client-side, 8 record per halaman. Export CSV mengambil semua record yang lolos filter di client sebelum slicing halaman; kolomnya material, kategori, confidence, instruksi, kabupaten/kota, kecamatan, dan waktu.

Untuk data produksi yang dipaginasi server, endpoint harus menjaga:

- Statistik menghitung seluruh himpunan yang sesuai filter, bukan hanya halaman saat ini.
- Pagination stabil—disarankan tie-break dengan `id` selain `created_at`; pilihan offset vs cursor dan metadata total masih perlu disepakati.
- Search/filter pada backend konsisten dengan UI: pencarian material/lokasi, kategori, kabupaten/kota, tanggal `from`/`to`. UI saat ini belum menyediakan filter kecamatan tersendiri.
- Export menerapkan predicate filter yang sama dan mencakup seluruh hasil, bukan hanya halaman aktif. Strategi dapat berupa endpoint CSV atau repository yang mengiterasi semua halaman; batas volume/performa harus disepakati.
- Rentang tanggal memakai batas dan zona `Asia/Makassar` yang eksplisit; timestamp record tetap mewakili instant absolut.

## 9. Endpoint API

Backend owner mengimplementasikan endpoint melalui Next.js Route Handlers. Daftar rute di bawah adalah target kebutuhan tim; parameter rinci dan bentuk response tetap **usulan sampai kontrak disetujui**.

| Endpoint target | Kebutuhan data | Status kontrak |
|---|---|---|
| `POST /api/scans/analyze` | Upload/referensi gambar, data GPS opsional, hasil analisis/status dan scan ID | Rute target dari brief; request/response, upload flow, error, idempotency, dan persistensi belum ditetapkan. |
| `GET /api/dashboard/summary` | Total scan dan hitungan per kategori; kemungkinan filter periode | Rute target; definisi filter dan agregasi perlu disepakati. |
| `GET /api/dashboard/activity` | Jumlah scan per bucket waktu dalam timezone laporan | Rute target; rentang default, bucket, dan boundary waktu perlu disepakati. |
| `GET /api/dashboard/regions` | Hitungan kabupaten/kota dan kecamatan | Rute target; bentuk drilldown, filter, dan wilayah null perlu disepakati. |
| `GET /api/dashboard/scans` | Riwayat detail, pencarian, filter, sorting, pagination | Rute target; belum ada Route Handler. Dashboard saat ini membaca Supabase langsung dari client dan belum memakai API contract. |
| `GET /api/dashboard/scans/export` | Seluruh scan yang sesuai filter untuk CSV | Rute target; format unduhan, batas ukuran, dan pemrosesan sinkron/asinkron perlu disepakati. |

### Bentuk record response sementara

Berikut contoh **usulan mapping**, bukan JSON final:

```json
{
  "id": "uuid",
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
```

Response perlu memutuskan juga penanganan `analysis_status`, field nullable, signed URL, pagination (`data` dan `meta` atau bentuk lain), error, dan apakah detail scan menggunakan route terpisah. Jangan menganggap contoh ini kontrak final.

## 10. Keamanan

- Publishable/anon key hanya digunakan dalam pola yang memang dilindungi RLS; nama `NEXT_PUBLIC_*` berarti nilainya dapat diakses client dan tidak boleh berisi secret.
- Supabase service-role/secret key hanya berada di server tepercaya, tidak pada komponen browser atau environment publik.
- DeepSeek API key hanya berada di server.
- Jangan mempercayai role yang dikirim browser. Backend memverifikasi identitas dan otorisasi pada request.
- RLS tidak dinonaktifkan untuk memudahkan integrasi. Policy perlu dirancang bersama auth/backend dan diuji untuk anon, user, serta admin.
- Dashboard membaca melalui API backend. Tidak ada Supabase credential yang diperlukan di dashboard client untuk membaca tabel produksi.
- Tabel `profiles`, definisi role admin, claims, sumber identitas, session/token, serta mapping admin belum tersedia/ditetapkan.
- Akses gambar privat mengikuti otorisasi yang sama; signed URL berumur terbatas tidak disimpan sebagai path permanen.

## 11. Pekerjaan dan keputusan terbuka

### Keputusan tim yang dibutuhkan

- Perilaku batas Server/Client pada route landing dan penggunaan folder root `pages/`; verifikasi build setelah dependencies tersedia.
- Kontrak API untuk menggantikan query Supabase langsung dari browser.
- Apakah data scan dibuat saat request dimulai (status pending) atau hanya setelah analisis selesai; definisi dan nilai final `analysis_status`.
- Nullability final untuk material, kategori, confidence, instruksi, catatan lokal, serta hasil gagal/tidak pasti.
- Tipe dan presisi confidence serta perilaku UI ketika confidence/kategori null.
- FK `user_id`, aturan penghapusan/anonymisasi user, dan model autentikasi/admin.
- Persyaratan dan sumber master wilayah; keputusan perlu/tidaknya tabel `regions`.
- Retensi GPS/gambar, kebijakan koordinat di luar Bali, dan sumber reverse geocoding.
- Pagination model, sorting, parameter filter, batas tanggal, response envelope/error, dan strategi CSV server.
- Indeks final berdasarkan query plan dan volume yang diharapkan.
- Storage upload flow, format path, file type/size, retensi, dan Storage policies.
- RLS policy, siapa yang menjalankan migration, proses review, dan environment target.

### Tugas anggota frontend

- Tinjau batas client/server untuk LandingPage dan konflik potensial folder root `pages/` dengan App Router.
- Sepakati bentuk data UI dan perilaku untuk scan pending/gagal/tidak pasti serta field nullable.
- Ganti direct Supabase client access yang digunakan dashboard dengan backend API setelah endpoint dan auth tersedia.
- Menyelaraskan filter, pagination, agregasi, detail gambar, dan export dengan kontrak yang disetujui tanpa mengubah nama kolom UI untuk mengikuti database.
- Menyediakan alur GPS memakai Browser Geolocation API, termasuk izin ditolak dan nilai akurasi/waktu capture, bila termasuk lingkup frontend.

### Tugas anggota backend & AI

- Implementasikan Next.js Route Handlers untuk endpoint yang disepakati; tidak membuat Express service.
- Simpan DeepSeek key di server dan integrasikan Vision API serta validasi hasil/status analisis.
- Validasi GPS dari browser, koordinat rentang, reverse geocoding, lokasi di luar Bali, serta kemungkinan lokasi null.
- Map hasil DB ke field dashboard dan buat akses aman untuk gambar bucket privat.
- Terapkan autentikasi/otorisasi endpoint, statistik agregat penuh, filter/pagination, serta export terfilter penuh.
- Sepakati request/response/error dan koordinasikan query/index/RLS dengan database developer.

## 12. Langkah implementasi database berikutnya

1. Setelah dependency dipasang sesuai lockfile, verifikasi lint/build dan routing Next.js; audit batas client/server sebelum integrasi data.
2. Tinjau data dictionary dan nullability/status scan bersama backend & AI, khususnya kategori nullable dan hasil tidak pasti.
3. Tetapkan Auth, FK `user_id`, perilaku retensi/penghapusan, serta kebutuhan `profiles`.
4. Tetapkan sumber wilayah dan kebutuhan normalisasi sebelum memutuskan `regions`.
5. Tinjau query endpoint dan workload untuk memilih indexes, pagination, dan filter.
6. Tulis migration SQL berurutan sebagai draft lokal, tinjau rollback/risiko data, lalu validasi pada lingkungan non-produksi setelah ada otorisasi terpisah.
7. Siapkan rancangan bucket privat serta Storage/RLS policies setelah pola identitas dan upload/download disepakati.
8. Uji insert/read, constraint/null GPS, timestamp, kategori/confidence, Storage, statistik, pagination, export, dan akses role pada environment non-produksi.
9. Jalankan migration remote hanya setelah review dan persetujuan eksplisit; verifikasi hasilnya sebelum menyebut database/integrasi selesai.

## 13. Referensi repository

- Draft skema terdahulu: [database-draft.sql](./database-draft.sql) — dipertahankan sebagai referensi historis, jangan dianggap skema terbaru.
- Draft skema yang dievaluasi pada tahap persiapan ini: [waste-scans-schema-draft.sql](./waste-scans-schema-draft.sql) — untuk review saja, bukan migration dan tidak dijalankan.
- Register rekomendasi dan keputusan terbuka database V1: [DATABASE-DECISION-REGISTER.md](./DATABASE-DECISION-REGISTER.md) — usulan belum menjadi keputusan final.
- Draft pertukaran data API: [API-DATA-CONTRACT-DRAFT.md](./API-DATA-CONTRACT-DRAFT.md) — contoh endpoint/JSON/parameter masih menunggu persetujuan backend dan frontend.
- Checklist handover dan audit konsistensi: [DATABASE-HANDOVER-CHECKLIST.md](./DATABASE-HANDOVER-CHECKLIST.md) — merangkum drift dokumen dan dependensi lintas peran.
- Rencana pengujian integrasi database: [DATABASE-INTEGRATION-TEST-PLAN.md](./DATABASE-INTEGRATION-TEST-PLAN.md) — skenario untuk masa mendatang; bukan hasil test.
- Definisi field, nullability, validasi, sumber data, dan mapping UI: [DATA-DICTIONARY.md](./DATA-DICTIONARY.md).
- Rancangan bucket, akses Storage, key, dan security: [STORAGE-AND-SECURITY-DRAFT.md](./STORAGE-AND-SECURITY-DRAFT.md) — belum berisi policy akses final.
- Draft kebutuhan dashboard: [dashboard-integration-draft.md](./dashboard-integration-draft.md).
- Checklist integrasi: [final-integration-checklist.md](./final-integration-checklist.md).
- Repository dashboard: `src/dashboard/services/dashboardRepository.js`.
- Mock simulasi: `src/data/mockScans.js`.
