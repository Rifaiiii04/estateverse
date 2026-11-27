# EstateVerse Mobile

Aplikasi Expo SDK 58 ini memakai **Go API dan MySQL yang sama dengan website**. Akun, listing, leads, ruangan, dan URL panorama berasal dari backend; SQLite prototipe lama tidak lagi menjadi sumber data aplikasi aktif. Data SQLite lama tidak otomatis diunggah atau dihapus.

## Menjalankan di HP Android

1. Jalankan MariaDB/MySQL lokal dan backend terbaru:

   ```powershell
   cd backend
   go run .
   ```

   Restart proses backend lama setelah memperbarui kode agar endpoint sesi mobile tersedia. API berjalan di port `8085` sesuai `backend/.env`.

2. Di terminal lain, siapkan mobile:

   ```powershell
   cd mobile
   npm install
   Copy-Item .env.example .env.local
   ```

   Isi `.env.local` dengan IP LAN komputer, misalnya:

   ```dotenv
   EXPO_PUBLIC_API_URL=http://192.168.1.10:8085/api/v1
   ```

   Gunakan IP komputer yang sebenarnya. HP dan komputer harus dapat saling terhubung; izinkan koneksi privat ke port backend `8085` dan Metro bila firewall meminta izin. `localhost` pada HP merujuk ke HP, kecuali sudah memakai USB port forwarding.

3. Jalankan `npm start`, lalu pindai QR dengan Expo Go yang mendukung SDK 58. Restart Metro setelah mengganti variabel lingkungan. Build produksi wajib memakai API HTTPS.
4. Login menggunakan **akun website**. Buka Dashboard → tambah/edit properti → Rekam 360° → izinkan kamera dan sensor.
5. Pegang HP tegak, mulai dari bagian ruangan yang memiliki detail, lalu putar perlahan ke kanan dari satu posisi lensa. Kamera mengukur lensa di HP dan menampilkan panorama yang terbentuk saat bergerak. Selesaikan putaran sejajar mata, lalu ikuti panduan untuk putaran atas dan bawah. Lebar bidang pandang menentukan apakah diperlukan tiga atau lima putaran.
6. Periksa pratinjau panorama, beri nama ruangan, lalu pilih **Simpan Properti**. Aplikasi mengunggah satu JPEG per putaran. Backend menggabungkan seluruh sapuan dan menyimpan ruangan berstatus `ready` setelah hasil lolos pemeriksaan. Properti dengan rekaman baru tersimpan sebagai draft sampai penjual memilih Tayang.

## Alur 360°

```text
Kamera Expo + sensor orientasi
  → kalibrasi lensa dan pencocokan gambar di HP
  → 3–5 JPEG panorama + rentang lintang setiap sapuan + ID properti
  → POST /api/v1/tours/captures
  → Go memeriksa kepemilikan dan berkas, lalu mengantrekan ruangan
  → penggabungan pita menjadi panorama 360° × 180° dan pratinjau
  → URL panorama yang sama untuk web dan mobile
```

Web dan mobile menggunakan proyeksi serta pencocokan gambar bersama di `../shared/`. Mobile membentuk setiap pita selebar 2.048 piksel. Viewer GL menampilkan panorama akhir dari backend sebagai ruangan yang dapat dilihat ke segala arah.

Kamera dapat menyelesaikan semua sapuan secara lokal. Setelah diberi nama dan disimpan, ruangan tersimpan di formulir meskipun kamera ditutup atau dibuka kembali. Simpan properti sebelum meninggalkan formulir agar JPEG di cache privat terkirim. Bila koneksi terputus, coba lagi dari formulir yang sama. Setiap ruangan baru memakai UUID rekaman yang tetap pada percobaan berikutnya sehingga server dapat mengenali unggahan yang sudah diterima.

## Verifikasi

```powershell
npm run lint
npm run test:api
node_modules/.bin/tsc.cmd --noEmit
node_modules/.bin/expo.cmd export --platform android --output-dir .expo/verification --no-bytecode
```

Tes mobile mensimulasikan sapuan lengkap dengan kamera sintetis, kegagalan penyimpanan pita, percobaan ulang, serta pembersihan berkas. Tes proyeksi bersama tersedia di `frontend` melalui `npm run test:capture`. Jalankan `go test ./...` di backend untuk memeriksa kontrak upload dan pemrosesan panorama. Kamera, stabilitas sensor, dan tampilan Walk Inside juga perlu diuji langsung di HP. [Panduan capture 360°](../docs/walk-inside-capture.md)
