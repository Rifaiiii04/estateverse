# Celah yang Ditemukan dan Perbaikannya — November 2026

Pengujian situs live pada 25-11-2026 menemukan beberapa celah keamanan dan bug. Dokumen ini mencatat setiap temuan dan
perbaikannya.

> **Status kode (26-11-2026):** semua perbaikan ada di branch `feature/perbaikan-celah`, tetapi **belum di-deploy ke
> server**. Situs live masih berjalan dengan kode lama.

## Ringkasan

| Area | Temuan | Status |
|---|---|---|
| Keamanan | File script (webshell) berkedok foto berhasil diunggah | Kode selesai, langkah di server belum |
| Keamanan | Halaman bisa dimuat di dalam iframe (clickjacking) | Selesai |
| Keamanan / privasi | File listing yang sudah dihapus masih bisa diakses publik | Selesai |
| Keamanan | Format error API tidak seragam | Selesai |
| Kepercayaan listing | Pin peta, kota, dan provinsi tidak divalidasi | Selesai |
| Kepercayaan listing | Foto rusak tetap lolos "Cek Keaslian Iklan" | Selesai |
| Kepercayaan listing | Tombol WhatsApp mengarah ke nomor palsu | Selesai |
| Kepercayaan listing | Badge "Walk Inside 360°" muncul di listing yang hanya punya model 3D | Selesai |
| Analytics | Kunjungan pemilik ke listingnya sendiri dihitung sebagai views | Selesai |
| Asisten AI | Asisten selalu dalam mode offline | **Belum** (konfigurasi server) |
| Asisten AI | Mode offline mengabaikan DP dan tenor dari pengguna | Selesai |
| Kalkulator KPR | Bunga tidak valid dihitung sebagai 0% | Selesai |
| Akun | Tidak ada fitur lupa password, dan pengaturan akun hanya bisa dibaca | Selesai (lupa password butuh SMTP) |
| Akun | Masalah alur login dan atribut input form | Selesai |
| Dashboard | Ubah status lead ke status yang sama menghasilkan error 500 | Selesai |
| Dashboard / UI | Bug tampilan kecil, SEO, bahasa EN, dan halaman 404 | Selesai (target sentuh sebagian) |

---

## 1. Keamanan

### File script berkedok foto (kritis)

**Temuan.** Dua "foto" di salah satu listing ternyata berisi webshell Node.js: script server HTTP yang ditaruh setelah
header JPEG/PNG. Server hanya mengecek beberapa byte pertama file (magic bytes), jadi file ini lolos sebagai gambar. Di
browser file ini tidak berbahaya karena dilayani dengan `nosniff` dan CSP sandbox. Meski begitu, ini jelas upaya
menyerang VPS, yang juga dipakai project lain.

**Perbaikan.**
- **Foto diproses ulang saat diunggah.** Server men-decode foto, lalu menyimpan ulang pikselnya saja. Script sisipan,
  metadata EXIF, dan lokasi GPS ikut terbuang. File yang tidak bisa dibaca sebagai gambar ditolak. WebP disimpan sebagai
  JPEG. (`backend/internal/services/image_sanitize.go`)
- **Batas ukuran 40 megapiksel**, untuk mencegah *decompression bomb*.
- **Orientasi foto dari HP tetap benar.** Tag EXIF hilang saat foto disimpan ulang, jadi rotasinya langsung diterapkan ke
  piksel. (`exif_orientation.go`)
- **Batas upload 40 request per menit per klien** untuk upload foto dan model 3D.
- **Alat pembersih file lama** `backend/cmd/sanitize-media` memeriksa semua foto yang sudah tersimpan:
  - File yang bukan gambar valid atau berisi penanda script dipindah ke folder karantina privat
    (`storage/uploads/quarantine/images/`).
  - Gambar valid yang menyimpan data tambahan di akhir file disimpan ulang pikselnya saja.
  - Tanpa flag `-apply`, alat ini hanya membuat laporan.

Panorama 360° tidak perlu diubah karena sejak awal sudah diproses ulang dengan cara yang sama.

**Masih perlu dilakukan.**
- Jalankan `sanitize-media` di server: tanpa `-apply` dulu, lalu dengan `-apply`.
  - Alat ini **belum ikut di-build di `backend/Dockerfile`**. Tambahkan dulu ke Dockerfile, atau jalankan dengan Go langsung
    di host.
- Unpublish atau hapus listing yang berisi file tersebut (id=4), lalu nonaktifkan akun pengunggahnya.
- Periksa tanda-tanda script itu pernah dijalankan:
  - proses node/pm2 asing
  - port baru yang terbuka
  - crontab
  - `~/.bash_history`
  - log nginx dan API
- Sisa risiko: file model 3D (`.glb/.gltf/.fbx/.obj`) masih hanya dicek magic bytes-nya.

### Halaman bisa dimuat di dalam iframe (clickjacking)

**Temuan.** Halaman publik dan dashboard, termasuk dalam keadaan login, bisa dimuat di dalam iframe situs lain. Header
keamanan dasar juga tidak ada.

**Perbaikan.** Semua halaman frontend sekarang mengirim header berikut (`frontend/next.config.ts`):
- `X-Frame-Options: DENY`
- `Content-Security-Policy: frame-ancestors 'none'`
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`

Header `X-Powered-By: Next.js` dimatikan. CSP lengkap belum dipasang, karena peta, aset 3D, dan script bawaan Next butuh
CSP berbasis nonce.

### File listing yang sudah dihapus masih bisa diakses publik

**Temuan.**
- Setelah listing dihapus, foto dan panoramanya masih bisa dibuka lewat URL-nya.
- Foto langsung tersimpan begitu diunggah, sebelum listing disimpan. Akibatnya form yang dibatalkan meninggalkan file
  yang tidak dipakai.

**Perbaikan.**
- **Hapus listing**: foto, model 3D, ruangan tur, panorama, dan frame rekaman ikut dihapus.
- **Ubah listing**: file yang diganti atau dibuang ikut dihapus. File yang masih dipakai listing lain tetap disimpan.
- **Pembersih otomatis** berjalan tiap 6 jam dan menghapus upload yang tidak dipakai di mana pun setelah 24 jam
  (`media_janitor.go`). Pengaman: pembersih tidak menghapus apa pun kalau daftar file yang dipakai terbaca kosong.

### Format error API tidak seragam

**Temuan.** Respons 401, 403, dan 429 memakai format JSON yang berbeda dari error API lainnya.

**Perbaikan.** Middleware auth, CORS, dan rate limit sekarang memakai format yang sama: `{"success":false,"error":"..."}`.

---

## 2. Kepercayaan listing dan data

| Temuan | Perbaikan |
|---|---|
| Pin peta bisa ditaruh di mana saja (contoh: listing Bogor dengan pin di Jambi), tapi tetap dicentang "Lokasi ditandai" | **Server** menolak pin di luar provinsi (toleransi sekitar 20 km) dan menolak kota yang bukan bagian dari provinsinya. **Form**: peta otomatis zoom ke provinsi terpilih, muncul peringatan, dan listing tidak bisa disimpan sebelum pin dipindah. **Halaman publik** menampilkan "Titik peta tidak cocok dengan alamat". Data 34 provinsi dan 514 kab/kota dibundel di aplikasi. Batasan: pengecekan masih per provinsi, belum per kota. |
| Kab. Bandung bisa tersimpan di provinsi Jawa Timur | Pasangan kota–provinsi divalidasi di server. Pilihan kota dikosongkan saat provinsi diganti. Data lama yang sudah salah **tidak** dikoreksi otomatis. |
| Semua foto listing rusak, tapi "Cek Keaslian Iklan" tetap hijau | Foto yang file-nya tidak ada lagi disembunyikan dan dihitung. Panel keaslian lalu menampilkan "N foto iklan tidak bisa ditampilkan". Foto yang gagal dimuat diganti placeholder, bukan teks alt. Beranda tidak menampilkan listing yang semua fotonya rusak. |
| Tombol WhatsApp listing demo mengarah ke nomor palsu `628000000000` | Untuk nomor contoh, tombol berubah menjadi "WhatsApp Penjual Belum Tersedia" (nonaktif) dengan keterangan bahwa ini listing contoh. Server menolak nomor contoh saat penjual menyimpan listing. |
| Badge dan filter "Walk Inside 360°" ikut menghitung listing yang hanya punya model 3D | Badge "Tur 360°" dan "Model 3D" sekarang dibedakan. Filter dan statistik katalog hanya menghitung listing yang benar-benar punya tur 360°. |
| Kunjungan pemilik ke listingnya sendiri dihitung sebagai views dan tour views | Endpoint event mengenali pengguna yang sedang login. Kunjungan pemilik ke listingnya sendiri tidak dicatat. |

---

## 3. Asisten AI dan kalkulator KPR

| Temuan | Perbaikan |
|---|---|
| Asisten AI selalu menjawab dari mode offline (API 503) | **Belum diperbaiki.** Penyebabnya konfigurasi, bukan kode: isi `OPENROUTER_API_KEY` dan `OPENROUTER_MODEL` di server, lalu cek log API. |
| Mode offline mengabaikan DP, tenor, dan bunga dari pengguna, sehingga cicilan dan kesimpulannya salah | DP, bunga, dan tenor dibaca dari pertanyaan. Nilai yang tidak disebut diberi default dan ditulis sebagai asumsi di jawaban. Harga rumah dan gaji dipisah dengan benar. Pertanyaan berbahasa Inggris juga dikenali. |
| Bunga `abc` atau `-5` diam-diam dihitung sebagai 0% | Hanya bunga di atas 0% sampai 30% yang diterima. Kalau input tidak valid, muncul pesan error dan hasil cicilan disembunyikan. |

---

## 4. Akun dan login

| Temuan | Perbaikan |
|---|---|
| Tidak ada fitur lupa password | Halaman lupa password dan reset password. Token sekali pakai berlaku 30 menit, dan yang disimpan hanya hash-nya. Respons selalu sama, jadi tidak bisa dipakai untuk mengecek email mana yang terdaftar. Email dibatasi 1 per menit per akun. Setelah reset, semua sesi keluar. Email dikirim lewat SMTP terenkripsi. **Butuh `SMTP_*` diisi di server.** |
| Halaman pengaturan hanya bisa dibaca | Sekarang bisa ubah nama, ganti password, dan hapus akun. Ganti password wajib memasukkan password lama, lalu perangkat lain dikeluarkan. Hapus akun wajib memasukkan password, dan listing serta file ikut terhapus. |
| Pengguna yang sudah login masih bisa membuka halaman login dan daftar | Pengguna diarahkan langsung ke dashboard. |
| Setelah diarahkan ke login, pengguna tidak kembali ke halaman yang tadi dibuka | Login memakai `?next=`, dan hanya path internal yang diterima, jadi tidak bisa dipakai untuk open redirect. |
| Input login/daftar tanpa `autocomplete`, `name`, dan `minLength` | Atribut-atribut itu ditambahkan, sehingga password manager dan autofill bekerja. |

---

## 5. Dashboard

| Temuan | Perbaikan |
|---|---|
| Menyimpan status lead yang sama menghasilkan error 500, dan lead yang tidak ada juga menghasilkan 500 | Status yang sama sekarang 200, dan lead yang tidak ada 404. Status tidak valid dijawab 400 dengan pesan yang jelas. Penyebabnya: MySQL menghitung 0 baris berubah kalau nilainya sama, dan sekarang yang dihitung adalah baris yang cocok. |
| Badge kelengkapan iklan hanya menampilkan "% Lengkap" tanpa angka | Badge menampilkan persentase rata-rata kelengkapan, atau "Belum ada iklan". |
| Hapus listing memakai dialog bawaan browser | Diganti dialog konfirmasi bergaya aplikasi. |
| Tombol `+` mengambang menutupi teks di dashboard mobile | Teks empty state dibuat lebih sempit dan rata tengah di mobile. |
| Tipe properti tampil mentah (`house` / `HOUSE`) | Ditampilkan sebagai label terjemahan: "Rumah", "Villa", dst. |

---

## 6. Tampilan, SEO, dan aksesibilitas

| Temuan | Perbaikan |
|---|---|
| Error `removeChild` di console saat pindah ruangan tur 360° | Tombol hotspot ruangan dibuat ulang sebagai elemen DOM biasa di atas canvas, menggantikan komponen `<Html>` dari drei yang memicu error. |
| Teks pilihan di dropdown harga terpotong | Menu dropdown bisa melebar, dan teks boleh turun baris. |
| Kata kunci dan filter katalog tidak tersimpan di URL | Filter disinkronkan ke URL, jadi hasil pencarian bisa dibagikan atau di-bookmark. |
| Halaman 404 masih bawaan Next.js | Halaman 404 kini bermerek, dengan tombol ke katalog dan beranda. |
| Semua halaman memakai judul yang sama dan tidak punya Open Graph | Tiap halaman punya judul sendiri. Halaman detail rumah memakai judul, ringkasan harga, dan foto sampulnya sendiri untuk preview WhatsApp. |
| `robots.txt` dan `sitemap.xml` tidak ada | Keduanya ditambahkan. Sitemap memuat semua listing yang tayang. Dashboard dan API diblokir dari mesin pencari. |
| Mode bahasa Inggris belum lengkap di bagian Asisten beranda | Semua teks bagian itu dipindah ke kamus terjemahan. |
| Target sentuh lebih kecil dari 24 px di mobile | Link kecil seperti "Buka Tur", link tabel, dan "Lupa password?" diperbesar. **Sebagian:** ikon lain belum diukur ulang. |

---

## Perbaikan tambahan

- Kolom nomor WhatsApp di form survei kini punya awalan `+62` tetap. Angka 0 di depan dan `+62` yang ditempel otomatis
  dirapikan.
- Server menolak nomor WhatsApp pembeli yang tidak bisa dipakai di wa.me.
- Halaman Leads menampilkan nomor WhatsApp pembeli. Link "Chat WA" selalu menuju nomor yang benar.

## Yang masih harus dilakukan

1. Merge dan deploy backend serta frontend. Migrasi tabel `password_resets` berjalan otomatis saat API start.
2. Isi `.env` server:
   - `SMTP_*` untuk email lupa password
   - `OPENROUTER_API_KEY` dan `OPENROUTER_MODEL` untuk asisten AI
   - `SEED_WHATSAPP` (opsional), untuk nomor aktif di listing demo
3. Tangani webshell:
   - Tambahkan `sanitize-media` ke Dockerfile, lalu jalankan alatnya.
   - Hapus listing id=4.
   - Periksa server untuk tanda-tanda script pernah dijalankan.
   - Nonaktifkan akun pengunggah.
4. Perbaiki provinsi listing Lembang kalau listing itu tidak dihapus.
5. Hapus akun uji `qa.test01@example.com` lewat **Pengaturan → Hapus Akun**. File sisa dari listing ujinya akan dihapus
   otomatis oleh pembersih.
6. Uji ulang semua temuan di atas pada situs live setelah deploy.

## Tes

Dijalankan pada 26-11-2026:
- `go test ./...` di `backend`: semua lulus.
- `node --test tests/*.test.mjs` di `frontend`: 44/44 lulus.

Tes baru mencakup:
- proses ulang foto
- pembersih file
- validasi wilayah
- status lead
- ganti dan reset password
- kunjungan pemilik
- format error 401
- normalisasi WhatsApp
- redirect login

Typecheck/lint frontend dan uji di browser belum dijalankan.
