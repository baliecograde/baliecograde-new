# BaliEcoGrade — Storage and Security Draft

> **DRAFT untuk review tim.** Belum ada bucket, policy, credential, koneksi Supabase, atau autentikasi yang dibuat. Bagian yang bergantung pada model auth/otorisasi tetap terbuka; dokumen ini tidak menetapkan policy akses final.

## Status

| Topik | Status |
|---|---|
| Bucket Supabase bernama `waste-images` | Baseline arsitektur tim |
| Bucket privat | Baseline arsitektur tim |
| File sebagai objek; PostgreSQL menyimpan `image_path` | Baseline arsitektur tim |
| Signed URL atau akses gambar aman melalui backend | Pola usulan; detail belum disepakati |
| Format/ukuran file | Usulan sementara untuk ditinjau |
| Retensi dan penghapusan | Belum disepakati |
| Auth, role admin, RLS, Storage policies | Belum tersedia/belum disepakati |

## Rancangan Supabase Storage

- **Bucket:** `waste-images`.
- **Akses:** private; jangan menjadikan bucket publik demi kemudahan dashboard.
- **Konten:** simpan file sebagai objek Storage, bukan Base64 di kolom PostgreSQL.
- **Referensi DB:** `waste_scans.image_path` menyimpan object path relatif, misalnya `scans/<scan-id>/<object-id>.webp`; bukan URL publik atau signed URL sementara.
- **Akses baca:** backend memeriksa hak pemohon, lalu membuat signed URL berumur terbatas atau melakukan streaming/proxy berotorisasi. Mekanisme final tergantung auth, performa, dan kebijakan privasi.
- **Upload:** upload melalui Route Handler atau signed upload flow terbatas masih perlu dipilih. Backend memvalidasi identitas, ukuran, MIME type, dan relasi objek dengan scan.

### Batas file — usulan sementara

Starting point untuk ditinjau, bukan kebijakan final:

- Maksimum **10 MiB per gambar**.
- Format **JPEG, PNG, WebP** (`image/jpeg`, `image/png`, `image/webp`).
- Tolak SVG dan format non-image pada alur foto awal; validasi isi file di server, bukan hanya ekstensi/header browser.
- Pertimbangkan resize/normalisasi server setelah kebutuhan kualitas DeepSeek dan batas payload ditetapkan.

Nilai tersebut perlu diselaraskan dengan batas request Vercel/backend, UX mobile, dan limit project Supabase sebelum diterapkan.

### Retensi dan lifecycle — belum disepakati

- Lama penyimpanan file dan metadata scan.
- Apakah penghapusan scan menghapus objek, menganonimkan relasi user, atau mempertahankan catatan analitik.
- Penghapusan saat akun dihapus dan pembersihan orphan object.
- Aturan retensi GPS dan gambar untuk privasi.

## RLS dan Storage policies

- Jangan membuat policy yang mengasumsikan provider auth, role, atau format JWT yang belum diputuskan.
- Tentukan apakah request server memakai user JWT passthrough atau service-role/secret key, dan bagaimana identitas/admin diverifikasi.
- Setelah auth disepakati, rancang policy least-privilege untuk operasi yang benar-benar diperlukan pada tabel dan bucket.
- Uji akses anon, user biasa, admin, dan tanpa identitas pada environment non-produksi.
- Jangan mematikan RLS untuk mengatasi error integrasi. Belum ada RLS/Storage policy di repository.

## Key dan boundary kepercayaan

| Jenis key | Penggunaan yang diizinkan | Batas keamanan |
|---|---|---|
| Supabase publishable key (atau legacy anon key) | Dapat berada di client hanya bila pola akses mengandalkan RLS dan policy sudah benar. | Anggap publik; key bukan izin admin. Akses tabel/bucket tetap dibatasi policy. |
| Supabase secret/service-role key | Operasi server tepercaya saja bila diperlukan. | Jangan di browser, source control, atau `NEXT_PUBLIC_*`/`VITE_*`. Secret/service-role dapat melewati RLS; server wajib melakukan otorisasi sendiri. |
| DeepSeek API key | Backend/server saja. | Tidak dikirim ke browser atau variabel publik. |

> Service-role key yang melewati RLS bukan pengganti pemeriksaan akses. Backend memeriksa hak pemohon untuk setiap operasi, termasuk pembuatan URL gambar.

## Autentikasi dan otorisasi Admin Dashboard

- Dashboard admin harus dilindungi autentikasi dan otorisasi sebelum menampilkan data produksi.
- Backend memverifikasi sesi/token dan role admin pada setiap endpoint yang sesuai. Role dari parameter/header browser bukan sumber otorisasi.
- Provider auth, session/token, role/claims, provisioning admin, dan tabel `profiles` masih menunggu keputusan tim.
- Bila backend memakai service-role key, gunakan hanya di server dan lakukan pemeriksaan hak admin sendiri karena RLS dapat dilewati key tersebut.
- Dashboard memakai backend API, bukan akses langsung browser ke tabel produksi.

## Checklist sebelum konfigurasi diterapkan

- [ ] Auth provider, identitas request, role admin, dan lifecycle akun disepakati.
- [ ] Backend memilih pola akses Supabase dan mendokumentasikan pemakaian service-role.
- [ ] Bucket privat; alur upload/download dan masa signed URL disepakati.
- [ ] Ukuran, MIME type, retensi, dan orphan cleanup disetujui.
- [ ] RLS tabel dan Storage policies ditinjau serta diuji per role di non-produksi.
- [ ] Secret hanya tersedia di server; variabel publik tidak mengandung key rahasia.
- [ ] Tidak ada SQL/policy/bucket yang diterapkan remote tanpa review dan persetujuan.
