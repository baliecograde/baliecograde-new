# BaliEcoGrade — Final Integration Checklist

> **Status:** acuan diskusi integrasi, bukan kontrak API atau skema database final. Dokumen ini merangkum perilaku modul dashboard yang ada dan memisahkannya dari usulan integrasi. Tidak ada migration atau kebijakan Supabase yang dijalankan.

## Ringkasan status

| Area | Status | Kondisi saat ini / tindak lanjut |
|---|---|---|
| Bentuk record yang dibaca UI | **Sudah diimplementasikan** | Komponen dashboard menggunakan field yang dicatat pada bagian “Data scan”. |
| Kategori, confidence, tanggal, lokasi, gambar | **Sudah diimplementasikan** | Perilaku mock dan tampilan tercatat di bawah; keputusan penyimpanan/validasi server masih perlu disepakati. |
| Repository mock dan adapter API | **Sudah diimplementasikan** | Mock menjadi sumber default; adapter API terpisah dan saat ini mengambil daftar scan. |
| Endpoint agregasi terpisah | **Usulan sementara** | Diperlukan bila data tidak lagi dimuat seluruhnya ke browser. Rute dan format contoh bukan kontrak final. |
| Pagination server dan export seluruh hasil terfilter | **Usulan sementara** | UI sekarang memaginasi dan mengekspor data yang sudah dimuat di client. Perilaku backend untuk dataset besar perlu ditentukan. |
| Autentikasi admin dan RLS | **Belum disepakati** | Dashboard belum mengimplementasikan alur login admin atau kebijakan akses Supabase. |
| Skema final, timezone bisnis, penyimpanan gambar | **Belum disepakati** | Draft SQL terdahulu bukan migration dan tidak dijalankan. |

## Data scan yang digunakan dashboard

Bentuk berikut adalah record yang dipakai oleh UI/modal/CSV. Nama field API belum disahkan. Adapter dan mock saat ini memasok daftar record; halaman detail membaca record terpilih yang sama.

| Field UI | Tipe yang digunakan/diantisipasi | Penggunaan |
|---|---|---|
| `id` | string | Identitas scan dan detail. |
| `material` | string | Material terdeteksi; pencarian, tabel, detail, CSV. |
| `category` | string | Kategori; statistik, filter, tabel, detail, CSV. |
| `confidence` | number, rentang mock 0–1 | Detail menampilkan persen; CSV menyimpan nilai skala 0–1. |
| `instruction` | string atau kosong/null yang perlu ditangani | Instruksi pemilahan; detail dan CSV. |
| `local_context` | string atau kosong/null | Catatan konteks lokal Bali pada detail. |
| `regency` | string atau kosong/null | Kabupaten/kota; filter, pencarian, statistik wilayah, detail, CSV. Mock mencakup Kota Denpasar. |
| `district` | string atau kosong/null | Kecamatan; statistik wilayah, detail, CSV. |
| `scanned_at` | string tanggal/waktu | Urutan riwayat, filter tanggal, detail, CSV, grafik aktivitas. Mock memakai ISO 8601 UTC dengan akhiran `Z`. |
| `image_url` | URL string atau `null` | Gambar detail opsional; modal menangani gambar kosong atau gagal dimuat. |

### Nilai dan format yang terlihat di implementasi

| Aspek | Status | Catatan integrasi |
|---|---|---|
| Kategori | **Sudah diimplementasikan** | Kunci kategori: `ORGANIK`, `ANORGANIK`, `RESIDU`, `B3`. Sepakati validasi serta penanganan hasil yang belum terklasifikasi sebelum backend menetapkan constraint. |
| Confidence | **Sudah diimplementasikan** | Mock menggunakan angka desimal 0–1; tampilan detail mengubahnya ke persen. **Usulan sementara:** API/database mempertahankan skala 0–1 dan mendokumentasikan pembulatan. Jangan mengirim campuran `0.92` dan `92`. |
| Tanggal | **Sudah diimplementasikan** | Mock berupa ISO 8601 UTC (`...Z`). Browser memformat tanggal untuk tampilan lokal; batas `from`/`to` diproses sebagai tanggal kalender client. |
| Timezone bisnis dan batas tanggal | **Belum disepakati** | Tentukan timezone untuk agregasi harian dan apakah `to` inklusif pada hari lokal. Simpan timestamp absolut (misalnya UTC) dan sepakati konversi zona waktu untuk laporan. |
| Kabupaten/kecamatan | **Sudah diimplementasikan** | UI memakai `regency` dan `district` sebagai string. Label tampilan menyebut kabupaten/kota karena Denpasar merupakan kota. Normalisasi nama, ID referensi, ejaan, dan daftar resmi wilayah belum disepakati. |
| Gambar | **Sudah diimplementasikan** | UI mendukung `image_url` null/tidak tersedia dan kegagalan memuat gambar. **Belum disepakati:** bucket, akses publik/private, URL bertanda tangan, retensi, serta apakah URL disimpan atau dibentuk saat respons. |

## Database: rancangan diskusi

Draft SQL sebelumnya mengusulkan tabel `waste_scans`, tetapi bukan skema final. Pemetaan konseptual terhadap field UI yang perlu dibicarakan:

| Field konseptual tabel | Field UI | Status |
|---|---|---|
| `id` | `id` | Usulan draft; tipe dan strategi pembentukan ID perlu disepakati. |
| `material_name` | `material` | Usulan sementara. |
| `category` | `category` | Usulan sementara; nilai kategori mengikuti empat kunci UI di atas. |
| `confidence_score` | `confidence` | Usulan sementara; simpan angka 0–1 bila disetujui. |
| `sorting_instruction` | `instruction` | Usulan sementara. |
| `local_context` | `local_context` | Usulan sementara; nullability perlu ditetapkan. |
| `regency` | `regency` | Usulan sementara; apakah berupa teks atau foreign key belum disepakati. |
| `district` | `district` | Usulan sementara; apakah berupa teks atau foreign key belum disepakati. |
| `scanned_at` | `scanned_at` | Usulan sementara; tipe timestamp dan aturan timezone perlu disepakati. |
| `image_url` / referensi objek | `image_url` | Belum disepakati; desain penyimpanan gambar masih perlu dibahas. |

Tidak ada tabel autentikasi atau tabel lain yang ditambahkan dalam pekerjaan ini, dan draft tidak dijalankan ke Supabase.

## Kebutuhan dashboard dan endpoint

Semua rute dan JSON di bagian ini adalah **usulan sementara untuk diskusi**, bukan kontrak final. Repository API yang ada saat ini meminta `GET ${VITE_API_BASE_URL}/api/dashboard/scans`; adapter menerima array JSON atau objek `{ "data": [...] }`. Adapter belum memakai metadata pagination atau endpoint agregasi.

| Kebutuhan UI | Data yang diperlukan | Endpoint usulan sementara | Status |
|---|---|---|---|
| Ringkasan total scan dan kategori | Total serta hitungan per empat kategori | `GET /api/dashboard/summary` | Usulan sementara; sekarang dihitung client dari daftar scan yang dimuat. |
| Grafik aktivitas | Jumlah scan per bucket tanggal | `GET /api/dashboard/activity` | Usulan sementara; sekarang dihitung client dari scan yang dimuat. |
| Statistik wilayah | Hitungan per kabupaten/kota dan kecamatan | `GET /api/dashboard/regions` | Usulan sementara; sekarang dihitung client dari scan yang dimuat. |
| Riwayat, pencarian, filter, detail | Record scan dengan field UI di atas | `GET /api/dashboard/scans` | Route ini sudah dipakai adapter lokal, tetapi belum disepakati sebagai route backend. Filter server dan pagination belum dipakai adapter. |
| Export hasil terfilter lengkap | Semua kolom ekspor untuk keseluruhan hasil filter | `GET /api/dashboard/scans/export` atau mekanisme repository setara | Usulan sementara; belum tersedia di adapter API. |

### Contoh bentuk respons yang dapat dibahas

Contoh berikut hanya ilustrasi bentuk data. Field, envelope, status HTTP, dan nama route perlu persetujuan backend.

**Daftar scan — bentuk record mengikuti kebutuhan UI:**

```json
{
  "data": [
    {
      "id": "scan-id",
      "material": "botol plastik",
      "category": "ANORGANIK",
      "confidence": 0.94,
      "instruction": "Bersihkan sebelum dipilah",
      "local_context": null,
      "regency": "Kota Denpasar",
      "district": "Denpasar Selatan",
      "scanned_at": "2026-11-03T08:30:00Z",
      "image_url": null
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "page_size": 20
  }
}
```

`meta` di atas contoh usulan; adapter saat ini hanya membaca `data` dan belum mengonsumsi metadata.

**Ringkasan — usulan:**

```json
{
  "total_scans": 120,
  "by_category": {
    "ORGANIK": 30,
    "ANORGANIK": 45,
    "RESIDU": 35,
    "B3": 10
  }
}
```

**Aktivitas — usulan:**

```json
{
  "data": [
    { "date": "2026-11-03", "count": 12 }
  ]
}
```

**Wilayah — usulan:**

```json
{
  "data": [
    {
      "regency": "Kota Denpasar",
      "total_scans": 20,
      "districts": [
        { "district": "Denpasar Selatan", "total_scans": 8 }
      ]
    }
  ]
}
```

Untuk error, bentuk respons dan pemetaan ke kondisi error UI juga perlu disepakati. Jangan menganggap contoh-contoh ini sebagai format wajib.

## Pagination, filter, dan export

| Topik | Kondisi saat ini | Usulan sementara / keputusan terbuka |
|---|---|---|
| Pagination tabel | Client membagi daftar yang sudah dimuat menjadi halaman berukuran 8. | Jika server membatasi hasil, tambahkan pagination repository/API dan metadata total. Sepakati offset/page atau cursor, ukuran maksimum, sorting stabil, serta perilaku saat filter berubah. |
| Filter | Client mendukung pencarian pada material/kabupaten/kecamatan, kategori, kabupaten/kota, dan tanggal `from`/`to`; hasil diurutkan terbaru lebih dulu. | Samakan semantik filter server dengan client. Sepakati nama parameter, pencarian case-insensitive, batas tanggal inklusif, dan timezone. Kecamatan saat ini bukan filter tersendiri. |
| Export CSV | CSV berisi semua record hasil filter yang telah dimuat, sebelum pagination tabel. Kolom: material, kategori, confidence, instruksi, kabupaten/kota, kecamatan, waktu. | Dengan pagination server, ekspor hanya data halaman aktif tidak memenuhi kebutuhan. Pilih endpoint export yang menerapkan filter identik atau mekanisme pengambilan semua halaman; tetapkan batas ukuran dan apakah file dibuat sinkron/asinkron. |
| Keamanan CSV | Client mengutip/escape nilai, menangani baris baru dan nilai kosong, memakai BOM UTF-8, serta memitigasi formula injection. | Jika ekspor dipindahkan ke server, pertahankan perlindungan formula injection dan encoding yang kompatibel. |

## Agregasi statistik

Saat ini statistik kategori/total, aktivitas, dan wilayah dihitung client-side dari daftar scan yang diterima. Ini memadai untuk mock dan daftar kecil yang dimuat penuh, tetapi hasilnya akan tidak lengkap jika API hanya memberikan satu halaman.

**Usulan sementara:** backend menyediakan agregasi untuk total scan, hitungan kategori, bucket aktivitas, dan wilayah, dengan filter tanggal/kategori/wilayah yang konsisten dengan tabel bila produk memerlukan statistik terfilter. Sepakati rentang waktu default, bucket (harian/mingguan), timezone bucket, serta apakah kartu statistik mengikuti filter tabel. Server sebaiknya mengembalikan agregasi tanpa mengirim seluruh record hanya untuk menghitung grafik.

## Autentikasi admin dan Supabase RLS

| Area | Status | Hal yang perlu diputuskan |
|---|---|---|
| Login dan identitas admin | **Belum disepakati** | Provider autentikasi, mekanisme sesi/token, definisi peran admin, dan perilaku saat sesi berakhir. Dashboard saat ini tidak menyediakan autentikasi. |
| Otorisasi endpoint | **Belum disepakati** | Backend harus memverifikasi identitas dan hak admin pada server; jangan mempercayai header role dari client. Tentukan apakah endpoint dashboard hanya read-only dan siapa yang boleh mengaksesnya. |
| Akses Supabase dari browser | **Belum disepakati** | Dashboard saat ini menggunakan repository mock/API, bukan koneksi Supabase langsung. Jika akses browser kelak dipilih, gunakan hanya anon/publishable key dengan RLS aktif; jangan pernah menaruh service-role key di variabel `VITE_*`. |
| RLS | **Belum disepakati** | Tetapkan kebijakan least privilege berdasarkan identitas/role dan tabel/storage yang benar-benar digunakan. Uji akses anon, user biasa, dan admin. Belum ada policy yang dibuat atau dijalankan oleh pekerjaan dashboard. |
| Gambar dan Storage | **Belum disepakati** | Tentukan bucket privat/publik, otorisasi baca, masa berlaku URL bertanda tangan bila digunakan, dan apakah API mengembalikan URL sementara. |

## Keputusan yang menunggu anggota backend/tim

- Skema final `waste_scans`, tipe/constraint setiap kolom, strategi ID, nullability, dan indeks.
- Apakah lokasi disimpan sebagai nama teks atau ID wilayah ter-normalisasi; daftar nama resmi kabupaten/kota dan kecamatan.
- Nilai kategori yang diizinkan serta penanganan hasil tak dikenal/uncertain.
- Rentang, presisi, validasi, dan aturan pembulatan confidence score.
- Format timestamp, timezone pelaporan, bucket grafik, dan semantik filter tanggal.
- Desain unggah/penyimpanan gambar, akses, retensi, dan format referensi gambar.
- Route final, parameter query, envelope respons, metadata pagination, sorting, error format, serta versi API.
- Strategi pagination dan ekspor seluruh hasil yang terfilter untuk volume produksi.
- Apakah ringkasan/activity/regions berupa endpoint terpisah atau digabung; agregasi mana mengikuti filter aktif.
- Autentikasi admin, peran/otorisasi, verifikasi backend, serta konfigurasi CORS bila diperlukan.
- Apakah backend menggunakan Supabase dengan service role di server atau pola akses lain; rancangan dan pengujian RLS.
- Variabel lingkungan deployment dan nilai `VITE_API_BASE_URL` untuk tiap environment. Nilai `VITE_*` bersifat publik dan tidak boleh memuat rahasia.

## Checklist sebelum integrasi dianggap siap

- [ ] Backend dan dashboard menyepakati skema record dan pemetaan field.
- [ ] Kategori, confidence, timestamp/timezone, lokasi, dan nullability disepakati.
- [ ] Endpoint serta contoh sukses/error disetujui dan adapter API disesuaikan tanpa mengubah komponen UI secara menyeluruh.
- [ ] Pagination server dan total hasil konsisten dengan filter serta sorting.
- [ ] Export mencakup seluruh hasil filter, bukan hanya halaman yang sedang tampil.
- [ ] Agregasi statistik memiliki semantik filter dan timezone yang jelas.
- [ ] Autentikasi admin dan otorisasi endpoint diuji.
- [ ] RLS dan akses Storage dirancang serta diuji di lingkungan non-produksi sebelum dipakai.
- [ ] Environment variable publik dan rahasia dipisahkan dengan benar.
