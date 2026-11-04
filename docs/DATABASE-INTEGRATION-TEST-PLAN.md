# BaliEcoGrade — Database Integration Test Plan

> **Status:** rencana pengujian untuk tahap integrasi mendatang. Tidak ada test pada dokumen ini yang diklaim sudah dijalankan. Gunakan fixture UUID/lokasi/waktu sintetis dan project lokal/non-produksi; jangan gunakan data pribadi atau credential produksi. Tidak ada SQL/migration yang dijalankan untuk menyusun test plan ini.

## Cara membaca status kesiapan

- **Mandiri:** dapat diuji tanpa Next.js/Supabase setelah fungsi atau test harness tersedia. Belum berarti test sudah dijalankan.
- **Menunggu Next.js:** memerlukan aplikasi utama, Route Handlers, atau alur frontend/backend terintegrasi.
- **Menunggu Supabase:** memerlukan PostgreSQL/Supabase lokal atau project non-produksi untuk memeriksa schema, grants, RLS, dan Storage.
- **Keputusan tim:** expected result belum bisa dibakukan sebelum keputusan produk/backend/auth/schema dibuat.

### Data sintetis yang disarankan

Gunakan UUID fixture seperti `00000000-0000-4000-8000-000000000001`, koordinat uji Bali `(-8.4095, 115.1889)`, lokasi null, scan di sekitar tengah malam `2026-11-03T15:59:59Z` dan `2026-11-03T16:00:01Z`, serta gambar sintetis JPEG/PNG/WebP. Jangan memakai foto atau lokasi pengguna sungguhan.

## A. Test case yang dapat diuji secara mandiri

Mandiri berarti tidak butuh layanan terhubung; fungsi test dan harness tetap harus disediakan. Belum ada test dalam tabel ini yang dijalankan.

| Test ID | Area | Skenario | Prasyarat | Langkah pengujian | Expected result | Status kesiapan | Dependensi atau keputusan yang dibutuhkan |
|---|---|---|---|---|---|---|---|
| IND-01 | Kontrak data | Record sintetis lengkap mengikuti mapping DB → dashboard | Fixture validator/mapping tersedia | Bentuk record dengan seluruh field dan map nama DB ke UI | Semua pasangan field terpetakan; confidence tetap 0–1; tidak ada URL gambar permanen dari `image_path` | Siap mandiri setelah test harness tersedia | Implementasi mapper backend belum ada; gunakan pure fixture contract test sementara. |
| IND-02 | Confidence | Boundary 0 dan 1 serta nilai di dalam rentang | Validator nilai tersedia | Uji `0`, `1`, dan `0.73456`; serialisasikan ke JSON | Nilai tetap numeric 0–1; bukan persen; tidak berubah menjadi string | Siap mandiri setelah test harness tersedia | Precision/rounding final perlu persetujuan; test range DB terpisah di Supabase. |
| IND-03 | Confidence | Nilai di bawah/atas rentang dan nilai non-finite | Validator nilai tersedia | Uji `-0.001`, `1.001`, NaN, +Infinity, -Infinity | Ditolak sebelum menjadi hasil dashboard/record | Siap mandiri setelah test harness tersedia | Backend tetap perlu validasi; implementasi belum ada. |
| IND-04 | Timestamp | Konversi instant ke tanggal laporan Bali | Fungsi tanggal/reporting tersedia | Konversi fixture UTC sebelum/sesudah tengah malam Bali | Bucket tanggal mengikuti `Asia/Makassar`, bukan timezone mesin lokal | Siap mandiri setelah test harness tersedia | Fungsi/reporting API belum ada; sepakati bucket/filter boundary. |
| IND-05 | Filter/export | Filter gabungan dan seluruh hasil | Filter fixture tersedia | Terapkan query, kategori, regency, `from/to` ke dataset sintetis yang lebih besar dari satu halaman; bentuk CSV | Set hasil filter deterministik; export berisi seluruh hasil, bukan satu halaman | Siap mandiri untuk logika fixture | Semantik filter final perlu cocok dengan backend; export production menunggu Next.js. |
| IND-06 | CSV | Escape, nilai kosong, formula injection | CSV formatter tersedia | Uji koma, quote, newline, null, dan string berawalan `=`, `+`, `-`, `@` | CSV tetap valid; sel formula dinetralkan; null menjadi kosong | Siap mandiri setelah test harness tersedia | Pertahankan perilaku keamanan formatter; implementasi server export terpisah. |

## B. Test case yang menunggu aplikasi utama Next.js

Semua request harus memakai API lokal/non-produksi dan record sintetis. Test endpoint tidak boleh diarahkan ke production.

| Test ID | Area | Skenario | Prasyarat | Langkah pengujian | Expected result | Status kesiapan | Dependensi atau keputusan yang dibutuhkan |
|---|---|---|---|---|---|---|---|
| APP-01 | Scan | Scan berhasil | Route Handler analyze dan storage/database lokal tersedia | Kirim gambar sintetis serta GPS valid; ambil scan ID; baca kembali melalui API | Hasil dan status sukses sesuai kontrak; mapping Dashboard cocok; tidak ada secret pada response | Menunggu Next.js | Request/response, kapan row dibuat, dan status sukses disepakati. |
| APP-02 | Scan/GPS | Pengguna menolak izin lokasi | Alur geolocation frontend dan handler tersedia | Kirim scan tanpa GPS | Scan mengikuti kebijakan produk; field GPS dan wilayah null; tidak ada lokasi manual yang disisipkan | Menunggu Next.js + keputusan tim | Apakah analisis tetap berjalan tanpa GPS. |
| APP-03 | Scan/GPS | Scan dengan koordinat GPS | Frontend mengirim koordinat, accuracy, captured_at; handler geocoding tersedia | Kirim koordinat dalam rentang dan baca data tersimpan | Koordinat tervalidasi; metadata konsisten; regency/district hasil backend atau null jika gagal | Menunggu Next.js | Aturan GPS metadata dan reverse geocoder. |
| APP-04 | Scan/AI | Hasil klasifikasi uncertain | Backend/AI menyediakan fixture response uncertain | Kirim scan dengan hasil confidence rendah/abstain | Status uncertain; kategori null bila tidak ada klasifikasi terpercaya; bukan failed | Menunggu Next.js | Threshold, status final, dan bentuk response disetujui backend & AI. |
| APP-05 | Scan/AI | Analisis gagal | Backend dapat mensimulasikan timeout/error AI | Paksa kegagalan provider tanpa memakai API key sungguhan | Tidak ada partial result yang disajikan completed; status/persistensi mengikuti lifecycle yang disepakati | Menunggu Next.js | Apakah row failed disimpan, error handling/logging. |
| APP-06 | Scan/AI | Analisis membutuhkan retry | Mekanisme retry/idempotency tersedia | Simulasikan kegagalan pertama dan retry dengan request ID/fixture yang sama | Tidak ada scan duplikat atau transisi status salah sesuai strategi final | Menunggu Next.js + keputusan tim | Retry same-row/new-row, batas attempt, idempotency belum diputuskan. |
| APP-07 | Storage | Gambar gagal diunggah | Upload flow dapat disimulasikan | Paksa Storage upload gagal sebelum/selama analyze | Tidak ada `image_path` palsu; scan gagal/ditahan/lanjut sesuai keputusan alur; orphan object ditangani | Menunggu Next.js + Supabase | Upload order dan transaksi/kompensasi belum disepakati. |
| APP-08 | Database | Penyimpanan hasil AI gagal | Handler dapat menyimulasikan DB error non-produksi | Analisis menghasilkan fixture, lalu gagalkan insert/update DB | API tidak melaporkan persistensi sukses; status/gambar mengikuti strategi kompensasi yang disepakati | Menunggu Next.js + Supabase | Atomicity, row pending, penghapusan gambar/orphan cleanup perlu desain backend. |
| APP-09 | Dashboard | Total scan | Endpoint summary dan filter tersedia | Bandingkan total API dengan seluruh record fixture yang memenuhi filter, dataset multi-page | Total mencakup seluruh hasil filter, bukan page aktif saja | Menunggu Next.js | Definisi total: semua status atau hanya status tertentu. |
| APP-10 | Dashboard | Statistik empat kategori | Endpoint summary tersedia | Masukkan fixture empat kategori, null category, pending, uncertain, failed | Count setiap kategori benar; kategori null tidak dipaksa ke kategori; aturan total/status konsisten | Menunggu Next.js + keputusan tim | Status mana yang masuk total/statistik. |
| APP-11 | Dashboard | Aktivitas dekat pergantian tanggal | Endpoint activity menerima timezone/bucket | Masukkan scan `2026-11-03T15:59:59Z` dan `2026-11-03T16:00:01Z` | Bucket `Asia/Makassar` terpisah ke tanggal lokal yang benar | Menunggu Next.js | Parameter zona dan definisi bucket perlu kontrak. |
| APP-12 | Dashboard | Statistik wilayah | Endpoint regions tersedia | Fixture regency/district berbeda dan null; bandingkan agregasi | Agregasi sesuai filter dan tidak mengarang region untuk null | Menunggu Next.js | Perlu keputusan drilldown, null bucket, dan source nama kanonis. |
| APP-13 | Dashboard | Daftar terbaru | Endpoint scans dengan sorting/pagination tersedia | Request halaman awal dan berikutnya pada fixture multi-page dengan timestamp tie | Urutan `created_at DESC` dan tie-breaker stabil; tidak ada item hilang/duplikat dalam snapshot | Menunggu Next.js | Offset vs cursor dan snapshot consistency. |
| APP-14 | Dashboard | Pencarian/filter gabungan | Endpoint menerima filter final | Gabungkan query, kategori, regency, tanggal; bandingkan hasil dengan fixture | Set hasil sesuai semantik client dan tidak bocor dari filter | Menunggu Next.js | Nama parameter, case sensitivity, batas tanggal; UI saat ini belum punya filter district tersendiri. |
| APP-15 | Dashboard | Detail scan | Detail/API record tersedia | Ambil ID fixture dan buka detail | Semua field sesuai record ID; null dan gambar unavailable ditangani; URL gambar aman bila ada | Menunggu Next.js | Detail route/envelope dan akses image. |
| APP-16 | Dashboard | Record dengan nullable fields | API mengembalikan completed/uncertain/failed fixture dengan nulls | Baca tabel, detail, statistik, CSV | Tidak ada crash; null tidak berubah menjadi kategori atau string palsu | Menunggu Next.js | Perlu status dalam UI response dan aturan null per status. |
| APP-17 | Dashboard | Pagination server | Pagination contract tersedia | Uji first/last page, empty page, perubahan filter, dan data lebih dari satu halaman | Page metadata/next cursor konsisten; perubahan filter reset posisi; tidak ada page-only statistic | Menunggu Next.js | Model pagination, ukuran maksimum, metadata. |
| APP-18 | Dashboard | Export seluruh data terfilter | Export API/repository tersedia | Terapkan filter yang sama seperti tabel lalu export data melebihi page size | CSV memuat semua record yang sesuai filter, bukan hanya halaman terlihat; kolom dan escaping benar | Menunggu Next.js | Endpoint/file response, batas export dan filter contract. |

## C. Test case yang menunggu PostgreSQL/Supabase

Jalankan hanya pada PostgreSQL lokal terisolasi atau project Supabase non-produksi dengan schema dan fixture sintetis. Jangan jalankan di production.

| Test ID | Area | Skenario | Prasyarat | Langkah pengujian | Expected result | Status kesiapan | Dependensi atau keputusan yang dibutuhkan |
|---|---|---|---|---|---|---|---|
| DB-01 | Struktur | UUID primary key | Schema V1 diterapkan di lokal/non-produksi | Insert tanpa id; baca id; coba duplicate id | UUID terbentuk; duplicate ditolak | Menunggu Supabase/PostgreSQL | Validasi versi target dan migration review. |
| DB-02 | Confidence | Batas 0–1 di database | Constraint final dan test DB tersedia | Insert 0, 1, nilai tengah; lalu -0.001, 1.001, NaN/infinity sesuai tipe | Nilai valid diterima; nilai di luar batas/non-finite ditolak | Menunggu Supabase/PostgreSQL + keputusan precision | Tipe/precision serta finite guard final. |
| DB-03 | Kategori | Empat kategori valid | CHECK final diterapkan | Insert satu row per kategori | Keempat nilai diterima tepat seperti ejaan uppercase | Menunggu Supabase/PostgreSQL | Constraint harus dipastikan dalam migration. |
| DB-04 | Kategori | Kategori null untuk hasil belum terklasifikasi | Null/status rules disetujui | Insert uncertain/pending sesuai kombinasi yang disepakati | Null diterima hanya pada status yang mengizinkan; tidak dipaksa ke kategori | Menunggu Supabase/PostgreSQL + keputusan tim | State/status cross-field constraints. |
| DB-05 | GPS | Rentang koordinat | CHECK final diterapkan | Uji latitude -90/90 dan longitude -180/180; uji sedikit di luar batas | Boundary diterima; out-of-range ditolak | Menunggu Supabase/PostgreSQL | Tidak ada keputusan tambahan selain constraint review. |
| DB-06 | GPS | Pasangan latitude/longitude | Pair constraint final | Uji kedua null, keduanya terisi, hanya latitude, hanya longitude | Dua kondisi lengkap diterima; pasangan parsial ditolak | Menunggu Supabase/PostgreSQL | Pair rule sudah direkomendasikan. |
| DB-07 | GPS | Accuracy/captured time consistency | Aturan GPS metadata disetujui dan constraint diterapkan | Uji no-GPS all-null; coords dengan captured time/accuracy; setiap kombinasi parsial | Hanya kombinasi yang diizinkan diterima; no-GPS tidak menyimpan metadata yatim | Menunggu Supabase/PostgreSQL + keputusan tim | Aturan accuracy null dan capture time. |
| DB-08 | Timestamp | `created_at` default dan instant | Table dibuat pada DB lokal/non-produksi | Insert tanpa created_at pada session timezone berbeda; baca epoch/offset | DB mengisi timestamp; instant sama, representasi dapat mengikuti session timezone | Menunggu Supabase/PostgreSQL | Versi dan timezone session test diketahui. |
| DB-09 | Nullability | Field hasil per status | Status lifecycle/constraint final | Insert pending, completed, uncertain, failed dengan kombinasi null sesuai matriks final | DB menerima kombinasi sah dan menolak kombinasi terlarang | Menunggu Supabase/PostgreSQL + keputusan Backend & AI | Status dan nullability belum final. |
| DB-10 | User | `user_id` valid/invalid | Auth dan FK final diterapkan | Insert user id existing, null, dan UUID yang tidak ada | Existing/null sesuai rule; invalid ditolak bila FK aktif | Menunggu Supabase + keputusan Auth/FK | FK belum dibuat dalam draft; jangan asumsikan `auth.users` tersedia di test DB. |
| DB-11 | Index | Urutan/filter/query plan | Query API final dan indexes diterapkan di dataset sintetis realistis | Jalankan `EXPLAIN (ANALYZE, BUFFERS)` untuk list, kategori, regency, district, user | Planner memakai indeks bila bermanfaat; latency/storage ditinjau, bukan diasumsikan | Menunggu Supabase/PostgreSQL + query backend | Workload/volume dan pilihan index. |
| DB-12 | Storage | Upload tipe gambar | Bucket/policy non-produksi siap | Upload JPEG/PNG/WebP sintetis; uji format lain dan file dengan MIME palsu | Format yang disetujui diterima; tipe palsu/terlarang ditolak server/storage flow | Menunggu Supabase + keputusan file policy | Format dan content-sniffing final. |
| DB-13 | Storage | Ukuran file | Limit final disetujui | Uji tepat batas, di bawah, dan di atas batas usulan 10 MiB | Boundary sesuai limit terpilih; di atas ditolak sebelum objek permanen | Menunggu Supabase + keputusan tim | 10 MiB hanya usulan, bukan kebijakan. |
| DB-14 | Storage/DB | `image_path` tersimpan | Upload sukses dan handler DB ada | Upload objek sintetis; baca row | Path objek disimpan, bukan Base64/signed URL; path menunjuk objek yang benar | Menunggu Supabase + Next.js | Upload order dan atomicity flow. |
| DB-15 | Storage | Signed URL dibuat dan expired | Bucket private; auth/access policy disepakati | Minta URL oleh aktor berhak; akses sebelum dan sesudah expiry | URL sementara valid sebelum expiry; expired URL ditolak; DB path tetap permanen | Menunggu Supabase + keputusan security | Lifetime dan actor permissions. |
| DB-16 | Storage | Objek hilang | Row fixture menunjuk path yang tidak ada | Request gambar melalui backend | Respons aman (mis. not found), tidak membuka bucket; UI fallback | Menunggu Supabase + Next.js | Format error dan cleanup konsistensi. |
| DB-17 | Security | Akses Storage tanpa izin | Bucket private dan policies/guard terpasang | Request objek tanpa sesi atau dengan user tanpa hak | Akses ditolak; tidak ada public listing/read | Menunggu Supabase + keputusan Auth/RLS | Policy berdasarkan auth belum ada. |
| DB-18 | Security | RLS/grants role matrix | Auth/RLS/grants disetujui pada non-production | Uji anon, USER, ADMIN untuk select/insert/update/delete yang relevan | Hanya kombinasi operasi yang disetujui diizinkan; deny tidak membocorkan row | Menunggu Supabase + keputusan tim | Provider, role, grants, policies. |
| DB-19 | Security | Key publishable vs secret/service-role | Key dummy/local saja; guard backend siap | Panggil dari context yang sesuai; pastikan secret tidak masuk client; audit bundle/env | Publishable dibatasi policies; secret hanya server; akses elevated tetap melalui authz backend | Menunggu Supabase + Next.js | Jangan memakai key produksi; secret dapat melewati RLS. |

## D. Test case yang menunggu keputusan tim

Kasus ini dapat dirinci menjadi automated tests setelah keputusan disahkan; expected result saat ini sengaja bersyarat.

| Test ID | Area | Skenario | Prasyarat | Langkah pengujian | Expected result | Status kesiapan | Dependensi atau keputusan yang dibutuhkan |
|---|---|---|---|---|---|---|---|
| DEC-01 | Status AI | Vocab dan transisi status | Backend & AI menyetujui state machine | Uji semua transisi legal/illegal dan nilai status asing | Hanya transisi/nilai yang disetujui diterima | Menunggu keputusan tim | Kandidat empat status belum final. |
| DEC-02 | AI/nullability | Field wajib untuk tiap status | Matriks field-status disetujui | Uji kombinasi nullable untuk pending/completed/uncertain/failed | Constraint DB dan response/backend sepakat | Menunggu keputusan tim | Persist pending dan definisi completed. |
| DEC-03 | AI/confidence | Threshold uncertain | Evaluasi model dan threshold disepakati | Uji skor tepat di bawah, sama dengan, dan di atas threshold | Status/category sesuai aturan threshold; nilai confidence tetap 0–1 | Menunggu keputusan tim | Threshold ditentukan Backend & AI, bukan DB. |
| DEC-04 | Scan/retry | Retry dan idempotency | Strategi retry disetujui | Ulangi request sintetis setelah failure dan bandingkan row/image | Tidak ada duplikasi atau lifecycle salah sesuai pilihan same-row/new-row | Menunggu keputusan tim | Jumlah retry, idempotency key, retensi gambar. |
| DEC-05 | GPS/privacy | Izin ditolak dan koordinat di luar Bali | Kebijakan produk/geocoding disetujui | Jalankan request tanpa lokasi dan koordinat di luar wilayah | Scan diterima/ditolak dan lokasi disimpan sesuai kebijakan; wilayah tidak dikarang | Menunggu keputusan tim | Apakah analisis tetap berjalan; retensi koordinat. |
| DEC-06 | Dashboard | Definisi total/status statistik | Product/backend setuju cakupan status | Isi fixture semua status dan hitung total/kategori | Total dan kategori mengikuti definisi; failed/pending/uncertain diperlakukan konsisten | Menunggu keputusan tim | Apakah total berarti semua row atau hanya analisis final. |
| DEC-07 | Waktu | Boundary date dan grouping | Timezone, bucket, batas `from/to` disetujui | Uji scan dekat tengah malam Makassar serta exact start/end boundary | Dikelompokkan/terfilter sesuai aturan inklusif/eksklusif | Menunggu keputusan tim | Asia/Makassar baseline; semantik parameter belum ada. |
| DEC-08 | Lokasi | Kanonisasi regency/district | Sumber resmi/nama kanonis disepakati | Uji variasi ejaan/case/alias dari geocoder | Nilai canonical atau null/unknown sesuai aturan | Menunggu keputusan tim | Tabel `regions` tetap belum diputuskan. |
| DEC-09 | Storage/privacy | Retensi dan delete lifecycle | Kebijakan privasi/retensi disetujui | Hapus/anonymize user/scan fixture lalu periksa objek terkait | Record dan image mengikuti aturan retensi dan audit yang disahkan | Menunggu keputusan tim | Retensi, orphan cleanup, deletion semantics. |
| DEC-10 | Pagination/export | Model pagination dan export limit | Kontrak endpoint disetujui | Uji filter multi-page, update concurrent, dan export besar | Tidak ada hasil hilang/duplikat sesuai snapshot/consistency yang disepakati; export lengkap | Menunggu keputusan tim | Cursor/offset, page size, batas/export sync/async. |

## Matriks dependensi

| Kelompok | Jumlah | Dependensi utama |
|---|---:|---|
| Mandiri | 6 | Fungsi murni/fixture dan test harness; tetap belum dijalankan. |
| Menunggu Next.js | 18 | App utama, Route Handlers, frontend GPS/dashboard, mapping dan API test environment. |
| Menunggu PostgreSQL/Supabase | 19 | PostgreSQL lokal/non-produksi, schema, Auth/RLS/Storage; beberapa tes juga butuh handler. |
| Keputusan tim | 10 | State machine, nullability, auth, query, privacy, timezone dan contract. |
| **Total test case** | **53** | Test dapat memiliki lebih dari satu dependency; kelompok menunjukkan blocker utama. |

## Kriteria keluar sebelum production

- Semua test constraint dan nullability lulus pada PostgreSQL versi target.
- Auth, role ADMIN, grants, RLS, dan Storage policies lulus allow/deny tests di non-production.
- Semua endpoint memakai mapping konsisten; statistik mencakup seluruh dataset/filter, pagination stabil, export lengkap.
- Boundary tanggal dan agregasi memakai `Asia/Makassar` sesuai keputusan.
- Retry/failure/uncertain dan gambar memiliki lifecycle yang disepakati serta tidak menghasilkan data palsu/orphan yang tidak tertangani.
- Tidak ada secret di bundle/browser; akses endpoint langsung dan manipulasi role client ditolak.

## Catatan status

Dokumen ini adalah test plan, bukan hasil test. Tidak ada Supabase yang dihubungkan, SQL yang dijalankan, migration yang dibuat, atau test integrasi yang diklaim lulus. Semua hasil baru dicatat setelah dijalankan pada environment lokal/non-produksi yang sudah disetujui.
