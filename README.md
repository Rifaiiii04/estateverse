# EstateVerse — Full-Stack MVP

EstateVerse adalah platform presentasi properti modern dengan visualisasi denah dan eksplorasi rumah 3D interaktif berbasis WebGL.

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Three.js, React Three Fiber (`@react-three/fiber`), `@react-three/drei`.
- **Backend**: Go 1.27, `database/sql`, MySQL driver, bcrypt password hashing, `crypto/rand` session generation.
- **Database**: MySQL (Laragon).
- **Storage**: Backend local filesystem storage (`backend/storage/uploads/images` & `backend/storage/uploads/models`).

---

## Persiapan Database (MySQL / Laragon)

1. Buka **Laragon** dan pastikan service **MySQL** telah dijalankan (*Start All*).
2. Buat database baru bernama `estateverse_mvp` melalui HeidiSQL atau terminal MySQL:
   ```sql
   CREATE DATABASE estateverse_mvp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Jalankan migrasi schema tabel:
   ```bash
   cd backend
   go run cmd/migrate/main.go
   ```
   *Catatan:* Server API backend (`cmd/api/main.go`) juga secara otomatis memverifikasi dan menjalankan migrasi skema tabel saat booting.

---

## Menjalankan Aplikasi Secara Lokal

### 1. Menjalankan Backend (Go API)

```bash
cd backend
go run main.go
```
*Server API akan aktif di `http://localhost:8085`.*

### 2. Menjalankan Frontend (Next.js)

```bash
cd frontend
npm run dev
```
*Buka browser di `http://localhost:3000`.*

---

## Pengujian dan Pemeriksaan Kode

### Menjalankan Unit Tests Backend
```bash
cd backend
go test -v ./...
```
*Menguji proses registrasi seller, normalisasi nomor WhatsApp, penolakan email duplikat, verifikasi password bcrypt, lifecycle sesi token hash, isolasi hak milik seller, dan proteksi kerahasiaan draft properti.*

### Menjalankan Type Checking & Linting Frontend
```bash
cd frontend
npx eslint .
npm run build
```

---

## Fitur Utama MVP

1. **Autentikasi & Sesi Seller**:
   - Pendaftaran seller dengan normalisasi email dan password minimal 8 karakter.
   - Sesi server-side dengan hashing token kriptografis di database MySQL (`sessions`).
   - Keamanan HttpOnly, SameSite=Lax cookie, dan validasi Origin anti-CSRF.
2. **Dashboard Seller**:
   - Ringkasan metric properti (Total, Draft, Published).
   - Formulir input spesifikasi rumah: Luas tanah/bangunan, jumlah kamar, harga IDR.
   - Unggah foto galeri properti dengan preview dan hapus sebelum simpan.
   - Unggah model 3D rumah berformat `.glb` / `.gltf`.
   - Seller hanya dapat melihat, mengedit, mempublikasikan, dan menghapus properti miliknya sendiri.
3. **Interactive 3D House Viewer**:
   - **Explore House**: Mode default dengan kamera aerial/isometric, rotasi orbit 360°, dan zoom.
   - **Dollhouse Roof-Off**: Buka/tutup atap untuk melihat denah tata letak ruangan interior.
   - **Walk Inside**: Navigasi sudut pandang orang pertama di dalam rumah menggunakan keyboard WASD atau tombol panah dengan pembatas tabrakan (*collision boundary*).
4. **Website Publik**:
   - Katalog listing properti published (properti berstatus draft tidak ditampilkan).
   - Halaman detail properti lengkap dengan foto galeri, spesifikasi, dan 3D viewer.
   - Tombol direct WhatsApp yang dinormalisasi ke format internasional `wa.me/62...` dengan pesan otomatis.
