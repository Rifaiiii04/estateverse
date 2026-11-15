<p align="center"><img src="frontend/public/logo.svg" alt="EstateVerse — Walk Inside 360°" height="64"></p>

# EstateVerse

**Jual dan temukan rumah tanpa perantara mahal: tur virtual 360° cukup direkam dari HP.**

EstateVerse membantu **penjual rumah perorangan dan developer kecil** memasarkan rumah sendiri. Penjual merekam tiap ruangan langsung dari browser HP, lalu sistem menggabungkan foto-fotonya menjadi panorama 360° ala Street View. **Pembeli rumah pertama** bisa menjelajah isi rumah sebelum survei, mengecek kemampuan bayar KPR, bertanya ke asisten AI, dan menghubungi penjual langsung.

Kategori lomba: **Website**. Sub-tema: **SDG 8 — Decent Work and Economic Growth**, pendukung **SDG 12**.

---

## Masalah & Solusi

| Masalah | Solusi EstateVerse |
|---|---|
| Jasa foto 360°/3D profesional mahal bagi penjual perorangan | **Perekam 360° terpandu di browser HP**. Foto diambil otomatis, lalu di-stitch di server |
| Komisi perantara memotong hasil penjualan | Pembeli menghubungi penjual **langsung** (WhatsApp/formulir survei) |
| Pembeli survei berkali-kali ke rumah yang tidak cocok | Tur 360° + kalkulator kemampuan bayar **sebelum** survei |
| Pembeli rumah pertama bingung soal KPR, dokumen, dan biaya | **Asisten Pintar** (LLM via OpenRouter) dengan konteks listing asli |

**Kaitan SDG:**
- **8.3**: mendukung usaha mikro/kecil (penjual perorangan, developer lokal) memasarkan secara profesional.
- **8.2**: produktivitas lewat inovasi teknologi (rekam sekali, tur bisa dibuka kapan saja).
- **12 (pendukung)**: survei lebih tepat sasaran. Diukur lewat data nyata: lead yang dikirim *setelah* melihat tur.

Semua angka di dashboard dan bagian "Dampak" dihitung dari database (kunjungan, pembukaan tur, lead), bukan angka karangan.

## Fitur

**Penjual**
- Pasang iklan rumah (foto, harga, luas, keunggulan lokasi, nomor WhatsApp).
- **Rekam Ruangan 360°** dari HP:
  - titik target di layar, dan foto diambil otomatis saat HP stabil
  - jumlah foto otomatis: tiga foto awal untuk mengukur lensa, lalu backend menghitung sudut tambahan berdasarkan cakupan dan overlap; foto awal dipakai kembali
  - status pemrosesan dan skor kualitas sambungan
- Unggah foto 360° yang sudah jadi (kamera 360/Photo Sphere) sebagai alternatif.
- Atur **panah antar-ruangan** (hotspot) ala Street View.
- Dashboard dengan metrik asli: kunjungan, tur dibuka, leads, dan leads yang sudah melihat tur.
- Kelola leads (baru → dihubungi → jadwal survei → deal) dan template pesan WhatsApp.

**Pembeli**
- Katalog dengan filter harga untuk rumah pertama (< Rp 300 jt, 300–700 jt, dst.).
- Viewer 360°: geser, zoom, tombol panah keyboard, mode **"Gerakkan HP"** (sensor gerak), dan pindah ruangan.
- Kalkulator **kemampuan bayar KPR** (gaji, DP, tenor, bunga, dengan patokan cicilan ≤ 30% gaji).
- Formulir survei dan WhatsApp langsung ke penjual.
- **Asisten Pintar** (OpenRouter). Kalau model tidak tersedia, otomatis pindah ke jawaban offline.

## Cara Kerja Perekam & Stitching 360°

```
HP penjual (browser, HTTPS)                        Server Go
───────────────────────────                        ─────────────────────────────────────────────
getUserMedia (kamera belakang)                     POST /api/v1/tours/captures
DeviceOrientation (giroskop+akselerometer+kompas)    → validasi JPEG & quaternion, simpan privat
  → quaternion kamera tiap foto                      → antrian background (1 worker)
Titik target dihitung backend dari bidang pandang lensa, auto-capture saat stabil  internal/panorama (Go murni):
  → upload JPEG + manifest orientasi                 1. proyeksi kamera ↔ arah 3D (quaternion)
                                                     2. kalibrasi FOV lensa dari area tumpang-tindih
                                                     3. refine orientasi tiap foto (maks. NCC)
                                                     4. kompensasi exposure (gain)
                                                     5. blending → equirectangular 2:1 (4096 + 2048 px)
                                                     6. status room ready/failed + pemberitahuan klien
Viewer (React Three Fiber)                       ←  panorama publik + skor kualitas
```

Foto di dinding/plafon polos memakai sudut sensor sebagai perkiraan awal. Estimasi lensa menyesuaikan rasio frame kamera; foto dicocokkan lewat area tumpang-tindih sebelum exposure dan blending. Rekaman dengan cakupan kurang dari 98,5% atau skor korelasi sambungan kurang dari 0,45 ditolak, bukan dipublikasikan sebagai tur yang rusak. Angka ini adalah pemeriksaan teknis, bukan jaminan kualitas visual. Lihat [panduan capture](docs/walk-inside-capture.md) untuk metode dan batasannya.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Three.js / React Three Fiber.
- **Backend**: Go 1.27 (`net/http`, `database/sql`), stitching panorama Go murni tanpa dependensi berat.
- **Database**: MySQL 8.
- **AI**: OpenRouter (model gratis untuk prototipe), API key hanya di server.
- **Deploy**: Docker Compose + Caddy (HTTPS otomatis) di VPS. Lihat [`deploy/README.md`](deploy/README.md).

## Struktur Repo

```
backend/            Go API
  internal/panorama   stitching 360° (proyeksi, kalibrasi, refine, gain, render) + tes sintetis
  internal/services   logika bisnis (properti, tur, asisten, auth, storage)
  migrations/         skema MySQL (dijalankan otomatis saat start)
  cmd/seed            data contoh (akun & listing demo)
frontend/           Next.js
  src/lib/capture     sensor orientasi, grid target, pengambil frame kamera
  src/components/capture  perekam 360° full-screen
  src/components/tour     viewer 360°, hotspot, pengelola ruangan
deploy/             docker-compose, Caddyfile, panduan VPS
mobile/             aplikasi Expo: capture native dan akses ke Go API yang sama dengan website
shared/             grid capture, quaternion, dan manifest yang dipakai web serta mobile
```

## Menjalankan Secara Lokal

1. **MySQL** (mis. Laragon): buat database `estateverse_mvp` (utf8mb4).
2. **Backend**
   ```bash
   cd backend
   cp .env.example .env      # sesuaikan DB_DSN; OPENROUTER_* opsional
   go run .                  # http://localhost:8085, migrasi otomatis
   SEED_PASSWORD=rahasia123 go run ./cmd/seed -replace-old-demo   # data contoh (opsional)
   ```
3. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev               # http://localhost:3000
   ```

> **Perekam 360° butuh HTTPS dan HP sungguhan** (kamera + sensor gerak). Uji fitur ini di server yang sudah di-deploy dengan HTTPS. Di laptop, perekam menampilkan petunjuk untuk membuka halaman di HP.

## Pengujian & Kualitas Kode

```bash
cd backend && go vet ./... && go test ./...      # termasuk tes stitching sintetis & layanan tur/asisten
cd frontend && npx eslint src && npm run build
cd frontend && npm run test:capture           # Node.js 22.18+ / 24+, tanpa dependensi tes tambahan
```

Standar kode mengikuti [`AGENTS.md`](AGENTS.md): maksimal 250 baris per file, komentar di setiap fungsi, otorisasi dan cek kepemilikan di server, serta query terparameter.

## Dasar Riset

Keputusan desain berikut diambil berdasarkan literatur dan data resmi. Rencana lengkap ada di [`docs/rencana-perbaikan-berbasis-riset.md`](docs/rencana-perbaikan-berbasis-riset.md).

| Keputusan di EstateVerse | Dasar |
|---|---|
| **Tidak menjanjikan "rumah lebih cepat laku/lebih mahal"**, tapi mengukur dampak sendiri lewat perbandingan leads per kunjungan untuk iklan dengan vs tanpa Walk Inside | Efek tur virtual tidak konsisten: Pant et al. (2020), *J. Real Estate Literature* 28(2); Yan, Meng & Tan (2025), *Information Systems Research* 36(2); Soleymanian & Qian (2024), NBER WP 33204 |
| **Tur panorama (Walk Inside 360°) sebagai fitur utama**, model 3D opsional | Efek positif terkuat ditemukan pada tur VR non-imersif berbasis panorama (Yan et al. 2025) |
| **Kalkulator KPR memakai DSR dan sisa uang per bulan**, bukan aturan tetap "30% = aman" | Pendekatan *residual income* (Stone); Airgood-Obrycki et al. (2021), Harvard JCHS. Batas 30% dari OJK berlaku untuk pinjol (POJK 40/2024), sedangkan bank menetapkan batas DSR KPR sendiri |
| **Asisten tidak menghitung angka sendiri.** Cicilan dan DSR dihitung kode, LLM hanya menjelaskan | Hean, Saha & Saha, *Can AI Help with Your Personal Finances?* (arXiv 2412.19784): akurasi LLM untuk keuangan pribadi sekitar 70% dan menurun untuk pertanyaan kompleks |
| **Instruksi rekam: "putar HP di titik yang sama"** | Stitching mengasumsikan kamera berputar di pusat optiknya: Brown & Lowe (2007), *IJCV* vol. 74 |
| **Kompensasi exposure (gain) saat stitching** | Brown & Lowe (2007) |
| **Tips anti-penipuan dan tombol "Laporkan iklan"** | Studi NYU Tandon (2016): platform iklan hanya mendeteksi 47% iklan sewa palsu |
| **Catatan ukuran/arah jendela per ruangan** | Tur dengan narasi lebih diingat (Eagan et al., CHI 2025); telepresence panorama meningkatkan niat booking (Israel, Zerres & Tscheulin 2019, *JHTT*) |
| **Tombol arah dan zoom di viewer (≥ 44 px)** | W3C WCAG 2.2, SC 2.5.7 Dragging Movements & SC 2.5.8 Target Size |
| **Gyro opsional, tanpa rotasi otomatis, zoom dibatasi** | Field of view dan navigasi berkorelasi dengan cybersickness: Rebenitsch & Owen (2016), *Virtual Reality* |
| **Hemat komisi, bukan janji cepat laku** | Komisi agen 2–5% (Permendag 51/2017). FSBO tidak berbeda signifikan dalam harga tetapi lebih lambat terjual: Hendel, Nevo & Ortalo-Magné (2009), *AER* 99(5) |
| **Label harga "terjangkau", bukan "subsidi"** | Batas harga rumah subsidi FLPP Jawa 2024: Rp166 juta (Kepmen PUPR 689/KPTS/M/2023) |

**Data konteks Indonesia:**
- Backlog kepemilikan rumah 9,9 juta rumah tangga (Susenas 2023, BPS); 9,64 juta (Maret 2025)
- Penetrasi internet 79,5% (APJII 2024)
- WhatsApp dipakai sekitar 91% pengguna internet (DataReportal 2024)

## Data Demo

Seeder membuat akun bertanda **"(Akun Demo)"** dan lead bertanda **"(Demo)"**. Semuanya data contoh untuk demonstrasi, bukan transaksi asli. Detail ada di [`backend/seed/README.md`](backend/seed/README.md).

## Roadmap

- Aplikasi native penjual (folder `mobile/`) dengan perekaman 360° yang lebih mulus dan mode offline.
- Saran posisi panah antar-ruangan otomatis dari urutan rekaman.
- Verifikasi dokumen penjual (SHM/PBB) agar pembeli lebih yakin.
