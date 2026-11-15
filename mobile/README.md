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
5. Ikuti tiga titik awal untuk kalibrasi. Backend mengukur lensa lalu menentukan jumlah dan arah foto tambahan secara otomatis; tidak ada pilihan jumlah foto. Tahan posisi lensa saat setiap foto diambil. Koneksi backend diperlukan selama kalibrasi.
6. Beri nama ruangan lalu **Simpan Properti**. Listing disimpan sebagai draft bila ada capture baru. Foto mentah diunggah dan diproses di server secara background. Mobile memberi dialog saat status berubah menjadi `ready`; setelah semua room siap, pilih Tayang untuk mempublish. Ruangan siap muncul di tur publik dan dapat dibuka juga dari website.

## Alur 360°

```text
Web / kamera Expo
  → JPEG + quaternion + ID properti server
  → POST /api/v1/tours/captures
  → Go: validasi kepemilikan dan file → antrean stitching
  → kalibrasi, alignment, exposure, panorama 4096×2048 + preview
  → URL panorama yang sama untuk web dan mobile
```

Capture memakai aturan bersama di `../shared/`. Mobile tidak menggabungkan foto atau membuat panorama. Viewer GL mobile hanya memproyeksikan panorama backend menjadi tampilan bola 360°.

Draft foto berada di cache privat aplikasi sampai dikirim; jangan menutup aplikasi sebelum menyimpan. Saat sebagian upload gagal, listing yang sudah dibuat dan ID ruangan yang berhasil dikirim dipertahankan untuk percobaan simpan berikutnya. Hasil gagal tidak ditampilkan sebagai panorama siap.

## Verifikasi

```powershell
npm run lint
node_modules/.bin/tsc.cmd --noEmit
node_modules/.bin/expo.cmd export --platform android --output-dir .expo/verification --no-bytecode
```

Tes kesetaraan orientasi, grid, dan manifest dijalankan dari `frontend` dengan `npm run test:capture`. Backend menjalankan `go test ./...`, termasuk kontrak cookie/bearer dan worker panorama. Bundle Android bukan APK terpasang dan tidak menggantikan pengujian kamera, sensor, dan GPU pada HP fisik. Panduan kualitas dan batasan ada di [capture 360°](../docs/walk-inside-capture.md).
