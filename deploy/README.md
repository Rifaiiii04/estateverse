# Deploy EstateVerse ke VPS

Stack produksi terdiri dari MySQL 8.4, Go API, Next.js (standalone), dan Caddy. Caddy mengurus HTTPS otomatis lewat Let's Encrypt.
Semua dijalankan dengan Docker Compose. Frontend dan API berada di **satu domain**:
- `https://DOMAIN/` dilayani Next.js
- `https://DOMAIN/api/...` dilayani Go API

Karena satu domain, cookie sesi, proteksi CSRF, **kamera, dan sensor gerak browser** (yang wajib HTTPS) bisa berjalan.

## Kebutuhan VPS
- Ubuntu 22.04/24.04 (atau distro lain yang didukung Docker).
- **RAM minimal 2 GB.** Build Next.js dan proses stitching panorama 360 cukup berat. Kalau RAM cuma 1 GB, tambahkan swap:
  ```bash
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
  sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```
- Port **80** dan **443** terbuka di firewall.

## 1. Siapkan domain
- **Punya domain:** buat A record yang mengarah ke IP VPS.
- **Belum punya domain:** pakai `sslip.io`. Untuk IP `203.0.113.10`, domainnya `203-0-113-10.sslip.io`. Caddy tetap bisa mengambil sertifikat HTTPS untuk domain ini.

## 2. Install Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # logout lalu login lagi
```

## 3. Ambil kode dan isi konfigurasi
```bash
git clone <URL-REPO-GITHUB> estateverse
cd estateverse/deploy
cp .env.example .env
nano .env   # isi DOMAIN, DB_PASSWORD, DB_ROOT_PASSWORD, OPENROUTER_*, SEED_PASSWORD
```
Contoh membuat password acak: `openssl rand -base64 24`.

## 4. Jalankan
```bash
docker compose up -d --build
docker compose ps          # semua service harus "running"/"healthy"
docker compose logs -f backend
```
Migrasi database berjalan otomatis saat backend start. Buka `https://DOMAIN` untuk mengecek.

## 5. Isi data contoh (opsional)
```bash
docker compose exec backend /app/bin/seed -replace-old-demo
```
Akun penjual contoh memakai password dari `SEED_PASSWORD`. Email akun-akun contoh tercetak di log seeder.

## Update setelah ada perubahan kode
```bash
cd estateverse && git pull
cd deploy && docker compose up -d --build
```

## Backup
```bash
# Database
docker compose exec db sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" estateverse' > backup-$(date +%F).sql
# File upload (foto, panorama 360, model 3D)
docker run --rm -v deploy_uploads:/data -v "$PWD":/backup alpine tar czf /backup/uploads-$(date +%F).tar.gz -C /data .
```

## Troubleshooting
- **HTTPS gagal:** pastikan DNS sudah mengarah ke IP VPS dan port 80/443 terbuka. Cek log dengan `docker compose logs caddy`.
- **Kamera atau sensor tidak jalan di HP:** halaman harus dibuka lewat `https://`. Di iPhone, tap tombol izinkan sensor. Buka di Chrome/Safari, jangan di browser bawaan WhatsApp/Instagram.
- **Asisten menjawab "mode offline":** `OPENROUTER_API_KEY` atau `OPENROUTER_MODEL` kosong, atau kuota model gratis sedang habis. Cek log backend.
