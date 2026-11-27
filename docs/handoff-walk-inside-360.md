# Serah terima verifikasi Walk Inside 360°

Prioritas berikutnya adalah menguji hasil panorama di HP fisik dan memastikan unggahan ulang menghasilkan satu ruangan. Pengujian sebelumnya mencakup kamera sintetis Chromium, alur mobile, worker Go, dan migrasi pada MySQL 8.0.43 terpisah. Kualitas sambungan di ruangan nyata dan status migrasi pada database rekan masih perlu diperiksa.

## 1. Pastikan kode yang diuji lengkap

Dari root repo, jalankan `git status --short --branch`. Baca [aturan proyek](../.agents/AGENTS.md) dan [panduan capture](walk-inside-capture.md). Periksa bahwa `shared/panoramaSweep.ts`, [migrasi 019](../backend/migrations/019_add_tour_capture_receipt.sql), dan [tes unggahan ulang MySQL](../backend/internal/repositories/tour_receipt_mysql_test.go) tersedia. Saat serah terima ini dibuat, sebagian perubahan masih berupa file lokal. Jika ada yang hilang, minta salinan perubahan lengkap sebelum menyimpulkan hasil audit.

## 2. Terapkan migrasi yang tertunda

Gunakan database pengembangan tim atau staging yang ditugaskan. Pastikan `DB_DSN` backend mengarah ke target tersebut. Di klien MySQL dengan koneksi yang sama, jalankan `SELECT DATABASE(), @@hostname, @@port;` untuk memeriksa tujuan. Rahasiakan kredensial. Jika database berisi data tim, gunakan prosedur cadangan tim sebelum mengubah skema.

Jalankan blok PowerShell ini dari root repo. Migrator membaca `schema_migrations`, menerapkan seluruh file yang tertunda sesuai urutan, dan melewati versi yang sudah tercatat.

```powershell
Push-Location backend
go run ./cmd/migrate
Pop-Location
```

Setelah perintah berhasil, periksa database yang sama.

```sql
SELECT version, applied_at
FROM schema_migrations
WHERE version = '019_add_tour_capture_receipt.sql';

SHOW CREATE TABLE property_tour_rooms;
```

Pastikan ada satu catatan versi 019, kolom nullable `capture_id CHAR(36)` berkolasi `ascii_bin`, kolom nullable `capture_digest BINARY(32)`, dan indeks unik `uq_tour_capture_receipt (property_id, capture_id)`. Jika catatan versi dan struktur tabel berbeda, periksa penyebabnya sebelum melanjutkan. Untuk produksi, ikuti proses rilis tim setelah verifikasi staging.

## 3. Jalankan tes dan perbaiki bug yang terulang

Mulai setiap blok dari root repo. Jika dependensi JavaScript belum tersedia, jalankan `npm.cmd ci` di direktori paket terkait. Catat perintah yang gagal dan ulangi pemeriksaan itu setelah perbaikan.

```powershell
Push-Location backend
go test ./... -count=1
go vet ./...
go build ./...
Pop-Location
```

Untuk tes database nyata, set `ESTATEVERSE_TEST_MYSQL_DSN` melalui konfigurasi lokal ke instance MySQL khusus pengujian, memakai TCP localhost dan akun yang dapat membuat serta menghapus skema uji. Dari `backend`, jalankan `go test ./internal/repositories -run '^TestMySQLCaptureReceipt$' -count=1 -v`. Pastikan hasilnya `PASS` untuk tes tersebut. Jika variabel belum disetel, hasilnya `SKIP`. Tes ini memeriksa migrasi ruangan lama, lima unggahan serentak, pembatalan saat penyimpanan gagal, dan pengiriman ulang melalui koneksi database baru.

```powershell
Push-Location frontend
npm.cmd run test:capture
npm.cmd run build
Pop-Location

Push-Location mobile
npm.cmd run test:api
npx.cmd --no-install tsc --noEmit
npm.cmd run lint
Pop-Location
```

## 4. Uji satu ruangan dari kamera sampai viewer

Jalankan backend dengan skema terbaru. Gunakan akun penjual dan properti uji. Untuk web di HP, buka alamat HTTPS dan izinkan kamera serta sensor gerak. Untuk aplikasi Expo, ikuti [petunjuk koneksi mobile](../mobile/README.md). Minta rekan memegang HP dan melakukan sapuan fisik. Catat model HP, OS, serta browser atau versi aplikasi.

| Skenario | Hasil yang harus terlihat |
| --- | --- |
| Mulai menghadap dinding polos, lalu arahkan ke kusen. Putar dari satu posisi setinggi mata, lanjutkan ke atas dan bawah. | Kalibrasi dapat dimulai ulang dari kusen. Setiap putaran menghasilkan satu JPEG. Satu ruangan berisi tiga atau lima JPEG sesuai lensa. |
| Tutup lensa sesaat atau lewatkan sebagian putaran, kemudian kembali sesuai panduan. | Gambar bermasalah tidak menambah kemajuan. Bagian yang terlewat dapat dilengkapi. |
| Simpan satu ruangan di mobile, pilih rekam ruangan berikutnya, lalu tutup kamera. Di web, pindah tab saat sedang merekam. | Ruangan yang sudah disimpan tetap ada di formulir. Kamera web menangani interupsi dan bisa dibuka lagi. |
| Pada properti uji, simulasikan respons unggahan pertama hilang **setelah server menerimanya**, lalu tekan coba lagi. | Kedua permintaan memakai `capture_id` yang sama. Daftar penjual berisi satu ruangan dengan ID yang sama. |
| Tunggu status `ready`, lalu buka Walk Inside sebagai pembeli pada properti uji yang sudah dipublikasikan. Geser pandangan sampai melewati arah awal dan lihat ke atas serta bawah. | Panorama dapat dijelajahi. Periksa kusen untuk garis ganda, sambungan awal–akhir untuk loncatan gambar, serta plafon dan lantai untuk area kosong. |

Jika menemukan bug, rekam langkah reproduksi, hasil aktual, dan hasil yang diharapkan. Perbaiki lapisan yang menyebabkan kegagalan, tambahkan tes regresi jika kasus itu belum tercakup, lalu ulangi skenario yang sama. Jika HP belum tersedia, selesaikan pemeriksaan otomatis dan tandai uji fisik sebagai tertunda.

## 5. Laporkan hasil ke rekan

Sampaikan target database dan bukti status migrasi 019, tes yang lulus atau dilewati, hasil pengamatan di HP, serta bug yang diperbaiki beserta file terkait. Untuk masalah yang masih terbuka, sertakan cara mengulanginya. Pisahkan bukti simulasi dari hasil kamera fisik agar tim bisa memutuskan kesiapan rilis.
