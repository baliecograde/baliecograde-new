# BaliEcoGrade — Database & Data Integration Handover Checklist

> **Status:** checklist handover dengan addendum audit repository Next.js pada 2026-11-04. Bukan persetujuan schema/API, hasil test, migration, atau bukti integrasi. Draft SQL tetap tidak diubah.

## 1. Ringkasan audit

Sepuluh dokumen yang diminta telah diperiksa: `MASTER-CONTEXT.md`, `DATA-DICTIONARY.md`, `waste-scans-schema-draft.sql`, `STORAGE-AND-SECURITY-DRAFT.md`, `DATABASE-DECISION-REGISTER.md`, `DATABASE-INTEGRATION-TEST-PLAN.md`, `API-DATA-CONTRACT-DRAFT.md`, `dashboard-integration-draft.md`, `final-integration-checklist.md`, dan `database-draft.sql`.

Rancangan dasarnya menetapkan Next.js App Router + Supabase, `waste_scans`, empat kategori, confidence 0–1, `TIMESTAMPTZ` dengan laporan `Asia/Makassar`, GPS opsional, Storage privat, dan dashboard melalui backend. Addendum terbaru mencatat workspace sudah berisi aplikasi Next.js, tetapi dependency belum terpasang, Git metadata tidak tersedia, dan kode aktual belum terintegrasi sesuai rancangan.

### Addendum audit repository aktif (2026-11-04)

- `package.json` dan `package-lock.json` mencatat Next.js 16.4.5; `node_modules` dan `.git` tidak tersedia. Branch, lint, dan build belum diverifikasi.
- App Router tersedia (`app/page.tsx`, `app/admin-dashboard/page.tsx`) bersama folder root `pages/` berisi modul named-export; routing/batas client-server perlu verifikasi build setelah dependency tersedia.
- Tidak ditemukan Route Handlers, auth/ADMIN, migration, RLS, Storage bucket/policies, atau integrasi DeepSeek.
- `lib/wasteScans.ts` melakukan insert/select langsung melalui browser Supabase client memakai `regency, village, category, confidence, thumbnail`; schema target memakai `regency, district, trash_category, confidence_score, image_path` serta field analisis/GPS lainnya.
- `lib/classifier.ts` menghasilkan kategori/confidence acak, tidak memakai gambar, hanya tiga kategori lowercase, dan confidence sekitar 82–98. Itu bukan output AI produksi atau skala database 0–1; jangan mengonversinya hanya dengan membagi 100.
- `hooks/useUserArea.ts` mengambil GPS saat page load, memetakan ke daftar area statis, dan memakai `DEFAULT_AREA` jika gagal/ditolak/di luar Bali. Koordinat, akurasi, dan waktu capture tidak tersimpan.
- Gambar menjadi thumbnail Data URL dan field `thumbnail`, bukan file di private Storage dengan `image_path`.
- Dashboard membatasi query pada 5.000 row dan menghitung statistik/filter/pagination di client; tidak ditemukan search, export, atau agregasi API.

Label status pada addendum: **CONFIRMED** hanya keputusan spesifik dengan bukti tertulis; **PROPOSED** rekomendasi; **PENDING** keputusan/informasi yang belum tersedia; **BLOCKED** pekerjaan yang menunggu dependensi. Persetujuan umum rancangan tidak mengonfirmasi detail.

| Keputusan/pekerjaan | Status | Pemilik | Dasar |
|---|---|---|---|
| Next.js App Router host; target empat kategori, confidence 0–1, `TIMESTAMPTZ`/`Asia/Makassar`, private Storage, dashboard-via-API | CONFIRMED | Keputusan bersama | Baseline spesifik tercatat pada Master Context dan rancangan data. |
| Instalasi dependency dan verifikasi lint/build/routing | BLOCKED | Frontend | `package-lock.json` tersedia tetapi `node_modules` belum ada. Git branch tidak diketahui; kondisi Git tidak menghalangi audit file. |
| Canonical kategori dan pemetaan UI, confidence AI, semantik status | PENDING | Frontend + Backend & AI + Database | Kode aktual tidak sesuai target; semantik simulasi dan status belum disetujui. |
| Snapshot GPS, NULL handling, reverse geocoding dan nama wilayah | PENDING | Frontend + Backend & AI + Database | `DEFAULT_AREA`/nearest lookup bukan GPS snapshot atau reverse geocoding yang terverifikasi. |
| Route Handlers, auth ADMIN, RLS/grants, Storage upload/access | BLOCKED | Backend & AI + Frontend + Database | Route/API, auth, dan alur upload belum tersedia; kebijakan bergantung pada identitas/ownership. |
| Schema/migration final dan indeks | BLOCKED | Database | Menunggu contract field/status/GPS, auth lifecycle, versi PostgreSQL, dan workload query. |
| Dashboard filter, statistik, pagination dan export contract | PENDING | Frontend + Backend & AI | Dashboard memakai limit 5.000 dan perhitungan client; definisi API perlu persetujuan. |

`DATABASE-DECISION-REGISTER.md` adalah register utama untuk keputusan teknis terbuka; tabel ini merangkum dampak handover dari audit kode.

## 2. Temuan drift dan rekomendasi penyelarasan

Temuan berikut dicatat sebagai konflik versi atau keputusan terbuka, bukan alasan untuk mengubah keputusan secara sepihak.

| ID | Konflik / perbedaan | Sumber yang terdampak | Rekomendasi penyelarasan | Status |
|---|---|---|---|---|
| C-01 | Draft SQL lama memakai `material_name`, `category`, `sorting_instruction`, `local_context_note`, `scanned_at`, `image_url`; schema V1 memakai `material_detected`, `trash_category`, `action_instruction`, `balinese_context_note`, `created_at`, `image_path`, serta field baru. | `database-draft.sql` vs `waste-scans-schema-draft.sql`, master, dictionary | Pertahankan draft lama sebagai historis; gunakan schema V1 hanya setelah review. Tandai jelas di index/docs bahwa dua file bukan migration berurutan dan jangan jalankan keduanya. | Drift historis yang diketahui; tidak perlu menghapus file. |
| C-02 | Dokumen dashboard/checklist awal memuat konteks Vite, Express, `VITE_API_BASE_URL`, dan UI preview; workspace aktif sekarang adalah Next.js App Router. | `dashboard-integration-draft.md`, `final-integration-checklist.md` vs kode aktif | Pertahankan bagian tersebut sebagai snapshot historis; jangan anggap Express/adapter Vite sebagai target. | Drift historis; host Next.js tersedia, tetapi build/runtime belum diverifikasi. |
| C-03 | Checklist awal menyatakan timezone report masih belum disepakati, sedangkan baseline tim kemudian menetapkan `Asia/Makassar`. | `final-integration-checklist.md` vs master/dokumen terbaru | Perlakukan catatan lama sebagai snapshot sebelum keputusan timezone; pada kontrak final gunakan Asia/Makassar, sambil tetap menyepakati batas tanggal dan bucket. | Drift historis + semantik boundary masih terbuka. |
| C-04 | Vocab contoh `analysis_status` tidak konsisten: master/dictionary mencantumkan `needs_review`; decision register/API/test plan memakai `uncertain`. | `MASTER-CONTEXT.md`, `DATA-DICTIONARY.md`, decision register, API contract, test plan | Backend & AI memilih apakah `needs_review` merupakan status terpisah, sinonim, atau dikeluarkan. Kandidat yang direkomendasikan untuk dibahas: `pending`, `completed`, `uncertain`, `failed`; jangan menambah CHECK sebelum disetujui. | Konflik istilah aktif; menunggu backend & AI. |
| C-05 | SQL hanya mewajibkan koordinat sebagai pasangan; metadata accuracy/capture time dapat tidak konsisten. Decision register merekomendasikan semua-null saat tanpa GPS, capture time wajib saat GPS ada, dan accuracy wajib untuk sumber Browser Geolocation API. | schema SQL vs decision register, dictionary, test plan, API contract | Setelah frontend/backend menyetujui aturan GPS, revisi schema/dictionary/test cases bersama. Jangan menganggap rekomendasi register telah diterapkan. | Perbedaan draft vs rekomendasi; belum diputuskan. |
| C-06 | SQL/dictionary masih memakai `NUMERIC` tanpa precision untuk confidence; decision register mengusulkan `NUMERIC(6,5)`. | schema SQL, dictionary vs decision register, API contract | Putuskan precision/rounding, validasi nilai sebelum pembulatan, lalu revisi schema, dictionary, API serialization, dan tests dalam satu perubahan. | Usulan precision belum disetujui. |
| C-07 | Pengecekan `location_accuracy_m < 'Infinity'::numeric` memiliki dependensi versi PostgreSQL; target versi belum diverifikasi. | schema SQL, decision register, test plan | Konfirmasi versi PostgreSQL target dan pilih type/constraint finite yang kompatibel; validasi juga NaN/non-finite di backend. Jangan menganggap draft lolos parser. | Menunggu versi target dan validasi PostgreSQL lokal. |
| C-08 | Nama filter query berbeda: draft awal memakai `from`, `to`, `q`; API draft terbaru memakai `start_date`, `end_date`, `search`. | dashboard-integration-draft vs API-DATA-CONTRACT-DRAFT | Pilih satu nama canonical bersama frontend/backend sebelum adapter/filter API dibuat. Peta kompatibilitas lama hanya jika memang diperlukan. | Usulan kontrak belum disetujui. |
| C-09 | Pagination response lama tidak memuat `total_pages`; API draft terbaru memuat `total`, `page`, `page_size`, `total_pages`. Kode Next.js sekarang mengambil maksimal 5.000 row langsung dari Supabase dan melakukan pagination client-side. | `dashboard-integration-draft.md`, `final-integration-checklist.md`, API contract, `lib/wasteScans.ts` | Sepakati envelope dan empty-page semantics; implementasikan pagination server setelah kontrak final. Server `total` dihitung sesudah filter dan sebelum page slice. | Belum ada API pagination. |
| C-10 | Export API draft menyajikan dua alternatif: CSV stream langsung atau JSON/job + URL unduhan. | API-DATA-CONTRACT-DRAFT, dashboard docs | Backend/frontend memilih satu pola berdasarkan volume; keduanya tidak boleh dianggap kontrak bersamaan. Filter export harus identik dengan daftar dan meliputi semua hasil, bukan halaman aktif. | Belum diputuskan. |
| C-11 | Scope total dan agregasi (semua status vs hanya hasil final; kategori null; filter apa yang memengaruhi summary/activity/regions) belum seragam/ditetapkan. | API contract, decision register, test plan, dashboard drafts | Sepakati predicate status dan filter bersama; tulis contoh fixture expected result lalu selaraskan endpoint dan test case. | Keputusan produk/backend belum tersedia. |
| C-12 | `analysis_status` ada di storage/response usulan analyze, tetapi tidak ada dalam record UI baseline; scan list/detail belum memastikan apakah mengirimnya. | dictionary, decision register, API contract, dashboard | Tentukan apakah status tampil pada dashboard. Bila iya, perluas response/UI contract dan test nullable/status; jangan menambah field database (sudah ada di baseline) baru tanpa kebutuhan. | Menunggu frontend + backend & AI. |

### Bagian yang konsisten saat ini

- Nama 16 field pada schema draft dan dictionary saling cocok; mapping UI memakai `material`, `category`, `confidence`, `instruction`, `local_context`, `regency`, `district`, `scanned_at`, dan `image_url`.
- Empat kategori konsisten; `uncertain` adalah kandidat status, bukan kategori kelima. Kategori null diperbolehkan pada draft SQL.
- Timestamp laporan `Asia/Makassar`, gambar Storage private, larangan signed URL permanen, dan prinsip dashboard-via-backend konsisten pada dokumen terbaru.
- Test plan membedakan mandiri/Next.js/Supabase/keputusan tim dan tidak menyatakan test telah dijalankan.

## 3. Persiapan yang sudah selesai

- Audit terdahulu pada dashboard Vite adalah snapshot repository terpisah/historis. Workspace aktif sekarang adalah aplikasi Next.js; temuan terbaru ada pada addendum bagian 1.
- Ada schema SQL draft V1 terpisah dari SQL historis; draft V1 berisi 16 field dan kandidat check constraints serta index yang masih dikomentari.
- Data dictionary menjelaskan field, sumber, nullability rekomendasi, dan mapping database ke dashboard.
- Draft Storage/security menjelaskan bucket privat `waste-images`, object path `image_path`, akses gambar terotorisasi, key boundary, dan policy yang menunggu Auth.
- Decision register mengumpulkan rekomendasi/keputusan terbuka termasuk GPS, status AI, confidence, compatibility PostgreSQL, indeks, Auth/RLS.
- Integration test plan menyediakan 53 skenario dengan fixture sintetis; semua masih berstatus rencana.
- API contract draft memberi contoh route, JSON, filter/pagination, statistik, export, error, dan akses gambar. Seluruhnya masih usulan.
- Dokumen lama dipertahankan dan perbedaannya diidentifikasi di tabel C-01 s.d. C-03.

## 4. Pekerjaan yang menunggu validasi dan integrasi Next.js

- Pasang dependencies dari lockfile setelah diizinkan; verifikasi lint/build, folder root `pages/`, dan batas Client Components.
- Tinjau `/admin-dashboard` sebagai route aplikasi utama; autentikasi/otorisasi admin belum tersedia.
- Setelah kontrak final, ganti direct Supabase access dengan API Route Handlers; jangan menambah akses tabel produksi dari browser.
- Cocokkan perilaku dashboard untuk null, status uncertain/failed, lokasi null, signed URL expired, pagination server, dan error API.
- Uji halaman desktop/mobile, filter, detail, loading/error/empty state, dan download CSV pada aplikasi utama.
- Putuskan apakah UI perlu menampilkan `analysis_status`, serta apakah detail scan memerlukan request image URL terpisah.

## 5. Pekerjaan yang menunggu Backend & AI

- Tetapkan request/response/error dan implementasikan enam endpoint melalui Next.js Route Handlers; tidak ada endpoint yang diasumsikan tersedia.
- Sepakati transport gambar analyze, synchronous/asynchronous processing, pending row, state machine status, threshold uncertain, retry/idempotency, dan hasil partial/failure.
- Validasi GPS, reverse geocoding, lokasi di luar Bali, nama wilayah kanonis, dan aturan ketika izin lokasi ditolak.
- Map kolom database ke bentuk dashboard; jangan mengirim `image_path` sebagai URL publik.
- Implementasikan authz ADMIN, aggregate queries seluruh dataset/filter, pagination stabil, export penuh, dan error redaction.
- Putuskan filter canonical (`search` vs `q`, `start_date/end_date` vs `from/to`), page vs cursor, total_pages/empty semantics, sort allowlist, filter scope statistik, serta stream vs async export.
- Tentukan alur Storage upload/download dan masa hidup signed URL bersama database/security owner.

## 6. Pekerjaan yang menunggu keputusan tim

- [ ] Pilih vocab/transisi `analysis_status`, termasuk hubungan `uncertain` dengan contoh lama `needs_review`.
- [ ] Tentukan nullability tiap hasil untuk pending/completed/uncertain/failed dan apakah row dibuat sebelum AI selesai.
- [ ] Setujui GPS metadata rule: no-GPS all-null; capture time saat koordinat ada; accuracy wajib atau pengecualian berdasarkan sumber.
- [ ] Konfirmasi versi PostgreSQL target dan cara menghapus/mengganti ketergantungan `NUMERIC Infinity`.
- [ ] Pilih precision confidence, rounding, dan threshold uncertain; database menyimpan skala 0–1.
- [ ] Putuskan Auth provider, role ADMIN, FK `user_id`/ON DELETE, anon ownership, RLS, grants, dan schema/Data API exposure.
- [ ] Putuskan apakah tabel `profiles` atau `regions` dibutuhkan; jangan membuat keduanya sebelum kebutuhan terbukti.
- [ ] Tetapkan Storage limit/format (10 MiB JPEG/PNG/WebP masih usulan), upload path, retention, delete/cleanup, dan signed URL lifetime.
- [ ] Tentukan apakah statistik menghitung semua status atau hanya subset; apakah filter tabel diterapkan ke summary/activity/regions.
- [ ] Sepakati definisi tanggal inklusif/eksklusif, bucket grafik, filter canonical, pagination, error status, export mode/limit.
- [ ] Konfirmasi pemilik schema/migration dan proses persetujuan sebelum perubahan remote.

## 7. Matriks dependensi Database, Frontend, Backend & AI

| Pekerjaan | Database & Data Integration | Frontend | Backend & AI | Gate/dependensi |
|---|---|---|---|---|
| Konfirmasi host aplikasi | Menyediakan schema/data dictionary | Memvalidasi route/dashboard Next.js yang sudah ada | Menambahkan Route Handlers pada App Router | Dependencies/build serta ownership rute diverifikasi |
| Field/status contract | Menilai field/nullability/check | Menetapkan kebutuhan tampilan/null states | Menetapkan state machine, mapping dan payload | Persetujuan bersama atas status dan JSON |
| GPS | Menyediakan candidate constraints | Browser Geolocation + permission behavior | Validasi, reverse geocoding, luar Bali | GPS rules/provider disepakati |
| Schema & indexes | Menulis/review schema setelah keputusan; uji query plan | Menjelaskan filter/sort UI | Menyediakan endpoint query/workload | API query dan versi PostgreSQL tersedia |
| Auth/RLS/grants | Menyusun DDL/policies dan allow/deny tests | Melindungi route/UI dan mengelola session | Verifikasi identitas/ADMIN; server-only DB secret | Auth provider/role/pola akses disetujui |
| Storage | Bucket/private policies/path/retention draft | Upload UX dan render gambar aman | Upload, ownership, signed URL/stream | Upload flow dan policy disepakati |
| Statistik | Review indexes/query aggregates | Menentukan kartu/grafik dan filter yang mengikat | Menghitung agregat seluruh hasil server-side | Definisi total/status/filter disepakati |
| Pagination/filter | Index berdasarkan workload | Kirim query dan navigasi page/cursor | Validasi query dan hasil stabil + total | Parameter dan model pagination final |
| Export | Review dampak query/volume | Download UX/filename/status | Stream/job; semua hasil filter; CSV aman | Export mode/limit disepakati |
| Testing/release | Constraint, RLS, storage, data quality | UI/routing/responsive/CSV | Handler, AI failure/retry, authz | Non-production environment dan fixtures |

## 8. Langkah implementasi Supabase

Langkah ini baru dilakukan setelah project/akses disetujui; checklist bukan instruksi untuk menjalankan sekarang.

1. Konfirmasi project/environment pemilik tim, versi PostgreSQL, schema exposure, Data API setting, dan cara koneksi server.
2. Kunci keputusan schema yang diperlukan: status/nullability, GPS metadata, confidence precision, FK user, timestamp, indeks.
3. Review `waste-scans-schema-draft.sql`; siapkan migration berurutan baru hanya setelah keputusan dicatat. Jangan jalankan `database-draft.sql` lama bersama schema baru.
4. Terapkan pertama kali ke database lokal/non-produksi terisolasi, verifikasi schema/constraints/indexes dan rollback.
5. Setelah Auth model ditetapkan, rancang grants + RLS untuk tabel dan Storage berdasarkan identitas/role. Service-role/secret tetap server-side dan backend melakukan authz eksplisit.
6. Buat bucket `waste-images` private, file constraints, object naming, Storage policies, retensi dan orphan cleanup setelah upload flow disetujui.
7. Jalankan DB/Storage allow-deny tests dan review keamanan di non-production. Catat hasil dan versi schema.
8. Migration remote hanya setelah review, backup/rollback plan, dan persetujuan eksplisit; verifikasi hasil pasca-deploy.

## 9. Langkah migration dan validasi

- Pastikan migration hanya mencerminkan keputusan approved; file draft bukan migration.
- Review destructive operations, data backfill, FK deletion behavior, default/constraints, dan rollback. Draf saat ini create-table oriented dan belum strategi upgrade data.
- Jalankan parser/test migration pada PostgreSQL versi target. Audit sebelumnya tidak memiliki `psql`/PostgreSQL/Docker, sehingga tidak ada validasi lokal yang dapat diklaim.
- Uji insert/update/read sintetis: UUID, semua kategori, null kategori uncertain, confidence boundaries/non-finite, GPS all-null/pair/ranges/metadata, timestamp, dan nullability per status.
- Verifikasi RLS/grants per anon/USER/ADMIN serta Storage private read/write/delete; uji direct API, bukan hanya UI.
- Jalankan `EXPLAIN` atas query list/filter/agregasi sebelum memilih seluruh kandidat index; cek duplicate/unused indexes setelah workload.
- Jangan menyebut schema terintegrasi sebelum migration dan test sukses pada lingkungan yang sesuai.

## 10. Langkah integrasi dashboard

1. Validasi dependency, lint/build, routing App Router, dan batas client/server pada aplikasi Next.js aktif.
2. Backend dan frontend menyetujui kontrak API dari `API-DATA-CONTRACT-DRAFT.md`; samakan nama query, envelope, nulls, status, errors, timestamps, pagination.
3. Backend map DB fields ke UI fields dan membuat URL gambar aman hanya setelah authz.
4. Dashboard aplikasi Next.js mengganti akses tabel Supabase langsung dari browser dengan API; jangan mengakses tabel produksi dari client.
5. Pastikan summary/activity/regions memakai query/filter scope konsisten, menghitung seluruh data dan bucket `Asia/Makassar`.
6. Pastikan list filters + pagination server konsisten; CSV export memuat keseluruhan hasil filter, bukan hanya halaman aktif.
7. Uji detail scan dengan image/null/expired URL dan error response; jangan menampilkan path Storage internal.

## 11. Langkah pengujian akhir

- Jalankan test plan `DATABASE-INTEGRATION-TEST-PLAN.md` dengan fixture sintetis dan tandai setiap hasil (pass/fail/blocked) beserta environment/version.
- Test semua status scan, nullability, retry/failure, upload failure, dan persist failure sesuai flow yang telah disetujui.
- Uji total/kategori/activity/regions pada fixture multi-page; pastikan seluruh hasil filter dihitung dan timezone boundary dekat tengah malam benar.
- Uji pencarian, kategori, wilayah, tanggal, sorting, pagination, detail, dan export gabungan filter; validasi CSV escaping/formula injection.
- Uji upload JPEG/PNG/WebP serta batas yang telah disetujui, signed URL valid/expired, object hilang, dan akses tanpa izin.
- Uji auth matrix tanpa login, USER, ADMIN, akses langsung endpoint, spoof role, key salah, RLS/grants dan Storage policies.
- Jalankan smoke test desktop/mobile pada app Next.js utama serta build/deploy preview setelah perubahan integrasi.
- Catat test yang belum dapat dilakukan; jangan klaim sukses untuk test yang tidak dijalankan.

## 12. Status handover

- **Dokumentasi persiapan:** tersedia untuk ditinjau; 10 sumber di atas diaudit.
- **Konflik/drift:** 12 item (C-01 sampai C-12), mencakup 3 dokumen historis, perbedaan kandidat status, GPS/precision, compatibility PostgreSQL, naming filter, pagination, export, statistik, dan status di response.
- **Integrasi Supabase/Route Handlers:** belum dimulai pada repository Next.js aktif. Kode saat ini memakai direct browser database queries dan belum sesuai target.
- **Gate utama:** verifikasi build/routing, persetujuan Backend & AI atas contract/state machine, persetujuan Auth/RLS/Storage, serta validasi PostgreSQL versi target.
- **Kesiapan paket:** siap sebagai handover dan agenda review; belum siap untuk production migration atau integrasi langsung.
